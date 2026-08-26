import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthHero } from '../components/AuthHero';
import { Button } from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import {
  CHANNEL_LABEL,
  OTP_CHANNEL,
  OTP_DEMO_MODE,
  OTP_LENGTH,
  RESEND_SECONDS,
  digitsOnly,
  formatMobile,
} from '../services/otp';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOtp'>;

export function OtpScreen({ route, navigation }: Props) {
  const { mobile, fullName } = route.params;
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sendOtp, verifyOtp, demoCode } = useAuth();

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const inputRef = useRef<TextInput>(null);
  const submittedFor = useRef<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const submit = async (value: string) => {
    if (submittedFor.current === value) return;
    submittedFor.current = value;
    setError(null);
    setNotice(null);
    setIsVerifying(true);
    const verifyError = await verifyOtp(mobile, value);
    setIsVerifying(false);
    /* On success the session lands and the root navigator swaps this screen
       out, so there is nothing to navigate to here. */
    if (verifyError) {
      setError(verifyError);
      setCode('');
      submittedFor.current = null;
      inputRef.current?.focus();
    }
  };

  const handleChange = (text: string) => {
    const next = digitsOnly(text).slice(0, OTP_LENGTH);
    setCode(next);
    setError(null);
    if (next.length === OTP_LENGTH) submit(next);
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    setIsResending(true);
    const sendError = await sendOtp(mobile, fullName);
    setIsResending(false);
    if (sendError) {
      setError(sendError);
      return;
    }
    setCode('');
    submittedFor.current = null;
    setSecondsLeft(RESEND_SECONDS);
    setNotice(
      OTP_DEMO_MODE
        ? 'New code generated.'
        : 'We sent a new code ' + CHANNEL_LABEL[OTP_CHANNEL] + '.',
    );
  };

  const boxes = Array.from({ length: OTP_LENGTH });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <AuthHero
            emoji="💬"
            title="Enter the code"
            subtitle={
              OTP_DEMO_MODE
                ? 'Demo mode — no message is sent. Your code is shown below.'
                : 'We sent a ' + OTP_LENGTH + '-digit code ' + CHANNEL_LABEL[OTP_CHANNEL] + ' to +91 ' + formatMobile(mobile) + '.'
            }
          />

          {OTP_DEMO_MODE && demoCode ? (
            <View style={styles.demoBox}>
              <Text style={styles.demoLabel}>DEMO CODE</Text>
              <Text style={styles.demoCode}>{demoCode}</Text>
            </View>
          ) : null}

          <Pressable
            style={styles.boxRow}
            onPress={() => inputRef.current?.focus()}
            accessibilityRole="button"
            accessibilityLabel={
              code.length === 0
                ? 'Enter the ' + OTP_LENGTH + '-digit code'
                : code.length + ' of ' + OTP_LENGTH + ' digits entered'
            }
          >
            {boxes.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.box,
                  i === code.length && styles.boxActive,
                  error ? styles.boxError : null,
                ]}
              >
                <Text style={styles.boxText}>{code[i] ?? ''}</Text>
              </View>
            ))}
          </Pressable>

          {/* One real field behind the boxes so paste and SMS autofill work. */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            accessibilityLabel={'Verification code, ' + OTP_LENGTH + ' digits'}
            value={code}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.success}>{notice}</Text> : null}

          <Button
            label="Verify"
            loading={isVerifying}
            disabled={code.length < OTP_LENGTH}
            onPress={() => submit(code)}
            style={styles.button}
          />

          {secondsLeft > 0 ? (
            <Text style={[typography.caption, styles.resendWait]}>
              Resend code in {secondsLeft}s
            </Text>
          ) : (
            <Pressable
              onPress={handleResend}
              disabled={isResending}
              hitSlop={8}
              style={styles.resendWrap}
            >
              <Text style={[typography.body, styles.resend]}>
                {isResending ? 'Sending…' : 'Resend code'}
              </Text>
            </Pressable>
          )}

          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.backWrap}>
            <Text style={[typography.body, styles.back]}>← Change number</Text>
          </Pressable>
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
      gap: spacing.sm,
    },
    demoBox: {
      alignItems: 'center',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
      gap: 2,
    },
    demoLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.6,
      color: colors.textMuted,
    },
    demoCode: {
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: 8,
      color: colors.primary,
    },
    boxRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    box: {
      flex: 1,
      aspectRatio: 0.82,
      maxWidth: 52,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxActive: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    boxError: {
      borderColor: colors.danger,
    },
    boxText: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    hiddenInput: {
      position: 'absolute',
      opacity: 0,
      height: 1,
      width: 1,
    },
    error: {
      color: colors.danger,
      fontSize: 13,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    success: {
      color: colors.success,
      fontSize: 13,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    button: { marginTop: spacing.md },
    resendWait: {
      textAlign: 'center',
      color: colors.textMuted,
      marginTop: spacing.md,
    },
    resendWrap: { marginTop: spacing.md, alignItems: 'center' },
    resend: { color: colors.primary, fontWeight: '700' },
    backWrap: { marginTop: spacing.lg, alignItems: 'center' },
    back: { color: colors.textMuted, fontWeight: '600' },
  });
}
