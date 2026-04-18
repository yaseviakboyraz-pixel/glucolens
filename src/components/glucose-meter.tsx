"use client";
import { t, type Lang } from "@/lib/i18n";

interface Props { risk: "low" | "medium" | "high"; gl: number; lang: Lang; }

const style = {
  low:    { color: "text-green-400", bg: "bg-green-950", border: "border-green-500/40", bar: "bg-green-500" },
  medium: { color: "text-amber-400", bg: "bg-amber-950", border: "border-amber-500/40", bar: "bg-amber-500" },
  high:   { color: "text-red-400",   bg: "bg-red-950",   border: "border-red-500/40",   bar: "bg-red-500"   },
};

export function GlucoseMeter({ risk, gl, lang }: Props) {
  const c = style[risk];
  const tx = t[lang];
  const pct = Math.min((gl / 40) * 100, 100);
  const label = risk === "low" ? tx.low_risk : risk === "medium" ? tx.medium_risk : tx.high_risk;
  const desc  = risk === "low" ? tx.gl_low   : risk === "medium" ? tx.gl_medium   : tx.gl_high;
  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`font-semibold text-lg ${c.color}`}>{label}</span>
        <span className={`text-3xl font-bold ${c.color}`}>GL {gl}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
        <div className={`h-2 rounded-full transition-all duration-700 ${c.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400">{desc}</p>
    </div>
  );
}
