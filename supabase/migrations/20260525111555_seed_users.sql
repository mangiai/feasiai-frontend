-- Seed 5 FeasiAI users (1 super_admin + 4 regular users)
-- Password for all accounts: FeasiAI2026!
--
-- Note: A trigger on auth.users auto-creates profiles, so we use
-- ON CONFLICT ... DO UPDATE to set the correct values.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  pw_hash text;
  now_ts  timestamptz := now();

  id_admin   uuid := 'a0000000-0000-4000-8000-000000000001';
  id_alice   uuid := 'a0000000-0000-4000-8000-000000000002';
  id_bob     uuid := 'a0000000-0000-4000-8000-000000000003';
  id_carol   uuid := 'a0000000-0000-4000-8000-000000000004';
  id_david   uuid := 'a0000000-0000-4000-8000-000000000005';
BEGIN
  pw_hash := extensions.crypt('FeasiAI2026!', extensions.gen_salt('bf', 10));

  -- 1. Super Admin — admin@feasiai.com
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', id_admin, 'authenticated', 'authenticated', 'admin@feasiai.com', pw_hash, now_ts, now_ts, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"FeasiAI Admin"}'::jsonb, now_ts, now_ts)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (id_admin, id_admin, id_admin::text, 'email', jsonb_build_object('sub', id_admin::text, 'email', 'admin@feasiai.com'), now_ts, now_ts, now_ts)
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name, system_role, onboarding_status, account_type)
  VALUES (id_admin, 'admin@feasiai.com', 'FeasiAI Admin', 'super_admin', 'completed', 'individual')
  ON CONFLICT (id) DO UPDATE SET system_role = 'super_admin', full_name = 'FeasiAI Admin', onboarding_status = 'completed';

  -- 2. Alice Chen — Developer
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', id_alice, 'authenticated', 'authenticated', 'alice@feasiai.com', pw_hash, now_ts, now_ts, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Alice Chen"}'::jsonb, now_ts, now_ts)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (id_alice, id_alice, id_alice::text, 'email', jsonb_build_object('sub', id_alice::text, 'email', 'alice@feasiai.com'), now_ts, now_ts, now_ts)
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name, onboarding_status, account_type, profession)
  VALUES (id_alice, 'alice@feasiai.com', 'Alice Chen', 'completed', 'individual', 'developer')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Alice Chen', onboarding_status = 'completed', profession = 'developer';

  -- 3. Bob Martinez — Architect
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', id_bob, 'authenticated', 'authenticated', 'bob@feasiai.com', pw_hash, now_ts, now_ts, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Bob Martinez"}'::jsonb, now_ts, now_ts)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (id_bob, id_bob, id_bob::text, 'email', jsonb_build_object('sub', id_bob::text, 'email', 'bob@feasiai.com'), now_ts, now_ts, now_ts)
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name, onboarding_status, account_type, profession)
  VALUES (id_bob, 'bob@feasiai.com', 'Bob Martinez', 'completed', 'individual', 'architect')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Bob Martinez', onboarding_status = 'completed', profession = 'architect';

  -- 4. Carol Williams — Investor
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', id_carol, 'authenticated', 'authenticated', 'carol@feasiai.com', pw_hash, now_ts, now_ts, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Carol Williams"}'::jsonb, now_ts, now_ts)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (id_carol, id_carol, id_carol::text, 'email', jsonb_build_object('sub', id_carol::text, 'email', 'carol@feasiai.com'), now_ts, now_ts, now_ts)
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name, onboarding_status, account_type, profession)
  VALUES (id_carol, 'carol@feasiai.com', 'Carol Williams', 'completed', 'company', 'investor')
  ON CONFLICT (id) DO UPDATE SET full_name = 'Carol Williams', onboarding_status = 'completed', account_type = 'company', profession = 'investor';

  -- 5. David Kim — Consultant
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', id_david, 'authenticated', 'authenticated', 'david@feasiai.com', pw_hash, now_ts, now_ts, '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"David Kim"}'::jsonb, now_ts, now_ts)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (id_david, id_david, id_david::text, 'email', jsonb_build_object('sub', id_david::text, 'email', 'david@feasiai.com'), now_ts, now_ts, now_ts)
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name, onboarding_status, account_type, profession)
  VALUES (id_david, 'david@feasiai.com', 'David Kim', 'completed', 'individual', 'consultant')
  ON CONFLICT (id) DO UPDATE SET full_name = 'David Kim', onboarding_status = 'completed', profession = 'consultant';

END $$;
