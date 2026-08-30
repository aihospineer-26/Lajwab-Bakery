-- ==========================================================================
-- Lajwab Bakery — Migration 004
-- Remediation of the 30 Aug 2026 pre-launch audit
-- ==========================================================================
--
--  Supersedes 003_customer_contact.sql, which was written but never applied.
--  Everything 003 intended is here, plus the fixes for the issues the audit
--  found. Safe to re-run: every statement is idempotent.
--
--  Fixes, in the order the sections appear:
--    BUG-01  orders carried no customer name or phone
--    BUG-08  orders.total / discount / delivery_fee could go negative
--    BUG-04  a double-tapped checkout created two orders
--    BUG-06  serviceability was enforced only in the app
--    BUG-03  a customer could rewrite the money on their own order
--    BUG-05  any order status could become any other
--    BUG-02  cancelling an order never restored stock
--    BUG-07  the delivery address accepted null / a string / {}
--    BUG-12  split cart lines were validated against unmodified stock
--    BUG-14  nothing capped cart size
--    BUG-15  nothing capped address field lengths
--
-- ==========================================================================


-- ==========================================================================
-- SECTION 1 — customer contact on the order            [BUG-01]
-- ==========================================================================
-- The bakery delivers by hand and rings ahead. Before this the app collected
-- a name and a verified phone, sent both, and place_order dropped them.

alter table public.orders add column if not exists customer_name  text;
alter table public.orders add column if not exists customer_phone text;

create index if not exists orders_customer_phone_idx
  on public.orders (customer_phone);

