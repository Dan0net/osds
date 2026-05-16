-- Replace flat notifications inbox with conversation-based chat.
-- One conversation per walker↔client pair; both system events (booking
-- lifecycle) and human-typed messages live in the same thread.

DROP TABLE IF EXISTS public.notifications;

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  walker_id uuid NOT NULL REFERENCES public.walker_profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (walker_id, client_id)
);

CREATE INDEX idx_conversations_walker_recent ON public.conversations (walker_id, last_message_at DESC);
CREATE INDEX idx_conversations_client_recent ON public.conversations (client_id, last_message_at DESC);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'chat' CHECK (kind IN ('chat', 'system')),
  body text NOT NULL DEFAULT '',
  event_type text,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_recent ON public.messages (conversation_id, created_at DESC);

CREATE TABLE public.conversation_reads (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_in_conversation(p_conversation_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND (
        c.client_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.walker_profiles wp
          WHERE wp.id = c.walker_id AND wp.user_id = auth.uid()
        )
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY conversations_select ON public.conversations FOR SELECT USING (
  client_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.walker_profiles wp
    WHERE wp.id = walker_id AND wp.user_id = auth.uid()
  )
);

CREATE POLICY conversations_insert ON public.conversations FOR INSERT WITH CHECK (
  client_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.walker_profiles wp
    WHERE wp.id = walker_id AND wp.user_id = auth.uid()
  )
);

CREATE POLICY messages_select ON public.messages FOR SELECT USING (
  public.user_in_conversation(conversation_id)
);

CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK (
  kind = 'chat'
  AND sender_user_id = auth.uid()
  AND public.user_in_conversation(conversation_id)
);

CREATE POLICY conversation_reads_select ON public.conversation_reads FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY conversation_reads_upsert ON public.conversation_reads FOR INSERT WITH CHECK (
  user_id = auth.uid() AND public.user_in_conversation(conversation_id)
);

CREATE POLICY conversation_reads_update ON public.conversation_reads FOR UPDATE USING (
  user_id = auth.uid()
);

-- Keep the conversation's preview + ordering timestamp in sync with the latest message.
CREATE OR REPLACE FUNCTION public.set_conversation_last_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      last_message_preview = left(NEW.body, 200)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER messages_after_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_conversation_last_message();

-- Backfill: one conversation per existing walker↔client pair (from bookings
-- and customer_invites) so users see the threads immediately, even when no
-- system or chat message has been written yet.
INSERT INTO public.conversations (walker_id, client_id, last_message_at)
SELECT walker_id, client_id, MAX(created_at)
FROM public.bookings
GROUP BY walker_id, client_id
ON CONFLICT (walker_id, client_id) DO NOTHING;

INSERT INTO public.conversations (walker_id, client_id)
SELECT walker_id, invited_user_id
FROM public.customer_invites
WHERE invited_user_id IS NOT NULL
ON CONFLICT (walker_id, client_id) DO NOTHING;
