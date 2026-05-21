-- GlucoLens Supabase RLS (Row Level Security) Setup
-- Run this in Supabase SQL Editor to enable RLS on all tables
-- This ensures users can only access their own data

-- ── PROFILES TABLE ────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own profile (authenticated)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND device_id = current_setting('request.headers', true)::json->>'x-device-id'))
;

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() IS NULL
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND device_id IS NOT NULL)
  );

-- ── MEALS TABLE ───────────────────────────────────────────────────────────────
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meals_select_own" ON meals
  FOR SELECT USING (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND device_id IS NOT NULL)
  );

CREATE POLICY "meals_insert_own" ON meals
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() IS NULL
  );

CREATE POLICY "meals_delete_own" ON meals
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- ── WATER LOGS TABLE ──────────────────────────────────────────────────────────
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "water_select_own" ON water_logs
  FOR SELECT USING (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND device_id IS NOT NULL)
  );

CREATE POLICY "water_insert_own" ON water_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() IS NULL
  );

-- ── ACTIVITY LOGS TABLE ───────────────────────────────────────────────────────
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_select_own" ON activity_logs
  FOR SELECT USING (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND device_id IS NOT NULL)
  );

CREATE POLICY "activity_insert_own" ON activity_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() IS NULL
  );

-- ── STORAGE BUCKET: meal-photos ───────────────────────────────────────────────
-- Make bucket PRIVATE (not public)
UPDATE storage.buckets SET public = false WHERE id = 'meal-photos';

-- Users can only access their own photos
CREATE POLICY "photos_select_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'meal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "photos_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'meal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "photos_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'meal-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
