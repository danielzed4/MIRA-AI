/*
# Fix security advisor: revoke EXECUTE on handle_new_user

The handle_new_user() function is a trigger that auto-creates a profile on signup.
It should not be callable via the REST API. Revoke EXECUTE from anon and authenticated.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
