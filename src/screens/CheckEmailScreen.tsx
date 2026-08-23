import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthHero } from '../components/AuthHero';
import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckEmail'>;

export function CheckEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sendMagicLink } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = async () => {
    setResendMessage(null);
    setResendError(null);
    setIsResending(true);
    const error = await sendMagicLink(email);
    setIsResending(false);
    if (error) {
      setResendError(error);
      return;
    }
    setResendMessage('Link resent — check your email.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <AuthHero
          emoji="📩"
          title="Check your email"
          subtitle={`We sent a sign-in link to ${email}. Tap it on this device to continue — this screen will switch automatically once you're signed in.`}
        />

        {resendMessage ? <Text style={styles.success}>{resendMessage}</Text> : null}
        {resendError ? <Text style={styles.error}>{resendError}</Text> : null}

        <Button
          label="Resend link"
          variant="outline"
          loading={isResending}
          onPress={handleResend}
          style={styles.button}
        />

        <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8} style={styles.backWrap}>
          <Text style={[typography.body, styles.back]}>← Back to Sign In</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
    },
    success: {
      color: colors.success,
      fontSize: 13,
      textAlign: 'center',
    },
    error: {
      color: colors.danger,
      fontSize: 13,
      textAlign: 'center',
    },
    button: {
      marginTop: spacing.md,
    },
    backWrap: {
      marginTop: spacing.lg,
      alignItems: 'center',
    },
    back: {
      color: colors.textMuted,
      fontWeight: '600',
    },
  });
}
