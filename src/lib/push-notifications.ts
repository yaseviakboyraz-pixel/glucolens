// GlucoLens Push Notifications
// iOS: APNs, Android: FCM

import { Capacitor } from '@capacitor/core';

export async function initPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', token => {
      localStorage.setItem('push_token', token.value);
    });

    PushNotifications.addListener('pushNotificationReceived', _notification => {
      // Handle foreground notification
    });

    PushNotifications.addListener('pushNotificationActionPerformed', _action => {
      // Handle notification tap
    });
  } catch (err) {
    console.error('Push init error:', err);
  }
}

/**
 * @deprecated Meal & water reminders are now scheduled by
 * src/lib/local-notifications.ts (syncReminders), driven by the user's saved
 * NotificationSettings. Kept as a thin bridge for any legacy caller: it reads
 * the saved settings and syncs the device's scheduled notifications.
 */
export async function scheduleMealReminder(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const raw = localStorage.getItem("glucolens_notif_settings");
    if (!raw) return;
    const { syncReminders } = await import("./local-notifications");
    await syncReminders(JSON.parse(raw));
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error("scheduleMealReminder bridge error:", err);
  }
}

export const isPushAvailable = () => Capacitor.isNativePlatform();
