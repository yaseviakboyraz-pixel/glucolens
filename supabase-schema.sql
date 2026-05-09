-- GlucoLens Supabase Schema v2.0
-- Updated: May 2026
-- Run this in Supabase SQL Editor (fresh install only)
-- For existing installs, use the migration SQL instead

-- ── PROFILES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT,
  name TEXT,
  user_type TEXT DEFAULT 'healthy' CHECK (user_type IN ('healthy', 'pre_diabetic', 'diabetic')),
  age INTEGER,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  daily_gl_target INTEGER DEFAULT 60,
  setup_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(device_id)
);

-- ── MEALS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT,
  food_items JSONB NOT NULL DEFAULT '[]',
  total_sugar_g NUMERIC DEFAULT 0,
  total_added_sugar_g NUMERIC DEFAULT 0,
  total_net_carb_g NUMERIC DEFAULT 0,
  total_fiber_g NUMERIC DEFAULT 0,
  total_protein_g NUMERIC DEFAULT 0,
  total_fat_g NUMERIC DEFAULT 0,
  total_calories NUMERIC DEFAULT 0,
  avg_glycemic_index NUMERIC DEFAULT 0,
  total_glycemic_load NUMERIC DEFAULT 0,
  glucose_risk TEXT DEFAULT 'low' CHECK (glucose_risk IN ('low', 'medium', 'high')),
  glucose_curve JSONB,
  timing_actions JSONB,
  recommendations JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  confidence_score NUMERIC DEFAULT 0,
  meal_type TEXT DEFAULT 'other' CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'drink', 'other')),
  photo_url TEXT,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── WATER LOGS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ACTIVITY LOGS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT,
  activity_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  gl_reduction NUMERIC DEFAULT 0,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_device_id ON meals(device_id);
CREATE INDEX IF NOT EXISTS idx_meals_logged_at ON meals(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_water_user_id ON water_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_logs(user_id);

-- ── ROW LEVEL SECURITY ────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users see only their own data
-- Anonymous (device_id) users see only null user_id rows
CREATE POLICY "own_profile" ON profiles FOR ALL USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL AND user_id IS NULL)
);
CREATE POLICY "own_meals" ON meals FOR ALL USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL AND user_id IS NULL)
);
CREATE POLICY "own_water" ON water_logs FOR ALL USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL AND user_id IS NULL)
);
CREATE POLICY "own_activity" ON activity_logs FOR ALL USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- ── STORAGE BUCKET ────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('meal-photos', 'meal-photos', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "upload_own_photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'meal-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "view_own_photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'meal-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "delete_own_photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'meal-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
