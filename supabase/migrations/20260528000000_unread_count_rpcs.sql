-- One-shot unread-count RPCs to replace N+1 client loops.

CREATE OR REPLACE FUNCTION public.get_conversation_unread_counts()
RETURNS TABLE (conversation_id uuid, unread_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT
    c.id,
    COUNT(m.id)
  FROM public.conversations c
  LEFT JOIN public.conversation_reads r
    ON r.conversation_id = c.id AND r.user_id = auth.uid()
  LEFT JOIN public.messages m
    ON m.conversation_id = c.id
    AND m.created_at > COALESCE(r.last_read_at, 'epoch'::timestamptz)
    AND (m.sender_user_id IS NULL OR m.sender_user_id <> auth.uid())
  GROUP BY c.id;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_payment_ids()
RETURNS TABLE (payment_id uuid)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT p.id
  FROM public.payments p
  LEFT JOIN public.payment_reads pr
    ON pr.payment_id = p.id AND pr.user_id = auth.uid()
  WHERE pr.last_seen_at IS NULL OR pr.last_seen_at < p.updated_at;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_reads;
