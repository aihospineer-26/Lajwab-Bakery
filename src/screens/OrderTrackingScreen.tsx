import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { isCancellable, normalizeStatus, OrderItem, OrderStatus, STATUS_LABEL } from '../data/orders';
import { RootStackParamList } from '../navigation/types';
import { cancelOrder, fetchOrderById, fetchOrderItems } from '../services/orders';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';
import { confirm } from '../utils/confirm';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderTracking'>;

const STEPS = [
  { id: 'confirmed', label: 'Order Confirmed', sub: 'We received your order', icon: '✅' },
  { id: 'picking', label: 'Picking Fresh Items', sub: 'Handpicking the freshest for you', icon: '🥬' },
  { id: 'delivery', label: 'Out for Delivery', sub: 'Your rider is on the way!', icon: '🛵' },
  { id: 'delivered', label: 'Delivered', sub: 'Enjoy your order!', icon: '🏠' },
];

const STATUS_TO_STEP: Record<OrderStatus, number> = {
  placed: 0,
  accepted: 1,
  packed: 1,
  out_for_delivery: 2,
  delivered: 3,
  cancelled: 0,
};

const MOCK_RIDER = { name: 'Rajan Kumar', rating: 4.9, vehicle: 'UP81 XY 4402' };

export function OrderTrackingScreen({ navigation, route }: Props) {
  const { orderId, status } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { session } = useAuth();
  const isDevPreview = __DEV__ && !session;

  /* Seeded from the route param, then kept current by the poll below so the
     screen follows what the rider actually does. */
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(normalizeStatus(status));
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isCancelled = orderStatus === 'cancelled';
  const [simulatedStep, setSimulatedStep] = useState(STATUS_TO_STEP[normalizeStatus(status)] ?? 0);
  const currentStep = isDevPreview ? simulatedStep : STATUS_TO_STEP[orderStatus] ?? 0;
  const setCurrentStep = setSimulatedStep;

  useEffect(() => {
    fetchOrderItems(orderId).then(setItems).catch(() => setItems([]));
  }, [orderId]);

  /* Live status. Polling beats a Realtime socket here — it survives the app
     being backgrounded and reconnects for free on flaky mobile data. */
  useEffect(() => {
    if (isDevPreview) return;
    const tick = async () => {
      try {
        const fresh = await fetchOrderById(orderId);
        if (fresh) setOrderStatus(fresh.status);
      } catch {
        // transient network failure — next tick retries
      }
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => clearInterval(id);
  }, [isDevPreview, orderId]);

  const isDelivered = currentStep >= STEPS.length - 1;
  const isLive = !isCancelled && orderStatus !== 'delivered';
  // Eligibility tracks the real server status, not the visual step simulation
  // below, which can run ahead of it.
  const canCancel = isCancellable(orderStatus) && !isCancelled;

  /* Demo-only step simulation. A real order must never advance on a timer —
     showing "Out for Delivery" 8s after checkout is a lie the customer will
     act on. With a session, the tracker reflects the actual server status. */
  useEffect(() => {
    if (!isDevPreview || !isLive || isDelivered) return;
    const timers = [
      setTimeout(() => setCurrentStep(s => Math.min(s + 1, STEPS.length - 1)), 8000),
      setTimeout(() => setCurrentStep(s => Math.min(s + 1, STEPS.length - 1)), 20000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isDevPreview, isLive, isDelivered]);

  const handleCancel = async () => {
    const confirmed = await confirm(
      'Cancel this order?',
      "This can't be undone once confirmed.",
      'Yes, Cancel',
      'Keep Order',
    );
    if (!confirmed) return;

    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelOrder(orderId);
      setOrderStatus('cancelled');
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Could not cancel. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  /* Pulse on active dot */
  useEffect(() => {
    if (isDelivered) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [currentStep, isDelivered, pulseAnim]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title={`Order #${orderId}`} onBack={() => navigation.goBack()} />

      <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Cancelled banner */}
        {isCancelled ? (
          <View style={styles.cancelledBanner}>
            <Ionicons name="close-circle-outline" size={30} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelledTitle}>Order Cancelled</Text>
              <Text style={styles.cancelledSub}>This order will not be delivered.</Text>
            </View>
          </View>
        ) : null}

        {/* Live badge */}
        {isLive && !isDelivered ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live Tracking</Text>
          </View>
        ) : null}

        {/* Rider card — show when out for delivery */}
        {currentStep >= 2 && !isDelivered && !isCancelled ? (
          <View style={styles.riderCard}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderInitial}>{MOCK_RIDER.name.charAt(0)}</Text>
            </View>
            <View style={styles.riderInfo}>
              <Text style={styles.riderName}>{MOCK_RIDER.name}</Text>
              <View style={styles.riderMeta}>
                <Text style={styles.riderDetail}>⭐ {MOCK_RIDER.rating}</Text>
                <Text style={styles.riderDot}>·</Text>
                <Text style={styles.riderDetail}>{MOCK_RIDER.vehicle}</Text>
              </View>
            </View>
            <Pressable style={styles.riderBtn} hitSlop={8}>
              <Ionicons name="call-outline" size={17} color={colors.primary} />
            </Pressable>
            <Pressable style={styles.riderBtn} hitSlop={8}>
              <Ionicons name="chatbubble-outline" size={17} color={colors.primary} />
            </Pressable>
          </View>
        ) : null}

        {/* Step tracker */}
        <View style={styles.trackerCard}>
          {STEPS.map((step, idx) => {
            const done = idx < currentStep;
            const active = idx === currentStep;
            const pending = idx > currentStep;

            return (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.stepLeft}>
                  {idx > 0 ? (
                    <View style={[styles.connector, done || active ? styles.connectorDone : styles.connectorPending]} />
                  ) : (
                    <View style={styles.connectorSpacer} />
                  )}

                  {active && !isDelivered ? (
                    <Animated.View style={[styles.dot, styles.dotActive, { transform: [{ scale: pulseAnim }] }]}>
                      <View style={styles.dotActiveFill} />
                    </Animated.View>
                  ) : done || isDelivered ? (
                    <View style={[styles.dot, styles.dotDone]}>
                      <Text style={styles.dotCheck}>✓</Text>
                    </View>
                  ) : (
                    <View style={[styles.dot, styles.dotPending]} />
                  )}

                  {idx < STEPS.length - 1 ? (
                    <View style={[styles.connector, done ? styles.connectorDone : styles.connectorPending]} />
                  ) : (
                    <View style={styles.connectorSpacer} />
                  )}
                </View>

                <View style={styles.stepText}>
                  <Text style={[
                    styles.stepLabel,
                    (done || active) && styles.stepLabelActive,
                    pending && styles.stepLabelPending,
                  ]}>
                    {step.label}
                  </Text>
                  {(done || active) ? <Text style={styles.stepSub}>{step.sub}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* ETA or celebration */}
        {isCancelled ? null : isDelivered ? (
          <View style={styles.celebCard}>
            <Text style={styles.celebEmoji}>🎉</Text>
            <Text style={styles.celebTitle}>Delivered!</Text>
            <Text style={styles.celebSub}>Hope you enjoy everything, fresh from our oven.</Text>
          </View>
        ) : (
          <View style={styles.etaCard}>
            <Ionicons name="time-outline" size={15} color={colors.primary} />
            <View>
              <Text style={styles.etaLabel}>Estimated Arrival</Text>
              <Text style={styles.etaTime}>10 – 15 minutes</Text>
            </View>
          </View>
        )}

        {/* What's in this order */}
        {items.length > 0 ? (
          <View style={styles.itemsCard}>
            <Text style={styles.itemsTitle}>
              {items.length} item{items.length !== 1 ? 's' : ''} in this order
            </Text>
            {items.map(item => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemQty}>{item.qty}×</Text>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemPrice}>₹{item.price * item.qty}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Order meta */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Order ID</Text>
            <Text style={styles.metaValue}>#{orderId}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>
              {isCancelled ? STATUS_LABEL.cancelled : STEPS[currentStep].label}
            </Text>
          </View>
        </View>

        {/* Cancel action */}
        {cancelError ? <Text style={styles.cancelError}>{cancelError}</Text> : null}
        {canCancel ? (
          <Pressable
            style={[styles.cancelBtn, isCancelling && styles.cancelBtnDisabled]}
            onPress={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator color="#DC2626" size="small" />
            ) : (
              <Text style={styles.cancelBtnText}>Cancel Order</Text>
            )}
          </Pressable>
        ) : null}

      </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
      backgroundColor: '#E0F7EB',
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
    },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1A9E55' },
    liveText: { fontSize: 12, fontWeight: '700', color: '#1A9E55' },

    cancelledBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: '#FEE2E2',
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    cancelledIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#DC2626',
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
      textAlign: 'center',
      lineHeight: 28,
      overflow: 'hidden',
    },
    cancelledTitle: { fontSize: 15, fontWeight: '800', color: '#991B1B' },
    cancelledSub: { fontSize: 12, color: '#B91C1C', marginTop: 1 },

    riderCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    riderAvatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.primaryDark,
      alignItems: 'center', justifyContent: 'center',
    },
    riderInitial: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
    riderInfo: { flex: 1, gap: 2 },
    riderName: { fontSize: 15, fontWeight: '700', color: colors.text },
    riderMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    riderDetail: { fontSize: 12, color: colors.textMuted },
    riderDot: { fontSize: 12, color: colors.textMuted },
    riderBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.primaryLight,
      alignItems: 'center', justifyContent: 'center',
    },
    riderBtnIcon: { fontSize: 17 },

    trackerCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    stepRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 52 },
    stepLeft: { width: 28, alignItems: 'center', marginRight: spacing.md },
    connector: { flex: 1, width: 2, minHeight: 10 },
    connectorDone: { backgroundColor: colors.primary },
    connectorPending: { backgroundColor: colors.border },
    connectorSpacer: { flex: 1, minHeight: 6 },
    dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    dotDone: { backgroundColor: colors.primary },
    dotCheck: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
    dotActive: { backgroundColor: 'rgba(26,158,85,0.2)', borderWidth: 2, borderColor: colors.primary },
    dotActiveFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    dotPending: { backgroundColor: colors.surfaceMuted, borderWidth: 2, borderColor: colors.border },
    stepText: { flex: 1, justifyContent: 'center', paddingVertical: 6 },
    stepLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    stepLabelActive: { color: colors.primary },
    stepLabelPending: { color: colors.textMuted, fontWeight: '500' },
    stepSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

    etaCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    etaIcon: { fontSize: 22 },
    etaLabel: { fontSize: 11, color: colors.primary, fontWeight: '500' },
    etaTime: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },

    celebCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.lg,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.xs,
    },
    celebEmoji: { fontSize: 42, marginBottom: spacing.xs },
    celebTitle: { fontSize: 22, fontWeight: '900', color: colors.primaryDark },
    celebSub: { fontSize: 13, color: colors.primary, textAlign: 'center' },

    itemsCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.xs,
    },
    itemsTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    itemQty: { fontSize: 13, fontWeight: '800', color: colors.primary, minWidth: 26 },
    itemName: { flex: 1, fontSize: 13, color: colors.text },
    itemPrice: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

    metaCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaLabel: { fontSize: 13, color: colors.textMuted },
    metaValue: { fontSize: 13, fontWeight: '700', color: colors.text },

    cancelBtn: {
      borderWidth: 1.5,
      borderColor: '#DC2626',
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnDisabled: { opacity: 0.6 },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
    cancelError: { fontSize: 13, color: colors.danger, textAlign: 'center' },
  });
}
