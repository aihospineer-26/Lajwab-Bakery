-- ==========================================================================
-- Lajwab Bakery — Migration 002
-- delivery details on orders · server-side coupons · first-order gating
-- ==========================================================================
--
--  HOW TO RUN
--  Paste into the Supabase SQL Editor and run ONE SECTION AT A TIME.
--  Requires 00_init_lajwab.sql to have run first.
--
--  WHY
--  Before this, place_order(items) took items only. The delivery address,
--  payment method and slot the customer chose were discarded at the client
--  boundary, so an order arrived with no idea where to deliver it. Discounts
--  were client-side only: the customer saw one total and the order recorded
--  another.
--
-- ==========================================================================


-- ==========================================================================
-- SECTION 1 — order detail columns
-- ==========================================================================
-- The address is snapshotted as jsonb, not referenced by id, so editing or
-- deleting a saved address never rewrites where a past order actually went.

alter table public.orders
  add column if not exists delivery_address jsonb,
  add column if not exists payment_method   text,
  add column if not exists delivery_slot    text,
  add column if not exists coupon_code      text,
  add column if not exists discount         integer not null default 0,
  add column if not exists delivery_fee     integer not null default 0;

alter table public.orders
  drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method is null or payment_method in ('cod', 'upi', 'card'));


-- ==========================================================================
-- SECTION 2 — coupons
-- ==========================================================================
-- The COUPONS array in src/data/offers.ts is presentation only. These rows are
-- the authority: the client can ask for a code but never sets its value.

create table if not exists public.coupons (
  code             text primary key,
  type             text not null check (type in ('flat', 'percent', 'freeship')),
  value            integer not null default 0,
  max_discount     integer,
  min_order        integer not null default 0,
  first_order_only boolean not null default false,
  per_user_limit   integer,
  valid_from       timestamptz not null default now(),
  valid_till       timestamptz,
  active           boolean not null default true
);

alter table public.coupons enable row level security;

drop policy if exists "public read coupons" on public.coupons;
create policy "public read coupons" on public.coupons
  for select using (active);

drop policy if exists "admin write coupons" on public.coupons;
create policy "admin write coupons" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.coupons
  (code, type, value, max_discount, min_order, first_order_only, valid_till) values
  ('FIRST50',     'percent',  50, 1000,   0, true,  '2026-09-30 23:59:59+05:30'),
  ('JANMASHTAMI', 'flat',    151, null, 999, false, '2026-09-03 23:59:59+05:30'),
  ('LAJWAB100',   'flat',    100, null, 599, false, '2026-09-30 23:59:59+05:30'),
  ('FREESHIP',    'freeship',  0, null,   0, false, '2026-09-30 23:59:59+05:30')
on conflict (code) do update set
  type             = excluded.type,
  value            = excluded.value,
  max_discount     = excluded.max_discount,
  min_order        = excluded.min_order,
  first_order_only = excluded.first_order_only,
  valid_till       = excluded.valid_till;


-- ==========================================================================
-- SECTION 3 — place_order
-- ==========================================================================
-- Replaces the 1-arg version. Prices still come from the products table and
-- the discount is computed here, so a tampered client can set neither.

drop function if exists public.place_order(jsonb);

create or replace function public.place_order(items jsonb, details jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_order_id     uuid;
  v_subtotal     integer := 0;
  v_item_count   integer := 0;
  v_item         jsonb;
  v_product_id   text;
  v_qty          integer;
  v_price        integer;
  v_stock        integer;
  v_code         text;
  v_coupon       public.coupons%rowtype;
  v_discount     integer := 0;
  v_delivery_fee integer := 0;
  v_prior        integer := 0;
  v_payment      text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to place an order';
  end if;

  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if details -> 'delivery_address' is null then
    raise exception 'A delivery address is required';
  end if;

  v_payment := coalesce(details ->> 'payment_method', 'cod');
  v_delivery_fee := coalesce((details ->> 'delivery_fee')::integer, 0);

  -- Validate stock and subtotal, locking each product row.
  for v_item in select * from jsonb_array_elements(items)
  loop
    v_product_id := v_item ->> 'product_id';
    v_qty := (v_item ->> 'qty')::integer;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for %', v_product_id;
    end if;

    select price, stock into v_price, v_stock
    from public.products where id = v_product_id
    for update;

    if v_price is null then
      raise exception 'Product % not found', v_product_id;
    end if;

    if v_stock < v_qty then
      raise exception 'Not enough stock for %', v_product_id;
    end if;

    v_subtotal := v_subtotal + v_price * v_qty;
    v_item_count := v_item_count + v_qty;
  end loop;

  -- An invalid coupon is an error, never a silent drop, so the customer is
  -- never charged a total different from the one they agreed to.
  v_code := upper(trim(coalesce(details ->> 'coupon_code', '')));
  if v_code <> '' then
    select * into v_coupon from public.coupons
    where code = v_code
      and active
      and valid_from <= now()
      and (valid_till is null or valid_till >= now());

    if v_coupon.code is null then
      raise exception 'Coupon % is not valid', v_code;
    end if;

    if v_subtotal < v_coupon.min_order then
      raise exception 'Coupon % needs a minimum order of %', v_code, v_coupon.min_order;
    end if;

    if v_coupon.first_order_only then
      select count(*) into v_prior from public.orders where user_id = auth.uid();
      if v_prior > 0 then
        raise exception 'Coupon % is valid on your first order only', v_code;
      end if;
    end if;

    if v_coupon.per_user_limit is not null then
      select count(*) into v_prior
      from public.orders
      where user_id = auth.uid() and coupon_code = v_code;
      if v_prior >= v_coupon.per_user_limit then
        raise exception 'Coupon % has already been used', v_code;
      end if;
    end if;

    if v_coupon.type = 'flat' then
      v_discount := least(v_coupon.value, v_subtotal);
    elsif v_coupon.type = 'percent' then
      v_discount := round(v_subtotal * v_coupon.value / 100.0);
      if v_coupon.max_discount is not null then
        v_discount := least(v_discount, v_coupon.max_discount);
      end if;
    elsif v_coupon.type = 'freeship' then
      v_delivery_fee := 0;
    end if;
  end if;

  insert into public.orders (
    user_id, total, item_count, status,
    delivery_address, payment_method, delivery_slot,
    coupon_code, discount, delivery_fee
  )
  values (
    auth.uid(),
    greatest(v_subtotal - v_discount + v_delivery_fee, 0),
    v_item_count,
    'placed',
    details -> 'delivery_address',
    v_payment,
    details ->> 'delivery_slot',
    nullif(v_code, ''),
    v_discount,
    v_delivery_fee
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(items)
  loop
    v_product_id := v_item ->> 'product_id';
    v_qty := (v_item ->> 'qty')::integer;

    insert into public.order_items (order_id, product_id, qty, price_at_purchase, name_at_purchase)
    select v_order_id, id, v_qty, price, name
    from public.products where id = v_product_id;

    update public.products set stock = stock - v_qty where id = v_product_id;
  end loop;

  return v_order_id;
end;
$fn$;

grant execute on function public.place_order(jsonb, jsonb) to authenticated;


-- ==========================================================================
-- Verify
-- ==========================================================================
--   select column_name, data_type from information_schema.columns
--   where table_name = 'orders' order by ordinal_position;
--
--   select code, type, value, first_order_only from public.coupons;
-- ==========================================================================
