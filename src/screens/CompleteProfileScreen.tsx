import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { FormInput } from '../components/FormInput';
import { RootStackParamList } from '../navigation/types';
import { saveMyProfile } from '../services/profile';
import { STORE } from '../data/store';
import { useUserProfile } from '../state/UserProfileContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CompleteProfile'> & {
  onDone?: () => void;
};

/* One field, asked once, right after the first verified code.
 *
 * Signing in proves a phone number and nothing else, so a brand-new customer
 * had no name anywhere: checkout asked for one on every order, and the bakery
 * got an order addressed to a number.
 *
 * Deliberately just the name. An email is asked for nowhere at sign-up because
 * nothing is sent by email today -- it can be added any time from the Account
 * screen, which is where a detail nobody currently needs belongs.
 */
export function CompleteProfileScreen({ onDone }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { updateProfile } = useUserProfile();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Please tell us your name');
      return;
    }
    if (trimmed.length < 2) {
      setNameError('That looks too short — please enter your full name');
      return;
    }

    setNameError(null);
    setFormError(null);
    setIsSaving(true);
    try {
      await saveMyProfile({ name: trimmed });
      /* Mirrored into the context so the next screen greets them by name
         rather than waiting on a refetch. */
      updateProfile({ name: trimmed });
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
            <Text style={styles.title}>What should we call you?</Text>
            <Text style={styles.subtitle}>
              Your number is verified. Just your name, so {STORE.name} knows who
              the order is for.
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

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Button label="Continue" onPress={save} loading={isSaving} />

            <Text style={styles.footnote}>
              You can change this any time from your account.
            </Text>
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
      gap: spacing.md,
    },
    formError: {
      color: colors.danger,
      fontSize: 13,
      textAlign: 'center',
    },
    footnote: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
