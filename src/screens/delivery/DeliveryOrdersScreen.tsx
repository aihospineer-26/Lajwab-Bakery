import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Order, OrderItem, OrderStatus, STATUS_LABEL } from '../../data/orders';
import { fetchActiveOrders, fetchOrderItems, updateOrderStatus } from '../../services/orders';
import { useTheme } from '../../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../../theme';
import { errorMessage } from '../../utils/errorMessage';

const ACCENT = '#F07A1C';

const STATUS_META: Record<string, { color: string; bg: string }> = {
  placed: { color: '#D97706', bg: '#FEF3C7' },
  accepted: { color: '#2563EB', bg: '#EFF6FF' },
  packed: { color: '#7C3AED', bg: '#F3E8FF' },
  out_for_delivery: { color: '#1A9E55', bg: '#E0F7EB' },
};

/* The rider drives the order along this chain; each tap is a real status write. */
const NEXT_STATUS: Partial<Record<OrderStatus, { to: OrderStatus; label: string; icon: keyof typeof Feather.glyphMap }>> = {
  placed: { to: 'accepted', label: 'Accept Order', icon: 'check' },
  accepted: { to: 'packed', label: 'Mark Packed', icon: 'package' },
  packed: { to: 'out_for_delivery', label: 'Start Delivery', icon: 'navigation' },
  out_for_delivery: { to: 'delivered', label: 'Mark Delivered', icon: 'check-circle' },
};

