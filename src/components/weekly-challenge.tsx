"use client";
import { useState } from "react";
import { getLast7DaysStats, getProfile } from "@/lib/storage";
import { getT, type Lang } from "@/lib/i18n";

export function WeeklyChallenge({ lang }: { lang: Lang }) {
  const tx = getT(lang);
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
  const badge = score >= 90 ? tx.wc_perfect : score >= 70 ? tx.wc_great : score >= 50 ? tx.wc_good : tx.wc_keep_going;

  async function handleShare() {
    const text = `${badge}\n\ud83d\udcca ${tx.wc_share_title}:\n\u2022 ${daysOnTarget}/${daysTracked} ${tx.wc_share_days}\n\u2022 ${tx.wc_share_avg} ${avgGL}\n\u2022 \ud83d\udd25 ${streak}-${tx.wc_share_streak}\n${tx.wc_share_cta} glucolens-nine.vercel.app`;
    try {
      if (navigator.share) {
        await navigator.share({ title: tx.wc_share_title, text });
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
          <h3 className="text-sm font-semibold text-white">{tx.wc_title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{badge}</p>
        </div>
        <div className={`text-2xl font-bold ${scoreColor}`}>{score}%</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-white font-bold text-lg">{daysOnTarget}/{daysTracked}</div>
          <div className="text-gray-500 text-xs">{tx.glc_on_target}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-teal-400 font-bold text-lg">{avgGL}</div>
          <div className="text-gray-500 text-xs">{tx.wc_avg_gl}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-amber-400 font-bold text-lg">🔥{streak}</div>
          <div className="text-gray-500 text-xs">{tx.wc_day_streak}</div>
        </div>
      </div>

      <button onClick={handleShare}
        className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm transition-all">
        {copied ? tx.wc_copied : tx.wc_share}
      </button>
    </div>
  );
}
