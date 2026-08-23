import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Platform, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts,
} from '@expo-google-fonts/playfair-display';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { SidePanel } from './src/components/SidePanel';
import { navigationRef } from './src/navigation/navigationRef';
import { DeliveryTabParamList, MainTabParamList, RootStackParamList } from './src/navigation/types';
import { AccountScreen } from './src/screens/AccountScreen';
import { AddressesScreen } from './src/screens/AddressesScreen';
import { CartScreen } from './src/screens/CartScreen';
import { CategoryScreen } from './src/screens/CategoryScreen';
import { CheckEmailScreen } from './src/screens/CheckEmailScreen';
import { CustomerSupportScreen } from './src/screens/CustomerSupportScreen';
import { FaqScreen } from './src/screens/FaqScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { OrderConfirmationScreen } from './src/screens/OrderConfirmationScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { PaymentsScreen } from './src/screens/PaymentsScreen';
import { PrivacyPolicyScreen } from './src/screens/PrivacyPolicyScreen';
import { ProductDetailScreen } from './src/screens/ProductDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SavingsReportScreen } from './src/screens/SavingsReportScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckoutScreen } from './src/screens/CheckoutScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { OffersScreen } from './src/screens/OffersScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { OrderTrackingScreen } from './src/screens/OrderTrackingScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { WishlistScreen } from './src/screens/WishlistScreen';
import { WishlistProvider } from './src/state/WishlistContext';
import { DeliveryAccountScreen } from './src/screens/delivery/DeliveryAccountScreen';
import { DeliveryEarningsScreen } from './src/screens/delivery/DeliveryEarningsScreen';
import { DeliveryOrdersScreen } from './src/screens/delivery/DeliveryOrdersScreen';
import { AuthProvider, useAuth } from './src/state/AuthContext';
import { CartProvider, useCart } from './src/state/CartContext';
import { CatalogProvider } from './src/state/CatalogContext';
import { AppModeProvider, useAppMode } from './src/state/AppModeContext';
import { LocationProvider } from './src/state/LocationContext';
import { SidePanelProvider } from './src/state/SidePanelContext';
import { ThemeProvider, useTheme } from './src/state/ThemeContext';
import { UserProfileProvider } from './src/state/UserProfileContext';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const DeliveryTab = createBottomTabNavigator<DeliveryTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, string> = {
  Home: '🏠',
  Search: '🔍',
  Cart: '🛒',
  Account: '👤',
};

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevFocused = useRef(focused);

  const nativeDriver = Platform.OS !== 'web';
  const bounce = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.25, useNativeDriver: nativeDriver, speed: 22, bounciness: 18 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: nativeDriver, speed: 18 }),
    ]).start();
  }, [scale, nativeDriver]);

  useEffect(() => {
    if (focused && !prevFocused.current) bounce();
    prevFocused.current = focused;
  }, [focused, bounce]);

  return (
    <Animated.Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5, transform: [{ scale }] }}>
      {icon}
    </Animated.Text>
  );
}

function CartTabIcon({ focused }: { focused: boolean }) {
  const { totalItems } = useCart();
  const scale = useRef(new Animated.Value(1)).current;
  const prevFocused = useRef(focused);
  const prevItems = useRef(totalItems);

  const nativeDriver = Platform.OS !== 'web';
  const bounce = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.28, useNativeDriver: nativeDriver, speed: 22, bounciness: 18 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: nativeDriver, speed: 18 }),
    ]).start();
  }, [scale, nativeDriver]);

  useEffect(() => {
    if (focused && !prevFocused.current) bounce();
    prevFocused.current = focused;
  }, [focused, bounce]);

  useEffect(() => {
    if (totalItems !== prevItems.current) {
      prevItems.current = totalItems;
      bounce();
    }
  }, [totalItems, bounce]);

  return (
    <Animated.Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5, transform: [{ scale }] }}>
      {TAB_ICONS.Cart}{totalItems > 0 ? ` ${totalItems}` : ''}
    </Animated.Text>
  );
}

