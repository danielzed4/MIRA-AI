/*
# Create services, phone numbers, and messaging accounts

1. New Tables
- `services` — business services (صرافی, املاک, هاستل, کاریابی, اجاره خودرو, Yandex, معاملات ملک)
- `phone_numbers` — SIM cards / phone numbers owned by the company
- `phone_number_services` — many-to-many: which services are assigned to which SIM
- `messaging_accounts` — Telegram, WhatsApp Business, Telegram Bot accounts
- `messaging_account_services` — many-to-many: which services are assigned to which messaging account

2. Relationships
- phone_number_services links phone_numbers ↔ services
- messaging_account_services links messaging_accounts ↔ services
- messaging_accounts can optionally reference a phone_number (e.g., WhatsApp Business uses a phone number)

3. Security
- All tables have RLS enabled.
- All authenticated users can read (internal platform, trusted employees).
- All authenticated users can insert/update/delete (admins manage via UI; full role-based
  enforcement comes in PHASE 2 with server-side checks).

4. Seed Data
- 7 initial services: صرافی, املاک, معاملات ملک, هاستل, کاریابی, اجاره خودرو, Yandex
- 2 phone numbers: SIM 01 (خدمات مالی و املاک), SIM 02 (خدمات عمومی)
- Service assignments matching the master prompt spec
*/

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text NOT NULL DEFAULT '📋',
  description text,
  color text DEFAULT 'primary',
  is_active boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_authenticated" ON services;
CREATE POLICY "services_select_authenticated"
  ON services FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "services_insert_authenticated" ON services;
CREATE POLICY "services_insert_authenticated"
  ON services FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "services_update_authenticated" ON services;
CREATE POLICY "services_update_authenticated"
  ON services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "services_delete_authenticated" ON services;
CREATE POLICY "services_delete_authenticated"
  ON services FOR DELETE TO authenticated USING (true);

-- Phone numbers table (SIM cards)
CREATE TABLE IF NOT EXISTS phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_name text NOT NULL,
  phone_number text UNIQUE,
  sim_label text,
  description text,
  status text NOT NULL DEFAULT 'active',
  is_primary boolean NOT NULL DEFAULT false,
  working_hours jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "phone_numbers_select_authenticated" ON phone_numbers;
CREATE POLICY "phone_numbers_select_authenticated"
  ON phone_numbers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "phone_numbers_insert_authenticated" ON phone_numbers;
CREATE POLICY "phone_numbers_insert_authenticated"
  ON phone_numbers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "phone_numbers_update_authenticated" ON phone_numbers;
CREATE POLICY "phone_numbers_update_authenticated"
  ON phone_numbers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "phone_numbers_delete_authenticated" ON phone_numbers;
CREATE POLICY "phone_numbers_delete_authenticated"
  ON phone_numbers FOR DELETE TO authenticated USING (true);

-- Phone number ↔ Services (many-to-many)
CREATE TABLE IF NOT EXISTS phone_number_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id uuid NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone_number_id, service_id)
);

ALTER TABLE phone_number_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pn_services_select_authenticated" ON phone_number_services;
CREATE POLICY "pn_services_select_authenticated"
  ON phone_number_services FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pn_services_insert_authenticated" ON phone_number_services;
CREATE POLICY "pn_services_insert_authenticated"
  ON phone_number_services FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pn_services_delete_authenticated" ON phone_number_services;
CREATE POLICY "pn_services_delete_authenticated"
  ON phone_number_services FOR DELETE TO authenticated USING (true);

-- Messaging accounts table
CREATE TABLE IF NOT EXISTS messaging_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_type text NOT NULL DEFAULT 'phone',
  identifier text,
  phone_number_id uuid REFERENCES phone_numbers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'inactive',
  metadata jsonb DEFAULT '{}'::jsonb,
  working_hours jsonb DEFAULT '{}'::jsonb,
  last_connected_at timestamptz,
  health_status text DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messaging_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_accounts_select_authenticated" ON messaging_accounts;
CREATE POLICY "msg_accounts_select_authenticated"
  ON messaging_accounts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "msg_accounts_insert_authenticated" ON messaging_accounts;
