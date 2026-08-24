# Supabase setup — Lajwab Bakery

Everything here is done in the Supabase dashboard. Roughly 30 minutes.

**Run only two SQL files:** `supabase/00_init_lajwab.sql`, then
`supabase/02_seed_lajwab.sql`. The other files in `supabase/` are Grocwell
leftovers and now carry a SUPERSEDED banner — see [Why](#why-the-old-files-were-replaced).

---

## 1 · Create the project

Supabase → New project.

| Field | Value |
|---|---|
| Region | **Mumbai (ap-south-1)** — every customer is in Janakpuri |
| Database password | Save it in a password manager; it is not recoverable |

**Use a new project, not Grocwell's.** Sharing one database means re-seeding
this catalog would overwrite Grocwell's, and `is_admin()` is project-wide — the
bakery owner would become an admin of Grocwell too.

## 2 · Run the schema

SQL Editor → New query → paste all of `supabase/00_init_lajwab.sql` → Run.

It creates the catalog, orders, order items, addresses, profiles, the role
helpers, RLS on every table, and `place_order`. Re-running it is safe.

Then verify — every row must say `true`:

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```

## 3 · Seed the catalog

SQL Editor → paste `supabase/02_seed_lajwab.sql` → Run. 7 categories, 36 products.

```sql
select count(*) from public.products;  -- expect 36
```

⚠️ **The prices are placeholders.** Realistic Delhi rates, never confirmed with
the bakery. Correct them before taking a real order — either in the SQL editor
or through the inventory app once you're admin.

## 4 · Phone auth — **skip for now**

Do not enable the Phone provider yet. The dashboard will not save that form
without SMS provider credentials, and nothing calls phone auth while the app is
in demo mode. Enable it as part of [WHATSAPP_OTP.md](WHATSAPP_OTP.md), in this
order:

1. Deploy the Edge Function
2. Authentication → **Hooks** → enable the Send SMS hook
3. *Then* Authentication → Providers → **Phone** → enable

The hook intercepts the send, so the Twilio fields are never read — but the form
demands values, so put placeholders in them. Leaving them fake is deliberate: if
the hook is ever disabled, the send fails instead of silently going out over SMS.

Authentication → Providers → **Email** → disable. Nothing uses it now.

## 5 · Point the app at the project

Settings → API. Copy the Project URL and the `anon` key into `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Keep `EXPO_PUBLIC_OTP_MODE=demo` until the WhatsApp hook is live, or login will
fail — phone auth has no delivery channel yet.

## 6 · Switch the app to the database

[src/services/catalog.ts](src/services/catalog.ts) still reads the bundled
catalog. Once step 3 is done and verified:

```ts
const USE_LOCAL_CATALOG = false;
```

Do this **after** seeding, not before — otherwise the app shows an empty shop.

## 7 · Create the owner's admin account

1. Authentication → Users → Add user → enter the owner's phone (`+9198…`)
2. Grant the role:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
where phone = '9198XXXXXXXX';
```

3. They must **sign out and back in** — the role is read from the JWT, which is
   issued at login.

Roles: `admin` (owner, full inventory access), `delivery` (rider app),
anything else is a customer.

---

## Why the old files were replaced

Running `01_schema.sql` and then `migrations/001` on a fresh project does not
work. Three things break, and two of them break **silently**:

| # | Problem |
|---|---|
| 1 | `01_schema.sql` creates `order_items` as `(product_id, name, price, qty)`. Migration 001 §3 creates it as `(product_id, qty, price_at_purchase, name_at_purchase)` using `create table if not exists` — so on a fresh project the table already exists and §3 **does nothing, with no error**. `place_order` then inserts into columns that aren't there. The app reads `price_at_purchase`/`name_at_purchase`, so migration 001's shape is the correct one. |
| 2 | Migration 001 §6's `place_order` does `where id = (v_item ->> 'product_id')::uuid`. Product ids are text (`lb-thaali-56`), so **every signed-in checkout throws** `invalid input syntax for type uuid`. |
| 3 | RLS policies are PERMISSIVE and OR together. Migration 001 §5 adds `orders_no_direct_insert` (`with check (false)`), but `01_schema.sql`'s `"insert own orders"` policy has a different name, so it survives — and still permits direct inserts. A client could **write its own order total**, bypassing `place_order` entirely. |

`00_init_lajwab.sql` resolves all three: text ids throughout, one `order_items`
shape, and it explicitly drops the old policy names before creating its own.

Correction to something I told you earlier: I said `place_order` casts to uuid.
That's true of migration 001's version, but **not** of `03_place_order.sql`,
which declares `v_product_id text` and was always fine. The uuid cast came in
with the migration.

---

## What this does not cover

- **Migration 002** (`delivery_address`, `payment_method`, `delivery_slot` on
  orders) — not written, and the app doesn't reference those columns, so
  nothing is blocked on it.
- **Server-side coupons.** `FIRST50` is still client-side and ungated: it can be
  applied on every order, and `place_order` ignores discounts entirely, so the
  customer sees ₹775 while the order records ₹1551. Needs an `apply_coupon`
  function and first-order gating inside `place_order`.
- **Admin password login.** Staff currently sign in through the same phone OTP
  as customers.
