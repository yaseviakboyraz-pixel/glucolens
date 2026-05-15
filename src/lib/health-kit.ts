// GlucoLens Health Kit Integration
// Apple Health (HealthKit) on iOS via Capacitor
// Google Fit (Health Connect) on Android via Capacitor

import { Capacitor } from "@capacitor/core";

export interface HealthSample {
  type: "sleep" | "steps" | "weight" | "heartRate" | "bloodGlucose";
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
  source?: string;
}

export interface HealthSleepSample {
  hours: number;
  quality: "poor" | "fair" | "good" | "excellent";
  startDate: string;
  endDate: string;
}

// ── Permission check ──────────────────────────────

export async function requestHealthPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Web fallback — simulate granted for development
    localStorage.setItem("glucolens_health_permitted", "true");
    return true;
  }
  try {
    // capacitor-health plugin (already in package.json)
    const { CapacitorHealthkit } = await import("capacitor-health" as never) as { CapacitorHealthkit: { requestAuthorization: (opts: object) => Promise<void> } };
    await CapacitorHealthkit.requestAuthorization({
      all: [],
      read: ["HKQuantityTypeIdentifierStepCount",
             "HKCategoryTypeIdentifierSleepAnalysis",
             "HKQuantityTypeIdentifierBodyMass",
             "HKQuantityTypeIdentifierHeartRate",
             "HKQuantityTypeIdentifierBloodGlucose"],
      write: [],
    });
    localStorage.setItem("glucolens_health_permitted", "true");
    return true;
  } catch (err) {
    console.error("Health permission error:", err);
    return false;
  }
}

export function isHealthPermitted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("glucolens_health_permitted") === "true";
}

// ── Read sleep from Health ──────────────────────────

export async function readSleepFromHealth(days = 7): Promise<HealthSleepSample[]> {
  if (!Capacitor.isNativePlatform() || !isHealthPermitted()) return [];
  try {
    const { CapacitorHealthkit } = await import("capacitor-health" as never) as {
      CapacitorHealthkit: {
        querySampleType: (opts: object) => Promise<{ resultData: { startDate: string; endDate: string; value: number }[] }>;
      };
    };
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - days * 86_400_000).toISOString();

    const result = await CapacitorHealthkit.querySampleType({
      sampleName: "HKCategoryTypeIdentifierSleepAnalysis",
      startDate,
      endDate,
      limit: days * 3,
      ascending: false,
    });

    // Group by night and calculate total sleep hours
    const samples: HealthSleepSample[] = [];
    for (const r of result.resultData) {
      const hours = (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 3_600_000;
      if (hours > 0.5) {
        const quality: HealthSleepSample["quality"] =
          hours >= 8 ? "excellent" : hours >= 7 ? "good" : hours >= 5 ? "fair" : "poor";
        samples.push({ hours: parseFloat(hours.toFixed(1)), quality, startDate: r.startDate, endDate: r.endDate });
      }
    }
    return samples;
  } catch (err) {
    console.error("Read sleep error:", err);
    return [];
  }
}

// ── Read steps ────────────────────────────────────

export async function readStepsFromHealth(days = 7): Promise<{ date: string; steps: number }[]> {
  if (!Capacitor.isNativePlatform() || !isHealthPermitted()) return [];
  try {
    const { CapacitorHealthkit } = await import("capacitor-health" as never) as {
      CapacitorHealthkit: {
        querySampleType: (opts: object) => Promise<{ resultData: { startDate: string; value: number }[] }>;
      };
    };
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - days * 86_400_000).toISOString();

    const result = await CapacitorHealthkit.querySampleType({
      sampleName: "HKQuantityTypeIdentifierStepCount",
      startDate,
      endDate,
      limit: days * 10,
      ascending: false,
    });

    // Aggregate by day
    const byDay: Record<string, number> = {};
    for (const r of result.resultData) {
      const day = r.startDate.slice(0, 10);
      byDay[day] = (byDay[day] || 0) + r.value;
    }

    return Object.entries(byDay)
      .map(([date, steps]) => ({ date, steps: Math.round(steps) }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, days);
  } catch (err) {
    console.error("Read steps error:", err);
    return [];
  }
}

// ── Read weight ───────────────────────────────────

export async function readWeightFromHealth(): Promise<number | null> {
  if (!Capacitor.isNativePlatform() || !isHealthPermitted()) return null;
  try {
    const { CapacitorHealthkit } = await import("capacitor-health" as never) as {
      CapacitorHealthkit: {
        querySampleType: (opts: object) => Promise<{ resultData: { value: number }[] }>;
      };
    };
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const result = await CapacitorHealthkit.querySampleType({
      sampleName: "HKQuantityTypeIdentifierBodyMass",
      startDate, endDate,
      limit: 1,
      ascending: false,
    });

    if (result.resultData.length > 0) {
      return parseFloat(result.resultData[0].value.toFixed(1));
    }
    return null;
  } catch (err) {
    console.error("Read weight error:", err);
    return null;
  }
}

// ── Sync helper — pull everything & store locally ──

export async function syncHealthData(): Promise<{
  sleep: HealthSleepSample[];
  steps: { date: string; steps: number }[];
  weight: number | null;
}> {
  const [sleep, steps, weight] = await Promise.all([
    readSleepFromHealth(7),
    readStepsFromHealth(7),
    readWeightFromHealth(),
  ]);

  // Auto-save sleep to our sleep log if not already logged today
  if (sleep.length > 0) {
    const { logSleep, getTodaySleep } = await import("./storage");
    if (!getTodaySleep()) {
      const latest = sleep[0];
      logSleep(latest.hours, latest.quality,
        latest.startDate.slice(11, 16),
        latest.endDate.slice(11, 16));
    }
  }

  localStorage.setItem("glucolens_health_sync", JSON.stringify({
    sleep, steps, weight,
    syncedAt: new Date().toISOString(),
  }));

  return { sleep, steps, weight };
}

export function getLastHealthSync(): {
  sleep: HealthSleepSample[];
  steps: { date: string; steps: number }[];
  weight: number | null;
  syncedAt?: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("glucolens_health_sync");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const isHealthAvailable = () =>
  Capacitor.isNativePlatform() ||
  (typeof window !== "undefined" && !!localStorage.getItem("glucolens_health_permitted"));
