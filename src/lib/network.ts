// GlucoLens Offline Mode
// Network durumunu izler, offline'da kullanıcıyı bilgilendirir
// Analiz geçmişi her zaman localStorage'dan erişilebilir

import { Capacitor } from '@capacitor/core';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

let currentStatus: NetworkStatus = 'unknown';
const listeners: ((status: NetworkStatus) => void)[] = [];

export async function initNetworkMonitor(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      currentStatus = status.connected ? 'online' : 'offline';
      Network.addListener('networkStatusChange', s => {
        currentStatus = s.connected ? 'online' : 'offline';
        listeners.forEach(fn => fn(currentStatus));
      });
    } else {
      currentStatus = navigator.onLine ? 'online' : 'offline';
      window.addEventListener('online', () => {
        currentStatus = 'online';
        listeners.forEach(fn => fn('online'));
      });
      window.addEventListener('offline', () => {
        currentStatus = 'offline';
        listeners.forEach(fn => fn('offline'));
      });
    }
  } catch (err) {
    console.error('Network monitor error:', err);
    currentStatus = 'online';
  }
}

export function getNetworkStatus(): NetworkStatus {
  return currentStatus;
}

export function isOnline(): boolean {
  return currentStatus !== 'offline';
}

export function onNetworkChange(fn: (status: NetworkStatus) => void): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx > -1) listeners.splice(idx, 1);
  };
}
