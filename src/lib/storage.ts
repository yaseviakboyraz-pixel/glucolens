// GlucoLens Storage v2.1
// Hybrid: localStorage (instant) + Supabase (cloud sync)
// Security: no console.error in production, localStorage quota monitoring

import { supabase, getDeviceId, getOwnerId, uploadMealPhoto } from "./supabase";
import type { MealAnalysis } from "./claude-vision";

// Dev-only logger
const devLog = process.env.NODE_ENV === "development"
  ? (msg: string, ...args: unknown[]) => console.error(msg, ...args)
  : () => {};

// Stable unique id — uses crypto.randomUUID in secure contexts, falling back to
// a timestamp+random scheme so it never throws in older runtimes.
function newId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* fall through */ }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── INTERFACES ────────────────────────────────────

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
  isPreMeal?: boolean;
  photo_base64?: string;
  photo_url?: string;
}

export interface WaterLog {
  id: string;
  amount_ml: number;
  timestamp: number;
}

// Alias for backwards compatibility
export type WaterRecord = WaterLog;

export interface ActivityLog {
  id: string;
  activity_type: string;
  duration_minutes: number;
  gl_reduction: number;
  timestamp: number;
}

export interface ActivityRecord {
  id: string;
  type: "walking" | "running" | "cycling" | "swimming" | "gym" | "other";
  durationMin: number;
  glReduction: number;
  timestamp: string;
}

export const ACTIVITY_GL_REDUCTION: Record<string, number> = {
  walking: 0.5,
  running: 1.2,
  cycling: 0.9,
  swimming: 1.0,
  gym: 0.8,
  other: 0.6,
};

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
  syncProfileToCloud(profile).catch(err => devLog("[storage] syncProfile failed", err));
}

async function syncProfileToCloud(profile: UserProfile) {
  const { userId, deviceId } = await getOwnerId();
  await supabase.from("profiles").upsert({
    ...(userId ? { user_id: userId } : { device_id: deviceId }),
    name: profile.name,
    user_type: profile.userType,
    age: profile.age,
    weight_kg: profile.weightKg,
    height_cm: profile.heightCm,
    daily_gl_target: profile.dailyGLTarget,
    setup_complete: profile.setupComplete,
    updated_at: new Date().toISOString(),
  }, { onConflict: userId ? "user_id" : "device_id" });
}

// ── MEALS ─────────────────────────────────────────

export function getMeals(): MealRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("glucolens_meals");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── localStorage quota monitor ───────────────────
function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // Quota exceeded — prune oldest meals
    devLog("[storage] localStorage quota exceeded, pruning", e);
    try {
      const meals = getMeals();
      if (meals.length > 20) {
        // Keep only last 20 meals
        localStorage.setItem("glucolens_meals", JSON.stringify(meals.slice(0, 20)));
        localStorage.setItem(key, value);
      }
    } catch {
      // Silent fail — cloud sync will handle it
    }
  }
}

export function saveMeal(analysis: MealAnalysis, mealType = "other", photo_base64?: string): MealRecord {
  const record: MealRecord = {
    id: newId(),
    analysis,
    timestamp: Date.now(),
    mealType,
    photo_base64,
  };
  const meals = getMeals();
  meals.unshift(record);
  if (meals.length > 100) meals.splice(100);
  // Store without photo in localStorage to save space
  safeLocalStorageSet("glucolens_meals", JSON.stringify(meals.map(m => ({ ...m, photo_base64: undefined }))));
  syncMealToCloud(record, photo_base64).catch(err => devLog("[storage] syncMeal failed", err));
  return record;
}

