# Lajwab Bakery — App Flow

Every screen, every gate, and what the server enforces regardless of what the
UI does. Two apps ship from one codebase.

---

## 0. Which app boots

`index.ts` decides from the URL, not from an environment variable — a deployed
web address is a fact the bundler cannot drop, whereas `EXPO_PUBLIC_APP_TARGET`
silently did not survive being passed on the command line.

| Condition | Boots |
| --- | --- |
| path starts `/admin` | `AppInventory.tsx` |
| host starts `admin.` / `dashboard.` / `inventory.` | `AppInventory.tsx` |
| `EXPO_PUBLIC_APP_TARGET=inventory` (inlined from a `.env` file) | `AppInventory.tsx` |
| anything else | `App.tsx` |

Native builds have no `window`, so **a phone always gets `App.tsx`** — customer
plus rider. The dashboard is web-only.

---

# 1. Customer app — `App.tsx`

## 1.1 Boot gates

`RootNavigator` runs three checks in order before anything renders. Each reads
AsyncStorage, so all three resolve to `null` on the first frame.

```
isLoading || !onboardingChecked || !signInPromptChecked
    -> render nothing

1. onboarding_seen unset            -> Onboarding
2. mode === 'delivery'              -> DeliveryTabs
3. signin_prompt_dismissed unset
   AND no session
   AND onboarding done
   AND mode !== 'delivery'          -> SignInPrompt
4. otherwise                        -> MainTabs
```

## 1.2 Onboarding

`OnboardingScreen`. Shown once. `onDone` clears the gate in memory and writes
`onboarding_seen`, so a reload does not show it again but a reinstall does.

## 1.3 Sign-in and OTP

`LoginScreen` -> `OtpScreen` -> session.

1. Customer types a 10-digit Indian mobile. Validation is local only:
   non-empty, then `isValidMobile`. Nothing else is checked before sending.
2. `sendOtp(local)` dispatches on `OTP_CHANNEL` (`src/services/otp.ts`):
   `demo` | `whatsapp` | `firebase` | `msg91`. Production is **msg91**.
3. `OtpScreen` shows `OTP_LENGTH` boxes (4 for MSG91, 6 otherwise) and
   **auto-submits on the last digit**. Resend unlocks after `RESEND_SECONDS`.
4. MSG91 verifies and returns an access token.
5. `msg91-otp-bridge` re-checks that token against MSG91's own
   `verifyAccessToken`, reads **which number MSG91 says it verified**, and
   mints the Supabase session for that number.

**Phone number is the identity.** A different number is a different account —
its own orders, addresses and cart. The bridge ignores any phone the client
attaches; trusting it was an account-takeover hole, now closed.

### First-run name

Signing in verifies a phone number and nothing else, so a brand-new account has
no name anywhere. Asked once, right after the first verified code — one field,
the way Blinkit and its neighbours do it.

```
first verified code
      ↓
account created seconds ago, and profiles.name empty
      ↓
CompleteProfile — name only
      ↓
saved to profiles → the shop, never asked again
```

**Two conditions, both required.** The account must be minutes old
(`isFreshSignup`, a 5-minute window on `auth.users.created_at`), *and*
`profiles.name` must still be empty. The bridge creates the auth row on first
sign-in and reuses it on every later one, so an account that already existed
carries an old `created_at` and fails the first test outright — however its
profile looks. That is the point: an existing customer is never asked, even one
who has no name recorded.

The direction of failure is chosen deliberately. Unknown or unparseable
`created_at` counts as *not* new. Getting it wrong that way costs a name the
customer can add from their account in a moment; getting it wrong the other way
puts a form in front of someone who has been ordering for months.

Gated in `RootNavigator` rather than from `OtpScreen`, so it survives a reload
mid-signup. While the answer is unknown the navigator renders nothing rather
than flashing the shop and losing the question. It also **fails open** — a
profile that cannot be read is treated as complete. Guests are never asked;
browsing stays public.

**No email at sign-up.** Nothing is sent by email today, so asking for one at
the door would be collecting an address for its own sake. It can be added any
time from Account → Profile, which is where a detail nobody currently needs
belongs.

Both fields live in `profiles`. The name a customer typed at checkout used to
survive only in that device's `localStorage`: gone on reinstall, invisible on a
second device, invisible to the bakery. `UserProfileContext` reads the server
row now, with local edits winning until the write-through lands. The email
cannot go in `auth.users.email` — that holds the synthetic
`<phone>@phone.lajwabbakery.local` address the OTP bridge needs for its
magic-link exchange, so a real one there would collide with sign-in.

