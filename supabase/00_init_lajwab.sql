-- ==========================================================================
-- Lajwab Bakery — full schema for a FRESH Supabase project
-- ==========================================================================
--
--  Run this ONCE, top to bottom, in the Supabase SQL Editor.
--
--  This REPLACES 01_schema.sql, 03_place_order.sql, 04_addresses.sql,
--  05_addresses_optional_coords.sql and migrations/001. Those were written
--  for Grocwell at different times and conflict with each other — see
--  SUPABASE_SETUP.md for what specifically breaks. Do not run them.
--
--  Safe to re-run: every statement is idempotent.
--
-- ==========================================================================


-- ==========================================================================
-- 1 — ROLE HELPERS
-- ==========================================================================
-- Role lives in the JWT's app_metadata, which only the server can set, so a
-- client cannot escalate itself by editing local state.
-- (Named auth_role, not current_role — the latter is a reserved SQL keyword.)

create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb
      -> 'app_metadata' ->> 'role',
    'customer'
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable as $$
  select public.auth_role() in ('admin', 'delivery');
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.auth_role() = 'admin';
$$;


-- ==========================================================================
-- 2 — CATALOG
-- ==========================================================================
-- Ids are TEXT, not uuid: the catalog uses readable keys like 'lb-thaali-56'
-- which double as the bundled-photo lookup key in src/data/productImages.ts.

create table if not exists public.categories (
  id    text primary key,
  name  text not null,
  image text not null
);

create table if not exists public.products (
  id          text primary key,
  name        text not null,
  unit        text not null,
  price       integer not null check (price >= 0),
  mrp         integer check (mrp >= 0),
  image       text not null,
  category_id text not null references public.categories(id),
  description text not null,
  stock       integer not null default 0 check (stock >= 0)
);

create index if not exists products_category_id_idx on public.products(category_id);


-- ==========================================================================
-- 3 — ORDERS
-- ==========================================================================
--   placed → accepted → packed → out_for_delivery → delivered
--                                                 ↘ cancelled
-- Status values are never user-facing; the app maps them to display labels.

create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  total      integer not null default 0,
  item_count integer not null default 0,
  status     text not null default 'placed',
  created_at timestamptz not null default now()
);

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('placed', 'accepted', 'packed', 'out_for_delivery', 'delivered', 'cancelled'));

alter table public.orders alter column status set default 'placed';

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- Line items. name/price are snapshotted at purchase time so historical
-- orders stay correct after the catalog changes. Deliberately NO foreign key
-- to products: deleting a discontinued item must not erase order history.
create table if not exists public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  product_id        text not null,
  qty               integer not null check (qty > 0),
  price_at_purchase integer not null check (price_at_purchase >= 0),
  name_at_purchase  text not null,
  created_at        timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);


-- ==========================================================================
-- 4 — ADDRESSES
-- ==========================================================================
-- lat/lng are nullable: a customer may type an address the geocoder cannot
-- resolve, and that must not block checkout.

create table if not exists public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  line1      text not null,
  line2      text,
  city       text not null,
  pincode    text not null,
  lat        double precision,
  lng        double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists addresses_user_id_idx on public.addresses(user_id);


-- ==========================================================================
-- 5 — PROFILES
-- ==========================================================================

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text,
  phone      text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Customers sign in with a phone OTP, so new.phone is the reliable identifier;
-- full_name only exists when they came through the sign-up screen.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.phone)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ==========================================================================
-- 6 — ROW LEVEL SECURITY
-- ==========================================================================
-- Policies are PERMISSIVE and OR together, so a single stale policy from an
-- older schema file can silently re-open a table. This is the only set that
-- should exist — 01_schema.sql's differently-named policies must not be
-- present alongside it.

alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.addresses   enable row level security;
alter table public.profiles    enable row level security;

-- Drop the Grocwell-era policy names in case this runs on a project where
-- 01_schema.sql was applied first.
drop policy if exists "public read categories"  on public.categories;
drop policy if exists "public read products"    on public.products;
drop policy if exists "read own orders"         on public.orders;
drop policy if exists "insert own orders"       on public.orders;
drop policy if exists "read own order_items"    on public.order_items;
drop policy if exists "insert own order_items"  on public.order_items;
drop policy if exists "read own addresses"      on public.addresses;
drop policy if exists "insert own addresses"    on public.addresses;
drop policy if exists "update own addresses"    on public.addresses;
drop policy if exists "delete own addresses"    on public.addresses;

