import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Cart: undefined;
  Account: undefined;
};

export type DeliveryTabParamList = {
  DeliveryOrders: undefined;
  DeliveryEarnings: undefined;
  DeliveryAccount: undefined;
};

export type InventoryTabParamList = {
  InventoryOrders: undefined;
  InventoryProducts: undefined;
  InventoryStock: undefined;
  InventoryAccount: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  /* Same screen as Login, shown once at first launch with a Skip control. */
  SignInPrompt: undefined;
  InventoryLogin: undefined;
  VerifyOtp: { mobile: string; fullName?: string };
  /* Shown once, straight after the first verified code, while profiles.name
     is still empty. Not reachable by hand -- RootNavigator mounts it instead
     of the shop, so it cannot be skipped past or arrived at twice. */
  CompleteProfile: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  DeliveryTabs: NavigatorScreenParams<DeliveryTabParamList> | undefined;
  InventoryTabs: NavigatorScreenParams<InventoryTabParamList> | undefined;
  Category: { categoryId: string; categoryName: string };
  ProductDetail: { productId: string };
  /* The real order place_order just created. Never optional: the screen shows
     the database's own status for this row, and without an id it would have
     nothing to read and would be back to inventing progress. */
  OrderConfirmation: { orderId: string };
  Checkout: undefined;
  OrderTracking: { orderId: string; status: string };
  Offers: undefined;
  Notifications: undefined;
  Wallet: undefined;
  Onboarding: undefined;
  Profile: undefined;
  Settings: undefined;
  CustomerSupport: undefined;
  Faq: undefined;
  Orders: undefined;
  Addresses: undefined;
  Payments: undefined;
  SavingsReport: undefined;
  PrivacyPolicy: undefined;
  Terms: undefined;
  /* Standalone inventory entry only (AppInventory.tsx) — a signed-in account
     without the admin role lands here instead of silently seeing nothing. */
  AccessDenied: undefined;
};
