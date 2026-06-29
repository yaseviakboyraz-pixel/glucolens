// GlucoLens local notifications — scheduled, on-device reminders (no server).
//
// Uses @capacitor/local-notifications. NATIVE ONLY — every function no-ops on
// web (Capacitor.isNativePlatform() === false), so it is safe to call anywhere.
//
// Two kinds of notification live here:
//
//   TIME-BASED (managed by syncReminders, driven by saved NotificationSettings)
//     - meal reminders : daily, at each configured HH:MM
//     - water reminders: daily, every N hours across waking hours
//     - weekly report  : weekly, Monday morning
//
//   EVENT-BASED (fired by app logic via storage.ts hooks)
//     - fasting complete: one-shot, scheduled when a fast starts (start+target),
//                         cancelled when the fast is stopped early
//     - GL spike        : immediate, when a logged meal exceeds the GL target
//
// All display requires the OS notification permission (requestLocalNotifPermission).

import { Capacitor } from "@capacitor/core";

export interface ReminderSettings {
  mealReminder: boolean;
  mealReminderTimes: string[]; // ["08:00", "13:00", ...]
  waterReminder: boolean;
  waterReminderInterval: number; // hours
  weeklyReport: boolean;
}

// Partitioned ID ranges so each category can be cancelled/replaced independently
// without disturbing the others (or any unrelated notification).
const MEAL_ID_BASE = 1000; // 1000..1099 (one per configured time)
const WATER_ID_BASE = 2000; // 2000..2099 (one per interval slot)
const WEEKLY_ID = 3000; // single weekly report
const FASTING_ID = 4000; // single one-shot fast-complete
const GLSPIKE_ID_BASE = 5000; // 5000..5009, rotated so rapid spikes don't overwrite

const WATER_START_HOUR = 9; // first water ping of the day
const WATER_END_HOUR = 22; // last water ping of the day
const WEEKLY_HOUR = 9; // Monday 09:00
const WEEKLY_MONDAY = 2; // Capacitor weekday: 1=Sun, 2=Mon … 7=Sat

// syncReminders owns meal + water + weekly. Fasting and GL-spike are managed by
// their own event hooks, so they are deliberately NOT matched here (a settings
// re-sync must never cancel an in-flight fast notification).
function isManagedBySync(id: number): boolean {
  return (id >= MEAL_ID_BASE && id < MEAL_ID_BASE + 100) ||
         (id >= WATER_ID_BASE && id < WATER_ID_BASE + 100) ||
         id === WEEKLY_ID;
}

export function isLocalNotifAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

// Request the OS permission needed to display local notifications. Returns true
// only when the user grants it. No-op (false) on web.
export async function requestLocalNotifPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const res = await LocalNotifications.requestPermissions();
    return res.display === "granted";
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("requestLocalNotifPermission error:", e);
    return false;
  }
}

export async function localNotifGranted(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const res = await LocalNotifications.checkPermissions();
    return res.display === "granted";
  } catch {
    return false;
  }
}

type ScheduleOn = { weekday?: number; hour: number; minute: number };
type Notif = {
  id: number; title: string; body: string;
  schedule: { on: ScheduleOn; allowWhileIdle: boolean };
};

// Cancel every reminder syncReminders manages, then re-schedule from the current
// settings. Idempotent: call it whenever settings change (or on app start) and
// the device's pending notifications will always match the UI exactly — no
// duplicates, no stale times.
export async function syncReminders(s: ReminderSettings): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // 1. Clear our previously-scheduled reminders (leave others untouched).
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter(n => isManagedBySync(n.id));
    if (ours.length) {
      await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) });
    }

    const toSchedule: Notif[] = [];

    // 2. Meal reminders — daily repeating at each configured time. An
    //    `on: { hour, minute }` schedule (no date) repeats every day.
    if (s.mealReminder) {
      s.mealReminderTimes.slice(0, 100).forEach((t, i) => {
        const [hh, mm] = t.split(":").map(Number);
        if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
        toSchedule.push({
          id: MEAL_ID_BASE + i,
          title: "🍽 Öğün hatırlatıcı",
          body: "Öğününü analiz etmeyi unutma — glikoz etkisini birkaç saniyede gör.",
          schedule: { on: { hour: hh, minute: mm }, allowWhileIdle: true },
        });
      });
    }

    // 3. Water reminders — every N hours across waking hours, daily repeating.
    if (s.waterReminder && s.waterReminderInterval > 0) {
      let slot = 0;
      for (let h = WATER_START_HOUR; h <= WATER_END_HOUR && slot < 100; h += s.waterReminderInterval) {
        toSchedule.push({
          id: WATER_ID_BASE + slot++,
          title: "💧 Su hatırlatıcı",
          body: "Bir bardak su içmeyi unutma.",
          schedule: { on: { hour: h, minute: 0 }, allowWhileIdle: true },
        });
      }
    }

    // 4. Weekly report — Monday morning, repeating weekly.
    if (s.weeklyReport) {
      toSchedule.push({
        id: WEEKLY_ID,
        title: "📊 Haftalık raporun hazır",
        body: "Geçen haftanın glisemik yük özetine göz at.",
        schedule: { on: { weekday: WEEKLY_MONDAY, hour: WEEKLY_HOUR, minute: 0 }, allowWhileIdle: true },
      });
    }

    if (toSchedule.length) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("syncReminders error:", e);
  }
}

// One-shot "fast complete" notification, scheduled when a fast starts. Always
// clears any previous one first; a disabled setting or past time just clears.
export async function scheduleFastingComplete(endMs: number, enabled: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: FASTING_ID }] });
    if (!enabled || endMs <= Date.now()) return;
    await LocalNotifications.schedule({
      notifications: [{
        id: FASTING_ID,
        title: "⏱ Oruç tamamlandı",
        body: "Hedefine ulaştın — orucunu bitirebilirsin. 🎉",
        schedule: { at: new Date(endMs), allowWhileIdle: true },
      }],
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("scheduleFastingComplete error:", e);
  }
}

export async function cancelFastingComplete(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: FASTING_ID }] });
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("cancelFastingComplete error:", e);
  }
}

// Rotated across a small id pool so several spikes in a row each show instead of
// overwriting one another.
let glSpikeSlot = 0;

// Immediate alert when a logged meal's GL exceeds the user's target. `enabled`
// is the user's glSpikeAlert setting; the caller also decides the threshold.
export async function notifyGLSpike(gl: number, target: number, enabled: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform() || !enabled) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [{
        id: GLSPIKE_ID_BASE + (glSpikeSlot++ % 10),
        title: "🔴 Yüksek glisemik yük",
        body: `Bu öğünün GL'si ${gl} — hedefin (${target}) üzerinde. Kısa bir yürüyüş veya su yardımcı olabilir.`,
        schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true },
      }],
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("notifyGLSpike error:", e);
  }
}

// Cancel everything this module scheduled (e.g. on full sign-out / disable).
export async function cancelAllReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    const ids = pending.notifications
      .filter(n => isManagedBySync(n.id) || n.id === FASTING_ID ||
                   (n.id >= GLSPIKE_ID_BASE && n.id < GLSPIKE_ID_BASE + 10))
      .map(n => ({ id: n.id }));
    if (ids.length) await LocalNotifications.cancel({ notifications: ids });
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("cancelAllReminders error:", e);
  }
}
