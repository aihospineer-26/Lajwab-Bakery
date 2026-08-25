# Lajwab Bakery — Production Checklist

Single shop · Janakpuri · pincode 110058 · 100% eggless, pure veg
Last updated: 2026-08-24

Legend: **[You]** needs an account, dashboard, document, or an answer from the
bakery · **[Me]** I can code it

---

## 🔴 Blockers — the app cannot take a real order until these are done

| # | Task | Who | Status |
|---|---|---|---|
| 1 | ~~Delivery address never reached the order~~ | [Me] | ✅ migration 002 + checkout wiring |
| 2 | ~~Discounts were cosmetic — customer saw ₹775, order recorded ₹1551~~ | [Me] | ✅ priced server-side in `place_order` |
| 3 | ~~`FIRST50` reusable forever~~ | [Me] | ✅ `first_order_only` gate |
| 4 | **Payments** — UPI and card are radio buttons wired to nothing | [You] | decide: COD-only, or integrate a gateway |
| 5 | **Run migration 002** in the Supabase SQL editor | [You] | written, not run |

**On #4:** the default is now COD. UPI and card are still *selectable* and still
do nothing. Either say "COD only" and I delete them, or name a gateway
(Razorpay is the usual pick for a single shop) and I integrate it. Leaving a
dead "UPI" button in a shipped app is the worst of the three options.

---

## 🟠 Before real customers

| Task | Who | Notes |
|---|---|---|
| **WhatsApp OTP** — Edge Function + Meta auth template | [You] | see [WHATSAPP_OTP.md](WHATSAPP_OTP.md). Until live, keep `EXPO_PUBLIC_OTP_MODE=demo` |
| **Owner's admin account** | [You] | Auth → Users → add with email + password, then grant `role: admin`. Must sign out and back in |
| **Rider app — keep or delete?** | [You] | untouched pending your confirmation. Decides who moves an order `placed → delivered` |
| **Daily stock reset** | [Me] | bakery stock is "what we baked today", not a running counter. Blocked on the rider decision |
| **Error tracking** | [You] → [Me] | no Sentry, no Crashlytics. A crash on the owner's phone is invisible to you. Needs your DSN |
| **Tests** | [Me] | zero. Cart maths, coupon calc, `place_order` are the three worth having |

---

## ⚖️ Legal — mandatory in India, not optional

| Item | Why |
|---|---|
| **FSSAI licence number** | Legally required to be displayed by a food business. Currently appears nowhere in the app or on bills |
| **GST number** | Decides whether prices are tax-inclusive and whether you must issue tax invoices |
| **Hosted privacy policy URL** | Play Store requires a real URL. `PrivacyPolicyScreen` exists in-app but that does not satisfy it |
| **Terms of Service** | The login screen now links to Terms and Privacy. Both links currently go nowhere |
| **Play Store data safety form** | You collect phone numbers — must be declared |

---

## 🟢 Polish

Push notifications on order status · order line items in the admin Orders screen
(`fetchOrderItems()` exists, unused there) · low-stock alerts · week/month sales ·
thaali pre-order queue · bansuri as a ₹0 line item · SMS fallback + Truecaller
for OTP auto-fill.

---

## What the bakery owner has to give you

**Legal**
- FSSAI licence number and expiry
- GST number, or written confirmation they are below the threshold
- Registered business name and address exactly as on the licence

**Menu**
- Real prices for all 36 items — the seeded ones are realistic Delhi rates but
  were never confirmed, and are wrong
- Which items are daily stock vs made-to-order
- Confirm weights (500g cakes, 250g cookies, 400g loaves)
- Thaali: real price, lead time, and how many they can make per day

**Operations**
- Confirm 110058 only, or list the other pincodes
- Delivery fee, free-delivery threshold, minimum order value
- Opening hours and same-day cut-off time
- Who delivers — own staff or a third party? *(this settles the rider app)*
- COD only, or online payment too?
- Cancellation and refund policy

**Brand and contact**
- Logo files — the app currently uses a 🌿 emoji
- Real product photos, especially the 56 Bhog Thaali; no stock library has one
- Official order phone number and store address for the Maps pin
- Whose WhatsApp number sends the OTP — yours or the bakery's

**Accounts**
- Owner's email for the admin login
- Anyone else who needs admin access

**The offer**
- Is 50% off first order actually sustainable? It is currently capped at ₹1000
- How many bansuris do they have?

---

## Corrections to earlier notes

- **There was no narrow-width clipping bug.** Headless Chrome enforces a ~512px
  minimum window on Windows, so `--window-size=430` laid out at 512 and cropped
  the screenshot. The layout was always correct.
- **`03_place_order.sql` never cast product ids to uuid.** It declares
  `v_product_id text` and was always fine. The uuid cast was in migration 001,
  which is superseded — see [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
- **All 36 products have photos.** The "18 of 36 still emoji" line was stale.
