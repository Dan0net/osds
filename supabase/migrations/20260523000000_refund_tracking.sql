-- Refund tracking: dedicated refunds table mirroring Stripe + payment fields
-- for the running refunded total and the captured payment intent id.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS refunded_amount_cents int NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  stripe_refund_id text UNIQUE NOT NULL,
  amount_cents int NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  reason text DEFAULT NULL,
  booking_ids uuid[] DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment ON public.refunds (payment_id);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can read own refunds" ON public.refunds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = refunds.payment_id
        AND (
          auth.uid() = p.client_id
          OR EXISTS (SELECT 1 FROM public.walker_profiles wp WHERE wp.id = p.walker_id AND wp.user_id = auth.uid())
        )
    )
  );