`profiles` RLS was already correct: insert and update own row only, select own
or staff. Verified — one customer can neither read nor rewrite another's.

## 1.4 Guest mode

Browsing is public; checkout is not.

| Where | What |
| --- | --- |
| `App.tsx` — `promptSignIn` | the condition that shows the prompt at all |
| `App.tsx` — `SignInPrompt` screen | `LoginScreen` with an `onSkip` prop |
| `App.tsx` — `dismissSignInPrompt` | writes `signin_prompt_dismissed` |
| `LoginScreen` — Skip control | the button itself |
| `CheckoutScreen` — `if (!session)` | bounces a guest to `Login` |

The prompt appears **once**. Skipping is remembered, and signing in also
dismisses it so it never returns after a later sign-out. A guest can browse,
search and fill a cart; the wall is at checkout.

## 1.5 Main tabs

`Home` · `Search` · `Cart` · `Account`

## 1.6 Browse to order

```
Home ──> Category ──> ProductDetail ──> add to cart
  └────> Search ────────┘

Cart ──> Checkout ──> OrderConfirmation ──> OrderTracking
```

**Cart** holds quantities in `CartContext`, persisted under
`lajwab.cart.quantities` and `lajwab.cart.coupon`. On catalogue load the cart
is revalidated: missing or out-of-stock lines are dropped, and quantities are
clamped to available stock.

A guest is sent **straight to Checkout**. The cart used to demand a delivery
address first, which a guest cannot satisfy — addresses are RLS-scoped to
`auth.uid()`, so the address screen would refuse to save and the funnel
dead-ended. The address check still applies once signed in.

**Checkout** shows a signed-out customer why an account is needed, and promises
the cart survives, before validating in this order and stopping at the first
failure:

1. cart is not empty
2. a delivery address is chosen
3. `validatePincode` — inside the serviceable area
4. customer name is not blank
5. **session exists** — otherwise navigate to `Login`
6. the verified phone read off `session.user.phone` is a valid mobile

Then `place_order(items, details)` over RPC. A `requestId` is minted on the
first tap and held across retries, so a double tap cannot create two orders.

Delivery slots are built from the cart's lead time — adding a pre-order item
removes the express slot and re-selects the first valid one. Payment is prepaid UPI or COD -- see 1.7a. There is no gateway.

## 1.7 Order lifecycle

```
placed -> accepted -> packed -> out_for_delivery -> delivered
   └──────────┴────────┴───────────────┴────> cancelled
```

`delivered` and `cancelled` are terminal. A customer may cancel only from
`placed` or `accepted` (`CANCELLABLE`, deliberately mirroring the
`orders_cancel_own` RLS policy). Cancelling restores stock exactly once — the
trigger fires on the edge into `cancelled`, so cancelling twice restores once.

**Only the dashboard moves an order along.** `place_order` returns the new order
id, checkout passes it to `OrderConfirmation({ orderId })`, and both
`OrderConfirmationScreen` and `OrderTrackingScreen` poll `fetchOrderById` every
8s and render `ORDER_STEPS[statusToStep(status)]`. Neither holds a timer or a
step of its own: if the bakery does nothing, the customer sees "Order Placed"
indefinitely — and the screen says so, rather than leaving a dead tracker to
look broken. Both survive a reload, because nothing about the stage is kept on
the device.

The confirmation screen used to invent an `ORD-####` number with `Math.random`
and walk itself to "Delivered" 22 seconds after checkout, telling customers
their order had arrived before the bakery had seen it. Customer screens now
print `formatOrderRef(id)` — the last six characters of the real uuid — and the
dashboard prints the same six, so both sides quote one reference.

Customer wording differs from the operational wording by design: `packed` reads
as "Being Prepared" to the person waiting (`CUSTOMER_STATUS_LABEL`) and stays
"Packed" on the dashboard (`STATUS_LABEL`). A customer's token cannot write any
status but `cancelled`, and only from `placed` or `accepted`.

## 1.7a Payment

Two methods, mutually exclusive, and payment state is kept out of the order
lifecycle entirely — `orders.payment_status` is `pending` or `paid` and moves
independently of `orders.status`.

```
Prepaid UPI                        Cash on Delivery
     ↓                                   ↓
order placed, payment_status pending     order placed, payment_status pending
     ↓                                   ↓
customer pays into the bakery's VPA      bakery bakes and delivers
     ↓                                   ↓
bakery checks its UPI app                money changes hands at the door
     ↓
dashboard → "Mark payment received"
     ↓
payment_status = paid
```

