-- Comprehensive pet profile: behaviour, health, admin.
-- Plus an RLS policy so walkers can manage pets of their customers (invited or booked).

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS pet_type text NOT NULL DEFAULT 'dog' CHECK (pet_type IN ('dog', 'cat', 'other')),
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS sex text CHECK (sex IN ('male', 'female', 'unknown')),
  ADD COLUMN IF NOT EXISTS spayed_neutered boolean,
  ADD COLUMN IF NOT EXISTS house_trained boolean,
  ADD COLUMN IF NOT EXISTS friendly_with_kids text CHECK (friendly_with_kids IN ('yes', 'no', 'sometimes', 'unknown')),
  ADD COLUMN IF NOT EXISTS friendly_with_dogs text CHECK (friendly_with_dogs IN ('yes', 'no', 'sometimes', 'unknown')),
  ADD COLUMN IF NOT EXISTS friendly_with_cats text CHECK (friendly_with_cats IN ('yes', 'no', 'sometimes', 'unknown')),
  ADD COLUMN IF NOT EXISTS triggers text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS left_alone_hours integer,
  ADD COLUMN IF NOT EXISTS medication text,
  ADD COLUMN IF NOT EXISTS vet_contact text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE POLICY "Walker can manage pets of their customers" ON public.pets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.walker_profiles wp
      WHERE wp.user_id = auth.uid()
        AND (
          EXISTS (SELECT 1 FROM public.customer_invites ci WHERE ci.walker_id = wp.id AND ci.invited_user_id = pets.user_id)
          OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.walker_id = wp.id AND b.client_id = pets.user_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.walker_profiles wp
      WHERE wp.user_id = auth.uid()
        AND (
          EXISTS (SELECT 1 FROM public.customer_invites ci WHERE ci.walker_id = wp.id AND ci.invited_user_id = pets.user_id)
          OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.walker_id = wp.id AND b.client_id = pets.user_id)
        )
    )
  );
