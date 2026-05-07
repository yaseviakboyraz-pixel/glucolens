"use client";
import { useState } from "react";
import { getProfile, saveProfile, getTodayStats, getLast7DaysStats, getGLTargets } from "@/lib/storage";

export function GoalTracker() {
  const profile = getProfile();
  const [dailyTarget, setDailyTarget] = useState(profile?.dailyGLTarget || 60);
  const [editing, setEditing] = useState(false);
  const [tempTarget, setTempTarget] = useState(dailyTarget);
  const todayStats = getTodayStats();
  const weekStats = getLast7DaysStats();
  const targets = getGLTargets(profile?.userType || "healthy");
  const todayGL = todayStats.totalGL;
  const progress = Math.min(100, Math.round((todayGL / dailyTarget) * 100));
  const remaining = Math.max(0, parseFloat((dailyTarget - todayGL).toFixed(1)));
  const progressColor = progress < 60 ? "bg-teal-500" : progress < 85 ? "bg-amber-500" : "bg-red-500";
  const daysOnTarget = weekStats.filter(d => d.mealCount > 0 && d.totalGL <= dailyTarget).length;
  const daysTracked = weekStats.filter(d => d.mealCount > 0).length;

  function saveTarget() {
    if (!profile) return;
    saveProfile({ ...profile, dailyGLTarget: tempTarget });
    setDailyTarget(tempTarget);
    setEditing(false);
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">🎯 Daily GL Goal</h3>
          <p className="text-xs text-gray-500 mt-0.5">Recommended: {targets.daily} GL/day</p>
        </div>
        {!editing ? (
          <button onClick={() => { setTempTarget(dailyTarget); setEditing(true); }} className="text-xs text-teal-400 px-2 py-1 rounded-lg border border-teal-800">Edit</button>
        ) : (
          <div className="flex gap-2 items-center">
            <input type="number" value={tempTarget} onChange={e => setTempTarget(Number(e.target.value))} className="w-16 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs text-center focus:outline-none" />
            <button onClick={saveTarget} className="text-xs text-white bg-teal-600 px-2 py-1 rounded-lg">Save</button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500">✕</button>
          </div>
        )}
      </div>
      <div className="px-4 pb-4 space-y-3">
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Today: <span className="text-white font-medium">{todayGL} GL</span></span>
            <span>Goal: <span className="text-white font-medium">{dailyTarget} GL</span></span>
          </div>
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span className={progress >= 100 ? "text-red-400" : "text-gray-600"}>{progress}% of daily goal</span>
            {remaining > 0 ? <span className="text-teal-400">{remaining} GL remaining</span> : <span className="text-red-400">Exceeded by {parseFloat((todayGL - dailyTarget).toFixed(1))}</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[{label:"Breakfast",budget:Math.round(dailyTarget*0.35),icon:"🌅"},{label:"Lunch",budget:Math.round(dailyTarget*0.40),icon:"☀️"},{label:"Dinner",budget:Math.round(dailyTarget*0.25),icon:"🌙"}].map(meal => (
            <div key={meal.label} className="bg-gray-800 rounded-xl p-2.5 text-center">
              <div className="text-sm mb-0.5">{meal.icon}</div>
              <div className="text-white font-bold text-sm">{meal.budget}</div>
              <div className="text-gray-600 text-xs">{meal.label}</div>
            </div>
          ))}
        </div>
        {daysTracked > 0 && (
          <div className="border-t border-gray-800 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">This week on target</span>
              <span className={`text-sm font-bold ${daysOnTarget >= daysTracked * 0.7 ? "text-teal-400" : "text-amber-400"}`}>{daysOnTarget}/{daysTracked} days ✓</span>
            </div>
            <div className="flex gap-1 mt-2 items-end h-8">
              {weekStats.map((day, i) => {
                const pct = day.mealCount === 0 ? 8 : Math.max(8, Math.min(100, (day.totalGL / dailyTarget) * 100));
                const col = day.mealCount === 0 ? "bg-gray-800" : day.totalGL <= dailyTarget ? "bg-teal-500" : "bg-red-500";
                return (<div key={i} className="flex-1 flex flex-col items-center gap-0.5"><div className={`w-full rounded-sm ${col}`} style={{height:`${pct}%`}} /><div className="text-gray-700 text-xs">{day.dayLabel[0]}</div></div>);
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
