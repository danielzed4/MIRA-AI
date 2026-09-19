/*
# Telegram Webhook Support

1. New Functions
- `increment_conversation_message_count(conv_id uuid)` — atomically increments the
  message_count column for a conversation. Called by the telegram-webhook edge
  function after inserting a new inbound message.

2. Indexes
- `idx_conv_customer_identifier` on conversations(customer_identifier) — speeds up
  the webhook's lookup-by-external-id query.

3. Security
- The function is SECURITY DEFINER, owned by postgres, so the edge function
  (which uses the service role key) can call it. It only increments a counter;
  no user-controlled data is returned.
- No RLS policy changes — the edge function uses the service role key which
  bypasses RLS entirely.
*/

CREATE OR REPLACE FUNCTION increment_conversation_message_count(conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET message_count = message_count + 1
  WHERE id = conv_id;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_conv_customer_identifier
  ON conversations(customer_identifier)
  WHERE customer_identifier IS NOT NULL;
