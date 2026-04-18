"use client";
interface Props { risk: "low" | "medium" | "high"; gl: number; }
const config = {
  low: { label: "Düşük Risk", color: "text-green-400", bg: "bg-green-950", border: "border-green-500/40", bar: "bg-green-500" },
  medium: { label: "Orta Risk", color: "text-amber-400", bg: "bg-amber-950", border: "border-amber-500/40", bar: "bg-amber-500" },
  high: { label: "Yüksek Risk", color: "text-red-400", bg: "bg-red-950", border: "border-red-500/40", bar: "bg-red-500" },
};
export function GlucoseMeter({ risk, gl }: Props) {
  const c = config[risk];
  const pct = Math.min((gl / 40) * 100, 100);
  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`font-semibold text-lg ${c.color}`}>{c.label}</span>
        <span className={`text-3xl font-bold ${c.color}`}>GL {gl}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
        <div className={`h-2 rounded-full transition-all duration-700 ${c.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400">
        {risk === "low" ? "✓ Kan şekerini çok az etkiler (GL < 10)" :
         risk === "medium" ? "⚠ Kan şekerini orta düzeyde etkiler (GL 10-20)" :
         "⛔ Kan şekerini önemli ölçüde yükseltir (GL > 20)"}
      </p>
    </div>
  );
}
