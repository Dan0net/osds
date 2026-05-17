-- Track which payments each user has seen, plus a payments.updated_at
-- bumped automatically on any change. A payment is "unread" for a user when
-- no payment_reads row exists or last_seen_at < payments.updated_at.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.tg_payments_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_payments_set_updated_at();

CREATE TABLE IF NOT EXISTS public.payment_reads (
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (payment_id, user_id)
);

ALTER TABLE public.payment_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own payment_reads" ON public.payment_reads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User writes own payment_reads" ON public.payment_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User updates own payment_reads" ON public.payment_reads
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Enable realtime for payments so the client can subscribe to status changes.
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
