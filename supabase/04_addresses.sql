-- ##########################################################################
-- ## SUPERSEDED — DO NOT RUN.
-- ## Written for Grocwell. Conflicts with the other files here (uuid vs text
-- ## product ids, two incompatible order_items shapes, duplicate RLS policy
-- ## names that silently re-open orders to direct inserts).
-- ##
-- ## Use 00_init_lajwab.sql + 02_seed_lajwab.sql instead. See SUPABASE_SETUP.md.
-- ##########################################################################

-- Saved delivery addresses (private per signed-in user)
create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  line1 text not null,
  line2 text,
  city text not null,
  pincode text not null,
  lat double precision not null,
  lng double precision not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table addresses enable row level security;

create policy "read own addresses" on addresses for select using (auth.uid() = user_id);
create policy "insert own addresses" on addresses for insert with check (auth.uid() = user_id);
create policy "update own addresses" on addresses for update using (auth.uid() = user_id);
create policy "delete own addresses" on addresses for delete using (auth.uid() = user_id);
