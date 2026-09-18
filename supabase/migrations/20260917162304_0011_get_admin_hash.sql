/*
# Check admin password hash and store result in a temp table
*/

CREATE OR REPLACE FUNCTION public.get_admin_hash_info()
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
