-- ============================================================
-- SETUP WIZARDS — Owner + Walker onboarding
-- ============================================================

-- Owner location support
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lat float8;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lng float8;

-- Wizard completion tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz;
ALTER TABLE public.walker_profiles ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz;

-- ============================================================
-- SUPABASE STORAGE — Image uploads
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Public avatar read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own cover" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own cover" ON storage.objects FOR UPDATE
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Public cover read" ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

-- ============================================================
-- UPDATE TRIGGER — persist postcode + auto-create walker profile
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _name text;
  _slug text;
BEGIN
  _name := coalesce(new.raw_user_meta_data->>'name', '');

  INSERT INTO public.users (id, name, email, postcode)
  VALUES (
    new.id,
    _name,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'postcode', '')), '')
  );

  IF new.raw_user_meta_data->>'role' = 'walker' THEN
    _slug := lower(regexp_replace(regexp_replace(_name, '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'));
    IF _slug = '' THEN
      _slug := 'walker-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
    END IF;
    IF EXISTS (SELECT 1 FROM public.walker_profiles WHERE slug = _slug) THEN
      _slug := _slug || '-' || substr(encode(gen_random_bytes(3), 'hex'), 1, 6);
    END IF;

    INSERT INTO public.walker_profiles (user_id, slug, business_name, postcode, calendar_feed_token)
    VALUES (
      new.id,
      _slug,
      _name || '''s Dog Walking',
      nullif(trim(coalesce(new.raw_user_meta_data->>'postcode', '')), ''),
      encode(gen_random_bytes(16), 'hex')
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================
-- BACKFILL — existing users skip wizard
-- ============================================================

UPDATE public.users SET setup_completed_at = created_at
  WHERE EXISTS (SELECT 1 FROM public.pets WHERE pets.user_id = users.id);
UPDATE public.walker_profiles SET setup_completed_at = created_at;
