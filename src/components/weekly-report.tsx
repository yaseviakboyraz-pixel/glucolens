"use client";
import { useState, useEffect } from "react";
import { getWeeklyReport, type WeeklyReport } from "@/lib/storage";

export function WeeklyReportCard() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setReport(getWeeklyReport());
  }, []);

  if (!report || report.totalMeals === 0) return null;

  const bestDate = report.bestDay.date
    ? new Date(report.bestDay.date + "T12:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })
    : "—";
  const worstDate = report.worstDay.date
    ? new Date(report.worstDay.date + "T12:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })
    : "—";

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <div className="text-left">
            <div className="text-sm font-medium text-white">Weekly Report</div>
            <div className="text-xs text-gray-500">
              {report.totalMeals} meals · avg GL {report.avgDailyGL}
            </div>
          </div>
        </div>
        <span className="text-gray-500 text-sm">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-teal-400">{report.avgDailyGL}</div>
              <div className="text-xs text-gray-500 mt-1">Avg Daily GL</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{report.streak}🔥</div>
              <div className="text-xs text-gray-500 mt-1">Day Streak</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{report.totalMeals}</div>
              <div className="text-xs text-gray-500 mt-1">Meals Logged</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className={`text-2xl font-bold ${report.highRiskMeals > 3 ? "text-red-400" : "text-gray-300"}`}>
                {report.highRiskMeals}
              </div>
              <div className="text-xs text-gray-500 mt-1">High-Risk Meals</div>
            </div>
          </div>

          {/* Best / Worst day */}
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-green-950/50 rounded-xl px-4 py-2.5 border border-green-500/20">
              <div className="text-sm text-green-300">✅ Best day</div>
              <div className="text-right">
                <div className="text-sm font-medium text-white">{bestDate}</div>
                <div className="text-xs text-green-400">GL {report.bestDay.gl}</div>
              </div>
            </div>
            <div className="flex items-center justify-between bg-red-950/50 rounded-xl px-4 py-2.5 border border-red-500/20">
              <div className="text-sm text-red-300">⚠️ Hardest day</div>
              <div className="text-right">
                <div className="text-sm font-medium text-white">{worstDate}</div>
                <div className="text-xs text-red-400">GL {report.worstDay.gl}</div>
              </div>
            </div>
          </div>

          {/* Activity */}
          {report.totalActivityMin > 0 && (
            <div className="bg-gray-800 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-gray-400">🏃 Total activity</span>
              <span className="text-sm font-medium text-green-400">{report.totalActivityMin} min</span>
            </div>
          )}

          {/* Top foods */}
          {report.topFoods.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">Most logged foods this week</div>
              <div className="flex flex-wrap gap-2">
                {report.topFoods.map((food) => (
                  <span key={food} className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full border border-gray-700">
                    {food}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
