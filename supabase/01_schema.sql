-- Categories
create table categories (
  id text primary key,
  name text not null,
  image text not null
);

-- Products
create table products (
  id text primary key,
  name text not null,
  unit text not null,
  price integer not null,
  mrp integer,
  image text not null,
  category_id text not null references categories(id),
  description text not null,
  stock integer not null default 0
);

-- Orders (tied to real authenticated users)
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total integer not null,
  item_count integer not null,
  status text not null default 'Delivered',
  created_at timestamptz not null default now()
);

-- Order line items
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id text not null,
  name text not null,
  price integer not null,
  qty integer not null
);

-- Row Level Security
alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Catalog is public read (no login needed to browse)
create policy "public read categories" on categories for select using (true);
create policy "public read products" on products for select using (true);

-- Orders are private per signed-in user
create policy "read own orders" on orders for select using (auth.uid() = user_id);
create policy "insert own orders" on orders for insert with check (auth.uid() = user_id);

create policy "read own order_items" on order_items for select using (
  exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
create policy "insert own order_items" on order_items for insert with check (
  exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
