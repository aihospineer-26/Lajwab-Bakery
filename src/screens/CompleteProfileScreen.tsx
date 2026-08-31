import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { FormInput } from '../components/FormInput';
import { RootStackParamList } from '../navigation/types';
import { isValidEmail, saveMyProfile } from '../services/profile';
import { STORE } from '../data/store';
import { useUserProfile } from '../state/UserProfileContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CompleteProfile'> & {
  onDone?: () => void;
};

/* Asked once, the first time an account exists.
 *
 * Sign-in verifies a phone number and nothing else, so a brand-new customer had
 * no name anywhere -- checkout asked for one every time, and the bakery got an
 * order addressed to a phone number. This is the one moment where asking is
 * cheap: the account has just been created and nothing is waiting on it.
 *
 * The name is required because somebody has to be handed the box. The email is
 * not, and says so, because there is nothing the bakery currently sends by
 * email and pretending otherwise would be collecting an address for its own
 * sake.
 */
export function CompleteProfileScreen({ onDone }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { updateProfile } = useUserProfile();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async (withEmail: boolean) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Please tell us your name');
      return;
    }
    if (trimmedName.length < 2) {
      setNameError('That looks too short — please enter your full name');
      return;
    }
    const trimmedEmail = withEmail ? email.trim() : '';
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setEmailError("That doesn't look like an email address");
      return;
    }

    setNameError(null);
    setEmailError(null);
    setFormError(null);
    setIsSaving(true);
    try {
      await saveMyProfile({ name: trimmedName, email: trimmedEmail });
      /* Mirrored into the context so the very next screen greets them by name
         rather than waiting on a refetch. */
      updateProfile({ name: trimmedName, ...(trimmedEmail ? { email: trimmedEmail } : {}) });
      onDone?.();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Couldn't save that. Check your connection and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.logoMark}>
              <Text style={styles.logoEmoji}>🌿</Text>
            </View>
            <Text style={styles.title}>Welcome to {STORE.name}</Text>
            <Text style={styles.subtitle}>
              Your number is verified. Just one thing before you start —
              who are we baking for?
            </Text>
          </View>

          <View style={styles.form}>
            <FormInput
              label="Your name"
              placeholder="e.g. Rishit Sharma"
              autoCapitalize="words"
              value={name}
              onChangeText={(t) => { setName(t); setNameError(null); }}
              error={nameError ?? undefined}
            />
            <Text style={styles.fieldHint}>
              This is the name the bakery will see on your orders.
            </Text>

            <FormInput
              label="Email (optional)"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailError(null); }}
              error={emailError ?? undefined}
            />
            <Text style={styles.fieldHint}>
              Only for order receipts. The bakery calls you about deliveries, so
              you can leave this blank.
            </Text>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Button label="Continue" onPress={() => save(true)} loading={isSaving} />

            {/* The email is optional, and an optional field with no visible way
                past it is not optional. This skips the email, never the name. */}
            <Pressable
              style={styles.skip}
              onPress={() => save(false)}
              disabled={isSaving}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Continue without adding an email"
            >
              <Text style={styles.skipText}>Skip the email</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center' },

    hero: {
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.lg,
      gap: 6,
    },
    logoMark: {
      width: 54,
      height: 54,
      borderRadius: radius.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    logoEmoji: { fontSize: 24 },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: 'center',
      maxWidth: 320,
    },

    form: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
    },
    fieldHint: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
      marginTop: -spacing.xs,
      marginBottom: spacing.sm,
    },
    formError: {
      color: colors.danger,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    skip: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    skipText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
    },
  });
}
