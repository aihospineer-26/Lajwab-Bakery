import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { StarRating } from '../components/StarRating';
import { resolveImage } from '../data/productImages';
import { MOCK_REVIEWS, Review } from '../data/reviews';
import { usePersistedState } from '../hooks/usePersistedState';
import { RootStackParamList } from '../navigation/types';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { useTheme } from '../state/ThemeContext';
import { useUserProfile } from '../state/UserProfileContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ route, navigation }: Props) {
  const { getProductById } = useCatalog();
  const product = getProductById(route.params.productId);
  const { getQuantity, increment, decrement } = useCart();
  const { colors, typography } = useTheme();
  const { profile } = useUserProfile();
  const styles = useMemo(() => createStyles(colors), [colors]);

  /* One review per product per user; stored globally and filtered by productId */
  const [myReviews, setMyReviews] = usePersistedState<Review[]>('my_reviews', []);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');

  const myReview = useMemo(
    () => myReviews.find(r => r.productId === product?.id),
    [myReviews, product?.id],
  );
  const productReviews = useMemo(() => {
    const others = MOCK_REVIEWS.filter(r => r.productId === product?.id);
    return myReview ? [myReview, ...others] : others;
  }, [myReview, product?.id]);
  const reviewCount = productReviews.length;
  const avgRating = reviewCount > 0
    ? productReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;

  const openReviewForm = () => {
    setDraftRating(myReview?.rating ?? 0);
    setDraftComment(myReview?.comment ?? '');
    setIsReviewFormOpen(true);
  };

  const submitReview = () => {
    if (draftRating === 0 || !product) return;
    const newReview: Review = {
      id: myReview?.id ?? `my-${product.id}-${Date.now()}`,
      productId: product.id,
      author: profile.name.trim() || 'You',
      rating: draftRating,
      comment: draftComment.trim(),
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    setMyReviews(prev => [newReview, ...prev.filter(r => r.productId !== product.id)]);
    setIsReviewFormOpen(false);
  };

  const deleteMyReview = () => {
    if (!product) return;
    setMyReviews(prev => prev.filter(r => r.productId !== product.id));
    setIsReviewFormOpen(false);
  };

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
          <Ionicons name="arrow-back" size={21} color={colors.text} />
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
            {reviewCount > 0 ? (
              <View style={styles.ratingSummary}>
                <StarRating rating={avgRating} size={12} />
                <Text style={styles.ratingSummaryText}>
                  {avgRating.toFixed(1)} ({reviewCount})
                </Text>
              </View>
            ) : null}
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

          {/* ETA delivery strip */}
          <View style={styles.etaStrip}>
            <Ionicons name="time-outline" size={15} color={colors.primary} />
            <Text style={styles.etaText}>
              Delivery in <Text style={styles.etaBold}>45 minutes</Text>
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

          {/* Ratings & Reviews */}
          <View style={styles.reviewsSection}>
            <Text style={styles.descTitle}>Ratings & Reviews</Text>

            {!isReviewFormOpen ? (
              <Pressable style={styles.reviewCta} onPress={openReviewForm}>
                <Text style={styles.reviewCtaText}>
                  {myReview ? '✏️  Edit your review' : '⭐  Write a review'}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.reviewForm}>
                <StarRating rating={draftRating} size={26} onChange={setDraftRating} />
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Share your experience with this product..."
                  placeholderTextColor={colors.textMuted}
                  value={draftComment}
                  onChangeText={setDraftComment}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.reviewFormActions}>
                  <Pressable
                    style={[styles.reviewSubmitBtn, draftRating === 0 && styles.reviewSubmitBtnDisabled]}
                    onPress={submitReview}
                    disabled={draftRating === 0}
                  >
                    <Text style={styles.reviewSubmitText}>
                      {myReview ? 'Update Review' : 'Submit Review'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.reviewCancelBtn} onPress={() => setIsReviewFormOpen(false)}>
                    <Text style={styles.reviewCancelText}>Cancel</Text>
                  </Pressable>
                </View>
                {myReview ? (
                  <Pressable onPress={deleteMyReview} hitSlop={8}>
                    <Text style={styles.reviewDeleteText}>Delete my review</Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {productReviews.length === 0 ? (
              <Text style={styles.noReviewsText}>No reviews yet. Be the first to share your thoughts!</Text>
            ) : (
              <View style={styles.reviewList}>
                {productReviews.map(r => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewCardTop}>
                      <Text style={styles.reviewAuthor}>
                        {r.author}{r.id === myReview?.id ? ' (You)' : ''}
                      </Text>
                      <Text style={styles.reviewDate}>{r.date}</Text>
                    </View>
                    <StarRating rating={r.rating} size={12} />
                    {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
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
      color: '#FFFFFF',
      fontWeight: '700',
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
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
      backgroundColor: '#F2F8F3',
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
      backgroundColor: '#E53935',
      borderRadius: radius.sm,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
    },
    discountText: {
      color: '#FFFFFF',
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
      color: '#FFFFFF',
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
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 20,
    },
    stepperMiddle: {
      flex: 1,
      alignItems: 'center',
    },
    stepperQty: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 18,
      lineHeight: 20,
    },
    stepperLabel: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 10,
      fontWeight: '500',
    },
  });
}
