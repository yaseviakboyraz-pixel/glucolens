// GlucoLens Storage v2.0
// Hybrid: localStorage (instant) + Supabase (cloud sync)

import { supabase, getDeviceId } from "./supabase";
import type { MealAnalysis } from "./claude-vision";

export interface UserProfile {
  name: string;
  userType: "healthy" | "pre_diabetic" | "diabetic";
  age?: number;
  weightKg?: number;
  heightCm?: number;
  dailyGLTarget: number;
  setupComplete: boolean;
}

export interface MealRecord {
  id: string;
  analysis: MealAnalysis;
  timestamp: number;
  mealType?: string;
}

export interface WaterLog {
  id: string;
  amount_ml: number;
  timestamp: number;
}

export interface ActivityLog {
  id: string;
  activity_type: string;
  duration_minutes: number;
  gl_reduction: number;
  timestamp: number;
}

// ── PROFILE ───────────────────────────────────────

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("glucolens_profile");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("glucolens_profile", JSON.stringify(profile));
  // Sync to Supabase
  syncProfileToCloud(profile).catch(console.error);
}

async function syncProfileToCloud(profile: UserProfile) {
  const deviceId = getDeviceId();
  await supabase.from("profiles").upsert({
    device_id: deviceId,
    name: profile.name,
    user_type: profile.userType,
    age: profile.age,
    weight_kg: profile.weightKg,
    height_cm: profile.heightCm,
    daily_gl_target: profile.dailyGLTarget,
    setup_complete: profile.setupComplete,
    updated_at: new Date().toISOString(),
  }, { onConflict: "device_id" });
}

// ── MEALS ─────────────────────────────────────────

export function getMeals(): MealRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("glucolens_meals");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveMeal(analysis: MealAnalysis, mealType = "other"): MealRecord {
  const record: MealRecord = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    analysis,
    timestamp: Date.now(),
    mealType,
  };

  // localStorage
  const meals = getMeals();
  meals.unshift(record);
  if (meals.length > 100) meals.splice(100);
  localStorage.setItem("glucolens_meals", JSON.stringify(meals));

  // Supabase sync (non-blocking)
  syncMealToCloud(record).catch(console.error);

  return record;
}

async function syncMealToCloud(record: MealRecord) {
  const deviceId = getDeviceId();

  // Ensure profile exists
  await supabase.from("profiles").upsert({
    device_id: deviceId,
    setup_complete: false,
    daily_gl_target: 60,
    user_type: "healthy",
  }, { onConflict: "device_id", ignoreDuplicates: true });

  await supabase.from("meals").insert({
    device_id: deviceId,
    food_items: record.analysis.food_items,
    total_sugar_g: record.analysis.total_sugar_g,
    total_added_sugar_g: record.analysis.total_added_sugar_g,
    total_net_carb_g: record.analysis.total_net_carb_g,
    total_fiber_g: record.analysis.total_fiber_g,
    avg_glycemic_index: record.analysis.avg_glycemic_index,
    total_glycemic_load: record.analysis.total_glycemic_load,
    glucose_risk: record.analysis.glucose_risk,
    glucose_curve: record.analysis.glucose_curve,
    timing_actions: record.analysis.timing_actions,
    recommendations: record.analysis.recommendations,
    warnings: record.analysis.warnings,
    confidence_score: record.analysis.confidence_score,
    meal_type: record.mealType,
    logged_at: new Date(record.timestamp).toISOString(),
  });
}

export function deleteMeal(id: string): void {
  const meals = getMeals().filter(m => m.id !== id);
  localStorage.setItem("glucolens_meals", JSON.stringify(meals));
}

export function clearMeals(): void {
  localStorage.removeItem("glucolens_meals");
}

// ── CLOUD SYNC — Pull from Supabase ──────────────

export async function syncFromCloud(): Promise<{
  meals: MealRecord[];
  profile: UserProfile | null;
}> {
  const deviceId = getDeviceId();

  try {
    const [profileRes, mealsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("device_id", deviceId).single(),
      supabase.from("meals").select("*").eq("device_id", deviceId)
        .order("logged_at", { ascending: false }).limit(100),
    ]);

    let profile: UserProfile | null = null;
    if (profileRes.data) {
      profile = {
        name: profileRes.data.name || "",
        userType: profileRes.data.user_type || "healthy",
        age: profileRes.data.age,
        weightKg: profileRes.data.weight_kg,
        heightCm: profileRes.data.height_cm,
        dailyGLTarget: profileRes.data.daily_gl_target || 60,
        setupComplete: profileRes.data.setup_complete || false,
      };
      localStorage.setItem("glucolens_profile", JSON.stringify(profile));
    }

    let meals: MealRecord[] = [];
    if (mealsRes.data && mealsRes.data.length > 0) {
      meals = mealsRes.data.map(m => ({
        id: m.id,
        timestamp: new Date(m.logged_at).getTime(),
        mealType: m.meal_type,
        analysis: {
          food_items: m.food_items || [],
          total_sugar_g: m.total_sugar_g || 0,
          total_added_sugar_g: m.total_added_sugar_g || 0,
          total_net_carb_g: m.total_net_carb_g || 0,
          total_fiber_g: m.total_fiber_g || 0,
          avg_glycemic_index: m.avg_glycemic_index || 0,
          total_glycemic_load: m.total_glycemic_load || 0,
          glucose_risk: m.glucose_risk || "low",
          glucose_curve: m.glucose_curve,
          timing_actions: m.timing_actions,
          recommendations: m.recommendations || [],
          warnings: m.warnings || [],
          confidence_score: m.confidence_score || 0,
          glucose_peak_estimate: "",
          glucose_curve_description: "",
        },
      }));
      localStorage.setItem("glucolens_meals", JSON.stringify(meals));
    }

    return { meals, profile };
  } catch (err) {
    console.error("Cloud sync failed, using local data:", err);
    return { meals: getMeals(), profile: getProfile() };
  }
}

