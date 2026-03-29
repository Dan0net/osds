-- Phase 8: User journey improvements
-- Add user_type and onboarding_completed to users table
-- Add location fields to walker_profiles

-- Users: role and onboarding tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'owner' CHECK (user_type IN ('owner', 'walker'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Mark existing users as onboarded (they're already set up)
UPDATE public.users SET onboarding_completed = true WHERE created_at < now();

-- Walker profiles: location for discovery
ALTER TABLE public.walker_profiles ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE public.walker_profiles ADD COLUMN IF NOT EXISTS postcode text DEFAULT '';

-- Update trigger to store user_type from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, user_type)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'user_type', 'owner')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
