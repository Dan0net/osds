ALTER TABLE public.walker_profiles
  ADD COLUMN IF NOT EXISTS external_events_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_external_probe_at timestamptz;

ALTER PUBLICATION supabase_realtime ADD TABLE public.walker_profiles;
