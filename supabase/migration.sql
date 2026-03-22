-- Migration: flatten booking_items into bookings, replace batch_id with payment_id grouping
-- Run this in the Supabase SQL Editor ONCE against an existing database

BEGIN;

-- ============================================================
-- 1. Add service_id and pet_id columns to bookings (nullable initially for migration)
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL;

-- ============================================================
-- 2. Migrate data from booking_items into bookings
-- ============================================================

UPDATE public.bookings b
SET
  service_id = bi.service_id,
  pet_id = bi.pet_id
FROM public.booking_items bi
WHERE bi.booking_id = b.id;

-- ============================================================
-- 3. Make service_id NOT NULL now that data is migrated
-- ============================================================

ALTER TABLE public.bookings
  ALTER COLUMN service_id SET NOT NULL;

-- ============================================================
-- 4. Drop booking_items RLS policies, dependent policies, and table
-- ============================================================

-- Drop pets policy that references booking_items (will be recreated in step 7)
DROP POLICY IF EXISTS "Walker can read pets in their bookings" ON public.pets;

DROP POLICY IF EXISTS "Users can read own booking items" ON public.booking_items;
DROP POLICY IF EXISTS "Users can insert booking items" ON public.booking_items;
DROP TABLE IF EXISTS public.booking_items;

-- ============================================================
-- 5. Drop batch_id column from bookings
-- ============================================================

ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS batch_id;

-- ============================================================
-- 6. Update payments status constraint to include new statuses
-- ============================================================

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending_approval', 'awaiting_payment', 'paid', 'refunded', 'partially_refunded'));

ALTER TABLE public.payments
  ALTER COLUMN status SET DEFAULT 'pending_approval';

-- ============================================================
-- 7. Update pets RLS policy to use bookings.pet_id directly
-- ============================================================

DROP POLICY IF EXISTS "Walker can read pets in their bookings" ON public.pets;

CREATE POLICY "Walker can read pets in their bookings" ON public.pets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.walker_profiles wp ON wp.id = b.walker_id
      WHERE b.pet_id = pets.id AND wp.user_id = auth.uid()
    )
  );

COMMIT;
