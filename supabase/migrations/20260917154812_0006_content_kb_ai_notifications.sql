/*
# Create content, campaigns, knowledge base, AI, notifications, and messaging channel tables

1. New Tables
- `content` — content items (text, image, banner, video, PDF, announcement, ad)
- `content_templates` — reusable content templates
- `campaigns` — marketing campaigns
- `campaign_targets` — campaign destination targets
- `scheduled_posts` — scheduled content for publishing
- `knowledge_bases` — per-service knowledge base
- `knowledge_base_items` — individual KB entries (FAQ, rates, properties, etc.)
- `ai_actions` — AI classification/suggestion records
- `ai_suggestions` — AI suggested replies/actions
- `notifications` — system notifications
- `telegram_groups` — authorized Telegram groups
- `telegram_channels` — authorized Telegram channels
- `publishing_routes` — content publishing routes (source → destination)

2. Security
- All tables RLS enabled, authenticated users have full CRUD.

3. Notes
- Knowledge base is per-service, structured for AI querying.
- AI actions track confidence scores and action levels (auto/suggest/approval/blocked).
- Telegram groups/channels store metadata only — no credentials.
- Content workflow: draft → pending → approved → scheduled → published.
*/

-- Content table
CREATE TABLE IF NOT EXISTS content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  media_url text,
  media_type text,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  language text DEFAULT 'fa',
  tags text[],
  content_type text NOT NULL DEFAULT 'text',
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_select_authenticated" ON content;
CREATE POLICY "content_select_authenticated" ON content FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "content_insert_authenticated" ON content;
CREATE POLICY "content_insert_authenticated" ON content FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "content_update_authenticated" ON content;
CREATE POLICY "content_update_authenticated" ON content FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "content_delete_authenticated" ON content;
CREATE POLICY "content_delete_authenticated" ON content FOR DELETE TO authenticated USING (true);

