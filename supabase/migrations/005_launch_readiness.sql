-- ==========================================================================
-- Lajwab Bakery — Migration 005
-- Price provenance · owner-editable store details
-- ==========================================================================
--
--  Safe to re-run: every statement is idempotent.
--
--  WHY
--  Two things stood between the app and a real launch that were not code
--  defects, and both were invisible from inside the product:
--
--    1. 32 of the 36 prices have never been confirmed by the bakery. Nothing
--       in the schema recorded which were sourced and which were guessed, so
--       the owner had no way to see what needed checking.
--
--    2. The FSSAI licence number lived in a TypeScript constant. Displaying it
--       is a legal requirement for an Indian food business, and the bakery
--       cannot edit a source file -- so launch depended on a developer being
--       available to type in a number.
--
-- ==========================================================================


-- ==========================================================================
-- SECTION 1 — where each price came from
-- ==========================================================================
-- NULL means nobody has confirmed this price. That is the honest default and
-- the reason the column is nullable rather than defaulted to a placeholder.

alter table public.products add column if not exists price_source text;

comment on column public.products.price_source is
  'Provenance of the current price. NULL = never confirmed by the bakery. '
  'Set to a short source label once someone checks it, e.g. ''owner-confirmed''.';

-- The only four with any source behind them: the bakery''s own public listing,
-- read in August 2026. Two independent readings agree -- the second showed
-- exactly 80% of these figures, which is that aggregator''s own discount
-- applied to the same menu price. Corroborated, but still not the counter
-- price from the bakery''s mouth, so they are labelled as what they are.
update public.products
   set price_source = 'aggregator-listing-2026-08 (unconfirmed by owner)'
 where id in (
   'lb-pastry-butterscotch',
   'lb-pastry-blackforest',
   'lb-pastry-pineapple',
   'lb-patty-paneer'
 );


-- ==========================================================================
-- SECTION 2 — store details the owner can edit without a rebuild
-- ==========================================================================
-- One row, keyed so it cannot accidentally become many. Public read because
-- the FSSAI number is displayed to every customer by law; admin-only write.

create table if not exists public.store_settings (
  id         boolean primary key default true check (id),
  fssai      text not null default '',
  gstin      text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (true)
on conflict (id) do nothing;

alter table public.store_settings enable row level security;

drop policy if exists store_settings_read_all on public.store_settings;
create policy store_settings_read_all on public.store_settings
  for select using (true);

drop policy if exists store_settings_admin_write on public.store_settings;
create policy store_settings_admin_write on public.store_settings
  for all using (public.is_admin()) with check (public.is_admin());


-- ==========================================================================
-- Verify
-- ==========================================================================
--   select id, name, price, coalesce(price_source, 'UNVERIFIED') as source
--     from public.products order by price_source nulls last, id;
--
--   select * from public.store_settings;
-- ==========================================================================
