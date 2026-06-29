"use client";
import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { syncReminders, requestLocalNotifPermission } from "@/lib/local-notifications";

interface NotificationSettings {
  mealReminder: boolean;
  mealReminderTimes: string[]; // ["08:00", "13:00", "19:00"]
  glSpikeAlert: boolean;
  waterReminder: boolean;
  waterReminderInterval: number; // hours
  weeklyReport: boolean;
  fastingAlert: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  mealReminder: true,
  mealReminderTimes: ["08:00", "13:00", "19:00"],
  glSpikeAlert: true,
  waterReminder: true,
  waterReminderInterval: 2,
  weeklyReport: true,
  fastingAlert: true,
};

function loadSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("glucolens_notif_settings");
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

function saveSettings(s: NotificationSettings) {
  localStorage.setItem("glucolens_notif_settings", JSON.stringify(s));
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState<"unknown" | "granted" | "denied" | "prompt">("unknown");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    checkPermission();
    // Reminder schedules don't persist across app launches the way the saved
    // times do, so re-sync the device's pending notifications on every start.
    void syncReminders(loaded);
  }, []);

  async function checkPermission() {
    if (!Capacitor.isNativePlatform()) {
      if ("Notification" in window) {
        setPermissionStatus(Notification.permission as typeof permissionStatus);
      }
      return;
    }
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const perm = await PushNotifications.checkPermissions();
      setPermissionStatus(perm.receive as typeof permissionStatus);
    } catch { setPermissionStatus("unknown"); }
  }

  async function requestPermission() {
    setLoading(true);
    try {
      if (!Capacitor.isNativePlatform()) {
        if ("Notification" in window) {
          const result = await Notification.requestPermission();
          setPermissionStatus(result as typeof permissionStatus);
        }
      } else {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const result = await PushNotifications.requestPermissions();
        setPermissionStatus(result.receive as typeof permissionStatus);
        if (result.receive === "granted") {
          await PushNotifications.register();
          // Scheduled (local) reminders need their own permission; request it
          // and immediately schedule the user's configured reminders.
          await requestLocalNotifPermission();
          void syncReminders(settings);
        }
      }
    } catch (e) {
      console.error("Permission error:", e);
    } finally {
      setLoading(false);
    }
  }

  function update(partial: Partial<NotificationSettings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
    // Push the new schedule to the device so reminders match the UI instantly.
    void syncReminders(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function updateTime(index: number, value: string) {
    const times = [...settings.mealReminderTimes];
    times[index] = value;
    update({ mealReminderTimes: times });
  }

  function addTime() {
    if (settings.mealReminderTimes.length >= 5) return;
    update({ mealReminderTimes: [...settings.mealReminderTimes, "12:00"] });
  }

  function removeTime(index: number) {
    if (settings.mealReminderTimes.length <= 1) return;
    update({ mealReminderTimes: settings.mealReminderTimes.filter((_, i) => i !== index) });
  }

  const isGranted = permissionStatus === "granted";

  return (
    <div className="space-y-4">

      {/* Permission banner */}
      {permissionStatus !== "granted" && (
        <div className="bg-amber-950/50 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-amber-300 text-sm font-semibold">Bildirimler Kapalı</div>
              <div className="text-amber-400/70 text-xs mt-0.5">
                {permissionStatus === "denied"
                  ? "İzin verilmedi. Ayarlardan etkinleştir."
                  : "Öğün hatırlatıcıları ve uyarılar için izin gerekli."}
              </div>
            </div>
            {permissionStatus !== "denied" && (
              <button onClick={requestPermission} disabled={loading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shrink-0 transition-all disabled:opacity-50">
                {loading ? "..." : "İzin Ver"}
              </button>
            )}
          </div>
        </div>
      )}

      {saved && (
        <div className="text-center text-xs text-teal-400">✓ Kaydedildi</div>
      )}

      {/* Meal reminders */}
      <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 ${!isGranted ? "opacity-60 pointer-events-none" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white text-sm font-medium">🍽 Öğün Hatırlatıcı</div>
            <div className="text-gray-500 text-xs mt-0.5">Analiz etmeyi unutmaman için hatırlatır</div>
          </div>
          <Toggle value={settings.mealReminder} onChange={v => update({ mealReminder: v })} />
        </div>

        {settings.mealReminder && (
          <div className="space-y-2 pt-1 border-t border-gray-800">
            <div className="text-xs text-gray-500">Hatırlatma saatleri</div>
            {settings.mealReminderTimes.map((time, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="time" step={300} value={time} onChange={e => updateTime(i, e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-teal-500" />
                {settings.mealReminderTimes.length > 1 && (
                  <button onClick={() => removeTime(i)}
                    className="text-gray-600 hover:text-red-400 text-sm w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-all">
                    ✕
                  </button>
                )}
              </div>
            ))}
            {settings.mealReminderTimes.length < 5 && (
              <button onClick={addTime}
                className="text-xs text-teal-500 hover:text-teal-400 transition-colors">
                + Saat Ekle
              </button>
            )}
          </div>
        )}
      </div>

      {/* GL spike alert */}
      <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${!isGranted ? "opacity-60 pointer-events-none" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white text-sm font-medium">🔴 Yüksek GL Uyarısı</div>
            <div className="text-gray-500 text-xs mt-0.5">Öğün GL hedefini aştığında bildirim gönderir</div>
          </div>
          <Toggle value={settings.glSpikeAlert} onChange={v => update({ glSpikeAlert: v })} />
        </div>
      </div>

      {/* Water reminder */}
      <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 ${!isGranted ? "opacity-60 pointer-events-none" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white text-sm font-medium">💧 Su Hatırlatıcı</div>
            <div className="text-gray-500 text-xs mt-0.5">Her {settings.waterReminderInterval} saatte bir su içmeyi hatırlatır</div>
          </div>
          <Toggle value={settings.waterReminder} onChange={v => update({ waterReminder: v })} />
        </div>

        {settings.waterReminder && (
          <div className="flex items-center gap-3 pt-1 border-t border-gray-800">
            <span className="text-xs text-gray-500">Aralık:</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map(h => (
                <button key={h} onClick={() => update({ waterReminderInterval: h })}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${settings.waterReminderInterval === h ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                  {h}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fasting alert */}
      <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${!isGranted ? "opacity-60 pointer-events-none" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white text-sm font-medium">⏱ Oruç Tamamlandı Uyarısı</div>
            <div className="text-gray-500 text-xs mt-0.5">Oruç hedefine ulaştığında bildirim gönderir</div>
          </div>
          <Toggle value={settings.fastingAlert} onChange={v => update({ fastingAlert: v })} />
        </div>
      </div>

      {/* Weekly report */}
      <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${!isGranted ? "opacity-60 pointer-events-none" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white text-sm font-medium">📊 Haftalık Rapor</div>
            <div className="text-gray-500 text-xs mt-0.5">Pazartesi günleri haftalık GL özetini gönderir</div>
          </div>
          <Toggle value={settings.weeklyReport} onChange={v => update({ weeklyReport: v })} />
        </div>
      </div>

    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${value ? "bg-teal-600" : "bg-gray-700"}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? "left-5" : "left-0.5"}`} />
    </button>
  );
}