async function syncMealToCloud(record: MealRecord, photo_base64?: string) {
  const { userId, deviceId } = await getOwnerId();
  const isUser = !!userId;

  // Ensure profile exists
  await supabase.from("profiles").upsert({
    ...(isUser ? { user_id: userId } : { device_id: deviceId }),
    setup_complete: false,
    daily_gl_target: 60,
    user_type: "healthy",
  }, { onConflict: isUser ? "user_id" : "device_id", ignoreDuplicates: true });

  // Upload photo to Storage if authenticated
  let photo_url: string | null = null;
  if (photo_base64 && isUser) {
    photo_url = await uploadMealPhoto(photo_base64, record.id);
  }

  await supabase.from("meals").insert({
    ...(isUser ? { user_id: userId } : { device_id: deviceId }),
    food_items: record.analysis.food_items,
    total_sugar_g: record.analysis.total_sugar_g,
    total_added_sugar_g: record.analysis.total_added_sugar_g,
    total_net_carb_g: record.analysis.total_net_carb_g,
    total_fiber_g: record.analysis.total_fiber_g,
    total_protein_g: record.analysis.total_protein_g,
    total_fat_g: record.analysis.total_fat_g,
    total_calories: record.analysis.total_calories,
    avg_glycemic_index: record.analysis.avg_glycemic_index,
    total_glycemic_load: record.analysis.total_glycemic_load,
    glucose_risk: record.analysis.glucose_risk,
    glucose_curve: record.analysis.glucose_curve,
    timing_actions: record.analysis.timing_actions,
    recommendations: record.analysis.recommendations,
    warnings: record.analysis.warnings,
    confidence_score: record.analysis.confidence_score,
    meal_type: record.mealType,
    photo_url,
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

// ── CLOUD SYNC ────────────────────────────────────

export async function syncFromCloud(): Promise<{
  meals: MealRecord[];
  profile: UserProfile | null;
}> {
  const { userId, deviceId, isAuthenticated } = await getOwnerId();
  try {
    // Query by user_id if authenticated, else device_id
    const filter = isAuthenticated
      ? { column: "user_id", value: userId! }
      : { column: "device_id", value: deviceId };

    const [profileRes, mealsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq(filter.column, filter.value).single(),
      supabase.from("meals").select("*").eq(filter.column, filter.value)
        .order("logged_at", { ascending: false }).limit(200),
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
      const cloudMeals: MealRecord[] = mealsRes.data.map(m => ({
        id: m.id,
        timestamp: new Date(m.logged_at).getTime(),
        mealType: m.meal_type,
        photo_url: m.photo_url || undefined,
        analysis: {
          food_items: m.food_items || [],
          total_sugar_g: m.total_sugar_g || 0,
          total_added_sugar_g: m.total_added_sugar_g || 0,
          total_net_carb_g: m.total_net_carb_g || 0,
          total_fiber_g: m.total_fiber_g || 0,
          total_protein_g: m.total_protein_g || 0,
          total_fat_g: m.total_fat_g || 0,
          total_calories: m.total_calories || 0,
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

      // Merge: keep local meals not yet in the cloud (e.g. logged offline) so a
      // cloud pull never erases them. A synced meal shares an exact ms timestamp
      // with its cloud row, so timestamp identity is a reliable de-dup key.
      const cloudTs = new Set(cloudMeals.map(m => m.timestamp));
      const localUnsynced = getMeals().filter(m => !cloudTs.has(m.timestamp));

      // Retry: push those un-synced local meals up to the cloud. Idempotent — we
      // only push meals the cloud doesn't already have. Fire-and-forget; failures
      // stay local and get retried on the next sync.
      if (localUnsynced.length && typeof navigator !== "undefined" && navigator.onLine) {
        for (const m of localUnsynced) {
          syncMealToCloud(m, m.photo_base64).catch(e => devLog("[storage] offline meal retry failed", e));
        }
      }

      meals = [...localUnsynced, ...cloudMeals].sort((a, b) => b.timestamp - a.timestamp);
      localStorage.setItem("glucolens_meals", JSON.stringify(meals.map(m => ({ ...m, photo_base64: undefined }))));
    } else {
      // No cloud meals returned — preserve local data instead of returning empty.
      meals = getMeals();
    }
    return { meals, profile };
  } catch (err) {
    devLog("[storage] Cloud sync failed:", err);
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
    id: newId(),
    amount_ml,
    timestamp: Date.now(),
  };
  const logs = getWaterLogs();
  logs.unshift(log);
  localStorage.setItem("glucolens_water", JSON.stringify(logs));
  getOwnerId().then(({ userId, deviceId }) => {
    supabase.from("water_logs").insert({
      ...(userId ? { user_id: userId } : { device_id: deviceId }),
      amount_ml,
      logged_at: new Date().toISOString(),
    }).then(null, err => devLog("[storage] water sync failed", err));
  });
}

// Aliases for water-tracker.tsx compatibility
export function addWater(amount_ml: number): void {
  logWater(amount_ml);
}

export function removeWater(id: string): void {
  const logs = getWaterLogs().filter(l => l.id !== id);
  localStorage.setItem("glucolens_water", JSON.stringify(logs));
}

export function getTodayWater(): number {
  const today = new Date().toDateString();
  return getWaterLogs()
    .filter(l => new Date(l.timestamp).toDateString() === today)
    .reduce((s, l) => s + l.amount_ml, 0);
}

// ── ACTIVITY ─────────────────────────────────────

export function getActivities(): ActivityRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("glucolens_activity");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getActivityLogs(): ActivityLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("glucolens_activity");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// Main logActivity — supports both old (type, durationMin) and new (type, duration_minutes, gl_reduction) signatures
export function logActivity(
  type: ActivityRecord["type"],
  durationMin: number,
  gl_reduction?: number
): void {
  const glReduction = gl_reduction ?? parseFloat(
    ((ACTIVITY_GL_REDUCTION[type] || 0.6) * durationMin / 30).toFixed(1)
  );
  const record: ActivityRecord = {
    id: newId(),
    type,
    durationMin,
    glReduction,
    timestamp: new Date().toISOString(),
  };
  const logs = getActivities();
  logs.unshift(record);
  localStorage.setItem("glucolens_activity", JSON.stringify(logs));
  getOwnerId().then(({ userId, deviceId }) => {
    supabase.from("activity_logs").insert({
      ...(userId ? { user_id: userId } : { device_id: deviceId }),
      activity_type: type,
      duration_minutes: durationMin,
      gl_reduction: glReduction,
      logged_at: new Date().toISOString(),
    }).then(null, err => devLog("[storage] activity sync failed", err));
  });
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

// ── STATS ─────────────────────────────────────────

export type UserType = "healthy" | "pre_diabetic" | "diabetic";

export function getDefaultProfile(): UserProfile {
  return {
    name: "",
    userType: "healthy",
    dailyGLTarget: 60,
    setupComplete: false,
  };
}

export function getGLTargets(userType: UserType) {
  const targets = {
    healthy:      { daily: 60, meal: 20, snack: 8 },
    pre_diabetic: { daily: 45, meal: 15, snack: 6 },
    diabetic:     { daily: 35, meal: 12, snack: 5 },
  };
  return targets[userType] || targets.healthy;
}

export function getTodayStats() {
  const meals = getMeals();
  const today = new Date().toDateString();
  const todayMeals = meals.filter(m => new Date(m.timestamp).toDateString() === today);
  return {
    totalGL: parseFloat(todayMeals.reduce((s, m) => s + m.analysis.total_glycemic_load, 0).toFixed(1)),
    mealCount: todayMeals.length,
    avgGL: todayMeals.length
      ? parseFloat((todayMeals.reduce((s, m) => s + m.analysis.total_glycemic_load, 0) / todayMeals.length).toFixed(1))
      : 0,
  };
}

export function getStreak(): number {
  const meals = getMeals();
  if (meals.length === 0) return 0;
  let streak = 0;
  const days = new Set(meals.map(m => new Date(m.timestamp).toDateString()));
  const checkDate = new Date();
  while (days.has(checkDate.toDateString())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

export function getWeeklyAvgGL(): number {
  const meals = getMeals();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekMeals = meals.filter(m => m.timestamp > weekAgo);
  if (weekMeals.length === 0) return 0;
  return parseFloat(
    (weekMeals.reduce((s, m) => s + m.analysis.total_glycemic_load, 0) / weekMeals.length).toFixed(1)
  );
}

export function generateInsights(meals: MealRecord[], userType: UserType): string[] {
  const insights: string[] = [];
  if (meals.length === 0) return ["Start logging meals to get personalized insights!"];

  const avgGL = meals.slice(0, 14).reduce((s, m) => s + m.analysis.total_glycemic_load, 0) / Math.min(meals.length, 14);
  const targets = getGLTargets(userType);

  if (avgGL < targets.meal * 0.7)
    insights.push("🌟 Excellent! Your average GL is well within target range.");
  else if (avgGL < targets.meal)
    insights.push("✅ Good job! Your GL levels are on track.");
  else
    insights.push("⚠️ Your average GL is above target. Consider more vegetables and lean proteins.");

  const highRiskMeals = meals.filter(m => m.analysis.glucose_risk === "high").length;
  if (highRiskMeals > 3)
    insights.push(`🔴 You had ${highRiskMeals} high-risk meals recently. Try swapping refined carbs for whole grains.`);

  const streak = getStreak();
  if (streak >= 7) insights.push(`🔥 Amazing ${streak}-day streak! Consistency is key to better glucose control.`);
  else if (streak >= 3) insights.push(`📈 ${streak}-day logging streak! Keep it up.`);

  const todayWater = getTodayWater();
  if (todayWater < 1500) insights.push("💧 Try to drink at least 2L of water today — it helps regulate blood sugar.");

  return insights.slice(0, 4);
}

// ── CHART & REPORT HELPERS ─────────────────────────

export interface DailyStats {
  date: string;
  dayLabel: string;
  totalGL: number;
  mealCount: number;
  avgGL: number;
}

export function getLast7DaysStats(): DailyStats[] {
  const meals = getMeals();
  const days: DailyStats[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const dayMeals = meals.filter(m => new Date(m.timestamp).toDateString() === dateStr);
    const totalGL = parseFloat(dayMeals.reduce((s, m) => s + m.analysis.total_glycemic_load, 0).toFixed(1));
    days.push({
      date: dateStr,
      dayLabel: dayNames[d.getDay()],
      totalGL,
      mealCount: dayMeals.length,
      avgGL: dayMeals.length ? parseFloat((totalGL / dayMeals.length).toFixed(1)) : 0,
    });
  }
  return days;
}

export function getWeeklyReport() {
  const meals = getMeals();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekMeals = meals.filter(m => m.timestamp > weekAgo);
  if (weekMeals.length === 0) return null;

  const totalGL = weekMeals.reduce((s, m) => s + m.analysis.total_glycemic_load, 0);
  const avgGL = parseFloat((totalGL / weekMeals.length).toFixed(1));
  const highRisk = weekMeals.filter(m => m.analysis.glucose_risk === "high").length;

  const byDay = getLast7DaysStats();
  const daysWithMeals = byDay.filter(d => d.mealCount > 0);
  const bestDay = daysWithMeals.length
    ? daysWithMeals.reduce((a, b) => a.totalGL < b.totalGL ? a : b)
    : byDay[0];
  const worstDay = daysWithMeals.length
    ? daysWithMeals.reduce((a, b) => a.totalGL > b.totalGL ? a : b)
    : byDay[byDay.length - 1];

  // Top foods
  const foodCounts: Record<string, number> = {};
  weekMeals.forEach(m => {
    m.analysis.food_items?.forEach(f => {
      const name = f.name_tr || f.name;
      foodCounts[name] = (foodCounts[name] || 0) + 1;
    });
  });
  const topFoods = Object.entries(foodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // Activity
  const activities = getActivities();
  const weekActivities = activities.filter(a => new Date(a.timestamp).getTime() > weekAgo);
  const totalActivityMin = weekActivities.reduce((s, a) => s + a.durationMin, 0);

  return {
    totalMeals: weekMeals.length,
    avgGL,
    avgDailyGL: avgGL,
    totalGL: parseFloat(totalGL.toFixed(1)),
    highRiskMeals: highRisk,
    lowRiskMeals: weekMeals.filter(m => m.analysis.glucose_risk === "low").length,
    bestDay: { date: bestDay.date, dayLabel: bestDay.dayLabel, gl: bestDay.totalGL },
    worstDay: { date: worstDay.date, dayLabel: worstDay.dayLabel, gl: worstDay.totalGL },
    streak: getStreak(),
    topFoods,
    totalActivityMin,
  };
}

export type WeeklyReport = NonNullable<ReturnType<typeof getWeeklyReport>>;

export interface SleepLog {
  id: string;
  hours: number;
  quality: "poor" | "fair" | "good" | "excellent";
  bedtime?: string;  // HH:MM
  wakeTime?: string; // HH:MM
  timestamp: number;
}

export function getSleepLogs(): SleepLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("glucolens_sleep");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function logSleep(hours: number, quality: SleepLog["quality"], bedtime?: string, wakeTime?: string): void {
  const log: SleepLog = {
    id: newId(),
    hours, quality, bedtime, wakeTime,
    timestamp: Date.now(),
  };
  const logs = getSleepLogs();
  logs.unshift(log);
  if (logs.length > 90) logs.splice(90);
  localStorage.setItem("glucolens_sleep", JSON.stringify(logs));
}

export function getTodaySleep(): SleepLog | null {
  const today = new Date().toDateString();
  return getSleepLogs().find(l => new Date(l.timestamp).toDateString() === today) ?? null;
}

export function getAvgSleepHours(days = 7): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const logs = getSleepLogs().filter(l => l.timestamp > cutoff);
  if (!logs.length) return 0;
  return parseFloat((logs.reduce((s, l) => s + l.hours, 0) / logs.length).toFixed(1));
}

export function deleteSleepLog(id: string): void {
  if (typeof window === "undefined") return;
  const logs = getSleepLogs().filter(l => l.id !== id);
  localStorage.setItem("glucolens_sleep", JSON.stringify(logs));
}

// ── FASTING TRACKING ──────────────────────────────

export interface FastingSession {
  id: string;
  startTime: number;  // unix ms
  endTime?: number;   // unix ms — undefined if active
  targetHours: number;
  protocol: "16:8" | "18:6" | "20:4" | "5:2" | "OMAD" | "custom";
}

export function getFastingSessions(): FastingSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("glucolens_fasting");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function startFasting(targetHours: number, protocol: FastingSession["protocol"] = "16:8"): FastingSession {
  // End any active session first
  stopFasting();
  const session: FastingSession = {
    id: newId(),
    startTime: Date.now(),
    targetHours, protocol,
  };
  const sessions = getFastingSessions();
  sessions.unshift(session);
  if (sessions.length > 90) sessions.splice(90);
  localStorage.setItem("glucolens_fasting", JSON.stringify(sessions));
  return session;
}

export function stopFasting(): void {
  const sessions = getFastingSessions();
  const active = sessions.find(s => !s.endTime);
  if (active) {
    active.endTime = Date.now();
    localStorage.setItem("glucolens_fasting", JSON.stringify(sessions));
  }
}

export function getActiveFasting(): FastingSession | null {
  return getFastingSessions().find(s => !s.endTime) ?? null;
}

export function getFastingElapsedHours(): number {
  const active = getActiveFasting();
  if (!active) return 0;
  return parseFloat(((Date.now() - active.startTime) / 3_600_000).toFixed(1));
}

export function deleteFastingSession(id: string): void {
  if (typeof window === "undefined") return;
  const sessions = getFastingSessions().filter(s => s.id !== id);
  localStorage.setItem("glucolens_fasting", JSON.stringify(sessions));
}

// ── HOMA-IR CALCULATOR ────────────────────────────

export interface HomaIRRecord {
  id: string;
  fastingGlucose_mgdl: number;
  fastingInsulin_uIUml: number;
  homaIR: number;
  interpretation: "normal" | "borderline" | "insulin_resistant";
  timestamp: number;
}

export function calculateHomaIR(fastingGlucose_mgdl: number, fastingInsulin_uIUml: number): HomaIRRecord {
  const homaIR = parseFloat(((fastingGlucose_mgdl * fastingInsulin_uIUml) / 405).toFixed(2));
  const interpretation: HomaIRRecord["interpretation"] =
    homaIR < 1.9 ? "normal" : homaIR < 2.9 ? "borderline" : "insulin_resistant";
  const record: HomaIRRecord = {
    id: newId(),
    fastingGlucose_mgdl, fastingInsulin_uIUml,
    homaIR, interpretation,
    timestamp: Date.now(),
  };
  const records = getHomaIRHistory();
  records.unshift(record);
  if (records.length > 20) records.splice(20);
  localStorage.setItem("glucolens_homa", JSON.stringify(records));
  return record;
}

export function getHomaIRHistory(): HomaIRRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("glucolens_homa");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function deleteHomaIRRecord(id: string): void {
  if (typeof window === "undefined") return;
  const records = getHomaIRHistory().filter(r => r.id !== id);
  localStorage.setItem("glucolens_homa", JSON.stringify(records));
}

// ── MONTHLY STATS ─────────────────────────────────

export function getLast30DaysStats(): DailyStats[] {
  const meals = getMeals();
  const days: DailyStats[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const dayMeals = meals.filter(m => new Date(m.timestamp).toDateString() === dateStr);
    const totalGL = parseFloat(dayMeals.reduce((s, m) => s + m.analysis.total_glycemic_load, 0).toFixed(1));
    days.push({
      date: dateStr,
      dayLabel: dayNames[d.getDay()],
      totalGL,
      mealCount: dayMeals.length,
      avgGL: dayMeals.length ? parseFloat((totalGL / dayMeals.length).toFixed(1)) : 0,
    });
  }
  return days;
}
