import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveImage } from '../data/productImages';
import { useCart } from '../state/CartContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
import { Card } from './Card';

type ProductCardProps = {
  productId: string;
  image: string;
  name: string;
  unit: string;
  price: number;
  mrp?: number;
  stock?: number;
  onPress?: () => void;
};

/* Catalog images resolve to a bundled photo where we have one, otherwise the
   emoji in products.ts stands in — see src/data/productImages.ts. */
export function isEmoji(image: string): boolean {
  return !/^https?:\/\//.test(image);
}

export function ProductCard({ productId, image, name, unit, price, mrp, stock, onPress }: ProductCardProps) {
  const photo = resolveImage(productId, image);
  const { getQuantity, increment, decrement } = useCart();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const quantity = getQuantity(productId);
  const discount = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null;
  const isOutOfStock = stock !== undefined && stock <= 0;
  const isAtStockLimit = stock !== undefined && quantity >= stock;

  /* ── Animated refs ── */
  const addOpacity = useRef(new Animated.Value(quantity === 0 ? 1 : 0)).current;
  const addScale = useRef(new Animated.Value(1)).current;
  const stepperOpacity = useRef(new Animated.Value(quantity > 0 ? 1 : 0)).current;
  const stepperScale = useRef(new Animated.Value(quantity > 0 ? 1 : 0.82)).current;
  const qtyScale = useRef(new Animated.Value(1)).current;
  const prevQty = useRef(quantity);

  useEffect(() => {
    const prev = prevQty.current;
    prevQty.current = quantity;

    if (quantity > 0 && prev === 0) {
      /* ADD → stepper */
      Animated.parallel([
        Animated.timing(addOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(60),
          Animated.parallel([
            Animated.timing(stepperOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.spring(stepperScale, {
              toValue: 1,
              useNativeDriver: true,
              damping: 11,
              stiffness: 200,
              mass: 0.7,
            }),
          ]),
        ]),
      ]).start();
    } else if (quantity === 0 && prev > 0) {
      /* stepper → ADD */
      stepperScale.setValue(0.82);
      Animated.parallel([
        Animated.timing(stepperOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(60),
          Animated.timing(addOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]),
      ]).start();
    } else if (quantity !== prev && quantity > 0) {
      /* quantity nudge while stepper is shown */
      Animated.sequence([
        Animated.timing(qtyScale, { toValue: 1.5, duration: 90, useNativeDriver: true }),
        Animated.spring(qtyScale, { toValue: 1, useNativeDriver: true, speed: 28, bounciness: 10 }),
      ]).start();
    }
  }, [quantity]);

  const handleAdd = () => {
    Animated.sequence([
      Animated.timing(addScale, { toValue: 0.86, duration: 75, useNativeDriver: true }),
      Animated.spring(addScale, { toValue: 1, useNativeDriver: true, speed: 28, bounciness: 12 }),
    ]).start();
    increment(productId);
  };

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onPress}
        style={styles.imageWrap}
        accessibilityRole="button"
        accessibilityLabel={name + ', ' + unit + ', ' + price + ' rupees'}
        accessibilityHint="Opens product details"
      >
        <View style={styles.imageContainer}>
          {photo ? (
            <Image source={photo} style={styles.image} resizeMode="cover" />
          ) : (
            <Text style={styles.emoji}>{image}</Text>
          )}
        </View>
      </Pressable>

      <View style={styles.info}>
        <Text style={[typography.subheading, styles.name]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[typography.caption, styles.unit]}>{unit}</Text>
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={typography.price}>₹{price}</Text>
          {mrp && mrp > price ? <Text style={styles.mrp}>₹{mrp}</Text> : null}
        </View>

        {isOutOfStock ? (
          <Text style={styles.outOfStock}>Out of stock</Text>
        ) : (
          <View style={styles.ctaWrap}>
            {/* ADD button — fades out when stepper appears */}
            <Animated.View
              pointerEvents={quantity === 0 ? 'auto' : 'none'}
              style={[
                StyleSheet.absoluteFill,
                { opacity: addOpacity, alignItems: 'center', justifyContent: 'center' },
              ]}
            >
              <Animated.View style={{ transform: [{ scale: addScale }] }}>
                <Pressable
                  style={styles.addButton}
                  onPress={handleAdd}
                  accessibilityRole="button"
                  accessibilityLabel={'Add ' + name + ' to cart'}
                >
                  <Text style={styles.addButtonText}>ADD</Text>
                </Pressable>
              </Animated.View>
            </Animated.View>

            {/* Stepper — springs in when item is added */}
            <Animated.View
              pointerEvents={quantity > 0 ? 'auto' : 'none'}
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: stepperOpacity,
                  transform: [{ scale: stepperScale }],
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepperButton}
                  onPress={() => decrement(productId)}
                  accessibilityRole="button"
                  accessibilityLabel={'Remove one ' + name}
                >
                  <Text style={styles.stepperButtonText}>−</Text>
                </Pressable>
                <Animated.Text
                  style={[styles.stepperValue, { transform: [{ scale: qtyScale }] }]}
                  accessibilityLabel={quantity + ' in cart'}
                >
                  {quantity}
                </Animated.Text>
                <Pressable
                  style={[styles.stepperButton, isAtStockLimit && styles.stepperButtonDisabled]}
                  onPress={() => !isAtStockLimit && increment(productId)}
                  accessibilityRole="button"
                  accessibilityLabel={'Add one more ' + name}
                  accessibilityState={{ disabled: isAtStockLimit }}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        )}
      </View>
    </Card>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
    },
    imageWrap: {
      width: '100%',
    },
    imageContainer: {
      width: '100%',
      aspectRatio: 1,
      /* Warm tint rather than cold grey, so the emoji placeholders read as a
         deliberate treatment next to the cards that do have photography. */
      backgroundColor: colors.accentLight,
      borderRadius: radius.md,
      overflow: 'hidden',
      marginBottom: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: {
      width: '85%',
      height: '85%',
    },
    emoji: {
      fontSize: 56,
      lineHeight: 66,
      textAlign: 'center',
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 13,
      lineHeight: 17,
    },
    unit: {
      color: colors.textMuted,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    mrp: {
      fontSize: 11,
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    /* Fixed-size container so ADD and stepper occupy same space */
    ctaWrap: {
      width: 78,
      height: 30,
    },
    addButton: {
      backgroundColor: 'transparent',
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: spacing.xs + 1,
      paddingHorizontal: spacing.md,
      elevation: 3,
    },
    addButtonText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 10,
      letterSpacing: 1.4,
    },
    outOfStock: {
      color: colors.danger,
      fontWeight: '600',
      fontSize: 11,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: radius.sm,
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    stepperButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    stepperButtonDisabled: {
      opacity: 0.4,
    },
    stepperButtonText: {
      color: colors.textOnPrimary,
      fontWeight: '700',
      fontSize: 14,
    },
    stepperValue: {
      color: colors.textOnPrimary,
      fontWeight: '700',
      fontSize: 13,
      minWidth: 18,
      textAlign: 'center',
    },
  });
}