There is no gateway and no webhook in v1, so a person at the bakery *is* the
confirmation step. Everything else follows from that: opening the UPI app or
returning from it changes nothing, and the customer screen says
"Waiting for the bakery to confirm your payment" until somebody has actually
looked.

**Nothing about payment gates the order lifecycle.** A COD order walks
`placed → … → delivered` with `payment_status` still `pending`, which is the
truth until the cash is collected. A prepaid order can be accepted and baked
before confirmation too — the dashboard simply keeps showing `AWAITING PAYMENT`
so the baker knows. No extra order status was invented; the trigger would not
have recognised one.

**What the database enforces**, not the UI:

- `orders_enforce_payment` (BEFORE UPDATE) rejects any change to
  `payment_status` from a caller `is_staff()` does not recognise — including
  the service-role key, which carries no `app_metadata.role`.
- `paid → pending` is refused for everyone. Confirmation is one-way.
- `total`, `discount`, `delivery_fee`, `item_count`, `user_id`, `coupon_code`,
  `request_id` and `payment_method` are immutable after `place_order` writes
  them. This is the trigger's real reason for existing: RLS gates rows, not
  columns, and `orders_cancel_own` only constrains `status` in its `WITH CHECK`
  — so without it a customer could set `payment_status = 'paid'`, or rewrite
  their own total, inside the very statement that cancels their order.
- `authenticated` may UPDATE exactly two columns on `orders`: `status` and
  `payment_status`. Nothing else is writable from any client.
- `place_order` refuses any method but `cod` and `upi`, and refuses a UPI order
  outright while no VPA is configured.

**The UPI ID** lives in `store_settings.upi_vpa`, editable from the dashboard's
Account tab, with no bundled fallback — a stale VPA compiled into an APK would
send money to the wrong place long after the owner changed it. Blank means
prepaid checkout does not appear at all, on either side of the client.

**The payment reference** is `Lajwab <ref>`, where `<ref>` is `formatOrderRef`
of the real order id — the same six characters the customer, the dashboard and
the order history all show. There is no second identifier anywhere in the flow.

## 1.8 Account section

**Quick links:** `Orders` · `Addresses` · `Offers`

**Your account:** `Profile`, `SavingsReport`, `CustomerSupport`, `Settings`

**About:** `Faq`, `Terms`, `PrivacyPolicy`

`Wallet`, `Notifications` and `Payments` were removed from navigation and
unregistered from the stack. Nothing credits a wallet, nothing sends a
notification, and Cash on Delivery is the only method the bakery accepts. The
screen files remain in `src/screens` for whenever a real system exists.

`CustomerSupport` and `Terms` read the bakery's real phone, hours and FSSAI
licence from `store_settings` via `services/storeSettings.ts`, falling back to
`src/data/store.ts`.

## 1.9 Rider mode

Lives inside the customer app, not the dashboard. `AppModeContext`:

```
RIDER_MODE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_RIDER === '1'
canAccessDelivery  = RIDER_MODE_ENABLED && (role 'delivery' | 'admin' | dev preview)
```

**Rider mode is off.** The three screens run on `src/data/deliveries.ts` — invented
jobs and invented earnings — so the flag gates them until a rider backend exists.
With it off nobody reaches them: not a delivery account, not an admin, not the
signed-out dev preview. The header no longer renders a rider toggle for
customers, and the "Delivery Partner Mode — coming soon" sheet it used to open
is gone. Set `EXPO_PUBLIC_ENABLE_RIDER=1` in a `.env` file to develop against
them; the screens and their code are untouched.

---

# 2. Inventory app — `AppInventory.tsx`

## 2.1 Gate

```
no session                  -> InventoryLogin   (email + password)
session, role 'admin'       -> InventoryTabs
session, any other role     -> AccessDenied
```

Role comes from `user.app_metadata.role`, which is server-set and cannot be
written by a client.

**There is no guest mode and no dev bypass.** A `SKIP_AUTH_FOR_PREVIEW` flag
used to open the whole dashboard on the dev server with no login, and a
signed-out visitor counted as an admin. Both are gone: the one surface that
moves real orders and real stock is now the one surface you cannot reach
without a password, on every build.

**Sign-in is a username, not an email.** Supabase Auth is email-keyed, so
`InventoryLoginScreen` maps the username to the local part of a fixed internal
domain — `<username>@staff.lajwabbakery.local` — the same shape the phone
accounts use. Staff never see an address. An input containing `@` is passed
through unchanged, so older email logins still work.

