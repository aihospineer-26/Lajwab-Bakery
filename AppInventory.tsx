import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { InventoryTabParamList, RootStackParamList } from './src/navigation/types';
import { OtpScreen } from './src/screens/OtpScreen';
import { InventoryAccountScreen } from './src/screens/inventory/InventoryAccountScreen';
import { InventoryOrdersScreen } from './src/screens/inventory/InventoryOrdersScreen';
import { InventoryProductsScreen } from './src/screens/inventory/InventoryProductsScreen';
import { InventoryStockScreen } from './src/screens/inventory/InventoryStockScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/state/AuthContext';
import { CatalogProvider } from './src/state/CatalogContext';
import { ThemeProvider, useTheme } from './src/state/ThemeContext';
import { UserProfileProvider, useUserProfile } from './src/state/UserProfileContext';
import { radius, spacing } from './src/theme';

/* This is the entire standalone Lajwab Bakery Admin entry point. It shares
   screens, services and contexts with the customer/rider app (App.tsx) but
   is bundled and deployed separately — see index.ts for how the two are
   selected, and package.json's "web:inventory" script for local testing. */

const Stack = createNativeStackNavigator<RootStackParamList>();
const InventoryTab = createBottomTabNavigator<InventoryTabParamList>();

function InventoryTabs() {
  const { colors } = useTheme();
  return (
    <InventoryTab.Navigator
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
      <InventoryTab.Screen
        name="InventoryOrders"
        component={InventoryOrdersScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ fontSize: 11, color, fontWeight: focused ? '700' : '400', marginTop: -2 }}>Orders</Text>
          ),
        }}
      />
      <InventoryTab.Screen
        name="InventoryProducts"
        component={InventoryProductsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'pricetags' : 'pricetags-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ fontSize: 11, color, fontWeight: focused ? '700' : '400', marginTop: -2 }}>Products</Text>
          ),
        }}
      />
      <InventoryTab.Screen
        name="InventoryStock"
        component={InventoryStockScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ fontSize: 11, color, fontWeight: focused ? '700' : '400', marginTop: -2 }}>Stock</Text>
          ),
        }}
      />
      <InventoryTab.Screen
        name="InventoryAccount"
        component={InventoryAccountScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ fontSize: 11, color, fontWeight: focused ? '700' : '400', marginTop: -2 }}>Account</Text>
          ),
        }}
      />
    </InventoryTab.Navigator>
  );
}

function AccessDeniedScreen() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const styles = accessDeniedStyles(colors);
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>No dashboard access</Text>
        <Text style={styles.body}>
          This account isn't set up as a store admin. Ask whoever manages Lajwab Bakery to grant
          access, or sign in with an admin account.
        </Text>
        <Pressable style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function accessDeniedStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    emoji: { fontSize: 40 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
    body: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
    button: {
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      marginTop: spacing.md,
    },
    buttonText: { color: colors.textOnPrimary, fontSize: 14, fontWeight: '700' },
  });
}

// Skips login while running the dev server so the dashboard can be previewed
// directly. Tied to __DEV__ so a real deployment always enforces login.
/* Dev builds skip the login wall so every screen stays reachable. Set
   EXPO_PUBLIC_SHOW_AUTH=1 to exercise the real OTP flow while developing. */
const SKIP_AUTH_FOR_PREVIEW = __DEV__ && process.env.EXPO_PUBLIC_SHOW_AUTH !== '1';

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { profile } = useUserProfile();

  if (isLoading) return null;

  /* Role rides on the session, so preview mode has none — open the dashboard
     on the dev server only. A real session is always role-gated. */
  const isDevPreview = __DEV__ && !session;
  const isAdmin = isDevPreview || profile.role === 'admin';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {!session && !SKIP_AUTH_FOR_PREVIEW ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="VerifyOtp" component={OtpScreen} />
        </>
      ) : isAdmin ? (
        <Stack.Screen name="InventoryTabs" component={InventoryTabs} />
      ) : (
        <Stack.Screen name="AccessDenied" component={AccessDeniedScreen} />
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
        <CatalogProvider>
          <NavigationContainer theme={navigationTheme}>
            <RootNavigator />
          </NavigationContainer>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </CatalogProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}

export default function AppInventory() {
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
