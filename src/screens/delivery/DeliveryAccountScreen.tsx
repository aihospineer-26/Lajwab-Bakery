import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TODAY_STATS } from '../../data/deliveries';
import { useAuth } from '../../state/AuthContext';
import { useAppMode } from '../../state/AppModeContext';
import { useTheme } from '../../state/ThemeContext';
import { useUserProfile } from '../../state/UserProfileContext';
import { ColorPalette, radius, spacing } from '../../theme';

const ACCENT = '#F07A1C';

const MENU: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint: string;
}[] = [
  { icon: 'bicycle-outline', label: 'Vehicle & Documents', hint: 'DL 3S CAB 7291' },
  { icon: 'wallet-outline', label: 'Payout Account', hint: 'HDFC ••••4402' },
  { icon: 'time-outline', label: 'Shift Preferences', hint: 'Mon–Sat · 9 AM – 7 PM' },
  { icon: 'help-circle-outline', label: 'Help & Support', hint: '24×7 partner helpline' },
];

export function DeliveryAccountScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { profile, displayName, initials } = useUserProfile();
  const { setMode } = useAppMode();
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons name="moped-outline" size={13} color={ACCENT} />
            <Text style={styles.roleText}>Delivery Partner</Text>
          </View>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F5A623" />
            <Text style={styles.ratingValue}>4.9</Text>
            <Text style={styles.ratingLabel}>· 312 deliveries</Text>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <StatBox value={`${TODAY_STATS.acceptanceRate}%`} label="Acceptance" colors={colors} />
          <StatBox value={`${TODAY_STATS.onlineHours}h`} label="Online today" colors={colors} />
          <StatBox value="98%" label="On-time" colors={colors} />
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU.map((item, idx) => (
            <Pressable
              key={item.label}
              style={[styles.menuRow, idx < MENU.length - 1 && styles.menuBorder]}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={17} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuHint}>{item.hint}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Switch mode */}
        <Pressable style={styles.switchButton} onPress={() => setMode('customer')}>
          <Ionicons name="home-outline" size={18} color={colors.text} />
          <Text style={styles.switchLabel}>Switch to Customer Mode</Text>
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>

        <Pressable style={styles.signOutButton} onPress={signOut}>
          <Feather name="log-out" size={16} color={colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ value, label, colors }: { value: string; label: string; colors: ColorPalette }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.md,
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      alignItems: 'center',
      gap: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: ACCENT,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
      borderWidth: 3,
      borderColor: '#FEF0E3',
    },
    avatarText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
    profileName: { fontSize: 19, fontWeight: '800', color: colors.text },
    profileEmail: { fontSize: 13, color: colors.textMuted },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#FEF0E3',
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.full,
      marginTop: spacing.sm,
    },
    roleText: { fontSize: 12, fontWeight: '800', color: ACCENT },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
    ratingValue: { fontSize: 14, fontWeight: '800', color: colors.text },
    ratingLabel: { fontSize: 12, color: colors.textMuted },

    statsRow: { flexDirection: 'row', gap: spacing.sm },

    menuCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    menuIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    menuHint: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

    switchButton: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    switchLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },

    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      marginTop: spacing.xs,
    },
    signOutText: { fontSize: 14, fontWeight: '700', color: colors.danger },
  });
}
