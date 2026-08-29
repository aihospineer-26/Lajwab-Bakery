import { registerRootComponent } from 'expo';

import App from './App';
import AppInventory from './AppInventory';

/* Which of the two apps this bundle boots.
 *
 * This used to read EXPO_PUBLIC_APP_TARGET alone, and that silently did not
 * work: Expo only inlines EXPO_PUBLIC_* variables it loads from a .env file,
 * so a value passed on the command line was dropped and the comparison folded
 * to false at build time. `npm run build:inventory` therefore produced a
 * byte-identical copy of the customer app -- the dashboard URL opened the
 * shop's onboarding screen. Verified by diffing the two exports: same content
 * hash with and without the variable set.
 *
 * The URL is now what decides, because a deployed web address is a fact the
 * bundler cannot drop. The env var is still honoured when it does get inlined
 * (put it in .env.local, not on the command line), so nothing that already
 * works breaks.
 *
 * Native builds have no window and never set the variable, so phones always
 * get App.tsx -- customer plus rider.
 */
function bootsInventoryDashboard(): boolean {
  if (process.env.EXPO_PUBLIC_APP_TARGET === 'inventory') return true;

  if (typeof window === 'undefined' || !window.location) return false;
  const { pathname, hostname } = window.location;

  /* Serve the dashboard from /admin, or from an admin/dashboard subdomain.
     Either needs the host to fall back to index.html for unknown paths, which
     is the standard single-page-app rewrite. */
  if (/^\/admin(\/|$)/.test(pathname)) return true;
  return /^(admin|dashboard|inventory)\./.test(hostname);
}

const Root = bootsInventoryDashboard() ? AppInventory : App;

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
