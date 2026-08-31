-- 007_grants_and_policies.sql
--
-- Four findings from the database audit. None was reachable through the app as
-- it stands; all four are the kind of grant that becomes reachable the moment
-- somebody adds a feature and assumes RLS has it covered.

-- ---------------------------------------------------------------- 1. TRUNCATE

-- TRUNCATE is not filtered by row-level security. Every other write on these
-- tables is gated by a policy; a TRUNCATE grant is a hole RLS cannot see into,
-- and `anon` is the key that ships inside the app bundle. Nothing has ever
-- needed it -- PostgREST cannot even issue it -- so it is pure exposure.
revoke truncate on all tables in schema public from anon, authenticated;

-- Neither role should be defining foreign keys or triggers on the bakery's
-- tables either. Both came from the default GRANT ALL, not from a decision.
revoke references, trigger on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------- 2. orders

-- Orders are created only by place_order, which is SECURITY DEFINER and so
-- unaffected by these grants, and they are never deleted -- a cancelled order
-- has to stay on the books. orders_no_direct_insert already refuses the insert;
-- dropping the grant means there is no longer anything to refuse.
revoke insert, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;

-- ---------------------------------------------------------------- 3. addresses

-- addresses_all_own put `is_staff()` in the USING clause of a FOR ALL policy,
-- which reads as "staff may see these" but grants UPDATE and DELETE too: any
-- staff account could wipe every customer's saved addresses.
--
-- Nothing in the dashboard reads this table. The delivery address is
-- snapshotted onto the order at checkout -- precisely so that editing or
-- deleting an address can never rewrite where a past order went -- so staff
-- have no reason to reach the address book at all.
drop policy if exists addresses_all_own on public.addresses;
create policy addresses_all_own on public.addresses
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------- 4. search_path

-- An unpinned search_path lets anyone who can create objects shadow the tables
-- and functions these resolve. None of the four is SECURITY DEFINER, so the
-- exposure is limited -- but is_staff() and is_admin() are the functions every
-- policy in this schema asks for permission, and pinning them costs nothing.
alter function public.is_staff() set search_path = public, pg_temp;
alter function public.is_admin() set search_path = public, pg_temp;
alter function public.normalise_mobile(text) set search_path = public, pg_temp;
alter function public.enforce_order_transition() set search_path = public, pg_temp;
