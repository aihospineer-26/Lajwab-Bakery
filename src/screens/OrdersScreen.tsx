import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import {
  CUSTOMER_STATUS_LABEL,
  formatOrderRef,
  isAwaitingPayment,
  Order,
  OrderStatus,
  paymentLabel,
} from '../data/orders';
import { RootStackParamList } from '../navigation/types';
import { fetchOrders } from '../services/orders';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
import { SERIF_BOLD } from '../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Orders'>;

/* Drawn from the palette rather than a separate status-colour set, so this
   list reads as the same brand as the tracker it links to -- not a
   dashboard-style rainbow of hues the rest of the app never uses. */
function statusConfig(colors: ColorPalette): Record<OrderStatus, { bg: string; text: string; icon: string }> {
  return {
    placed: { bg: colors.primaryLight, text: colors.primary, icon: '⏳' },
    accepted: { bg: colors.primaryLight, text: colors.primary, icon: '👍' },
    packed: { bg: colors.accentLight, text: colors.accent, icon: '📦' },
    out_for_delivery: { bg: colors.primaryLight, text: colors.primaryDark, icon: '🛵' },
    delivered: { bg: colors.surfaceMuted, text: colors.success, icon: '✅' },
    cancelled: { bg: colors.surfaceMuted, text: colors.danger, icon: '✕' },
  };
}

export function OrdersScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const STATUS_CONFIG = useMemo(() => statusConfig(colors), [colors]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    fetchOrders()
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load orders'))
      .finally(() => {
        setIsLoading(false);
        setIsRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refetches on return from OrderTracking so a cancellation shows up immediately
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => load());
    return unsubscribe;
  }, [navigation, load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="My Orders" onBack={() => navigation.goBack()} />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={38} color={colors.border} />
          <Text style={[typography.body, { textAlign: 'center', marginTop: spacing.sm }]}>
            Couldn't load your orders.
          </Text>
          <Text style={[typography.caption, { textAlign: 'center', marginTop: spacing.xs, color: colors.textMuted }]}>
            Check your connection and try again.
          </Text>
          <Pressable style={styles.emptyBtn} onPress={() => load()}>
            <Text style={styles.emptyBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="bag-handle-outline" size={38} color={colors.border} />
          <Text style={[typography.subheading, { marginTop: spacing.sm, fontSize: 20 }]}>No orders yet</Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center', lineHeight: 20 }]}>
            Your first order is one tap away — and it's 50% off.
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          >
            <Text style={styles.emptyBtnText}>Start Shopping</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => load('refresh')}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.placed;
            return (
              <Pressable
                key={order.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => navigation.navigate('OrderTracking', { orderId: order.id, status: order.status })}
              >
                <View style={styles.cardTop}>
                  <View style={styles.orderIdWrap}>
                    <Text style={styles.orderId}>#{formatOrderRef(order.id)}</Text>
                    <Text style={styles.orderDate}>{order.date}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={styles.statusIcon}>{cfg.icon}</Text>
                    <Text style={[styles.statusText, { color: cfg.text }]}>{CUSTOMER_STATUS_LABEL[order.status]}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Kept on its own line, not merged into the status pill: an
                    order can be out for delivery and still unpaid. */}
                <Text
                  style={[
                    styles.payLine,
                    isAwaitingPayment(order.paymentMethod ?? 'cod', order.paymentStatus ?? 'pending') &&
                      styles.payLineWarn,
                  ]}
                >
                  {paymentLabel(order.paymentMethod ?? 'cod', order.paymentStatus ?? 'pending')}
                </Text>

                <View style={styles.cardBottom}>
                  <View style={styles.itemsRow}>
                    <Ionicons name="bag-handle-outline" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={styles.itemsText}>{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</Text>
                  </View>
                  <Text style={styles.total}>₹{order.total}</Text>
                  <Text style={styles.viewLink}>View details ›</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    centeredEmoji: {
      fontSize: 64,
    },
    emptyBtn: {
      marginTop: spacing.md,
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    emptyBtnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 14 },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    cardPressed: {
      opacity: 0.85,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    orderIdWrap: {
      gap: 2,
    },
    orderId: {
      fontFamily: SERIF_BOLD,
      fontSize: 16,
      color: colors.text,
    },
    orderDate: {
      fontSize: 12,
      color: colors.textMuted,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    statusIcon: {
      fontSize: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700',
    },
    payLine: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    payLineWarn: { color: colors.primaryDark, fontWeight: '700' },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: spacing.sm,
    },
    cardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    itemsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flex: 1,
    },
    itemsIcon: {
      fontSize: 14,
    },
    itemsText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    total: {
      fontFamily: SERIF_BOLD,
      fontSize: 17,
      color: colors.text,
    },
    viewLink: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
  });
}
