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
  VerifyOtp: { mobile: string; fullName?: string };
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  DeliveryTabs: NavigatorScreenParams<DeliveryTabParamList> | undefined;
  InventoryTabs: NavigatorScreenParams<InventoryTabParamList> | undefined;
  Category: { categoryId: string; categoryName: string };
  ProductDetail: { productId: string };
  OrderConfirmation: undefined;
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
  /* Standalone inventory entry only (AppInventory.tsx) — a signed-in account
     without the admin role lands here instead of silently seeing nothing. */
  AccessDenied: undefined;
};
