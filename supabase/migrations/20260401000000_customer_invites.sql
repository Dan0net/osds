-- Audit log for walker-initiated customer invites.
-- Used to (a) provide a paper trail for GDPR/support questions and
-- (b) enforce per-walker rate limits.

CREATE TABLE IF NOT EXISTS public.customer_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  walker_id uuid NOT NULL REFERENCES public.walker_profiles(id) ON DELETE CASCADE,
  invited_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text DEFAULT '',
  result text NOT NULL CHECK (result IN ('invited', 'already_exists', 'rate_limited', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_invites_walker_created_idx
  ON public.customer_invites (walker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS customer_invites_email_idx
  ON public.customer_invites (lower(email));

ALTER TABLE public.customer_invites ENABLE ROW LEVEL SECURITY;

-- Walkers can read their own invite history (for the Customers UI / support).
CREATE POLICY customer_invites_walker_read
  ON public.customer_invites FOR SELECT
  USING (
    walker_id IN (
      SELECT id FROM public.walker_profiles WHERE user_id = auth.uid()
    )
  );

-- Writes are service-role only (from the invite-customer function).
-- No insert/update/delete policy means anon and authenticated roles cannot write.

-- One-time consent flag for walkers using the Add Customer flow.
ALTER TABLE public.walker_profiles
  ADD COLUMN IF NOT EXISTS customer_invite_consent_at timestamptz;