function TabLabel({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return (
    <Text style={{ fontSize: 11, color, fontWeight: focused ? '700' : '400', marginTop: -2 }}>
      {label}
    </Text>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 12,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={TAB_ICONS.Home} focused={focused} />,
          tabBarLabel: ({ focused, color }) => <TabLabel label="Home" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={TAB_ICONS.Search} focused={focused} />,
          tabBarLabel: ({ focused, color }) => <TabLabel label="Search" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ focused }) => <CartTabIcon focused={focused} />,
          tabBarLabel: ({ focused, color }) => <TabLabel label="Cart" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={TAB_ICONS.Account} focused={focused} />,
          tabBarLabel: ({ focused, color }) => <TabLabel label="Account" focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function DeliveryTabs() {
  const { colors } = useTheme();
  return (
    <DeliveryTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F07A1C',
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 12,
        },
      }}
    >
      <DeliveryTab.Screen
        name="DeliveryOrders"
        component={DeliveryOrdersScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ fontSize: 11, color, fontWeight: focused ? '700' : '400', marginTop: -2 }}>Orders</Text>
          ),
        }}
      />
      <DeliveryTab.Screen
        name="DeliveryEarnings"
        component={DeliveryEarningsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ fontSize: 11, color, fontWeight: focused ? '700' : '400', marginTop: -2 }}>Earnings</Text>
          ),
        }}
      />
      <DeliveryTab.Screen
        name="DeliveryAccount"
        component={DeliveryAccountScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ fontSize: 11, color, fontWeight: focused ? '700' : '400', marginTop: -2 }}>Account</Text>
          ),
        }}
      />
    </DeliveryTab.Navigator>
  );
}

// Skips login while running the dev server so the app can be previewed directly.
// Tied to __DEV__ so a release build always enforces login, whatever this is set to.
// Set to `false` when you want to test the login flow locally.
const SKIP_AUTH_FOR_PREVIEW = __DEV__;

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { mode } = useAppMode();
  const [onboardingChecked, setOnboardingChecked] = React.useState(false);
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem('onboarding_seen').then(val => {
      setNeedsOnboarding(!val);
      setOnboardingChecked(true);
    });
  }, []);

  if (isLoading || !onboardingChecked) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {needsOnboarding ? (
        <Stack.Screen name="Onboarding">
          {props => <OnboardingScreen {...props} onDone={() => setNeedsOnboarding(false)} />}
        </Stack.Screen>
      ) : !session && !SKIP_AUTH_FOR_PREVIEW ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="CheckEmail" component={CheckEmailScreen} />
        </>
      ) : mode === 'delivery' ? (
        <Stack.Screen name="DeliveryTabs" component={DeliveryTabs} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Category" component={CategoryScreen} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
          <Stack.Screen name="Offers" component={OffersScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="CustomerSupport" component={CustomerSupportScreen} />
          <Stack.Screen name="Faq" component={FaqScreen} />
          <Stack.Screen name="Orders" component={OrdersScreen} />
          <Stack.Screen name="Addresses" component={AddressesScreen} />
          <Stack.Screen name="Payments" component={PaymentsScreen} />
          <Stack.Screen name="SavingsReport" component={SavingsReportScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <Stack.Screen name="Wishlist" component={WishlistScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function AppContent() {
  const { colors, isDark } = useTheme();
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      border: colors.border,
      text: colors.text,
      primary: colors.primary,
    },
  };

  return (
    <AuthProvider>
      <UserProfileProvider>
        <AppModeProvider>
        <WishlistProvider>
        <CatalogProvider>
          <CartProvider>
            <LocationProvider>
              <SidePanelProvider>
                <NavigationContainer ref={navigationRef} theme={navigationTheme}>
                  <RootNavigator />
                </NavigationContainer>
                <SidePanel />
              </SidePanelProvider>
            </LocationProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
          </CartProvider>
        </CatalogProvider>
        </WishlistProvider>
        </AppModeProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}

export default function App() {
  /* Rendering before the serif resolves would flash the whole app in the system
     font, so hold the tree back one frame. `error` still lets us through —
     typography.ts falls back to the platform serif rather than blocking boot. */
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
