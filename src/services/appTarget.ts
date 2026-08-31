/* Which of the two apps this bundle is running as.
 *
 * Lives here rather than in index.ts because the Supabase client needs the same
 * answer, and index.ts imports App/AppInventory -- which import the client.
 * Asking index.ts would be a cycle.
 *
 * The URL is what decides. EXPO_PUBLIC_APP_TARGET is honoured when it actually
 * gets inlined, which only happens from a .env file: a value passed on the
 * command line is dropped by Expo, and the comparison folds to false at build
 * time. That silently shipped the customer app at the dashboard's URL once.
 *
 * Native builds have no window and never set the variable, so phones always get
 * the customer app.
 */
export function isInventoryTarget(): boolean {
  if (process.env.EXPO_PUBLIC_APP_TARGET === 'inventory') return true;

  if (typeof window === 'undefined' || !window.location) return false;
  const { pathname, hostname } = window.location;

  if (/^\/admin(\/|$)/.test(pathname)) return true;
  return /^(admin|dashboard|inventory)\./.test(hostname);
}

/* Separate session storage for the two apps.
 *
 * They share an origin in development (localhost:3000 and localhost:3000/admin)
 * and can share one in production too, so one storage key meant one session:
 * signing into the dashboard also signed you into the shop, as the bakery. The
 * staff account then appeared on the customer Account screen with a name, an
 * email and -- because staff RLS grants every order -- somebody else's order
 * history presented as their own.
 *
 * Two keys, two sessions. Staff sign-in never makes anyone a customer, and the
 * shop opens as a guest until a customer signs in on their own.
 */
export const AUTH_STORAGE_KEY = isInventoryTarget()
  ? 'lajwab-staff-auth'
  : 'lajwab-customer-auth';

/* The profile overrides need splitting for the same reason.
 *
 * Both apps mount UserProfileProvider, and both read profile.name and
 * profile.email off it. With one key the name a customer typed at checkout
 * appeared on the dashboard's Account tab, and the bakery's own name came back
 * the other way -- two different people's details in one slot. The role is
 * unaffected either way: it is read from server-set app_metadata and was never
 * stored here, so this was always cosmetic rather than a way in.
 */
export const PROFILE_STORAGE_KEY = isInventoryTarget()
  ? 'staff_profile'
  : 'user_profile';