export function DeliveryOrdersScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isOnline, setIsOnline] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      setOrders(await fetchActiveOrders());
    } catch (err) {
      setError(errorMessage(err, 'Could not load orders'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* Polling rather than Realtime: the queue is small and a rider glancing at a
     10s-stale list is fine, where a dropped socket on mobile data is not. */
  useEffect(() => {
    if (!isOnline) return;
    const id = setInterval(() => load('refresh'), 10000);
    return () => clearInterval(id);
  }, [isOnline, load]);

  const advance = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setBusyId(order.id);
    setError(null);
    try {
      await updateOrderStatus(order.id, next.to);
      await load('refresh');
    } catch (err) {
      setError(errorMessage(err, 'Could not update order'));
    } finally {
      setBusyId(null);
    }
  };

  const totalPayout = orders.length * 45;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={[styles.onlineDot, !isOnline && styles.offlineDot]} />
          <View>
            <Text style={styles.topBarTitle}>{isOnline ? 'You’re Online' : 'You’re Offline'}</Text>
            <Text style={styles.topBarSub}>
              {isOnline ? `${orders.length} order${orders.length !== 1 ? 's' : ''} in queue` : 'Go online to receive orders'}
            </Text>
          </View>
        </View>
        <Switch
          value={isOnline}
          onValueChange={setIsOnline}
          trackColor={{ false: '#D1D5DB', true: '#A7E9C2' }}
          thumbColor={isOnline ? '#1A9E55' : '#F3F4F6'}
        />
      </View>

      <View style={styles.statStrip}>
        <StatCell icon="cube-outline" value={`${orders.length}`} label="In queue" colors={colors} />
        <View style={styles.statDivider} />
        <StatCell icon="cash-outline" value={`₹${totalPayout}`} label="Est. payout" colors={colors} />
        <View style={styles.statDivider} />
        <StatCell
          icon="flash-outline"
          value={`${orders.filter(o => o.status === 'out_for_delivery').length}`}
          label="On the way"
          colors={colors}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load('refresh')} tintColor={ACCENT} colors={[ACCENT]} />
          }
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!isOnline ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="sleep" size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>You’re offline</Text>
              <Text style={styles.emptyBody}>Turn on the switch above to start receiving orders.</Text>
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="check-circle-outline" size={44} color="#1A9E55" />
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptyBody}>No orders waiting. New ones appear here automatically.</Text>
            </View>
          ) : (
            orders.map(order => (
              <JobCard
                key={order.id}
                order={order}
                styles={styles}
                colors={colors}
                isBusy={busyId === order.id}
                onAdvance={advance}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatCell({
  icon,
  value,
  label,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  colors: ColorPalette;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Ionicons name={icon} size={16} color={ACCENT} />
      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

type JobCardProps = {
  order: Order;
  styles: ReturnType<typeof createStyles>;
  colors: ColorPalette;
  isBusy: boolean;
  onAdvance: (order: Order) => void;
};

function JobCard({ order, styles, colors, isBusy, onAdvance }: JobCardProps) {
  const [items, setItems] = useState<OrderItem[] | null>(null);
  const [showItems, setShowItems] = useState(false);

  const meta = STATUS_META[order.status] ?? STATUS_META.placed;
  const next = NEXT_STATUS[order.status];

  /* Loaded on demand — the pick list is what the rider actually needs at the shelf */
  const togglePickList = async () => {
    setShowItems(v => !v);
    if (items === null) {
      try {
        setItems(await fetchOrderItems(order.id));
      } catch {
        setItems([]);
      }
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderId}>#{order.id}</Text>
          <Text style={styles.placedAt}>{order.date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>{STATUS_LABEL[order.status]}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryValue}>{order.itemCount}</Text>
          <Text style={styles.summaryLabel}>items</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCell}>
          <Text style={styles.summaryValue}>₹{order.total}</Text>
          <Text style={styles.summaryLabel}>order value</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryValue, { color: '#1A9E55' }]}>₹45</Text>
          <Text style={styles.summaryLabel}>payout</Text>
        </View>
      </View>

      <Pressable style={styles.pickToggle} onPress={togglePickList}>
        <Feather name="list" size={14} color={colors.text} />
        <Text style={styles.pickToggleText}>{showItems ? 'Hide pick list' : 'Show pick list'}</Text>
        <Feather name={showItems ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>

      {showItems ? (
        <View style={styles.pickList}>
          {items === null ? (
            <ActivityIndicator color={ACCENT} />
          ) : items.length === 0 ? (
            <Text style={styles.pickEmpty}>No item detail recorded for this order.</Text>
          ) : (
            items.map(item => (
              <View key={item.id} style={styles.pickRow}>
                <Text style={styles.pickQty}>{item.qty}×</Text>
                <Text style={styles.pickName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.pickPrice}>₹{item.price * item.qty}</Text>
              </View>
            ))
          )}
        </View>
      ) : null}

      {next ? (
        <Pressable
          style={[styles.actionBtn, isBusy && styles.actionBtnBusy]}
          onPress={() => onAdvance(order)}
          disabled={isBusy}
        >
          {isBusy ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Feather name={next.icon} size={15} color="#FFFFFF" />
              <Text style={styles.actionText}>{next.label}</Text>
            </>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1A9E55' },
    offlineDot: { backgroundColor: '#9CA3AF' },
    topBarTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    topBarSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

    statStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statDivider: { width: 1, height: 28, backgroundColor: colors.border },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    errorText: { fontSize: 13, color: colors.danger, textAlign: 'center' },

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 3,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    orderId: { fontSize: 14, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
    placedAt: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
    statusText: { fontSize: 11, fontWeight: '800' },

    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    summaryCell: { flex: 1, alignItems: 'center', gap: 2 },
    summaryDivider: { width: 1, height: 26, backgroundColor: colors.border },
    summaryValue: { fontSize: 15, fontWeight: '800', color: colors.text },
    summaryLabel: { fontSize: 11, color: colors.textMuted },

    pickToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    pickToggleText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },

    pickList: { gap: spacing.xs, paddingHorizontal: spacing.xs },
    pickRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    pickQty: { fontSize: 13, fontWeight: '800', color: ACCENT, minWidth: 26 },
    pickName: { flex: 1, fontSize: 13, color: colors.text },
    pickPrice: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    pickEmpty: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },

    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: ACCENT,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
    },
    actionBtnBusy: { opacity: 0.7 },
    actionText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
      gap: spacing.xs,
    },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
    emptyBody: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  });
}