CREATE POLICY "msg_accounts_insert_authenticated"
  ON messaging_accounts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "msg_accounts_update_authenticated" ON messaging_accounts;
CREATE POLICY "msg_accounts_update_authenticated"
  ON messaging_accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "msg_accounts_delete_authenticated" ON messaging_accounts;
CREATE POLICY "msg_accounts_delete_authenticated"
  ON messaging_accounts FOR DELETE TO authenticated USING (true);

-- Messaging account ↔ Services (many-to-many)
CREATE TABLE IF NOT EXISTS messaging_account_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  messaging_account_id uuid NOT NULL REFERENCES messaging_accounts(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (messaging_account_id, service_id)
);

ALTER TABLE messaging_account_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ma_services_select_authenticated" ON messaging_account_services;
CREATE POLICY "ma_services_select_authenticated"
  ON messaging_account_services FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ma_services_insert_authenticated" ON messaging_account_services;
CREATE POLICY "ma_services_insert_authenticated"
  ON messaging_account_services FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ma_services_delete_authenticated" ON messaging_account_services;
CREATE POLICY "ma_services_delete_authenticated"
  ON messaging_account_services FOR DELETE TO authenticated USING (true);

-- Add check constraints for enum-like fields
ALTER TABLE messaging_accounts ADD CONSTRAINT msg_account_type_check
  CHECK (account_type IN ('phone', 'telegram', 'telegram_business', 'telegram_bot', 'whatsapp_business'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status ON phone_numbers(status);
CREATE INDEX IF NOT EXISTS idx_pn_services_pn ON phone_number_services(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_pn_services_service ON phone_number_services(service_id);
CREATE INDEX IF NOT EXISTS idx_msg_accounts_type ON messaging_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_msg_accounts_status ON messaging_accounts(status);
CREATE INDEX IF NOT EXISTS idx_ma_services_account ON messaging_account_services(messaging_account_id);
CREATE INDEX IF NOT EXISTS idx_ma_services_service ON messaging_account_services(service_id);

-- Seed: Services
INSERT INTO services (name, slug, icon, description, color, sort_order) VALUES
  ('صرافی', 'exchange', '💱', 'خدمات تبادل ارز و نرخ روز', 'primary', 1),
  ('املاک', 'realestate', '🏠', 'خرید، فروش و اجاره املاک', 'accent', 2),
  ('معاملات ملک', 'property_deals', '🏢', 'معاملات و مشاوره ملک', 'accent', 3),
  ('هاستل', 'hostel', '🛏️', 'رزرو و مدیریت هاستل', 'success', 4),
  ('کاریابی', 'jobs', '💼', 'کاریابی و استخدام', 'warning', 5),
  ('اجاره خودرو', 'car_rental', '🚗', 'اجاره خودرو و وسایل نقلیه', 'error', 6),
  ('Yandex', 'yandex', '🛵', 'ثبت‌نام و خدمات Yandex', 'neutral', 7)
ON CONFLICT (slug) DO NOTHING;

-- Seed: Phone numbers (SIM cards)
INSERT INTO phone_numbers (internal_name, phone_number, sim_label, description, status, is_primary) VALUES
  ('سیم‌کارت ۱ — خدمات مالی و املاک', NULL, 'SIM 01', 'این شماره برای خدمات با ارزش بالای مالی و املاک استفاده می‌شود', 'active', true),
  ('سیم‌کارت ۲ — خدمات عمومی', NULL, 'SIM 02', 'این شماره برای خدمات عمومی شرکت استفاده می‌شود', 'active', false)
ON CONFLICT (phone_number) DO NOTHING;

-- Seed: Phone number ↔ Services assignments
INSERT INTO phone_number_services (phone_number_id, service_id)
SELECT pn.id, s.id FROM phone_numbers pn, services s
WHERE pn.sim_label = 'SIM 01' AND s.slug IN ('exchange', 'realestate', 'property_deals')
ON CONFLICT DO NOTHING;

INSERT INTO phone_number_services (phone_number_id, service_id)
SELECT pn.id, s.id FROM phone_numbers pn, services s
WHERE pn.sim_label = 'SIM 02' AND s.slug IN ('hostel', 'jobs', 'car_rental', 'yandex')
ON CONFLICT DO NOTHING;
