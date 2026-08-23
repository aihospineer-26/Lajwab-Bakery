import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COMPLETED_TODAY, TODAY_STATS, WEEK_EARNINGS } from '../../data/deliveries';
import { useTheme } from '../../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../../theme';

const ACCENT = '#F07A1C';

export function DeliveryEarningsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [range, setRange] = useState<'today' | 'week'>('today');

  const weekTotal = WEEK_EARNINGS.reduce((sum, d) => sum + d.amount, 0);
  const maxDay = Math.max(...WEEK_EARNINGS.map(d => d.amount));
  const shown = range === 'today' ? TODAY_STATS.earned : weekTotal;
  const tipsToday = COMPLETED_TODAY.reduce((sum, o) => sum + o.tip, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <View style={styles.toggle}>
          {(['today', 'week'] as const).map(r => (
            <Pressable
              key={r}
              style={[styles.toggleBtn, range === r && styles.toggleBtnActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.toggleText, range === r && styles.toggleTextActive]}>
                {r === 'today' ? 'Today' : 'This Week'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{range === 'today' ? "Today's Earnings" : "This Week's Earnings"}</Text>
          <Text style={styles.heroAmount}>₹{shown}</Text>
          <View style={styles.heroRow}>
            <HeroStat value={`${range === 'today' ? TODAY_STATS.orders : 24}`} label="Orders" />
            <View style={styles.heroDivider} />
            <HeroStat value={`${range === 'today' ? TODAY_STATS.km : 38.6} km`} label="Distance" />
            <View style={styles.heroDivider} />
            <HeroStat value={`${TODAY_STATS.acceptanceRate}%`} label="Acceptance" />
          </View>
        </View>

        {/* Weekly chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 7 days</Text>
          <View style={styles.chart}>
            {WEEK_EARNINGS.map((d, i) => {
              const isLast = i === WEEK_EARNINGS.length - 1;
              return (
                <View key={d.day} style={styles.barCol}>
                  <Text style={[styles.barValue, isLast && styles.barValueActive]}>₹{d.amount}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${(d.amount / maxDay) * 100}%` },
                        isLast && styles.barFillActive,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barDay, isLast && styles.barDayActive]}>{d.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Payout breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's breakdown</Text>
          <BreakdownRow icon="navigate-outline" label="Delivery payouts" value={TODAY_STATS.earned - tipsToday} colors={colors} />
          <View style={styles.hr} />
          <BreakdownRow icon="heart-outline" label="Customer tips" value={tipsToday} colors={colors} />
          <View style={styles.hr} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{TODAY_STATS.earned}</Text>
          </View>
        </View>

        {/* Payout notice */}
        <View style={styles.payoutBanner}>
          <Ionicons name="wallet-outline" size={18} color="#1A9E55" />
          <View style={{ flex: 1 }}>
            <Text style={styles.payoutTitle}>Weekly payout every Monday</Text>
            <Text style={styles.payoutSub}>₹{weekTotal} will be transferred to your linked account</Text>
          </View>
        </View>

        {/* Completed list */}
        <Text style={styles.sectionLabel}>Completed today</Text>
        {COMPLETED_TODAY.map(order => (
          <View key={order.id} style={styles.row}>
            <View style={styles.rowIcon}>
              <Feather name="check" size={14} color="#1A9E55" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{order.customerName}</Text>
              <Text style={styles.rowMeta}>{order.area} · {order.time}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.rowEarnings}>+₹{order.payout + order.tip}</Text>
              {order.tip > 0 ? <Text style={styles.rowTip}>incl. ₹{order.tip} tip</Text> : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>{value}</Text>
      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{label}</Text>
    </View>
  );
}

function BreakdownRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  colors: ColorPalette;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>₹{value}</Text>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
    toggle: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.full,
      padding: 3,
    },
    toggleBtn: { flex: 1, paddingVertical: 7, borderRadius: radius.full, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    toggleText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    toggleTextActive: { color: colors.text, fontWeight: '800' },

    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

    heroCard: {
      backgroundColor: '#1A2C1A',
      borderRadius: radius.xl,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.xs,
    },
    heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
    heroAmount: { fontSize: 46, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1.5 },
    heroRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, alignSelf: 'stretch' },
    heroDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    cardTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },

    chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, height: 132 },
    barCol: { flex: 1, alignItems: 'center', gap: 5 },
    barValue: { fontSize: 9, fontWeight: '700', color: colors.textMuted },
    barValueActive: { color: ACCENT },
    barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
    barFill: {
      width: '100%',
      backgroundColor: '#A7E9C2',
      borderTopLeftRadius: radius.sm,
      borderTopRightRadius: radius.sm,
      minHeight: 4,
    },
    barFillActive: { backgroundColor: ACCENT },
    barDay: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
    barDayActive: { color: ACCENT, fontWeight: '800' },

    hr: { height: 1, backgroundColor: colors.border },
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
    totalLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
    totalValue: { fontSize: 18, fontWeight: '900', color: '#1A9E55' },

    payoutBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: '#E0F7EB',
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    payoutTitle: { fontSize: 13, fontWeight: '800', color: '#0D7A3E' },
    payoutSub: { fontSize: 12, color: '#1A9E55', marginTop: 1 },

    sectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: spacing.sm,
    },
    row: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    rowIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#E0F7EB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowName: { fontSize: 14, fontWeight: '700', color: colors.text },
    rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    rowEarnings: { fontSize: 15, fontWeight: '800', color: '#1A9E55' },
    rowTip: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  });
}
