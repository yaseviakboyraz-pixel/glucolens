// GlucoLens — Extended Storage Manager
import type { MealAnalysis } from "./claude-vision";

export type UserType = "healthy" | "pre_diabetic" | "diabetic";

export interface UserProfile {
  name?: string;
  userType: UserType;
  dailyGLTarget: number;
  dailyWaterTarget: number; // ml
  setupComplete: boolean;
  createdAt: string;
}

export interface MealRecord {
  id: string;
  timestamp: string;
  analysis: MealAnalysis;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  isPreMeal?: boolean; // pre-meal mode flag
}

export interface ActivityRecord {
  id: string;
  timestamp: string;
  type: "walking" | "running" | "cycling" | "swimming" | "gym" | "other";
  durationMin: number;
  glReduction: number; // estimated GL reduction
}

export interface WaterRecord {
  date: string; // YYYY-MM-DD
  totalMl: number;
  entries: { time: string; ml: number }[];
}

export interface DailyStats {
  date: string;
  totalGL: number;
  mealCount: number;
  avgGL: number;
  highRiskCount: number;
  waterMl: number;
  activityMin: number;
}

export interface GLInsight {
  type: "warning" | "success" | "info";
  message: string;
}

const KEYS = {
  PROFILE: "glucolens_profile",
  MEALS: "glucolens_meals",
  WATER: "glucolens_water",
  ACTIVITY: "glucolens_activity",
};

const MAX_MEALS = 90;

// ─── GL Targets ───────────────────────────────────────────────────────────────

export function getGLTargets(userType: UserType) {
  switch (userType) {
    case "diabetic":     return { daily: 60, mealMax: 15 };
    case "pre_diabetic": return { daily: 80, mealMax: 18 };
    default:             return { daily: 100, mealMax: 25 };
  }
}

// Activity GL reduction estimates (per 30 min)
export const ACTIVITY_GL_REDUCTION: Record<ActivityRecord["type"], number> = {
  walking:  3,
  running:  8,
  cycling:  6,
  swimming: 7,
  gym:      5,
  other:    4,
};

// ─── User Profile ─────────────────────────────────────────────────────────────

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEYS.PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export function getDefaultProfile(): UserProfile {
  return {
    userType: "healthy",
    dailyGLTarget: 100,
    dailyWaterTarget: 2000,
    setupComplete: false,
    createdAt: new Date().toISOString(),
  };
}

// ─── Meal History ─────────────────────────────────────────────────────────────

export function getMeals(): MealRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.MEALS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveMeal(
  analysis: MealAnalysis,
  mealType?: MealRecord["mealType"],
  isPreMeal = false
): MealRecord {
  const meals = getMeals();
  const record: MealRecord = {
    id: `meal_${Date.now()}`,
    timestamp: new Date().toISOString(),
    analysis,
    mealType,
    isPreMeal,
  };
  const updated = [record, ...meals].slice(0, MAX_MEALS);
  localStorage.setItem(KEYS.MEALS, JSON.stringify(updated));
  return record;
}

export function deleteMeal(id: string): void {
  if (typeof window === "undefined") return;
  const meals = getMeals().filter((m) => m.id !== id);
  localStorage.setItem(KEYS.MEALS, JSON.stringify(meals));
}

// ─── Water Tracking ───────────────────────────────────────────────────────────

export function getTodayWater(): WaterRecord {
  if (typeof window === "undefined") return { date: "", totalMl: 0, entries: [] };
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(KEYS.WATER);
    const all: WaterRecord[] = raw ? JSON.parse(raw) : [];
    return all.find((w) => w.date === today) || { date: today, totalMl: 0, entries: [] };
  } catch { return { date: today, totalMl: 0, entries: [] }; }
}

export function addWater(ml: number): WaterRecord {
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem(KEYS.WATER);
  const all: WaterRecord[] = raw ? JSON.parse(raw) : [];
  const idx = all.findIndex((w) => w.date === today);
  const entry = { time: new Date().toISOString(), ml };
  if (idx >= 0) {
    all[idx].totalMl += ml;
    all[idx].entries.push(entry);
  } else {
    all.unshift({ date: today, totalMl: ml, entries: [entry] });
  }
  // Keep last 30 days
  const trimmed = all.slice(0, 30);
  localStorage.setItem(KEYS.WATER, JSON.stringify(trimmed));
  return trimmed.find((w) => w.date === today)!;
}

