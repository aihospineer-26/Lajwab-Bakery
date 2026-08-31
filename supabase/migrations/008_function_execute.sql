-- 008_function_execute.sql
--
-- Supabase's linter flags every SECURITY DEFINER function reachable over
-- /rest/v1/rpc. Most of ours are trigger bodies that were never meant to be
-- called by hand -- they landed on the API surface only because functions in
-- `public` are exposed by default.
--
-- The revoke has to name PUBLIC, not anon and authenticated. Postgres grants
-- EXECUTE to PUBLIC on every new function, and both roles inherit it: revoking
-- from the two roles individually leaves the inherited grant in place and
-- changes nothing, which is exactly what the first attempt at this did.

-- Trigger and event-trigger bodies. Firing a trigger does not check EXECUTE on
-- the invoking role, so nothing that legitimately uses these is affected --
-- handle_new_user fires as supabase_auth_admin on auth.users, and
-- restore_order_stock fires from the orders UPDATE a cancellation makes.
-- Both were re-verified after this ran.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.restore_order_stock() from public;
revoke execute on function public.rls_auto_enable() from public;

-- place_order already refuses a caller with no auth.uid(), so anon gained
-- nothing from holding this -- but the function that writes orders and moves
-- stock should not be reachable by an unauthenticated role at all. Re-granted
-- to authenticated, which is the only role that has any business calling it.
revoke execute on function public.place_order(jsonb, jsonb) from public;
grant execute on function public.place_order(jsonb, jsonb) to authenticated;

-- auth_role() deliberately keeps EXECUTE, and the linter will keep flagging it.
-- Every RLS policy in this schema reaches it through is_staff() or is_admin(),
-- both SECURITY INVOKER, so the call runs as the querying role -- revoking
-- would lock customers out of their own orders. It is safe to expose: it
-- returns one fact about the caller's own token and nothing else.
