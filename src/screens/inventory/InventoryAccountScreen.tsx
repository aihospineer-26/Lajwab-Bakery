import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuth } from '../../state/AuthContext';
import { useCatalog } from '../../state/CatalogContext';
import { useTheme } from '../../state/ThemeContext';
import { useUserProfile } from '../../state/UserProfileContext';
import { fetchStoreSettings, saveStoreSettings } from '../../services/storeSettings';
import { ColorPalette, radius, spacing } from '../../theme';
import { errorMessage } from '../../utils/errorMessage';

export function InventoryAccountScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { profile, displayName, initials } = useUserProfile();
  const { products, categories } = useCatalog();
  const { signOut, session } = useAuth();

  /* The FSSAI licence number is legally required on the customer-facing
     screens, and it used to live in a source file -- so launch waited on a
     developer being free to type it in. The owner enters it here instead. */
  const [fssai, setFssai] = useState('');
  const [gstin, setGstin] = useState('');
  const [upiVpa, setUpiVpa] = useState('');
  const [legalState, setLegalState] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [legalError, setLegalError] = useState<string | null>(null);

  useEffect(() => {
    fetchStoreSettings(true)
      .then((s) => {
        setFssai(s.fssai);
        setGstin(s.gstin);
        setUpiVpa(s.upiVpa);
        setLegalState('idle');
      })
      .catch(() => setLegalState('idle'));
  }, []);

  const saveLegal = async () => {
    setLegalState('saving');
    setLegalError(null);
    try {
      await saveStoreSettings({ fssai, gstin, upiVpa });
      setLegalState('saved');
    } catch (err) {
      setLegalState('error');
      setLegalError(errorMessage(err, 'Could not save'));
    }
  };

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

          <View style={styles.legalCard}>
            <Text style={styles.legalTitle}>Licence, registration &amp; payment</Text>
            <Text style={styles.legalHint}>
              Your FSSAI number is shown to customers on the Help and Terms screens. It is
              required by law for a food business. While it is blank, nothing is displayed.
            </Text>

            <Text style={styles.legalLabel}>FSSAI licence number</Text>
            <TextInput
              style={styles.legalInput}
              value={fssai}
              onChangeText={setFssai}
              placeholder="14-digit number from your certificate"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              editable={legalState !== 'loading' && legalState !== 'saving'}
              accessibilityLabel="FSSAI licence number"
            />

            <Text style={styles.legalLabel}>GSTIN (leave blank if not registered)</Text>
            <TextInput
              style={styles.legalInput}
              value={gstin}
              onChangeText={setGstin}
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              editable={legalState !== 'loading' && legalState !== 'saving'}
              accessibilityLabel="GSTIN"
            />

            <Text style={styles.legalLabel}>UPI ID / VPA</Text>
            <TextInput
              style={styles.legalInput}
              value={upiVpa}
              onChangeText={setUpiVpa}
              placeholder="yourshop@okhdfcbank"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={legalState !== 'loading' && legalState !== 'saving'}
              accessibilityLabel="UPI ID"
            />
            <Text style={styles.legalHint}>
              Customers pay into this before you prepare their order. Leave it blank
              and online payment simply does not appear at checkout — everything
              stays Cash on Delivery. Check the ID character by character: a wrong
              one sends your customers' money to a stranger.
            </Text>

            {legalError ? <Text style={styles.legalError}>{legalError}</Text> : null}

            <Pressable
              style={[styles.legalSave, legalState === 'saving' && styles.legalSaveBusy]}
              onPress={saveLegal}
              disabled={legalState === 'loading' || legalState === 'saving'}
            >
              {legalState === 'saving' ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.legalSaveText}>
                  {legalState === 'saved' ? 'Saved' : 'Save'}
                </Text>
              )}
            </Pressable>
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

    legalCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.xs,
    },
    legalTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    legalHint: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginBottom: spacing.xs },
    legalLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: spacing.xs },
    legalInput: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 15,
      color: colors.text,
    },
    legalError: { fontSize: 12, color: colors.danger, marginTop: spacing.xs },
    legalSave: {
      marginTop: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    legalSaveBusy: { opacity: 0.7 },
    legalSaveText: { color: colors.textOnPrimary, fontWeight: '800', fontSize: 14 },
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
