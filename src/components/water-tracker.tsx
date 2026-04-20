"use client";
import { useState, useEffect } from "react";
import { getTodayWater, addWater, removeWater, type WaterRecord } from "@/lib/storage";

interface Props {
  dailyTarget: number; // ml
}

const QUICK_AMOUNTS = [150, 200, 250, 500];

export function WaterTracker({ dailyTarget }: Props) {
  const [water, setWater] = useState<WaterRecord>({ date: "", totalMl: 0, entries: [] });

  useEffect(() => {
    setWater(getTodayWater());
  }, []);

  const pct = Math.min(100, Math.round((water.totalMl / dailyTarget) * 100));
  const glasses = Math.floor(water.totalMl / 250);

  function handleAdd(ml: number) {
    setWater(addWater(ml));
  }

  function handleRemove() {
    if (water.totalMl === 0) return;
    setWater(removeWater(250));
  }

  const barColor = pct >= 100 ? "bg-teal-500" : pct >= 60 ? "bg-blue-500" : "bg-blue-700";

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
          💧 Water Today
        </h3>
        <span className={`text-sm font-bold ${pct >= 100 ? "text-teal-400" : "text-blue-400"}`}>
          {water.totalMl} / {dailyTarget} ml
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">
          {glasses} glass{glasses !== 1 ? "es" : ""} · {pct}%
        </span>
        {pct >= 100 && (
          <span className="text-xs text-teal-400">✓ Daily goal reached!</span>
        )}
      </div>

      {/* Quick add buttons */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_AMOUNTS.map((ml) => (
          <button
            key={ml}
            onClick={() => handleAdd(ml)}
            className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-blue-900 text-gray-300 hover:text-blue-300 text-xs font-medium transition-all border border-gray-700 hover:border-blue-700"
          >
            +{ml}ml
          </button>
        ))}
        <button
          onClick={handleRemove}
          disabled={water.totalMl === 0}
          className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-red-900/50 text-gray-500 hover:text-red-400 text-xs transition-all border border-gray-700 disabled:opacity-30"
        >
          undo
        </button>
      </div>
    </div>
  );
}
