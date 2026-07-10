"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { GlucoseMeter } from "./glucose-meter";
import { BarcodeScanner } from "./barcode-scanner";
import { canAnalyze, recordAnalysis } from "@/lib/subscriptions";
import { Paywall } from "./paywall";
import { TimingNudges } from "./timing-nudges";
import { ShareCard } from "./share-card";
import { getT, type Lang } from "@/lib/i18n";
import { saveMeal } from "@/lib/storage";
import { fileToJpegBase64 } from "@/lib/image-prep";
import type { MealAnalysis } from "@/lib/claude-vision";
import { Camera, Link as LinkIcon, Clock, Scale, Barcode, Image as ImageIcon, Candy, Wheat, Egg, Droplet, Leaf, Flame } from "lucide-react";

type Mode = "normal" | "pre_meal" | "compare" | "url";

const DELIVERY_PLATFORMS = [
  // Turkey
  "yemeksepeti.com","trendyol.com","getir.com","migros.com.tr","banabi.com","gofody.com",
  // Americas
  "ubereats.com","doordash.com","grubhub.com","seamless.com","postmates.com","instacart.com","rappi.com","ifood.com.br","pedidosya.com","caviar.com",
  // Europe
  "deliveroo.com","justeat.com","just-eat.co.uk","just-eat.de","lieferando.de","takeaway.com","thuisbezorgd.nl","pyszne.pl","mjam.at","glovo.com","wolt.com","bolt.food",
  // MENA / Africa
  "talabat.com","careem.com","hungerstation.com","otlob.com","elmenus.com","jumia.com","noon.com",
  // Asia-Pacific
  "swiggy.com","zomato.com","grab.com","gojek.com","shopee.com","foodpanda.com","meituan.com","ele.me",
];
const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|avif|bmp)(\?|$)/i;
function detectUrlType(url: string): "delivery" | "image" | "menu" {
  const lower = url.toLowerCase();
  if (DELIVERY_PLATFORMS.some(p => lower.includes(p))) return "delivery";
  if (IMAGE_EXTS.test(lower)) return "image";
  return "menu";
}

