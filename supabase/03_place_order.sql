-- Atomically places an order: validates stock, computes the total from the
-- products table (never trusts client-sent prices), inserts the order +
-- line items, and decrements stock — all in one transaction so two people
-- can't both buy the last unit.
create or replace function place_order(items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total integer := 0;
  v_item_count integer := 0;
  v_item jsonb;
  v_product_id text;
  v_qty integer;
  v_price integer;
  v_stock integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to place an order';
  end if;

  if jsonb_array_length(items) = 0 then
    raise exception 'Cart is empty';
  end if;

  -- Validate stock and compute total, locking each product row.
  for v_item in select * from jsonb_array_elements(items)
  loop
    v_product_id := v_item->>'product_id';
    v_qty := (v_item->>'qty')::integer;

    select price, stock into v_price, v_stock
    from products where id = v_product_id
    for update;

    if v_price is null then
      raise exception 'Product % not found', v_product_id;
    end if;

    if v_stock < v_qty then
      raise exception 'Not enough stock for %', v_product_id;
    end if;

    v_total := v_total + v_price * v_qty;
    v_item_count := v_item_count + v_qty;
  end loop;

  insert into orders (user_id, total, item_count, status)
  values (auth.uid(), v_total, v_item_count, 'Delivered')
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(items)
  loop
    v_product_id := v_item->>'product_id';
    v_qty := (v_item->>'qty')::integer;

    insert into order_items (order_id, product_id, name, price, qty)
    select v_order_id, id, name, price, v_qty from products where id = v_product_id;

    update products set stock = stock - v_qty where id = v_product_id;
  end loop;

  return v_order_id;
end;
$$;

grant execute on function place_order(jsonb) to authenticated;
