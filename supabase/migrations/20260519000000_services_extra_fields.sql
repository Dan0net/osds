-- Extra service pricing/scheduling fields and per-booking snapshots.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS holiday_rate_cents integer,
  ADD COLUMN IF NOT EXISTS extra_pet_rate_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocks_slot boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS buffer_after_minutes integer NOT NULL DEFAULT 0;

-- Per-booking flags. is_holiday + blocks_slot snapshot the state at booking
-- time. buffer_after_minutes stays on the service only — changing it affects
-- scheduling math for all bookings of that service.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_holiday boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocks_slot boolean NOT NULL DEFAULT true;
