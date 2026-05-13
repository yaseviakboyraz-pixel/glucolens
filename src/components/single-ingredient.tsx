"use client";
import { useState } from "react";
import { lookupIngredient, searchGI } from "@/lib/gi-index";
import { claudeGIEstimate, type ClaudeFallbackResult } from "@/lib/claude-fallback";
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

export function SingleIngredientAnalyzer({ lang: _lang, onSaved }: Props) {
  const [query, setQuery] = useState("");
  const [portionG, setPortionG] = useState(100);
  const [result, setResult] = useState<ReturnType<typeof lookupIngredient> | null>(null);
  const [aiResult, setAiResult] = useState<ClaudeFallbackResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  function handleSearch(value: string) {
    setQuery(value);
    setSaved(false);
    setAiResult(null);
    if (value.length < 2) { setSuggestions([]); setResult(null); return; }
    setSuggestions(searchGI(value, 8));
  }

  async function runSearch(name: string) {
    setQuery(name);
    setSuggestions([]);
    setSaved(false);
    setAiResult(null);
    const dbResult = lookupIngredient(name);
    if (dbResult) {
      setResult(dbResult);
    } else {
      setResult(null);
      setAiLoading(true);
      const estimate = await claudeGIEstimate(name, portionG);
      setAiLoading(false);
      if (estimate) setAiResult(estimate);
    }
  }

  function calculateForPortion() {
    const ratio = portionG / 100;
    if (aiResult) {
      return {
        carbs: parseFloat((aiResult.carb_g).toFixed(1)),
        fiber: parseFloat((aiResult.fiber_g).toFixed(1)),
        netCarb: parseFloat((aiResult.net_carb_g).toFixed(1)),
        gi: aiResult.gi,
        gl: parseFloat((aiResult.gl).toFixed(1)),
        protein: parseFloat((aiResult.protein_g).toFixed(1)),
        fat: parseFloat((aiResult.fat_g).toFixed(1)),
        cal: aiResult.calories,
        confidence: aiResult.confidence,
        source: aiResult.source,
        notes: aiResult.notes,
        isAI: true,
      };
    }
    if (!result) return null;
    const carbs = parseFloat(((result.carb_per_100g || 0) * ratio).toFixed(1));
    const fiber = parseFloat(((result.fiber_per_100g || 0) * ratio).toFixed(1));
    const netCarb = Math.max(0, parseFloat((carbs - fiber).toFixed(1)));
    const gl = parseFloat(((result.gi * netCarb) / 100).toFixed(1));
    return {
      carbs, fiber, netCarb,
      gi: result.gi, gl,
      protein: parseFloat(((result.protein_per_100g || 0) * ratio).toFixed(1)),
      fat: parseFloat(((result.fat_per_100g || 0) * ratio).toFixed(1)),
      cal: parseFloat(((result.cal_per_100g || 0) * ratio).toFixed(0)),
      confidence: result.confidence,
      source: result.source,
      notes: "",
      isAI: false,
    };
  }

  function handleSave() {
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
        gi_confidence: p.confidence, cooking_method: "raw",
      }],
      total_sugar_g: 0, total_added_sugar_g: 0,
      total_net_carb_g: p.netCarb, total_fiber_g: p.fiber,
      total_protein_g: p.protein, total_fat_g: p.fat, total_calories: p.cal,
      avg_glycemic_index: p.gi, total_glycemic_load: p.gl,
      glucose_risk: risk,
      glucose_peak_estimate: "",
      glucose_curve_description: `${portionG}g ${query} — ${p.isAI ? "Claude AI Estimate" : `GI Database (${p.source})`}`,
      recommendations: p.notes ? [p.notes] : [],
      warnings: [],
      confidence_score: p.confidence,
    };
    saveMeal(analysis);
    setSaved(true);
    onSaved?.();
  }

  const p = calculateForPortion();
  const riskColor = p ? (p.gl < 10 ? "text-green-400" : p.gl <= 20 ? "text-amber-400" : "text-red-400") : "";

  return (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <h3 className="text-white font-semibold">🔬 Single Ingredient</h3>
        <p className="text-gray-500 text-xs mt-1">Search any food — powered by AI if not in database</p>
      </div>

      {/* Search */}
      <div className="relative flex gap-2">
        <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
          placeholder="e.g. injera, big mac, matcha latte..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500" />
        <button onClick={() => runSearch(query)} disabled={aiLoading || query.length < 2}
          className="px-4 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-xl font-medium text-sm transition-all">
          {aiLoading ? "..." : "Search"}
        </button>

        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-12 bg-gray-900 border border-gray-700 rounded-xl mt-1 z-10 overflow-hidden shadow-xl">
            {suggestions.map((s) => (
              <button key={s} onClick={() => runSearch(s)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0 capitalize">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI Loading */}
      {aiLoading && (
        <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4 text-center">
          <div className="text-purple-400 text-sm animate-pulse">🤖 AI analyzing "{query}"...</div>
          <div className="text-gray-600 text-xs mt-1">Not in database — asking Claude</div>
        </div>
      )}

      {/* Popular picks */}
      {!result && !aiResult && !aiLoading && (
        <div>
          <p className="text-xs text-gray-600 mb-2">Popular ingredients</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_INGREDIENTS.map((ing) => (
              <button key={ing} onClick={() => runSearch(ing)}
                className="text-xs px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gray-200 rounded-full transition-all border border-gray-800">
                {ing}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {p && !aiLoading && (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white font-semibold capitalize">{query}</h3>
              <span className="text-xs text-gray-500">{p.source}</span>
            </div>
            {p.isAI ? (
              <div className="flex items-center gap-1 bg-purple-950/50 border border-purple-500/30 rounded-lg px-2 py-1">
                <span className="text-purple-400 text-xs">🤖 AI Estimate</span>
              </div>
            ) : (
              <div className={`text-xs flex items-center gap-1 ${p.confidence >= 0.9 ? "text-green-400" : p.confidence >= 0.75 ? "text-teal-400" : "text-amber-400"}`}>
                <span>{p.confidence >= 0.9 ? "✓" : "≈"}</span>
                <span>{p.confidence >= 0.9 ? "Lab verified" : "High confidence"}</span>
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

          {p.notes && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-xs text-gray-400">
              💡 {p.notes}
            </div>
          )}

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
            <button onClick={() => { setResult(null); setAiResult(null); setQuery(""); setSuggestions([]); setSaved(false); }}
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
