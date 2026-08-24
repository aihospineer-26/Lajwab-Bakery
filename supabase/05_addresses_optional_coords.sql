-- ##########################################################################
-- ## SUPERSEDED — DO NOT RUN.
-- ## Written for Grocwell. Conflicts with the other files here (uuid vs text
-- ## product ids, two incompatible order_items shapes, duplicate RLS policy
-- ## names that silently re-open orders to direct inserts).
-- ##
-- ## Use 00_init_lajwab.sql + 02_seed_lajwab.sql instead. See SUPABASE_SETUP.md.
-- ##########################################################################

-- Allow saving an address without picking a location on the map (temporary, frontend-only simplification)
alter table addresses alter column lat drop not null;
alter table addresses alter column lng drop not null;
