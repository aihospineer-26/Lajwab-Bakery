import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CartLineItem } from '../components/CartLineItem';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { ProductWithStock } from '../services/catalog';
import { useAuth } from '../state/AuthContext';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { useLocation } from '../state/LocationContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Cart'>,
  NativeStackScreenProps<RootStackParamList>
>;

/* Staggered fade-slide entrance for each cart row */
function FadeSlideIn({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const delay = Math.min(index, 6) * 60;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

/* Wraps CartLineItem and plays a slide-left exit when qty drops to 0 */
type RemovableItemProps = {
  product: ProductWithStock;
  index: number;
  onRemoveComplete: (id: string) => void;
};

function RemovableItem({ product, index, onRemoveComplete }: RemovableItemProps) {
  const { getQuantity } = useCart();
  const qty = getQuantity(product.id);
  const slideX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const wasRemovedRef = useRef(false);

  useEffect(() => {
    if (qty === 0 && !wasRemovedRef.current) {
      wasRemovedRef.current = true;
      Animated.parallel([
        Animated.timing(slideX, { toValue: -140, duration: 260, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onRemoveComplete(product.id));
    }
  }, [qty]);

  return (
    <FadeSlideIn index={index}>
      <Animated.View style={{ opacity, transform: [{ translateX: slideX }] }}>
        <CartLineItem product={product} />
      </Animated.View>
    </FadeSlideIn>
  );
}

export function CartScreen({ navigation }: Props) {
  const {
    quantities,
    totalItems,
    totalPrice,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    discount,
    deliveryFee,
    grandTotal,
  } = useCart();
  const { products } = useCatalog();
  const { address } = useLocation();
  const { session } = useAuth();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  /* Memoized so the reference only changes when the cart actually changes —
     the displayItems effect below depends on it and would otherwise re-run
     (and re-set state) on every render, looping forever. */
  const cartProducts = useMemo(
    () => products.filter((p) => (quantities[p.id] ?? 0) > 0),
    [products, quantities],
  );

  const [orderError, setOrderError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApplyCoupon = () => {
    const result = applyCoupon(coupon);
    setCouponError(result.ok ? null : result.message);
    if (result.ok) setCoupon('');
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponError(null);
  };

  /* displayItems lags cartProducts: keeps items in list while they animate out */
  const [displayItems, setDisplayItems] = useState<ProductWithStock[]>(cartProducts);
  useEffect(() => {
    setDisplayItems(prev => {
      const updatedExisting = prev.map(p => cartProducts.find(cp => cp.id === p.id) ?? p);
      const toAdd = cartProducts.filter(p => !prev.find(pp => pp.id === p.id));
      return [...updatedExisting, ...toAdd];
    });
  }, [cartProducts]);

  const handleRemoveComplete = useCallback((id: string) => {
    setDisplayItems(prev => prev.filter(p => p.id !== id));
  }, []);

  const hasAddress = address.id !== '';
  const deliveryProgress = Math.min(totalPrice / FREE_DELIVERY_THRESHOLD, 1);
  const amountLeft = Math.max(FREE_DELIVERY_THRESHOLD - totalPrice, 0);
  const totalSavings = cartProducts.reduce((sum, p) => {
    const qty = quantities[p.id] ?? 0;
    return sum + (p.mrp && p.mrp > p.price ? (p.mrp - p.price) * qty : 0);
  }, 0);

  /* Animated progress bar fill */
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: deliveryProgress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [deliveryProgress]);

  /* Place Order button pulse when page is ready */
  const ctaPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (totalItems > 0) {
      Animated.sequence([
        Animated.delay(500),
        Animated.spring(ctaPulse, { toValue: 1.03, useNativeDriver: true, speed: 10, bounciness: 6 }),
        Animated.spring(ctaPulse, { toValue: 1, useNativeDriver: true, speed: 8 }),
      ]).start();
    }
  }, []);

  const handlePlaceOrder = () => {
    /* A guest has no saved address and cannot create one: addresses are scoped
       to auth.uid() by RLS, so the address screen would refuse to save and the
       funnel would dead-end on a demand the customer has no way to meet. Let
       them through -- Checkout is where sign-in is asked for, and it explains
       why. The address check still applies once they have an account. */
    if (session && !hasAddress) {
      setOrderError('Please add a delivery address before placing an order.');
      return;
    }
    setOrderError(null);
    navigation.navigate('Checkout');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Your Cart" />

      {totalItems === 0 && displayItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={[typography.subheading, { textAlign: 'center' }]}>Your cart is empty</Text>
          <Text style={[typography.body, styles.emptyText]}>
            Add something fresh from the oven to get started.
          </Text>
          <Pressable style={styles.emptyButton} onPress={() => (navigation as any).navigate('Home')}>
            <Text style={styles.emptyButtonText}>Browse Products</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item, index }) => (
            <RemovableItem
              product={item}
              index={index}
              onRemoveComplete={handleRemoveComplete}
            />
          )}
          ListHeaderComponent={
            <>
              {/* Animated free delivery progress bar */}
              <View style={styles.progressCard}>
                {amountLeft > 0 ? (
                  <>
                    <Text style={styles.progressLabel}>
                      Add{' '}
                      <Text style={styles.progressAmount}>₹{amountLeft} more</Text>
                      {' '}for free delivery 🚚
                    </Text>
                    <View style={styles.progressTrack}>
                      <Animated.View
                        style={[
                          styles.progressFill,
                          {
                            width: progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            }),
                          },
                        ]}
                      />
                    </View>
                  </>
                ) : (
                  <Text style={styles.progressFree}>🎉 You've unlocked free delivery!</Text>
                )}
              </View>

              <Card style={styles.addressCard}>
                <View>
                  <Text style={typography.caption}>Deliver to</Text>
                  <Text style={typography.subheading}>
                    {hasAddress ? address.label : 'No address selected'}
                  </Text>
                  {hasAddress ? <Text style={typography.caption}>{address.line1}</Text> : null}
                </View>
                <Pressable onPress={() => navigation.navigate('Addresses')}>
                  <Text style={styles.changeText}>Change</Text>
                </Pressable>
              </Card>
            </>
          }
          ListFooterComponent={
            <Card style={styles.summaryCard}>
              {/* Coupon */}
              {appliedCoupon ? (
                <View style={styles.couponApplied}>
                  <Text style={styles.couponAppliedEmoji}>🎟️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.couponAppliedCode}>{appliedCoupon.code} applied</Text>
                    <Text style={styles.couponAppliedSub}>{appliedCoupon.discount}</Text>
                  </View>
                  <Pressable onPress={handleRemoveCoupon} hitSlop={8}>
                    <Text style={styles.couponRemove}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.couponRow}>
                    <View style={[styles.couponInput, couponError && styles.couponInputError]}>
                      <Text style={styles.couponEmoji}>🏷️</Text>
                      <TextInput
                        style={styles.couponField}
                        placeholder="Enter coupon code"
                        placeholderTextColor={colors.textMuted}
                        value={coupon}
                        onChangeText={(text) => {
                          setCoupon(text);
                          if (couponError) setCouponError(null);
                        }}
                        onSubmitEditing={handleApplyCoupon}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="done"
                      />
                    </View>
                    <Pressable style={styles.couponApply} onPress={handleApplyCoupon}>
                      <Text style={styles.couponApplyText}>Apply</Text>
                    </Pressable>
                  </View>
                  {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}
                </>
              )}

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={typography.body}>Subtotal</Text>
                <Text style={typography.body}>₹{totalPrice}</Text>
              </View>
              {discount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.discountLabel}>Coupon discount</Text>
                  <Text style={styles.discountValue}>− ₹{discount}</Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={typography.body}>Delivery Fee</Text>
                {deliveryFee === 0 ? (
                  <View style={styles.freeDeliveryRow}>
                    <Text style={styles.freeDeliveryStrike}>₹{DELIVERY_FEE}</Text>
                    <Text style={styles.freeDeliveryLabel}>FREE</Text>
                  </View>
                ) : (
                  <Text style={typography.body}>₹{deliveryFee}</Text>
                )}
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={typography.subheading}>Total</Text>
                <Text style={typography.subheading}>₹{grandTotal}</Text>
              </View>

              {totalSavings > 0 ? (
                <View style={styles.savingsCard}>
                  <Text style={styles.savingsText}>🎉 You saved ₹{totalSavings} on this order!</Text>
                </View>
              ) : null}
            </Card>
          }
        />
      )}

      {totalItems > 0 ? (
        <View style={styles.footer}>
          {orderError ? <Text style={styles.error}>{orderError}</Text> : null}
          <Animated.View style={{ transform: [{ scale: ctaPulse }] }}>
            <Button
              label={`Proceed to Checkout · ₹${grandTotal}`}
              onPress={handlePlaceOrder}
            />
          </Animated.View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    progressCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    progressLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
    },
    progressAmount: {
      color: colors.primary,
      fontWeight: '700',
    },
    progressTrack: {
      height: 5,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.full,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: radius.full,
    },
    progressFree: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      textAlign: 'center',
    },
    addressCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    changeText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
    summaryCard: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    couponRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    couponInput: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs + 2,
    },
    couponEmoji: {
      fontSize: 14,
    },
    couponField: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      paddingVertical: 0,
    },
    couponApply: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      justifyContent: 'center',
    },
    couponApplyText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    couponInputError: {
      borderColor: colors.danger,
    },
    couponError: {
      fontSize: 12,
      color: colors.danger,
      marginTop: -spacing.xs,
    },
    couponApplied: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primaryLight,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    couponAppliedEmoji: {
      fontSize: 16,
    },
    couponAppliedCode: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primaryDark,
    },
    couponAppliedSub: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '600',
    },
    couponRemove: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.danger,
    },
    discountLabel: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
    discountValue: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '700',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    freeDeliveryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    freeDeliveryStrike: {
      fontSize: 13,
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    freeDeliveryLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
      marginTop: spacing.xs,
    },
    savingsCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.xs,
    },
    savingsText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      gap: spacing.sm,
    },
    error: {
      color: colors.danger,
      fontSize: 13,
      textAlign: 'center',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xl,
    },
    emptyEmoji: {
      fontSize: 52,
      marginBottom: spacing.sm,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textMuted,
    },
    emptyButton: {
      marginTop: spacing.md,
      backgroundColor: colors.primary,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.full,
    },
    emptyButtonText: {
      color: colors.textOnPrimary,
      fontWeight: '700',
      fontSize: 14,
    },
  });
}
