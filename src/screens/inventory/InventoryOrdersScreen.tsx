import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Skeleton } from '../../components/Skeleton';
import { formatOrderRef, Order, OrderItem, OrderStatus, STATUS_LABEL } from '../../data/orders';
import {
  cancelOrderAsStaff,
  fetchAllOrders,
  fetchOrderItems,
  updateOrderStatus,
} from '../../services/orders';
import { useTheme } from '../../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../../theme';
import { confirm } from '../../utils/confirm';

type QueueTab = 'live' | 'completed' | 'cancelled';

const TABS: { key: QueueTab; label: string }[] = [
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const LIVE_STATUSES: OrderStatus[] = ['placed', 'accepted', 'packed', 'out_for_delivery'];

/* The store drives the order along this chain; each tap is a real status write. */
const NEXT_STATUS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  placed: { to: 'accepted', label: 'Accept order' },
  accepted: { to: 'packed', label: 'Mark packed' },
  packed: { to: 'out_for_delivery', label: 'Hand to rider' },
  out_for_delivery: { to: 'delivered', label: 'Mark delivered' },
};

const POLL_MS = 10000;
/* An order sitting unaccepted past this reads as late against a 10-minute promise. */
const LATE_AFTER_MS = 10 * 60 * 1000;

function minutesWaiting(order: Order): number | null {
  if (!order.createdAt) return null;
  const ms = Date.now() - new Date(order.createdAt).getTime();
  return ms < 0 ? 0 : Math.floor(ms / 60000);
}

function waitLabel(order: Order): string {
  const mins = minutesWaiting(order);
  if (mins === null) return order.date;
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return order.date;
}

