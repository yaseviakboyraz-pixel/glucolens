"use client";
import { useState, useRef, useCallback } from "react";
import { GlucoseMeter } from "./glucose-meter";
import { t, type Lang } from "@/lib/i18n";
import { saveMeal } from "@/lib/storage";
import type { MealAnalysis } from "@/lib/claude-vision";

interface Props {
  userType?: string;
  lang: Lang;
  onAnalysisComplete?: () => void;
}

export function UploadAnalyzer({ userType = "healthy", lang, onAnalysisComplete }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MealAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mealContext, setMealContext] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const tx = t[lang];

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setError(tx.error_image); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image must be under 10MB"); return; }
    setError(null); setResult(null); setSaved(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreview(url);
      // Strip data URL prefix for API
      setImage(url.includes(",") ? url.split(",")[1] : url);
    };
    reader.readAsDataURL(file);
  }, [tx]);

  const analyze = async () => {
    if (!image) return;
    setLoading(true); setError(null); setResult(null); setSaved(false);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: image, userType, mealContext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tx.error_failed);
      setResult(data.analysis);
      saveMeal(data.analysis);
      setSaved(true);
      onAnalysisComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : tx.error_failed);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null); setPreview(null); setResult(null);
    setError(null); setSaved(false); setMealContext("");
  };

  const foodName = (item: MealAnalysis["food_items"][number]) =>
    lang === "tr" ? (item.name_tr || item.name) : item.name;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Upload Area */}
      <div
        onClick={() => !preview && fileRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={(e) => e.preventDefault()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors bg-gray-900 ${
          preview ? "border-gray-700 cursor-default" : "border-gray-700 cursor-pointer hover:border-teal-500"
        }`}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="food" className="max-h-56 mx-auto rounded-xl object-contain" />
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs transition-colors"
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="space-y-2 py-4">
            <div className="text-5xl">📷</div>
            <p className="text-gray-300 font-medium">{tx.upload}</p>
            <p className="text-gray-500 text-sm">{tx.drop}</p>
            <p className="text-gray-600 text-xs">JPEG, PNG, WebP · Max 10MB</p>
          </div>
        )}
        <input
          ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {/* Context input */}
      <input
        type="text"
        placeholder={tx.context_placeholder}
        value={mealContext}
        onChange={(e) => setMealContext(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500"
      />

      {/* Analyze button */}
      <button
        onClick={analyze}
        disabled={!image || loading}
        className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {loading ? tx.analyzing : tx.analyze_btn}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-950 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">{error}</div>
      )}

      {/* Saved */}
      {saved && (
        <div className="bg-green-950 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm text-center">
          ✓ Saved to history
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <GlucoseMeter risk={result.glucose_risk} gl={result.total_glycemic_load} lang={lang} />

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: tx.total_sugar, value: `${result.total_sugar_g}g`, color: "text-amber-400" },
              { label: tx.net_carbs,   value: `${result.total_net_carb_g}g`, color: "text-blue-400" },
              { label: tx.fiber,       value: `${result.total_fiber_g}g`, color: "text-green-400" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{tx.glucose_response}</p>
            <p className="text-sm text-gray-400">{result.glucose_curve_description}</p>
            {result.glucose_peak_estimate && (
              <p className="text-teal-400 text-sm mt-1 font-medium">{tx.peak} {result.glucose_peak_estimate}</p>
            )}
          </div>

          {result.warnings.length > 0 && (
            <div className="bg-red-950 border border-red-500/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-red-400 mb-2">⚠️ Warnings</h3>
              {result.warnings.map((w, i) => (
                <p key={i} className="text-red-300 text-sm">· {w}</p>
              ))}
            </div>
          )}

          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 space-y-2">
            <h3 className="text-sm font-medium text-gray-400">{tx.detected_foods}</h3>
            {result.food_items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <div className="min-w-0 flex-1">
                  <span className="text-gray-200 text-sm truncate block">{foodName(item)}</span>
                  <span className="text-gray-600 text-xs">{item.portion_g}g
                    {item.cooking_method && ` · ${item.cooking_method}`}
                  </span>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <div className="text-amber-400 text-sm font-medium">{item.total_sugar_g}g sugar</div>
                  <div className="text-gray-600 text-xs">GI:{item.glycemic_index} GL:{item.glycemic_load}</div>
                </div>
              </div>
            ))}
          </div>

          {result.hidden_ingredients_note && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-400">
              🔍 {result.hidden_ingredients_note}
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="bg-teal-950 border border-teal-500/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-teal-400 mb-2">{tx.tips}</h3>
              {result.recommendations.map((r, i) => (
                <p key={i} className="text-gray-300 text-sm mt-1">→ {r}</p>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-600 text-center">{tx.disclaimer}</p>

          {/* Analyze another */}
          <button
            onClick={reset}
            className="w-full py-3 rounded-xl text-gray-400 bg-gray-900 hover:bg-gray-800 transition-all text-sm border border-gray-800"
          >
            📷 Analyze another meal
          </button>
        </div>
      )}
    </div>
  );
}
