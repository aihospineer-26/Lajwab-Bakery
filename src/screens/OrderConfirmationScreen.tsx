import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderConfirmation'>;

const STEPS = [
  { id: 'confirmed', label: 'Order Confirmed', sub: 'We received your order', icon: '✅' },
  { id: 'picking', label: 'Picking Fresh Items', sub: 'Handpicking the freshest for you', icon: '🥬' },
  { id: 'delivery', label: 'Out for Delivery', sub: 'Your rider is on the way!', icon: '🛵' },
  { id: 'delivered', label: 'Delivered', sub: 'Enjoy your order!', icon: '🏠' },
];

const RIDER = { name: 'Rajan Kumar', rating: 4.9, vehicle: 'UP81 XY 4402' };

/* Steps auto-advance timings (ms from mount) */
const STEP_DELAYS = [0, 4000, 10000, 22000];

export function OrderConfirmationScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const orderId = useMemo(
    () => `ORD-${Math.floor(1000 + Math.random() * 8999)}`,
    [],
  );

  const [currentStep, setCurrentStep] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /* Auto-advance through steps */
  useEffect(() => {
    const timers = STEP_DELAYS.slice(1).map((delay, idx) =>
      setTimeout(() => setCurrentStep(idx + 1), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  /* Pulse animation for the active step dot */
  useEffect(() => {
    if (currentStep >= STEPS.length - 1) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [currentStep, pulseAnim]);

  const isDelivered = currentStep >= STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Green header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          hitSlop={10}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Rider card */}
        {currentStep >= 2 && !isDelivered ? (
          <View style={styles.riderCard}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderInitial}>{RIDER.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.riderName}>{RIDER.name}</Text>
              <View style={styles.riderMeta}>
                <Text style={styles.riderStar}>⭐ {RIDER.rating}</Text>
                <Text style={styles.riderVehicle}>{RIDER.vehicle}</Text>
              </View>
            </View>
            <Pressable style={styles.riderAction} hitSlop={8}>
              <Ionicons name="call-outline" size={17} color={colors.primary} />
            </Pressable>
            <Pressable style={styles.riderAction} hitSlop={8}>
              <Ionicons name="chatbubble-outline" size={17} color={colors.primary} />
            </Pressable>
          </View>
        ) : null}

        {/* Active Order section */}
        <View style={styles.orderCard}>
          <Text style={styles.orderLabel}>ACTIVE ORDER</Text>
          <Text style={styles.orderId}>#{orderId}</Text>

          {/* Step tracker */}
          <View style={styles.tracker}>
            {STEPS.map((step, idx) => {
              const done = idx < currentStep;
              const active = idx === currentStep;
              const pending = idx > currentStep;

              return (
                <View key={step.id} style={styles.stepRow}>
                  {/* Line + dot column */}
                  <View style={styles.stepLeft}>
                    {/* Top connector */}
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

                    {/* Dot */}
                    {active && !isDelivered ? (
                      <Animated.View
                        style={[styles.dot, styles.dotActive, { transform: [{ scale: pulseAnim }] }]}
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

                    {/* Bottom connector */}
                    {idx < STEPS.length - 1 ? (
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

                  {/* Text column */}
                  <View style={styles.stepText}>
                    <Text
                      style={[
                        styles.stepLabel,
                        (done || active) && !pending && styles.stepLabelActive,
                        pending && styles.stepLabelPending,
                      ]}
                    >
                      {step.label}
                    </Text>
                    {(done || active) ? (
                      <Text style={styles.stepSub}>{step.sub}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Celebration card on delivery */}
        {isDelivered ? (
          <View style={styles.celebCard}>
            <Text style={styles.celebEmoji}>🎉</Text>
            <Text style={styles.celebTitle}>Delivered!</Text>
            <Text style={styles.celebSub}>Hope you enjoy everything, fresh from our oven.</Text>
          </View>
        ) : (
          /* ETA strip */
          <View style={styles.etaCard}>
            <Text style={styles.etaIcon}>⚡</Text>
            <View>
              <Text style={styles.etaLabel}>Estimated Arrival</Text>
              <Text style={styles.etaTime}>10–15 minutes</Text>
            </View>
          </View>
        )}

        {/* Back to shopping */}
        <Pressable
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
        >
          <Text style={styles.ctaBtnText}>Continue Shopping</Text>
        </Pressable>
      </ScrollView>
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
    /* ── Content ── */
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    /* ── Rider card ── */
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
    riderMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 2,
    },
    riderStar: {
      fontSize: 12,
      color: colors.textMuted,
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
    riderActionIcon: {
      fontSize: 17,
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
    /* ── CTA ── */
    ctaBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.md,
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
