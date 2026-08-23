# Grocewell — Project Map

What each file/folder is for. Backend is Supabase (Postgres + auto-API + Auth) — no custom server.

## Root

- `App.tsx` — app entry. Sets up providers (`AuthProvider` → `CatalogProvider` → `CartProvider` → `LocationProvider` → `SidePanelProvider`), navigation tree, and the auth gate (signed out → Login/SignUp/CheckEmail; signed in → the main app stack).
- `app.json` — Expo config (icons, splash, Android permissions plugin for `expo-location`).
- `.env.local` — Supabase URL + anon key (gitignored, never committed).

## `supabase/` — SQL run manually in the Supabase dashboard SQL Editor (no migration tool)

- `01_schema.sql` — core tables: `categories`, `products` (with `stock`), `orders`, `order_items`. RLS: catalog is public-read; orders are private per `auth.uid()`.
- `02_seed.sql` — inserts the 8 categories / 24 products that match `src/data/categories.ts` / `products.ts`.
- `03_place_order.sql` — `place_order(items)` Postgres function: validates stock, computes price server-side, inserts the order + items, decrements stock — all in one atomic transaction. Called via RPC from `src/services/orders.ts`.
- `04_addresses.sql` — `addresses` table, RLS scoped to `auth.uid()`.
- `05_addresses_optional_coords.sql` — makes `lat`/`lng` nullable (temporary: address form currently skips the map/GPS step).

## `src/data/` — TypeScript types + small static fallback data

Anything not yet backed by the database lives here. Where a table exists, the type here is still the canonical type (services map DB rows onto it).

- `products.ts`, `categories.ts` — `Product`/`Category` types (real data now comes from Supabase via `services/catalog.ts`).
- `orders.ts` — `Order` type (real data via `services/orders.ts`).
- `addresses.ts` — `Address` type + one placeholder seed address (real data via `services/addresses.ts`).
- `banners.ts` — static promo banner content (not in the DB; low-value/rarely-changing).
- `festivals.ts` — hardcoded 2026 Hindu festival dates + theming used by the festive countdown banner.

## `src/services/` — all Supabase calls live here (screens never call Supabase directly)

- `supabase.ts` — creates and exports the Supabase client (AsyncStorage-backed session persistence).
- `catalog.ts` — `fetchCategories()`, `fetchProducts()`. Exports `ProductWithStock` (Product + live `stock`).
- `orders.ts` — `placeOrder(items)` (calls the `place_order` RPC), `fetchOrders()`.
- `addresses.ts` — `fetchAddresses()`, `saveAddress()`, `deleteAddress()`, `setDefaultAddress()`.
- `geocoding.ts` — `getCurrentCoords()` (GPS via `expo-location`), `reverseGeocode()` (free OSM Nominatim). Currently unused by the UI (address form is manual-entry only for now) but kept for when the map step is reintroduced.

## `src/state/` — React Context providers (one per concern, all `createContext` + provider + `useX()` hook)

- `AuthContext.tsx` — session state, `sendMagicLink()`, `signOut()`. Magic-link auth only (no password, no Google yet).
- `CatalogContext.tsx` — loads products/categories once, exposes `getProductById`, `refetchProducts()` (called after checkout so stock updates in the UI).
- `CartContext.tsx` — quantities per product, totals; `increment` is capped at each product's live stock.
- `LocationContext.tsx` — loads the signed-in user's saved addresses, tracks the selected one, exposes add/remove/select/make-default.
- `SidePanelContext.tsx` — open/close state for the right-side drawer (Profile/Settings/Support/FAQ links).
- `ThemeContext.tsx` — light/dark mode toggle + current color palette.

## `src/screens/` — one file per screen, wired to context/services (no static-array imports for live data)

- `HomeScreen.tsx` — search, categories, product grid (from `CatalogContext`).
- `CategoryScreen.tsx` — products filtered by category, with sort.
- `ProductDetailScreen.tsx` — single product, out-of-stock state.
- `CartScreen.tsx` — line items, delivery address row (links to `AddressesScreen`), real checkout via `placeOrder`.
- `OrdersScreen.tsx` — real order history via `fetchOrders()`.
- `AddressesScreen.tsx` — list/select/add/remove/default saved addresses (manual entry form right now).
- `AccountScreen.tsx`, `ProfileScreen.tsx` — signed-in user info, sign out.
- `LoginScreen.tsx`, `SignUpScreen.tsx`, `CheckEmailScreen.tsx` — magic-link auth flow.
- `OrderConfirmationScreen.tsx`, `SettingsScreen.tsx`, `CustomerSupportScreen.tsx`, `FaqScreen.tsx`, `PaymentsScreen.tsx` — static/UI-only screens, no backend wiring yet.

## `src/components/` — shared, reusable UI pieces

- `Button.tsx`, `Card.tsx`, `Badge.tsx`, `ScreenHeader.tsx` — base design-system primitives.
- `ProductCard.tsx`, `CartLineItem.tsx` — product display + add/stepper controls (stock-capped).
- `CategoryItem.tsx`, `PromoBanner.tsx`, `FestiveOfferBanner.tsx` — Home screen content (the festive banner auto-appears when a festival from `data/festivals.ts` is within 21 days, with a live countdown).
- `AppHeader.tsx`, `LocationPickerModal.tsx` — top bar + "Deliver to" address switcher.
- `CartSummaryBar.tsx` — sticky bottom bar showing cart total.
- `SidePanel.tsx` — right-side drawer (Profile/Settings/Support/FAQ).
- `MapPicker.tsx` — OSM/Leaflet map (WebView) for picking a lat/lng. Built but currently unused (see `services/geocoding.ts` note) — kept for when location-based addresses come back.

## `src/navigation/`

- `types.ts` — `RootStackParamList` / `MainTabParamList` (every screen + its params, in one place).
- `navigationRef.ts` — a ref so non-screen code (e.g. a notification handler) could navigate without a `navigation` prop. Currently used for the small no-param-screen navigation helper.

## `src/theme/`

- `colors.ts` — light/dark color palettes (green primary, warm accent, per CLAUDE.md visual spec).
- `spacing.ts`, `typography.ts` — shared spacing scale and text styles.
- `responsive.ts` — `useGridColumns()` (adapts product grid columns to screen width).

## What's real vs. still mock

- **Real (Supabase-backed):** categories, products + stock, orders + checkout, addresses.
- **Mock/static:** promo banners, festival dates, the no-param-screen content (Settings, Support, FAQ, Payments).
- **Not built yet:** Google Sign-In, real payments, live delivery tracking, admin/store-side app.
