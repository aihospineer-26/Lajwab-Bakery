import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Wallet'>;

/* Nothing awards coins yet, so the only honest balance is zero. This screen
   previously showed a ₹280 balance and a transaction history to every customer,
   including people who had never ordered -- a balance the bakery would have been
   asked to honour. When the rewards programme is real, this reads from it. */
type Transaction = {
  id: string;
  label: string;
  amount: number;
  date: string;
  type: 'credit' | 'debit';
};

const BALANCE = 0;
const TRANSACTIONS: Transaction[] = [];

/* Described as planned, not promised: no rule below is being applied to anyone's
   account today. */
const HOW_TO_EARN = [
  { icon: '📦', label: 'Place an order', value: 'Cashback on every order' },
  { icon: '👥', label: 'Refer a friend', value: 'Bonus for both of you' },
  { icon: '⭐', label: 'Rate your order', value: 'Coins for each review' },
  { icon: '🎂', label: 'Birthday treat', value: 'A little something on the day' },
];

export function WalletScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Lajwab Wallet" onBack={() => navigation.goBack()} />

      <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹{BALANCE}</Text>
          <Text style={styles.balanceSub}>Lajwab Coins · Auto-applied at checkout</Text>
          <View style={styles.balanceBadge}>
            <Text style={styles.balanceBadgeText}>Coming soon</Text>
          </View>
        </View>

        {/* How to earn */}
        <Text style={styles.sectionTitle}>How You'll Earn</Text>
        <View style={styles.earnCard}>
          {HOW_TO_EARN.map((item, idx) => (
            <View key={item.icon} style={[styles.earnRow, idx < HOW_TO_EARN.length - 1 && styles.earnBorder]}>
              <Text style={styles.earnIcon}>{item.icon}</Text>
              <Text style={styles.earnLabel}>{item.label}</Text>
              <Text style={styles.earnValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Transaction history */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {TRANSACTIONS.length === 0 ? (
          <View style={styles.txEmpty}>
            <Text style={styles.txEmptyEmoji}>🪙</Text>
            <Text style={styles.txEmptyTitle}>No coins yet</Text>
            <Text style={styles.txEmptyBody}>
              Once Lajwab Coins go live, everything you earn and spend will show up here.
            </Text>
          </View>
        ) : (
        <View style={styles.txCard}>
          {TRANSACTIONS.map((tx, idx) => (
            <View key={tx.id} style={[styles.txRow, idx < TRANSACTIONS.length - 1 && styles.txBorder]}>
              <View style={[styles.txIcon, { backgroundColor: tx.type === 'credit' ? '#E0F7EB' : '#FEE2E2' }]}>
                <Text style={styles.txIconText}>{tx.type === 'credit' ? '↓' : '↑'}</Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txLabel}>{tx.label}</Text>
                <Text style={styles.txDate}>{tx.date}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'credit' ? colors.success : colors.danger }]}>
                {tx.type === 'credit' ? '+' : ''}₹{Math.abs(tx.amount)}
              </Text>
            </View>
          ))}
        </View>
        )}

      </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

    balanceCard: {
      backgroundColor: '#1A2C1A',
      borderRadius: radius.xl,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.xs,
    },
    balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
    balanceAmount: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    balanceSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
    balanceBadge: {
      marginTop: spacing.sm,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
    },
    balanceBadgeText: { fontSize: 12, fontWeight: '700', color: colors.success },

    sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text },

    txEmpty: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
    },
    txEmptyEmoji: { fontSize: 30 },
    txEmptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    txEmptyBody: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 19,
    },

    earnCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    earnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    earnBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    earnIcon: { fontSize: 20, width: 28, textAlign: 'center' },
    earnLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
    earnValue: { fontSize: 13, fontWeight: '700', color: colors.primary },

    txCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    txBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    txIconText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
    txInfo: { flex: 1, gap: 2 },
    txLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
    txDate: { fontSize: 11, color: colors.textMuted },
    txAmount: { fontSize: 15, fontWeight: '800' },
  });
}
