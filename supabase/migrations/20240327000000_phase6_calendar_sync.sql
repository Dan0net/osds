-- Phase 6: Calendar Sync Migration
-- Run in Supabase SQL Editor

-- ============================================================
-- 1. Fix day_of_week constraint (was 0-6, data is actually 1-7)
-- ============================================================

ALTER TABLE public.availability
  DROP CONSTRAINT IF EXISTS availability_day_of_week_check;

ALTER TABLE public.availability
  ADD CONSTRAINT availability_day_of_week_check CHECK (day_of_week BETWEEN 1 AND 7);

-- ============================================================
-- 2. Drop ical_url from walker_profiles (replaced by ical_imports table)
-- ============================================================

ALTER TABLE public.walker_profiles
  DROP COLUMN IF EXISTS ical_url;

-- ============================================================
-- 3. Backfill calendar_feed_token for existing walkers
-- ============================================================

UPDATE public.walker_profiles
SET calendar_feed_token = gen_random_uuid()::text
WHERE calendar_feed_token IS NULL;

-- ============================================================
-- 4. Create ical_imports table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ical_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  walker_id uuid NOT NULL REFERENCES public.walker_profiles(id) ON DELETE CASCADE,
  url text NOT NULL,
  label text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ical_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Walker can read own imports" ON public.ical_imports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.walker_profiles WHERE id = walker_id AND user_id = auth.uid())
  );

CREATE POLICY "Walker can insert imports" ON public.ical_imports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.walker_profiles WHERE id = walker_id AND user_id = auth.uid())
  );

CREATE POLICY "Walker can delete imports" ON public.ical_imports
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.walker_profiles WHERE id = walker_id AND user_id = auth.uid())
  );

-- ============================================================
-- 5. Create ical_cache table (service role only, no client RLS policies)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ical_cache (
  import_id uuid PRIMARY KEY REFERENCES public.ical_imports(id) ON DELETE CASCADE,
  events_json jsonb NOT NULL DEFAULT '[]',
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ical_cache ENABLE ROW LEVEL SECURITY;
