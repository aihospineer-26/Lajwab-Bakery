import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useAuth } from '../state/AuthContext';
import { useUserProfile } from '../state/UserProfileContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Account'>,
  NativeStackScreenProps<RootStackParamList>
>;

const SUBSCRIPTIONS = [
  { id: '1', name: 'Daily Essentials Box', freq: 'Every morning', price: 59, mrp: 89 },
  { id: '2', name: 'Weekly Fruit Basket', freq: 'Every Sunday', price: 299, mrp: 499 },
];

const QUICK_LINKS = [
  { id: 'wishlist', label: 'Saved Items', icon: '❤️', screen: 'Wishlist' as const },
  { id: 'wallet', label: 'Lajwab Wallet', icon: '💰', screen: 'Wallet' as const },
  { id: 'notifications', label: 'Notifications', icon: '🔔', screen: 'Notifications' as const },
  { id: 'orders', label: 'My Orders', icon: '📦', screen: 'Orders' as const },
];

const SETTINGS = [
  { id: 'addresses', label: 'Delivery Addresses', icon: '📍', screen: 'Addresses' as const },
  { id: 'payments', label: 'Payment Methods', icon: '💳', screen: 'Payments' as const },
  { id: 'savings', label: 'My Savings Report', icon: '📊', screen: 'SavingsReport' as const },
  { id: 'support', label: 'Help & Support', icon: '💬', screen: 'CustomerSupport' as const },
  { id: 'privacy', label: 'Privacy Policy', icon: '🔒', screen: 'PrivacyPolicy' as const },
];

export function AccountScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signOut } = useAuth();
  const { profile } = useUserProfile();

  const displayName = profile.name;
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Green header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{initials}</Text>
        </View>
        <Text style={styles.headerName}>{displayName}</Text>
        <Text style={styles.headerEmail}>{profile.email}</Text>
        <Pressable style={styles.editBtn} onPress={() => (navigation as any).navigate('Profile')} hitSlop={10}>
          <Text style={styles.editIcon}>✏️</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats row */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>📉</Text>
            <Text style={styles.statValue}>₹0</Text>
            <Text style={styles.statLabel}>Total Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>📦</Text>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statValue}>Gold</Text>
            <Text style={[styles.statLabel, styles.goldBadge]}>Member</Text>
          </View>
        </View>

        {/* AI Price Insight */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Text style={styles.insightTitle}>🤖 AI Price Insight</Text>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>Live</Text>
            </View>
          </View>
          <Text style={styles.insightBody}>
            Your most-ordered item is the Butter Scotch Pastry. Cookies and namkeen are cheapest by the 500g pack.
          </Text>
          <View style={styles.insightFooter}>
            <Text style={styles.insightSavedLabel}>This week you saved </Text>
            <Text style={styles.insightSavedAmount}>₹347</Text>
            <Text style={styles.insightSavedLabel}> vs market</Text>
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
              <Text style={styles.quickIcon}>{link.icon}</Text>
              <Text style={styles.quickLabel}>{link.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* My Subscriptions */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionRow}>
            <Text style={typography.subheading}>My Subscriptions</Text>
            <Pressable hitSlop={8}>
              <Text style={styles.manageLink}>Manage →</Text>
            </Pressable>
          </View>
          {SUBSCRIPTIONS.map((sub, idx) => (
            <Pressable
              key={sub.id}
              style={[styles.subRow, idx < SUBSCRIPTIONS.length - 1 && styles.subBorder]}
              hitSlop={4}
            >
              <View style={styles.subInfo}>
                <Text style={styles.subName}>{sub.name}</Text>
                <Text style={styles.subFreq}>{sub.freq}</Text>
              </View>
              <View style={styles.subPriceWrap}>
                <Text style={styles.subPrice}>₹{sub.price}</Text>
                <Text style={styles.subMrp}>₹{sub.mrp}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
          <Pressable style={styles.addSubBtn} hitSlop={4}>
            <Text style={styles.addSubText}>+ Add New Subscription</Text>
          </Pressable>
        </View>

        {/* Refer & Earn */}
        <Pressable style={styles.referCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.referTitle}>🎫 Refer &amp; Earn</Text>
            <Text style={styles.referBody}>Invite friends and earn</Text>
            <Text style={styles.referAmount}>₹50 per referral</Text>
          </View>
          <Text style={styles.referArrow}>→</Text>
        </Pressable>

        {/* Settings */}
        <View style={styles.sectionCard}>
          <Text style={[typography.subheading, { marginBottom: spacing.sm }]}>Settings</Text>
          {SETTINGS.map((item, idx) => (
            <Pressable
              key={item.id}
              style={[styles.settingRow, idx < SETTINGS.length - 1 && styles.settingBorder]}
              onPress={() => item.screen && (navigation as any).navigate(item.screen)}
              hitSlop={4}
            >
              <Text style={styles.settingIcon}>{item.icon}</Text>
              <Text style={[typography.body, { flex: 1 }]}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Log Out */}
        <Pressable style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutText}>↪  Log Out</Text>
        </Pressable>

        {/* Farm Partnership footer */}
        <View style={styles.farmCard}>
          <Text style={styles.farmTitle}>🌿 100% Eggless Promise</Text>
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
    editIcon: {
      fontSize: 16,
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
    statIcon: {
      fontSize: 18,
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
    goldBadge: {
      color: '#B8860B',
      fontWeight: '700',
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
    quickIcon: { fontSize: 26 },
    quickLabel: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' },
    /* ── AI Insight ── */
    insightCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    insightTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primary,
    },
    liveRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    liveLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    insightBody: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 19,
    },
    insightFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
      borderRadius: radius.sm,
      padding: spacing.sm,
    },
    insightSavedLabel: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
    insightSavedAmount: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primary,
    },
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
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    manageLink: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    /* ── Subscriptions ── */
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    subBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    subInfo: {
      flex: 1,
    },
    subName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    subFreq: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    subPriceWrap: {
      alignItems: 'flex-end',
    },
    subPrice: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    subMrp: {
      fontSize: 11,
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    chevron: {
      fontSize: 20,
      color: colors.textMuted,
      lineHeight: 22,
    },
    addSubBtn: {
      marginTop: spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    addSubText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
    },
    /* ── Refer & Earn ── */
    referCard: {
      backgroundColor: '#F59E0B',
      borderRadius: radius.lg,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#F59E0B',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    referTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#1A1A1A',
    },
    referBody: {
      fontSize: 12,
      color: 'rgba(0,0,0,0.65)',
      marginTop: 2,
    },
    referAmount: {
      fontSize: 18,
      fontWeight: '900',
      color: '#1A1A1A',
      marginTop: 3,
    },
    referArrow: {
      fontSize: 22,
      color: 'rgba(0,0,0,0.5)',
      fontWeight: '700',
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
    settingIcon: {
      fontSize: 18,
      width: 24,
      textAlign: 'center',
    },
    /* ── Log Out ── */
    logoutBtn: {
      borderWidth: 1.5,
      borderColor: '#E53E3E',
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    logoutText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#E53E3E',
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
