"use client";
import { useState, useRef, useCallback } from "react";
import {
  lookupDrink, calculateDrinkGL, getDiabetesRiskLabel,
  DRINK_DATABASE, SAFE_DRINKS, HIGH_RISK_DRINKS,
  type DrinkEntry,
} from "@/lib/drink-data";
import type { Lang } from "@/lib/i18n";

interface AnalyzedDrink {
  entry: DrinkEntry;
  serving_ml: number;
  gl: number;
  sugar_g: number;
  cal: number;
  carb_g: number;
  alcohol_g: number;
}

interface Props {
  lang: Lang;
  userType?: string;
}

const CATEGORIES = [
  { key: "all", label: "All", icon: "🥤" },
  { key: "beer", label: "Beer", icon: "🍺" },
  { key: "wine", label: "Wine", icon: "🍷" },
  { key: "spirit", label: "Spirits", icon: "🥃" },
  { key: "liqueur", label: "Liqueur", icon: "🍸" },
  { key: "cocktail", label: "Cocktails", icon: "🍹" },
  { key: "juice", label: "Juice", icon: "🥤" },
  { key: "soda", label: "Soda", icon: "🥤" },
  { key: "coffee", label: "Coffee", icon: "☕" },
  { key: "tea", label: "Tea", icon: "🍵" },
  { key: "traditional", label: "Turkish", icon: "🫖" },
];

