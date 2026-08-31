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
removes the express slot and re-selects the first valid one. Payment is COD
only; there is no gateway.

## 1.7 Order lifecycle

```
placed -> accepted -> packed -> out_for_delivery -> delivered
   └──────────┴────────┴───────────────┴────> cancelled
```

`delivered` and `cancelled` are terminal. A customer may cancel only from
`placed` or `accepted` (`CANCELLABLE`, deliberately mirroring the
`orders_cancel_own` RLS policy). Cancelling restores stock exactly once — the
trigger fires on the edge into `cancelled`, so cancelling twice restores once.

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

A customer session carries over to `/admin` on the same origin — same
localStorage — which is why signing in as a customer and then visiting
`/admin` lands on `AccessDenied` rather than on the login page.

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
