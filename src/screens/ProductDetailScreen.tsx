import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { resolveImage } from '../data/productImages';
import { RootStackParamList } from '../navigation/types';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { dayLabel, leadTimeForProduct, leadTimeLabel } from '../data/preOrder';
import { STORE } from '../data/store';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
import { SERIF_BOLD } from '../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ route, navigation }: Props) {
  const { getProductById } = useCatalog();
  const product = getProductById(route.params.productId);
  const leadDays = leadTimeForProduct(route.params.productId);
  const { getQuantity, increment, decrement } = useCart();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);


  /* ── Animation refs (unconditional — before any early return) ── */
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-8)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(0.96)).current;
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const infoY = useRef(new Animated.Value(18)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      /* Header slides down */
      Animated.timing(headerOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(headerY, { toValue: 0, duration: 220, useNativeDriver: true }),
      /* Image fades + scales in */
      Animated.sequence([
        Animated.delay(60),
        Animated.parallel([
          Animated.timing(imageOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(imageScale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 14,
            stiffness: 120,
          }),
        ]),
      ]),
      /* Info slides up */
      Animated.sequence([
        Animated.delay(160),
        Animated.parallel([
          Animated.timing(infoOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(infoY, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]),
      ]),
      /* Footer fades in last */
      Animated.sequence([
        Animated.delay(240),
        Animated.timing(footerOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  if (!product) return null;

  const quantity = getQuantity(product.id);
  const isOutOfStock = product.stock <= 0;
  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Green header — matches CategoryScreen */}
      <Animated.View
        style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
      >
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={21} color={colors.textOnPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 36 }} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Product image */}
        <Animated.View
          style={[
            styles.imageWrap,
            { opacity: imageOpacity, transform: [{ scale: imageScale }] },
          ]}
        >
          {resolveImage(product.id, product.image) ? (
            <Image
              source={resolveImage(product.id, product.image)!}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.imageEmoji}>{product.image}</Text>
          )}
          {discount ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Product info */}
        <Animated.View
          style={[styles.info, { opacity: infoOpacity, transform: [{ translateY: infoY }] }]}
        >
          <Text style={typography.heading}>{product.name}</Text>
          <View style={styles.unitRow}>
            <Text style={typography.caption}>{product.unit}</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price}</Text>
            {product.mrp && product.mrp > product.price ? (
              <Text style={styles.mrp}>₹{product.mrp}</Text>
            ) : null}
            {discount ? (
              <View style={styles.savingsPill}>
                <Text style={styles.savingsText}>You save ₹{product.mrp! - product.price}</Text>
              </View>
            ) : null}
          </View>

          {/* Made-to-order items quote their notice period instead of an ETA the
              bakery cannot meet. */}
          <View style={styles.etaStrip}>
            <Ionicons
              name={leadDays > 0 ? 'calendar-outline' : 'time-outline'}
              size={15}
              color={colors.primary}
            />
            <Text style={styles.etaText}>
              {leadDays > 0 ? (
                <>
                  <Text style={styles.etaBold}>{leadTimeLabel(leadDays)}</Text>
                  {' — earliest delivery ' + dayLabel(leadDays).toLowerCase()}
                </>
              ) : (
                <>
                  Delivery in <Text style={styles.etaBold}>{STORE.deliveryEta}</Text>
                </>
              )}
            </Text>
          </View>

          {/* Trust row */}
          <View style={styles.trustRow}>
            {['🌿 100% Eggless', '🍞 Baked today', '✅ Pure veg'].map(t => (
              <View key={t} style={styles.trustBadge}>
                <Text style={styles.trustText}>{t}</Text>
              </View>
            ))}
          </View>

          {product.description ? (
            <View style={styles.descCard}>
              <Text style={styles.descTitle}>About this product</Text>
              <Text style={styles.descBody}>{product.description}</Text>
            </View>
          ) : null}

          {/* Ratings & Reviews removed for launch. A review written here was
              stored under my_reviews on that one device and reached no server,
              so it was never seen by another customer -- a review nobody can
              read is not a review. Restore this when reviews have a table. */}
        </Animated.View>
      </ScrollView>

      {/* Add to cart footer */}
      <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
        {isOutOfStock ? (
          <View style={styles.outOfStockPill}>
            <Text style={styles.outOfStockText}>Out of stock</Text>
          </View>
        ) : quantity === 0 ? (
          <Button label="Add to Cart" onPress={() => increment(product.id)} />
        ) : (
          <View style={styles.stepper}>
            <Pressable style={styles.stepperBtn} onPress={() => decrement(product.id)}>
              <Text style={styles.stepperBtnText}>−</Text>
            </Pressable>
            <View style={styles.stepperMiddle}>
              <Text style={styles.stepperQty}>{quantity}</Text>
              <Text style={styles.stepperLabel}>in cart</Text>
            </View>
            <Pressable style={styles.stepperBtn} onPress={() => increment(product.id)}>
              <Text style={styles.stepperBtnText}>+</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    /* ── Green header ── */
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
      flexShrink: 0,
    },
    backIcon: {
      fontSize: 18,
      color: colors.textOnPrimary,
      fontWeight: '700',
    },
    headerTitle: {
      fontFamily: SERIF_BOLD,
      fontSize: 16,
      color: colors.textOnPrimary,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: spacing.sm,
    },
    imageEmoji: { fontSize: 110, lineHeight: 130, textAlign: 'center' },
    /* ── Image ── */
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    imageWrap: {
      /* Warm tint, matching the product cards' image containers rather than a
         cold, off-brand mint. */
      backgroundColor: colors.accentLight,
      height: 280,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    image: {
      width: '78%',
      height: '78%',
    },
    discountBadge: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      backgroundColor: colors.danger,
      borderRadius: radius.sm,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
    },
    discountText: {
      color: colors.textOnPrimary,
      fontWeight: '800',
      fontSize: 12,
    },
    /* ── Info ── */
    info: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
    unitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    ratingSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    ratingSummaryText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    price: {
      fontSize: 24,
      fontWeight: '900',
      color: colors.text,
    },
    mrp: {
      fontSize: 15,
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    savingsPill: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.full,
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
    },
    savingsText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    etaStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primaryLight,
      borderRadius: radius.sm,
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.sm,
      alignSelf: 'flex-start',
    },
    etaIcon: {
      fontSize: 13,
    },
    etaText: {
      fontSize: 12,
      color: colors.primary,
    },
    etaBold: {
      fontWeight: '800',
      color: colors.primaryDark,
    },
    trustRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    trustBadge: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.full,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.surface,
    },
    trustText: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
    },
    descCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    descTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    descBody: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 19,
    },
    /* ── Ratings & Reviews ── */
    reviewsSection: {
      marginTop: spacing.xs,
      gap: spacing.sm,
    },
    reviewCta: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight,
      borderRadius: radius.full,
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
    },
    reviewCtaText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    reviewForm: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    reviewInput: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 13,
      color: colors.text,
      minHeight: 72,
      textAlignVertical: 'top',
    },
    reviewFormActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    reviewSubmitBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    reviewSubmitBtnDisabled: {
      opacity: 0.5,
    },
    reviewSubmitText: {
      color: colors.textOnPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    reviewCancelBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
    },
    reviewCancelText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
    },
    reviewDeleteText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.danger,
      textAlign: 'center',
    },
    noReviewsText: {
      fontSize: 13,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    reviewList: {
      gap: spacing.sm,
    },
    reviewCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: 4,
    },
    reviewCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reviewAuthor: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    reviewDate: {
      fontSize: 11,
      color: colors.textMuted,
    },
    reviewComment: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
      marginTop: 2,
    },
    /* ── Footer ── */
    footer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    outOfStockPill: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    outOfStockText: {
      color: colors.danger,
      fontWeight: '700',
      fontSize: 14,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    stepperBtn: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    stepperBtnText: {
      color: colors.textOnPrimary,
      fontWeight: '700',
      fontSize: 20,
    },
    stepperMiddle: {
      flex: 1,
      alignItems: 'center',
    },
    stepperQty: {
      color: colors.textOnPrimary,
      fontWeight: '800',
      fontSize: 18,
      lineHeight: 20,
    },
    stepperLabel: {
      color: colors.textOnPrimary,
      opacity: 0.75,
      fontSize: 10,
      fontWeight: '500',
    },
  });
}
