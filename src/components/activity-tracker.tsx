"use client";
import { useState, useEffect } from "react";
import {
  getActivities, logActivity, deleteActivity,
  ACTIVITY_GL_REDUCTION, getTodayActivityGL,
  type ActivityRecord,
} from "@/lib/storage";

const ACTIVITY_ICONS: Record<ActivityRecord["type"], string> = {
  walking: "🚶", running: "🏃", cycling: "🚴",
  swimming: "🏊", gym: "🏋️", other: "⚡",
};

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];

export function ActivityTracker() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [selectedType, setSelectedType] = useState<ActivityRecord["type"]>("walking");
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [adding, setAdding] = useState(false);
  const [todayGLReduction, setTodayGLReduction] = useState(0);

  useEffect(() => {
    refresh();
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

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          🏃 Activity Today
        </h3>
        <div className="flex items-center gap-2">
          {todayGLReduction > 0 && (
            <span className="text-xs text-green-400">-{todayGLReduction} GL</span>
          )}
          <span className="text-xs text-gray-500">{todayMin} min</span>
        </div>
      </div>

      {/* Today's activities */}
      {activities.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {activities.map((act) => (
            <div key={act.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-sm">
                {ACTIVITY_ICONS[act.type]} {act.type} · {act.durationMin} min
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
          + Log Activity
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
                {icon} {type}
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
                {d}m
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 text-center">
            Estimated GL reduction: ~{((ACTIVITY_GL_REDUCTION[selectedType] * selectedDuration) / 30).toFixed(1)}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAdding(false)}
              className="flex-1 py-2 rounded-xl text-sm text-gray-400 bg-gray-800"
            >Cancel</button>
            <button
              onClick={handleLog}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500"
            >Log</button>
          </div>
        </div>
      )}
    </div>
  );
}
