"use client";
import { useState, useEffect } from "react";
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

  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = meals.filter((m) => new Date(m.timestamp).toISOString().slice(0, 10) === today);
  const displayMeals = activeTab === "today" ? todayMeals : meals;

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

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: "today", label: `Today (${todayMeals.length})` },
          { key: "history", label: `All (${meals.length})` },
          { key: "wellness", label: "💧🏃 Wellness" },
        ] as { key: "today" | "history" | "wellness"; label: string }[]).map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === tab.key ? "bg-teal-600 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Wellness Tab */}
      {activeTab === "wellness" && (
        <div className="space-y-4">
          <WaterTracker dailyTarget={2000} />
          <ActivityTracker />
          <WeeklyReportCard />
        </div>
      )}

      {/* Meal list */}
      {activeTab !== "wellness" && (
        <div className="space-y-2">
          {displayMeals.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <div className="text-4xl mb-3">🍽️</div>
              <div>{activeTab === "today" ? "No meals logged today." : "No meals yet."}</div>
              <button onClick={onNewMeal}
                className="mt-4 px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm transition-all">
                Analyze a meal
              </button>
            </div>
          ) : (
            displayMeals.map((meal) => (
              <div key={meal.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${riskBg(meal.analysis.glucose_risk)}`} />
                      <span className={`text-sm font-medium ${riskColor(meal.analysis.glucose_risk)}`}>
                        GL {meal.analysis.total_glycemic_load} · {meal.analysis.glucose_risk} risk
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(meal.timestamp).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                      {meal.mealType && <span className="ml-2 capitalize">· {meal.mealType}</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1.5 truncate">
                      {meal.analysis.food_items.slice(0, 3).map((f) => f.name_tr || f.name).join(", ")}
                      {meal.analysis.food_items.length > 3 && ` +${meal.analysis.food_items.length - 3}`}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-3 shrink-0">
                    <div className="text-xs text-gray-500">{meal.analysis.total_sugar_g}g sugar</div>
                    <button onClick={() => handleDelete(meal.id)}
                      className="text-gray-700 hover:text-red-400 text-xs transition-colors" aria-label="Delete">✕</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab !== "wellness" && displayMeals.length > 0 && (
        <button onClick={onNewMeal}
          className="w-full py-3 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-all text-sm">
          + Analyze New Meal
        </button>
      )}
    </div>
  );
}
