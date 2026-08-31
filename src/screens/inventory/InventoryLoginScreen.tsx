import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { FormInput } from '../../components/FormInput';
import { useAuth } from '../../state/AuthContext';
import { useTheme } from '../../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../../theme';

/* Supabase Auth is keyed on email, but the bakery was given a username. The
   username becomes the local part of a fixed internal domain -- the same shape
   the phone accounts already use (<phone>@phone.lajwabbakery.local) -- so staff
   type "Lajwab-bakery2026" and never see an address. Anything containing an @
   is passed through untouched, which keeps the older staff@lajwabbakery.com
   account working without a second field on the form. */
export const STAFF_EMAIL_DOMAIN = '@staff.lajwabbakery.local';

const USERNAME_REGEX = /^[A-Za-z0-9._-]+$/;

export function toStaffEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  return trimmed.toLowerCase() + STAFF_EMAIL_DOMAIN;
}

/* Staff sign in with a password, not the customer phone OTP. Two reasons: the
   owner is not left waiting on WhatsApp template approval to reach his own
   inventory, and staff access stays a separate credential from a customer
   login. The admin role still comes from the JWT, so this grants nothing on
   its own. */
export function InventoryLoginScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signInWithPassword } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    const trimmed = username.trim();
    let bad = false;

    if (!trimmed) { setUsernameError('Enter your username'); bad = true; }
    else if (!trimmed.includes('@') && !USERNAME_REGEX.test(trimmed)) {
      setUsernameError('Letters, numbers, dots and dashes only');
      bad = true;
    }
    if (!password) { setPasswordError('Enter your password'); bad = true; }
    if (bad) return;

    setUsernameError(null);
    setPasswordError(null);
    setFormError(null);
    setIsSigningIn(true);
    const error = await signInWithPassword(toStaffEmail(trimmed), password);
    setIsSigningIn(false);
    /* On success the session lands and AppInventory swaps this screen out. */
    if (error) {
      /* Supabase says "Invalid login credentials" and names the email it tried,
         which is an address the bakery never typed and would only confuse. */
      setFormError(
        /invalid login|credentials/i.test(error)
          ? 'That username and password did not match. Check both and try again.'
          : error,
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="storefront-outline" size={26} color={colors.primary} />
          </View>

          <Text style={styles.title}>Lajwab Bakery</Text>
          <Text style={[typography.overline, styles.overline]}>STAFF ACCESS</Text>
          <Text style={styles.subtitle}>
            Sign in with the account the bakery set up for you. This is not the
            customer app — orders and stock live here.
          </Text>

          <View style={styles.form}>
            <FormInput
              label="Username"
              placeholder="Lajwab-bakery2026"
              autoCapitalize="none"
              value={username}
              onChangeText={(t) => { setUsername(t); setUsernameError(null); setFormError(null); }}
              error={usernameError ?? undefined}
            />

            <FormInput
              label="Password"
              placeholder="••••••••"
              autoCapitalize="none"
              secureTextEntry
              value={password}
              onChangeText={(t) => { setPassword(t); setPasswordError(null); setFormError(null); }}
              error={passwordError ?? undefined}
            />

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Button label="Sign in" onPress={handleSignIn} loading={isSigningIn} />
          </View>

          <Text style={styles.footnote}>
            Lost your password? It can be reset from the Supabase dashboard.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    badge: {
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: spacing.md,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    overline: {
      textAlign: 'center',
      color: colors.primary,
      marginTop: 4,
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    form: {
      gap: spacing.md,
      marginTop: spacing.xl,
    },
    formError: {
      color: colors.danger,
      fontSize: 13,
      textAlign: 'center',
    },
    footnote: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
  });
}
