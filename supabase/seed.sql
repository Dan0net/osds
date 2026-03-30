-- OSDS Dev Seed Data
-- Run with: npm run db:reset
-- All test users have password: password123

-- ============================================================
-- AUTH USERS
-- ============================================================

-- Walker 1: Sarah (Hackney)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, confirmation_token) VALUES
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'sarah@test.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"name":"Sarah Mitchell"}'::jsonb, '');
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"sarah@test.com"}'::jsonb, 'email', now(), now(), now());

-- Walker 2: James (Bethnal Green)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, confirmation_token) VALUES
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'james@test.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"name":"James Okonkwo"}'::jsonb, '');
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"james@test.com"}'::jsonb, 'email', now(), now(), now());

-- Walker 3: Priya (Mile End)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, confirmation_token) VALUES
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'priya@test.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"name":"Priya Sharma"}'::jsonb, '');
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"priya@test.com"}'::jsonb, 'email', now(), now(), now());

-- Walker 4: Dan (Stratford)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, confirmation_token) VALUES
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'dan@test.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"name":"Dan Cooper"}'::jsonb, '');
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '{"sub":"44444444-4444-4444-4444-444444444444","email":"dan@test.com"}'::jsonb, 'email', now(), now(), now());

-- Walker 5: Meg (Bow)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, confirmation_token) VALUES
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'meg@test.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"name":"Meg Taylor"}'::jsonb, '');
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '{"sub":"55555555-5555-5555-5555-555555555555","email":"meg@test.com"}'::jsonb, 'email', now(), now(), now());

-- Client 1: Tom
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, confirmation_token) VALUES
  ('00000000-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tom@test.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"name":"Tom Henderson"}'::jsonb, '');
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), 'aaaa0001-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', '{"sub":"aaaa0001-0000-0000-0000-000000000000","email":"tom@test.com"}'::jsonb, 'email', now(), now(), now());

-- Client 2: Anya
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, confirmation_token) VALUES
  ('00000000-0000-0000-0000-000000000000', 'aaaa0002-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anya@test.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"name":"Anya Petrov"}'::jsonb, '');
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), 'aaaa0002-0000-0000-0000-000000000000', 'aaaa0002-0000-0000-0000-000000000000', '{"sub":"aaaa0002-0000-0000-0000-000000000000","email":"anya@test.com"}'::jsonb, 'email', now(), now(), now());

-- Client 3: Marcus
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, confirmation_token) VALUES
  ('00000000-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marcus@test.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"name":"Marcus Williams"}'::jsonb, '');
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), 'aaaa0003-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', '{"sub":"aaaa0003-0000-0000-0000-000000000000","email":"marcus@test.com"}'::jsonb, 'email', now(), now(), now());

