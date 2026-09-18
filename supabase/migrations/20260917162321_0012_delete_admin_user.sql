/*
# Delete and recreate admin user

The existing admin user was created via raw SQL INSERT into auth.users, which
caused persistent auth issues (missing identity row, password hash compatibility).
We delete the broken user and recreate it via the Auth API signup endpoint,
which properly populates all required tables (users, identities, etc.).

This function deletes the user. The frontend signup will be used to recreate.
*/

CREATE OR REPLACE FUNCTION public.delete_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM auth.users WHERE email = 'admin@company.com';
END;
$$;

SELECT public.delete_admin_user();

DROP FUNCTION public.delete_admin_user;
