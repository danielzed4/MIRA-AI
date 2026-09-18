/*
# Create profiles table and system settings

1. New Tables
- `profiles` — extends auth.users with employee-specific metadata (display name, role, avatar)
- `system_settings` — key-value store for platform-level configuration

2. Security
- Enable RLS on both tables.
- Authenticated users can read all profiles (internal company directory).
- Users can update only their own profile.
- Authenticated users can read/write system settings (internal platform, all users are trusted employees).

3. Notes
- This is an internal company management platform. All authenticated users are trusted employees.
- Role-based authorization (مدیر کل, مدیر بخش, کارمند, etc.) is enforced at the application layer
  via the `role` column on profiles, not through RLS.
- `profiles.id` references `auth.users.id` with ON DELETE CASCADE so deleting a user deletes their profile.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'کارمند',
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', 'کاربر جدید'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_authenticated" ON system_settings;
CREATE POLICY "settings_select_authenticated"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "settings_insert_authenticated" ON system_settings;
CREATE POLICY "settings_insert_authenticated"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "settings_update_authenticated" ON system_settings;
CREATE POLICY "settings_update_authenticated"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "settings_delete_authenticated" ON system_settings;
CREATE POLICY "settings_delete_authenticated"
  ON system_settings FOR DELETE
  TO authenticated
  USING (true);
