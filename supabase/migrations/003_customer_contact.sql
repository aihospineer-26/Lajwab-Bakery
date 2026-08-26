-- ==========================================================================
-- 003 — Customer contact on the order, and coupons keyed to the phone number
-- ==========================================================================
-- Launching without OTP. Customers get an anonymous Supabase session, so
-- auth.uid() still exists and every RLS policy keeps working unchanged --
-- but that uid is per-device and free to mint, so it is worthless for
-- "one discount per customer". The phone number the customer must give us
-- anyway (we cannot deliver without it) becomes the identity that coupons
-- are counted against.
--
-- This is deliberately weaker than OTP: nothing stops someone typing a
-- different number to claim FIRST50 twice. It is bounded by cash on
-- delivery, a single pincode, and max_discount. When OTP arrives, the
-- anonymous account is upgraded in place -- same uid, same orders -- and
-- the only change here is that the phone becomes trustworthy.
--
-- Run each section separately. If one errors, stop.


-- ==========================================================================
-- SECTION 1 — contact columns
-- ==========================================================================

alter table public.orders add column if not exists customer_name  text;
alter table public.orders add column if not exists customer_phone text;

-- Coupon checks scan by phone on every order, so this is not optional.
create index if not exists orders_customer_phone_idx
  on public.orders (customer_phone);


-- ==========================================================================
-- SECTION 2 — phone normalisation
-- ==========================================================================
-- '+91 98765 43210', '098765 43210' and '9876543210' are the same customer.
-- Stored as the bare 10 digits so the coupon count cannot be defeated by
-- retyping the number in a different format.

create or replace function public.normalise_mobile(raw text)
returns text
language sql
immutable
as $fn$
  select right(regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g'), 10);
$fn$;


-- ==========================================================================
-- SECTION 3 — place_order
-- ==========================================================================
-- Replaces the version from 002. Two changes only: the customer's name and
-- phone are required and stored, and first_order_only / per_user_limit count
-- against the phone instead of auth.uid().

create or replace function public.place_order(items jsonb, details jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_order_id     uuid;
  v_item         jsonb;
  v_product_id   text;
  v_qty          integer;
  v_price        integer;
  v_stock        integer;
  v_subtotal     integer := 0;
  v_item_count   integer := 0;
  v_coupon       public.coupons%rowtype;
  v_code         text;
  v_discount     integer := 0;
  v_delivery_fee integer := 0;
  v_prior        integer := 0;
  v_payment      text;
  v_name         text;
  v_phone        text;
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

  -- The bakery delivers these by hand and rings ahead. An order without a
  -- reachable number is an order that cannot be completed, so this is a hard
  -- requirement rather than a nicety.
  v_name  := nullif(trim(coalesce(details ->> 'customer_name', '')), '');
  v_phone := public.normalise_mobile(details ->> 'customer_phone');

  if v_name is null then
    raise exception 'A name is required';
  end if;

  if v_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'A valid 10-digit mobile number is required';
  end if;

  v_payment := coalesce(details ->> 'payment_method', 'cod');

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

  -- Decided here, not taken from the client. The app used to send its own
  -- delivery_fee, so a tampered client could waive it on every order. Keep the
  -- two numbers in step with DELIVERY_FEE / FREE_DELIVERY_THRESHOLD in
  -- src/state/CartContext.tsx, or the customer sees a total we do not charge.
  v_delivery_fee := case when v_subtotal >= 200 then 0 else 20 end;

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

    -- Counted against the phone, not auth.uid(). An anonymous session is one
    -- tap of "clear data" away from being a brand new customer; the phone at
    -- least costs them a number they are willing to receive a delivery on.
    if v_coupon.first_order_only then
      select count(*) into v_prior
      from public.orders where customer_phone = v_phone;
      if v_prior > 0 then
        raise exception 'Coupon % is valid on your first order only', v_code;
      end if;
    end if;

    if v_coupon.per_user_limit is not null then
      select count(*) into v_prior
      from public.orders
      where customer_phone = v_phone and coupon_code = v_code;
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
    coupon_code, discount, delivery_fee,
    customer_name, customer_phone
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
    v_delivery_fee,
    v_name,
    v_phone
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
-- SECTION 4 — check it worked
-- ==========================================================================
-- Both should return a row. The second proves normalisation collapses the
-- formats a customer might actually type.

-- select column_name from information_schema.columns
-- where table_name = 'orders' and column_name in ('customer_name','customer_phone');

-- select public.normalise_mobile('+91 98765 43210') as a,
--        public.normalise_mobile('098765-43210')    as b,
--        public.normalise_mobile('9876543210')      as c;
