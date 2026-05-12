"use client";
import { useState, useRef, useCallback } from "react";
import { GlucoseMeter } from "./glucose-meter";
import { BarcodeScanner } from "./barcode-scanner";
import { canAnalyze, recordAnalysis } from "@/lib/subscriptions";
import { Paywall } from "./paywall";
import { TimingNudges } from "./timing-nudges";
import { ShareCard } from "./share-card";
import { t, type Lang } from "@/lib/i18n";
import { saveMeal } from "@/lib/storage";
import type { MealAnalysis } from "@/lib/claude-vision";

type Mode = "normal" | "pre_meal" | "compare" | "url";

const DELIVERY_PLATFORMS = ["yemeksepeti.com", "trendyol.com", "getir.com", "ubereats.com", "migros.com.tr", "grubhub.com", "deliveroo.com", "doordash.com"];
const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|avif|bmp)(\?|$)/i;
function detectUrlType(url: string): "delivery" | "image" | "menu" {
  const lower = url.toLowerCase();
  if (DELIVERY_PLATFORMS.some(p => lower.includes(p))) return "delivery";
  if (IMAGE_EXTS.test(lower)) return "image";
  return "menu";
}

interface Props {
  userType?: string;
  lang: Lang;
  onAnalysisComplete?: () => void;
}