export function removeWater(ml: number): WaterRecord {
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem(KEYS.WATER);
  const all: WaterRecord[] = raw ? JSON.parse(raw) : [];
  const idx = all.findIndex((w) => w.date === today);
  if (idx >= 0) {
    all[idx].totalMl = Math.max(0, all[idx].totalMl - ml);
    if (all[idx].entries.length > 0) all[idx].entries.pop();
    localStorage.setItem(KEYS.WATER, JSON.stringify(all));
    return all[idx];
  }
  return { date: today, totalMl: 0, entries: [] };
}

// ─── Activity Tracking ────────────────────────────────────────────────────────

export function getActivities(): ActivityRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.ACTIVITY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function logActivity(
  type: ActivityRecord["type"],
  durationMin: number
): ActivityRecord {
  const activities = getActivities();
  const glReduction = parseFloat(
    ((ACTIVITY_GL_REDUCTION[type] * durationMin) / 30).toFixed(1)
  );
  const record: ActivityRecord = {
    id: `act_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    durationMin,
    glReduction,
  };
  const updated = [record, ...activities].slice(0, 60);
  localStorage.setItem(KEYS.ACTIVITY, JSON.stringify(updated));
  return record;
}

export function deleteActivity(id: string): void {
  if (typeof window === "undefined") return;
  const acts = getActivities().filter((a) => a.id !== id);
  localStorage.setItem(KEYS.ACTIVITY, JSON.stringify(acts));
}

export function getTodayActivityGL(): number {
  const today = new Date().toISOString().slice(0, 10);
  const acts = getActivities().filter((a) => a.timestamp.slice(0, 10) === today);
  return parseFloat(acts.reduce((s, a) => s + a.glReduction, 0).toFixed(1));
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export function getTodayStats(): DailyStats {
  const meals = getMeals();
  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = meals.filter((m) => m.timestamp.slice(0, 10) === today && !m.isPreMeal);
  const totalGL = todayMeals.reduce((s, m) => s + m.analysis.total_glycemic_load, 0);
  const water = getTodayWater();
  const acts = getActivities().filter((a) => a.timestamp.slice(0, 10) === today);
  return {
    date: today,
    totalGL: parseFloat(totalGL.toFixed(1)),
    mealCount: todayMeals.length,
    avgGL: todayMeals.length > 0 ? parseFloat((totalGL / todayMeals.length).toFixed(1)) : 0,
    highRiskCount: todayMeals.filter((m) => m.analysis.glucose_risk === "high").length,
    waterMl: water.totalMl,
    activityMin: acts.reduce((s, a) => s + a.durationMin, 0),
  };
}

export function getLast7DaysStats(): DailyStats[] {
  const meals = getMeals();
  const result: DailyStats[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const dayMeals = meals.filter((m) => m.timestamp.slice(0, 10) === dateStr && !m.isPreMeal);
    const totalGL = dayMeals.reduce((s, m) => s + m.analysis.total_glycemic_load, 0);
    const acts = getActivities().filter((a) => a.timestamp.slice(0, 10) === dateStr);
    result.push({
      date: dateStr,
      totalGL: parseFloat(totalGL.toFixed(1)),
      mealCount: dayMeals.length,
      avgGL: dayMeals.length > 0 ? parseFloat((totalGL / dayMeals.length).toFixed(1)) : 0,
      highRiskCount: dayMeals.filter((m) => m.analysis.glucose_risk === "high").length,
      waterMl: 0,
      activityMin: acts.reduce((s, a) => s + a.durationMin, 0),
    });
  }
  return result;
}

export function getStreak(dailyGLTarget: number): number {
  const stats = getLast7DaysStats();
  let streak = 0;
  for (let i = stats.length - 1; i >= 0; i--) {
    const day = stats[i];
    if (day.mealCount === 0) break;
    if (day.totalGL <= dailyGLTarget) streak++;
    else break;
  }
  return streak;
}

export function getWeeklyAvgGL(): number {
  const stats = getLast7DaysStats();
  const activeDays = stats.filter((d) => d.mealCount > 0);
  if (activeDays.length === 0) return 0;
  const total = activeDays.reduce((s, d) => s + d.totalGL, 0);
  return parseFloat((total / activeDays.length).toFixed(1));
}

export function getRecentMeals(limit = 10): MealRecord[] {
  return getMeals().filter(m => !m.isPreMeal).slice(0, limit);
}

// ─── Weekly Report ─────────────────────────────────────────────────────────────

export interface WeeklyReport {
  weekStart: string;
  totalMeals: number;
  avgDailyGL: number;
  bestDay: { date: string; gl: number };
  worstDay: { date: string; gl: number };
  highRiskMeals: number;
  totalActivityMin: number;
  streak: number;
  topFoods: string[];
  improvement: number; // % vs previous week
}

export function getWeeklyReport(): WeeklyReport {
  const stats = getLast7DaysStats();
  const meals = getMeals().filter(m => !m.isPreMeal);
  const activeDays = stats.filter(d => d.mealCount > 0);

  const avgDailyGL = activeDays.length > 0
    ? parseFloat((activeDays.reduce((s, d) => s + d.totalGL, 0) / activeDays.length).toFixed(1))
    : 0;

  const sortedByGL = [...activeDays].sort((a, b) => a.totalGL - b.totalGL);
  const bestDay = sortedByGL[0] || { date: "", totalGL: 0 };
  const worstDay = sortedByGL[sortedByGL.length - 1] || { date: "", totalGL: 0 };

  // Top foods this week
  const weekStart = stats[0]?.date || "";
  const weekMeals = meals.filter(m => m.timestamp.slice(0, 10) >= weekStart);
  const foodCounts: Record<string, number> = {};
  weekMeals.forEach(m => {
    m.analysis.food_items.forEach(f => {
      const name = f.name_tr || f.name;
      foodCounts[name] = (foodCounts[name] || 0) + 1;
    });
  });
  const topFoods = Object.entries(foodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const profile = getProfile();
  const streak = profile ? getStreak(profile.dailyGLTarget) : 0;

  return {
    weekStart,
    totalMeals: weekMeals.length,
    avgDailyGL,
    bestDay: { date: bestDay.date, gl: bestDay.totalGL },
    worstDay: { date: worstDay.date, gl: worstDay.totalGL },
    highRiskMeals: weekMeals.filter(m => m.analysis.glucose_risk === "high").length,
    totalActivityMin: stats.reduce((s, d) => s + d.activityMin, 0),
    streak,
    topFoods,
    improvement: 0,
  };
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export function generateInsights(todayStats: DailyStats, profile: UserProfile): GLInsight[] {
  const insights: GLInsight[] = [];
  const targets = getGLTargets(profile.userType);

  if (todayStats.mealCount === 0) {
    insights.push({ type: "info", message: "No meals logged today. Analyze your first meal to start tracking." });
    return insights;
  }

  // GL insights
  if (todayStats.totalGL > targets.daily) {
    insights.push({
      type: "warning",
      message: `Today's GL (${todayStats.totalGL}) exceeds your daily target of ${targets.daily}. Try lighter meals.`,
    });
  } else {
    const remaining = targets.daily - todayStats.totalGL;
    insights.push({
      type: "success",
      message: `On track! ${remaining.toFixed(0)} GL remaining for today.`,
    });
  }

  // Activity insight
  if (todayStats.activityMin > 0) {
    const glReduced = getTodayActivityGL();
    insights.push({
      type: "success",
      message: `${todayStats.activityMin} min of activity today reduced your effective GL by ~${glReduced}.`,
    });
  }

  // Water insight
  if (todayStats.waterMl > 0 && todayStats.waterMl < (profile.dailyWaterTarget || 2000) * 0.5) {
    insights.push({
      type: "warning",
      message: `Only ${todayStats.waterMl}ml water today. Staying hydrated helps glucose metabolism.`,
    });
  }

  if (todayStats.highRiskCount >= 2) {
    insights.push({
      type: "warning",
      message: `${todayStats.highRiskCount} high-risk meals today. Try swapping one for a low-GI option.`,
    });
  }

  return insights;
}
