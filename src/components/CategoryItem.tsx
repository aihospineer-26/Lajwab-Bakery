import React, { useMemo, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
import { resolveImage } from '../data/productImages';

type CategoryItemProps = {
  image: string;
  name: string;
  onPress?: () => void;
};

export function CategoryItem({ image, name, onPress }: CategoryItemProps) {
  const photo = resolveImage(image, image);
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
        {photo ? (
          <Image source={photo} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{image}</Text>
        )}
      </Animated.View>
      <Text
        style={[typography.caption, styles.label]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      width: 76,
    },
    circle: {
      width: 64,
      height: 64,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      overflow: 'hidden',
      marginBottom: spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    image: {
      width: '78%',
      height: '78%',
    },
    emoji: {
      fontSize: 30,
      lineHeight: 38,
      textAlign: 'center',
    },
    label: {
      textAlign: 'center',
      fontWeight: '600',
      fontSize: 12,
      color: colors.text,
    },
  });
}
