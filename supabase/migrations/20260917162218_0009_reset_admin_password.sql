/*
# Reset admin password

The crypt() and gen_salt() functions live in the "extensions" schema on this
Supabase project. We use a SECURITY DEFINER function to update auth.users.
*/

CREATE OR REPLACE FUNCTION public.reset_admin_password()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = extensions.crypt('Adm1n!2026#Sec', extensions.gen_salt('bf'::text, 10)),
      updated_at = now()
  WHERE email = 'admin@company.com';
END;
$$;

SELECT public.reset_admin_password();

DROP FUNCTION public.reset_admin_password;
