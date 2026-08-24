# Lajwab Bakery — Build Checklist

Single shop · Janakpuri · pincode 110058 · 100% eggless, pure veg
Last updated: 2026-08-23

Legend: **[You]** needs an account, dashboard, photo, or legal action · **[Me]** I can code it

---

## 🎯 TONIGHT — demo for the owner

The app runs now at `http://localhost:3000` (`npm start`). Catalog, branding,
Janmashtami offer and 18 product photos are done.

| # | Task | Who | Est. |
|---|---|---|---|
| 1 | **Product photos** — 18 of 36 still emoji. Now the most visible flaw: the editorial redesign made their absence *more* obvious, not less | [You] | — |
| 2 | **Deploy to Vercel** — `npm run build`, then he taps a link on his own phone instead of crowding a laptop | [Me] | 15m |
| 3 | **Real prices** — placeholders are realistic Delhi rates but wrong. Owner correcting them on the spot turns a demo into a working session | [You] | — |
| ~~4~~ | ~~Phone + mock OTP login~~ — **done.** Phone number + 6-digit code, WhatsApp-branded. Runs on-device in demo mode, no API needed. See [WHATSAPP_OTP.md](WHATSAPP_OTP.md) | [Me] | ✅ |

~~Fix narrow-width clipping~~ — **there was no bug.** Headless Chrome
enforces a ~512px minimum window on Windows, so `--window-size=430` laid out
at 512 and cropped the screenshot to 430. The layout was always correct.

**Photos:** drop `<product-id>.jpg` into `assets/products/`, then I re-run one
generator. Ids are in [products.ts](src/data/products.ts). Missing:

```
thaali-56  cake-pineapple  cake-oreo  pastry-butterscotch  pastry-pineapple
pastry-chocolate  pastry-blackforest  bread-milk  bun-burger  cookie-butterkaju
cookie-attapatti  patty-aloo  patty-paneer  patty-mushroom  namkeen-bhujia
namkeen-moongdal  namkeen-punjabi  namkeen-dalmoth
```

A phone camera on the shop counter beats stock photography. The 56 Bhog Thaali
especially — no stock library has one.

**Demo signed-out.** Signed-in checkout fails: `place_order` casts product ids to
uuid and ours are text (`lb-thaali-56`). Signed-out uses local storage and works.

---

## 🔴 BEFORE TAKING REAL MONEY

### 1. Separate Supabase project **[You]** — ~10 min

Grocwell shares this database. Right now that is only safe because
`USE_LOCAL_CATALOG` in [catalog.ts](src/services/catalog.ts) keeps the bakery off
the DB entirely. Three collisions if that flag is turned off as-is:

- Re-seeding `products`/`categories` **overwrites Grocwell's catalog**
- `orders`/`addresses`/`profiles` are shared — bakery orders appear in Grocwell's rider queue
- `is_admin()` is **project-wide** — a Lajwab admin can write Grocwell's data

Steps:
1. New Supabase project (free tier), region **Mumbai / ap-south-1**
2. Run `supabase/01_schema.sql`
3. Run `supabase/migrations/001_order_items_and_rls.sql` — **Section 0 first**, it is read-only and answers the id-type questions
4. Point `.env.local` at the new project URL + anon key
5. Seed the bakery catalog, then flip `USE_LOCAL_CATALOG = false`

Note: product ids are text (`lb-thaali-56`), not uuid — `order_items.product_id`
and `place_order` must use `text`, not `uuid`.

### 2. Migration 002 — orders can't be delivered **[Me]**

[CheckoutScreen](src/screens/CheckoutScreen.tsx) collects address, delivery slot
and payment method. `placeOrder` sends **none of it**. Orders carry no delivery
address, so a rider cannot deliver one. Needs `delivery_address` (snapshotted,
not a FK — addresses get edited), `payment_method`, `delivery_slot`.

### 3. Server-side coupons **[Me]**

`place_order` recomputes totals from the products table and **ignores discounts**.
Customer sees ₹775, order records ₹1551. Also:

- Discounts are computed client-side — **forgeable**
- `validTill` is a display string, never parsed — **coupons never expire**
- "First order only" is decorative — nothing counts prior orders

The 50%-off-first-order offer needs all of this fixed, server-side, before it
touches real money. First-order gating belongs in `place_order` where it can be
checked atomically.

### 4. Admin password login **[Me]** + **[You]**

Customers now sign in with a phone OTP. Staff should not — one shared account,
no SMS cost, different threat model. For the dashboard:

