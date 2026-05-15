-- Multi-pet bookings: one booking row can reference multiple pets.
-- Kept alongside the existing scalar pet_id (which still points at the first pet
-- for backward-compat readers) so we don't have to migrate every reader at once.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pet_ids uuid[];

UPDATE public.bookings
  SET pet_ids = ARRAY[pet_id]
  WHERE pet_id IS NOT NULL AND pet_ids IS NULL;
