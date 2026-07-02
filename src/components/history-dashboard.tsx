"use client";
import { useState, useEffect, useMemo } from "react";
import {
  getMeals, getTodayStats, getStreak, getWeeklyAvgGL,
  generateInsights, deleteMeal, getTodayActivityGL, getTodayWater, getAvgSleepHours,
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
import { getT } from "@/lib/i18n";
import { UtensilsCrossed } from "lucide-react";

interface Props {
  profile: UserProfile;
  lang: Lang;
  onNewMeal: () => void;
  onEditProfile: () => void;
}

export function HistoryDashboard({ profile, lang, onNewMeal, onEditProfile }: Props) {
  const tx = getT(lang);
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

  // PDF Export
  async function exportPDF() {
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meals: meals.slice(0, 50),
          profile,
          waterAvg: Math.round(getTodayWater()),
          sleepAvg: getAvgSleepHours ? getAvgSleepHours() : null,
        }),
      });
      const data = await res.json();
      if (!data.html) return;
      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (win) {
        win.addEventListener("load", () => {
          win.print();
          URL.revokeObjectURL(url);
        });
      }
    } catch (e) {
      console.error("PDF export failed", e);
    }
  }

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
              <h3 className="text-white font-semibold text-lg">{tx.hd_delete_q}</h3>
              <p className="text-gray-500 text-sm mt-1">
                {tx.hd_delete_body}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-xl text-gray-300 bg-gray-800 hover:bg-gray-700 font-medium text-sm transition-all">
                {tx.ua_cancel}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl text-white bg-red-600 hover:bg-red-500 font-semibold text-sm transition-all">
                {tx.hd_delete}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header stats — Nova Aurora */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        <div style={{ background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)", borderRadius: 14, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 200, letterSpacing: -1, color: netGL > profile.dailyGLTarget ? "rgba(239,68,68,0.85)" : "rgba(20,184,166,0.9)", lineHeight: 1 }}>{netGL || 0}</div>
          <div style={{ fontSize: 7, color: "var(--nova-text-3)", letterSpacing: 1, marginTop: 3 }}>{tx.hd_net_gl}</div>
          <div style={{ fontSize: 6, color: "var(--nova-text-4)", marginTop: 1 }}>/ {profile.dailyGLTarget}</div>
          {activityGLReduction > 0 && (
            <div style={{ fontSize: 7, color: "rgba(16,185,129,0.7)", marginTop: 3 }}>-{activityGLReduction} {tx.hd_activity}</div>
          )}
        </div>
        <div style={{ background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)", borderRadius: 14, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 200, letterSpacing: -1, color: "rgba(59,130,246,0.85)", lineHeight: 1 }}>{weeklyAvg || "—"}</div>
          <div style={{ fontSize: 7, color: "var(--nova-text-3)", letterSpacing: 1, marginTop: 3 }}>{tx.hd_7day_avg}</div>
        </div>
        <div style={{ background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)", borderRadius: 14, padding: "10px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 200, letterSpacing: -1, color: "rgba(245,158,11,0.85)", lineHeight: 1 }}>{streak > 0 ? streak : "0"}{streak > 0 ? "🔥" : ""}</div>
          <div style={{ fontSize: 7, color: "var(--nova-text-3)", letterSpacing: 1, marginTop: 3 }}>{tx.hd_streak}</div>
        </div>
      </div>

      {/* GL Chart — only once there's data to show */}
      {meals.length > 0 && <GLChart dailyTarget={profile.dailyGLTarget} lang={lang} />}

      {/* AI Coach — only meaningful once meals exist */}
      {meals.length > 0 && <AICoach />}

      {/* Insights — need data to be meaningful */}
      {meals.length > 0 && insights.map((insight, i) => (
        <div key={i} className="rounded-xl p-3 text-sm border bg-blue-950 border-blue-500/30 text-blue-300">
          {insight}
        </div>
      ))}

      {/* Profile info + edit */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)", borderRadius: 14, padding: "8px 14px" }}>
        <div style={{ fontSize: 11, color: "var(--nova-text-3)" }}>
          <span style={{ color: "var(--nova-text-2)", fontWeight: 400 }}>{profile.name || tx.hd_user}</span>
          <span style={{ color: "var(--nova-text-4)", marginLeft: 6 }}>· {profile.userType.replace("_", "-")} · GL {profile.dailyGLTarget}{tx.hd_per_day}</span>
        </div>
        <button onClick={onEditProfile} style={{ fontSize: 11, color: "var(--nova-purple)", background: "none", border: "none", cursor: "pointer" }}>
          {tx.hd_edit}
        </button>
      </div>

      {/* Tabs + Export — Nova Aurora */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 5, flex: 1 }}>
          {([
            { key: "today",   label: `${tx.hd_tab_today} (${meals.filter(m => new Date(m.timestamp).toISOString().slice(0,10) === new Date().toISOString().slice(0,10)).length})` },
            { key: "history", label: `${tx.hd_tab_all} (${meals.length})` },
            { key: "wellness", label: "💧🏃" },
          ] as { key: "today" | "history" | "wellness"; label: string }[]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: "8px 4px", borderRadius: 12, fontSize: 8, fontWeight: 400,
                background: activeTab === tab.key ? "rgba(20,184,166,0.12)" : "var(--nova-surface)",
                border: activeTab === tab.key ? "0.5px solid rgba(20,184,166,0.3)" : "0.5px solid var(--nova-border)",
                color: activeTab === tab.key ? "rgba(20,184,166,0.9)" : "var(--nova-text-3)",
                cursor: "pointer", transition: "all 0.2s",
              }}>
              {tab.label}
            </button>
          ))}
        </div>
        {meals.length > 0 && (
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={exportPDF}
              style={{ padding: "7px 10px", background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)", borderRadius: 10, fontSize: 9, color: "var(--nova-text-3)", cursor: "pointer" }}>
              📄 PDF
            </button>
            <button onClick={exportCSV}
              style={{ padding: "7px 10px", background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)", borderRadius: 10, fontSize: 9, color: "var(--nova-text-3)", cursor: "pointer" }}>
              ⬇ CSV
            </button>
          </div>
        )}
      </div>

      {/* Search & filter — only in history/today */}
      {activeTab !== "wellness" && meals.length > 3 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tx.hd_search_ph}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-teal-500"
          />
          {(["all", "low", "medium", "high"] as const).map(r => (
            <button key={r} onClick={() => setRiskFilter(r)}
              className={`px-2.5 py-2 rounded-xl text-xs transition-all ${
                riskFilter === r
                  ? r === "all" ? "bg-gray-700 text-white" : r === "low" ? "bg-green-700 text-white" : r === "medium" ? "bg-amber-700 text-white" : "bg-red-700 text-white"
                  : "bg-gray-900 text-gray-600 hover:bg-gray-800"
              }`}>
              {r === "all" ? tx.hd_tab_all : r === "low" ? "✅" : r === "medium" ? "⚠️" : "🔴"}
            </button>
          ))}
        </div>
      )}

      {/* Wellness Tab */}
      {activeTab === "wellness" && (
        <div className="space-y-4">
          <GoalTracker lang={lang} />
          <WeeklyChallenge lang={lang} />
          <WaterTracker dailyTarget={2000} />
          <ActivityTracker />
          <WeeklyReportCard lang={lang} />
        </div>
      )}

      {/* Meal list */}
      {activeTab !== "wellness" && (
        <div className="space-y-2">
          {filteredMeals.length === 0 ? (
            (searchQuery || riskFilter !== "all") ? (
              <div className="text-center py-12 text-gray-600">
                <div className="text-4xl mb-3">🔍</div>
                <div>{tx.hd_no_filter_match}</div>
              </div>
            ) : meals.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 20px", background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)", borderRadius: 18 }}>
                <div style={{ fontSize: 38, marginBottom: 10 }}>📊</div>
                <div style={{ color: "var(--nova-text-1)", fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                  {tx.hd_journey_start}
                </div>
                <div style={{ color: "var(--nova-text-3)", fontSize: 12, lineHeight: 1.5, marginBottom: 18, maxWidth: 280, marginInline: "auto" }}>
                  {tx.hd_journey_sub}
                </div>
                <button onClick={onNewMeal}
                  style={{ padding: "12px 28px", borderRadius: 14, fontWeight: 600, fontSize: 14, color: "#fff", background: "var(--nova-purple)", border: "none", cursor: "pointer" }}>
                  {tx.hd_analyze_first}
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                <div className="text-4xl mb-3">🍽️</div>
                <div>{tx.hd_no_today}</div>
                <button onClick={onNewMeal}
                  className="mt-4 px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm transition-all">
                  {tx.hd_analyze}
                </button>
              </div>
            )
          ) : (
            filteredMeals.map((meal) => {
            const isExpanded = expandedMealId === meal.id;
            const glRisk = meal.analysis.glucose_risk;
            const riskAccent = glRisk === "low" ? "rgba(16,185,129,0.8)" : glRisk === "medium" ? "rgba(245,158,11,0.8)" : "rgba(239,68,68,0.8)";
            const riskGlColor = glRisk === "low" ? "rgba(16,185,129,0.85)" : glRisk === "medium" ? "rgba(245,158,11,0.85)" : "rgba(239,68,68,0.85)";
            return (
            <div key={meal.id} style={{ background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)", borderRadius: 14, overflow: "hidden", marginBottom: 6 }}>
            {/* Meal row */}
            <div
            style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
            >
            {(meal.photo_url || meal.photo_base64) ? (
            <img
              src={meal.photo_url || `data:image/jpeg;base64,${meal.photo_base64}`}
                alt="meal"
                style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
            />
            ) : (
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--nova-surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UtensilsCrossed size={20} strokeWidth={1.75} color="var(--nova-text-4)" aria-hidden="true" />
            </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: riskAccent, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: riskGlColor }}>GL {meal.analysis.total_glycemic_load}</span>
            {meal.analysis.total_calories > 0 && (
            <span style={{ fontSize: 8, color: "var(--nova-text-4)" }}>· {meal.analysis.total_calories} kcal</span>
            )}
            </div>
            <div style={{ fontSize: 7, color: "var(--nova-text-4)" }}>
              {new Date(meal.timestamp).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            {meal.mealType && <span style={{ marginLeft: 6 }}>· {meal.mealType}</span>}
            </div>
            <div style={{ fontSize: 9, color: "var(--nova-text-3)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {meal.analysis.food_items.slice(0, 3).map(f => f.name_tr || f.name).join(", ")}
                {meal.analysis.food_items.length > 3 && ` +${meal.analysis.food_items.length - 3}`}
            </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 9, color: "var(--nova-text-4)" }}>{isExpanded ? "▲" : "▼"}</span>
              <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(meal.id); }}
                        style={{ fontSize: 9, color: "var(--nova-text-4)", background: "none", border: "none", cursor: "pointer" }}
                  aria-label="Delete">✕
                </button>
            </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
            <div style={{ borderTop: "0.5px solid var(--nova-border)", padding: "10px 12px 12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginBottom: 10 }}>
            {[
              { label: tx.ua_protein, value: `${meal.analysis.total_protein_g}g`, color: "rgba(139,92,246,0.85)" },
            { label: tx.ua_fat, value: `${meal.analysis.total_fat_g}g`, color: "rgba(245,158,11,0.85)" },
            { label: tx.ua_net_carb, value: `${meal.analysis.total_net_carb_g}g`, color: "rgba(59,130,246,0.85)" },
            { label: tx.fiber, value: `${meal.analysis.total_fiber_g}g`, color: "rgba(16,185,129,0.85)" },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--nova-surface-hover)", borderRadius: 10, padding: "6px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 6, color: "var(--nova-text-4)", marginTop: 2 }}>{s.label}</div>
                </div>
            ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {meal.analysis.food_items.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9 }}>
            <span style={{ color: "var(--nova-text-2)" }}>{f.name_tr || f.name} ({f.portion_g}g)</span>
            <div style={{ display: "flex", gap: 8, color: "var(--nova-text-4)" }}>
            <span>GI {f.glycemic_index}</span>
              <span style={{ color: f.glycemic_load < 10 ? "rgba(16,185,129,0.75)" : f.glycemic_load <= 20 ? "rgba(245,158,11,0.75)" : "rgba(239,68,68,0.75)" }}>GL {f.glycemic_load}</span>
              </div>
              </div>
              ))}
            </div>
            {meal.analysis.recommendations?.length > 0 && (
            <div style={{ fontSize: 9, color: "var(--nova-text-3)", fontStyle: "italic", marginTop: 6 }}>{meal.analysis.recommendations[0]}</div>
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
          + {tx.hd_analyze_new.replace(/^\+\s*/, "")}
        </button>
      )}
    </div>
  );
}
