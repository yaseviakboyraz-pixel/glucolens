-- GlucoLens Supabase Schema
-- Run this in Supabase SQL Editor

-- Users profile table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  name TEXT,
  user_type TEXT DEFAULT 'healthy' CHECK (user_type IN ('healthy', 'pre_diabetic', 'diabetic')),
  age INTEGER,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  daily_gl_target INTEGER DEFAULT 60,
  setup_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meals table
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  food_items JSONB NOT NULL DEFAULT '[]',
  total_sugar_g NUMERIC DEFAULT 0,
  total_added_sugar_g NUMERIC DEFAULT 0,
  total_net_carb_g NUMERIC DEFAULT 0,
  total_fiber_g NUMERIC DEFAULT 0,
  avg_glycemic_index NUMERIC DEFAULT 0,
  total_glycemic_load NUMERIC DEFAULT 0,
  glucose_risk TEXT DEFAULT 'low' CHECK (glucose_risk IN ('low', 'medium', 'high')),
  glucose_curve JSONB,
  timing_actions JSONB,
  recommendations JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  confidence_score NUMERIC DEFAULT 0,
  meal_type TEXT DEFAULT 'other' CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'drink', 'other')),
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Water tracking table
CREATE TABLE IF NOT EXISTS water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity tracking table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  gl_reduction NUMERIC DEFAULT 0,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meals_device_id ON meals(device_id);
CREATE INDEX IF NOT EXISTS idx_meals_logged_at ON meals(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_water_device_id ON water_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_activity_device_id ON activity_logs(device_id);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: device_id ile erişim
CREATE POLICY "profiles_device_access" ON profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "meals_device_access" ON meals
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "water_device_access" ON water_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "activity_device_access" ON activity_logs
  FOR ALL USING (true) WITH CHECK (true);
