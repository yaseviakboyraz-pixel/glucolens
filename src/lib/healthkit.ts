// GlucoLens HealthKit Service
// iOS: Apple HealthKit — adım, kalori, egzersiz, kalp hızı
// Android: Google Health Connect

import { Capacitor } from '@capacitor/core';

export interface HealthData {
  steps: number;
  calories: number;
  activeMinutes: number;
  heartRate: number | null;
  distance_m: number;
  date: string;
}

async function getHealthNative(): Promise<HealthData | null> {
  try {
    const { Health } = await import('capacitor-health');

    await Health.requestHealthPermissions({
      permissions: ['READ_STEPS', 'READ_ACTIVE_CALORIES', 'READ_DISTANCE', 'READ_HEART_RATE', 'READ_WORKOUTS'],
    });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [stepsRes, calRes] = await Promise.all([
      Health.queryAggregated({ dataType: 'steps', startDate: startOfDay.toISOString(), endDate: now.toISOString(), bucket: 'day' }).catch(() => ({ buckets: [] })),
      Health.queryAggregated({ dataType: 'active-calories', startDate: startOfDay.toISOString(), endDate: now.toISOString(), bucket: 'day' }).catch(() => ({ buckets: [] })),
    ]);

    const steps = (stepsRes as {buckets?: {value?: number}[]}).buckets?.[0]?.value ?? 0;
    const calories = (calRes as {buckets?: {value?: number}[]}).buckets?.[0]?.value ?? 0;

    // GL reduction estimate: ~0.01 GL per step, ~0.005 GL per calorie
    return {
      steps: Math.round(steps),
      calories: Math.round(calories),
      activeMinutes: Math.round(steps / 100),
      heartRate: null,
      distance_m: 0,
      date: startOfDay.toISOString(),
    };
  } catch (err) {
    console.error('HealthKit error:', err);
    return null;
  }
}

export async function getTodayHealthData(): Promise<HealthData | null> {
  if (!Capacitor.isNativePlatform()) return null;
  return getHealthNative();
}

export function estimateGLReduction(healthData: HealthData): number {
  // ~0.01 GL reduction per 100 steps, ~0.02 per active minute
  const fromSteps = (healthData.steps / 100) * 0.01;
  const fromActivity = healthData.activeMinutes * 0.02;
  return parseFloat(Math.min(fromSteps + fromActivity, 25).toFixed(1));
}

export const isHealthAvailable = () => Capacitor.isNativePlatform();
