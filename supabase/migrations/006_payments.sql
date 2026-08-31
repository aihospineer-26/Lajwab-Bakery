-- 006_payments.sql
--
-- Prepaid UPI and Cash on Delivery, with payment state kept separate from order
-- state. A prepaid order still walks the ordinary lifecycle; the bakery simply
-- knows not to start baking until the money has landed.
--
-- There is no gateway and no webhook in v1, so a person at the bakery is the
-- confirmation step. That makes the whole design hinge on one rule: the
-- customer must never be able to say they have paid.

-- ---------------------------------------------------------------- payment state

alter table public.orders
  add column if not exists payment_status text not null default 'pending';

alter table public.orders
  drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('pending', 'paid'));

-- Only two methods exist. The previous constraint also permitted 'card', with
-- nothing behind it -- an order could be posted that looked card-paid and never
-- was.
alter table public.orders
  drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method is null or payment_method in ('cod', 'upi'));

-- Staff confirm payment through PostgREST, so the grant has to go to
-- `authenticated` -- the role every signed-in account holds, customers
-- included. The policy and the trigger below are what actually separate them.
grant update (payment_status) on public.orders to authenticated;

-- ---------------------------------------------------------------- the guard

create or replace function public.enforce_order_payment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  /* Written once by place_order and never again.
     RLS gates rows, not columns, and orders_cancel_own only constrains
     `status` in its WITH CHECK -- so without this a customer could set
     payment_status = 'paid', or rewrite their own total, in the very same
     statement that cancels their order. */
  if new.total          is distinct from old.total
  or new.discount       is distinct from old.discount
  or new.delivery_fee   is distinct from old.delivery_fee
  or new.item_count     is distinct from old.item_count
  or new.user_id        is distinct from old.user_id
  or new.coupon_code    is distinct from old.coupon_code
  or new.request_id     is distinct from old.request_id
  or new.payment_method is distinct from old.payment_method then
    raise exception 'Order amounts and payment method cannot be changed after the order is placed'
      using errcode = 'check_violation';
  end if;

  if new.payment_status is distinct from old.payment_status then
    /* is_staff() reads app_metadata.role off the JWT, which the client cannot
       forge and the service-role key does not carry -- so this holds against
       every caller PostgREST has, exactly as enforce_order_transition does. */
    if not public.is_staff() then
      raise exception 'Only the bakery can confirm a payment'
        using errcode = 'check_violation';
    end if;

    /* One-way. A confirmation is a statement that money arrived; letting it be
       taken back turns the audit trail into an opinion. */
    if old.payment_status = 'paid' then
      raise exception 'A confirmed payment cannot be reversed'
        using errcode = 'check_violation';
    end if;

    if new.payment_status <> 'paid' then
      raise exception 'payment_status can only move to paid'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$fn$;

drop trigger if exists orders_enforce_payment on public.orders;
create trigger orders_enforce_payment
  before update on public.orders
  for each row execute function public.enforce_order_payment();

-- ---------------------------------------------------------------- the VPA

-- Editable from the dashboard so the owner can change it without a release.
-- Empty means not configured: the customer app hides the prepaid option and
-- place_order refuses a UPI order outright, so an unset VPA can never ship as
-- a payment screen with nowhere to send the money.
alter table public.store_settings
  add column if not exists upi_vpa text not null default '';

-- ---------------------------------------------------------------- place_order

CREATE OR REPLACE FUNCTION public.place_order(items jsonb, details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_vpa          text;
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

  -- Only two methods exist. The old check constraint also allowed a third,
  -- so a tampered client could post an order that looked card-paid.
  if v_payment not in ('cod', 'upi') then
    raise exception 'That payment method is not available';
  end if;

  -- Refusing here rather than taking an order nobody can pay: with no VPA
  -- configured the prepaid screen would show the customer nowhere to send
  -- the money. The app hides the option too; this is the half that holds.
  if v_payment = 'upi' then
    select nullif(btrim(upi_vpa), '') into v_vpa from public.store_settings limit 1;
    if v_vpa is null then
      raise exception 'Online payment is not set up yet. Please choose Cash on Delivery.';
    end if;
  end if;

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
$function$;
