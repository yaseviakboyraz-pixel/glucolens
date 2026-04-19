"use client";
import { useState, useEffect } from "react";
import {
  getMeals, getTodayStats, getLast7DaysStats, getStreak,
  getWeeklyAvgGL, generateInsights, deleteMeal,
  type MealRecord, type UserProfile,
} from "@/lib/storage";
import { GLChart } from "./gl-chart";
import type { Lang } from "@/lib/i18n";

interface Props {
  profile: UserProfile;
  lang: Lang;
  onNewMeal: () => void;
}

export function HistoryDashboard({ profile, lang, onNewMeal }: Props) {
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");

  useEffect(() => {
    setMeals(getMeals());
  }, []);

  const todayStats = getTodayStats();
  const weeklyAvg = getWeeklyAvgGL();
  const streak = getStreak(profile.dailyGLTarget);
  const insights = generateInsights(todayStats, profile);
  const last7 = getLast7DaysStats();

  const riskColor = (risk: string) =>
    risk === "low" ? "text-green-400" : risk === "medium" ? "text-amber-400" : "text-red-400";

  const riskBg = (risk: string) =>
    risk === "low" ? "bg-green-500" : risk === "medium" ? "bg-amber-500" : "bg-red-500";

  function handleDelete(id: string) {
    deleteMeal(id);
    setMeals(getMeals());
  }

  const todayMeals = meals.filter(
    (m) => m.timestamp.slice(0, 10) === new Date().toISOString().slice(0, 10)
  );

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
          <div className={`text-2xl font-bold ${todayStats.totalGL > profile.dailyGLTarget ? "text-red-400" : "text-teal-400"}`}>
            {todayStats.totalGL}
          </div>
          <div className="text-xs text-gray-500 mt-1">Today&apos;s GL</div>
          <div className="text-xs text-gray-600">target: {profile.dailyGLTarget}</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
          <div className="text-2xl font-bold text-blue-400">{weeklyAvg || "—"}</div>
          <div className="text-xs text-gray-500 mt-1">7-Day Avg</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
          <div className="text-2xl font-bold text-amber-400">{streak}🔥</div>
          <div className="text-xs text-gray-500 mt-1">Day Streak</div>
        </div>
      </div>

      {/* GL Chart */}
      <GLChart dailyTarget={profile.dailyGLTarget} />

      {/* Insights */}
      {insights.map((insight, i) => (
        <div
          key={i}
          className={`rounded-xl p-3 text-sm border ${
            insight.type === "success"
              ? "bg-green-950 border-green-500/30 text-green-300"
              : insight.type === "warning"
              ? "bg-amber-950 border-amber-500/30 text-amber-300"
              : "bg-blue-950 border-blue-500/30 text-blue-300"
          }`}
        >
          {insight.type === "success" ? "✅ " : insight.type === "warning" ? "⚠️ " : "ℹ️ "}
          {insight.message}
        </div>
      ))}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("today")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "today"
              ? "bg-teal-600 text-white"
              : "bg-gray-900 text-gray-400 hover:bg-gray-800"
          }`}
        >
          Today ({todayMeals.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "history"
              ? "bg-teal-600 text-white"
              : "bg-gray-900 text-gray-400 hover:bg-gray-800"
          }`}
        >
          History ({meals.length})
        </button>
      </div>

      {/* Meal list */}
      <div className="space-y-2">
        {(activeTab === "today" ? todayMeals : meals).length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <div className="text-4xl mb-3">🍽️</div>
            <div>No meals logged yet.</div>
            <button
              onClick={onNewMeal}
              className="mt-4 px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm transition-all"
            >
              Analyze a meal
            </button>
          </div>
        ) : (
          (activeTab === "today" ? todayMeals : meals).map((meal) => (
            <div key={meal.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${riskBg(meal.analysis.glucose_risk)}`} />
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
                  <div className="text-xs text-gray-500 mt-1.5">
                    {meal.analysis.food_items.slice(0, 3).map((f) => f.name_tr || f.name).join(", ")}
                    {meal.analysis.food_items.length > 3 && ` +${meal.analysis.food_items.length - 3} more`}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-3">
                  <div className="text-xs text-gray-600">
                    {meal.analysis.total_sugar_g}g sugar
                  </div>
                  <button
                    onClick={() => handleDelete(meal.id)}
                    className="text-gray-700 hover:text-red-400 text-xs transition-colors"
                  >
                    delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New meal button */}
      {(activeTab === "today" ? todayMeals : meals).length > 0 && (
        <button
          onClick={onNewMeal}
          className="w-full py-3 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-all text-sm"
        >
          + Analyze New Meal
        </button>
      )}
    </div>
  );
}
