import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type AuthHeroProps = {
  emoji?: string;
  title: string;
  subtitle: string;
};

export function AuthHero({ emoji = '🎂', title, subtitle }: AuthHeroProps) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Text style={styles.badgeEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.brand}>Lajwab Bakery</Text>
      <Text style={[typography.heading, styles.title]}>{title}</Text>
      <Text style={[typography.body, styles.subtitle]}>{subtitle}</Text>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xl,
    },
    badge: {
      width: 72,
      height: 72,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    badgeEmoji: {
      fontSize: 34,
    },
    brand: {
      color: colors.primaryDark,
      fontWeight: '700',
      fontSize: 13,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    title: {
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    subtitle: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 2,
    },
  });
}
