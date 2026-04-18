"use client";
import { useState, useRef, useCallback } from "react";
import { GlucoseMeter } from "./glucose-meter";
import type { MealAnalysis } from "@/lib/claude-vision";

export function UploadAnalyzer({ userType = "healthy" }: { userType?: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MealAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mealContext, setMealContext] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setError("Sadece görsel kabul edilir"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Görsel 5MB altında olmalı"); return; }
    setError(null); setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreview(url);
      setImage(url.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }, []);

  const analyze = async () => {
    if (!image) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: image, userType, mealContext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hata");
      setResult(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-700 rounded-2xl p-8 text-center cursor-pointer hover:border-teal-500 transition-colors bg-gray-900"
      >
        {preview
          ? <img src={preview} alt="Yemek" className="max-h-56 mx-auto rounded-xl object-contain" />
          : <div className="space-y-2">
              <div className="text-5xl">📷</div>
              <p className="text-gray-300 font-medium">Yemek fotoğrafı yükle</p>
              <p className="text-gray-500 text-sm">veya sürükle bırak</p>
            </div>
        }
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      <input type="text" placeholder="Ek bilgi (isteğe bağlı): kahvaltı, az yağlı..."
        value={mealContext} onChange={(e) => setMealContext(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500" />

      <button onClick={analyze} disabled={!image || loading}
        className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
        {loading ? "⏳ Analiz ediliyor..." : "🔬 Şeker & Glukoz Analiz Et"}
      </button>

      {error && <div className="bg-red-950 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">{error}</div>}

      {result && (
        <div className="space-y-4">
          <GlucoseMeter risk={result.glucose_risk} gl={result.total_glycemic_load} />

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Toplam Şeker", value: `${result.total_sugar_g}g`, color: "text-amber-400" },
              { label: "Net Karbonhidrat", value: `${result.total_net_carb_g}g`, color: "text-blue-400" },
              { label: "Lif", value: `${result.total_fiber_g}g`, color: "text-green-400" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-sm text-gray-400">{result.glucose_curve_description}</p>
            {result.glucose_peak_estimate && (
              <p className="text-teal-400 text-sm mt-1 font-medium">📈 {result.glucose_peak_estimate}</p>
            )}
          </div>

          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Tespit Edilen Yiyecekler</h3>
            {result.food_items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <div>
                  <span className="text-gray-200 text-sm">{item.name_tr || item.name}</span>
                  <span className="text-gray-600 text-xs ml-2">{item.portion_g}g</span>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 text-sm font-medium">{item.total_sugar_g}g şeker</div>
                  <div className="text-gray-600 text-xs">GI:{item.glycemic_index} GL:{item.glycemic_load}</div>
                </div>
              </div>
            ))}
          </div>

          {result.recommendations.length > 0 && (
            <div className="bg-teal-950 border border-teal-500/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-teal-400 mb-2">💡 Öneriler</h3>
              {result.recommendations.map((r, i) => (
                <p key={i} className="text-gray-300 text-sm">→ {r}</p>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-600 text-center">
            Bu analiz tıbbi tavsiye değildir. Diyabet yönetimi için doktorunuza danışın.
          </p>
        </div>
      )}
    </div>
  );
}
