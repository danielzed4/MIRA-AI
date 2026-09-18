/*
# Create CRM tables: customers, identifiers, tags, notes, leads

1. New Tables
- `customers` — central customer profiles (one per person, never duplicated)
- `customer_identifiers` — multiple identifiers per customer (phone, telegram, whatsapp, email)
- `customer_tags` — many-to-many tags for customers
- `tags` — tag definitions
- `customer_notes` — internal notes about customers
- `leads` — sales leads linked to customer + service
- `lead_activities` — activity log per lead

2. Relationships
- customer_identifiers.customer_id → customers(id)
- customer_tags links customers ↔ tags
- customer_notes.customer_id → customers(id)
- leads.customer_id → customers(id)
- leads.service_id → services(id)
- leads.phone_number_id → phone_numbers(id)
- leads.assigned_employee_id → employees(id)
- lead_activities.lead_id → leads(id)

3. Security
- All tables RLS enabled, authenticated users have full CRUD (internal platform).

4. Notes
- Duplicate detection: customer_identifiers has unique (type, value) to prevent
  duplicate identifiers. When a new message arrives, the system checks identifiers
  to find or create the right customer.
- Leads track per-service interactions. One customer can have multiple leads
  across different services.
*/

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  phone text,
  email text,
  telegram_username text,
  whatsapp_number text,
  language text DEFAULT 'fa',
  country text,
  city text,
  status text NOT NULL DEFAULT 'active',
  source text,
  preferred_service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  assigned_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  first_contact_at timestamptz,
  last_contact_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_select_authenticated" ON customers;
CREATE POLICY "customers_select_authenticated" ON customers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "customers_insert_authenticated" ON customers;
CREATE POLICY "customers_insert_authenticated" ON customers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "customers_update_authenticated" ON customers;
CREATE POLICY "customers_update_authenticated" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "customers_delete_authenticated" ON customers;
CREATE POLICY "customers_delete_authenticated" ON customers FOR DELETE TO authenticated USING (true);

-- Customer identifiers (for dedup)
CREATE TABLE IF NOT EXISTS customer_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type text NOT NULL,
  value text NOT NULL,
  is_verified boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, value)
);

ALTER TABLE customer_identifiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ci_select_authenticated" ON customer_identifiers;
CREATE POLICY "ci_select_authenticated" ON customer_identifiers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ci_insert_authenticated" ON customer_identifiers;
CREATE POLICY "ci_insert_authenticated" ON customer_identifiers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ci_update_authenticated" ON customer_identifiers;
CREATE POLICY "ci_update_authenticated" ON customer_identifiers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ci_delete_authenticated" ON customer_identifiers;
CREATE POLICY "ci_delete_authenticated" ON customer_identifiers FOR DELETE TO authenticated USING (true);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text DEFAULT 'neutral',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tags_select_authenticated" ON tags;
CREATE POLICY "tags_select_authenticated" ON tags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tags_insert_authenticated" ON tags;
CREATE POLICY "tags_insert_authenticated" ON tags FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "tags_update_authenticated" ON tags;
CREATE POLICY "tags_update_authenticated" ON tags FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tags_delete_authenticated" ON tags;
CREATE POLICY "tags_delete_authenticated" ON tags FOR DELETE TO authenticated USING (true);

-- Customer ↔ Tags
CREATE TABLE IF NOT EXISTS customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, tag_id)
);

ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ct_select_authenticated" ON customer_tags;
CREATE POLICY "ct_select_authenticated" ON customer_tags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ct_insert_authenticated" ON customer_tags;
CREATE POLICY "ct_insert_authenticated" ON customer_tags FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ct_delete_authenticated" ON customer_tags;
CREATE POLICY "ct_delete_authenticated" ON customer_tags FOR DELETE TO authenticated USING (true);

-- Customer notes
CREATE TABLE IF NOT EXISTS customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cn_select_authenticated" ON customer_notes;
CREATE POLICY "cn_select_authenticated" ON customer_notes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cn_insert_authenticated" ON customer_notes;
CREATE POLICY "cn_insert_authenticated" ON customer_notes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "cn_delete_authenticated" ON customer_notes;
CREATE POLICY "cn_delete_authenticated" ON customer_notes FOR DELETE TO authenticated USING (true);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  phone_number_id uuid REFERENCES phone_numbers(id) ON DELETE SET NULL,
  messaging_account_id uuid REFERENCES messaging_accounts(id) ON DELETE SET NULL,
  source text,
  status text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'normal',
  score int DEFAULT 0,
  is_hot boolean DEFAULT false,
  assigned_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  title text,
  notes text,
  next_follow_up timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_select_authenticated" ON leads;
CREATE POLICY "leads_select_authenticated" ON leads FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "leads_insert_authenticated" ON leads;
CREATE POLICY "leads_insert_authenticated" ON leads FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "leads_update_authenticated" ON leads;
CREATE POLICY "leads_update_authenticated" ON leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "leads_delete_authenticated" ON leads;
CREATE POLICY "leads_delete_authenticated" ON leads FOR DELETE TO authenticated USING (true);

-- Lead activities
CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "la_select_authenticated" ON lead_activities;
CREATE POLICY "la_select_authenticated" ON lead_activities FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "la_insert_authenticated" ON lead_activities;
CREATE POLICY "la_insert_authenticated" ON lead_activities FOR INSERT TO authenticated WITH CHECK (true);

-- Constraints
ALTER TABLE customer_identifiers ADD CONSTRAINT ci_type_check
  CHECK (type IN ('phone', 'telegram', 'whatsapp', 'email', 'internal_id'));
ALTER TABLE leads ADD CONSTRAINT lead_status_check
  CHECK (status IN ('new', 'contacted', 'negotiating', 'follow_up', 'won', 'lost', 'closed'));
ALTER TABLE leads ADD CONSTRAINT lead_priority_check
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_ci_value ON customer_identifiers(value);
CREATE INDEX IF NOT EXISTS idx_ci_customer ON customer_identifiers(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_customer ON leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_service ON leads(service_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_hot ON leads(is_hot) WHERE is_hot = true;
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);

-- Seed some common tags
INSERT INTO tags (name, color) VALUES
  ('مشتری VIP', 'warning'),
  ('مشتری جدید', 'primary'),
  ('مذاکره', 'accent'),
  ('بسته شده', 'success'),
  ('نیاز به پیگیری', 'error'),
  ('بدون پاسخ', 'neutral')
ON CONFLICT (name) DO NOTHING;