-- ---- catalog: world-readable, admin-writable ----
drop policy if exists categories_read_all on public.categories;
create policy categories_read_all on public.categories for select using (true);

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_read_all on public.products;
create policy products_read_all on public.products for select using (true);

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- orders ----
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (user_id = auth.uid() or public.is_staff());

-- Customers may only cancel, and only before the store has packed it.
drop policy if exists orders_cancel_own on public.orders;
create policy orders_cancel_own on public.orders
  for update using (user_id = auth.uid() and status in ('placed', 'accepted'))
  with check (user_id = auth.uid() and status = 'cancelled');

drop policy if exists orders_staff_update on public.orders;
create policy orders_staff_update on public.orders
  for update using (public.is_staff()) with check (public.is_staff());

-- Inserts go through place_order only, so a client cannot set its own total.
drop policy if exists orders_no_direct_insert on public.orders;
create policy orders_no_direct_insert on public.orders
  for insert with check (false);

-- ---- order_items ----
drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own on public.order_items
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

-- Writes happen only inside place_order (security definer), never direct.
drop policy if exists order_items_no_client_write on public.order_items;
create policy order_items_no_client_write on public.order_items
  for all using (false) with check (false);

-- ---- addresses ----
drop policy if exists addresses_all_own on public.addresses;
create policy addresses_all_own on public.addresses
  for all using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid());

-- ---- profiles ----
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (user_id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ==========================================================================
-- 7 — place_order
-- ==========================================================================
-- Atomic: validates stock, computes the total from the products table (never
-- trusts client-sent prices), inserts the order and its line items, and
-- decrements stock — so two people cannot both buy the last unit.
--
-- product_id is compared as TEXT. Casting it to uuid (as the old Grocwell
-- migration did) throws on ids like 'lb-thaali-56'.

create or replace function public.place_order(items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_order_id uuid;
  v_total    integer := 0;
  v_count    integer := 0;
  v_item     jsonb;
  v_product  public.products%rowtype;
  v_qty      integer;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to place an order';
  end if;

  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'Your cart is empty';
  end if;

  insert into public.orders (user_id, total, item_count, status)
  values (v_user_id, 0, 0, 'placed')
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(items) loop
    v_qty := (v_item ->> 'qty')::integer;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity';
    end if;

    -- Row lock prevents two orders overselling the same unit
    select * into v_product
    from public.products
    where id = v_item ->> 'product_id'
    for update;

    if not found then
      raise exception 'Product no longer available';
    end if;

    if v_product.stock < v_qty then
      raise exception '% is out of stock', v_product.name;
    end if;

    insert into public.order_items
      (order_id, product_id, qty, price_at_purchase, name_at_purchase)
    values
      (v_order_id, v_product.id, v_qty, v_product.price, v_product.name);

    update public.products
    set stock = stock - v_qty
    where id = v_product.id;

    v_total := v_total + (v_product.price * v_qty);
    v_count := v_count + v_qty;
  end loop;

  update public.orders
  set total = v_total, item_count = v_count
  where id = v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to authenticated;


-- ==========================================================================
-- AFTER RUNNING — verify
-- ==========================================================================
-- Every table must report rowsecurity = true:
--
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
--
-- Confirm no stale Grocwell policies survived (should return zero rows):
--
--   select tablename, policyname from pg_policies
--   where schemaname = 'public' and policyname like '%own%'
--     and policyname not in (
--       'orders_cancel_own', 'order_items_select_own',
--       'addresses_all_own', 'profiles_insert_own', 'profiles_update_own'
--     );
--
-- Then seed the catalog with 02_seed_lajwab.sql, and grant the owner admin:
--
--   update auth.users
--   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
--   where email = 'owner@example.com';
--
-- The role is baked into the JWT at login, so they must sign out and back in.
-- ==========================================================================
