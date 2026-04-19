"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getLast7DaysStats, type DailyStats } from "@/lib/storage";

interface Props {
  dailyTarget: number;
}

export function GLChart({ dailyTarget }: Props) {
  const [data, setData] = useState<{ day: string; gl: number; meals: number }[]>([]);

  useEffect(() => {
    // Client-side only — localStorage'a SSR'da erişilemez
    const stats: DailyStats[] = getLast7DaysStats();
    setData(stats.map((d) => ({
      day: new Date(d.date + "T12:00:00").toLocaleDateString("en", { weekday: "short" }),
      gl: d.totalGL,
      meals: d.mealCount,
    })));
  }, []);

  const getColor = (gl: number) => {
    if (gl === 0) return "#374151";
    if (gl <= dailyTarget * 0.7) return "#10b981";
    if (gl <= dailyTarget) return "#f59e0b";
    return "#ef4444";
  };

  if (data.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 h-[180px] flex items-center justify-center">
        <p className="text-gray-600 text-sm">No data yet — analyze meals to see your trend</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-400">7-Day GL Overview</h3>
        <div className="text-xs text-gray-600">Target: GL {dailyTarget}</div>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
                  <div className="text-white font-medium">{label}</div>
                  <div className="text-teal-400">GL: {d.gl || 0}</div>
                  <div className="text-gray-400">{d.meals} meal{d.meals !== 1 ? "s" : ""}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="gl" radius={[4, 4, 0, 0]} maxBarSize={32}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getColor(entry.gl)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex gap-3 mt-3 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> On target</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Near limit</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Over limit</span>
      </div>
    </div>
  );
}
