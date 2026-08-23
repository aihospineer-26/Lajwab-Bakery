-- ==========================================================================
-- Grocwell — Migration 001
-- order_items · order status lifecycle · profiles · RLS everywhere
-- ==========================================================================
--
--  HOW TO RUN
--  Paste into the Supabase SQL Editor and run ONE SECTION AT A TIME.
--  Stop if a section errors — later sections depend on earlier ones.
--
--  Section 0 is read-only. Run it FIRST and check the output against the
--  assumptions listed there before running anything else.
--
-- ==========================================================================


-- ==========================================================================
-- SECTION 0 — VERIFY ASSUMPTIONS (read-only, changes nothing)
-- ==========================================================================
-- This migration assumes:
--   (a) public.orders has a user_id uuid column referencing auth.users
--   (b) orders.id and products.id types match what order_items declares below
--   (c) existing orders.status values are only:
--       'Processing' | 'Out for Delivery' | 'Delivered' | 'Cancelled'
--
-- Run this and confirm before continuing. If orders.id or products.id is not
-- uuid, change the column types in SECTION 3 to match.

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('orders', 'products', 'addresses', 'categories')
order by table_name, ordinal_position;

-- Distinct statuses currently in use — SECTION 2 must map every value here:
select status, count(*) from public.orders group by status;

-- Existing place_order definition — keep a copy before SECTION 6 replaces it:
select prosrc from pg_proc where proname = 'place_order';


-- ==========================================================================
-- SECTION 1 — ROLE HELPER
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
returns boolean
language sql
stable
as $$
  select public.auth_role() in ('admin', 'delivery');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.auth_role() = 'admin';
$$;


-- ==========================================================================
-- SECTION 2 — ORDER STATUS LIFECYCLE
-- ==========================================================================
--   placed → accepted → packed → out_for_delivery → delivered
--                                                 ↘ cancelled
--
-- Existing Title Case values are migrated to snake_case. The app maps these
-- back to display labels, so status values are never user-facing strings.

alter table public.orders drop constraint if exists orders_status_check;

update public.orders
set status = case status
  when 'Processing'       then 'placed'
  when 'Out for Delivery' then 'out_for_delivery'
  when 'Delivered'        then 'delivered'
  when 'Cancelled'        then 'cancelled'
  else lower(replace(status, ' ', '_'))
end
where status <> lower(replace(status, ' ', '_'));

alter table public.orders
  add constraint orders_status_check
  check (status in ('placed', 'accepted', 'packed', 'out_for_delivery', 'delivered', 'cancelled'));

alter table public.orders alter column status set default 'placed';


-- ==========================================================================
-- SECTION 3 — order_items
-- ==========================================================================
-- price/name are snapshotted at purchase time so historical orders stay
-- correct after the catalog changes price or a product is renamed/deleted.
--
-- NOTE: adjust order_id / product_id types here if SECTION 0 showed
-- something other than uuid.

create table if not exists public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  product_id        uuid not null references public.products(id),
  qty               integer not null check (qty > 0),
  price_at_purchase numeric(10, 2) not null check (price_at_purchase >= 0),
  name_at_purchase  text not null,
  created_at        timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

alter table public.order_items enable row level security;

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


-- ==========================================================================
-- SECTION 4 — profiles
-- ==========================================================================

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text,
  phone      text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (user_id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ==========================================================================
-- SECTION 5 — RLS ON EXISTING TABLES
-- ==========================================================================
-- Until now these were open. This is the section that actually closes the
-- data leak — without it any authenticated user can read every other user's
-- orders and addresses.

-- ---- orders ----
alter table public.orders enable row level security;

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (user_id = auth.uid() or public.is_staff());

-- Customers may only cancel, and only before the store has packed it.
drop policy if exists orders_cancel_own on public.orders;
create policy orders_cancel_own on public.orders
  for update using (
    user_id = auth.uid() and status in ('placed', 'accepted')
  ) with check (
    user_id = auth.uid() and status = 'cancelled'
  );

-- Staff may move an order along the lifecycle.
drop policy if exists orders_staff_update on public.orders;
create policy orders_staff_update on public.orders
  for update using (public.is_staff()) with check (public.is_staff());

-- Inserts go through place_order only.
drop policy if exists orders_no_direct_insert on public.orders;
create policy orders_no_direct_insert on public.orders
  for insert with check (false);

-- ---- addresses ----
alter table public.addresses enable row level security;

drop policy if exists addresses_all_own on public.addresses;
create policy addresses_all_own on public.addresses
  for all using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid());

-- ---- products / categories: readable by all, writable by admin only ----
alter table public.products enable row level security;

drop policy if exists products_read_all on public.products;
create policy products_read_all on public.products for select using (true);

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.categories enable row level security;

drop policy if exists categories_read_all on public.categories;
create policy categories_read_all on public.categories for select using (true);

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());


-- ==========================================================================
-- SECTION 6 — place_order (REPLACES the existing function)
-- ==========================================================================
--   !! Compare against the prosrc output from SECTION 0 first. If your
--   !! existing function has logic not represented here, merge it in before
--   !! running this.
--
-- Prices are read from the products table, never from the client, so a
-- tampered request cannot set its own total.

create or replace function public.place_order(items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_order_id uuid;
  v_total    numeric(10, 2) := 0;
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
    where id = (v_item ->> 'product_id')::uuid
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
-- AFTER RUNNING
-- ==========================================================================
-- Assign yourself the admin role (replace the email), then sign out and back
-- in — the role is baked into the JWT at login:
--
--   update auth.users
--   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
--   where email = 'you@example.com';
--
-- Verify RLS is on for every table:
--
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public';
-- ==========================================================================
