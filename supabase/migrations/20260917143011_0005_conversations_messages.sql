/*
# Create conversations, messages, and assignments tables

1. New Tables
- `conversations` — unified inbox threads (Telegram + WhatsApp in one place)
- `messages` — individual messages within conversations
- `conversation_assignments` — assignment of conversations to employees
- `internal_notes` — internal notes on conversations (never sent to customer)

2. Relationships
- conversations.customer_id → customers(id)
- conversations.service_id → services(id)
- conversations.phone_number_id → phone_numbers(id)
- conversations.messaging_account_id → messaging_accounts(id)
- conversations.assigned_employee_id → employees(id)
- messages.conversation_id → conversations(id)
- conversation_assignments.conversation_id → conversations(id)
- conversation_assignments.employee_id → employees(id)
- internal_notes.conversation_id → conversations(id)
- internal_notes.author_id → auth.users(id)

3. Security
- All tables RLS enabled, authenticated users have full CRUD.

4. Notes
- Conversations unify Telegram and WhatsApp into one inbox.
- Messages track direction (inbound/outbound), channel, delivery status.
- Internal notes are separate from messages — they never go to the customer.
- conversation_assignments tracks assignment history.
*/

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  phone_number_id uuid REFERENCES phone_numbers(id) ON DELETE SET NULL,
  messaging_account_id uuid REFERENCES messaging_accounts(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'telegram',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  is_unread boolean DEFAULT true,
  is_hot boolean DEFAULT false,
  customer_identifier text,
  customer_name text,
  customer_phone text,
  assigned_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  last_message_preview text,
  message_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conv_select_authenticated" ON conversations;
CREATE POLICY "conv_select_authenticated" ON conversations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "conv_insert_authenticated" ON conversations;
CREATE POLICY "conv_insert_authenticated" ON conversations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "conv_update_authenticated" ON conversations;
CREATE POLICY "conv_update_authenticated" ON conversations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "conv_delete_authenticated" ON conversations;
CREATE POLICY "conv_delete_authenticated" ON conversations FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'inbound',
  channel text NOT NULL DEFAULT 'telegram',
  content text,
  media_url text,
  media_type text,
  delivery_status text DEFAULT 'sent',
  read_status text DEFAULT 'delivered',
  external_id text,
  sender_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msg_select_authenticated" ON messages;
CREATE POLICY "msg_select_authenticated" ON messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "msg_insert_authenticated" ON messages;
CREATE POLICY "msg_insert_authenticated" ON messages FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "msg_update_authenticated" ON messages;
CREATE POLICY "msg_update_authenticated" ON messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "msg_delete_authenticated" ON messages;
CREATE POLICY "msg_delete_authenticated" ON messages FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS conversation_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversation_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ca_select_authenticated" ON conversation_assignments;
CREATE POLICY "ca_select_authenticated" ON conversation_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ca_insert_authenticated" ON conversation_assignments;
CREATE POLICY "ca_insert_authenticated" ON conversation_assignments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ca_delete_authenticated" ON conversation_assignments;
CREATE POLICY "ca_delete_authenticated" ON conversation_assignments FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "in_select_authenticated" ON internal_notes;
CREATE POLICY "in_select_authenticated" ON internal_notes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "in_insert_authenticated" ON internal_notes;
CREATE POLICY "in_insert_authenticated" ON internal_notes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "in_delete_authenticated" ON internal_notes;
CREATE POLICY "in_delete_authenticated" ON internal_notes FOR DELETE TO authenticated USING (true);

-- Constraints
ALTER TABLE conversations ADD CONSTRAINT conv_channel_check
  CHECK (channel IN ('telegram', 'whatsapp', 'internal', 'sms'));
ALTER TABLE conversations ADD CONSTRAINT conv_status_check
  CHECK (status IN ('open', 'pending', 'resolved', 'archived'));
ALTER TABLE conversations ADD CONSTRAINT conv_priority_check
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
ALTER TABLE messages ADD CONSTRAINT msg_direction_check
  CHECK (direction IN ('inbound', 'outbound'));
ALTER TABLE messages ADD CONSTRAINT msg_channel_check
  CHECK (channel IN ('telegram', 'whatsapp', 'internal', 'sms'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conv_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conv_service ON conversations(service_id);
CREATE INDEX IF NOT EXISTS idx_conv_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conv_unread ON conversations(is_unread) WHERE is_unread = true;
CREATE INDEX IF NOT EXISTS idx_conv_last_msg ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_msg_external ON messages(external_id);
CREATE INDEX IF NOT EXISTS idx_ca_conv ON conversation_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_in_conv ON internal_notes(conversation_id);
