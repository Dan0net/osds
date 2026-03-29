-- Phase 8 Migration: User Journey Improvements
-- Adds location fields for walker search/discovery and service descriptions

-- walker_profiles: cover photo + postcode + coordinates for proximity search
ALTER TABLE walker_profiles ADD COLUMN IF NOT EXISTS cover_url text DEFAULT NULL;
ALTER TABLE walker_profiles ADD COLUMN IF NOT EXISTS postcode text DEFAULT NULL;
ALTER TABLE walker_profiles ADD COLUMN IF NOT EXISTS lat float8 DEFAULT NULL;
ALTER TABLE walker_profiles ADD COLUMN IF NOT EXISTS lng float8 DEFAULT NULL;

-- services: description field for walker public pages
ALTER TABLE services ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Allow anyone to read user name for review authors (public testimonials)
DO $$ BEGIN
  CREATE POLICY "Anyone can read review authors" ON public.users
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.reviews r WHERE r.client_id = users.id)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
