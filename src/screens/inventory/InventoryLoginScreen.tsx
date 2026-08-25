import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { FormInput } from '../../components/FormInput';
import { useAuth } from '../../state/AuthContext';
import { useTheme } from '../../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../../theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Staff sign in with a password, not the customer phone OTP. Two reasons: the
   owner is not left waiting on WhatsApp template approval to reach his own
   inventory, and staff access stays a separate credential from a customer
   login. The admin role still comes from the JWT, so this grants nothing on
   its own. */
export function InventoryLoginScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signInWithPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    const trimmed = email.trim();
    let bad = false;

    if (!trimmed) { setEmailError('Enter your email'); bad = true; }
    else if (!EMAIL_REGEX.test(trimmed)) { setEmailError('Enter a valid email address'); bad = true; }
    if (!password) { setPasswordError('Enter your password'); bad = true; }
    if (bad) return;

    setEmailError(null);
    setPasswordError(null);
    setFormError(null);
    setIsSigningIn(true);
    const error = await signInWithPassword(trimmed, password);
    setIsSigningIn(false);
    /* On success the session lands and AppInventory swaps this screen out. */
    if (error) setFormError(error);
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
              label="Email"
              placeholder="owner@lajwabbakery.in"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailError(null); setFormError(null); }}
              error={emailError ?? undefined}
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
            Lost your password? Ask the bakery to reset it from the Supabase dashboard.
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