-- Content templates
CREATE TABLE IF NOT EXISTS content_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  body text NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  content_type text DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ct_select_authenticated" ON content_templates;
CREATE POLICY "ct_select_authenticated" ON content_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ct_insert_authenticated" ON content_templates;
CREATE POLICY "ct_insert_authenticated" ON content_templates FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ct_update_authenticated" ON content_templates;
CREATE POLICY "ct_update_authenticated" ON content_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ct_delete_authenticated" ON content_templates;
CREATE POLICY "ct_delete_authenticated" ON content_templates FOR DELETE TO authenticated USING (true);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  content_id uuid REFERENCES content(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  start_at timestamptz,
  end_at timestamptz,
  results jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaigns_select_authenticated" ON campaigns;
CREATE POLICY "campaigns_select_authenticated" ON campaigns FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "campaigns_insert_authenticated" ON campaigns;
CREATE POLICY "campaigns_insert_authenticated" ON campaigns FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "campaigns_update_authenticated" ON campaigns;
CREATE POLICY "campaigns_update_authenticated" ON campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "campaigns_delete_authenticated" ON campaigns;
CREATE POLICY "campaigns_delete_authenticated" ON campaigns FOR DELETE TO authenticated USING (true);

-- Campaign targets
CREATE TABLE IF NOT EXISTS campaign_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  destination_type text NOT NULL,
  destination_id uuid,
  destination_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaign_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "camp_targets_select_authenticated" ON campaign_targets;
CREATE POLICY "camp_targets_select_authenticated" ON campaign_targets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "camp_targets_insert_authenticated" ON campaign_targets;
CREATE POLICY "camp_targets_insert_authenticated" ON campaign_targets FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "camp_targets_delete_authenticated" ON campaign_targets;
CREATE POLICY "camp_targets_delete_authenticated" ON campaign_targets FOR DELETE TO authenticated USING (true);

-- Scheduled posts
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  destination_type text NOT NULL,
  destination_id uuid,
  destination_name text,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  published_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_select_authenticated" ON scheduled_posts;
CREATE POLICY "sp_select_authenticated" ON scheduled_posts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sp_insert_authenticated" ON scheduled_posts;
CREATE POLICY "sp_insert_authenticated" ON scheduled_posts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sp_update_authenticated" ON scheduled_posts;
CREATE POLICY "sp_update_authenticated" ON scheduled_posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sp_delete_authenticated" ON scheduled_posts;
CREATE POLICY "sp_delete_authenticated" ON scheduled_posts FOR DELETE TO authenticated USING (true);

-- Knowledge bases (per service)
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid UNIQUE REFERENCES services(id) ON DELETE CASCADE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kb_select_authenticated" ON knowledge_bases;
CREATE POLICY "kb_select_authenticated" ON knowledge_bases FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "kb_insert_authenticated" ON knowledge_bases;
CREATE POLICY "kb_insert_authenticated" ON knowledge_bases FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "kb_update_authenticated" ON knowledge_bases;
CREATE POLICY "kb_update_authenticated" ON knowledge_bases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "kb_delete_authenticated" ON knowledge_bases;
CREATE POLICY "kb_delete_authenticated" ON knowledge_bases FOR DELETE TO authenticated USING (true);

-- Knowledge base items
CREATE TABLE IF NOT EXISTS knowledge_base_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id uuid NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'faq',
  question text,
  answer text,
  data jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_base_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kbi_select_authenticated" ON knowledge_base_items;
CREATE POLICY "kbi_select_authenticated" ON knowledge_base_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "kbi_insert_authenticated" ON knowledge_base_items;
CREATE POLICY "kbi_insert_authenticated" ON knowledge_base_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "kbi_update_authenticated" ON knowledge_base_items;
CREATE POLICY "kbi_update_authenticated" ON knowledge_base_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "kbi_delete_authenticated" ON knowledge_base_items;
CREATE POLICY "kbi_delete_authenticated" ON knowledge_base_items FOR DELETE TO authenticated USING (true);

-- AI actions
CREATE TABLE IF NOT EXISTS ai_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  result jsonb DEFAULT '{}'::jsonb,
  confidence float DEFAULT 0,
  reasoning text,
  action_level text NOT NULL DEFAULT 'suggest',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_select_authenticated" ON ai_actions;
CREATE POLICY "ai_select_authenticated" ON ai_actions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ai_insert_authenticated" ON ai_actions;
CREATE POLICY "ai_insert_authenticated" ON ai_actions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ai_update_authenticated" ON ai_actions;
CREATE POLICY "ai_update_authenticated" ON ai_actions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- AI suggestions
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL,
  content text NOT NULL,
  confidence float DEFAULT 0,
  is_used boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "as_select_authenticated" ON ai_suggestions;
CREATE POLICY "as_select_authenticated" ON ai_suggestions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "as_insert_authenticated" ON ai_suggestions;
CREATE POLICY "as_insert_authenticated" ON ai_suggestions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "as_update_authenticated" ON ai_suggestions;
CREATE POLICY "as_update_authenticated" ON ai_suggestions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  entity_type text,
  entity_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_select_authenticated" ON notifications;
CREATE POLICY "notif_select_authenticated" ON notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "notif_insert_authenticated" ON notifications;
CREATE POLICY "notif_insert_authenticated" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "notif_update_authenticated" ON notifications;
CREATE POLICY "notif_update_authenticated" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notif_delete_authenticated" ON notifications;
CREATE POLICY "notif_delete_authenticated" ON notifications FOR DELETE TO authenticated USING (true);

-- Telegram groups
CREATE TABLE IF NOT EXISTS telegram_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  group_type text DEFAULT 'group',
  link text,
  connected_account_id uuid REFERENCES messaging_accounts(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  can_send boolean DEFAULT false,
  can_send_media boolean DEFAULT false,
  connection_status text DEFAULT 'disconnected',
  last_checked_at timestamptz,
  rules jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE telegram_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tg_select_authenticated" ON telegram_groups;
CREATE POLICY "tg_select_authenticated" ON telegram_groups FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tg_insert_authenticated" ON telegram_groups;
CREATE POLICY "tg_insert_authenticated" ON telegram_groups FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "tg_update_authenticated" ON telegram_groups;
CREATE POLICY "tg_update_authenticated" ON telegram_groups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tg_delete_authenticated" ON telegram_groups;
CREATE POLICY "tg_delete_authenticated" ON telegram_groups FOR DELETE TO authenticated USING (true);

-- Telegram channels
CREATE TABLE IF NOT EXISTS telegram_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  link text,
  connected_account_id uuid REFERENCES messaging_accounts(id) ON DELETE SET NULL,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  can_publish boolean DEFAULT false,
  connection_status text DEFAULT 'disconnected',
  last_checked_at timestamptz,
  rules jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE telegram_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tc_select_authenticated" ON telegram_channels;
CREATE POLICY "tc_select_authenticated" ON telegram_channels FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tc_insert_authenticated" ON telegram_channels;
CREATE POLICY "tc_insert_authenticated" ON telegram_channels FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "tc_update_authenticated" ON telegram_channels;
CREATE POLICY "tc_update_authenticated" ON telegram_channels FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tc_delete_authenticated" ON telegram_channels;
CREATE POLICY "tc_delete_authenticated" ON telegram_channels FOR DELETE TO authenticated USING (true);

-- Publishing routes
CREATE TABLE IF NOT EXISTS publishing_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_account_id uuid REFERENCES messaging_accounts(id) ON DELETE CASCADE,
  destination_type text NOT NULL,
  destination_id uuid,
  destination_name text,
  related_channel_id uuid REFERENCES telegram_channels(id) ON DELETE SET NULL,
  related_group_id uuid REFERENCES telegram_groups(id) ON DELETE SET NULL,
  permissions jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE publishing_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pr_select_authenticated" ON publishing_routes;
CREATE POLICY "pr_select_authenticated" ON publishing_routes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pr_insert_authenticated" ON publishing_routes;
CREATE POLICY "pr_insert_authenticated" ON publishing_routes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pr_update_authenticated" ON publishing_routes;
CREATE POLICY "pr_update_authenticated" ON publishing_routes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pr_delete_authenticated" ON publishing_routes;
CREATE POLICY "pr_delete_authenticated" ON publishing_routes FOR DELETE TO authenticated USING (true);

-- Constraints
ALTER TABLE content ADD CONSTRAINT content_type_check
  CHECK (content_type IN ('text', 'image', 'banner', 'video', 'pdf', 'file', 'link', 'announcement', 'ad', 'special_offer', 'event', 'custom'));
ALTER TABLE content ADD CONSTRAINT content_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'scheduled', 'published', 'archived'));
ALTER TABLE campaigns ADD CONSTRAINT campaign_status_check
  CHECK (status IN ('draft', 'pending', 'scheduled', 'active', 'completed', 'stopped'));
ALTER TABLE ai_actions ADD CONSTRAINT ai_level_check
  CHECK (action_level IN ('auto', 'suggest', 'approval_required', 'blocked'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_service ON content(service_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_kb_service ON knowledge_bases(service_id);
CREATE INDEX IF NOT EXISTS idx_kbi_kb ON knowledge_base_items(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv ON ai_actions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tg_service ON telegram_groups(service_id);
CREATE INDEX IF NOT EXISTS idx_tc_service ON telegram_channels(service_id);

-- Seed: Knowledge bases for each service
INSERT INTO knowledge_bases (service_id, description)
SELECT s.id, 'دانش‌نامه ' || s.name FROM services s
WHERE NOT EXISTS (SELECT 1 FROM knowledge_bases kb WHERE kb.service_id = s.id);