-- Fix GoTrue NULL string scan errors: set all nullable text columns to empty string
UPDATE auth.users SET
  email_change = coalesce(email_change, ''),
  phone_change = coalesce(phone_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  recovery_token = coalesce(recovery_token, '');

-- handle_new_user() trigger creates public.users rows automatically.
-- Fill in avatars for walkers (people with dogs — Unsplash):
UPDATE public.users SET avatar_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=face' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.users SET avatar_url = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&crop=face' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.users SET avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=face' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE public.users SET avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face' WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE public.users SET avatar_url = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face' WHERE id = '55555555-5555-5555-5555-555555555555';
-- Fill in phone + avatars for clients:
UPDATE public.users SET phone = '07700900001', avatar_url = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face' WHERE id = 'aaaa0001-0000-0000-0000-000000000000';
UPDATE public.users SET phone = '07700900002', avatar_url = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=face' WHERE id = 'aaaa0002-0000-0000-0000-000000000000';
UPDATE public.users SET phone = '07700900003', avatar_url = 'https://i.pravatar.cc/300?u=marcus@test.com' WHERE id = 'aaaa0003-0000-0000-0000-000000000000';

-- ============================================================
-- WALKER PROFILES (5 walkers across East London)
-- ============================================================

INSERT INTO public.walker_profiles (id, user_id, slug, business_name, bio, postcode, lat, lng, stripe_account_id, theme_color, cover_url, calendar_feed_token, setup_completed_at) VALUES
  ('ab000001-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'sarah-mitchell', 'Sarah''s Happy Hounds', 'Hi! I''ve been walking dogs in Hackney for 5 years. I cover London Fields, Victoria Park, and the Marshes. All breeds and sizes welcome — I specialise in anxious rescue dogs.',
   'E8 3SB', 51.5416, -0.0566, 'acct_1TGpMNCsQ0XiMZsI', '#4f46e5',
   'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=400&fit=crop',
   encode(gen_random_bytes(16), 'hex'), now()),

  ('ab000002-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'james-okonkwo', 'Paws & Explore', 'Qualified dog behaviourist and walker based in Bethnal Green. I keep group sizes small (max 3 dogs) so every pup gets proper attention. DBS checked and fully insured.',
   'E2 0QN', 51.5271, -0.0556, 'acct_1TGpMNCsQ0XiMZsI', '#059669',
   'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=400&fit=crop',
   encode(gen_random_bytes(16), 'hex'), now()),

  ('ab000003-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'priya-sharma', 'Priya''s Pet Care', 'Veterinary nurse by training, dog walker by passion! Based near Mile End Park. I offer walks, home visits, and overnight stays. Your dog will be treated like family.',
   'E3 4QS', 51.5245, -0.0340, 'acct_1TGpMNCsQ0XiMZsI', '#dc2626',
   'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&h=400&fit=crop',
   encode(gen_random_bytes(16), 'hex'), now()),

  ('ab000004-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444',
   'dan-cooper', 'Cooper Canine Co', 'Ex-PT turned dog walker. I run high-energy walks around the Olympic Park and Lea Valley. Perfect for active breeds that need more than a stroll. Also do puppy socialisation groups.',
   'E20 1EJ', 51.5387, -0.0166, 'acct_1TGpMNCsQ0XiMZsI', '#f59e0b',
   'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=800&h=400&fit=crop',
   encode(gen_random_bytes(16), 'hex'), now()),

  ('ab000005-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555',
   'meg-taylor', 'Bow Wow Walks', 'Local Bow resident with two dogs of my own. I offer solo walks for nervous dogs and small group walks along the Regent''s Canal towpath. Flexible hours including early mornings.',
   'E3 2SE', 51.5290, -0.0196, 'acct_1TGpMNCsQ0XiMZsI', '#8b5cf6',
   'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=400&fit=crop',
   encode(gen_random_bytes(16), 'hex'), now());

-- ============================================================
-- SERVICES
-- ============================================================

INSERT INTO public.services (id, walker_id, name, price_cents, duration_minutes, description, service_type) VALUES
  -- Sarah (Hackney) — 4 services
  ('5e000001-0000-0000-0000-000000000000', 'ab000001-0000-0000-0000-000000000000', '30 Min Walk', 1500, 30, 'A quick loop around London Fields or the local streets', 'standard'),
  ('5e000002-0000-0000-0000-000000000000', 'ab000001-0000-0000-0000-000000000000', '60 Min Park Walk', 2500, 60, 'Full hour in Victoria Park with off-lead time', 'standard'),
  ('5e000003-0000-0000-0000-000000000000', 'ab000001-0000-0000-0000-000000000000', 'Puppy Visit', 1200, 30, 'Mid-day check-in, toilet break, and play for puppies', 'standard'),
  ('5e000004-0000-0000-0000-000000000000', 'ab000001-0000-0000-0000-000000000000', 'Overnight Stay', 4500, 1440, 'Your dog stays at my home overnight with garden access', 'overnight'),

  -- James (Bethnal Green) — 3 services
  ('5e000005-0000-0000-0000-000000000000', 'ab000002-0000-0000-0000-000000000000', '45 Min Behaviour Walk', 2000, 45, 'Structured walk focused on lead manners and recall', 'standard'),
  ('5e000006-0000-0000-0000-000000000000', 'ab000002-0000-0000-0000-000000000000', '60 Min Group Walk', 2200, 60, 'Small group (max 3 dogs) in Victoria Park', 'standard'),
  ('5e000007-0000-0000-0000-000000000000', 'ab000002-0000-0000-0000-000000000000', 'Overnight Stay', 5500, 1440, 'Overnight boarding in my flat with evening and morning walks', 'overnight'),

  -- Priya (Mile End) — 4 services
  ('5e000008-0000-0000-0000-000000000000', 'ab000003-0000-0000-0000-000000000000', '30 Min Walk', 1400, 30, 'Quick walk around Mile End Park', 'standard'),
  ('5e000009-0000-0000-0000-000000000000', 'ab000003-0000-0000-0000-000000000000', '60 Min Canal Walk', 2400, 60, 'Longer walk along Regent''s Canal and Limehouse Cut', 'standard'),
  ('5e000010-0000-0000-0000-000000000000', 'ab000003-0000-0000-0000-000000000000', 'Home Visit', 1800, 45, 'Feeding, medication, and company at your home', 'standard'),
  ('5e000011-0000-0000-0000-000000000000', 'ab000003-0000-0000-0000-000000000000', 'Overnight Stay', 5000, 1440, 'Overnight care — vet nurse so happy to handle meds', 'overnight'),

  -- Dan (Stratford) — 3 services
  ('5e000012-0000-0000-0000-000000000000', 'ab000004-0000-0000-0000-000000000000', '60 Min Adventure Walk', 2800, 60, 'High-energy walk around the Olympic Park trails', 'standard'),
  ('5e000013-0000-0000-0000-000000000000', 'ab000004-0000-0000-0000-000000000000', 'Puppy Social Group', 2000, 45, 'Supervised socialisation session for puppies under 6 months', 'standard'),
  ('5e000014-0000-0000-0000-000000000000', 'ab000004-0000-0000-0000-000000000000', 'Day Care', 3800, 480, 'Full day of walks, play, and rest at my home', 'standard'),

  -- Meg (Bow) — 3 services
  ('5e000015-0000-0000-0000-000000000000', 'ab000005-0000-0000-0000-000000000000', '30 Min Solo Walk', 1600, 30, 'One-on-one walk for nervous or reactive dogs', 'standard'),
  ('5e000016-0000-0000-0000-000000000000', 'ab000005-0000-0000-0000-000000000000', '60 Min Canal Walk', 2300, 60, 'Relaxed walk along the towpath, small group of 2-3 dogs', 'standard'),
  ('5e000017-0000-0000-0000-000000000000', 'ab000005-0000-0000-0000-000000000000', 'Early Morning Walk', 1800, 30, 'Before-work walk, available from 6:30am', 'standard');

-- ============================================================
-- AVAILABILITY
-- ============================================================

INSERT INTO public.availability (walker_id, day_of_week, start_time, end_time) VALUES
  -- Sarah: Mon-Fri 9-17
  ('ab000001-0000-0000-0000-000000000000', 1, '09:00', '17:00'),
  ('ab000001-0000-0000-0000-000000000000', 2, '09:00', '17:00'),
  ('ab000001-0000-0000-0000-000000000000', 3, '09:00', '17:00'),
  ('ab000001-0000-0000-0000-000000000000', 4, '09:00', '17:00'),
  ('ab000001-0000-0000-0000-000000000000', 5, '09:00', '17:00'),
  -- James: Mon-Sat 8-16
  ('ab000002-0000-0000-0000-000000000000', 1, '08:00', '16:00'),
  ('ab000002-0000-0000-0000-000000000000', 2, '08:00', '16:00'),
  ('ab000002-0000-0000-0000-000000000000', 3, '08:00', '16:00'),
  ('ab000002-0000-0000-0000-000000000000', 4, '08:00', '16:00'),
  ('ab000002-0000-0000-0000-000000000000', 5, '08:00', '16:00'),
  ('ab000002-0000-0000-0000-000000000000', 6, '08:00', '14:00'),
  -- Priya: Mon-Fri 10-18
  ('ab000003-0000-0000-0000-000000000000', 1, '10:00', '18:00'),
  ('ab000003-0000-0000-0000-000000000000', 2, '10:00', '18:00'),
  ('ab000003-0000-0000-0000-000000000000', 3, '10:00', '18:00'),
  ('ab000003-0000-0000-0000-000000000000', 4, '10:00', '18:00'),
  ('ab000003-0000-0000-0000-000000000000', 5, '10:00', '18:00'),
  -- Dan: Mon-Sun 7-15
  ('ab000004-0000-0000-0000-000000000000', 1, '07:00', '15:00'),
  ('ab000004-0000-0000-0000-000000000000', 2, '07:00', '15:00'),
  ('ab000004-0000-0000-0000-000000000000', 3, '07:00', '15:00'),
  ('ab000004-0000-0000-0000-000000000000', 4, '07:00', '15:00'),
  ('ab000004-0000-0000-0000-000000000000', 5, '07:00', '15:00'),
  ('ab000004-0000-0000-0000-000000000000', 6, '07:00', '12:00'),
  ('ab000004-0000-0000-0000-000000000000', 7, '07:00', '12:00'),
  -- Meg: Mon-Sat 6:30-14
  ('ab000005-0000-0000-0000-000000000000', 1, '06:30', '14:00'),
  ('ab000005-0000-0000-0000-000000000000', 2, '06:30', '14:00'),
  ('ab000005-0000-0000-0000-000000000000', 3, '06:30', '14:00'),
  ('ab000005-0000-0000-0000-000000000000', 4, '06:30', '14:00'),
  ('ab000005-0000-0000-0000-000000000000', 5, '06:30', '14:00'),
  ('ab000005-0000-0000-0000-000000000000', 6, '08:00', '12:00');

-- ============================================================
-- PETS (for client users)
-- ============================================================

INSERT INTO public.pets (id, user_id, name, breed, weight, age, notes) VALUES
  ('ee000001-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 'Buddy', 'Labrador Retriever', 30, 4, 'Very friendly, loves water and fetch'),
  ('ee000002-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 'Luna', 'Cockapoo', 12, 2, 'Can be nervous around large dogs'),
  ('ee000003-0000-0000-0000-000000000000', 'aaaa0002-0000-0000-0000-000000000000', 'Ziggy', 'Whippet', 13, 3, 'Very fast, needs secure off-lead areas only'),
  ('ee000004-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', 'Bear', 'German Shepherd', 38, 5, 'Well trained but pulls on lead with new walkers'),
  ('ee000005-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', 'Pickle', 'Jack Russell Terrier', 7, 8, 'Older but still energetic. Takes daily joint supplement.');

-- ============================================================
-- BOOKINGS + PAYMENTS (needed for reviews — reviews require a booking)
-- ============================================================

-- Completed bookings for Tom → Sarah
INSERT INTO public.payments (id, walker_id, client_id, total_cents, platform_fee_cents, status, source) VALUES
  ('fae00001-0000-0000-0000-000000000000', 'ab000001-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 1500, 150, 'paid', 'stripe'),
  ('fae00002-0000-0000-0000-000000000000', 'ab000001-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 2500, 250, 'paid', 'stripe');

INSERT INTO public.bookings (id, walker_id, client_id, payment_id, service_id, pet_id, booking_date, start_time, status) VALUES
  ('bc000001-0000-0000-0000-000000000000', 'ab000001-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 'fae00001-0000-0000-0000-000000000000', '5e000001-0000-0000-0000-000000000000', 'ee000001-0000-0000-0000-000000000000', '2026-03-10', '10:00', 'confirmed'),
  ('bc000002-0000-0000-0000-000000000000', 'ab000001-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 'fae00002-0000-0000-0000-000000000000', '5e000002-0000-0000-0000-000000000000', 'ee000001-0000-0000-0000-000000000000', '2026-03-17', '09:00', 'confirmed');

-- Completed bookings for Anya → James
INSERT INTO public.payments (id, walker_id, client_id, total_cents, platform_fee_cents, status, source) VALUES
  ('fae00003-0000-0000-0000-000000000000', 'ab000002-0000-0000-0000-000000000000', 'aaaa0002-0000-0000-0000-000000000000', 2200, 220, 'paid', 'stripe');

INSERT INTO public.bookings (id, walker_id, client_id, payment_id, service_id, pet_id, booking_date, start_time, status) VALUES
  ('bc000003-0000-0000-0000-000000000000', 'ab000002-0000-0000-0000-000000000000', 'aaaa0002-0000-0000-0000-000000000000', 'fae00003-0000-0000-0000-000000000000', '5e000006-0000-0000-0000-000000000000', 'ee000003-0000-0000-0000-000000000000', '2026-03-12', '08:30', 'confirmed');

-- Completed bookings for Anya → Priya
INSERT INTO public.payments (id, walker_id, client_id, total_cents, platform_fee_cents, status, source) VALUES
  ('fae00004-0000-0000-0000-000000000000', 'ab000003-0000-0000-0000-000000000000', 'aaaa0002-0000-0000-0000-000000000000', 2400, 240, 'paid', 'stripe');

INSERT INTO public.bookings (id, walker_id, client_id, payment_id, service_id, pet_id, booking_date, start_time, status) VALUES
  ('bc000004-0000-0000-0000-000000000000', 'ab000003-0000-0000-0000-000000000000', 'aaaa0002-0000-0000-0000-000000000000', 'fae00004-0000-0000-0000-000000000000', '5e000009-0000-0000-0000-000000000000', 'ee000003-0000-0000-0000-000000000000', '2026-03-14', '11:00', 'confirmed');

-- Completed bookings for Marcus → Dan
INSERT INTO public.payments (id, walker_id, client_id, total_cents, platform_fee_cents, status, source) VALUES
  ('fae00005-0000-0000-0000-000000000000', 'ab000004-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', 2800, 280, 'paid', 'stripe'),
  ('fae00006-0000-0000-0000-000000000000', 'ab000004-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', 2800, 280, 'paid', 'stripe');

INSERT INTO public.bookings (id, walker_id, client_id, payment_id, service_id, pet_id, booking_date, start_time, status) VALUES
  ('bc000005-0000-0000-0000-000000000000', 'ab000004-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', 'fae00005-0000-0000-0000-000000000000', '5e000012-0000-0000-0000-000000000000', 'ee000004-0000-0000-0000-000000000000', '2026-03-08', '07:30', 'confirmed'),
  ('bc000006-0000-0000-0000-000000000000', 'ab000004-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', 'fae00006-0000-0000-0000-000000000000', '5e000012-0000-0000-0000-000000000000', 'ee000004-0000-0000-0000-000000000000', '2026-03-15', '07:30', 'confirmed');

-- Completed bookings for Marcus → Meg
INSERT INTO public.payments (id, walker_id, client_id, total_cents, platform_fee_cents, status, source) VALUES
  ('fae00007-0000-0000-0000-000000000000', 'ab000005-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', 1600, 160, 'paid', 'stripe');

INSERT INTO public.bookings (id, walker_id, client_id, payment_id, service_id, pet_id, booking_date, start_time, status) VALUES
  ('bc000007-0000-0000-0000-000000000000', 'ab000005-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', 'fae00007-0000-0000-0000-000000000000', '5e000015-0000-0000-0000-000000000000', 'ee000005-0000-0000-0000-000000000000', '2026-03-20', '06:30', 'confirmed');

-- Completed bookings for Tom → Meg
INSERT INTO public.payments (id, walker_id, client_id, total_cents, platform_fee_cents, status, source) VALUES
  ('fae00008-0000-0000-0000-000000000000', 'ab000005-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 2300, 230, 'paid', 'stripe');

INSERT INTO public.bookings (id, walker_id, client_id, payment_id, service_id, pet_id, booking_date, start_time, status) VALUES
  ('bc000008-0000-0000-0000-000000000000', 'ab000005-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 'fae00008-0000-0000-0000-000000000000', '5e000016-0000-0000-0000-000000000000', 'ee000002-0000-0000-0000-000000000000', '2026-03-18', '07:00', 'confirmed');

-- Completed booking for Tom → James
INSERT INTO public.payments (id, walker_id, client_id, total_cents, platform_fee_cents, status, source) VALUES
  ('fae00009-0000-0000-0000-000000000000', 'ab000002-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 2000, 200, 'paid', 'stripe');

INSERT INTO public.bookings (id, walker_id, client_id, payment_id, service_id, pet_id, booking_date, start_time, status) VALUES
  ('bc000009-0000-0000-0000-000000000000', 'ab000002-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 'fae00009-0000-0000-0000-000000000000', '5e000005-0000-0000-0000-000000000000', 'ee000001-0000-0000-0000-000000000000', '2026-03-22', '08:00', 'confirmed');

-- Completed booking for Anya → Meg
INSERT INTO public.payments (id, walker_id, client_id, total_cents, platform_fee_cents, status, source) VALUES
  ('fae00010-0000-0000-0000-000000000000', 'ab000005-0000-0000-0000-000000000000', 'aaaa0002-0000-0000-0000-000000000000', 1600, 160, 'paid', 'stripe');

INSERT INTO public.bookings (id, walker_id, client_id, payment_id, service_id, pet_id, booking_date, start_time, status) VALUES
  ('bc000010-0000-0000-0000-000000000000', 'ab000005-0000-0000-0000-000000000000', 'aaaa0002-0000-0000-0000-000000000000', 'fae00010-0000-0000-0000-000000000000', '5e000015-0000-0000-0000-000000000000', 'ee000003-0000-0000-0000-000000000000', '2026-03-19', '07:00', 'confirmed');

-- ============================================================
-- REVIEWS
-- ============================================================

INSERT INTO public.reviews (walker_id, client_id, booking_id, rating, comment) VALUES
  -- Sarah: 2 reviews
  ('ab000001-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 'bc000001-0000-0000-0000-000000000000',
   5, 'Sarah is amazing with Buddy. He comes back tired and happy every time. Highly recommend!'),
  ('ab000001-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 'bc000002-0000-0000-0000-000000000000',
   5, 'Another brilliant walk. Sarah sent photos and Buddy had a great time in Victoria Park.'),

  -- James: 2 reviews
  ('ab000002-0000-0000-0000-000000000000', 'aaaa0002-0000-0000-0000-000000000000', 'bc000003-0000-0000-0000-000000000000',
   4, 'James really knows dogs. Ziggy''s recall has improved loads since the group walks. Only 4 stars because pickup was a bit late.'),
  ('ab000002-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 'bc000009-0000-0000-0000-000000000000',
   5, 'Buddy loved the behaviour walk. James gave us great tips for loose-lead walking.'),

  -- Priya: 1 review
  ('ab000003-0000-0000-0000-000000000000', 'aaaa0002-0000-0000-0000-000000000000', 'bc000004-0000-0000-0000-000000000000',
   5, 'So reassuring having a vet nurse look after Ziggy. The canal walk was lovely and Priya sent updates throughout.'),

  -- Dan: 3 reviews
  ('ab000004-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', 'bc000005-0000-0000-0000-000000000000',
   5, 'Bear absolutely loved the Olympic Park run. Dan really tires him out — exactly what a German Shepherd needs!'),
  ('ab000004-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', 'bc000006-0000-0000-0000-000000000000',
   4, 'Great walk again. Bear was knackered. Would be nice to get a few more photos next time though.'),

  -- Meg: 3 reviews
  ('ab000005-0000-0000-0000-000000000000', 'aaaa0003-0000-0000-0000-000000000000', 'bc000007-0000-0000-0000-000000000000',
   5, 'Meg is so gentle with Pickle. Perfect for an older dog who gets overwhelmed in groups. The solo walk was exactly what she needed.'),
  ('ab000005-0000-0000-0000-000000000000', 'aaaa0001-0000-0000-0000-000000000000', 'bc000008-0000-0000-0000-000000000000',
   4, 'Luna was a bit nervous at first but Meg handled it really well. Nice canal walk. Will book again.'),
  ('ab000005-0000-0000-0000-000000000000', 'aaaa0002-0000-0000-0000-000000000000', 'bc000010-0000-0000-0000-000000000000',
   5, 'Ziggy can be tricky with new people but Meg was so patient. He settled in quickly. Brilliant service.');
