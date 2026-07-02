"use client";
import { useState, useEffect } from "react";
import {
  getActivities, logActivity, deleteActivity,
  ACTIVITY_GL_REDUCTION, getTodayActivityGL,
  type ActivityRecord,
} from "@/lib/storage";
import { getTodayHealthData, estimateGLReduction, isHealthAvailable, type HealthData } from "@/lib/healthkit";
import { getT, type Lang } from "@/lib/i18n";

const ACTIVITY_ICONS: Record<ActivityRecord["type"], string> = {
  walking: "🚶", running: "🏃", cycling: "🚴",
  swimming: "🏊", gym: "🏋️", other: "⚡",
};

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];

export function ActivityTracker({ lang }: { lang: Lang }) {
  const tx = getT(lang);
  const activityLabel: Record<ActivityRecord["type"], string> = {
    walking: tx.at_walking, running: tx.at_running, cycling: tx.at_cycling,
    swimming: tx.at_swimming, gym: tx.at_gym, other: tx.at_other,
  };
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [selectedType, setSelectedType] = useState<ActivityRecord["type"]>("walking");
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [adding, setAdding] = useState(false);
  const [todayGLReduction, setTodayGLReduction] = useState(0);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    refresh();
    if (isHealthAvailable()) {
      setHealthLoading(true);
      getTodayHealthData().then(data => {
        setHealthData(data);
        setHealthLoading(false);
      });
    }
  }, []);

  function refresh() {
    const all = getActivities();
    const today = new Date().toISOString().slice(0, 10);
    setActivities(all.filter(a => a.timestamp.slice(0, 10) === today));
    setTodayGLReduction(getTodayActivityGL());
  }

  function handleLog() {
    logActivity(selectedType, selectedDuration);
    setAdding(false);
    refresh();
  }

  function handleDelete(id: string) {
    deleteActivity(id);
    refresh();
  }

  const todayMin = activities.reduce((s, a) => s + a.durationMin, 0);
  const healthGLReduction = healthData ? estimateGLReduction(healthData) : 0;
  const totalGLReduction = parseFloat((todayGLReduction + healthGLReduction).toFixed(1));

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          {tx.at_title}
        </h3>
        <div className="flex items-center gap-2">
          {totalGLReduction > 0 && (
            <span className="text-xs text-green-400">-{totalGLReduction} GL</span>
          )}
          <span className="text-xs text-gray-500">{todayMin} {tx.wr_min}</span>
        </div>
      </div>

      {/* HealthKit data */}
      {isHealthAvailable() && (
        <div className="bg-gray-800 rounded-xl p-3 mb-3 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              ❤️ Apple Health
            </span>
            {healthLoading && <span className="text-xs text-gray-600 animate-pulse">{tx.at_loading}</span>}
          </div>
          {healthData ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-white font-bold">{healthData.steps.toLocaleString()}</div>
                <div className="text-xs text-gray-600">{tx.at_steps}</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold">{healthData.calories}</div>
                <div className="text-xs text-gray-600">{tx.at_calories}</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 font-bold">-{healthGLReduction}</div>
                <div className="text-xs text-gray-600">{tx.at_gl_gain}</div>
              </div>
            </div>
          ) : (
            !healthLoading && (
              <p className="text-xs text-gray-600">{tx.at_no_health}</p>
            )
          )}
        </div>
      )}

      {/* Today's activities */}
      {activities.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {activities.map((act) => (
            <div key={act.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-sm">
                {ACTIVITY_ICONS[act.type]} {activityLabel[act.type]} · {act.durationMin} {tx.wr_min}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400">-{act.glReduction} GL</span>
                <button
                  onClick={() => handleDelete(act.id)}
                  className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add activity */}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 rounded-xl text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 transition-all border border-gray-700 border-dashed"
        >
          {tx.at_add}
        </button>
      ) : (
        <div className="space-y-3 pt-2 border-t border-gray-800">
          {/* Activity type */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(ACTIVITY_ICONS) as [ActivityRecord["type"], string][]).map(([type, icon]) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedType === type
                    ? "bg-teal-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {icon} {activityLabel[type]}
              </button>
            ))}
          </div>

          {/* Duration */}
          <div className="flex gap-2 flex-wrap">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDuration(d)}
                className={`flex-1 py-1.5 rounded-lg text-xs transition-all ${
                  selectedDuration === d
                    ? "bg-teal-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {d} {tx.wr_min}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 text-center">
            {tx.at_est_reduction} ~{((ACTIVITY_GL_REDUCTION[selectedType] * selectedDuration) / 30).toFixed(1)}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAdding(false)}
              className="flex-1 py-2 rounded-xl text-sm text-gray-400 bg-gray-800"
            >{tx.ua_cancel}</button>
            <button
              onClick={handleLog}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500"
            >{tx.gt_save}</button>
          </div>
        </div>
      )}
    </div>
  );
}
