import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { Order } from '../data/orders';
import { RootStackParamList } from '../navigation/types';
import { fetchOrders } from '../services/orders';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
import { errorMessage } from '../utils/errorMessage';

type Props = NativeStackScreenProps<RootStackParamList, 'SavingsReport'>;

/* Every number here used to be a constant -- a ₹442 week, a per-category
   breakdown and an "AI tip" about tomato prices, shown identically to a
   customer who had never ordered. It now reports what the customer actually
   saved: the discount recorded on their own orders, and nothing else. */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function orderDate(order: Order): Date | null {
  const raw = order.createdAt ?? order.date;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* Cancelled orders were never paid for, so nothing was saved on them. */
function counts(order: Order): boolean {
  return order.status !== 'cancelled' && (order.discount ?? 0) > 0;
}

type DayBucket = { day: string; saved: number };

function lastSevenDays(orders: Order[]): DayBucket[] {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const buckets: DayBucket[] = [];

  for (let back = 6; back >= 0; back--) {
    const d = new Date(today);
    d.setDate(today.getDate() - back);
    buckets.push({ day: DAY_LABELS[d.getDay()], saved: 0 });
  }

  const earliest = new Date(today);
  earliest.setDate(today.getDate() - 6);
  earliest.setHours(0, 0, 0, 0);

  for (const order of orders) {
    if (!counts(order)) continue;
    const when = orderDate(order);
    if (!when || when < earliest || when > today) continue;
    const daysBack = Math.floor((today.getTime() - when.getTime()) / 86400000);
    const index = 6 - Math.min(daysBack, 6);
    buckets[index].saved += order.discount ?? 0;
  }

  return buckets;
}

export function SavingsReportScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchOrders()
      .then(setOrders)
      .catch((err) => setError(errorMessage(err, 'Failed to load your orders')))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const weekly = useMemo(() => lastSevenDays(orders), [orders]);
  const totalWeek = weekly.reduce((sum, d) => sum + d.saved, 0);
  const totalEver = useMemo(
    () => orders.reduce((sum, o) => sum + (counts(o) ? o.discount ?? 0 : 0), 0),
    [orders],
  );
  const maxBar = Math.max(...weekly.map((d) => d.saved), 1);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="My Savings Report" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="My Savings Report" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={38} color={colors.border} />
          <Text style={[typography.body, styles.centerText]}>Couldn't load your savings.</Text>
          <Pressable style={styles.cta} onPress={load}>
            <Text style={styles.ctaText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (totalEver === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="My Savings Report" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🧾</Text>
          <Text style={[typography.subheading, { fontSize: 20, marginTop: spacing.sm }]}>
            Nothing saved yet
          </Text>
          <Text style={[typography.body, styles.centerText]}>
            Use an offer or a coupon on an order and your savings will start showing up here.
          </Text>
          <Pressable style={styles.cta} onPress={() => navigation.navigate('Offers')}>
            <Text style={styles.ctaText}>See Today's Offers</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="My Savings Report" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Saved This Week</Text>
          <Text style={styles.heroAmount}>₹{totalWeek}</Text>
          <Text style={styles.heroSub}>₹{totalEver} saved with us so far</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[typography.subheading, { marginBottom: spacing.md }]}>Daily Breakdown</Text>
          <View style={styles.barChart}>
            {weekly.map((day, i) => (
              <View key={i} style={styles.barCol}>
                <Text style={styles.barAmount}>{day.saved > 0 ? '₹' + day.saved : ''}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.round((day.saved / maxBar) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barDay}>{day.day}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl * 2,
      gap: spacing.md,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    centerText: {
      textAlign: 'center',
      color: colors.textMuted,
      marginTop: spacing.xs,
      lineHeight: 20,
    },
    emptyEmoji: { fontSize: 40 },
    cta: {
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    heroCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: radius.xl,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.xs,
    },
    heroLabel: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.75)',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroAmount: {
      fontSize: 46,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -1,
    },
    heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    barChart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 150,
    },
    barCol: { flex: 1, alignItems: 'center', gap: 4 },
    barAmount: { fontSize: 10, fontWeight: '700', color: colors.textMuted, height: 14 },
    barTrack: {
      width: '58%',
      flex: 1,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    barFill: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: radius.sm,
    },
    barDay: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  });
}
