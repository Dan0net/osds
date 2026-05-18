UPDATE public.payments p
SET status = 'cancelled', total_cents = 0
WHERE p.status IN ('pending_approval', 'awaiting_payment')
  AND NOT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.payment_id = p.id
      AND b.status NOT IN ('cancelled', 'declined', 'refunded')
  );
