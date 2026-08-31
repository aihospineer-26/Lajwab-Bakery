import { registerRootComponent } from 'expo';

import App from './App';
import AppInventory from './AppInventory';
import { isInventoryTarget } from './src/services/appTarget';

/* Which app boots is decided by isInventoryTarget() in
   src/services/appTarget.ts -- the Supabase client needs the same answer for
   its session storage key, and asking this file would be an import cycle. */

const Root = isInventoryTarget() ? AppInventory : App;

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
