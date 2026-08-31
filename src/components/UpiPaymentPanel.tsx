import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { paymentNote, upiIntentUrl } from '../data/orders';
import { STORE } from '../data/store';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
import { SERIF_BOLD } from '../theme/typography';

type Props = {
  orderId: string;
  amount: number;
  vpa: string;
};

/* How a customer actually pays, with no gateway behind it.
 *
 * Everything here is instructions and a deep link. Nothing on this panel can
 * mark the order paid -- not opening the UPI app, not coming back from it.
 * Only the bakery, having seen the money land, can do that from the dashboard,
 * which is why the wait is stated plainly at the bottom rather than left to
 * look like a screen that failed to update.
 */
export function UpiPaymentPanel({ orderId, amount, vpa }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [copied, setCopied] = useState<'vpa' | 'note' | null>(null);
  const checkScale = useRef(new Animated.Value(1)).current;

  const note = paymentNote(orderId);

  const copy = async (value: string, which: 'vpa' | 'note') => {
    try {
      await Clipboard.setStringAsync(value);
      setCopied(which);
      checkScale.setValue(0.6);
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 14 }).start();
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* Nothing useful to say -- the value is on screen and selectable either
         way, so a failed copy costs the customer a long-press, not the order. */
    }
  };

  /* Android resolves upi:// to whichever payment apps are installed. Desktop
     browsers generally do not, so there the VPA above is the whole mechanism
     and offering a button that silently does nothing would be worse than not
     offering one. */
  const canOpenUpiApp = Platform.OS === 'android' || Platform.OS === 'ios';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="phone-portrait-outline" size={17} color={colors.primary} />
        <Text style={styles.title}>Pay ₹{amount} by UPI</Text>
      </View>

      <Text style={styles.intro}>
        Send the payment to the UPI ID below. Please use this ID — payments sent
        anywhere else cannot be matched to your order.
      </Text>

      <Text style={styles.fieldLabel}>UPI ID</Text>
      <Pressable style={styles.valueRow} onPress={() => copy(vpa, 'vpa')} accessibilityRole="button" accessibilityLabel={'Copy UPI ID ' + vpa}>
        <Text style={styles.vpa} selectable>{vpa}</Text>
        <View style={styles.copyBtn}>
          <Animated.View style={{ transform: [{ scale: copied === 'vpa' ? checkScale : 1 }] }}>
            <Ionicons name={copied === 'vpa' ? 'checkmark' : 'copy-outline'} size={14} color={colors.primary} />
          </Animated.View>
          <Text style={styles.copyText}>{copied === 'vpa' ? 'Copied' : 'Copy'}</Text>
        </View>
      </Pressable>

      <Text style={styles.fieldLabel}>Add this note to the payment</Text>
      <Pressable style={styles.valueRow} onPress={() => copy(note, 'note')} accessibilityRole="button" accessibilityLabel={'Copy payment note ' + note}>
        <Text style={styles.note} selectable>{note}</Text>
        <View style={styles.copyBtn}>
          <Animated.View style={{ transform: [{ scale: copied === 'note' ? checkScale : 1 }] }}>
            <Ionicons name={copied === 'note' ? 'checkmark' : 'copy-outline'} size={14} color={colors.primary} />
          </Animated.View>
          <Text style={styles.copyText}>{copied === 'note' ? 'Copied' : 'Copy'}</Text>
        </View>
      </Pressable>
      <Text style={styles.hint}>It is how the bakery matches your payment to this order.</Text>

      {canOpenUpiApp ? (
        <Pressable
          style={styles.openBtn}
          onPress={() => Linking.openURL(upiIntentUrl(vpa, STORE.name, amount, orderId))}
          accessibilityRole="button"
        >
          <Text style={styles.openBtnText}>Open UPI App</Text>
        </Pressable>
      ) : null}

      <View style={styles.waiting}>
        <Ionicons name="time-outline" size={15} color={colors.textMuted} />
        <Text style={styles.waitingText}>
          Waiting for the bakery to confirm your payment. This updates on its own
          once they have checked — you do not need to do anything else here.
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.primary,
      padding: spacing.md,
      gap: spacing.xs,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    title: { fontFamily: SERIF_BOLD, fontSize: 17, color: colors.text },
    intro: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    fieldLabel: {
      fontSize: 10.5,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    vpa: { flex: 1, fontFamily: SERIF_BOLD, fontSize: 18, letterSpacing: 0.2, color: colors.text },
    note: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    copyText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    hint: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
    openBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    openBtnText: { color: colors.textOnPrimary, fontSize: 15, fontWeight: '800' },
    waiting: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    waitingText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  });
}
