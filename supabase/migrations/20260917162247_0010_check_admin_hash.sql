/*
# Check and fix admin password hash format

Supabase Auth expects bcrypt hashes with $2a$ prefix. pgcrypto's gen_salt('bf')
produces $2a$ hashes, but let's verify and also try a different approach:
delete the existing user and recreate via the signup API.
*/

CREATE OR REPLACE FUNCTION public.check_admin_password()
RETURNS TABLE(email text, hash_prefix text, hash_len int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT u.email::text, left(u.encrypted_password, 7)::text, length(u.encrypted_password)::int
  FROM auth.users u
  WHERE u.email = 'admin@company.com';
END;
$$;

SELECT * FROM public.check_admin_password();

DROP FUNCTION public.check_admin_password;
