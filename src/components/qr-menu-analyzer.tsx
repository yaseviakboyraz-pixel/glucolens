"use client";
import { useState, useRef, useCallback } from "react";
import type { Lang } from "@/lib/i18n";

interface Dish {
  name: string;
  name_tr?: string;
  category: string;
  estimated_gl: number;
  glucose_risk: "low" | "medium" | "high";
  gi_estimate: number;
  main_ingredients: string[];
  carb_heavy: boolean;
  fiber_rich: boolean;
  protein_rich: boolean;
  notes: string;
}

interface MenuAnalysis {
  restaurant_name?: string;
  cuisine_type?: string;
  dishes: Dish[];
  top_safe: string[];
  top_risky: string[];
  meal_tips: string[];
}

type Step = "scan" | "fetching" | "analyzing" | "result" | "error";

interface Props {
  lang: Lang;
  userType?: string;
}

export function QRMenuAnalyzer({ lang, userType = "healthy" }: Props) {
  const [step, setStep] = useState<Step>("scan");
  const [manualUrl, setManualUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuAnalysis | null>(null);
  const [filter, setFilter] = useState<"all" | "safe" | "risky">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [scanMode, setScanMode] = useState<"qr" | "photo" | "url">("qr");
  
  const qrInputRef = useRef<HTMLInputElement>(null);
  const menuPhotoRef = useRef<HTMLInputElement>(null);

  const riskColor = (risk: string) =>
    risk === "low" ? "text-green-400" : risk === "medium" ? "text-amber-400" : "text-red-400";
  const riskBg = (risk: string) =>
    risk === "low" ? "bg-green-500/20 border-green-500/30" : risk === "medium" ? "bg-amber-500/20 border-amber-500/30" : "bg-red-500/20 border-red-500/30";
  const riskLabel = (risk: string) =>
    risk === "low" ? "✅ Safe" : risk === "medium" ? "⚠️ Moderate" : "🔴 High Risk";

  const analyzeUrl = useCallback(async (url: string) => {
    setStep("fetching");
    setError(null);
    try {
      // Fetch menu content via proxy
      const fetchRes = await fetch("/api/menu-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const fetchData = await fetchRes.json();
      if (!fetchRes.ok) throw new Error(fetchData.error || "Could not load menu");

      setStep("analyzing");

      // Analyze with Claude
      const analyzeRes = await fetch("/api/menu-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fetchData, userType }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Analysis failed");

      setMenu(analyzeData.menu);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep("error");
    }
  }, [userType]);

  const analyzeImage = useCallback(async (file: File) => {
    setStep("analyzing");
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const url = e.target?.result as string;
        const base64 = url.includes(",") ? url.split(",")[1] : url;
        const contentType = file.type || "image/jpeg";

        const analyzeRes = await fetch("/api/menu-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "image", base64, contentType, userType }),
        });
        const analyzeData = await analyzeRes.json();
        if (!analyzeRes.ok) throw new Error(analyzeData.error || "Analysis failed");

        setMenu(analyzeData.menu);
        setStep("result");
      };
      reader.onerror = () => { throw new Error("Could not read image"); };
      reader.readAsDataURL(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep("error");
    }
  }, [userType]);

  // Handle QR code scan (reads barcode from image/camera)
  const handleQRScan = useCallback(async (file: File) => {
    setStep("fetching");
    setError(null);
    try {
      // Try BarcodeDetector first
      if ("BarcodeDetector" in window) {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = async () => {
          try {
            // @ts-expect-error BarcodeDetector not in TS types
            const detector = new BarcodeDetector({ formats: ["qr_code"] });
            const codes = await detector.detect(img);
            URL.revokeObjectURL(url);
            if (codes.length > 0) {
              const qrUrl = codes[0].rawValue;
              if (qrUrl.startsWith("http")) {
                await analyzeUrl(qrUrl);
              } else {
                setError(`QR contains: "${qrUrl}" — not a URL. Try URL mode.`);
                setStep("error");
              }
            } else {
              setError("No QR code found in image. Try URL mode or photo menu.");
              setStep("error");
            }
          } catch {
            URL.revokeObjectURL(url);
            setError("QR detection failed. Try URL mode.");
            setStep("error");
          }
        };
        img.src = url;
      } else {
        // Fallback: treat as menu photo
        await analyzeImage(file);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "QR scan failed");
      setStep("error");
    }
  }, [analyzeUrl, analyzeImage]);

  const reset = () => {
    setStep("scan");
    setMenu(null);
    setError(null);
    setManualUrl("");
    setFilter("all");
    setSelectedCategory("all");
  };

  // Filter dishes
  const categories = menu
    ? ["all", ...Array.from(new Set(menu.dishes.map(d => d.category)))]
    : [];

  const filteredDishes = menu?.dishes.filter(d => {
    if (filter === "safe" && d.glucose_risk !== "low") return false;
    if (filter === "risky" && d.glucose_risk === "low") return false;
    if (selectedCategory !== "all" && d.category !== selectedCategory) return false;
    return true;
  }) || [];

  const dishName = (d: Dish) => lang === "tr" ? (d.name_tr || d.name) : d.name;

  // ── SCAN STEP ─────────────────────────────────
  if (step === "scan") {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">🍽️</div>
          <h2 className="text-white font-bold text-lg">Restaurant Menu Analyzer</h2>
          <p className="text-gray-500 text-sm mt-1">
            Scan QR menu, photo, or paste URL to get GL scores for every dish
          </p>
        </div>

        {/* Mode tabs */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "qr", icon: "📷", label: "Scan QR" },
            { key: "photo", icon: "🖼️", label: "Menu Photo" },
            { key: "url", icon: "🔗", label: "Paste URL" },
          ] as { key: typeof scanMode; icon: string; label: string }[]).map(m => (
            <button key={m.key} onClick={() => setScanMode(m.key)}
              className={`py-3 rounded-xl text-sm font-medium transition-all ${
                scanMode === m.key ? "bg-teal-600 text-white" : "bg-gray-900 text-gray-400 border border-gray-800"
              }`}>
              <div className="text-xl">{m.icon}</div>
              <div className="text-xs mt-0.5">{m.label}</div>
            </button>
          ))}
        </div>

        {/* QR Mode */}
        {scanMode === "qr" && (
          <div className="space-y-3">
            <button onClick={() => qrInputRef.current?.click()}
              className="w-full py-5 rounded-2xl font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg">
              <span className="text-2xl">📷</span>
              Scan QR Code
            </button>
            <input ref={qrInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQRScan(f); e.target.value = ""; }} />
            <p className="text-center text-gray-600 text-xs">
              Point your camera at the QR code on the menu
            </p>
          </div>
        )}

        {/* Photo Mode */}
        {scanMode === "photo" && (
          <div className="space-y-3">
            <button onClick={() => menuPhotoRef.current?.click()}
              className="w-full py-5 rounded-2xl font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 transition-all flex items-center justify-center gap-3 text-lg">
              <span className="text-2xl">🖼️</span>
              Take Menu Photo
            </button>
            <input ref={menuPhotoRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) analyzeImage(f); e.target.value = ""; }} />
            <p className="text-center text-gray-600 text-xs">
              Photo the printed or digital menu — Claude will read it
            </p>
          </div>
        )}

        {/* URL Mode */}
        {scanMode === "url" && (
          <div className="space-y-3">
            <input type="url" value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://restaurant.com/menu"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500" />
            <button
              onClick={() => manualUrl.trim() && analyzeUrl(manualUrl.trim())}
              disabled={!manualUrl.trim()}
              className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-40 transition-all">
              Analyze Menu
            </button>
            <p className="text-center text-gray-600 text-xs">
              Paste the URL from the QR code or restaurant website
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── LOADING STEPS ──────────────────────────────
  if (step === "fetching" || step === "analyzing") {
    return (
      <div className="text-center py-16 space-y-5">
        <div className="text-5xl animate-bounce">{step === "fetching" ? "🔗" : "🧠"}</div>
        <div>
          <p className="text-teal-400 font-semibold text-lg">
            {step === "fetching" ? "Loading menu..." : "Analyzing dishes..."}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {step === "fetching"
              ? "Fetching menu content"
              : "Claude is calculating GL for every dish"}
          </p>
        </div>
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── ERROR ──────────────────────────────────────
  if (step === "error") {
    return (
      <div className="space-y-4">
        <div className="bg-red-950 border border-red-500/40 rounded-2xl p-6 text-center space-y-3">
          <div className="text-3xl">⚠️</div>
          <p className="text-red-300 font-medium">Could not analyze menu</p>
          <p className="text-red-400/70 text-sm">{error}</p>
        </div>
        <div className="space-y-2">
          <p className="text-gray-500 text-xs text-center">Try a different method:</p>
          <button onClick={() => { setScanMode("photo"); reset(); }}
            className="w-full py-3 rounded-xl bg-gray-900 text-gray-300 border border-gray-800 text-sm">
            📷 Take a photo of the menu instead
          </button>
          <button onClick={reset}
            className="w-full py-3 rounded-xl bg-gray-900 text-gray-400 border border-gray-800 text-sm">
            ← Try again
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT ─────────────────────────────────────
  if (!menu) return null;

  const safeCount = menu.dishes.filter(d => d.glucose_risk === "low").length;
  const riskyCount = menu.dishes.filter(d => d.glucose_risk === "high").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-white font-bold text-lg">
              {menu.restaurant_name || "Menu Analysis"}
            </h2>
            {menu.cuisine_type && (
              <p className="text-gray-500 text-sm">{menu.cuisine_type} cuisine</p>
            )}
          </div>
          <button onClick={reset} className="text-gray-600 hover:text-gray-400 text-sm">✕ New</button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{menu.dishes.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Total dishes</div>
          </div>
          <div className="bg-green-950/60 rounded-xl p-3 text-center border border-green-500/20">
            <div className="text-2xl font-bold text-green-400">{safeCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">Safe choices</div>
          </div>
          <div className="bg-red-950/60 rounded-xl p-3 text-center border border-red-500/20">
            <div className="text-2xl font-bold text-red-400">{riskyCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">High risk</div>
          </div>
        </div>
      </div>

      {/* Top recommendations */}
      {menu.top_safe.length > 0 && (
        <div className="bg-green-950/40 border border-green-500/30 rounded-2xl p-4">
          <h3 className="text-green-400 font-semibold text-sm mb-2">✅ Best choices for you</h3>
          <div className="flex flex-wrap gap-2">
            {menu.top_safe.map(d => (
              <span key={d} className="text-xs bg-green-900/50 text-green-300 px-3 py-1.5 rounded-full border border-green-500/20">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {menu.top_risky.length > 0 && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-4">
          <h3 className="text-red-400 font-semibold text-sm mb-2">🔴 Avoid or limit</h3>
          <div className="flex flex-wrap gap-2">
            {menu.top_risky.map(d => (
              <span key={d} className="text-xs bg-red-900/50 text-red-300 px-3 py-1.5 rounded-full border border-red-500/20">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {menu.meal_tips.length > 0 && (
        <div className="bg-teal-950/40 border border-teal-500/30 rounded-2xl p-4">
          <h3 className="text-teal-400 font-semibold text-sm mb-2">💡 Tips for this restaurant</h3>
          {menu.meal_tips.map((tip, i) => (
            <p key={i} className="text-gray-300 text-sm mt-1">→ {tip}</p>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {([
            { key: "all", label: `All (${menu.dishes.length})` },
            { key: "safe", label: `✅ Safe (${safeCount})` },
            { key: "risky", label: `🔴 Risky (${riskyCount})` },
          ] as { key: typeof filter; label: string }[]).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f.key ? "bg-teal-600 text-white" : "bg-gray-900 text-gray-400 border border-gray-800"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {categories.length > 2 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs transition-all ${
                  selectedCategory === cat
                    ? "bg-gray-600 text-white"
                    : "bg-gray-900 text-gray-500 border border-gray-800"
                }`}>
                {cat === "all" ? "All categories" : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dish list */}
      <div className="space-y-2">
        {filteredDishes.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No dishes match this filter</div>
        ) : (
          filteredDishes.map((dish, i) => (
            <div key={i} className={`rounded-xl p-4 border ${riskBg(dish.glucose_risk)}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">{dishName(dish)}</span>
                    <span className={`text-xs font-medium ${riskColor(dish.glucose_risk)}`}>
                      {riskLabel(dish.glucose_risk)}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>GL ~{dish.estimated_gl}</span>
                    <span>GI ~{dish.gi_estimate}</span>
                    {dish.protein_rich && <span className="text-purple-400">💪 Protein</span>}
                    {dish.fiber_rich && <span className="text-green-400">🌿 Fiber</span>}
                    {dish.carb_heavy && <span className="text-amber-400">🍞 Carb heavy</span>}
                  </div>
                  {dish.notes && (
                    <p className="text-gray-500 text-xs mt-1.5">{dish.notes}</p>
                  )}
                </div>
                <div className={`text-2xl font-bold ml-3 shrink-0 ${riskColor(dish.glucose_risk)}`}>
                  {dish.estimated_gl}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button onClick={reset}
        className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-all">
        🍽️ Analyze Another Restaurant
      </button>
    </div>
  );
}
