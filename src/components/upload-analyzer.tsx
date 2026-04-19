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

  // İki ayrı input: biri kamera, biri galeri
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const tx = t[lang];

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setError(tx.error_image); return; }
    if (file.size > 20 * 1024 * 1024) { setError("Image must be under 20MB"); return; }
    setError(null); setResult(null); setSaved(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreview(url);
      setImage(url.includes(",") ? url.split(",")[1] : url);
    };
    reader.readAsDataURL(file);
  }, [tx]);

  // Fotoğraf çekildikten sonra otomatik analiz başlat
  const handleCameraCapture = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setError(tx.error_image); return; }
    setError(null); setResult(null); setSaved(false);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const url = e.target?.result as string;
      setPreview(url);
      const base64 = url.includes(",") ? url.split(",")[1] : url;
      setImage(base64);
      // Otomatik analiz başlat
      await runAnalysis(base64);
    };
    reader.readAsDataURL(file);
  }, [tx]); // eslint-disable-line

  const runAnalysis = async (base64: string) => {
    setLoading(true); setError(null); setResult(null); setSaved(false);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, userType, mealContext }),
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

  const analyze = async () => {
    if (!image) return;
    await runAnalysis(image);
  };

  const reset = () => {
    setImage(null); setPreview(null); setResult(null);
    setError(null); setSaved(false); setMealContext("");
  };

  const foodName = (item: MealAnalysis["food_items"][number]) =>
    lang === "tr" ? (item.name_tr || item.name) : item.name;

  return (
    <div className="max-w-xl mx-auto space-y-4">

      {/* Görsel seçilmemişse — iki buton göster */}
      {!preview && !loading && (
        <div className="space-y-3">
          {/* Kamera ile çek */}
          <button
            onClick={() => cameraRef.current?.click()}
            className="w-full py-5 rounded-2xl font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg"
          >
            <span className="text-2xl">📸</span>
            Take Photo
          </button>
          {/* Gizli kamera input — capture="environment" arka kamerayı açar */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCameraCapture(f);
              e.target.value = ""; // reset so same file can be selected again
            }}
          />

          {/* Galeriden seç */}
          <button
            onClick={() => galleryRef.current?.click()}
            className="w-full py-4 rounded-2xl font-semibold text-gray-300 bg-gray-900 hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-3 border border-gray-700"
          >
            <span className="text-xl">🖼️</span>
            Choose from Gallery
          </button>
          {/* Gizli galeri input — capture olmadan açılır */}
          <input
            ref={galleryRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />

          {/* Drag & drop alanı — masaüstü için */}
          <div
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-800 rounded-2xl py-6 text-center text-gray-600 text-sm hover:border-gray-700 transition-colors"
          >
            or drag & drop here
          </div>
        </div>
      )}

      {/* Yükleme göstergesi (kamera sonrası otomatik analiz) */}
      {loading && (
        <div className="text-center py-12 space-y-4">
          <div className="text-5xl animate-bounce">🔬</div>
          <p className="text-teal-400 font-medium text-lg">{tx.analyzing}</p>
          <p className="text-gray-500 text-sm">Analyzing nutrients & glycemic load...</p>
          {preview && (
            <img src={preview} alt="analyzing" className="max-h-40 mx-auto rounded-xl object-contain opacity-50" />
          )}
        </div>
      )}

      {/* Görsel seçildi — galeri için manuel analiz */}
      {preview && !loading && !result && (
        <div className="space-y-4">
          <div className="relative">
            <img src={preview} alt="food" className="w-full max-h-64 rounded-2xl object-contain bg-gray-900" />
            <button
              onClick={reset}
              className="absolute top-2 right-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm transition-colors"
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>

          {/* Ek bilgi */}
          <input
            type="text"
            placeholder={tx.context_placeholder}
            value={mealContext}
            onChange={(e) => setMealContext(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500"
          />

          <button
            onClick={analyze}
            className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 transition-all"
          >
            {tx.analyze_btn}
          </button>
        </div>
      )}

      {/* Hata */}
      {error && (
        <div className="bg-red-950 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">
          {error}
          <button onClick={reset} className="ml-3 underline text-red-400 hover:text-red-300">Try again</button>
        </div>
      )}

      {/* Kaydedildi */}
      {saved && !loading && (
        <div className="bg-green-950 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm text-center">
          ✓ Saved to history
        </div>
      )}

      {/* Sonuçlar */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Önizleme küçük */}
          {preview && (
            <div className="flex items-center gap-3 bg-gray-900 rounded-xl p-3 border border-gray-800">
              <img src={preview} alt="meal" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Analyzed meal</div>
                <div className="text-sm text-gray-300 mt-0.5">
                  {result.food_items.slice(0, 2).map(f => foodName(f)).join(", ")}
                  {result.food_items.length > 2 && ` +${result.food_items.length - 2} more`}
                </div>
              </div>
            </div>
          )}

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
                  <span className="text-gray-600 text-xs">
                    {item.portion_g}g{item.cooking_method ? ` · ${item.cooking_method}` : ""}
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

          {/* Yeni analiz */}
          <button
            onClick={reset}
            className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 transition-all"
          >
            📸 Analyze Another Meal
          </button>
        </div>
      )}
    </div>
  );
}
