import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCart } from '../state/CartContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, Typography, radius, spacing } from '../theme';

export function CartSummaryBar({ onPress }: { onPress?: () => void }) {
  const { totalItems, totalPrice } = useCart();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const [rendered, setRendered] = useState(totalItems > 0);
  const slideY = useRef(new Animated.Value(totalItems > 0 ? 0 : 90)).current;
  const isVisible = totalItems > 0;

  useEffect(() => {
    if (isVisible) {
      setRendered(true);
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 180,
        mass: 0.8,
      }).start();
    } else {
      Animated.timing(slideY, {
        toValue: 90,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setRendered(false));
    }
  }, [isVisible]);

  if (!rendered) return null;

  return (
    <Animated.View style={[styles.bar, { transform: [{ translateY: slideY }] }]}>
      <Pressable style={styles.inner} onPress={onPress}>
        <View>
          <Text style={styles.itemsText}>{totalItems} item{totalItems > 1 ? 's' : ''}</Text>
          <Text style={styles.priceText}>₹{totalPrice}</Text>
        </View>
        <Text style={styles.cta}>View Cart →</Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ColorPalette, typography: Typography) {
  return StyleSheet.create({
    bar: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      bottom: spacing.lg,
      borderRadius: radius.lg,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
    },
    inner: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemsText: {
      ...typography.caption,
      color: colors.textOnPrimary,
      opacity: 0.82,
    },
    priceText: {
      ...typography.subheading,
      color: colors.textOnPrimary,
    },
    cta: {
      ...typography.subheading,
      color: colors.textOnPrimary,
    },
  });
}
