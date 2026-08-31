import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Order } from '../data/orders';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { fetchOrders } from '../services/orders';
import { useAuth } from '../state/AuthContext';
import { useUserProfile } from '../state/UserProfileContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Account'>,
  NativeStackScreenProps<RootStackParamList>
>;

/* Only what a customer can actually use.
 *
 * Lajwab Wallet, Notifications and Payment Methods were listed here and are
 * gone. Nothing credits a wallet, nothing sends a notification, and Cash on
 * Delivery is the only way to pay -- the payments screen offered to remember
 * cards that no gateway could ever add. A menu row is a promise that something
 * is there, and all three led to a screen that had to explain it was empty.
 * The screens survive in src/screens for whenever a real system arrives. */
const QUICK_LINKS = [
  { id: 'orders', label: 'My Orders', icon: 'cube-outline', screen: 'Orders' as const },
  { id: 'addresses', label: 'Addresses', icon: 'location-outline', screen: 'Addresses' as const },
  { id: 'offers', label: 'Offers', icon: 'pricetag-outline', screen: 'Offers' as const },
];

const SETTINGS = [
  { id: 'profile', label: 'Profile', icon: 'person-outline', screen: 'Profile' as const },
  { id: 'savings', label: 'Your savings', icon: 'trending-down-outline', screen: 'SavingsReport' as const },
  { id: 'support', label: 'Help & Support', icon: 'chatbubble-ellipses-outline', screen: 'CustomerSupport' as const },
  { id: 'settings', label: 'Settings', icon: 'options-outline', screen: 'Settings' as const },
];

const LEGAL = [
  { id: 'faq', label: 'FAQs', icon: 'help-circle-outline', screen: 'Faq' as const },
  { id: 'terms', label: 'Terms of Service', icon: 'document-text-outline', screen: 'Terms' as const },
  { id: 'privacy', label: 'Privacy Policy', icon: 'lock-closed-outline', screen: 'PrivacyPolicy' as const },
];

export function AccountScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signOut, session } = useAuth();
  const { profile, displayName, initials } = useUserProfile();

  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchOrders()
      .then((list) => { if (!cancelled) setOrders(list); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const orderCount = orders.length;
  const totalSaved = orders.reduce(
    (sum, o) => sum + (o.status === 'cancelled' ? 0 : o.discount ?? 0),
    0,
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Green header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{initials}</Text>
        </View>
        <Text style={styles.headerName}>{displayName}</Text>
        {/* Signing in by phone leaves us no email and no name, so the line below
            the heading would just be blank. Point at the fix instead. */}
        <Text style={styles.headerEmail}>
          {profile.email || (profile.name ? profile.phone : 'Tap ✏️ to add your name')}
        </Text>
        <Pressable style={styles.editBtn} onPress={() => (navigation as any).navigate('Profile')} hitSlop={10}>
          <Ionicons name="pencil" size={14} color={colors.textOnPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Real counts from the customer's own orders. These were fixed at
            ₹0 / 0 / "Gold" for everyone, which both understated a real
            customer and contradicted the Profile screen's hardcoded 3. The
            tier is gone until there is a programme behind it. */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{totalSaved}</Text>
            <Text style={styles.statLabel}>Total Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{orderCount}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
        </View>

        {/* Quick links grid */}
        <View style={styles.quickGrid}>
          {QUICK_LINKS.map(link => (
            <Pressable
              key={link.id}
              style={styles.quickItem}
              onPress={() => (navigation as any).navigate(link.screen)}
            >
              <Ionicons name={link.icon as any} size={22} color={colors.primary} />
              <Text style={styles.quickLabel}>{link.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Your account */}
        <View style={styles.sectionCard}>
          <Text style={[typography.subheading, { marginBottom: spacing.sm }]}>Your account</Text>
          {SETTINGS.map((item, idx) => (
            <Pressable
              key={item.id}
              style={[styles.settingRow, idx < SETTINGS.length - 1 && styles.settingBorder]}
              onPress={() => item.screen && (navigation as any).navigate(item.screen)}
              hitSlop={4}
            >
              <Ionicons name={item.icon as any} size={18} color={colors.textMuted} style={{ marginRight: spacing.md }} />
              <Text style={[typography.body, { flex: 1 }]}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* About — the legal pages a food business has to make reachable */}
        <View style={styles.sectionCard}>
          <Text style={[typography.subheading, { marginBottom: spacing.sm }]}>About</Text>
          {LEGAL.map((item, idx) => (
            <Pressable
              key={item.id}
              style={[styles.settingRow, idx < LEGAL.length - 1 && styles.settingBorder]}
              onPress={() => (navigation as any).navigate(item.screen)}
              hitSlop={4}
            >
              <Ionicons name={item.icon as any} size={18} color={colors.textMuted} style={{ marginRight: spacing.md }} />
              <Text style={[typography.body, { flex: 1 }]}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Browsing works signed out, so this doubles as the way in. */}
        {session ? (
          <Pressable style={styles.logoutBtn} onPress={signOut}>
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.signInBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInText}>Sign in</Text>
          </Pressable>
        )}

        {/* Farm Partnership footer */}
        <View style={styles.farmCard}>
          <Text style={styles.farmTitle}>100% Eggless Promise</Text>
          <Text style={styles.farmBody}>
            Every item we bake is pure vegetarian and completely eggless. Serving Janakpuri since 2011.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    /* ── Header ── */
    header: {
      backgroundColor: colors.primaryDark,
      alignItems: 'center',
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      position: 'relative',
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    avatarInitial: {
      fontSize: 28,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    headerName: {
      fontSize: 20,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    headerEmail: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.72)',
      marginTop: 2,
    },
    editBtn: {
      position: 'absolute',
      top: spacing.lg,
      right: spacing.lg,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    /* ── Content ── */
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl * 2,
      gap: spacing.md,
    },
    /* ── Stats ── */
    statsCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      paddingVertical: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '500',
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.xs,
    },
    /* ── Quick links ── */
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    quickItem: {
      width: '47.5%',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      alignItems: 'center',
      gap: spacing.xs,
    },
    quickLabel: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' },
    /* ── Section card ── */
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    chevron: {
      fontSize: 20,
      color: colors.textMuted,
      lineHeight: 22,
    },
    /* ── Settings ── */
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
      gap: spacing.sm,
    },
    settingBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    /* ── Log Out ── */
    signInBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    signInText: {
      color: colors.textOnPrimary,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    logoutBtn: {
      borderWidth: 1.5,
      borderColor: colors.danger,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    logoutText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.danger,
    },
    /* ── Farm Partnership ── */
    farmCard: {
      padding: spacing.md,
      gap: spacing.xs,
    },
    farmTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    farmBody: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 18,
    },
  });
}