1. [Me] `signInWithPassword` + an admin login screen
2. [You] Supabase → Authentication → disable public signups
3. [You] Create the owner's account manually in the dashboard
4. [You] Grant admin (SQL at the bottom of migration 001), then sign out and back in — role is baked into the JWT at login
5. [Me] Verify the `__DEV__` gates are off in the production build

⚠️ [AppInventory.tsx:151](AppInventory.tsx#L151) and [:161](AppInventory.tsx#L161)
skip login **and** grant admin when `__DEV__` is true. Production export disables
them, but **never expose port 3001 or a dev build publicly** — it is wide open.

### 5. Payments **[You]**

**COD-only sidesteps this entirely — recommended.** Otherwise a gateway needs a
real backend for webhooks.

### 6. FSSAI + GST **[You]**

Legally required to sell food for money in India. No code path around it.

### 7. ~~Supabase redirect allowlist~~ — **no longer needed**

Deep-link redirects existed only for magic links. Phone OTP never leaves the
app, so there is no return leg to allowlist. `Linking` is gone from the auth
path entirely.

### 8. First EAS build **[You]**

`eas build --profile preview --platform android` — never run. Worth doing early:
SMS/WhatsApp autofill of the OTP is Android-only behaviour that the web build
cannot exercise.

---

## 🟠 SHOULD DO

| # | Task | Who |
|---|---|---|
| 9 | **Sentry** — a beta without crash reporting is mostly wasted | [Me] + your DSN |
| 10 | **Hide dark-mode toggle** — ~12 screens have hardcoded light hexes | [Me] |
| 11 | **Pre-order support for the thaali** — made to order, needs a required-by date, lead time and daily capacity | [Me] |
| 12 | **Daily stock reset** — bakery stock is "what we baked today", not a warehouse count. Yesterday's bread shouldn't be sellable | [Me] |
| 13 | **Product variants** — 500g/1kg is currently two separate rows. Much cheaper to do before seeding a full catalog than after | [Me] |
| 14 | **Bansuri as a ₹0 line item** — otherwise packing staff never see it | [Me] |
| 15 | **Abuse cap on the 50%** — phone identity makes this enforceable now (a second number costs real money, a second Gmail did not). Still needs gating inside `place_order` | [Me] |
| 16 | Replace remaining mock data: reviews, notifications, wallet, savings report, rider earnings | [Me] |

---

## 🟡 LATER

- ~~Real WhatsApp OTP~~ — code is written and verified end-to-end in demo mode.
  Remaining is config only: approve the Meta template, deploy
  `supabase/functions/whatsapp-otp/`, register the Send SMS hook. **[You]**
- Google Play listing, privacy policy URL, store assets
- Live GPS tracking (needs Play background-location review, 1–3 weeks)
- Push notifications
- Dark-mode colour audit
- Nominatim → Google Geocoding (ToS at commercial volume)

---

## 🎨 DESIGN — on branch `editorial-polish`

Two commits moving the UI from the forked Blinkit quick-commerce look to the
boutique-bakery style of ambrosiabakery.in / cinnamon.kitchen. **Not merged** —
compare with `git checkout main` and merge only if you want it.

- Playfair Display serif for headings, product names, prices; new `overline`
  token for wide-tracked uppercase section labels
- Palette desaturated to blush/cream with a terracotta accent
- Centred wordmark masthead on cream, replacing the dark slab and the
  "45 minutes" quick-commerce promise
- Product grid 5-up → 2-up; category circles → large square photo tiles
- Ghost outline buttons; Ionicons line icons in the tab bar
- Removed: flash-sale countdown, trust-badge pills, "% OFF" stickers,
  strikethrough MRP on the combo card

Still off-style: promo banner carousel, and the emoji/photo mix (see #1).

---

## ✅ DONE

- Catalog: 36 bakery items, 7 categories, from the shop's real menu
- 18 professional CC0 product photos bundled locally (no network needed)
- Full Grocwell → Lajwab rebrand across 20+ files
- Removed a **chicken egg photo** from the login collage on a 100%-eggless app
- Pincode locked to 110058, label "Janakpuri"
- Janmashtami: 56 Bhog Thaali (₹1,551), countdown banner, complimentary bansuri, festival reordered so it beats Raksha Bandhan
- `USE_LOCAL_CATALOG` flag — demo runs off local data, never touches Grocwell's DB
- Bakery palette confirmed (caramel on cream); stray hardcoded greens removed
- `tsc --noEmit` clean throughout

---

## Decisions needed

1. **COD-only?** → removes the payments blocker
2. **Separate Supabase project?** → strongly recommended; nothing else scopes admin to one business
3. **Where does FSSAI stand?**
4. **Are riders part of this**, or is the shop self-delivering?
