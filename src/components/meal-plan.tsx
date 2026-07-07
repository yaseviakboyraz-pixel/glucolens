"use client";
import { useState } from "react";
import { getT, type Lang } from "@/lib/i18n";

interface MealItem {
  name: string;
  portion_g: number;
  gl: number;
  gi: number;
}

interface Meal {
  type: "breakfast" | "lunch" | "dinner" | "snack";
  time_suggestion: string;
  name: string;
  name_tr?: string;
  description: string;
  items: MealItem[];
  meal_gl: number;
  meal_gi_avg: number;
  calories_est: number;
  protein_g: number;
  fiber_g: number;
  prep_tip: string;
  why_good: string;
  risk: "low" | "medium" | "high";
}

interface ShoppingItem {
  item: string;
  amount: string;
}

interface MealPlan {
  profile: string;
  daily_gl_target: number;
  daily_gl_total: number;
  meals: Meal[];
  daily_tips: string[];
  shopping_list: ShoppingItem[];
}

interface Props {
  lang: Lang;
  userType?: string;
}

const MEAL_ICONS = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

export function MealPlanGenerator({ lang, userType = "healthy" }: Props) {
  const tx = getT(lang);
  const mealLabel: Record<string, string> = {
    breakfast: tx.gt_breakfast, lunch: tx.gt_lunch, dinner: tx.gt_dinner, snack: tx.mp_snack,
  };
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState("");
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const [showShopping, setShowShopping] = useState(false);

  const riskColor = (risk: string) =>
    risk === "low" ? "text-green-400" : risk === "medium" ? "text-amber-400" : "text-red-400";

  const riskBg = (risk: string) =>
    risk === "low" ? "border-green-500/30 bg-green-950/20"
    : risk === "medium" ? "border-amber-500/30 bg-amber-950/20"
    : "border-red-500/30 bg-red-950/20";

  const glBar = (gl: number, target: number) => {
    const pct = Math.min((gl / target) * 100, 100);
    const color = gl / target < 0.6 ? "bg-green-500"
      : gl / target < 0.85 ? "bg-amber-500" : "bg-red-500";
    return { pct, color };
  };

  async function generate() {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userType, preferences, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tx.mp_gen_fail);
      setPlan(data.plan);
      setExpandedMeal(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : tx.qm_generic_err);
    } finally {
      setLoading(false);
    }
  }

  const profileLabel = userType === "diabetic" ? tx.mp_prof_diabetic
    : userType === "pre_diabetic" ? tx.mp_prof_prediabetic : tx.mp_prof_healthy;

  const profileColor = userType === "diabetic" ? "text-red-400"
    : userType === "pre_diabetic" ? "text-amber-400" : "text-green-400";

  const totalCalories = plan?.meals.reduce((s, m) => s + m.calories_est, 0) || 0;
  const totalProtein = plan?.meals.reduce((s, m) => s + m.protein_g, 0) || 0;
  const totalFiber = plan?.meals.reduce((s, m) => s + m.fiber_g, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-2">🗓️</div>
        <h2 className="text-white font-bold text-lg">{tx.mp_title}</h2>
        <p className={`text-sm mt-1 ${profileColor}`}>
          {tx.mp_personalized.replace("{p}", profileLabel)}
        </p>
      </div>

      {/* Preferences input */}
      {!plan && !loading && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              {tx.mp_prefs_label}
            </label>
            <input
              type="text"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder={tx.mp_prefs_ph}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500 text-sm"
            />
          </div>

          {/* Profile GL targets */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-3">{tx.mp_gl_targets}</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: tx.gt_breakfast, value: userType === "diabetic" ? "<10" : userType === "pre_diabetic" ? "<12" : "<15" },
                { label: tx.gt_lunch, value: userType === "diabetic" ? "<12" : userType === "pre_diabetic" ? "<15" : "<20" },
                { label: tx.gt_dinner, value: userType === "diabetic" ? "<12" : userType === "pre_diabetic" ? "<15" : "<20" },
                { label: tx.mp_daily, value: userType === "diabetic" ? "<35" : userType === "pre_diabetic" ? "<45" : "<60" },
              ].map((t) => (
                <div key={t.label} className="bg-gray-800 rounded-lg p-2">
                  <div className={`text-sm font-bold ${profileColor}`}>{t.value}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{t.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={generate}
            className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 transition-all text-lg">
            🗓️ {tx.mp_generate.replace(/^🗓️\s*/u, "")}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 space-y-4">
          <div className="text-5xl animate-bounce">🧠</div>
          <p className="text-teal-400 font-semibold">{tx.mp_loading}</p>
          <p className="text-gray-500 text-sm">{tx.mp_loading_sub}</p>
          <div className="flex justify-center gap-1 mt-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-950 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Plan */}
      {plan && (
        <div className="space-y-4">
          {/* Daily summary */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-semibold">{tx.mp_today_summary}</h3>
              <span className={`text-xs font-medium ${profileColor}`}>{profileLabel}</span>
            </div>

            {/* GL progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">{tx.mp_total_gl}</span>
                <span className="text-white font-semibold">
                  {plan.daily_gl_total} / {plan.daily_gl_target}
                </span>
              </div>
              <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${glBar(plan.daily_gl_total, plan.daily_gl_target).color}`}
                  style={{ width: `${glBar(plan.daily_gl_total, plan.daily_gl_target).pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {plan.daily_gl_target - plan.daily_gl_total > 0
                  ? `${plan.daily_gl_target - plan.daily_gl_total} ${tx.gt_gl_remaining}`
                  : tx.mp_target_reached}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: tx.at_calories, value: `~${totalCalories}`, unit: "kcal", color: "text-orange-400" },
                { label: tx.ua_protein, value: `${totalProtein}g`, unit: "", color: "text-purple-400" },
                { label: tx.fiber, value: `${totalFiber}g`, unit: "", color: "text-green-400" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-800 rounded-xl p-2.5 text-center">
                  <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Meals */}
          <div className="space-y-2">
            {plan.meals.map((meal, i) => (
              <div key={i} className={`rounded-2xl border overflow-hidden ${riskBg(meal.risk)}`}>
                {/* Meal header */}
                <button
                  className="w-full p-4 text-left"
                  onClick={() => setExpandedMeal(expandedMeal === i ? null : i)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{MEAL_ICONS[meal.type]}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">
                            {mealLabel[meal.type]}
                          </span>
                          <span className="text-xs text-gray-600">· {meal.time_suggestion}</span>
                        </div>
                        <p className="text-white font-medium text-sm mt-0.5">
                          {lang === "tr" ? (meal.name_tr || meal.name) : meal.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className={`text-lg font-bold ${riskColor(meal.risk)}`}>
                        GL {meal.meal_gl}
                      </div>
                      <div className="text-xs text-gray-500">~{meal.calories_est} kcal</div>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedMeal === i && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                    <p className="text-gray-400 text-sm">{meal.description}</p>

                    {/* Items */}
                    <div className="space-y-1.5">
                      {meal.items.map((item, j) => (
                        <div key={j} className="flex justify-between items-center bg-black/20 rounded-lg px-3 py-2">
                          <span className="text-gray-300 text-sm">{item.name}</span>
                          <div className="flex gap-3 text-xs text-gray-500 shrink-0 ml-2">
                            <span>{item.portion_g}g</span>
                            <span>GI {item.gi}</span>
                            <span className={`font-medium ${riskColor(item.gl < 10 ? "low" : item.gl <= 20 ? "medium" : "high")}`}>
                              GL {item.gl}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Nutrition mini */}
                    <div className="flex gap-3 text-xs">
                      <span className="text-purple-400">💪 {meal.protein_g}g {tx.ua_protein}</span>
                      <span className="text-green-400">🌿 {meal.fiber_g}g {tx.fiber}</span>
                      <span className="text-gray-500">{tx.mp_gi_avg}{meal.meal_gi_avg}</span>
                    </div>

                    {/* Prep tip */}
                    <div className="bg-black/20 rounded-lg p-2.5 flex gap-2">
                      <span className="text-base">👨‍🍳</span>
                      <p className="text-gray-400 text-xs leading-relaxed">{meal.prep_tip}</p>
                    </div>

                    {/* Why good */}
                    <div className="bg-black/20 rounded-lg p-2.5 flex gap-2">
                      <span className="text-base">✅</span>
                      <p className="text-gray-400 text-xs leading-relaxed">{meal.why_good}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Daily tips */}
          {plan.daily_tips.length > 0 && (
            <div className="bg-teal-950/40 border border-teal-500/30 rounded-2xl p-4">
              <h3 className="text-teal-400 font-semibold text-sm mb-2">{tx.mp_tips_today}</h3>
              <div className="space-y-1.5">
                {plan.daily_tips.map((tip, i) => (
                  <p key={i} className="text-gray-300 text-sm">→ {tip}</p>
                ))}
              </div>
            </div>
          )}

          {/* Shopping list toggle */}
          {plan.shopping_list.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowShopping(!showShopping)}
                className="w-full p-4 flex justify-between items-center"
              >
                <span className="text-white font-semibold text-sm">{tx.mp_shopping}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{plan.shopping_list.length} {tx.mp_items}</span>
                  <span className="text-gray-500">{showShopping ? "▲" : "▼"}</span>
                </div>
              </button>
              {showShopping && (
                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                  {plan.shopping_list.map((s, i) => (
                    <div key={i} className="flex justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-300 capitalize">{s.item}</span>
                      <span className="text-gray-500 text-xs">{s.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Regenerate */}
          <div className="flex gap-2">
            <button
              onClick={() => { setPlan(null); setExpandedMeal(null); setShowShopping(false); }}
              className="flex-1 py-3 rounded-xl text-gray-400 bg-gray-900 border border-gray-800 text-sm"
            >
              {tx.mp_change_prefs}
            </button>
            <button
              onClick={generate}
              className="flex-1 py-3 rounded-xl text-white bg-teal-600 hover:bg-teal-500 font-semibold text-sm transition-all"
            >
              {tx.mp_new_plan}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
