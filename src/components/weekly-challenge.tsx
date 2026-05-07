"use client";
import { useState } from "react";
import { getLast7DaysStats, getProfile } from "@/lib/storage";

export function WeeklyChallenge() {
  const [copied, setCopied] = useState(false);
  const profile = getProfile();
  const weekStats = getLast7DaysStats();
  const dailyTarget = profile?.dailyGLTarget || 60;

  const daysTracked = weekStats.filter(d => d.mealCount > 0).length;
  const daysOnTarget = weekStats.filter(d => d.mealCount > 0 && d.totalGL <= dailyTarget).length;
  const totalGL = weekStats.reduce((s, d) => s + d.totalGL, 0);
  const avgGL = daysTracked > 0 ? Math.round(totalGL / daysTracked) : 0;
  const streak = (() => {
    let s = 0;
    for (let i = weekStats.length - 1; i >= 0; i--) {
      if (weekStats[i].mealCount > 0 && weekStats[i].totalGL <= dailyTarget) s++;
      else break;
    }
    return s;
  })();

  const score = Math.round((daysOnTarget / Math.max(daysTracked, 1)) * 100);
  const badge = score >= 90 ? "🏆 Perfect Week" : score >= 70 ? "⭐ Great Week" : score >= 50 ? "👍 Good Week" : "💪 Keep Going";

  async function handleShare() {
    const text = `${badge}\n📊 My GlucoLens Week:\n• ${daysOnTarget}/${daysTracked} days on target\n• Avg GL: ${avgGL}\n• 🔥 ${streak}-day streak\nTrack your glucose: glucolens-nine.vercel.app`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My GlucoLens Week", text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  }

  if (daysTracked === 0) return null;

  const scoreColor = score >= 70 ? "text-teal-400" : score >= 50 ? "text-amber-400" : "text-gray-400";

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">🏅 Weekly Challenge</h3>
          <p className="text-xs text-gray-500 mt-0.5">{badge}</p>
        </div>
        <div className={`text-2xl font-bold ${scoreColor}`}>{score}%</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-white font-bold text-lg">{daysOnTarget}/{daysTracked}</div>
          <div className="text-gray-500 text-xs">On Target</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-teal-400 font-bold text-lg">{avgGL}</div>
          <div className="text-gray-500 text-xs">Avg GL</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-amber-400 font-bold text-lg">🔥{streak}</div>
          <div className="text-gray-500 text-xs">Day Streak</div>
        </div>
      </div>

      <button onClick={handleShare}
        className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm transition-all">
        {copied ? "✓ Copied!" : "📤 Share My Week"}
      </button>
    </div>
  );
}
