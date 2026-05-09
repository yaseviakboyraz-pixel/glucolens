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

export async function scheduleMealReminder(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  // Local notification via push — remind user to log meals
}

export const isPushAvailable = () => Capacitor.isNativePlatform();
