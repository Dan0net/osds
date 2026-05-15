-- Cache Stripe Connect "can take charges?" state on the walker row.
-- stripe_account_id only proves onboarding has started; charges_enabled is the
-- truth and is updated via the account.updated webhook.

ALTER TABLE public.walker_profiles
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS walker_profiles_stripe_account_id_idx
  ON public.walker_profiles (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;
