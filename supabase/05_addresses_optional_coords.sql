-- Allow saving an address without picking a location on the map (temporary, frontend-only simplification)
alter table addresses alter column lat drop not null;
alter table addresses alter column lng drop not null;
