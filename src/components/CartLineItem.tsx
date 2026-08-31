import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCart } from '../state/CartContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
import { resolveImage } from '../data/productImages';
import { ProductWithStock } from '../services/catalog';
import { Card } from './Card';

export function CartLineItem({ product }: { product: ProductWithStock }) {
  const { getQuantity, increment, decrement } = useCart();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const quantity = getQuantity(product.id);
  /* products.image is an emoji, not a URL, so <Image source={{uri}}> could
     never load it -- the cart drew an empty tile for every line. Same
     resolver the product cards use: the bundled photo when there is one, the
     emoji as text when there is not. */
  const photo = resolveImage(product.id, product.image);
  const isAtStockLimit = quantity >= product.stock;

  const qtyScale = useRef(new Animated.Value(1)).current;
  const prevQty = useRef(quantity);

  useEffect(() => {
    if (quantity !== prevQty.current) {
      prevQty.current = quantity;
      Animated.sequence([
        Animated.timing(qtyScale, { toValue: 1.45, duration: 90, useNativeDriver: true }),
        Animated.spring(qtyScale, { toValue: 1, useNativeDriver: true, speed: 28, bounciness: 10 }),
      ]).start();
    }
  }, [quantity]);

  return (
    <Card style={styles.card}>
      <View style={styles.imageArea}>
        {photo ? (
          <Image source={photo} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{product.image}</Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[typography.subheading, styles.name]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[typography.caption, styles.unit]}>{product.unit}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.unitPrice}>₹{product.price} × {quantity}</Text>
          <Text style={[typography.price, styles.totalPrice]}>₹{product.price * quantity}</Text>
        </View>
      </View>
      <View style={styles.stepper}>
        <Pressable style={styles.stepperButton} onPress={() => decrement(product.id)}>
          <Text style={styles.stepperButtonText}>−</Text>
        </Pressable>
        <Animated.Text style={[styles.stepperValue, { transform: [{ scale: qtyScale }] }]}>
          {quantity}
        </Animated.Text>
        <Pressable
          style={[styles.stepperButton, isAtStockLimit && styles.stepperButtonDisabled]}
          onPress={() => !isAtStockLimit && increment(product.id)}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    imageArea: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.md,
      width: 68,
      height: 68,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    emoji: {
      fontSize: 30,
      textAlign: 'center',
    },
    image: {
      /* Fills the rounded tile, matching the product cards. */
      width: '100%',
      height: '100%',
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 14.5,
      lineHeight: 19,
    },
    unit: {
      marginTop: 1,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    unitPrice: {
      fontSize: 12,
      color: colors.textMuted,
    },
    totalPrice: {
      fontSize: 16,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: radius.sm,
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
