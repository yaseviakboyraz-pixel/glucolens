"use client";
import { useRef, useState } from "react";
import type { MealAnalysis } from "@/lib/claude-vision";
import { getT, type Lang } from "@/lib/i18n";

interface Props {
  analysis: MealAnalysis;
  photoBase64?: string;
  lang: Lang;
}

export function ShareCard({ analysis, photoBase64, lang }: Props) {
  const tx = getT(lang);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const riskColor = analysis.glucose_risk === "low" ? "#10b981"
    : analysis.glucose_risk === "medium" ? "#f59e0b" : "#ef4444";

  const riskEmoji = analysis.glucose_risk === "low" ? "✅"
    : analysis.glucose_risk === "medium" ? "⚠️" : "🔴";

  async function generateCard(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const W = 600;
    const H = 400;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, W, H);

    // Gradient overlay
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#030712");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Border glow
    ctx.strokeStyle = riskColor + "40";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Logo / Brand
    ctx.fillStyle = "#14b8a6";
    ctx.font = "bold 22px system-ui";
    ctx.fillText("💚 GlucoLens", 32, 48);

    ctx.fillStyle = "#4b5563";
    ctx.font = "13px system-ui";
    ctx.fillText("AI Food Glucose Tracker", 32, 68);

    // GL Score — big
    ctx.fillStyle = riskColor;
    ctx.font = "bold 80px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(`GL ${analysis.total_glycemic_load}`, W - 40, 130);

    ctx.font = "bold 18px system-ui";
    ctx.fillStyle = riskColor + "cc";
    ctx.fillText(`${riskEmoji} ${analysis.glucose_risk.toUpperCase()} RISK`, W - 40, 158);

    // Food items
    ctx.textAlign = "left";
    ctx.fillStyle = "#9ca3af";
    ctx.font = "13px system-ui";
    const foods = analysis.food_items.slice(0, 3).map(f => f.name).join(" · ");
    ctx.fillText(foods, 32, 110);

    // Stats row
    const stats = [
      { label: "Sugar", value: `${analysis.total_sugar_g}g` },
      { label: "Net Carb", value: `${analysis.total_net_carb_g}g` },
      { label: "Fiber", value: `${analysis.total_fiber_g}g` },
      { label: "Calories", value: `${analysis.total_calories}` },
    ];

    stats.forEach((s, i) => {
      const x = 32 + i * 135;
      const y = 200;
      ctx.fillStyle = "#1f2937";
      ctx.beginPath();
      ctx.roundRect(x, y, 120, 60, 8);
      ctx.fill();
      ctx.fillStyle = "#f9fafb";
      ctx.font = "bold 16px system-ui";
      ctx.fillText(s.value, x + 12, y + 24);
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px system-ui";
      ctx.fillText(s.label, x + 12, y + 44);
    });

    // Curve mini
    if (analysis.glucose_curve) {
      const pts = analysis.glucose_curve.points;
      const maxM = Math.max(...pts.map(p => p.minutes));
      const cx0 = 32, cy0 = 310, cw = W - 64, ch = 50;
      ctx.strokeStyle = riskColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const x = cx0 + (p.minutes / maxM) * cw;
        const y = cy0 + ch - (p.level / 100) * ch;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Footer
    ctx.fillStyle = "#374151";
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("glucolens-nine.vercel.app", W / 2, H - 16);

    return new Promise(resolve => canvas.toBlob(b => resolve(b), "image/png"));
  }

  async function handleShare() {
    setSharing(true);
    try {
      const blob = await generateCard();
      if (!blob) return;
      const file = new File([blob], "glucolens-analysis.png", { type: "image/png" });
      const text = `My meal analysis: GL ${analysis.total_glycemic_load} (${analysis.glucose_risk} risk) — tracked with GlucoLens 💚`;

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "GlucoLens Analysis", text, files: [file] });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "glucolens-analysis.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setSharing(false);
    }
  }

  async function handleCopyText() {
    const text = `🍽️ Meal Analysis by GlucoLens\nGL Score: ${analysis.total_glycemic_load} (${analysis.glucose_risk} risk)\nSugar: ${analysis.total_sugar_g}g · Net Carbs: ${analysis.total_net_carb_g}g · Calories: ${analysis.total_calories}\nTrack yours: glucolens-nine.vercel.app`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const riskBg = analysis.glucose_risk === "low" ? "bg-green-950/30 border-green-500/30"
    : analysis.glucose_risk === "medium" ? "bg-amber-950/30 border-amber-500/30"
    : "bg-red-950/30 border-red-500/30";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${riskBg}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{tx.sc_title}</h3>
        <span style={{ color: riskColor }} className="text-sm font-bold">GL {analysis.total_glycemic_load}</span>
      </div>

      <div className="flex gap-2">
        <button onClick={handleShare} disabled={sharing}
          className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm transition-all"
          style={{ backgroundColor: riskColor + "cc" }}>
          {sharing ? tx.sc_generating : tx.sc_share_btn}
        </button>
        <button onClick={handleCopyText}
          className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm transition-all">
          {copied ? tx.wc_copied : tx.sc_copy_btn}
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