export function InventoryOrdersScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tab, setTab] = useState<QueueTab>('live');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, OrderItem[]>>({});
  /* Re-renders the queue on a timer so "12 min ago" and the late badge stay
     truthful between fetches. */
  const [, setTick] = useState(0);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    try {
      setOrders(await fetchAllOrders());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders');
    } finally {
      if (mode === 'initial') setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  useEffect(() => {
    if (tab !== 'live') return;
    const id = setInterval(() => {
      load('refresh');
      setTick((t) => t + 1);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [tab, load]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load('refresh');
    setIsRefreshing(false);
  }, [load]);

  const toggleExpand = useCallback(
    async (order: Order) => {
      if (expandedId === order.id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(order.id);
      if (items[order.id]) return;
      try {
        const fetched = await fetchOrderItems(order.id);
        setItems((prev) => ({ ...prev, [order.id]: fetched }));
      } catch {
        setActionError(`Could not load items for #${formatOrderRef(order.id)}`);
      }
    },
    [expandedId, items],
  );

  const advance = useCallback(
    async (order: Order) => {
      const next = NEXT_STATUS[order.status];
      if (!next) return;
      setBusyId(order.id);
      setActionError(null);
      try {
        await updateOrderStatus(order.id, next.to);
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: next.to } : o)),
        );
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Could not update order');
        await load('refresh');
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const cancel = useCallback(
    async (order: Order) => {
      const ok = await confirm(
        `Cancel #${formatOrderRef(order.id)}?`,
        'The customer will see this order as cancelled. This cannot be undone.',
        'Cancel order',
        'Keep order',
      );
      if (!ok) return;

      setBusyId(order.id);
      setActionError(null);
      try {
        await cancelOrderAsStaff(order.id);
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o)),
        );
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Could not cancel order');
        await load('refresh');
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const visible = useMemo(() => {
    if (tab === 'live') return orders.filter((o) => LIVE_STATUSES.includes(o.status));
    if (tab === 'cancelled') return orders.filter((o) => o.status === 'cancelled');
    return orders.filter((o) => o.status === 'delivered');
  }, [orders, tab]);

  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const isToday = (o: Order) =>
      o.createdAt ? new Date(o.createdAt).toDateString() === today : false;
    const todays = orders.filter(isToday);
    const earned = todays
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0);
    return {
      count: todays.length,
      revenue: earned,
      pending: orders.filter((o) => LIVE_STATUSES.includes(o.status)).length,
    };
  }, [orders]);

  const renderOrder = ({ item: order }: { item: Order }) => {
    const next = NEXT_STATUS[order.status];
    const isExpanded = expandedId === order.id;
    const isBusy = busyId === order.id;
    const mins = minutesWaiting(order);
    const isLate = order.status === 'placed' && mins !== null && mins * 60000 >= LATE_AFTER_MS;
    const lines = items[order.id];

    return (
      <View style={[styles.card, isLate && styles.cardLate]}>
        <Pressable style={styles.cardHead} onPress={() => toggleExpand(order)}>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={styles.idRow}>
              <Text style={styles.orderId}>#{formatOrderRef(order.id)}</Text>
              {isLate && (
                <View style={styles.latePill}>
                  <Feather name="clock" size={10} color={colors.danger} />
                  <Text style={styles.latePillText}>Late</Text>
                </View>
              )}
            </View>
            <Text style={styles.orderMeta}>
              {waitLabel(order)} · {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.headRight}>
            <Text style={styles.orderTotal}>₹{order.total}</Text>
            <View style={[styles.statusPill, statusTone(order.status, colors)]}>
              <Text style={[styles.statusText, { color: statusColor(order.status, colors) }]}>
                {STATUS_LABEL[order.status]}
              </Text>
            </View>
          </View>

          <Feather
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </Pressable>

        {isExpanded && (
          <View style={styles.itemsBox}>
            {/* Who to hand it to and what number to ring on the way. The first
                thing the baker needs and the last thing to be added -- orders
                carried neither until migration 004. Rows placed before it have
                no contact, so the block hides rather than showing a blank. */}
            {order.customerName || order.customerPhone ? (
              <View style={styles.contactBox}>
                <View style={styles.addressHead}>
                  <Feather name="user" size={12} color={colors.primary} />
                  <Text style={styles.addressLabel}>
                    {order.customerName ?? 'Name not recorded'}
                  </Text>
                </View>
                {order.customerPhone ? (
                  <Pressable
                    onPress={() => Linking.openURL('tel:+91' + order.customerPhone)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={'Call ' + (order.customerName ?? 'the customer')}
                  >
                    <Text style={styles.contactPhone}>
                      <Feather name="phone" size={12} /> +91 {order.customerPhone}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.addressText}>No phone recorded</Text>
                )}
              </View>
            ) : null}

            {/* Orders placed before migration 002 have no address recorded. */}
            {order.deliveryAddress ? (
              <View style={styles.addressBox}>
                <View style={styles.addressHead}>
                  <Feather name="map-pin" size={12} color={colors.primary} />
                  <Text style={styles.addressLabel}>{order.deliveryAddress.label}</Text>
                </View>
                <Text style={styles.addressText}>
                  {order.deliveryAddress.line1}
                  {order.deliveryAddress.line2 ? ', ' + order.deliveryAddress.line2 : ''}
                </Text>
                <Text style={styles.addressText}>
                  {order.deliveryAddress.city} {order.deliveryAddress.pincode}
                </Text>
                <View style={styles.payRow}>
                  <Text style={styles.payTag}>
                    {order.paymentMethod === 'cod' ? 'CASH ON DELIVERY' : (order.paymentMethod ?? '').toUpperCase()}
                  </Text>
                  {order.deliverySlot ? <Text style={styles.slotTag}>{order.deliverySlot}</Text> : null}
                </View>
                {order.discount ? (
                  <Text style={styles.discountLine}>
                    {order.couponCode} — ₹{order.discount} off
                  </Text>
                ) : null}
              </View>
            ) : null}

            {lines === undefined ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : lines.length === 0 ? (
              <Text style={styles.itemsEmpty}>No line items recorded for this order.</Text>
            ) : (
              lines.map((line) => (
                <View key={line.id} style={styles.itemRow}>
                  <Text style={styles.itemQty}>{line.qty}×</Text>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {line.name}
                  </Text>
                  <Text style={styles.itemPrice}>₹{line.price * line.qty}</Text>
                </View>
              ))
            )}

            {lines && lines.some((l) => l.productId === 'lb-thaali-56') ? (
              <View style={styles.giftRow}>
                <Feather name="gift" size={12} color={colors.primary} />
                <Text style={styles.giftText}>
                  Include {lines.filter((l) => l.productId === 'lb-thaali-56')[0].qty}{' '}
                  complimentary bansuri
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {(next || order.status !== 'delivered') && order.status !== 'cancelled' && (
          <View style={styles.actionRow}>
            {next && (
              <Pressable
                style={[styles.primaryAction, isBusy && styles.actionDisabled]}
                onPress={() => advance(order)}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <Text style={styles.primaryActionText}>{next.label}</Text>
                )}
              </Pressable>
            )}
            {order.status !== 'delivered' && (
              <Pressable
                style={[styles.cancelAction, isBusy && styles.actionDisabled]}
                onPress={() => cancel(order)}
                disabled={isBusy}
              >
                <Feather name="x" size={15} color={colors.danger} />
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenContainer>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLine}>{todayLabel()}</Text>
            <Text style={styles.title}>Orders</Text>
            <View style={styles.subtitleRow}>
              {todayStats.pending > 0 ? (
                <View style={styles.pendingPill}>
                  <View style={styles.pendingDot} />
                  <Text style={styles.pendingPillText}>
                    {todayStats.pending} awaiting action
                  </Text>
                </View>
              ) : (
                <Text style={styles.subtitle}>Nothing waiting</Text>
              )}
              {tab === 'live' ? (
                <Text style={styles.subtitle}>· auto-refreshing</Text>
              ) : null}
            </View>
          </View>
          <Pressable style={styles.refreshButton} onPress={handleRefresh} hitSlop={8}>
            <Feather name="refresh-cw" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <StatTile icon="shopping-bag" value={String(todayStats.count)} label="Orders today" colors={colors} />
          <StatTile icon="trending-up" value={`₹${todayStats.revenue}`} label="Revenue today" colors={colors} />
          <StatTile
            icon="clock"
            value={String(todayStats.pending)}
            label="In queue"
            colors={colors}
            active={todayStats.pending > 0}
          />
        </View>

        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {actionError && (
          <View style={styles.banner}>
            <Feather name="alert-circle" size={14} color={colors.danger} />
            <Text style={styles.bannerText}>{actionError}</Text>
            <Pressable onPress={() => setActionError(null)} hitSlop={8}>
              <Feather name="x" size={14} color={colors.danger} />
            </Pressable>
          </View>
        )}

        {isLoading ? (
          <View style={styles.stateWrap}>
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                height={96}
                borderRadius={radius.lg}
                style={{ marginBottom: spacing.sm }}
              />
            ))}
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <Feather name="wifi-off" size={32} color={colors.textMuted} />
            <Text style={styles.stateTitle}>Couldn't load orders</Text>
            <Text style={styles.stateBody}>{error}</Text>
            <Pressable style={styles.stateButton} onPress={() => load('initial')}>
              <Text style={styles.stateButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(item) => item.id}
            renderItem={renderOrder}
            contentContainerStyle={[styles.listContent, visible.length === 0 && styles.listEmpty]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.stateWrap}>
                <Feather
                  name={tab === 'live' ? 'check-circle' : 'inbox'}
                  size={32}
                  color={colors.textMuted}
                />
                <Text style={styles.stateTitle}>
                  {tab === 'live'
                    ? 'All caught up'
                    : tab === 'completed'
                      ? 'No completed orders yet'
                      : 'No cancelled orders'}
                </Text>
                <Text style={styles.stateBody}>
                  {tab === 'live'
                    ? 'New orders appear here automatically.'
                    : 'Orders move here once they finish.'}
                </Text>
              </View>
            }
          />
        )}
      </ScreenContainer>
    </SafeAreaView>
  );
}

function statusColor(status: OrderStatus, colors: ColorPalette): string {
  if (status === 'delivered') return colors.success;
  if (status === 'cancelled') return colors.danger;
  if (status === 'out_for_delivery') return colors.accent;
  return colors.primary;
}

function statusTone(status: OrderStatus, colors: ColorPalette) {
  if (status === 'delivered') return { backgroundColor: colors.primaryLight };
  if (status === 'cancelled') return { backgroundColor: colors.surfaceMuted };
  if (status === 'out_for_delivery') return { backgroundColor: colors.accentLight };
  return { backgroundColor: colors.primaryLight };
}

/* A queue of zero and a queue of fifteen looked identical before -- the whole
   tile now changes, so the owner reads it at a glance rather than parsing digits. */
function StatTile({
  icon,
  value,
  label,
  colors,
  active,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  value: string;
  label: string;
  colors: ColorPalette;
  active?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: active ? colors.primaryLight : colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        alignItems: 'center',
        gap: 3,
      }}
    >
      <Feather name={icon} size={13} color={active ? colors.primary : colors.textMuted} />
      <Text
        style={{
          fontSize: 19,
          fontWeight: '900',
          color: active ? colors.primary : colors.text,
          fontVariant: ['tabular-nums'],
          letterSpacing: -0.4,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={{ fontSize: 10.5, color: colors.textMuted, fontWeight: '600', textAlign: 'center' }}
      >
        {label}
      </Text>
    </View>
  );
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    dateLine: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      color: colors.primary,
      marginBottom: 1,
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 3,
      flexWrap: 'wrap',
    },
    pendingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primaryLight,
      borderRadius: radius.full,
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
    },
    pendingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    pendingPillText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.primary,
    },
    listEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    title: { fontSize: 22, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    refreshButton: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },

    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },

    tabRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    tab: {
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    tabTextActive: { color: colors.textOnPrimary },

    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    bannerText: { flex: 1, fontSize: 12, color: colors.danger, fontWeight: '600' },

    listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardLate: { borderColor: colors.danger, borderWidth: 1.5 },

    cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    idRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    orderId: { fontSize: 14, fontWeight: '800', color: colors.text },
    orderMeta: { fontSize: 12, color: colors.textMuted },
    headRight: { alignItems: 'flex-end', gap: 4 },
    orderTotal: { fontSize: 15, fontWeight: '800', color: colors.text },

    latePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceMuted,
    },
    latePillText: { fontSize: 10, fontWeight: '800', color: colors.danger },

    statusPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    statusText: { fontSize: 10, fontWeight: '800' },

    itemsBox: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    itemsEmpty: { fontSize: 12, color: colors.textMuted },
    contactBox: {
      gap: 2,
      paddingBottom: spacing.sm,
      marginBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    /* Deliberately the most prominent line in the card: the baker reaches for
       it before anything else when an order needs a question answered. */
    contactPhone: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primary,
      paddingVertical: 2,
    },
    addressBox: {
      gap: 2,
      paddingBottom: spacing.sm,
      marginBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    addressHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 2,
    },
    addressLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    addressText: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.text,
    },
    payRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    payTag: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.9,
      color: colors.textMuted,
    },
    slotTag: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.textMuted,
    },
    discountLine: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.success,
      marginTop: 2,
    },
    giftRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    giftText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    itemQty: { fontSize: 13, fontWeight: '800', color: colors.primary, minWidth: 28 },
    itemName: { flex: 1, fontSize: 13, color: colors.text },
    itemPrice: { fontSize: 13, fontWeight: '700', color: colors.text },

    actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    primaryAction: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    primaryActionText: { fontSize: 14, fontWeight: '800', color: colors.textOnPrimary },
    cancelAction: {
      width: 44,
      minHeight: 44,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionDisabled: { opacity: 0.6 },

    stateWrap: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
    },
    stateTitle: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
    stateBody: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
    stateButton: {
      marginTop: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    stateButtonText: { fontSize: 14, fontWeight: '700', color: colors.textOnPrimary },
  });
}