**The two apps keep separate sessions.** They share an origin
(`localhost:3000` and `localhost:3000/admin`), and with one storage key they
shared one session: signing into the dashboard also signed you into the shop as
the bakery, and the staff account appeared on the customer Account screen
carrying another customer's order history. `AUTH_STORAGE_KEY` in
`src/services/appTarget.ts` now gives the shop `lajwab-customer-auth` and the
dashboard `lajwab-staff-auth`. Staff sign-in never makes anyone a customer, the
shop opens as a guest until a customer signs in, and a customer visiting
`/admin` gets the sign-in screen rather than `AccessDenied`.

## 2.2 Tabs

**Orders** — the live queue, filterable by status. One button advances one step
(`placed -> Accept order`, and so on down the chain); cancelling asks for
confirmation. The customer's name and phone are shown, and the phone is a
`tel:` link so staff can ring them.

**Products** — catalogue and prices. Any product whose `price_source` is null
carries a **"Check price"** badge, so an unconfirmed price is visible rather
than assumed. Delete asks for confirmation and suggests setting stock to 0
instead.

**Stock** — per-item stock levels.

**Account** — Licence & registration (FSSAI, GSTIN) written to
`store_settings`, and sign out.

---

# 3. What the server enforces

None of the flows above are what protects the bakery. These hold even against
a caller holding the service-role key:

- **`place_order`** reads the verified phone from `auth.users`, never from the
  request body. It folds duplicate lines, caps 50 lines and 99 per item,
  validates the address shape and the serviceable pincode, and prices the
  order server-side.
- **Row locks** (`FOR UPDATE`, in deterministic order) prevent overselling
  under concurrency.
- **A unique partial index** on `(user_id, request_id)` makes a retried
  checkout idempotent.
- **`enforce_order_transition()`** is a trigger, not a policy — the state
  machine cannot be bypassed by any client.
- **`GRANT UPDATE (status)`** means a customer can write that one column and
  nothing else. RLS gates rows; column grants gate columns.
- **`restore_order_stock()`** is `SECURITY DEFINER` and fires only on the edge
  into `cancelled`.

---

# 4. Data sources

| Live from Supabase | Local in `src/data/` |
| --- | --- |
| products, categories, stock | types, `STATUS_LABEL`, `normalizeStatus`, `isCancellable` |
| orders and order items | `productImages.resolveImage` |
| addresses (signed in) | `serviceability.validatePincode`, `preOrder` lead times |
| coupons (enforced) | `offers.COUPONS` — advertises only; the table enforces |
| `store_settings` (FSSAI, GSTIN) | `store.ts` — fallback bakery details |

`USE_LOCAL_CATALOG` is `false`, so `products.ts` and `categories.ts` are a
dormant offline fallback that nobody currently sees.

---

## 4a. Whose orders

`orders_select` is `user_id = auth.uid() or is_staff()`, so RLS alone hands a
staff account every order in the shop. That is right for the dashboard and
wrong for the customer screens, which called the same function — a staff
account browsing the shop saw other people's orders as "My Orders" and their
spending as its own savings. The split is now explicit:

| Function | Scope | Used by |
| --- | --- | --- |
| `fetchOrders` | `.eq('user_id', <caller>)` | customer Account, Orders, Savings |
| `fetchOrderById` | `.eq('user_id', <caller>)` | customer OrderTracking |
| `fetchAllOrders` | unscoped, RLS decides | dashboard order queue |
| `fetchOrdersToday` | unscoped, RLS decides | dashboard stock screen |

RLS decides what a caller *may* read; which of those rows are *theirs* is the
query's question to answer.

---

# 5. Known gaps

- **Rider screens are mock data.** No rider backend exists.
- **Reviews are hidden.** They were device-local — stored under `my_reviews` on
  one device, reaching no server, so no other customer could ever read one. The
  section and the star-rating summary are removed from the product page until
  reviews have a table behind them.
- **Guest mode exists** — see 1.4.
- **`deliveryEta` (`45 – 60 minutes`) is unconfirmed.** It is quoted on every
  express order and nobody has checked it with the bakery. Now on the
  before-launch checklist in `src/data/store.ts`.
- **OTP has never run on physical Android hardware.** The MSG91 WebView path is
  web-verified only.
- **No APK has been built.**
- **FSSAI licence is unset**, and 32 of 36 prices are unconfirmed by the owner.
