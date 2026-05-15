"use client";
import { useState, useEffect, useMemo } from "react";
import {
  getMeals, getTodayStats, getStreak, getWeeklyAvgGL,
  generateInsights, deleteMeal, getTodayActivityGL,
  type MealRecord, type UserProfile,
} from "@/lib/storage";
import { GLChart } from "./gl-chart";
import { WaterTracker } from "./water-tracker";
import { ActivityTracker } from "./activity-tracker";
import { WeeklyReportCard } from "./weekly-report";
import { AICoach } from "./ai-coach";
import { GoalTracker } from "./goal-tracker";
import { WeeklyChallenge } from "./weekly-challenge";
import type { Lang } from "@/lib/i18n";

interface Props {
  profile: UserProfile;
  lang: Lang;
  onNewMeal: () => void;
  onEditProfile: () => void;
}

export function HistoryDashboard({ profile, lang, onNewMeal, onEditProfile }: Props) {
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"today" | "history" | "wellness">("today");
  const [todayStats, setTodayStats] = useState(getTodayStats());
  const [weeklyAvg, setWeeklyAvg] = useState(0);
  const [streak, setStreak] = useState(0);
  const [activityGLReduction, setActivityGLReduction] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, [profile.dailyGLTarget]);

  function refresh() {
    const m = getMeals().filter(m => !m.isPreMeal);
    setMeals(m);
    setTodayStats(getTodayStats());
    setWeeklyAvg(getWeeklyAvgGL());
    setStreak(getStreak());
    setActivityGLReduction(getTodayActivityGL());
  }

  const insights = generateInsights(meals, profile.userType);

  // CSV Export
  function exportCSV() {
    const rows = [
      ["Date", "Time", "Foods", "GL", "Risk", "Sugar(g)", "Calories", "Protein(g)", "Carbs(g)", "Fat(g)"],
      ...meals.map(m => {
        const d = new Date(m.timestamp);
        return [
          d.toLocaleDateString(),
          d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          m.analysis.food_items.map(f => f.name_tr || f.name).join(" + "),
          m.analysis.total_glycemic_load,
          m.analysis.glucose_risk,
          m.analysis.total_sugar_g,
          m.analysis.total_calories,
          m.analysis.total_protein_g,
          m.analysis.total_net_carb_g,
          m.analysis.total_fat_g,
        ];
      }),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `glucolens-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Filtered meals
  const filteredMeals = useMemo(() => {
    const base = activeTab === "today"
      ? meals.filter(m => new Date(m.timestamp).toISOString().slice(0,10) === new Date().toISOString().slice(0,10))
      : meals;
    return base.filter(m => {
      const matchesSearch = !searchQuery || m.analysis.food_items.some(f =>
        (f.name_tr || f.name).toLowerCase().includes(searchQuery.toLowerCase())
      );
      const matchesRisk = riskFilter === "all" || m.analysis.glucose_risk === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [meals, activeTab, searchQuery, riskFilter]);

  const riskColor = (risk: string) =>
    risk === "low" ? "text-green-400" : risk === "medium" ? "text-amber-400" : "text-red-400";
  const riskBg = (risk: string) =>
    risk === "low" ? "bg-green-500" : risk === "medium" ? "bg-amber-500" : "bg-red-500";

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleDelete(id: string) {
    setConfirmDeleteId(id);
  }

  function confirmDelete() {
    if (!confirmDeleteId) return;
    deleteMeal(confirmDeleteId);
    setConfirmDeleteId(null);
    refresh();
  }

  // Net GL after activity
  const netGL = Math.max(0, parseFloat((todayStats.totalGL - activityGLReduction).toFixed(1)));

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <div className="text-3xl mb-2">🗑️</div>
              <h3 className="text-white font-semibold text-lg">Delete this meal?</h3>
              <p className="text-gray-500 text-sm mt-1">
                This will permanently remove the meal from your history.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-xl text-gray-300 bg-gray-800 hover:bg-gray-700 font-medium text-sm transition-all">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl text-white bg-red-600 hover:bg-red-500 font-semibold text-sm transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
          <div className={`text-2xl font-bold ${netGL > profile.dailyGLTarget ? "text-red-400" : "text-teal-400"}`}>
            {netGL || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Net GL</div>
          <div className="text-xs text-gray-600">/ {profile.dailyGLTarget}</div>
          {activityGLReduction > 0 && (
            <div className="text-xs text-green-500 mt-0.5">-{activityGLReduction} activity</div>
          )}
        </div>
        <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
          <div className="text-2xl font-bold text-blue-400">{weeklyAvg || "—"}</div>
          <div className="text-xs text-gray-500 mt-1">7-Day Avg</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
          <div className="text-2xl font-bold text-amber-400">{streak > 0 ? `${streak}🔥` : "0"}</div>
          <div className="text-xs text-gray-500 mt-1">Streak</div>
        </div>
      </div>

      {/* GL Chart */}
      <GLChart dailyTarget={profile.dailyGLTarget} />

      {/* AI Coach */}
      <AICoach />

      {/* Insights */}
      {insights.map((insight, i) => (
        <div key={i} className="rounded-xl p-3 text-sm border bg-blue-950 border-blue-500/30 text-blue-300">
          {insight}
        </div>
      ))}

      {/* Profile info + edit */}
      <div className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
        <div className="text-xs text-gray-500">
          <span className="text-gray-300 capitalize">{profile.name || "User"}</span>
          <span className="text-gray-600 ml-2">· {profile.userType.replace("_", "-")} · GL {profile.dailyGLTarget}/day</span>
        </div>
        <button onClick={onEditProfile} className="text-xs text-teal-500 hover:text-teal-400 transition-colors">
          Edit
        </button>
      </div>

      {/* Tabs + Export */}
      <div className="flex gap-2 items-center">
        <div className="flex gap-1.5 flex-1">
          {([
            { key: "today", label: `Bugün (${meals.filter(m => new Date(m.timestamp).toISOString().slice(0,10) === new Date().toISOString().slice(0,10)).length})` },
            { key: "history", label: `Tümü (${meals.length})` },
            { key: "wellness", label: "💧🏃" },
          ] as { key: "today" | "history" | "wellness"; label: string }[]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === tab.key ? "bg-teal-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-800"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        {meals.length > 0 && (
          <button onClick={exportCSV} title="CSV olarak indir"
            className="py-2 px-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs text-gray-400 hover:text-gray-200 transition-all">
            ⬇ CSV
          </button>
        )}
      </div>

      {/* Search & filter — only in history/today */}
      {activeTab !== "wellness" && meals.length > 3 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Yemek ara..."
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-teal-500"
          />
          {(["all", "low", "medium", "high"] as const).map(r => (
            <button key={r} onClick={() => setRiskFilter(r)}
              className={`px-2.5 py-2 rounded-xl text-xs transition-all ${
                riskFilter === r
                  ? r === "all" ? "bg-gray-700 text-white" : r === "low" ? "bg-green-700 text-white" : r === "medium" ? "bg-amber-700 text-white" : "bg-red-700 text-white"
                  : "bg-gray-900 text-gray-600 hover:bg-gray-800"
              }`}>
              {r === "all" ? "Tümü" : r === "low" ? "✅" : r === "medium" ? "⚠️" : "🔴"}
            </button>
          ))}
        </div>
      )}

      {/* Wellness Tab */}
      {activeTab === "wellness" && (
        <div className="space-y-4">
          <GoalTracker />
          <WeeklyChallenge />
          <WaterTracker dailyTarget={2000} />
          <ActivityTracker />
          <WeeklyReportCard />
        </div>
      )}

      {/* Meal list */}
      {activeTab !== "wellness" && (
        <div className="space-y-2">
          {filteredMeals.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <div className="text-4xl mb-3">🍽️</div>
              <div>{searchQuery || riskFilter !== "all" ? "Filtrele eşleşen öğün yok." : activeTab === "today" ? "Bugün hiç öğün girilmedi." : "Henüz öğün yok."}</div>
              {!searchQuery && riskFilter === "all" && (
                <button onClick={onNewMeal}
                  className="mt-4 px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm transition-all">
                  Analiz et
                </button>
              )}
            </div>
          ) : (
            filteredMeals.map((meal) => {
              const isExpanded = expandedMealId === meal.id;
              return (
                <div key={meal.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  {/* Meal row */}
                  <div
                    className="p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-800/40 transition-colors"
                    onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
                  >
                    {(meal.photo_url || meal.photo_base64) && (
                      <img
                        src={meal.photo_url || `data:image/jpeg;base64,${meal.photo_base64}`}
                        alt="meal"
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${riskBg(meal.analysis.glucose_risk)}`} />
                        <span className={`text-sm font-medium ${riskColor(meal.analysis.glucose_risk)}`}>
                          GL {meal.analysis.total_glycemic_load}
                        </span>
                        {meal.analysis.total_calories > 0 && (
                          <span className="text-xs text-gray-600">· {meal.analysis.total_calories} kcal</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {new Date(meal.timestamp).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                        {meal.mealType && <span className="ml-2 capitalize">· {meal.mealType}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1.5 truncate">
                        {meal.analysis.food_items.slice(0, 3).map(f => f.name_tr || f.name).join(", ")}
                        {meal.analysis.food_items.length > 3 && ` +${meal.analysis.food_items.length - 3}`}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-gray-600 text-xs">{isExpanded ? "▲" : "▼"}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(meal.id); }}
                        className="text-gray-700 hover:text-red-400 text-xs transition-colors" aria-label="Delete">✕
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-800 px-4 pb-4 pt-3 space-y-3">
                      {/* Macro grid */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "Protein", value: `${meal.analysis.total_protein_g}g`, color: "text-purple-400" },
                          { label: "Yağ", value: `${meal.analysis.total_fat_g}g`, color: "text-amber-400" },
                          { label: "Net Karb", value: `${meal.analysis.total_net_carb_g}g`, color: "text-blue-400" },
                          { label: "Lif", value: `${meal.analysis.total_fiber_g}g`, color: "text-green-400" },
                        ].map(s => (
                          <div key={s.label} className="bg-gray-800 rounded-xl p-2 text-center">
                            <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                            <div className="text-xs text-gray-600">{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {/* Food items */}
                      <div className="space-y-1.5">
                        {meal.analysis.food_items.map((f, i) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">{f.name_tr || f.name} ({f.portion_g}g)</span>
                            <div className="flex gap-2 text-gray-600">
                              <span>GI {f.glycemic_index}</span>
                              <span className={riskColor(f.glycemic_load < 10 ? "low" : f.glycemic_load <= 20 ? "medium" : "high")}>
                                GL {f.glycemic_load}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Recommendations */}
                      {meal.analysis.recommendations?.length > 0 && (
                        <div className="text-xs text-gray-500 italic">{meal.analysis.recommendations[0]}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab !== "wellness" && filteredMeals.length > 0 && (
        <button onClick={onNewMeal}
          className="w-full py-3 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-all text-sm">
          + Analyze New Meal
        </button>
      )}
    </div>
  );
}
