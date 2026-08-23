import { registerRootComponent } from 'expo';

import App from './App';
import AppInventory from './AppInventory';

// Native builds (Android/iOS) never set this, so App.tsx — customer + rider —
// is what ships to phones. The inventory dashboard only exists as this
// separate web bundle; see package.json's "web:inventory" script.
const Root = process.env.EXPO_PUBLIC_APP_TARGET === 'inventory' ? AppInventory : App;

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
