/*
# Create employees, teams, roles, permissions, and audit logs

1. New Tables
- `teams` — organizational teams (e.g., تیم صرافی, تیم املاک)
- `employees` — employee records linked to auth users and teams
- `employee_services` — many-to-many: which services an employee can handle
- `roles` — role definitions (مدیر کل, مدیر بخش, کارمند, اپراتور, مشاهده‌گر)
- `permissions` — individual permission keys
- `role_permissions` — many-to-many: which permissions each role has
- `employee_roles` — many-to-many: which roles an employee has
- `audit_logs` — records all significant actions for security review

2. Relationships
- employees.user_id → auth.users(id) — optional link to auth account
- employees.team_id → teams(id)
- employee_services links employees ↔ services
- role_permissions links roles ↔ permissions
- employee_roles links employees ↔ roles
- audit_logs.user_id → auth.users(id)

3. Security
- All tables have RLS enabled.
- Authenticated users can read all data (internal platform).
- Authenticated users can insert/update/delete (admin management via UI).
- audit_logs: authenticated can read, but only insert (no update/delete — immutable log).

4. Seed Data
- 5 roles: مدیر کل, مدیر بخش, کارمند, اپراتور, مشاهده‌گر
- Core permissions seeded for each role
*/

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_select_authenticated" ON teams;
CREATE POLICY "teams_select_authenticated" ON teams FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "teams_insert_authenticated" ON teams;
CREATE POLICY "teams_insert_authenticated" ON teams FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "teams_update_authenticated" ON teams;
CREATE POLICY "teams_update_authenticated" ON teams FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "teams_delete_authenticated" ON teams;
CREATE POLICY "teams_delete_authenticated" ON teams FOR DELETE TO authenticated USING (true);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  language text DEFAULT 'fa',
  status text NOT NULL DEFAULT 'active',
  working_hours jsonb DEFAULT '{}'::jsonb,
  capacity int DEFAULT 10,
  current_workload int DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_select_authenticated" ON employees;
CREATE POLICY "employees_select_authenticated" ON employees FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "employees_insert_authenticated" ON employees;
CREATE POLICY "employees_insert_authenticated" ON employees FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "employees_update_authenticated" ON employees;
CREATE POLICY "employees_update_authenticated" ON employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "employees_delete_authenticated" ON employees;
CREATE POLICY "employees_delete_authenticated" ON employees FOR DELETE TO authenticated USING (true);

-- Employee ↔ Services
CREATE TABLE IF NOT EXISTS employee_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, service_id)
);

ALTER TABLE employee_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emp_services_select_authenticated" ON employee_services;
CREATE POLICY "emp_services_select_authenticated" ON employee_services FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "emp_services_insert_authenticated" ON employee_services;
CREATE POLICY "emp_services_insert_authenticated" ON employee_services FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "emp_services_delete_authenticated" ON employee_services;
CREATE POLICY "emp_services_delete_authenticated" ON employee_services FOR DELETE TO authenticated USING (true);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles_select_authenticated" ON roles;
CREATE POLICY "roles_select_authenticated" ON roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "roles_insert_authenticated" ON roles;
CREATE POLICY "roles_insert_authenticated" ON roles FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "roles_update_authenticated" ON roles;
CREATE POLICY "roles_update_authenticated" ON roles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "roles_delete_authenticated" ON roles;
CREATE POLICY "roles_delete_authenticated" ON roles FOR DELETE TO authenticated USING (true);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permissions_select_authenticated" ON permissions;
CREATE POLICY "permissions_select_authenticated" ON permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "permissions_insert_authenticated" ON permissions;
CREATE POLICY "permissions_insert_authenticated" ON permissions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "permissions_update_authenticated" ON permissions;
CREATE POLICY "permissions_update_authenticated" ON permissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "permissions_delete_authenticated" ON permissions;
CREATE POLICY "permissions_delete_authenticated" ON permissions FOR DELETE TO authenticated USING (true);

-- Role ↔ Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rp_select_authenticated" ON role_permissions;
CREATE POLICY "rp_select_authenticated" ON role_permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rp_insert_authenticated" ON role_permissions;
CREATE POLICY "rp_insert_authenticated" ON role_permissions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "rp_delete_authenticated" ON role_permissions;
CREATE POLICY "rp_delete_authenticated" ON role_permissions FOR DELETE TO authenticated USING (true);

