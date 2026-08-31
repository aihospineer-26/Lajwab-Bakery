-- 009_profile_email.sql
--
-- A place to keep the customer's name and email on the server.
--
-- profiles already held `name`, populated by handle_new_user from
-- raw_user_meta_data. Nothing in the app ever read it, so the name a customer
-- typed at checkout lived only in that device's localStorage -- lost on
-- reinstall, and invisible to the bakery. The email had nowhere to live at all:
-- auth.users.email holds the synthetic <phone>@phone.lajwabbakery.local address
-- the OTP bridge needs for the magic-link exchange, so a real one cannot go
-- there without colliding with sign-in.
--
-- Not unique, and not a credential: the customer signs in with a verified phone
-- number and nothing else. This is a contact detail the bakery can use to send
-- a receipt, and it stays optional.
alter table public.profiles
  add column if not exists email text;

-- Kept honest at the boundary rather than trusted from the client. Blank is
-- stored as null so "never given" and "given as empty" cannot diverge.
alter table public.profiles
  drop constraint if exists profiles_email_check;
alter table public.profiles
  add constraint profiles_email_check
  check (email is null or (email = lower(btrim(email)) and email like '%_@_%._%' and length(email) <= 254));
