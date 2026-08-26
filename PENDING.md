# Lajwab Bakery — Production Checklist

Single shop · Janakpuri · pincode 110058 · 100% eggless, pure veg
Last updated: 2026-08-25

Legend: **[You]** needs an account, dashboard, document, or an answer from the
bakery · **[Me]** I can code it

Run `npm run verify` at any point — it checks coupon maths, pincode rules and
pre-order lead times against the real source, and reports what is still unfilled.

---

## 🔴 Blockers — real customers cannot order until these are done

| # | Task | Who |
|---|---|---|
| 1 | **Bakery phone number** in `src/data/store.ts` — customers currently have no way to reach the shop | [You] |
| 2 | **Real prices** — everything in `02_seed_lajwab.sql` is a Delhi estimate, never confirmed | [You] |
| 3 | **Run migration 002** in the SQL editor — without it orders carry no delivery address | [You] |
| 4 | **Meta template + deploy the OTP function** — see `WHATSAPP_OTP.md` | [You] |
| 5 | **Owner's admin account** — create the user, grant `role: admin`, sign out and back in | [You] |

---

## ⚠️ Before the APK is built

- **Demo mode must be OFF.** With `EXPO_PUBLIC_OTP_MODE=demo` set, every
  customer sees their code printed on screen and the session is synthetic —
  no JWT, so **orders write to the phone's local storage and never reach the
  bakery.** Delete the line, then `npx expo start -c`.
- **Place one real order end to end** and confirm `orders.delivery_address`
  contains JSON rather than `null`.

---

## ⚖️ Legal — required, not optional

| Task | Who |
|---|---|
| **FSSAI licence number** into `store.ts` — mandatory display for a food business | [You] |
| **GST or Udyam** — also decides whether DLT registration for SMS can start at all | [You] |
| Hosted privacy policy URL — the Play Store requires one; the in-app screen is not enough | [You] |

---

## ✅ Done

**Auth** — phone OTP for customers (one screen, no sign-up, first code creates
the account) · email+password for staff, independent of WhatsApp · login moved
off the app entrance, so browsing needs no account and an OTP failure costs one
order rather than locking everyone out.

**Money** — coupons priced in `place_order`, `FIRST50` gated to genuine first
orders, client and server agree across 19 checks.

**Orders** — delivery address, payment method, slot and discount recorded and
shown to the bakery · line items snapshot name and price at purchase.

**Operations** — start-of-day stock reset · thaali enforces its day of notice
and drops express delivery · bansuri flagged to whoever packs the order.

**Content** — every Grocwell trace removed (fake support number, foreign email
addresses, vegetables, a rider who does not exist, developer text in the FAQ) ·
contact details centralised in `store.ts`, where an empty value hides its own UI
so nothing ships as a dead button · Terms screen.

**Addresses** — GPS lookup and map pin-drop wired into the address form; the
coordinates already had columns and nothing was writing to them.

---

## 🟡 Worth doing, not blocking

| Task | Who | Note |
|---|---|---|
| **Crash reporting** | [You] send a DSN | Biggest operational gap — a crash on the owner's phone is invisible today |
| **Compress product images** | [Me] | 7.5 MB of PNGs; roughly 2 MB as JPEG. `sharp` has no build for Node 26, so squoosh.app or TinyPNG by hand for now |
| **Delivery fee server-side** | [Me] | Client decides free-delivery-over-₹200; exposure capped at ₹20/order |
| **Accessibility labels** | [Me] | None anywhere — screen readers cannot use the app |
| **Offline handling** | [Me] | Customer app assumes a connection |
| **Today's sales view** | [Me] | Owner has no read on how the day went |
| **SMS as OTP fallback** | [You] | Needs TRAI DLT (3–7 working days, Udyam accepted). Adds the auto-fill WhatsApp cannot do — one branch in the existing Edge Function |
| Push notifications for order status | [Me] | |
| Low-stock alerts | [Me] | |

---

## 📌 Deferred by decision

- **Razorpay** — COD only for now; UPI and card show as `SOON` and cannot be
  selected, so nobody taps a dead button.
- **Rider app** — code kept, entry point hidden. Routes only on a `delivery`
  role, which nobody holds.
- **Play Store** — review takes days. Launch is APK + web.
