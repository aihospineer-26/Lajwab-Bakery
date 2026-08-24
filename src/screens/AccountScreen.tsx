import { Ionicons } from '@expo/vector-icons';
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

const QUICK_LINKS = [
  { id: 'wallet', label: 'Lajwab Wallet', icon: 'wallet-outline', screen: 'Wallet' as const },
  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', screen: 'Notifications' as const },
  { id: 'orders', label: 'My Orders', icon: 'cube-outline', screen: 'Orders' as const },
];

const SETTINGS = [
  { id: 'addresses', label: 'Delivery Addresses', icon: 'location-outline', screen: 'Addresses' as const },
  { id: 'payments', label: 'Payment Methods', icon: 'card-outline', screen: 'Payments' as const },
  { id: 'support', label: 'Help & Support', icon: 'chatbubble-ellipses-outline', screen: 'CustomerSupport' as const },
  { id: 'privacy', label: 'Privacy Policy', icon: 'lock-closed-outline', screen: 'PrivacyPolicy' as const },
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
          <Ionicons name="pencil" size={14} color={colors.textOnPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats row */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
              <Text style={styles.statValue}>₹0</Text>
            <Text style={styles.statLabel}>Total Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
              <Text style={styles.statValue}>Gold</Text>
            <Text style={[styles.statLabel, styles.goldBadge]}>Member</Text>
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
              <Ionicons name={item.icon as any} size={18} color={colors.textMuted} style={{ marginRight: spacing.md }} />
              <Text style={[typography.body, { flex: 1 }]}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Log Out */}
        <Pressable style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

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
