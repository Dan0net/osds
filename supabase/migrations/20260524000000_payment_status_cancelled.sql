-- Allow payment.status = 'cancelled' for payments that ended before any
-- money moved (all bookings cancelled while in pending_approval or
-- awaiting_payment, or a cash payment whose bookings were all cancelled).
-- Distinct from 'refunded' which implies money was returned.

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending_approval', 'awaiting_payment', 'paid', 'refunded', 'partially_refunded', 'cancelled'));
