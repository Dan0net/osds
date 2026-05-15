-- Let walkers read users they've invited, even before the user books anything.
-- Mirrors the existing "Walker can read booking clients" policy but keyed off
-- customer_invites instead of bookings.

CREATE POLICY "Walker can read invited customers" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.customer_invites ci
      JOIN public.walker_profiles wp ON wp.id = ci.walker_id
      WHERE ci.invited_user_id = users.id
        AND wp.user_id = auth.uid()
    )
  );
