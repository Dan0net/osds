ALTER TABLE public.ical_cache
  ADD COLUMN IF NOT EXISTS last_modified TEXT;
