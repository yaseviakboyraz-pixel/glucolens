// GlucoLens local notifications — scheduled, on-device reminders (no server).
//
// Uses @capacitor/local-notifications. NATIVE ONLY — every function no-ops on
// web (Capacitor.isNativePlatform() === false), so it is safe to call anywhere.
//
// Scope: the TIME-BASED reminders the user configures in NotificationSettings.
//   - meal reminders : daily, repeating, at each configured HH:MM
//   - water reminders: daily, repeating, every N hours across waking hours
//
// Event-driven alerts (high-GL spike, fasting complete, weekly report) are NOT
// scheduled here — those fire from their own app events and are a separate hook.
//
// Why this exists: previously push-notifications.ts#scheduleMealReminder was an
// empty stub, so the reminder times the user set in Settings did nothing. This
// module makes those settings actually schedule device notifications.

import { Capacitor } from "@capacitor/core";

export interface ReminderSettings {
  mealReminder: boolean;
  mealReminderTimes: string[]; // ["08:00", "13:00", ...]
  waterReminder: boolean;
  waterReminderInterval: number; // hours
}

// Stable, partitioned ID ranges so each category can be cancelled/replaced
// without disturbing the others (or any unrelated notifications).
const MEAL_ID_BASE = 1000; // 1000..1099
const WATER_ID_BASE = 2000; // 2000..2099
const WATER_START_HOUR = 9; // first water ping of the day
const WATER_END_HOUR = 22; // last water ping of the day

function isOurId(id: number): boolean {
  return (id >= MEAL_ID_BASE && id < MEAL_ID_BASE + 100) ||
         (id >= WATER_ID_BASE && id < WATER_ID_BASE + 100);
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

// Cancel every reminder THIS module manages, then re-schedule from the current
// settings. Idempotent: call it whenever settings change (or on app start) and
// the device's pending notifications will always match the UI exactly — no
// duplicates, no stale times.
export async function syncReminders(s: ReminderSettings): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // 1. Clear our previously-scheduled reminders (leave others untouched).
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter(n => isOurId(n.id));
    if (ours.length) {
      await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) });
    }

    const toSchedule: Array<{
      id: number; title: string; body: string;
      schedule: { on: { hour: number; minute: number }; allowWhileIdle: boolean };
    }> = [];

    // 2. Meal reminders — daily repeating at each configured time. Using an
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

    if (toSchedule.length) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("syncReminders error:", e);
  }
}

// Cancel everything this module scheduled (e.g. on full sign-out / disable).
export async function cancelAllReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter(n => isOurId(n.id));
    if (ours.length) {
      await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) });
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("cancelAllReminders error:", e);
  }
}
