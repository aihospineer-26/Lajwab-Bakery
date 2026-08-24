import { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import { AppHeader } from '../components/AppHeader';
import { COUPONS, DEAL_BANNERS, FLASH_DEALS } from '../data/offers';
import { RootStackParamList } from '../navigation/types';
import { useCart } from '../state/CartContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Offers'>;

const FLASH_DURATION_SECONDS = 14 * 60 + 23;

function useCountdown(startSeconds: number) {
  const [secs, setSecs] = useState(startSeconds);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => (s > 0 ? s - 1 : startSeconds)), 1000);
    return () => clearInterval(id);
  }, [startSeconds]);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function CouponCard({ code, discount, description, validTill, color }: (typeof COUPONS)[0]) {
  const { colors } = useTheme();
  const styles = useMemo(() => couponStyles(colors), [colors]);
  const { applyCoupon, appliedCoupon } = useCart();
  const [feedback, setFeedback] = useState<string | null>(null);

  const isApplied = appliedCoupon?.code === code;

  const handleApply = () => {
    const result = applyCoupon(code);
    setFeedback(result.ok ? null : result.message);
    if (!result.ok) setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <View style={[styles.card, { borderColor: color + '55' }]}>
      <View style={[styles.leftStripe, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.discount, { color }]}>{discount}</Text>
          <Text style={styles.validTill}>Valid till {validTill}</Text>
        </View>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.bottomRow}>
          <View style={[styles.codeBox, { borderColor: color + '88' }]}>
            <Text style={[styles.code, { color }]}>{code}</Text>
          </View>
          <Pressable
            style={[styles.copyBtn, { backgroundColor: isApplied ? color : color + '18' }]}
            onPress={handleApply}
            disabled={isApplied}
          >
            <Text style={[styles.copyText, { color: isApplied ? '#FFFFFF' : color }]}>
              {isApplied ? '✓ Applied' : 'Apply'}
            </Text>
          </Pressable>
        </View>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </View>
    </View>
  );
}

const couponStyles = (colors: ColorPalette) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  leftStripe: { width: 6 },
  body: { flex: 1, padding: spacing.md, gap: spacing.xs },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  discount: { fontSize: 18, fontWeight: '900' },
  validTill: { fontSize: 11, color: colors.textMuted },
  description: { fontSize: 13, color: colors.textMuted },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  codeBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  code: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  copyBtn: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  copyText: { fontSize: 12, fontWeight: '700' },
  feedback: { fontSize: 12, color: colors.danger, marginTop: 2 },
});

export function OffersScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const countdown = useCountdown(FLASH_DURATION_SECONDS);
  const flashPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flashPulse, { toValue: 1.06, duration: 500, useNativeDriver: true }),
        Animated.timing(flashPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flashPulse]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Offers & Deals" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Flash sale banner */}
        <View style={styles.flashCard}>
          <View style={styles.flashTop}>
            <Text style={styles.flashTitle}>⚡ Flash Sale</Text>
            <View style={styles.timerBox}>
              <Text style={styles.timerLabel}>Ends in</Text>
              <Animated.Text style={[styles.timer, { transform: [{ scale: flashPulse }] }]}>
                {countdown}
              </Animated.Text>
            </View>
          </View>
          <Text style={styles.flashSub}>Grab these deals before they're gone!</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flashScroll}>
            {FLASH_DEALS.map(item => {
              const pct = Math.round(((item.originalPrice - item.salePrice) / item.originalPrice) * 100);
              return (
                <View key={item.id} style={styles.flashItem}>
                  <Text style={styles.flashItemEmoji}>{item.emoji}</Text>
                  <Text style={styles.flashItemName} numberOfLines={2}>{item.name}</Text>
                  <View style={styles.flashBadge}>
                    <Text style={styles.flashBadgeText}>{pct}% OFF</Text>
                  </View>
                  <Text style={styles.flashOriginal}>₹{item.originalPrice}</Text>
                  <Text style={styles.flashPrice}>₹{item.salePrice}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Deal banners */}
        <Text style={styles.sectionTitle}>Shop by Category Deals</Text>
        <View style={styles.dealGrid}>
          {DEAL_BANNERS.map(deal => (
            <Pressable
              key={deal.id}
              style={[styles.dealCard, { backgroundColor: deal.bg }]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            >
              <Text style={styles.dealEmoji}>{deal.emoji}</Text>
              <Text style={[styles.dealTitle, { color: deal.textColor }]}>{deal.title}</Text>
              <Text style={[styles.dealSub, { color: deal.textColor + 'BB' }]}>{deal.subtitle}</Text>
              <View style={[styles.dealBadge, { backgroundColor: deal.textColor }]}>
                <Text style={styles.dealBadgeText}>{deal.discount}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Coupons */}
        <Text style={styles.sectionTitle}>Coupons for You</Text>
        {COUPONS.map(coupon => (
          <CouponCard key={coupon.code} {...coupon} />
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },

    flashCard: {
      backgroundColor: '#1A2C1A',
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    flashTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    flashTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
    timerBox: { alignItems: 'flex-end', gap: 2 },
    timerLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
    timer: { fontSize: 22, fontWeight: '900', color: colors.accent, letterSpacing: 1 },
    flashSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
    flashScroll: { marginTop: spacing.sm },
    flashItem: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: radius.lg,
      padding: spacing.md,
      marginRight: spacing.sm,
      width: 110,
      gap: 4,
      alignItems: 'center',
    },
    flashItemEmoji: { fontSize: 32 },
    flashItemName: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
    flashBadge: {
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    flashBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
    flashOriginal: { fontSize: 11, color: 'rgba(255,255,255,0.45)', textDecorationLine: 'line-through' },
    flashPrice: { fontSize: 15, fontWeight: '900', color: colors.accent },

    dealGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    dealCard: {
      width: '47.5%',
      borderRadius: radius.xl,
      padding: spacing.md,
      gap: 4,
    },
    dealEmoji: { fontSize: 30, marginBottom: 2 },
    dealTitle: { fontSize: 15, fontWeight: '800' },
    dealSub: { fontSize: 12 },
    dealBadge: {
      alignSelf: 'flex-start',
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      marginTop: 4,
    },
    dealBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  });
}