-- '+91 98765 43210', '098765 43210' and '9876543210' are one customer.
-- Stored as the bare 10 digits so a coupon limit cannot be defeated by
-- retyping the number in a different format.
create or replace function public.normalise_mobile(raw text)
returns text
language sql
immutable
as $fn$
  select right(regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g'), 10);
$fn$;


-- ==========================================================================
-- SECTION 2 — money can never be negative              [BUG-08]
-- ==========================================================================
-- products.price and products.stock already had these; orders did not, which
-- is what let a tampered PATCH write a negative revenue line.

alter table public.orders drop constraint if exists orders_total_check;
alter table public.orders add  constraint orders_total_check        check (total >= 0);

alter table public.orders drop constraint if exists orders_discount_check;
alter table public.orders add  constraint orders_discount_check     check (discount >= 0);

alter table public.orders drop constraint if exists orders_delivery_fee_check;
alter table public.orders add  constraint orders_delivery_fee_check check (delivery_fee >= 0);


-- ==========================================================================
-- SECTION 3 — checkout idempotency                     [BUG-04]
-- ==========================================================================
-- The client mints one uuid per checkout attempt. Retrying a request whose
-- response was lost returns the original order instead of placing a second.
-- Scoped per user so two customers cannot collide on a shared value.

alter table public.orders add column if not exists request_id uuid;

create unique index if not exists orders_user_request_idx
  on public.orders (user_id, request_id)
  where request_id is not null;


-- ==========================================================================
-- SECTION 4 — where the bakery actually delivers       [BUG-06]
-- ==========================================================================
-- A table rather than a constant, so widening the delivery area is a row the
-- owner can add rather than an app release.

create table if not exists public.serviceable_pincodes (
  pincode text primary key,
  area    text not null,
  active  boolean not null default true
);

insert into public.serviceable_pincodes (pincode, area) values ('110058', 'Janakpuri')
on conflict (pincode) do update set area = excluded.area, active = true;

alter table public.serviceable_pincodes enable row level security;

drop policy if exists serviceable_read_all on public.serviceable_pincodes;
create policy serviceable_read_all on public.serviceable_pincodes
  for select using (active);

drop policy if exists serviceable_admin_write on public.serviceable_pincodes;
create policy serviceable_admin_write on public.serviceable_pincodes
  for all using (public.is_admin()) with check (public.is_admin());


-- ==========================================================================
-- SECTION 5 — a customer may write status, nothing else  [BUG-03]
-- ==========================================================================
-- Row level security gates rows, not columns: orders_cancel_own checked
-- user_id and status and let the same statement rewrite total, discount and
-- delivery_fee alongside them. Column privileges are the missing half.
--
-- Both customers and staff authenticate as `authenticated`; neither client
-- path updates any column but status, so one grant covers both. place_order
-- and the triggers below are security definer and unaffected.

revoke update on public.orders from authenticated, anon;
grant  update (status) on public.orders to authenticated;


-- ==========================================================================
-- SECTION 6 — the order state machine                  [BUG-05]
-- ==========================================================================
--   placed -> accepted -> packed -> out_for_delivery -> delivered
--   anything not yet finished -> cancelled
--   delivered and cancelled are terminal
--
-- The CHECK constraint validates the status value; this validates the move.

create or replace function public.enforce_order_transition()
returns trigger
language plpgsql
as $fn$
begin
  -- a write that does not change the status is not a transition
  if new.status = old.status then
    return new;
  end if;

  if old.status in ('delivered', 'cancelled') then
    raise exception 'This order is already % and cannot be changed', old.status
      using errcode = 'check_violation';
  end if;

  -- anything still in flight may be called off
  if new.status = 'cancelled' then
    return new;
  end if;

  if not (
       (old.status = 'placed'           and new.status = 'accepted')
    or (old.status = 'accepted'         and new.status = 'packed')
    or (old.status = 'packed'           and new.status = 'out_for_delivery')
    or (old.status = 'out_for_delivery' and new.status = 'delivered')
  ) then
    raise exception 'An order cannot move from % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

drop trigger if exists orders_transition_guard on public.orders;
create trigger orders_transition_guard
  before update on public.orders
  for each row execute function public.enforce_order_transition();


-- ==========================================================================
-- SECTION 7 — cancelling puts the goods back on sale   [BUG-02]
-- ==========================================================================
-- place_order decrements stock inside its transaction and nothing ever put it
-- back, so every cancellation shrank what the bakery could sell for good.
--
-- Lives on the table rather than in the two client call sites, so a
-- cancellation from the dashboard, the app or a direct API call is covered by
-- the same code, in the same transaction as the status change.
--
-- Fires only on the edge into 'cancelled', so cancelling twice restores once.
-- Quantities are folded per product first, so a multi-line order returns each
-- product exactly once even if it appears on several lines.
-- security definer: the customer cancelling has no write access to products.

create or replace function public.restore_order_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.products p
       set stock = p.stock + agg.qty
      from (
        select product_id, sum(qty)::integer as qty
          from public.order_items
         where order_id = new.id
         group by product_id
      ) agg
     where p.id = agg.product_id;
  end if;
  return null;
end;
$fn$;

drop trigger if exists orders_restore_stock on public.orders;
create trigger orders_restore_stock
  after update on public.orders
  for each row execute function public.restore_order_stock();


-- ==========================================================================
-- SECTION 8 — place_order
-- ==========================================================================
-- Replaces the version from 002. Prices and the discount are still computed
-- here from the products and coupons tables, so a tampered client can set
-- neither -- that part is unchanged and still covered by the pricing tests.
--
-- New: the verified phone is read from the session rather than trusted from
-- the request, duplicate cart lines are folded before stock is checked, the
-- address is validated for shape and serviceability, cart size and field
-- lengths are capped, and a repeated request_id returns the original order.

-- The 002 version declared `details jsonb default '{}'`, and a default cannot
-- be removed by CREATE OR REPLACE, so the old signature is dropped first.
drop function if exists public.place_order(jsonb, jsonb);

create function public.place_order(items jsonb, details jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id      uuid := auth.uid();
  v_order_id     uuid;
  v_existing     uuid;
  v_request_id   uuid;
  v_item         jsonb;
  v_product_id   text;
  v_qty          integer;
  v_price        integer;
  v_stock        integer;
  v_subtotal     integer := 0;
  v_item_count   integer := 0;
  v_lines        integer := 0;
  v_coupon       public.coupons%rowtype;
  v_code         text;
  v_discount     integer := 0;
  v_delivery_fee integer := 0;
  v_prior        integer := 0;
  v_payment      text;
  v_name         text;
  v_phone        text;
  v_verified     text;
  v_addr         jsonb;
  v_pincode      text;
  v_cart         jsonb;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to place an order';
  end if;

  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Cart is empty';
  end if;

  -- ---- idempotency ------------------------------------------------ [04]
  begin
    v_request_id := nullif(trim(coalesce(details ->> 'request_id', '')), '')::uuid;
  exception when others then
    raise exception 'Invalid request id';
  end;

  if v_request_id is not null then
    select id into v_existing
      from public.orders
     where user_id = v_user_id and request_id = v_request_id;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  -- ---- delivery address --------------------------------------- [06][07]
  v_addr := details -> 'delivery_address';

  if v_addr is null or jsonb_typeof(v_addr) <> 'object' then
    raise exception 'A delivery address is required';
  end if;

  if coalesce(trim(v_addr ->> 'line1'), '') = '' then
    raise exception 'A delivery address needs a street address';
  end if;

  if coalesce(trim(v_addr ->> 'city'), '') = '' then
    raise exception 'A delivery address needs a city';
  end if;

  -- [15] nothing capped these, so a 10 000-character line reached the queue
  if length(v_addr ->> 'line1') > 120
     or length(coalesce(v_addr ->> 'line2', '')) > 120
     or length(coalesce(v_addr ->> 'label', '')) > 60
     or length(v_addr ->> 'city') > 60 then
    raise exception 'That address is too long';
  end if;

  v_pincode := trim(coalesce(v_addr ->> 'pincode', ''));
  if v_pincode !~ '^[1-9][0-9]{5}$' then
    raise exception 'A valid 6-digit pincode is required';
  end if;

  if not exists (
    select 1 from public.serviceable_pincodes
     where pincode = v_pincode and active
  ) then
    raise exception 'We do not deliver to % yet', v_pincode;
  end if;

  -- ---- customer contact -------------------------------------------- [01]
  v_name := nullif(trim(coalesce(details ->> 'customer_name', '')), '');
  if v_name is null then
    raise exception 'A name is required';
  end if;
  if length(v_name) > 80 then
    raise exception 'That name is too long';
  end if;

  /* The number the customer proved they hold at sign-in beats anything in the
     request body. That both removes a typo on the one field the bakery depends
     on, and stops a client claiming a first-order coupon under a number it
     does not own. Falls back to the request only for an account with no phone
     on it, which today means none of the customer accounts. */
  select public.normalise_mobile(u.phone) into v_verified
    from auth.users u
   where u.id = v_user_id;

  if coalesce(v_verified, '') <> '' then
    v_phone := v_verified;
  else
    v_phone := public.normalise_mobile(details ->> 'customer_phone');
  end if;

  if v_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'A valid 10-digit mobile number is required';
  end if;

  v_payment := coalesce(details ->> 'payment_method', 'cod');

  -- ---- cart shape ---------------------------------------------- [12][14]
  for v_item in select * from jsonb_array_elements(items) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Invalid cart line';
    end if;
    if coalesce(v_item ->> 'qty', '') !~ '^[0-9]{1,3}$' then
      raise exception 'Invalid quantity';
    end if;
    if (v_item ->> 'qty')::integer <= 0 then
      raise exception 'Invalid quantity';
    end if;
  end loop;

  /* Two lines of the same product used to be validated separately against
     unmodified stock, so 3 + 3 against a stock of 5 passed both checks and was
     stopped only by the products_stock_check constraint firing mid-write.
     Folding them here means the quantity that is checked is the quantity that
     is taken. Ordered by product id so concurrent carts take row locks in the
     same sequence and cannot deadlock against each other. */
  select jsonb_agg(jsonb_build_object('product_id', pid, 'qty', q) order by pid), count(*)
    into v_cart, v_lines
    from (
      select e ->> 'product_id' as pid, sum((e ->> 'qty')::integer) as q
        from jsonb_array_elements(items) e
       group by 1
    ) folded;

  if v_lines > 50 then
    raise exception 'That is too many different items for one order';
  end if;

  -- ---- stock and subtotal, locking each product row ----------------------
  for v_item in select * from jsonb_array_elements(v_cart) loop
    v_product_id := v_item ->> 'product_id';
    v_qty := (v_item ->> 'qty')::integer;

    if v_qty > 99 then
      raise exception 'You can order at most 99 of one item';
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

  -- ---- delivery fee, decided here and not taken from the client ----------
  -- Keep in step with DELIVERY_FEE / FREE_DELIVERY_THRESHOLD in
  -- src/state/CartContext.tsx, or the customer sees a total we do not charge.
  v_delivery_fee := case when v_subtotal >= 200 then 0 else 20 end;

  -- ---- coupon ------------------------------------------------------------
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

    /* Counted against the account and the verified phone together: the account
       stops a second order, the phone stops the same person coming back on a
       fresh account. Both are now trustworthy because the phone is read from
       the session rather than the request. */
    if v_coupon.first_order_only then
      select count(*) into v_prior
        from public.orders
       where user_id = v_user_id or customer_phone = v_phone;
      if v_prior > 0 then
        raise exception 'Coupon % is valid on your first order only', v_code;
      end if;
    end if;

    if v_coupon.per_user_limit is not null then
      select count(*) into v_prior
        from public.orders
       where (user_id = v_user_id or customer_phone = v_phone)
         and coupon_code = v_code;
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

  -- ---- the order ---------------------------------------------------------
  /* Two identical checkouts racing each other both reach this insert. The
     unique index on (user_id, request_id) lets exactly one through; the loser
     rolls back its own subtransaction -- taking its stock decrements with it,
     since they have not run yet -- and returns the winner's order id. */
  begin
    insert into public.orders (
      user_id, total, item_count, status,
      delivery_address, payment_method, delivery_slot,
      coupon_code, discount, delivery_fee,
      customer_name, customer_phone, request_id
    )
    values (
      v_user_id,
      greatest(v_subtotal - v_discount + v_delivery_fee, 0),
      v_item_count,
      'placed',
      v_addr,
      v_payment,
      details ->> 'delivery_slot',
      nullif(v_code, ''),
      v_discount,
      v_delivery_fee,
      v_name,
      v_phone,
      v_request_id
    )
    returning id into v_order_id;
  exception when unique_violation then
    select id into v_existing
      from public.orders
     where user_id = v_user_id and request_id = v_request_id;
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
  end;

  for v_item in select * from jsonb_array_elements(v_cart) loop
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

revoke all on function public.place_order(jsonb, jsonb) from public;
grant execute on function public.place_order(jsonb, jsonb) to authenticated;
