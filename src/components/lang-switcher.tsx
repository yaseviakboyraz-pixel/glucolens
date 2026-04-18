"use client";
import { LANGUAGES, Lang } from "@/lib/i18n";
interface Props { current: Lang; onChange: (l: Lang) => void; }
export function LangSwitcher({ current, onChange }: Props) {
  return (
    <div className="relative inline-block">
      <select value={current} onChange={(e) => onChange(e.target.value as Lang)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 cursor-pointer focus:outline-none focus:border-teal-500 appearance-none pr-7">
        {(Object.entries(LANGUAGES) as [Lang, string][]).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs">▾</span>
    </div>
  );
}
