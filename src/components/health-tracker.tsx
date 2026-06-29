"use client";
import { useState, useEffect, useCallback } from "react";
import {
  logSleep, getTodaySleep, getAvgSleepHours, getSleepLogs, deleteSleepLog,
  startFasting, stopFasting, getActiveFasting, getFastingElapsedHours,
  getFastingSessions, deleteFastingSession, calculateHomaIR, getHomaIRHistory, deleteHomaIRRecord,
  getLast7DaysStats, getLast30DaysStats,
  type SleepLog, type FastingSession, type HomaIRRecord,
} from "@/lib/storage";
import { Trash2 } from "lucide-react";
type Tab = "sleep" | "fasting" | "homa" | "trends";

// Compute sleep duration (hours, 0.5 precision) from bed/wake "HH:MM", handling
// the overnight wrap (wake time falls on the next day when it is ≤ bedtime).
function computeSleepHours(bed: string, wake: string): number {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  if ([bh, bm, wh, wm].some((n) => Number.isNaN(n))) return 0;
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60; // crossed midnight
  return Math.round(mins / 5) * 5 / 60; // round to nearest 5 minutes
}

// Format a decimal-hour duration as a human-readable "Xsa Ydk" string:
// 7.5 -> "7sa 30dk", 7.0833 -> "7sa 5dk", 0.5 -> "30dk", 16 -> "16sa".
function formatDuration(hours: number): string {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}dk`;
  if (m === 0) return `${h}sa`;
  return `${h}sa ${m}dk`;
}

export function HealthTracker() {
  const [tab, setTab] = useState<Tab>("sleep");
  const [, forceUpdate] = useState(0);
  const refresh = useCallback(() => forceUpdate(n => n + 1), []);

  // ── Sleep ────────────────────────────────────────
  const [sleepHours, setSleepHours] = useState(7.5);
  const [sleepQuality, setSleepQuality] = useState<SleepLog["quality"]>("good");
  const [sleepBed, setSleepBed] = useState("23:00");
  const [sleepWake, setSleepWake] = useState("06:30");
  const todaySleep = getTodaySleep();
  const avgSleep7 = getAvgSleepHours(7);
  const recentSleep = getSleepLogs().slice(0, 7);

  // Auto-compute sleep duration from bed/wake times. Previously the hours were
  // set only by the manual slider and ignored the times entirely — entering
  // 23:00 → 06:30 did not yield 7.5h. Now the times drive the duration; the
  // slider remains available as a manual fine-tune afterward.
  useEffect(() => {
    const h = computeSleepHours(sleepBed, sleepWake);
    if (h > 0) setSleepHours(h);
  }, [sleepBed, sleepWake]);

  function handleLogSleep() {
    logSleep(sleepHours, sleepQuality, sleepBed, sleepWake);
    refresh();
  }

  // ── Fasting ──────────────────────────────────────
  const [fastProtocol, setFastProtocol] = useState<FastingSession["protocol"]>("16:8");
  const [elapsed, setElapsed] = useState(0);
  const activeFast = getActiveFasting();
  const recentFasts = getFastingSessions().slice(0, 5);

  useEffect(() => {
    const timer = setInterval(() => {
      if (getActiveFasting()) setElapsed(getFastingElapsedHours());
    }, 30_000);
    if (getActiveFasting()) setElapsed(getFastingElapsedHours());
    return () => clearInterval(timer);
  }, []);

  const PROTOCOL_HOURS: Record<FastingSession["protocol"], number> = {
    "16:8": 16, "18:6": 18, "20:4": 20, "5:2": 24, "OMAD": 23, "custom": 16,
  };

  function handleStartFast() {
    const hours = PROTOCOL_HOURS[fastProtocol];
    startFasting(hours, fastProtocol);
    setElapsed(0);
    refresh();
  }

  function handleStopFast() {
    stopFasting();
    setElapsed(0);
    refresh();
  }

  // ── HOMA-IR ──────────────────────────────────────
  const [glucose, setGlucose] = useState("");
  const [insulin, setInsulin] = useState("");
  const [homaResult, setHomaResult] = useState<HomaIRRecord | null>(null);
  const homaHistory = getHomaIRHistory();

  // Live HOMA-IR preview — computed as the user types, without persisting. The
  // result card reflects this instantly; the button saves it to history. Mirrors
  // calculateHomaIR's formula and thresholds (kept in sync intentionally).
  const homaPreview: HomaIRRecord | null = (() => {
    const g = parseFloat(glucose);
    const i = parseFloat(insulin);
    if (!(g > 0) || !(i > 0)) return null;
    const v = parseFloat(((g * i) / 405).toFixed(2));
    return {
      id: "preview", fastingGlucose_mgdl: g, fastingInsulin_uIUml: i,
      homaIR: v,
      interpretation: v < 1.9 ? "normal" : v < 2.9 ? "borderline" : "insulin_resistant",
      timestamp: 0,
    };
  })();
  const homaDisplay = homaPreview ?? homaResult;

  function handleCalculateHoma() {
    const g = parseFloat(glucose);
    const i = parseFloat(insulin);
    if (!g || !i || g <= 0 || i <= 0) return;
    const result = calculateHomaIR(g, i);
    setHomaResult(result);
    refresh();
  }

  // ── Trends ───────────────────────────────────────
  const [trendsRange, setTrendsRange] = useState<"7" | "30">("7");
  const stats7 = getLast7DaysStats();
  const stats30 = getLast30DaysStats();
  const stats = trendsRange === "7" ? stats7 : stats30;
  const maxGL = Math.max(...stats.map(d => d.totalGL), 1);

  // Quality color helpers
  const qualityColor = (q: SleepLog["quality"]) =>
    q === "excellent" ? "text-green-400" : q === "good" ? "text-teal-400" : q === "fair" ? "text-amber-400" : "text-red-400";

  const homaColor = (interp: HomaIRRecord["interpretation"]) =>
    interp === "normal" ? "text-green-400" : interp === "borderline" ? "text-amber-400" : "text-red-400";

  const homaLabel = (interp: HomaIRRecord["interpretation"]) =>
    interp === "normal" ? "Normal" : interp === "borderline" ? "Sınırda" : "İnsülin Direnci";

  return (
    <div className="space-y-4 pb-4">
      {/* Tab bar */}
      <div className="grid grid-cols-4 gap-1 bg-gray-900 rounded-xl p-1">
        {([
          { key: "sleep", label: "😴 Uyku" },
          { key: "fasting", label: "⏱ Oruç" },
          { key: "homa", label: "🧬 HOMA" },
          { key: "trends", label: "📈 Trend" },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-2 rounded-lg text-xs font-medium transition-all ${tab === t.key ? "bg-teal-600 text-white" : "text-gray-500 hover:text-gray-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SLEEP TAB ── */}
      {tab === "sleep" && (
        <div className="space-y-3">
          {/* Today summary */}
          {todaySleep ? (
            <div className="bg-indigo-950/50 border border-indigo-500/30 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white font-semibold">{formatDuration(todaySleep.hours)}</div>
                  <div className={`text-xs ${qualityColor(todaySleep.quality)} mt-0.5`}>
                    {todaySleep.quality === "excellent" ? "Mükemmel" : todaySleep.quality === "good" ? "İyi" : todaySleep.quality === "fair" ? "Orta" : "Kötü"}
                    {todaySleep.bedtime && ` · ${todaySleep.bedtime} → ${todaySleep.wakeTime}`}
                  </div>
                </div>
                <div className="text-3xl">
                  {todaySleep.quality === "excellent" ? "🌟" : todaySleep.quality === "good" ? "😴" : todaySleep.quality === "fair" ? "😐" : "😞"}
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-2">7 günlük ortalama: {formatDuration(avgSleep7)}</div>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center text-gray-500 text-sm">
              Bugünkü uyku henüz girilmedi
            </div>
          )}

          {/* Log form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white text-sm font-medium">Uyku Kaydet</span>
              <span className="text-teal-400 font-bold">{formatDuration(sleepHours)} <span className="text-gray-600 text-xs font-normal">otomatik</span></span>
            </div>
            <input type="range" min={180} max={720} step={5}
              value={Math.round(sleepHours * 60)} onChange={e => setSleepHours(parseInt(e.target.value, 10) / 60)}
              className="w-full accent-teal-500" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Yatış</label>
                <input type="time" step={300} value={sleepBed} onChange={e => setSleepBed(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-teal-500 mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Uyanış</label>
                <input type="time" step={300} value={sleepWake} onChange={e => setSleepWake(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-teal-500 mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(["poor", "fair", "good", "excellent"] as SleepLog["quality"][]).map(q => (
                <button key={q} onClick={() => setSleepQuality(q)}
                  className={`py-2 rounded-lg text-xs transition-all ${sleepQuality === q
                    ? q === "excellent" ? "bg-green-700 text-white" : q === "good" ? "bg-teal-700 text-white" : q === "fair" ? "bg-amber-700 text-white" : "bg-red-900 text-white"
                    : "bg-gray-800 text-gray-500"}`}>
                  {q === "poor" ? "Kötü" : q === "fair" ? "Orta" : q === "good" ? "İyi" : "Harika"}
                </button>
              ))}
            </div>
            <button onClick={handleLogSleep}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all">
              😴 Uyku Kaydet
            </button>
          </div>

          {/* History */}
          {recentSleep.length > 0 && (
            <div className="space-y-1.5">
              {recentSleep.map(s => (
                <div key={s.id} className="bg-gray-900 rounded-xl px-4 py-2.5 flex justify-between items-center border border-gray-800">
                  <div>
                    <span className="text-white text-sm">{formatDuration(s.hours)}</span>
                    <span className={`text-xs ml-2 ${qualityColor(s.quality)}`}>
                      {s.quality === "poor" ? "Kötü" : s.quality === "fair" ? "Orta" : s.quality === "good" ? "İyi" : "Harika"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-gray-600 text-xs">
                      {new Date(s.timestamp).toLocaleDateString("tr-TR", { month: "short", day: "numeric" })}
                    </span>
                    <button onClick={() => { deleteSleepLog(s.id); refresh(); }} aria-label="Sil"
                      className="text-gray-600 hover:text-red-400 transition-colors p-1 -mr-1">
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FASTING TAB ── */}
      {tab === "fasting" && (
        <div className="space-y-3">
          {/* Active fast */}
          {activeFast ? (
            <div className="bg-amber-950/50 border border-amber-500/30 rounded-xl p-5 text-center">
              <div className="text-amber-400 text-xs font-semibold mb-2 tracking-widest">ORUÇ AKTİF</div>
              <div className="text-white text-4xl font-bold mb-1">{formatDuration(elapsed)}</div>
              <div className="text-gray-500 text-sm">Hedef: {activeFast.targetHours} saat · {activeFast.protocol}</div>
              {/* Progress bar */}
              <div className="mt-3 bg-gray-800 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (elapsed / activeFast.targetHours) * 100)}%` }} />
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {formatDuration(Math.max(0, activeFast.targetHours - elapsed))} kaldı
              </div>
              <button onClick={() => { handleStopFast(); }}
                className="mt-4 w-full py-3 bg-red-900/50 hover:bg-red-800/50 border border-red-500/30 text-red-300 rounded-xl text-sm font-semibold transition-all">
                ⏹ Orucu Bitir
              </button>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="text-white text-sm font-medium">Protokol Seç</div>
              <div className="grid grid-cols-3 gap-2">
                {(["16:8", "18:6", "20:4", "5:2", "OMAD", "custom"] as FastingSession["protocol"][]).map(p => (
                  <button key={p} onClick={() => setFastProtocol(p)}
                    className={`py-2.5 rounded-xl text-xs font-medium transition-all ${fastProtocol === p ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-600 text-center">
                {fastProtocol === "16:8" ? "16s oruç / 8s yemek penceresi" :
                 fastProtocol === "18:6" ? "18s oruç / 6s yemek penceresi" :
                 fastProtocol === "20:4" ? "20s oruç / 4s yemek penceresi" :
                 fastProtocol === "5:2" ? "Haftada 2 gün kısıtlı kalori" :
                 fastProtocol === "OMAD" ? "Günde tek öğün" : "Özel süre"}
              </div>
              <button onClick={handleStartFast}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition-all">
                ⏱ Orucu Başlat
              </button>
            </div>
          )}

          {/* Fasting history */}
          {recentFasts.filter(f => f.endTime).length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-500 px-1">Son Oruçlar</div>
              {recentFasts.filter(f => f.endTime).map(f => {
                const dur = parseFloat(((f.endTime! - f.startTime) / 3_600_000).toFixed(1));
                const completed = dur >= f.targetHours;
                return (
                  <div key={f.id} className="bg-gray-900 rounded-xl px-4 py-2.5 flex justify-between items-center border border-gray-800">
                    <div>
                      <span className="text-white text-sm">{formatDuration(dur)}</span>
                      <span className={`text-xs ml-2 ${completed ? "text-green-400" : "text-amber-400"}`}>
                        {completed ? "✓ Tamamlandı" : "Erken bitirdi"} · {f.protocol}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-gray-600 text-xs">
                        {new Date(f.startTime).toLocaleDateString("tr-TR", { month: "short", day: "numeric" })}
                      </span>
                      <button onClick={() => { deleteFastingSession(f.id); refresh(); }} aria-label="Sil"
                        className="text-gray-600 hover:text-red-400 transition-colors p-1 -mr-1">
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── HOMA-IR TAB ── */}
      {tab === "homa" && (
        <div className="space-y-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div>
              <div className="text-white text-sm font-medium">HOMA-IR Hesaplayıcı</div>
              <div className="text-gray-500 text-xs mt-0.5">İnsülin direncini ölçmek için açlık kan değerlerini gir</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Açlık Glikozu (mg/dL)</label>
                <input type="number" value={glucose} onChange={e => setGlucose(e.target.value)}
                  placeholder="örn. 95"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-teal-500 mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Açlık İnsülini (μIU/mL)</label>
                <input type="number" value={insulin} onChange={e => setInsulin(e.target.value)}
                  placeholder="örn. 8.5"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-teal-500 mt-1" />
              </div>
            </div>
            <button onClick={handleCalculateHoma}
              disabled={!glucose || !insulin}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-all">
              📌 Geçmişe Kaydet
            </button>
          </div>

          {homaDisplay && (
            <div className={`rounded-xl border p-4 ${homaDisplay.interpretation === "normal" ? "bg-green-950/40 border-green-500/30" : homaDisplay.interpretation === "borderline" ? "bg-amber-950/40 border-amber-500/30" : "bg-red-950/40 border-red-500/30"}`}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white text-2xl font-bold">{homaDisplay.homaIR}
                    {homaPreview && <span className="text-gray-600 text-xs font-normal ml-1.5">anlık</span>}
                  </div>
                  <div className={`text-sm font-medium ${homaColor(homaDisplay.interpretation)}`}>
                    {homaLabel(homaDisplay.interpretation)}
                  </div>
                </div>
                <div className="text-4xl">
                  {homaDisplay.interpretation === "normal" ? "✅" : homaDisplay.interpretation === "borderline" ? "⚠️" : "🔴"}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Referans: &lt;1.9 Normal · 1.9-2.9 Sınırda · &gt;2.9 İnsülin Direnci
              </div>
            </div>
          )}

          {/* Referans bilgi */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-gray-500 space-y-1">
            <div className="font-medium text-gray-400 mb-2">HOMA-IR Nedir?</div>
            <div>🔬 Açlık glikoz ve insülin değerlerinden insülin direncini hesaplar</div>
            <div>📊 Formül: (Glikoz × İnsülin) / 405</div>
            <div>⚕️ Sonuçları doktorunla paylaşmanı öneririz</div>
          </div>

          {/* History */}
          {homaHistory.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-500 px-1">Geçmiş Ölçümler</div>
              {homaHistory.slice(0, 6).map(h => (
                <div key={h.id} className="bg-gray-900 rounded-xl px-4 py-2.5 flex justify-between items-center border border-gray-800">
                  <div>
                    <span className="text-white text-sm font-bold">{h.homaIR}</span>
                    <span className={`text-xs ml-2 ${homaColor(h.interpretation)}`}>{homaLabel(h.interpretation)}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-gray-600 text-xs">
                      {new Date(h.timestamp).toLocaleDateString("tr-TR", { month: "short", day: "numeric" })}
                    </span>
                    <button onClick={() => { deleteHomaIRRecord(h.id); refresh(); }} aria-label="Sil"
                      className="text-gray-600 hover:text-red-400 transition-colors p-1 -mr-1">
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TRENDS TAB ── */}
      {tab === "trends" && (
        <div className="space-y-4">
          {/* Range toggle */}
          <div className="flex gap-2">
            <button onClick={() => setTrendsRange("7")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${trendsRange === "7" ? "bg-teal-600 text-white" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
              7 Gün
            </button>
            <button onClick={() => setTrendsRange("30")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${trendsRange === "30" ? "bg-teal-600 text-white" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
              30 Gün
            </button>
          </div>

          {/* GL Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-sm text-white font-medium mb-3">Günlük GL</div>
            <div className="flex items-end gap-1 h-28">
              {stats.map((day, i) => {
                const pct = maxGL > 0 ? (day.totalGL / maxGL) * 100 : 0;
                const isToday = i === stats.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-gray-600 text-[8px]">{day.totalGL > 0 ? day.totalGL : ""}</div>
                    <div className="w-full rounded-t-sm transition-all"
                      style={{ height: `${Math.max(pct, 2)}%`, background: isToday ? "rgb(20,184,166)" : day.totalGL === 0 ? "rgb(55,65,81)" : "rgb(6,182,212,0.6)" }} />
                    <div className={`text-[8px] ${isToday ? "text-teal-400 font-bold" : "text-gray-600"}`}>
                      {trendsRange === "7" ? day.dayLabel : day.date.slice(4, 10)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Ort. GL", value: (stats.filter(d => d.mealCount > 0).reduce((s, d) => s + d.totalGL, 0) / Math.max(1, stats.filter(d => d.mealCount > 0).length)).toFixed(1) },
              { label: "Aktif Gün", value: stats.filter(d => d.mealCount > 0).length },
              { label: "Toplam Öğün", value: stats.reduce((s, d) => s + d.mealCount, 0) },
            ].map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <div className="text-white font-bold">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Sleep trend mini */}
          {getSleepLogs().length > 2 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-sm text-white font-medium mb-2">Uyku Trendi</div>
              <div className="flex gap-2 items-center">
                <div className="text-2xl font-bold text-indigo-400">{formatDuration(getAvgSleepHours(trendsRange === "7" ? 7 : 30))}</div>
                <div className="text-sm text-gray-500">ort. ({trendsRange} gün)</div>
              </div>
              <div className="flex items-end gap-1 h-12 mt-2">
                {getSleepLogs().slice(0, trendsRange === "7" ? 7 : 14).reverse().map((s, i) => (
                  <div key={i} className="flex-1 bg-indigo-500/40 rounded-t-sm"
                    style={{ height: `${(s.hours / 12) * 100}%` }} />
                ))}
              </div>
            </div>
          )}

          {/* Fasting stats */}
          {getFastingSessions().filter(f => f.endTime).length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-sm text-white font-medium mb-2">Oruç İstatistikleri</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center">
                  <div className="text-amber-400 font-bold text-xl">
                    {getFastingSessions().filter(f => f.endTime).length}
                  </div>
                  <div className="text-xs text-gray-500">Tamamlanan Oruç</div>
                </div>
                <div className="text-center">
                  <div className="text-amber-400 font-bold text-xl">
                    {formatDuration(getFastingSessions().filter(f => f.endTime)
                      .reduce((s, f) => s + (f.endTime! - f.startTime) / 3_600_000, 0) /
                      Math.max(1, getFastingSessions().filter(f => f.endTime).length))}
                  </div>
                  <div className="text-xs text-gray-500">Ort. Süre</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
