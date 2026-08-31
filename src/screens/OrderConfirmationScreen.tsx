import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import {
  CUSTOMER_STATUS_LABEL,
  formatOrderRef,
  isAwaitingPayment,
  Order,
  ORDER_STEPS,
  paymentLabel,
  statusToStep,
} from '../data/orders';
import { UpiPaymentPanel } from '../components/UpiPaymentPanel';
import { useStoreSettings } from '../services/storeSettings';
import { fetchOrderById } from '../services/orders';
import { STORE } from '../data/store';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderConfirmation'>;

/* Matches OrderTrackingScreen deliberately -- the two screens watch the same
   row, and there is no reason for one to notice the bakery before the other. */
const POLL_MS = 8000;

/* This screen used to be an animation. It invented an order number with
   Math.random, ticked through four steps on setTimeout, and told the customer
   their order had been delivered twenty-two seconds after checkout -- while the
   real row still said 'placed' and nobody at the bakery had seen it. Everything
   here now comes from the order place_order actually created, and it moves only
   when the bakery moves it on the dashboard. */
export function OrderConfirmationScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const settings = useStoreSettings();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /* Held beside the state so a dropped poll can tell "never loaded" from
     "loaded, and this one tick failed". A network blip must leave the last
     known status on screen rather than replacing it with an error -- and must
     never be mistaken for progress. */
  const orderRef = useRef<Order | null>(null);

  /* Live status, straight from the row. Polling rather than a Realtime socket
     for the same reason as the tracking screen: it survives the app being
     backgrounded and reconnects for free on flaky mobile data. */
  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const fresh = await fetchOrderById(orderId);
        if (!alive) return;
        if (fresh) {
          orderRef.current = fresh;
          setOrder(fresh);
          setLoadError(null);
        } else {
          setLoadError("We couldn't find this order on your account.");
        }
      } catch {
        if (!alive) return;
        if (!orderRef.current) {
          setLoadError("Couldn't load your order. Check your connection.");
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [orderId]);

  const status = order?.status ?? 'placed';
  const method = order?.paymentMethod ?? 'cod';
  const payStatus = order?.paymentStatus ?? 'pending';
  /* The bakery has not seen the money yet, so the panel stays up -- including
     on a later visit, because a customer who closed the app still has to pay
     somewhere. It disappears only when the bakery confirms. */
  const awaitingPayment = isAwaitingPayment(method, payStatus);
  const isCancelled = status === 'cancelled';
  const isDelivered = status === 'delivered';
  const currentStep = statusToStep(status);

  /* Decoration only: it marks where the order has reached, it never decides. */
  useEffect(() => {
    if (!order || isDelivered || isCancelled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [currentStep, isDelivered, isCancelled, order, pulseAnim]);

  const goHome = () => navigation.navigate('MainTabs', { screen: 'Home' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={goHome} hitSlop={10}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Order Confirmed</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading && !order ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !order ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={38} color={colors.border} />
          <Text style={styles.errorTitle}>{loadError ?? "Couldn't load your order."}</Text>
          <Text style={styles.errorBody}>
            Your order may still have been placed — check My Orders before
            ordering again{STORE.phone ? ', or call the bakery on ' + STORE.phone : ''}.
          </Text>
          <Pressable style={styles.ctaBtn} onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.ctaBtnText}>My Orders</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Nobody is assigned to deliveries yet, so this points at the bakery
              rather than naming a rider who does not exist, and only offers a
              button STORE actually has a number for. */}
          {status === 'out_for_delivery' ? (
            <View style={styles.riderCard}>
              <View style={styles.riderAvatar}>
                <Text style={styles.riderInitial}>🛵</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.riderName}>Your order is on the way</Text>
                <Text style={styles.riderVehicle}>
                  {STORE.phone || STORE.whatsapp
                    ? 'Call the bakery if you need to change anything.'
                    : 'Your order has left ' + STORE.name + '.'}
                </Text>
              </View>
              {STORE.phone ? (
                <Pressable
                  style={styles.riderAction}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={'Call ' + STORE.name}
                  onPress={() => Linking.openURL('tel:' + STORE.phone.replace(/\s/g, ''))}
                >
                  <Ionicons name="call-outline" size={17} color={colors.primary} />
                </Pressable>
              ) : null}
              {STORE.whatsapp ? (
                <Pressable
                  style={styles.riderAction}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={'Message ' + STORE.name + ' on WhatsApp'}
                  onPress={() =>
                    Linking.openURL('https://wa.me/' + STORE.whatsapp.replace(/[^0-9]/g, ''))
                  }
                >
                  <Ionicons name="chatbubble-outline" size={17} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {isCancelled ? (
            <View style={styles.cancelledBanner}>
              <Ionicons name="close-circle-outline" size={30} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelledTitle}>Order Cancelled</Text>
                <Text style={styles.cancelledSub}>This order will not be delivered.</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.orderCard}>
            <Text style={styles.orderLabel}>YOUR ORDER</Text>
            <Text style={styles.orderId}>#{formatOrderRef(order.id)}</Text>
            <Text style={styles.orderMeta}>
              {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} · ₹{order.total}
            </Text>

            {/* Two separate facts, reported separately. Folding them into one
                line would mean dropping whichever mattered less that minute. */}
            <View style={styles.stateRows}>
              <View style={styles.stateRow}>
                <Text style={styles.stateLabel}>Order status</Text>
                <Text style={styles.stateValue}>{CUSTOMER_STATUS_LABEL[status]}</Text>
              </View>
              <View style={styles.stateRow}>
                <Text style={styles.stateLabel}>Payment</Text>
                <Text style={[styles.stateValue, awaitingPayment && styles.stateValueWarn]}>
                  {paymentLabel(method, payStatus)}
                </Text>
              </View>
            </View>

            {isCancelled ? null : (
              <View style={styles.tracker}>
                {ORDER_STEPS.map((step, idx) => {
                  const done = idx < currentStep;
                  const active = idx === currentStep;
                  const pending = idx > currentStep;

                  return (
                    <View key={step.id} style={styles.stepRow}>
                      <View style={styles.stepLeft}>
                        {idx > 0 ? (
                          <View
                            style={[
                              styles.connector,
                              done || active ? styles.connectorDone : styles.connectorPending,
                            ]}
                          />
                        ) : (
                          <View style={styles.connectorSpacer} />
                        )}

                        {active && !isDelivered ? (
                          <Animated.View
                            style={[
                              styles.dot,
                              styles.dotActive,
                              { transform: [{ scale: pulseAnim }] },
                            ]}
                          >
                            <View style={styles.dotActiveFill} />
                          </Animated.View>
                        ) : done || isDelivered ? (
                          <View style={[styles.dot, styles.dotDone]}>
                            <Text style={styles.dotCheck}>✓</Text>
                          </View>
                        ) : (
                          <View style={[styles.dot, styles.dotPending]} />
                        )}

                        {idx < ORDER_STEPS.length - 1 ? (
                          <View
                            style={[
                              styles.connector,
                              done ? styles.connectorDone : styles.connectorPending,
                            ]}
                          />
                        ) : (
                          <View style={styles.connectorSpacer} />
                        )}
                      </View>

                      <View style={styles.stepText}>
                        <Text
                          style={[
                            styles.stepLabel,
                            (done || active) && styles.stepLabelActive,
                            pending && styles.stepLabelPending,
                          ]}
                        >
                          {step.label}
                        </Text>
                        {done || active ? <Text style={styles.stepSub}>{step.sub}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Only while the money is still outstanding, and never on a
              cancelled order -- asking someone to pay for something that will
              not arrive is the worst thing this screen could do. */}
          {awaitingPayment && !isCancelled && settings.upiVpa.trim() ? (
            <UpiPaymentPanel
              orderId={order.id}
              amount={order.total}
              vpa={settings.upiVpa.trim()}
            />
          ) : null}

          {method === 'cod' && !isCancelled ? (
            <Text style={styles.waitNote}>Pay when your order arrives.</Text>
          ) : null}

          {/* Said plainly, because a tracker that sits still reads as broken.
              The step only moves when the bakery moves it, so the screen has to
              explain the wait rather than fake activity to fill it. */}
          {status === 'placed' ? (
            <Text style={styles.waitNote}>
              {STORE.name} will confirm your order shortly. This page updates on
              its own as they prepare it — there is no need to refresh.
            </Text>
          ) : null}

          {isCancelled ? null : isDelivered ? (
            <View style={styles.celebCard}>
              <Text style={styles.celebEmoji}>🎉</Text>
              <Text style={styles.celebTitle}>Delivered!</Text>
              <Text style={styles.celebSub}>Hope you enjoy everything, fresh from our oven.</Text>
            </View>
          ) : (
            <View style={styles.etaCard}>
              <Text style={styles.etaIcon}>⚡</Text>
              <View>
                <Text style={styles.etaLabel}>Estimated Arrival</Text>
                <Text style={styles.etaTime}>{STORE.deliveryEta}</Text>
              </View>
            </View>
          )}

          <Pressable
            style={styles.trackBtn}
            onPress={() =>
              navigation.navigate('OrderTracking', { orderId: order.id, status: order.status })
            }
          >
            <Text style={styles.trackBtnText}>View order details</Text>
          </Pressable>

          <Pressable style={styles.ctaBtn} onPress={goHome}>
            <Text style={styles.ctaBtnText}>Continue Shopping</Text>
          </Pressable>
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
    /* ── Header ── */
    header: {
      backgroundColor: colors.primaryDark,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      fontSize: 18,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    /* ── Loading / error ── */
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
    },
    errorTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    errorBody: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: 'center',
    },
    /* ── Content ── */
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    /* ── Cancelled ── */
    cancelledBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: '#FEE2E2',
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    cancelledTitle: { fontSize: 15, fontWeight: '800', color: '#991B1B' },
    cancelledSub: { fontSize: 12, color: '#B91C1C', marginTop: 1 },
    /* ── On-the-way card ── */
    riderCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    riderAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    riderInitial: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    riderName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    riderVehicle: {
      fontSize: 12,
      color: colors.textMuted,
    },
    riderAction: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    /* ── Order card ── */
    orderCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    orderLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      color: colors.textMuted,
      marginBottom: 2,
    },
    orderId: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.text,
    },
    orderMeta: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
      marginBottom: spacing.lg,
    },
    /* ── Tracker ── */
    tracker: {
      gap: 0,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      minHeight: 52,
    },
    stepLeft: {
      width: 28,
      alignItems: 'center',
      marginRight: spacing.md,
    },
    connector: {
      flex: 1,
      width: 2,
      minHeight: 10,
    },
    connectorDone: {
      backgroundColor: colors.primary,
    },
    connectorPending: {
      backgroundColor: colors.border,
    },
    connectorSpacer: {
      flex: 1,
      minHeight: 6,
    },
    dot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotDone: {
      backgroundColor: colors.primary,
    },
    dotCheck: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
    dotActive: {
      backgroundColor: 'rgba(26,158,85,0.2)',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    dotActiveFill: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    dotPending: {
      backgroundColor: colors.surfaceMuted,
      borderWidth: 2,
      borderColor: colors.border,
    },
    stepText: {
      flex: 1,
      justifyContent: 'center',
      paddingVertical: 6,
    },
    stepLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    stepLabelActive: {
      color: colors.primary,
    },
    stepLabelPending: {
      color: colors.textMuted,
      fontWeight: '500',
    },
    stepSub: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 1,
    },
    /* ── Order / payment state ── */
    stateRows: {
      gap: 6,
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    stateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    stateLabel: { fontSize: 13, color: colors.textMuted },
    stateValue: { fontSize: 13, fontWeight: '700', color: colors.text, flexShrink: 1, textAlign: 'right' },
    stateValueWarn: { color: colors.primaryDark },
    /* ── Wait note ── */
    waitNote: {
      fontSize: 12.5,
      lineHeight: 19,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
    /* ── ETA ── */
    etaCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    etaIcon: {
      fontSize: 22,
    },
    etaLabel: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '500',
    },
    etaTime: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.primaryDark,
    },
    /* ── Celebration ── */
    celebCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.lg,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.xs,
    },
    celebEmoji: {
      fontSize: 42,
      marginBottom: spacing.xs,
    },
    celebTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.primaryDark,
    },
    celebSub: {
      fontSize: 13,
      color: colors.primary,
      textAlign: 'center',
    },
    /* ── Actions ── */
    trackBtn: {
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    trackBtnText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '800',
    },
    ctaBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    ctaBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
  });
}