export function DrinkAnalyzer({ lang, userType = "healthy" }: Props) {
  const [mode, setMode] = useState<"search" | "photo" | "browse">("search");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [result, setResult] = useState<AnalyzedDrink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servingMl, setServingMl] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const photoRef = useRef<HTMLInputElement>(null);

  const riskColor = (risk: string) => {
    if (risk === "low") return "text-green-400";
    if (risk === "medium") return "text-amber-400";
    if (risk === "high") return "text-red-400";
    return "text-red-600";
  };

  const riskBg = (risk: string) => {
    if (risk === "low") return "bg-green-950/50 border-green-500/30";
    if (risk === "medium") return "bg-amber-950/50 border-amber-500/30";
    if (risk === "high") return "bg-red-950/50 border-red-500/30";
    return "bg-red-950 border-red-600/50";
  };

  function handleSearch(val: string) {
    setQuery(val);
    setResult(null);
    setError(null);
    if (val.length < 2) { setSuggestions([]); return; }
    const lower = val.toLowerCase();
    const matches = Object.keys(DRINK_DATABASE)
      .filter(k => k.includes(lower) || lower.includes(k))
      .slice(0, 8);
    setSuggestions(matches);
  }

  function selectDrink(key: string) {
    const entry = DRINK_DATABASE[key];
    if (!entry) return;
    setQuery(entry.name_tr || entry.name);
    setSuggestions([]);
    const ml = entry.serving_ml;
    setServingMl(ml);
    buildResult(entry, ml);
  }

  function buildResult(entry: DrinkEntry, ml: number) {
    const gl = calculateDrinkGL(entry, ml);
    const ratio = ml / 100;
    setResult({
      entry,
      serving_ml: ml,
      gl,
      sugar_g: parseFloat((entry.sugar_per_100ml * ratio).toFixed(1)),
      cal: parseFloat((entry.cal_per_100ml * ratio).toFixed(0)),
      carb_g: parseFloat((entry.carb_per_100ml * ratio).toFixed(1)),
      alcohol_g: parseFloat((entry.alcohol_pct * ratio * 0.789).toFixed(1)),
    });
  }

  function updateServing(ml: number) {
    if (!result) return;
    setServingMl(ml);
    buildResult(result.entry, ml);
  }

  // Photo analysis via Claude
  const analyzePhoto = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const url = e.target?.result as string;
        const base64 = url.includes(",") ? url.split(",")[1] : url;

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            userType,
            mealContext: "DRINK_MODE: This is a drink/beverage image. Identify the drink name, brand if visible, and estimate GL, sugar, alcohol content. Return your standard JSON but focus on drink properties.",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Analysis failed");

        // Try to match with our DB
        const analysis = data.analysis;
        if (analysis?.food_items?.[0]) {
          const item = analysis.food_items[0];
          const dbMatch = lookupDrink(item.name_tr || item.name);
          if (dbMatch) {
            setQuery(dbMatch.name_tr || dbMatch.name);
            setServingMl(dbMatch.serving_ml);
            buildResult(dbMatch, dbMatch.serving_ml);
          } else {
            // Use Claude's analysis directly
            const synth: DrinkEntry = {
              name: item.name,
              name_tr: item.name_tr,
              category: "soda",
              alcohol_pct: 0,
              carb_per_100ml: (item.carbohydrate_g / item.portion_g) * 100,
              sugar_per_100ml: (item.total_sugar_g / item.portion_g) * 100,
              cal_per_100ml: 0,
              gi: item.glycemic_index,
              serving_ml: item.portion_g,
              diabetes_risk: analysis.glucose_risk === "high" ? "high" : analysis.glucose_risk === "medium" ? "medium" : "low",
              hypo_risk: false,
              source: "AI Vision",
            };
            setQuery(item.name_tr || item.name);
            setServingMl(item.portion_g);
            buildResult(synth, item.portion_g);
          }
        }
        setLoading(false);
      };
      reader.onerror = () => { throw new Error("Could not read image"); };
      reader.readAsDataURL(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setLoading(false);
    }
  }, [userType]);

  // Browse mode — filter by category
  const browseItems = Object.entries(DRINK_DATABASE)
    .filter(([, v]) => activeCategory === "all" || v.category === activeCategory)
    // Deduplicate by name
    .filter(([, v], i, arr) => arr.findIndex(([, v2]) => v2.name === v.name) === i)
    .sort((a, b) => a[1].diabetes_risk.localeCompare(b[1].diabetes_risk));

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { key: "search", icon: "🔍", label: "Search" },
          { key: "photo",  icon: "📷", label: "Photo" },
          { key: "browse", icon: "📋", label: "Browse" },
        ] as { key: typeof mode; icon: string; label: string }[]).map(m => (
          <button key={m.key} onClick={() => { setMode(m.key); setResult(null); setQuery(""); setSuggestions([]); }}
            className={`py-2.5 rounded-xl text-xs font-medium transition-all ${
              mode === m.key ? "bg-teal-600 text-white" : "bg-gray-900 text-gray-400 border border-gray-800"
            }`}>
            <div className="text-lg">{m.icon}</div>
            <div>{m.label}</div>
          </button>
        ))}
      </div>

      {/* Search Mode */}
      {mode === "search" && (
        <div className="space-y-4">
          <div className="relative">
            <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)}
              placeholder="e.g. mojito, bira, beyaz şarap, cola..."
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500" />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-xl mt-1 z-10 shadow-xl overflow-hidden">
                {suggestions.map(s => (
                  <button key={s} onClick={() => selectDrink(s)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0 flex items-center gap-2">
                    <span>{DRINK_DATABASE[s].name_tr || DRINK_DATABASE[s].name}</span>
                    <span className={`text-xs ml-auto ${riskColor(DRINK_DATABASE[s].diabetes_risk)}`}>
                      {getDiabetesRiskLabel(DRINK_DATABASE[s].diabetes_risk)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick picks */}
          {!result && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-green-500 mb-2">✅ Safe choices</p>
                <div className="flex flex-wrap gap-2">
                  {SAFE_DRINKS.slice(0, 6).map(d => DRINK_DATABASE[d] && (
                    <button key={d} onClick={() => selectDrink(d)}
                      className="text-xs px-3 py-1.5 bg-green-950/40 hover:bg-green-900/50 text-green-300 rounded-full border border-green-500/20 transition-all">
                      {DRINK_DATABASE[d].name_tr || DRINK_DATABASE[d].name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-red-500 mb-2">⛔ Avoid or limit</p>
                <div className="flex flex-wrap gap-2">
                  {HIGH_RISK_DRINKS.slice(0, 5).map(d => DRINK_DATABASE[d] && (
                    <button key={d} onClick={() => selectDrink(d)}
                      className="text-xs px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-300 rounded-full border border-red-500/20 transition-all">
                      {DRINK_DATABASE[d].name_tr || DRINK_DATABASE[d].name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Photo Mode */}
      {mode === "photo" && !loading && !result && (
        <div className="space-y-3">
          <button onClick={() => photoRef.current?.click()}
            className="w-full py-8 rounded-2xl border-2 border-dashed border-gray-700 hover:border-teal-500 transition-colors text-center space-y-2">
            <div className="text-4xl">📷</div>
            <p className="text-gray-300 font-medium">Take photo of drink</p>
            <p className="text-gray-600 text-sm">Bottle, glass, can, menu item</p>
          </button>
          <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) analyzePhoto(f); e.target.value = ""; }} />
          <p className="text-center text-gray-600 text-xs">
            Claude reads labels, colors, and glass type to identify the drink
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl animate-bounce">🔍</div>
          <p className="text-teal-400 font-medium">Identifying drink...</p>
        </div>
      )}

      {/* Browse Mode */}
      {mode === "browse" && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeCategory === cat.key
                    ? "bg-teal-600 text-white"
                    : "bg-gray-900 text-gray-400 border border-gray-800"
                }`}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {browseItems.map(([key, entry]) => (
              <button key={key} onClick={() => { selectDrink(key); setMode("search"); }}
                className={`w-full rounded-xl p-3 border text-left transition-all hover:opacity-80 ${riskBg(entry.diabetes_risk)}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-white text-sm font-medium">{entry.name_tr || entry.name}</span>
                    <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                      {entry.alcohol_pct > 0 && <span>🍶 {entry.alcohol_pct}%</span>}
                      <span>🍬 {entry.sugar_per_100ml}g sugar/100ml</span>
                      <span>🔥 {entry.cal_per_100ml}kcal/100ml</span>
                    </div>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ml-2 ${riskColor(entry.diabetes_risk)}`}>
                    {getDiabetesRiskLabel(entry.diabetes_risk)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Header */}
          <div className={`rounded-2xl p-4 border ${riskBg(result.entry.diabetes_risk)}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white font-bold text-lg">{result.entry.name_tr || result.entry.name}</h3>
                <p className="text-gray-400 text-sm capitalize">{result.entry.subcategory || result.entry.category}</p>
              </div>
              <div className={`text-right ${riskColor(result.entry.diabetes_risk)}`}>
                <div className="text-2xl font-bold">{getDiabetesRiskLabel(result.entry.diabetes_risk)}</div>
                {result.entry.alcohol_pct > 0 && (
                  <div className="text-xs text-gray-400 mt-0.5">{result.entry.alcohol_pct}% ABV</div>
                )}
              </div>
            </div>
          </div>

          {/* Serving size */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-gray-400">Serving size</label>
              <div className="flex items-center gap-2">
                <button onClick={() => updateServing(Math.max(30, servingMl - 50))}
                  className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg text-white">−</button>
                <span className="text-white font-bold w-20 text-center">{servingMl} ml</span>
                <button onClick={() => updateServing(servingMl + 50)}
                  className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg text-white">+</button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[result.entry.serving_ml, ...[100, 200, 330, 500].filter(v => v !== result.entry.serving_ml)].slice(0, 5).map(ml => (
                <button key={ml} onClick={() => updateServing(ml)}
                  className={`flex-1 py-1.5 rounded-lg text-xs transition-all ${servingMl === ml ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                  {ml}ml
                </button>
              ))}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 text-center">
              <div className={`text-3xl font-bold ${riskColor(result.entry.diabetes_risk)}`}>{result.gl}</div>
              <div className="text-xs text-gray-500 mt-1">Glycemic Load</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 text-center">
              <div className="text-3xl font-bold text-amber-400">{result.sugar_g}g</div>
              <div className="text-xs text-gray-500 mt-1">Sugar</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 text-center">
              <div className="text-3xl font-bold text-orange-400">{result.cal}</div>
              <div className="text-xs text-gray-500 mt-1">Calories</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 text-center">
              <div className="text-3xl font-bold text-purple-400">{result.alcohol_g}g</div>
              <div className="text-xs text-gray-500 mt-1">Alcohol</div>
            </div>
          </div>

          {/* Hypo warning */}
          {result.entry.hypo_risk && (
            <div className="bg-orange-950/60 border border-orange-500/40 rounded-xl p-3 flex gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-orange-300 font-medium text-sm">Hypoglycemia Risk</p>
                <p className="text-orange-400/70 text-xs mt-0.5">
                  Alcohol suppresses liver glucose production. Risk is highest 8–12 hours after drinking, especially on empty stomach. Eat carbs before/while drinking.
                </p>
              </div>
            </div>
          )}

          {/* Diabetic warning */}
          {(userType === "diabetic" || userType === "pre_diabetic") && result.entry.alcohol_pct > 0 && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex gap-2">
              <span className="text-xl">🩺</span>
              <div>
                <p className="text-red-300 font-medium text-sm">
                  {userType === "diabetic" ? "Diabetic" : "Pre-diabetic"} caution
                </p>
                <p className="text-red-400/70 text-xs mt-0.5">
                  Consult your doctor about alcohol consumption. Always eat before drinking. Monitor blood sugar more frequently.
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {result.entry.notes && (
            <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
              <p className="text-gray-400 text-sm">💡 {result.entry.notes}</p>
            </div>
          )}

          <button onClick={() => { setResult(null); setQuery(""); setSuggestions([]); }}
            className="w-full py-3 rounded-xl text-gray-400 bg-gray-900 border border-gray-800 text-sm">
            Search another drink
          </button>
        </div>
      )}
    </div>
  );
}