export function UploadAnalyzer({ userType = "healthy", lang, onAnalysisComplete }: Props) {
  const [mode, setMode] = useState<Mode>("normal");
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MealAnalysis | null>(null);
  const [result2, setResult2] = useState<MealAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mealContext, setMealContext] = useState("");
  const [saved, setSaved] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<{
    name: string; brand?: string; gi_estimate?: number; gl_estimate?: number;
    carbs_100g?: number; sugars_100g?: number; fiber_100g?: number;
    protein_100g?: number; fat_100g?: number;
    calories_100g?: number; serving_size?: number; image_url?: string; barcode: string;
  } | null>(null);
  const [portionG, setPortionG] = useState(100);

  const [showPaywall, setShowPaywall] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<"free" | "pro">("free");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [menuResult, setMenuResult] = useState<null | { restaurant_name?: string; cuisine_type?: string; dishes: Array<{ name: string; name_tr?: string; estimated_gl: number; glucose_risk: string; notes: string; category: string; gi_estimate: number }>; top_safe: string[]; top_risky: string[]; meal_tips: string[] }>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const gallery2Ref = useRef<HTMLInputElement>(null);

  const tx = t[lang];

  const handleFile = useCallback((file: File, slot: 1 | 2 = 1) => {
    if (!file.type.startsWith("image/")) { setError(tx.error_image); return; }
    if (file.size > 20 * 1024 * 1024) { setError("Image must be under 20MB"); return; }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (slot === 1) { setPreview(url); setImage(url.includes(",") ? url.split(",")[1] : url); }
      else { setPreview2(url); setImage2(url.includes(",") ? url.split(",")[1] : url); }
    };
    reader.readAsDataURL(file);
  }, [tx]);

  const handleCameraCapture = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setError(tx.error_image); return; }
    setError(null); setResult(null); setSaved(false);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const url = e.target?.result as string;
      setPreview(url);
      const base64 = url.includes(",") ? url.split(",")[1] : url;
      setImage(base64);
      await runAnalysis(base64, null, mode);
    };
    reader.readAsDataURL(file);
  }, [tx, mode]); // eslint-disable-line

  const runAnalysis = async (b64: string, b64_2: string | null = null, currentMode: Mode = "normal") => {
    // Check subscription limit
    const { allowed, plan } = await canAnalyze();
    setCurrentPlan(plan);
    if (!allowed) {
      setShowPaywall(true);
      return;
    }
    setLoading(true); setError(null); setResult(null); setResult2(null); setSaved(false);
    try {
      const contextNote = currentMode === "pre_meal"
        ? "[PRE-MEAL ANALYSIS] User is asking about this food BEFORE eating. Emphasize glucose spike prediction and suggest optimal timing/pairing. " + mealContext
        : mealContext;

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, userType, mealContext: contextNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tx.error_failed);
      setResult(data.analysis);
      recordAnalysis();

      if (currentMode === "compare" && b64_2) {
        const res2 = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: b64_2, userType, mealContext }),
        });
        const data2 = await res2.json();
        if (res2.ok) setResult2(data2.analysis);
      }

      if (currentMode === "normal") {
        saveMeal(data.analysis, "meal", b64);
        setSaved(true);
        onAnalysisComplete?.();
      } else if (currentMode === "pre_meal") {
        saveMeal(data.analysis, "pre_meal", b64);
        setSaved(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : tx.error_failed);
    } finally {
      setLoading(false);
    }
  };

  const analyze = async () => {
    if (!image) return;
    await runAnalysis(image, image2, mode);
  };

  // Build a synthetic MealAnalysis from barcode data
  const analyzeBarcodeProduct = () => {
    if (!barcodeProduct) return;
    const p = barcodeProduct;
    const ratio = portionG / 100;
    const carbs = parseFloat(((p.carbs_100g || 0) * ratio).toFixed(1));
    const sugars = parseFloat(((p.sugars_100g || 0) * ratio).toFixed(1));
    const fiber = parseFloat(((p.fiber_100g || 0) * ratio).toFixed(1));
    const protein = parseFloat(((p.protein_100g || 0) * ratio).toFixed(1));
    const fat = parseFloat(((p.fat_100g || 0) * ratio).toFixed(1));
    const netCarb = Math.max(0, parseFloat((carbs - fiber).toFixed(1)));
    const gi = p.gi_estimate || 55;
    const gl = parseFloat(((gi * netCarb) / 100).toFixed(1));
    const risk: "low" | "medium" | "high" = gl < 10 ? "low" : gl <= 20 ? "medium" : "high";

    const syntheticAnalysis: MealAnalysis = {
      food_items: [{
        name: p.name,
        name_tr: p.name,
        portion_g: portionG,
        total_sugar_g: sugars,
        added_sugar_g: 0,
        carbohydrate_g: carbs,
        fiber_g: fiber,
        net_carb_g: netCarb,
        glycemic_index: gi,
        glycemic_load: gl,
        gi_confidence: 0.75,
        cooking_method: "packaged",
        protein_g: protein,
        fat_g: fat,
        calories: parseFloat(((p.calories_100g || 0) * ratio).toFixed(0)),
      }],
      total_sugar_g: sugars,
      total_added_sugar_g: 0,
      total_net_carb_g: netCarb,
      total_fiber_g: fiber,
      total_protein_g: protein,
      total_fat_g: fat,
      total_calories: parseFloat(((p.calories_100g || 0) * ratio).toFixed(0)),
      avg_glycemic_index: gi,
      total_glycemic_load: gl,
      glucose_risk: risk,
      glucose_peak_estimate: risk === "high" ? "Blood sugar may spike significantly" : risk === "medium" ? "Moderate blood sugar rise expected" : "Minimal blood sugar impact",
      glucose_curve_description: `Based on ${portionG}g serving of ${p.name}. GI estimated from product category and nutrient profile.`,
      recommendations: [
        fiber < 2 ? "Low fiber — pair with vegetables or nuts to slow glucose absorption" : "Good fiber content helps moderate glucose response",
        "Check serving size on package — actual portion may differ",
      ],
      warnings: gl > 20 ? [`High glycemic load (${gl}) — consider a smaller portion`] : [],
      confidence_score: 0.75,
      hidden_ingredients_note: `Barcode: ${p.barcode}${p.brand ? ` · Brand: ${p.brand}` : ""}`,
    };

    setResult(syntheticAnalysis);
    saveMeal(syntheticAnalysis);
    setSaved(true);
    onAnalysisComplete?.();
  };

  const reset = () => {
    setImage(null); setPreview(null); setImage2(null); setPreview2(null);
    setResult(null); setResult2(null); setError(null); setSaved(false);
    setMealContext(""); setBarcodeProduct(null); setPortionG(100);
    setUrlInput(""); setMenuResult(null);
  };

  const runUrlAnalysis = async (url: string) => {
    if (!url.trim()) return;
    const urlType = detectUrlType(url);
    setUrlLoading(true); setError(null); setMenuResult(null); setResult(null); setSaved(false);
    try {
      if (urlType === "image") {
        const fetchRes = await fetch("/api/menu-fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const fetchData = await fetchRes.json();
        if (!fetchRes.ok || fetchData.type !== "image") throw new Error("Could not load image from URL");
        setUrlLoading(false);
        await runAnalysis(fetchData.base64, null, "normal");
        return;
      }
      const fetchRes = await fetch("/api/menu-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const fetchData = await fetchRes.json();
      if (!fetchRes.ok) throw new Error(fetchData.error || "Could not load page");

      if (urlType === "delivery") {
        const analyzeRes = await fetch("/api/delivery-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: fetchData.text, url, userType }),
        });
        const analyzeData = await analyzeRes.json();
        if (!analyzeRes.ok) throw new Error(analyzeData.error || "Delivery analysis failed");
        setResult(analyzeData.analysis);
        setSaved(true);
      } else {
        const analyzeRes = await fetch("/api/menu-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...fetchData, userType }),
        });
        const analyzeData = await analyzeRes.json();
        if (!analyzeRes.ok) throw new Error(analyzeData.error || "Menu analysis failed");
        setMenuResult(analyzeData.menu);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "URL analysis failed");
    } finally {
      setUrlLoading(false);
    }
  };

  const foodName = (item: MealAnalysis["food_items"][number]) =>
    lang === "tr" ? (item.name_tr || item.name) : item.name;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Paywall */}
      {showPaywall && (
        <Paywall
          onClose={() => setShowPaywall(false)}
          onUpgrade={(plan) => { setCurrentPlan(plan); setShowPaywall(false); }}
        />
      )}

      {/* Free plan indicator */}
      {currentPlan === "free" && (
        <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-2">
          <span className="text-xs text-gray-500">Free plan · 5 analyses/day</span>
          <button onClick={() => setShowPaywall(true)}
            className="text-xs text-teal-400 font-medium hover:text-teal-300">
            Upgrade ↗
          </button>
        </div>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        {([  
          { key: "normal",   label: "📷", sub: "Analyze" },
          { key: "url",      label: "🔗", sub: "URL / QR" },
          { key: "pre_meal", label: "🤔", sub: "Before" },
          { key: "compare",  label: "⚖️", sub: "Compare" },
        ] as { key: Mode; label: string; sub: string }[]).map((m) => (
          <button key={m.key} onClick={() => { setMode(m.key); reset(); }}
            className={`py-2.5 rounded-xl text-xs font-medium transition-all ${
              mode === m.key ? "bg-teal-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-800 border border-gray-800"
            }`}>
            <div className="text-base">{m.label}</div>
            <div>{m.sub}</div>
          </button>
        ))}
      </div>

      {/* Barcode Scanner Modal */}
      {showBarcode && (
        <BarcodeScanner
          lang={lang}
          onResult={(product) => {
            setBarcodeProduct(product);
            setShowBarcode(false);
          }}
          onClose={() => setShowBarcode(false)}
        />
      )}

      {/* Barcode product result */}
      {barcodeProduct && !result && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="flex gap-3 p-4">
            {barcodeProduct.image_url && (
              <img src={barcodeProduct.image_url} alt={barcodeProduct.name}
                className="w-20 h-20 rounded-xl object-contain bg-white shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white truncate">{barcodeProduct.name}</div>
              {barcodeProduct.brand && <div className="text-xs text-gray-500 mt-0.5">{barcodeProduct.brand}</div>}
              <div className="flex gap-3 mt-2 text-xs text-gray-400">
                {barcodeProduct.calories_100g !== undefined && <span>🔥 {barcodeProduct.calories_100g} kcal</span>}
                {barcodeProduct.carbs_100g !== undefined && <span>🍞 {barcodeProduct.carbs_100g}g carbs</span>}
                {barcodeProduct.sugars_100g !== undefined && <span>🍬 {barcodeProduct.sugars_100g}g sugar</span>}
              </div>
              <div className="mt-1 text-xs text-teal-400">
                Est. GI: {barcodeProduct.gi_estimate} · GL/100g: {barcodeProduct.gl_estimate}
              </div>
            </div>
          </div>

          {/* Portion selector */}
          <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">Portion size</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setPortionG(Math.max(10, portionG - 10))}
                  className="w-8 h-8 bg-gray-800 rounded-lg text-white">−</button>
                <span className="text-white font-medium w-16 text-center">{portionG}g</span>
                <button onClick={() => setPortionG(portionG + 10)}
                  className="w-8 h-8 bg-gray-800 rounded-lg text-white">+</button>
              </div>
            </div>

            {/* Quick portions */}
            <div className="flex gap-2">
              {[50, 100, 150, 200].map(g => (
                <button key={g} onClick={() => setPortionG(g)}
                  className={`flex-1 py-1.5 rounded-lg text-xs transition-all ${portionG === g ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                  {g}g
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-gray-800 rounded-lg py-2">
                <div className="text-amber-400 font-bold">{((barcodeProduct.sugars_100g || 0) * portionG / 100).toFixed(1)}g</div>
                <div className="text-gray-500">Sugar</div>
              </div>
              <div className="bg-gray-800 rounded-lg py-2">
                <div className="text-blue-400 font-bold">{Math.max(0, ((barcodeProduct.carbs_100g || 0) - (barcodeProduct.fiber_100g || 0)) * portionG / 100).toFixed(1)}g</div>
                <div className="text-gray-500">Net Carb</div>
              </div>
              <div className="bg-gray-800 rounded-lg py-2">
                <div className={`font-bold ${((barcodeProduct.gi_estimate || 55) * Math.max(0, ((barcodeProduct.carbs_100g || 0) - (barcodeProduct.fiber_100g || 0)) * portionG / 100) / 100) > 20 ? "text-red-400" : "text-teal-400"}`}>
                  {((barcodeProduct.gi_estimate || 55) * Math.max(0, ((barcodeProduct.carbs_100g || 0) - (barcodeProduct.fiber_100g || 0)) * portionG / 100) / 100).toFixed(1)}
                </div>
                <div className="text-gray-500">GL</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 py-3 rounded-xl text-gray-400 bg-gray-800 text-sm">Cancel</button>
              <button onClick={analyzeBarcodeProduct}
                className="flex-1 py-3 rounded-xl text-white bg-teal-600 hover:bg-teal-500 font-semibold text-sm">
                Log this meal
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "compare" && !barcodeProduct && (
        <div className="bg-purple-950 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-300">
          ⚖️ <strong>Compare:</strong> Upload two meals to compare GL side by side.
        </div>
      )}

      {/* URL mode */}
      {mode === "url" && !menuResult && !result && (
        <div className="space-y-3">
          <div className="bg-blue-950 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-300">
            🔗 <strong>URL / QR Analiz:</strong> Restoran menü URL’si yapıştır veya QR kodu tara.
          </div>

          {/* QR scan button */}
          <button
            onClick={() => {
              // trigger hidden QR input
              const el = document.getElementById("qr-scan-input") as HTMLInputElement | null;
              el?.click();
            }}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all flex items-center justify-center gap-2 text-sm">
            📷 QR Kod Tara
          </button>
          <input
            id="qr-scan-input"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = "";
              if ("BarcodeDetector" in window) {
                const img = new Image();
                const objectUrl = URL.createObjectURL(file);
                img.onload = async () => {
                  try {
                    // @ts-expect-error BarcodeDetector not in TS types
                    const detector = new BarcodeDetector({ formats: ["qr_code"] });
                    const codes = await detector.detect(img);
                    URL.revokeObjectURL(objectUrl);
                    if (codes.length > 0 && codes[0].rawValue.startsWith("http")) {
                      setUrlInput(codes[0].rawValue);
                      await runUrlAnalysis(codes[0].rawValue);
                    } else {
                      setError("QR kodundan URL okunamadı. URL’yi manuel girin.");
                    }
                  } catch {
                    URL.revokeObjectURL(objectUrl);
                    setError("QR tarama başarısız. URL’yi manuel girin.");
                  }
                };
                img.src = objectUrl;
              } else {
                setError("Bu tarayıcı QR okumayı desteklemiyor. URL’yi manuel girin.");
              }
            }}
          />

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="flex-1 h-px bg-gray-800" />
            ya da
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runUrlAnalysis(urlInput)}
            placeholder="https://yemeksepeti.com/... veya https://restaurant.com/menu"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-teal-500"
          />
          {urlInput && (
            <div className="text-xs text-gray-500 text-center">
              Tespit: <span className="text-teal-400 font-medium">
                {detectUrlType(urlInput) === "delivery" ? "🛵 Delivery siparişi" :
                 detectUrlType(urlInput) === "image" ? "🖼️ Görsel" : "🍽️ Restoran menüsü"}
              </span>
            </div>
          )}
          <button
            onClick={() => runUrlAnalysis(urlInput)}
            disabled={!urlInput.trim() || urlLoading}
            className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {urlLoading ? "Analiz ediliyor..." : "🔗 Analiz Et"}
          </button>
        </div>
      )}

      {/* Menu result from URL */}
      {menuResult && mode === "url" && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-white font-bold">{menuResult.restaurant_name || "Menü Analizi"}</h2>
                {menuResult.cuisine_type && <p className="text-gray-500 text-xs mt-0.5">{menuResult.cuisine_type}</p>}
              </div>
              <button onClick={reset} className="text-gray-600 text-sm">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-gray-800 rounded-xl p-2 text-center">
                <div className="text-white font-bold">{menuResult.dishes.length}</div>
                <div className="text-xs text-gray-500">Toplam</div>
              </div>
              <div className="bg-green-950/60 rounded-xl p-2 text-center border border-green-500/20">
                <div className="text-green-400 font-bold">{menuResult.dishes.filter(d => d.glucose_risk === "low").length}</div>
                <div className="text-xs text-gray-500">Güvenli</div>
              </div>
              <div className="bg-red-950/60 rounded-xl p-2 text-center border border-red-500/20">
                <div className="text-red-400 font-bold">{menuResult.dishes.filter(d => d.glucose_risk === "high").length}</div>
                <div className="text-xs text-gray-500">Yüksek risk</div>
              </div>
            </div>
          </div>
          {menuResult.top_safe.length > 0 && (
            <div className="bg-green-950/40 border border-green-500/30 rounded-xl p-3">
              <p className="text-green-400 text-xs font-semibold mb-2">✅ En iyi seçenekler</p>
              <div className="flex flex-wrap gap-1.5">
                {menuResult.top_safe.map(d => <span key={d} className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded-full">{d}</span>)}
              </div>
            </div>
          )}
          {menuResult.top_risky.length > 0 && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3">
              <p className="text-red-400 text-xs font-semibold mb-2">🔴 Kaçın</p>
              <div className="flex flex-wrap gap-1.5">
                {menuResult.top_risky.map(d => <span key={d} className="text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded-full">{d}</span>)}
              </div>
            </div>
          )}
          <div className="space-y-2">
            {menuResult.dishes.map((dish, i) => {
              const rc = dish.glucose_risk === "low" ? "text-green-400" : dish.glucose_risk === "medium" ? "text-amber-400" : "text-red-400";
              const rb = dish.glucose_risk === "low" ? "border-green-500/20 bg-green-950/20" : dish.glucose_risk === "medium" ? "border-amber-500/20 bg-amber-950/20" : "border-red-500/20 bg-red-950/20";
              return (
                <div key={i} className={`rounded-xl p-3 border ${rb} flex justify-between items-start`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{lang === "tr" ? (dish.name_tr || dish.name) : dish.name}</div>
                    <div className="text-gray-500 text-xs mt-0.5">GI ~{dish.gi_estimate} · {dish.category}</div>
                    {dish.notes && <p className="text-gray-600 text-xs mt-1">{dish.notes}</p>}
                  </div>
                  <div className={`text-xl font-bold ml-3 shrink-0 ${rc}`}>{dish.estimated_gl}</div>
                </div>
              );
            })}
          </div>
          <button onClick={reset} className="w-full py-3 rounded-xl text-white bg-teal-600 hover:bg-teal-500 font-semibold text-sm">
            🔗 Yeni URL Analiz Et
          </button>
        </div>
      )}

      {/* Upload area */}
      {mode !== "url" && !preview && !loading && !barcodeProduct && (
        <div className={mode === "compare" ? "grid grid-cols-2 gap-3" : "space-y-3"}>
          <div className="space-y-3">
            <button onClick={() => cameraRef.current?.click()}
              className="w-full py-5 rounded-2xl font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg">
              <span className="text-2xl">📸</span>
              {mode === "compare" ? "Meal A — Camera" : "Take Photo"}
            </button>
            <button onClick={() => galleryRef.current?.click()}
              className="w-full py-4 rounded-2xl font-semibold text-gray-300 bg-gray-900 hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-3 border border-gray-700">
              <span className="text-xl">🖼️</span>
              {mode === "compare" ? "Meal A — Gallery" : "Choose from Gallery"}
            </button>
          </div>
          {mode === "compare" && (
            <div className="space-y-3">
              <button onClick={() => gallery2Ref.current?.click()}
                className="w-full py-5 rounded-2xl font-semibold text-white bg-purple-700 hover:bg-purple-600 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg">
                <span className="text-2xl">🖼️</span>
                Meal B
              </button>
              {preview2 && <img src={preview2} alt="B" className="w-full h-24 rounded-xl object-cover" />}
            </div>
          )}
        </div>
      )}

      {/* Drag and drop — desktop */}
      {!preview && !loading && !barcodeProduct && mode === "normal" && (
        <div onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-800 rounded-2xl py-4 text-center text-gray-600 text-sm hover:border-gray-700 transition-colors">
          or drag & drop here
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCameraCapture(f); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, 1); e.target.value = ""; }} />
      <input ref={gallery2Ref} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, 2); e.target.value = ""; }} />

      {/* Loading */}
      {(loading || urlLoading) && (
        <div className="text-center py-12 space-y-4">
          <div className="text-5xl animate-bounce">{mode === "url" ? "🔗" : "🔬"}</div>
          <p className="text-teal-400 font-medium text-lg">{mode === "url" ? "URL analiz ediliyor..." : tx.analyzing}</p>
          {preview && <img src={preview} alt="analyzing" className="max-h-40 mx-auto rounded-xl object-contain opacity-50" />}
        </div>
      )}

      {/* Preview + analyze */}
      {preview && !loading && !result && !barcodeProduct && (
        <div className="space-y-4">
          <div className={mode === "compare" ? "grid grid-cols-2 gap-3" : ""}>
            <div className="relative">
              <img src={preview} alt="meal" className="w-full max-h-56 rounded-2xl object-contain bg-gray-900" />
              <button onClick={reset}
                className="absolute top-2 right-2 bg-gray-800/90 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">✕</button>
            </div>
            {mode === "compare" && preview2 && (
              <img src={preview2} alt="meal B" className="w-full max-h-56 rounded-2xl object-contain bg-gray-900" />
            )}
          </div>

          {mode !== "compare" && (
            <input type="text" placeholder={tx.context_placeholder} value={mealContext}
              onChange={(e) => setMealContext(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500" />
          )}

          {mode === "compare" && !image2 && (
            <p className="text-center text-gray-500 text-sm">Select Meal B from gallery to compare</p>
          )}

          <button onClick={analyze}
            disabled={mode === "compare" ? (!image || !image2) : !image}
            className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-40 transition-all">
            {mode === "pre_meal" ? "🤔 Predict Before Eating" : mode === "compare" ? "⚖️ Compare Both" : tx.analyze_btn}
          </button>
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="bg-red-950 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">
          {error} <button onClick={reset} className="ml-2 underline">Try again</button>
        </div>
      )}

      {saved && !loading && (
        <div className="bg-green-950 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm text-center">
          {mode === "pre_meal" ? "📝 Pre-meal prediction saved" : "✓ Saved to history"}
        </div>
      )}

      {/* Compare results */}
      {result && result2 && mode === "compare" && !loading && (
        <div className="space-y-4">
          <h3 className="text-center text-white font-semibold">⚖️ Comparison</h3>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: "Meal A", res: result, pv: preview }, { label: "Meal B", res: result2, pv: preview2 }].map(({ label, res, pv }) => (
              <div key={label} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                {pv && <img src={pv} alt={label} className="w-full h-24 rounded-lg object-cover mb-2" />}
                <div className="text-xs font-medium text-gray-400 mb-1">{label}</div>
                <div className={`text-lg font-bold ${res.glucose_risk === "low" ? "text-green-400" : res.glucose_risk === "medium" ? "text-amber-400" : "text-red-400"}`}>
                  GL {res.total_glycemic_load}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Sugar: {res.total_sugar_g}g · Fiber: {res.total_fiber_g}g<br/>Risk: {res.glucose_risk}
                </div>
              </div>
            ))}
          </div>
          <div className={`rounded-xl p-3 text-sm text-center font-medium ${
            result.total_glycemic_load < result2.total_glycemic_load ? "bg-green-950 border border-green-500/30 text-green-300"
            : result2.total_glycemic_load < result.total_glycemic_load ? "bg-purple-950 border border-purple-500/30 text-purple-300"
            : "bg-gray-800 text-gray-300"
          }`}>
            {result.total_glycemic_load < result2.total_glycemic_load
              ? `✅ Meal A is better — ${(result2.total_glycemic_load - result.total_glycemic_load).toFixed(1)} GL lower`
              : result2.total_glycemic_load < result.total_glycemic_load
              ? `✅ Meal B is better — ${(result.total_glycemic_load - result2.total_glycemic_load).toFixed(1)} GL lower`
              : "Both meals have similar glycemic impact"}
          </div>
          <button onClick={reset} className="w-full py-3 rounded-xl text-gray-400 bg-gray-900 hover:bg-gray-800 text-sm border border-gray-800">
            Compare other meals
          </button>
        </div>
      )}

      {/* Normal / pre-meal results */}
      {result && !result2 && !loading && (
        <div className="space-y-4">
          {mode === "pre_meal" && (
            <div className="bg-blue-950 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-300 text-center">
              📊 Pre-meal prediction
            </div>
          )}

          {(preview || barcodeProduct?.image_url) && (
            <div className="flex items-center gap-3 bg-gray-900 rounded-xl p-3 border border-gray-800">
              <img src={barcodeProduct?.image_url || preview || ""} alt="meal"
                className="w-16 h-16 rounded-lg object-cover shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-gray-500">{mode === "pre_meal" ? "Pre-meal prediction" : "Analyzed meal"}</div>
                <div className="text-sm text-gray-300 mt-0.5 truncate">
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
              { label: tx.net_carbs, value: `${result.total_net_carb_g}g`, color: "text-blue-400" },
              { label: tx.fiber, value: `${result.total_fiber_g}g`, color: "text-green-400" },
              { label: "Protein", value: `${result.total_protein_g ?? 0}g`, color: "text-purple-400" },
              { label: "Fat", value: `${result.total_fat_g ?? 0}g`, color: "text-orange-400" },
              { label: "Calories", value: `${result.total_calories ?? 0}`, color: "text-rose-400" },
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
              {result.warnings.map((w, i) => <p key={i} className="text-red-300 text-sm">· {w}</p>)}
            </div>
          )}

          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 space-y-2">
            <h3 className="text-sm font-medium text-gray-400">{tx.detected_foods}</h3>
            {result.food_items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <div className="min-w-0 flex-1">
                  <span className="text-gray-200 text-sm truncate block">{foodName(item)}</span>
                  <span className="text-gray-600 text-xs">{item.portion_g}g{item.cooking_method ? ` · ${item.cooking_method}` : ""}</span>
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

          {/* Timing Nudges + Glucose Curve */}
          <TimingNudges analysis={result} />

          {/* Share */}
          <ShareCard analysis={result} photoBase64={image || undefined} />

          {result.recommendations.length > 0 && (
            <div className="bg-teal-950 border border-teal-500/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-teal-400 mb-2">{tx.tips}</h3>
              {result.recommendations.map((r, i) => (
                <p key={i} className="text-gray-300 text-sm mt-1">→ {r}</p>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-600 text-center">{tx.disclaimer}</p>

          <button onClick={reset}
            className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 transition-all">
            📸 Analyze Another Meal
          </button>
        </div>
      )}
    </div>
  );
}