-- Employee ↔ Roles
CREATE TABLE IF NOT EXISTS employee_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, role_id)
);

ALTER TABLE employee_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "er_select_authenticated" ON employee_roles;
CREATE POLICY "er_select_authenticated" ON employee_roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "er_insert_authenticated" ON employee_roles;
CREATE POLICY "er_insert_authenticated" ON employee_roles FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "er_delete_authenticated" ON employee_roles;
CREATE POLICY "er_delete_authenticated" ON employee_roles FOR DELETE TO authenticated USING (true);

-- Audit logs (immutable — insert only, no update/delete)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  result text DEFAULT 'success',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_select_authenticated" ON audit_logs;
CREATE POLICY "audit_select_authenticated" ON audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "audit_insert_authenticated" ON audit_logs;
CREATE POLICY "audit_insert_authenticated" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_team ON employees(team_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_emp_services_emp ON employee_services(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Seed: Roles
INSERT INTO roles (name, description, is_system) VALUES
  ('مدیر کل', 'دسترسی کامل به تمام بخش‌های سیستم', true),
  ('مدیر بخش', 'مدیریت یک یا چند بخش خاص', true),
  ('کارمند', 'کارمند عادی با دسترسی محدود', true),
  ('اپراتور', 'اپراتور با تمرکز روی عملیات روزانه', true),
  ('مشاهده‌گر', 'فقط مشاهده داده‌ها بدون امکان تغییر', true)
ON CONFLICT (name) DO NOTHING;

-- Seed: Permissions
INSERT INTO permissions (key, label, category) VALUES
  ('customers.view', 'مشاهده مشتریان', 'crm'),
  ('customers.edit', 'ویرایش مشتریان', 'crm'),
  ('customers.delete', 'حذف مشتریان', 'crm'),
  ('leads.view', 'مشاهده سرنخ‌ها', 'crm'),
  ('leads.edit', 'ویرایش سرنخ‌ها', 'crm'),
  ('leads.delete', 'حذف سرنخ‌ها', 'crm'),
  ('messages.view', 'مشاهده پیام‌ها', 'messaging'),
  ('messages.send', 'ارسال پیام', 'messaging'),
  ('messages.assign', 'اختصاص مکالمه', 'messaging'),
  ('content.view', 'مشاهده محتوا', 'content'),
  ('content.create', 'ایجاد محتوا', 'content'),
  ('content.approve', 'تأیید محتوا', 'content'),
  ('content.publish', 'انتشار محتوا', 'content'),
  ('campaigns.view', 'مشاهده کمپین‌ها', 'content'),
  ('campaigns.manage', 'مدیریت کمپین‌ها', 'content'),
  ('services.manage', 'مدیریت خدمات', 'system'),
  ('phone_numbers.manage', 'مدیریت شماره‌ها', 'system'),
  ('employees.view', 'مشاهده کارکنان', 'system'),
  ('employees.manage', 'مدیریت کارکنان', 'system'),
  ('reports.view', 'مشاهده گزارش‌ها', 'system'),
  ('settings.manage', 'مدیریت تنظیمات', 'system'),
  ('audit.view', 'مشاهده لاگ امنیتی', 'system'),
  ('ai.use', 'استفاده از دستیار هوشمند', 'ai'),
  ('ai.manage', 'مدیریت دستیار هوشمند', 'ai')
ON CONFLICT (key) DO NOTHING;

-- Seed: Role permissions (مدیر کل gets all, مشاهده‌گر gets view-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'مدیر کل'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'مشاهده‌گر' AND p.key LIKE '%view'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'مدیر بخش' AND p.key IN ('customers.view','customers.edit','leads.view','leads.edit','messages.view','messages.send','messages.assign','content.view','content.create','content.approve','campaigns.view','employees.view','reports.view','ai.use')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'کارمند' AND p.key IN ('customers.view','customers.edit','leads.view','leads.edit','messages.view','messages.send','content.view','ai.use')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'اپراتور' AND p.key IN ('customers.view','leads.view','messages.view','messages.send','content.view','ai.use')
ON CONFLICT DO NOTHING;
