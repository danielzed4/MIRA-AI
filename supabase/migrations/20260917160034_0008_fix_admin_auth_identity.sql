/*
# Fix admin auth user: create missing email identity

1. Problem
- The admin user was created via raw INSERT into auth.users (before the auth.identities table existed or was populated).
- This left the user without a row in auth.identities, which Supabase Auth requires to issue a session.
- The login endpoint returned: "Database error querying schema" (HTTP 500).

2. Fix
- Insert the missing email identity row into auth.identities for the existing admin user.
- Set instance_id to NULL (correct for single-instance setups).

3. Notes
- This is idempotent: the NOT EXISTS guard prevents duplicate identity rows.
- The password hash is already correct; only the identity linkage was missing.
*/

UPDATE auth.users
SET instance_id = NULL,
    updated_at = now()
WHERE email = 'admin@company.com'
  AND instance_id = '00000000-0000-0000-0000-000000000000';

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  now(),
  now()
FROM auth.users u
WHERE u.email = 'admin@company.com'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  );
