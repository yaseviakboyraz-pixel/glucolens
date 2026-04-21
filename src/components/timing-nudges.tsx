"use client";
import { useEffect, useRef } from "react";
import type { MealAnalysis, GlucoseCurve } from "@/lib/claude-vision";

interface Props {
  analysis: MealAnalysis;
}

function GlucoseCurveChart({ curve, risk }: { curve: GlucoseCurve; risk: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const riskColor = risk === "low" ? "#10b981"
    : risk === "medium" ? "#f59e0b" : "#ef4444";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    const points = curve.points;
    const maxMinutes = Math.max(...points.map(p => p.minutes));

    const toX = (min: number) => PAD.left + (min / maxMinutes) * chartW;
    const toY = (level: number) => PAD.top + chartH - (level / 100) * chartH;

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
    }

    // Safe zone
    ctx.fillStyle = "rgba(16,185,129,0.05)";
    ctx.fillRect(PAD.left, toY(40), chartW, toY(0) - toY(40));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
    grad.addColorStop(0, riskColor + "50");
    grad.addColorStop(1, riskColor + "00");

    ctx.beginPath();
    ctx.moveTo(toX(points[0].minutes), toY(0));
    points.forEach(p => ctx.lineTo(toX(p.minutes), toY(p.level)));
    ctx.lineTo(toX(points[points.length - 1].minutes), toY(0));
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Curve line (smooth bezier)
    ctx.beginPath();
    ctx.moveTo(toX(points[0].minutes), toY(points[0].level));
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (toX(prev.minutes) + toX(curr.minutes)) / 2;
      ctx.bezierCurveTo(cpX, toY(prev.level), cpX, toY(curr.level), toX(curr.minutes), toY(curr.level));
    }
    ctx.strokeStyle = riskColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Peak dot
    const peakPoint = points.reduce((a, b) => a.level > b.level ? a : b);
    ctx.beginPath();
    ctx.arc(toX(peakPoint.minutes), toY(peakPoint.level), 5, 0, Math.PI * 2);
    ctx.fillStyle = riskColor;
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.stroke();

    // X axis labels
    ctx.fillStyle = "rgba(156,163,175,0.7)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    [0, Math.round(maxMinutes * 0.33), Math.round(maxMinutes * 0.66), maxMinutes].forEach(t => {
      const label = t < 60 ? `${t}m` : `${(t / 60).toFixed(1)}h`;
      ctx.fillText(label, toX(t), H - 6);
    });

    // Y axis labels
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(156,163,175,0.4)";
    ["Low", "High"].forEach((label, i) => {
      ctx.fillText(label, PAD.left - 4, toY([25, 75][i]) + 4);
    });

    // Peak label above dot
    ctx.fillStyle = riskColor;
    ctx.textAlign = "center";
    ctx.font = "bold 10px system-ui";
    ctx.fillText(`Peak ~${curve.peak_minutes}m`, toX(peakPoint.minutes), toY(peakPoint.level) - 12);

  }, [curve, riskColor]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={140}
      className="w-full"
      style={{ height: 140 }}
    />
  );
}

export function TimingNudges({ analysis }: Props) {
  const { timing_actions, glucose_curve, glucose_risk, total_glycemic_load } = analysis;
  if (!timing_actions && !glucose_curve) return null;

  const riskTextColor = glucose_risk === "low" ? "text-green-400"
    : glucose_risk === "medium" ? "text-amber-400" : "text-red-400";

  const riskBorderBg = glucose_risk === "low"
    ? "border-green-500/30 bg-green-950/30"
    : glucose_risk === "medium"
    ? "border-amber-500/30 bg-amber-950/30"
    : "border-red-500/30 bg-red-950/30";

  const peakLabel = glucose_risk === "low"
    ? "Gentle rise — minimal spike"
    : glucose_risk === "medium"
    ? "Moderate rise — manageable spike"
    : "Sharp rise — significant spike";

  return (
    <div className="space-y-3">

      {/* Glucose Curve */}
      {glucose_curve && (
        <div className={`rounded-2xl border p-4 ${riskBorderBg}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-white font-semibold text-sm">📈 Predicted Glucose Curve</h3>
              <p className={`text-xs mt-0.5 ${riskTextColor}`}>{peakLabel}</p>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${riskTextColor}`}>
                ~{glucose_curve.peak_minutes}min
              </div>
              <div className="text-xs text-gray-500">to peak</div>
            </div>
          </div>

          <GlucoseCurveChart curve={glucose_curve} risk={glucose_risk} />

          <div className="flex justify-between mt-3 text-xs">
            <div className="text-center">
              <div className={`font-semibold ${riskTextColor}`}>
                {glucose_curve.peak_minutes}m
              </div>
              <div className="text-gray-600">Peak</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 font-semibold">
                {glucose_curve.baseline_minutes}m
              </div>
              <div className="text-gray-600">Baseline</div>
            </div>
            <div className="text-center">
              <div className="text-blue-400 font-semibold">GL {total_glycemic_load}</div>
              <div className="text-gray-600">Total load</div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-meal actions */}
      {timing_actions?.pre_meal && timing_actions.pre_meal.length > 0 && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-950/30 p-4">
          <h3 className="text-blue-300 font-semibold text-sm mb-2.5">
            ⏱️ Before you eat
          </h3>
          <div className="space-y-2">
            {timing_actions.pre_meal.map((action, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  {i + 1}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post-meal actions */}
      {timing_actions?.post_meal && timing_actions.post_meal.length > 0 && (
        <div className="rounded-2xl border border-teal-500/30 bg-teal-950/30 p-4">
          <h3 className="text-teal-300 font-semibold text-sm mb-2.5">
            🚶 After eating
          </h3>
          <div className="space-y-2">
            {timing_actions.post_meal.map((action, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  {i + 1}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meal modifications */}
      {timing_actions?.meal_mods && timing_actions.meal_mods.length > 0 && (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-950/30 p-4">
          <h3 className="text-purple-300 font-semibold text-sm mb-2.5">
            🔧 Improve this meal
          </h3>
          <div className="space-y-2">
            {timing_actions.meal_mods.map((mod, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <span className="text-purple-400 text-sm shrink-0 mt-0.5">→</span>
                <p className="text-gray-300 text-sm leading-relaxed">{mod}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Swap suggestion */}
      {timing_actions?.swap_suggestion && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 flex gap-3 items-start">
          <span className="text-2xl shrink-0">🔄</span>
          <div>
            <p className="text-emerald-300 font-semibold text-sm">Lower-GL alternative</p>
            <p className="text-gray-300 text-sm mt-1 leading-relaxed">
              {timing_actions.swap_suggestion}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
