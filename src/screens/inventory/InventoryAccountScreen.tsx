import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../state/AuthContext';
import { useCatalog } from '../../state/CatalogContext';
import { useTheme } from '../../state/ThemeContext';
import { useUserProfile } from '../../state/UserProfileContext';
import { ColorPalette, radius, spacing } from '../../theme';

export function InventoryAccountScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { profile, displayName, initials } = useUserProfile();
  const { products, categories } = useCatalog();
  const { signOut, session } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="storefront-outline" size={13} color={colors.primary} />
              <Text style={styles.roleText}>Store Manager</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatBox value={String(products.length)} label="Products" colors={colors} />
            <StatBox value={String(categories.length)} label="Categories" colors={colors} />
          </View>

          {!session && (
            <View style={styles.noticeCard}>
              <Feather name="info" size={15} color={colors.accent} />
              <Text style={styles.noticeText}>
                Preview mode — stock edits are saved on this device only. Sign in as an admin to
                write to the live catalogue.
              </Text>
            </View>
          )}

          <Pressable style={styles.signOutButton} onPress={signOut}>
            <Feather name="log-out" size={16} color={colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

function StatBox({
  value,
  label,
  colors,
}: {
  value: string;
  label: string;
  colors: ColorPalette;
}) {
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
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
      borderWidth: 3,
      borderColor: colors.primaryLight,
    },
    avatarText: { fontSize: 28, fontWeight: '800', color: colors.textOnPrimary },
    profileName: { fontSize: 19, fontWeight: '800', color: colors.text },
    profileEmail: { fontSize: 13, color: colors.textMuted },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.full,
      marginTop: spacing.sm,
    },
    roleText: { fontSize: 12, fontWeight: '800', color: colors.primary },

    statsRow: { flexDirection: 'row', gap: spacing.sm },

    noticeCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: colors.accentLight,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    noticeText: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 18 },

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