// ── WATER ─────────────────────────────────────────

export function getWaterLogs(): WaterLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("glucolens_water");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function logWater(amount_ml: number): void {
  const log: WaterLog = {
    id: Math.random().toString(36).slice(2),
    amount_ml,
    timestamp: Date.now(),
  };
  const logs = getWaterLogs();
  logs.unshift(log);
  localStorage.setItem("glucolens_water", JSON.stringify(logs));

  // Supabase sync
  const deviceId = getDeviceId();
  supabase.from("water_logs").insert({
    device_id: deviceId,
    amount_ml,
    logged_at: new Date().toISOString(),
  }).catch(console.error);
}

export function getTodayWater(): number {
  const today = new Date().toDateString();
  return getWaterLogs()
    .filter(l => new Date(l.timestamp).toDateString() === today)
    .reduce((s, l) => s + l.amount_ml, 0);
}

// ── ACTIVITY ──────────────────────────────────────

// ── ACTIVITY ──────────────────────────────────────

export const ACTIVITY_GL_REDUCTION: Record<string, number> = {
  walking: 0.5,
  running: 1.2,
  cycling: 0.9,
  swimming: 1.0,
  gym: 0.8,
  other: 0.6,
};

export interface ActivityRecord {
  id: string;
  type: "walking" | "running" | "cycling" | "swimming" | "gym" | "other";
  durationMin: number;
  glReduction: number;
  timestamp: string;
}

export function getActivities(): ActivityRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("glucolens_activity");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function logActivity(type: ActivityRecord["type"], durationMin: number): void {
  const glReduction = parseFloat(((ACTIVITY_GL_REDUCTION[type] || 0.6) * durationMin / 30).toFixed(1));
  const record: ActivityRecord = {
    id: Math.random().toString(36).slice(2),
    type,
    durationMin,
    glReduction,
    timestamp: new Date().toISOString(),
  };
  const logs = getActivities();
  logs.unshift(record);
  localStorage.setItem("glucolens_activity", JSON.stringify(logs));

  const deviceId = getDeviceId();
  supabase.from("activity_logs").insert({
    device_id: deviceId,
    activity_type: type,
    duration_minutes: durationMin,
    gl_reduction: glReduction,
    logged_at: new Date().toISOString(),
  }).catch(console.error);
}

export function deleteActivity(id: string): void {
  const logs = getActivities().filter(a => a.id !== id);
  localStorage.setItem("glucolens_activity", JSON.stringify(logs));
}

export function getTodayActivityGL(): number {
  const today = new Date().toISOString().slice(0, 10);
  return parseFloat(
    getActivities()
      .filter(a => a.timestamp.slice(0, 10) === today)
      .reduce((s, a) => s + a.glReduction, 0)
      .toFixed(1)
  );
}

export function getActivityLogs(): ActivityLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("glucolens_activity");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function logActivity(
  activity_type: string,
  duration_minutes: number,
  gl_reduction: number
): void {
  const log: ActivityLog = {
    id: Math.random().toString(36).slice(2),
    activity_type,
    duration_minutes,
    gl_reduction,
    timestamp: Date.now(),
  };
  const logs = getActivityLogs();
  logs.unshift(log);
  localStorage.setItem("glucolens_activity", JSON.stringify(logs));

  // Supabase sync
  const deviceId = getDeviceId();
  supabase.from("activity_logs").insert({
    device_id: deviceId,
    activity_type,
    duration_minutes,
    gl_reduction,
    logged_at: new Date().toISOString(),
  }).catch(console.error);
}

// ── STATS ─────────────────────────────────────────

export function getStats() {
  const meals = getMeals();
  if (meals.length === 0) return null;

  const today = new Date().toDateString();
  const todayMeals = meals.filter(m => new Date(m.timestamp).toDateString() === today);
  const avgGL = meals.slice(0, 30).reduce((s, m) => s + m.analysis.total_glycemic_load, 0) / Math.min(meals.length, 30);

  // Streak calculation
  let streak = 0;
  const days = new Set(meals.map(m => new Date(m.timestamp).toDateString()));
  const checkDate = new Date();
  while (days.has(checkDate.toDateString())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return {
    totalMeals: meals.length,
    todayGL: todayMeals.reduce((s, m) => s + m.analysis.total_glycemic_load, 0),
    avgGL: parseFloat(avgGL.toFixed(1)),
    streak,
    todayMeals: todayMeals.length,
  };
}