// Wrap fetch with an abort-based timeout so a slow AI call can't leave the UI
// stuck on "loading" forever. Throws a tagged error on timeout so callers can
// show a clear message instead of a generic failure.
class TimeoutError extends Error {
  constructor() { super("timeout"); this.name = "TimeoutError"; }
}
async function fetchWithTimeout(input: string, init: RequestInit, ms = 50000): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new TimeoutError();
    throw e;
  } finally {
    clearTimeout(tid);
  }
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
  const [feedback, setFeedback] = useState<null | "up" | "down">(null);
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
  const [elapsed, setElapsed] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [menuResult, setMenuResult] = useState<null | { restaurant_name?: string; cuisine_type?: string; dishes: Array<{ name: string; name_tr?: string; name_local?: string; estimated_gl: number; glucose_risk: string; notes: string; category: string; gi_estimate: number }>; top_safe: string[]; top_risky: string[]; meal_tips: string[] }>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const gallery2Ref = useRef<HTMLInputElement>(null);

  const tx = getT(lang);

  // Elapsed-time tracker driving staged loading progress (perceived latency).
  // The analysis is output-bound (~17s), so we can't make it truly fast — but a
  // blind wait FEELS far longer than a wait that visibly advances through named
  // steps (the "labor illusion"). This turns dead time into perceived motion.
  useEffect(() => {
    if (!loading && !urlLoading) { setElapsed(0); return; }
    const t0 = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - t0) / 1000), 250);
    return () => clearInterval(id);
  }, [loading, urlLoading]);

  const handleFile = useCallback(async (file: File, slot: 1 | 2 = 1) => {
    // Accept anything that looks like an image — iOS HEIC often has an empty MIME type
    const looksImage = file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name);
    if (!looksImage) { setError(tx.error_image); return; }
    if (file.size > 25 * 1024 * 1024) { setError(tx.ua_img_too_big); return; }
    setError(null);
    try {
      const { base64, dataUrl } = await fileToJpegBase64(file); // HEIC→JPEG + downscale
      if (slot === 1) { setPreview(dataUrl); setImage(base64); }
      else { setPreview2(dataUrl); setImage2(base64); }
    } catch {
      setError(tx.ua_img_unreadable);
    }
  }, [tx]);

  const handleCameraCapture = useCallback(async (file: File) => {
    const looksImage = file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name);
    if (!looksImage) { setError(tx.error_image); return; }
    setError(null); setResult(null); setSaved(false);
    try {
      const { base64, dataUrl } = await fileToJpegBase64(file); // HEIC→JPEG + downscale
      setPreview(dataUrl);
      setImage(base64);
      await runAnalysis(base64, null, mode);
    } catch {
      setError(tx.ua_photo_unreadable);
    }
  }, [tx, mode]); // eslint-disable-line

  const runAnalysis = async (b64: string, b64_2: string | null = null, currentMode: Mode = "normal") => {
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

      const res = await fetchWithTimeout("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, userType, mealContext: contextNote, plan, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tx.error_failed);
      setResult(data.analysis);
      recordAnalysis();

      if (currentMode === "compare" && b64_2) {
        const res2 = await fetchWithTimeout("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: b64_2, userType, mealContext, plan, lang }),
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
      if (e instanceof TimeoutError) setError(tx.ua_timeout_analysis);
      else setError(e instanceof Error ? e.message : tx.error_failed);
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
      glucose_peak_estimate: risk === "high" ? "Sharp glucose response expected (illustrative)" : risk === "medium" ? "Moderate glucose response expected (illustrative)" : "Gentle glucose response (illustrative)",
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
    setUrlInput(""); setMenuResult(null); setFeedback(null);
  };

  const runUrlAnalysis = async (url: string) => {
    if (!url.trim()) return;
    const urlType = detectUrlType(url);
    setUrlLoading(true); setError(null); setMenuResult(null); setResult(null); setSaved(false);
    try {
      if (urlType === "image") {
        const fetchRes = await fetchWithTimeout("/api/menu-fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const fetchData = await fetchRes.json();
        if (!fetchRes.ok || fetchData.type !== "image") throw new Error(tx.ua_url_img_fail);
        setUrlLoading(false);
        await runAnalysis(fetchData.base64, null, "normal");
        return;
      }
      const fetchRes = await fetchWithTimeout("/api/menu-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const fetchData = await fetchRes.json();
      if (!fetchRes.ok) throw new Error(fetchData.error || tx.ua_url_page_fail);

      if (urlType === "delivery") {
        const analyzeRes = await fetchWithTimeout("/api/delivery-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: fetchData.text, url, userType, platform: fetchData.platform, lang }),
        });
        const analyzeData = await analyzeRes.json();
        if (!analyzeRes.ok) throw new Error(analyzeData.error || tx.ua_delivery_fail);
        setResult(analyzeData.analysis);
        setSaved(true);
      } else {
        const analyzeRes = await fetchWithTimeout("/api/menu-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...fetchData, userType, lang }),
        });
        const analyzeData = await analyzeRes.json();
        if (!analyzeRes.ok) throw new Error(analyzeData.error || tx.ua_menu_fail);
        setMenuResult(analyzeData.menu);
      }
    } catch (e) {
      if (e instanceof TimeoutError) setError(tx.ua_timeout_request);
      else setError(e instanceof Error ? e.message : tx.ua_url_fail);
    } finally {
      setUrlLoading(false);
    }
  };

  const foodName = (item: MealAnalysis["food_items"][number]) =>
    item.name_local || (lang === "tr" ? item.name_tr : null) || item.name;

  // Lightweight local accuracy feedback. Sets honest expectations and collects
  // a calibration signal; syncing/acting on it is a deliberate future step.
  const submitFeedback = (verdict: "up" | "down") => {
    setFeedback(verdict);
    try {
      const key = "glucolens_feedback";
      const prev = JSON.parse(localStorage.getItem(key) || "[]");
      prev.push({
        ts: Date.now(),
        verdict,
        gl: result?.total_glycemic_load ?? null,
        confidence: result?.confidence_score ?? null,
      });
      localStorage.setItem(key, JSON.stringify(prev.slice(-200)));
    } catch { /* ignore storage errors */ }
  };

  // Staged, elapsed-aware progress — calibrated to the real ~17s timeline. The
  // bar advances with stages and rests at 95% (never a stuck 100%); the loader
  // unmounts on completion, which is the real "done" signal.
  const stages = lang === "tr"
    ? [
        { t: 0,   label: "Görüntü işleniyor",                pct: 12 },
        { t: 2.5, label: "Yemekler tanımlanıyor",            pct: 32 },
        { t: 6,   label: "Porsiyon ve besinler hesaplanıyor", pct: 52 },
        { t: 10,  label: "Glisemik yük çıkarılıyor",          pct: 72 },
        { t: 14,  label: "Öneriler hazırlanıyor",             pct: 88 },
        { t: 19,  label: "Son rötuşlar",                      pct: 95 },
      ]
    : [
        { t: 0,   label: "Processing image",                 pct: 12 },
        { t: 2.5, label: "Identifying foods",                pct: 32 },
        { t: 6,   label: "Calculating portions & nutrients", pct: 52 },
        { t: 10,  label: "Computing glycemic load",          pct: 72 },
        { t: 14,  label: "Preparing tips",                   pct: 88 },
        { t: 19,  label: "Final touches",                    pct: 95 },
      ];
  const stage = stages.reduce((acc, s) => (elapsed >= s.t ? s : acc), stages[0]);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Paywall */}
      {showPaywall && (
        <Paywall
          lang={lang}
          onClose={() => setShowPaywall(false)}
          onUpgrade={(plan) => { setCurrentPlan(plan); setShowPaywall(false); }}
        />
      )}

      {/* Free plan indicator */}
      {currentPlan === "free" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)", borderRadius: 14, padding: "8px 14px" }}>
          <span style={{ fontSize: 11, color: "var(--nova-text-3)" }}>{tx.ua_free_plan}</span>
          <button onClick={() => setShowPaywall(true)}
            style={{ fontSize: 11, color: "var(--nova-purple)", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
            {tx.ua_upgrade}
          </button>
        </div>
      )}
      {/* Mode pills — Nova Aurora */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
        {([
          { key: "normal",   Icon: Camera,   sub: tx.ua_mode_analyze },
          { key: "url",      Icon: LinkIcon, sub: tx.ua_mode_url },
          { key: "pre_meal", Icon: Clock,    sub: tx.ua_mode_pre },
          { key: "compare",  Icon: Scale,    sub: tx.ua_mode_compare },
        ] as { key: Mode; Icon: typeof Camera; sub: string }[]).map((m) => (
          <button key={m.key} onClick={() => { setMode(m.key); reset(); }}
            style={{
              padding: "8px 2px", borderRadius: 12, textAlign: "center",
              fontSize: 7, letterSpacing: 0.5, cursor: "pointer",
              background: mode === m.key ? "rgba(20,184,166,0.12)" : "var(--nova-surface)",
              border: mode === m.key ? "0.5px solid rgba(20,184,166,0.3)" : "0.5px solid var(--nova-border)",
              color: mode === m.key ? "rgba(20,184,166,0.9)" : "var(--nova-text-3)",
              transition: "all 0.2s",
            }}>
            <m.Icon size={16} strokeWidth={1.75} style={{ display: "block", margin: "0 auto 3px" }} color={mode === m.key ? "rgba(20,184,166,0.9)" : "var(--nova-text-3)"} aria-hidden="true" />
            {m.sub}
          </button>
        ))}
        <button onClick={() => setShowBarcode(true)}
          style={{
            padding: "8px 2px", borderRadius: 12, textAlign: "center",
            fontSize: 7, letterSpacing: 0.5, cursor: "pointer",
            background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)",
            color: "var(--nova-text-3)", transition: "all 0.2s",
          }}>
          <Barcode size={16} strokeWidth={1.75} style={{ display: "block", margin: "0 auto 3px" }} color="var(--nova-text-3)" aria-hidden="true" />
          {tx.ua_mode_barcode}
        </button>
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
                {barcodeProduct.carbs_100g !== undefined && <span>🍞 {barcodeProduct.carbs_100g}g {tx.ua_carbs_short}</span>}
                {barcodeProduct.sugars_100g !== undefined && <span>🍬 {barcodeProduct.sugars_100g}g {tx.ua_sugar_short}</span>}
              </div>
              <div className="mt-1 text-xs text-teal-400">
                {tx.ua_est_gi} {barcodeProduct.gi_estimate} · GL/100g: {barcodeProduct.gl_estimate}
              </div>
            </div>
          </div>

          {/* Portion selector */}
          <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">{tx.ua_portion_size}</label>
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
                <div className="text-gray-500">{tx.ua_sugar}</div>
              </div>
              <div className="bg-gray-800 rounded-lg py-2">
                <div className="text-blue-400 font-bold">{Math.max(0, ((barcodeProduct.carbs_100g || 0) - (barcodeProduct.fiber_100g || 0)) * portionG / 100).toFixed(1)}g</div>
                <div className="text-gray-500">{tx.ua_net_carb}</div>
              </div>
              <div className="bg-gray-800 rounded-lg py-2">
                <div className={`font-bold ${((barcodeProduct.gi_estimate || 55) * Math.max(0, ((barcodeProduct.carbs_100g || 0) - (barcodeProduct.fiber_100g || 0)) * portionG / 100) / 100) > 20 ? "text-red-400" : "text-teal-400"}`}>
                  {((barcodeProduct.gi_estimate || 55) * Math.max(0, ((barcodeProduct.carbs_100g || 0) - (barcodeProduct.fiber_100g || 0)) * portionG / 100) / 100).toFixed(1)}
                </div>
                <div className="text-gray-500">GL</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 py-3 rounded-xl text-gray-400 bg-gray-800 text-sm">{tx.ua_cancel}</button>
              <button onClick={analyzeBarcodeProduct}
                className="flex-1 py-3 rounded-xl text-white bg-teal-600 hover:bg-teal-500 font-semibold text-sm">
                {tx.ua_log_meal}
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "compare" && !barcodeProduct && (
        <div className="bg-purple-950 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-300">
          ⚖️ <strong>{tx.ua_compare_label}</strong> {tx.ua_compare_hint}
        </div>
      )}

      {/* URL mode */}
      {mode === "url" && !menuResult && !result && (
        <div className="space-y-3">
          <div className="bg-blue-950 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-300">
            🔗 <strong>{tx.ua_url_label}</strong> {tx.ua_url_hint}
          </div>

          {/* QR scan button */}
          <button
            onClick={() => {
              // trigger hidden QR input
              const el = document.getElementById("qr-scan-input") as HTMLInputElement | null;
              el?.click();
            }}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all flex items-center justify-center gap-2 text-sm">
            {tx.ua_qr_scan}
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
                      setError(tx.ua_qr_no_url);
                    }
                  } catch {
                    URL.revokeObjectURL(objectUrl);
                    setError(tx.ua_qr_scan_fail);
                  }
                };
                img.onerror = () => URL.revokeObjectURL(objectUrl);
                img.src = objectUrl;
              } else {
                setError(tx.ua_qr_unsupported);
              }
            }}
          />

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="flex-1 h-px bg-gray-800" />
            {tx.au_or}
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runUrlAnalysis(urlInput)}
            placeholder={tx.ua_url_placeholder}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-teal-500"
          />
          {urlInput && (
            <div className="text-xs text-gray-500 text-center">
              {tx.ua_detect} <span className="text-teal-400 font-medium">
                {detectUrlType(urlInput) === "delivery" ? tx.ua_detect_delivery :
                 detectUrlType(urlInput) === "image" ? tx.ua_detect_image : tx.ua_detect_menu}
              </span>
            </div>
          )}
          <button
            onClick={() => runUrlAnalysis(urlInput)}
            disabled={!urlInput.trim() || urlLoading}
            className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {urlLoading ? tx.ua_analyzing : tx.ua_analyze_url_btn}
          </button>
        </div>
      )}

      {/* Menu result from URL */}
      {menuResult && mode === "url" && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-white font-bold">{menuResult.restaurant_name || tx.ua_menu_analysis}</h2>
                {menuResult.cuisine_type && <p className="text-gray-500 text-xs mt-0.5">{menuResult.cuisine_type}</p>}
              </div>
              <button onClick={reset} className="text-gray-600 text-sm">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-gray-800 rounded-xl p-2 text-center">
                <div className="text-white font-bold">{menuResult.dishes.length}</div>
                <div className="text-xs text-gray-500">{tx.ua_total}</div>
              </div>
              <div className="bg-green-950/60 rounded-xl p-2 text-center border border-green-500/20">
                <div className="text-green-400 font-bold">{menuResult.dishes.filter(d => d.glucose_risk === "low").length}</div>
                <div className="text-xs text-gray-500">{tx.ua_safe}</div>
              </div>
              <div className="bg-red-950/60 rounded-xl p-2 text-center border border-red-500/20">
                <div className="text-red-400 font-bold">{menuResult.dishes.filter(d => d.glucose_risk === "high").length}</div>
                <div className="text-xs text-gray-500">{tx.ua_high_risk_short}</div>
              </div>
            </div>
          </div>
          {menuResult.top_safe.length > 0 && (
            <div className="bg-green-950/40 border border-green-500/30 rounded-xl p-3">
              <p className="text-green-400 text-xs font-semibold mb-2">{tx.ua_best_options}</p>
              <div className="flex flex-wrap gap-1.5">
                {menuResult.top_safe.map(d => <span key={d} className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded-full">{d}</span>)}
              </div>
            </div>
          )}
          {menuResult.top_risky.length > 0 && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3">
              <p className="text-red-400 text-xs font-semibold mb-2">{tx.ua_avoid}</p>
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
                    <div className="text-white text-sm font-medium">{dish.name_local || (lang === "tr" ? dish.name_tr : null) || dish.name}</div>
                    <div className="text-gray-500 text-xs mt-0.5">GI ~{dish.gi_estimate} · {dish.category}</div>
                    {dish.notes && <p className="text-gray-600 text-xs mt-1">{dish.notes}</p>}
                  </div>
                  <div className={`text-xl font-bold ml-3 shrink-0 ${rc}`}>{dish.estimated_gl}</div>
                </div>
              );
            })}
          </div>
          <button onClick={reset} className="w-full py-3 rounded-xl text-white bg-teal-600 hover:bg-teal-500 font-semibold text-sm">
            {tx.ua_new_url}
          </button>
        </div>
      )}

      {/* Upload zone — Nova Aurora */}
      {mode !== "url" && !preview && !loading && !barcodeProduct && (
        <div className={mode === "compare" ? "grid grid-cols-2 gap-3" : ""}>
          {/* Main upload zone */}
          <div
            onDrop={mode !== "compare" ? (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); } : undefined}
            onDragOver={mode !== "compare" ? (e) => e.preventDefault() : undefined}
            style={{
              flex: 1, minHeight: 200,
              background: "rgba(139,92,246,0.025)",
              border: "1.5px dashed rgba(139,92,246,0.18)",
              borderRadius: 20,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "24px 20px", position: "relative", overflow: "hidden",
            }}>
            {/* Corner accents */}
            {([{top:10,left:10,borderWidth:"1px 0 0 1px"},{top:10,right:10,borderWidth:"1px 1px 0 0"},{bottom:10,left:10,borderWidth:"0 0 1px 1px"},{bottom:10,right:10,borderWidth:"0 1px 1px 0"}] as React.CSSProperties[]).map((style, i) => (
              <div key={i} style={{ position: "absolute", width: 12, height: 12, borderColor: "rgba(139,92,246,0.35)", borderStyle: "solid", ...style }} />
            ))}
            {/* Icon */}
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--nova-purple-dim)", border: "1px solid var(--nova-purple-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={22} strokeWidth={1.75} color="var(--nova-purple)" aria-hidden="true" />
            </div>
            <div style={{ fontSize: 12, color: "var(--nova-text-1)", fontWeight: 400, textAlign: "center" }}>
              {mode === "compare" ? tx.ua_meal_a : tx.ua_take_photo}
            </div>
            <div style={{ fontSize: 9, color: "var(--nova-text-3)", textAlign: "center", lineHeight: 1.6 }}>
              {mode === "compare" ? tx.ua_pick_camera_gallery : tx.ua_or_gallery_drag}
            </div>
            {/* Buttons */}
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <button onClick={() => cameraRef.current?.click()}
                style={{ flex: 1, padding: 9, borderRadius: 12, border: "0.5px solid var(--nova-purple-border)", background: "rgba(139,92,246,0.10)", color: "rgba(139,92,246,0.85)", fontSize: 9, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <Camera size={15} strokeWidth={1.75} aria-hidden="true" />
                {tx.ua_camera}
              </button>
              <button onClick={() => galleryRef.current?.click()}
                style={{ flex: 1, padding: 9, borderRadius: 12, border: "0.5px solid var(--nova-border)", background: "var(--nova-surface)", color: "var(--nova-text-2)", fontSize: 9, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <ImageIcon size={15} strokeWidth={1.75} aria-hidden="true" />
                {tx.ua_gallery}
              </button>
            </div>
          </div>

          {/* Compare — Meal B slot */}
          {mode === "compare" && (
            <div style={{
              minHeight: 200, background: "rgba(139,92,246,0.025)",
              border: "1.5px dashed rgba(139,92,246,0.18)", borderRadius: 20,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "24px 16px", position: "relative",
            }}>
              {preview2
                ? <img src={preview2} alt="B" style={{ width: "100%", height: 120, borderRadius: 12, objectFit: "cover" }} />
                : (
                  <>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(139,92,246,0.10)", border: "1px solid var(--nova-purple-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ImageIcon size={22} strokeWidth={1.75} color="var(--nova-purple)" aria-hidden="true" />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--nova-text-1)" }}>{tx.ua_meal_b}</div>
                    <button onClick={() => gallery2Ref.current?.click()}
                      style={{ padding: "8px 16px", borderRadius: 12, border: "0.5px solid var(--nova-purple-border)", background: "rgba(139,92,246,0.10)", color: "rgba(139,92,246,0.85)", fontSize: 9, cursor: "pointer" }}>
                      {tx.ua_gallery}
                    </button>
                  </>
                )}
            </div>
          )}
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCameraCapture(f); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, 1); e.target.value = ""; }} />
      <input ref={gallery2Ref} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, 2); e.target.value = ""; }} />

      {/* Loading — Nova Aurora Activity Rings */}
      {(loading || urlLoading) && (
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, background: "var(--nova-bg)", minHeight: 420, display: "flex", flexDirection: "column" }}>

          {/* Aurora inner glow */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 200% 60% at 30% -10%, rgba(139,92,246,0.08) 0%, transparent 60%), radial-gradient(ellipse 150% 40% at 80% 20%, rgba(236,72,153,0.05) 0%, transparent 50%), radial-gradient(ellipse 200% 80% at 10% 80%, rgba(6,182,212,0.04) 0%, transparent 60%)", pointerEvents: "none" }} />

          {/* Scanline beam */}
          <div style={{ position: "absolute", left: 0, right: 0, height: 80, background: "linear-gradient(180deg,transparent,var(--ring-scan),var(--ring-scan),transparent)", animation: "ring-scanbar 5s linear infinite", pointerEvents: "none", zIndex: 3 }} />

          {/* Header row */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 6 }}>
            <div>
              <div style={{ fontSize: 7, color: "var(--nova-text-4)", letterSpacing: 4, fontWeight: 500 }}>GLUCOLENS</div>
              <div style={{ fontSize: 7, color: "var(--nova-purple)", letterSpacing: 2, marginTop: 2, animation: "ring-flicker 2.5s infinite" }}>AI · ACTIVE</div>
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
              {[0, 0.4, 0.8].map((d, i) => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--ring-tick)", animation: `ring-tick 1.2s ${d}s infinite` }} />
              ))}
            </div>
          </div>

          {/* Rings container */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 32, paddingBottom: 60, position: "relative" }}>

            {/* Expand pulse SVG */}
            <svg width="210" height="210" viewBox="0 0 210 210" style={{ position: "absolute", overflow: "visible", pointerEvents: "none" }}>
              <circle cx="105" cy="105" r="68" fill="none" stroke="var(--ring-gl)" strokeWidth="0.5">
                <animate attributeName="r" values="68;108;68" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0;0.5" dur="2.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="105" cy="105" r="68" fill="none" stroke="var(--ring-gl)" strokeWidth="0.5">
                <animate attributeName="r" values="68;108;68" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
              </circle>
            </svg>

            {/* Main rings SVG */}
            <svg width="210" height="210" viewBox="0 0 210 210" style={{ position: "absolute", overflow: "visible" }}>
              <defs>
                <filter id="rl-glow1" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="rl-glow2" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="rl-glow3" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="8" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* Track rings */}
              <circle cx="105" cy="105" r="93" fill="none" stroke="var(--ring-gl-dim)"    strokeWidth="10" />
              <circle cx="105" cy="105" r="74" fill="none" stroke="var(--ring-neural-dim)" strokeWidth="10" />
              <circle cx="105" cy="105" r="55" fill="none" stroke="var(--ring-heart-dim)"  strokeWidth="10" />
              {/* GL ring — cyan, clockwise */}
              <g filter="url(#rl-glow1)">
                <circle cx="105" cy="105" r="93" fill="none" stroke="var(--ring-gl)" strokeWidth="10" strokeLinecap="round" strokeDasharray="345 540"
                  style={{ transformOrigin: "105px 105px", animation: "ring-spin-cw 7s cubic-bezier(0.45,0.05,0.55,0.95) infinite" }} />
                <circle cx="105" cy="12" r="6.5" fill="var(--ring-gl)" filter="url(#rl-glow2)"
                  style={{ transformOrigin: "105px 105px", animation: "ring-spin-cw 7s cubic-bezier(0.45,0.05,0.55,0.95) infinite" }} />
              </g>
              {/* Neural ring — purple, counter-clockwise */}
              <g filter="url(#rl-glow1)">
                <circle cx="105" cy="105" r="74" fill="none" stroke="var(--ring-neural)" strokeWidth="10" strokeLinecap="round" strokeDasharray="255 428"
                  style={{ transformOrigin: "105px 105px", animation: "ring-spin-ccw 5.5s cubic-bezier(0.45,0.05,0.55,0.95) infinite" }} />
                <circle cx="105" cy="31" r="5.5" fill="var(--ring-neural)" filter="url(#rl-glow2)"
                  style={{ transformOrigin: "105px 105px", animation: "ring-spin-ccw 5.5s cubic-bezier(0.45,0.05,0.55,0.95) infinite" }} />
              </g>
              {/* Heart ring — red, clockwise fast */}
              <g filter="url(#rl-glow1)">
                <circle cx="105" cy="105" r="55" fill="none" stroke="var(--ring-heart)" strokeWidth="10" strokeLinecap="round" strokeDasharray="188 318"
                  style={{ transformOrigin: "105px 105px", animation: "ring-spin-cw 4s cubic-bezier(0.45,0.05,0.55,0.95) infinite" }} />
                <circle cx="105" cy="50" r="5" fill="var(--ring-heart)" filter="url(#rl-glow3)"
                  style={{ transformOrigin: "105px 105px", animation: "ring-spin-cw 4s cubic-bezier(0.45,0.05,0.55,0.95) infinite" }}>
                  <animate attributeName="r" values="5;7.5;5" dur="0.85s" repeatCount="indefinite" />
                </circle>
              </g>
            </svg>

            {/* Center disk */}
            <div style={{ width: 78, height: 78, borderRadius: "50%", background: "var(--ring-center-bg)", border: "1px solid var(--ring-center-bd)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 0 0 8px var(--nova-purple-dim)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
              <svg width="24" height="22" viewBox="0 0 24 22" fill="none" style={{ animation: "ring-hb 0.85s ease-in-out infinite", marginBottom: 4 }}>
                <path d="M12 20C12 20 1 13 1 6C1 3.2 3.2 1 6 1C8.2 1 10.4 2.4 12 4.5C13.6 2.4 15.8 1 18 1C20.8 1 23 3.2 23 6C23 13 12 20 12 20Z"
                  fill="rgba(255,45,80,0.15)" stroke="var(--ring-heart)" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              <div style={{ fontSize: 7, color: "var(--nova-text-3)", letterSpacing: 2, fontFamily: "monospace" }}>·—·</div>
              <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "1px solid var(--nova-purple-border)", animation: "ring-breathe 3s ease-in-out infinite" }} />
            </div>

            {/* Side data labels */}
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-40%)", fontFamily: "monospace", fontSize: 7, lineHeight: "20px", color: "var(--ring-data-l)" }}>
              {["GL", "GI", "HR", "O₂", "AI"].map((l, i) => (
                <div key={l} style={{ animation: `ring-flicker 3s ${i * 0.4}s infinite` }}>{l}</div>
              ))}
            </div>
            <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-40%)", fontFamily: "monospace", fontSize: 7, lineHeight: "20px", color: "var(--ring-data-r)", textAlign: "right" }}>
              {["—", "—", "72", "99", "ON"].map((v, i) => (
                <div key={i} style={{ animation: `ring-flicker 2.8s ${i * 0.4 + 0.2}s infinite` }}>{v}</div>
              ))}
            </div>

            {/* Floating particles */}
            {[
              { c: "var(--ring-gl)",    l: "22%", d: "3.5s", dx: "-5px" },
              { c: "var(--ring-neural)", l: "74%", d: "4.2s", dx: "6px",  delay: "0.9s" },
              { c: "var(--ring-heart)", l: "50%", d: "3.8s", dx: "-3px", delay: "2.2s" },
              { c: "var(--ring-gl)",    l: "36%", d: "3s",   dx: "4px",  delay: "1.4s" },
            ].map((p, i) => (
              <div key={i} style={{ position: "absolute", width: 2.5, height: 2.5, background: p.c, borderRadius: "50%", bottom: "28%", left: p.l, animation: `ring-float-p ${p.d} ${p.delay || "0s"} ease-in-out infinite`, ["--dx" as string]: p.dx, opacity: 0 } as React.CSSProperties} />
            ))}
          </div>

          {/* Legend */}
          <div style={{ position: "absolute", bottom: 52, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 14, zIndex: 4 }}>
            {[{c:"var(--ring-gl)",l:"GL"},{c:"var(--ring-neural)",l:"NEURAL"},{c:"var(--ring-heart)",l:"HEART"}].map(item=>(
              <div key={item.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.c, boxShadow: `0 0 5px ${item.c}` }} />
                <span style={{ fontSize: 7, color: "var(--ring-legend)", letterSpacing: 1, fontFamily: "monospace" }}>{item.l}</span>
              </div>
            ))}
          </div>

          {/* Bottom progress */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 16px 14px", zIndex: 6 }}>
            <div style={{ fontSize: 9, color: "var(--ring-scan-txt)", letterSpacing: 1, fontFamily: "monospace", textAlign: "center", marginBottom: 8, transition: "opacity 0.3s" }}>
              {(mode === "url" && elapsed < 2.5) ? tx.ua_reading_page : stage.label}
              <span style={{ opacity: 0.5 }}>{".".repeat(1 + (Math.floor(elapsed * 2) % 3))}</span>
            </div>
            <div style={{ height: 2, borderRadius: 1, overflow: "hidden", background: "var(--ring-prog-track)", marginBottom: 6, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,var(--ring-shimmer),transparent)", animation: "ring-shimmer 2.2s ease-in-out infinite" }} />
              <div style={{ height: 2, borderRadius: 1, background: "linear-gradient(90deg,var(--ring-gl),var(--ring-neural))", boxShadow: "0 0 8px var(--ring-gl)", width: `${stage.pct}%`, transition: "width 0.7s cubic-bezier(0.25,0.8,0.35,1)", position: "relative", zIndex: 1 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 6, fontFamily: "monospace", letterSpacing: 1, color: "var(--ring-prog-l)" }}>GL · SCAN</span>
              <span style={{ fontSize: 6, fontFamily: "monospace", letterSpacing: 1, color: "var(--ring-prog-r)" }}>AI · PROC</span>
            </div>
          </div>
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
            <p className="text-center text-gray-500 text-sm">{tx.ua_compare_select_b}</p>
          )}

          <button onClick={analyze}
            disabled={mode === "compare" ? (!image || !image2) : !image}
            className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-40 transition-all">
            {mode === "pre_meal" ? tx.ua_predict_btn : mode === "compare" ? tx.ua_compare_btn : tx.analyze_btn}
          </button>
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="bg-red-950 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">
          {error} <button onClick={reset} className="ml-2 underline">{tx.ua_try_again}</button>
        </div>
      )}

      {saved && !loading && (
        <div className="bg-green-950 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm text-center">
          {mode === "pre_meal" ? tx.ua_premeal_saved : tx.ua_saved_history}
        </div>
      )}

      {/* Compare results */}
      {result && result2 && mode === "compare" && !loading && (
        <div className="space-y-4">
          <h3 className="text-center text-white font-semibold">{tx.ua_comparison}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: tx.ua_meal_a, res: result, pv: preview }, { label: tx.ua_meal_b, res: result2, pv: preview2 }].map(({ label, res, pv }) => (
              <div key={label} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                {pv && <img src={pv} alt={label} className="w-full h-24 rounded-lg object-cover mb-2" />}
                <div className="text-xs font-medium text-gray-400 mb-1">{label}</div>
                <div className={`text-lg font-bold ${res.glucose_risk === "low" ? "text-green-400" : res.glucose_risk === "medium" ? "text-amber-400" : "text-red-400"}`}>
                  GL {res.total_glycemic_load}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {tx.ua_sugar_label} {res.total_sugar_g}g · {tx.ua_fiber_label} {res.total_fiber_g}g<br/>{tx.ua_risk_label} {res.glucose_risk === "low" ? tx.ua_risk_low : res.glucose_risk === "medium" ? tx.ua_risk_med : tx.ua_risk_high}
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
              ? `${tx.ua_meal_a_better} — ${(result2.total_glycemic_load - result.total_glycemic_load).toFixed(1)} ${tx.ua_gl_lower}`
              : result2.total_glycemic_load < result.total_glycemic_load
              ? `${tx.ua_meal_b_better} — ${(result.total_glycemic_load - result2.total_glycemic_load).toFixed(1)} ${tx.ua_gl_lower}`
              : tx.ua_similar_impact}
          </div>
          <button onClick={reset} className="w-full py-3 rounded-xl text-gray-400 bg-gray-900 hover:bg-gray-800 text-sm border border-gray-800">
            {tx.ua_compare_other}
          </button>
        </div>
      )}

      {/* Normal / pre-meal results */}
      {result && !result2 && !loading && (
        <div className="space-y-4">
          {mode === "pre_meal" && (
            <div className="bg-blue-950 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-300 text-center">
              {tx.ua_premeal_badge}
            </div>
          )}

          {(preview || barcodeProduct?.image_url) && (
            <div className="flex items-center gap-3 bg-gray-900 rounded-xl p-3 border border-gray-800">
              <img src={barcodeProduct?.image_url || preview || ""} alt="meal"
                className="w-16 h-16 rounded-lg object-cover shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-gray-500">{mode === "pre_meal" ? tx.ua_premeal_label : tx.ua_analyzed_meal}</div>
                <div className="text-sm text-gray-300 mt-0.5 truncate">
                  {result.food_items.slice(0, 2).map(f => foodName(f)).join(", ")}
                  {result.food_items.length > 2 && ` +${result.food_items.length - 2} ${tx.ua_more}`}
                </div>
              </div>
            </div>
          )}

          <GlucoseMeter risk={result.glucose_risk} gl={result.total_glycemic_load} lang={lang} />

          {/* Honesty: AI estimate + confidence — for a health app, trust is the product */}
          {(() => {
            const c = result.confidence_score ?? 0.7;
            const band = c >= 0.8
              ? { label: tx.ua_conf_high, color: "rgba(16,185,129,0.9)" }
              : c >= 0.6
              ? { label: tx.ua_conf_moderate, color: "rgba(245,158,11,0.9)" }
              : { label: tx.ua_conf_low, color: "rgba(239,68,68,0.9)" };
            return (
              <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 flex items-center gap-3">
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: band.color, flexShrink: 0 }} />
                <div className="min-w-0">
                  <div className="text-sm" style={{ color: band.color }}>{band.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {tx.ua_ai_estimate_note}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Stat grid — Nova Aurora 2-col with accent borders */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              { label: tx.total_sugar, value: `${result.total_sugar_g}g`,      color: "rgba(239,68,68,0.85)",   accent: "rgba(239,68,68,0.55)",   Icon: Candy,   iconBg: "rgba(239,68,68,0.07)" },
              { label: tx.net_carbs,   value: `${result.total_net_carb_g}g`,    color: "rgba(59,130,246,0.85)",  accent: "rgba(59,130,246,0.55)",  Icon: Wheat,   iconBg: "rgba(59,130,246,0.07)" },
              { label: tx.ua_protein,  value: `${result.total_protein_g ?? 0}g`, color: "rgba(139,92,246,0.85)", accent: "rgba(139,92,246,0.55)", Icon: Egg,     iconBg: "rgba(139,92,246,0.07)" },
              { label: tx.ua_fat,      value: `${result.total_fat_g ?? 0}g`,     color: "rgba(245,158,11,0.85)", accent: "rgba(245,158,11,0.55)", Icon: Droplet, iconBg: "rgba(245,158,11,0.07)" },
              { label: tx.fiber,       value: `${result.total_fiber_g}g`,        color: "rgba(16,185,129,0.85)", accent: "rgba(16,185,129,0.55)", Icon: Leaf,    iconBg: "rgba(16,185,129,0.07)" },
              { label: "kcal",         value: `${result.total_calories ?? 0}`,   color: "rgba(255,255,255,0.4)", accent: "rgba(255,255,255,0.12)", Icon: Flame,   iconBg: "rgba(255,255,255,0.04)" },
              ].map((s) => (
              <div key={s.label} style={{
                background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)",
                borderRadius: 12, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8,
                borderLeft: `2px solid ${s.accent}`,
              }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <s.Icon size={13} strokeWidth={1.75} color={s.color} aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 7, color: "var(--nova-text-3)", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
                </div>
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
              <h3 className="text-sm font-medium text-red-400 mb-2">{tx.ua_warnings}</h3>
              {result.warnings.map((w, i) => <p key={i} className="text-red-300 text-sm">· {w}</p>)}
            </div>
          )}

          {/* Food items — Nova Aurora cards */}
          <div>
            <div style={{ fontSize: 7, color: "var(--nova-text-4)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>{tx.detected_foods}</div>
            {result.food_items.map((item, i) => {
              const gl = item.glycemic_load;
              const accent = gl < 10 ? "rgba(16,185,129,0.65)" : gl <= 20 ? "rgba(245,158,11,0.65)" : "rgba(239,68,68,0.65)";
              const glColor = gl < 10 ? "rgba(16,185,129,0.85)" : gl <= 20 ? "rgba(245,158,11,0.85)" : "rgba(239,68,68,0.85)";
              return (
                <div key={i} style={{
                  background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)",
                  borderRadius: 12, padding: "8px 10px", display: "flex", alignItems: "center",
                  gap: 8, marginBottom: 5,
                }}>
                  <div style={{ width: 2, borderRadius: 1, alignSelf: "stretch", flexShrink: 0, background: accent }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "var(--nova-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{foodName(item)}</div>
                    <div style={{ fontSize: 7, color: "var(--nova-text-4)", marginTop: 2 }}>{item.portion_g}g{item.cooking_method ? ` · ${item.cooking_method}` : ""}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: glColor, lineHeight: 1 }}>{item.glycemic_load}</div>
                    <div style={{ fontSize: 6, color: "var(--nova-text-4)", letterSpacing: 0.5 }}>GI {item.glycemic_index}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {result.hidden_ingredients_note && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-400">
              🔍 {result.hidden_ingredients_note}
            </div>
          )}

          {/* Timing Nudges + Glucose Curve */}
          <TimingNudges analysis={result} lang={lang} />

          {/* Share */}
          <ShareCard analysis={result} photoBase64={image || undefined} lang={lang} />

          {result.recommendations.length > 0 && (
            <div className="bg-teal-950 border border-teal-500/30 rounded-xl p-4">
              <h3 className="text-sm font-medium text-teal-400 mb-2">{tx.tips}</h3>
              {result.recommendations.map((r, i) => (
                <p key={i} className="text-gray-300 text-sm mt-1">→ {r}</p>
              ))}
            </div>
          )}

          {/* "Was this accurate?" — honest feedback loop (sets expectations, collects signal) */}
          <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            {feedback === null ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-400">
                  {tx.ua_feedback_q}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => submitFeedback("up")}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-green-900/40 text-gray-300 border border-gray-700 transition-all">
                    👍 {tx.ua_feedback_yes}
                  </button>
                  <button onClick={() => submitFeedback("down")}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-red-900/40 text-gray-300 border border-gray-700 transition-all">
                    👎 {tx.ua_feedback_no}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 text-center">
                {feedback === "up"
                  ? tx.ua_feedback_thanks
                  : tx.ua_feedback_thanks_saved}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-600 text-center">{tx.disclaimer}</p>

          <button onClick={reset} className="nova-btn-primary">
            <Camera size={16} strokeWidth={1.75} aria-hidden="true" style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} /> {tx.ua_new_analysis}
          </button>
        </div>
      )}
    </div>
  );
}
