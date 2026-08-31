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
import { InventoryAccountScreen } from './src/screens/inventory/InventoryAccountScreen';
import { InventoryOrdersScreen } from './src/screens/inventory/InventoryOrdersScreen';
import { InventoryProductsScreen } from './src/screens/inventory/InventoryProductsScreen';
import { InventoryStockScreen } from './src/screens/inventory/InventoryStockScreen';
import { InventoryLoginScreen } from './src/screens/inventory/InventoryLoginScreen';
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

/* The dashboard has no guest mode, on any build.
 *
 * A dev-server preview used to open the whole dashboard with no login at all,
 * and a signed-out visitor counted as an admin so every screen stayed
 * browsable. It was convenient and it was indefensible: the one surface that
 * moves real orders and real stock was the one surface you could reach without
 * a password. Sign in, or see the sign-in screen. */

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { profile } = useUserProfile();

  if (isLoading) return null;

  const isAdmin = profile.role === 'admin';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {!session ? (
        <Stack.Screen name="InventoryLogin" component={InventoryLoginScreen} />
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
          <NavigationContainer
            theme={navigationTheme}
            documentTitle={{ formatter: () => 'Lajwab Bakery — Staff' }}
          >
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
