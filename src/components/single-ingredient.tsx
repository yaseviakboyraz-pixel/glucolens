"use client";
import { useState } from "react";
import { lookupIngredient, GI_DATABASE } from "@/lib/turkish-gi-data";
import type { Lang } from "@/lib/i18n";
import { saveMeal } from "@/lib/storage";
import type { MealAnalysis } from "@/lib/claude-vision";

interface Props {
  lang: Lang;
  onSaved?: () => void;
}

const POPULAR_INGREDIENTS = [
  "beyaz pirinç", "bulgur", "makarna", "beyaz ekmek", "patates",
  "elma", "muz", "domates", "yumurta", "yoğurt",
  "nohut", "mercimek", "tavuk", "beyaz peynir", "badem",
];

export function SingleIngredientAnalyzer({ lang, onSaved }: Props) {
  const [query, setQuery] = useState("");
  const [portionG, setPortionG] = useState(100);
  const [result, setResult] = useState<ReturnType<typeof lookupIngredient> | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  function handleSearch(value: string) {
    setQuery(value);
    setSaved(false);
    if (value.length < 2) { setSuggestions([]); setResult(null); return; }
    const lower = value.toLowerCase();
    const matches = Object.keys(GI_DATABASE)
      .filter(k => k.includes(lower) || lower.includes(k))
      .slice(0, 8);
    setSuggestions(matches);
  }

  function selectIngredient(name: string) {
    setQuery(name);
    setSuggestions([]);
    setResult(lookupIngredient(name));
    setSaved(false);
  }

  function calculateForPortion() {
    if (!result) return null;
    const ratio = portionG / 100;
    const carbs = parseFloat(((result.carb_per_100g || 0) * ratio).toFixed(1));
    const fiber = parseFloat(((result.fiber_per_100g || 0) * ratio).toFixed(1));
    const netCarb = Math.max(0, parseFloat((carbs - fiber).toFixed(1)));
    const gi = result.gi;
    const gl = parseFloat(((gi * netCarb) / 100).toFixed(1));
    const protein = parseFloat(((result.protein_per_100g || 0) * ratio).toFixed(1));
    const fat = parseFloat(((result.fat_per_100g || 0) * ratio).toFixed(1));
    const cal = parseFloat(((result.cal_per_100g || 0) * ratio).toFixed(0));
    return { carbs, fiber, netCarb, gi, gl, protein, fat, cal };
  }

  function handleSave() {
    if (!result) return;
    const p = calculateForPortion();
    if (!p) return;
    const risk: "low" | "medium" | "high" = p.gl < 10 ? "low" : p.gl <= 20 ? "medium" : "high";
    const analysis: MealAnalysis = {
      food_items: [{
        name: query, name_tr: query, portion_g: portionG,
        total_sugar_g: 0, added_sugar_g: 0,
        carbohydrate_g: p.carbs, fiber_g: p.fiber, net_carb_g: p.netCarb,
        protein_g: p.protein, fat_g: p.fat, calories: p.cal,
        glycemic_index: p.gi, glycemic_load: p.gl,
        gi_confidence: result.confidence, cooking_method: "raw",
      }],
      total_sugar_g: 0, total_added_sugar_g: 0,
      total_net_carb_g: p.netCarb, total_fiber_g: p.fiber,
      total_protein_g: p.protein, total_fat_g: p.fat, total_calories: p.cal,
      avg_glycemic_index: p.gi, total_glycemic_load: p.gl,
      glucose_risk: risk,
      glucose_peak_estimate: "",
      glucose_curve_description: `${portionG}g ${query} — from GI database (${result.source})`,
      recommendations: [], warnings: [],
      confidence_score: result.confidence,
    };
    saveMeal(analysis);
    setSaved(true);
    onSaved?.();
  }

  const p = calculateForPortion();
  const riskColor = p ? (p.gl < 10 ? "text-green-400" : p.gl <= 20 ? "text-amber-400" : "text-red-400") : "";
  const confidenceLabel = result
    ? result.confidence >= 0.90 ? { label: "Lab verified", color: "text-green-400", icon: "✓" }
    : result.confidence >= 0.75 ? { label: "High confidence", color: "text-teal-400", icon: "≈" }
    : { label: "Estimated", color: "text-amber-400", icon: "~" }
    : null;

  return (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <h3 className="text-white font-semibold">🔬 Single Ingredient</h3>
        <p className="text-gray-500 text-xs mt-1">Search any food — get precise GL per portion</p>
      </div>

      {/* Search */}
      <div className="relative">
        <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)}
          placeholder="e.g. bulgur, elma, beyaz pirinç..."
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500" />
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-xl mt-1 z-10 overflow-hidden shadow-xl">
            {suggestions.map((s) => (
              <button key={s} onClick={() => selectIngredient(s)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0 capitalize">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Popular picks */}
      {!result && (
        <div>
          <p className="text-xs text-gray-600 mb-2">Popular ingredients</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_INGREDIENTS.map((ing) => (
              <button key={ing} onClick={() => selectIngredient(ing)}
                className="text-xs px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gray-200 rounded-full transition-all border border-gray-800">
                {ing}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && p && (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white font-semibold capitalize">{query}</h3>
              {result.category && <span className="text-xs text-gray-500 capitalize">{result.category.replace("_", " ")}</span>}
            </div>
            {confidenceLabel && (
              <div className={`text-xs ${confidenceLabel.color} flex items-center gap-1`}>
                <span>{confidenceLabel.icon}</span>
                <span>{confidenceLabel.label}</span>
                <span className="text-gray-600 ml-1">· {result.source}</span>
              </div>
            )}
          </div>

          {/* Portion selector */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-gray-400">Portion size</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setPortionG(Math.max(5, portionG - 10))}
                  className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg text-white">−</button>
                <span className="text-white font-bold w-16 text-center">{portionG}g</span>
                <button onClick={() => setPortionG(portionG + 10)}
                  className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg text-white">+</button>
              </div>
            </div>
            <div className="flex gap-2">
              {[25, 50, 100, 150, 200, 250].map((g) => (
                <button key={g} onClick={() => setPortionG(g)}
                  className={`flex-1 py-1.5 rounded-lg text-xs transition-all ${portionG === g ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                  {g}g
                </button>
              ))}
            </div>
          </div>

          {/* GL result */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
            <div className="text-xs text-gray-500 mb-1">Glycemic Load for {portionG}g</div>
            <div className={`text-5xl font-bold ${riskColor}`}>{p.gl}</div>
            <div className={`text-sm mt-1 ${riskColor}`}>
              {p.gl < 10 ? "✅ Low" : p.gl <= 20 ? "⚠️ Medium" : "🔴 High"} glycemic impact
            </div>
            <div className="text-xs text-gray-600 mt-2">GI: {p.gi} · Net carbs: {p.netCarb}g</div>
          </div>

          {/* Full nutrition */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Carbs", value: `${p.carbs}g`, color: "text-blue-400" },
              { label: "Fiber", value: `${p.fiber}g`, color: "text-green-400" },
              { label: "Net Carb", value: `${p.netCarb}g`, color: "text-teal-400" },
              { label: "Protein", value: `${p.protein}g`, color: "text-purple-400" },
              { label: "Fat", value: `${p.fat}g`, color: "text-amber-400" },
              { label: "Calories", value: `${p.cal}kcal`, color: "text-orange-400" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-900 rounded-xl p-2.5 text-center border border-gray-800">
                <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setResult(null); setQuery(""); setSuggestions([]); setSaved(false); }}
              className="flex-1 py-3 rounded-xl text-gray-400 bg-gray-900 border border-gray-800 text-sm">
              Search again
            </button>
            <button onClick={handleSave} disabled={saved}
              className="flex-1 py-3 rounded-xl text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 font-semibold text-sm transition-all">
              {saved ? "✓ Saved" : "Log to history"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
