import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type BadgeProps = {
  label: string;
  tone?: 'accent' | 'primary';
};

export function Badge({ label, tone = 'accent' }: BadgeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPrimary = tone === 'primary';
  return (
    <View style={[styles.badge, isPrimary ? styles.primary : styles.accent]}>
      <Text style={[styles.text, isPrimary ? styles.primaryText : styles.accentText]}>
        {label}
      </Text>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    badge: {
      paddingVertical: spacing.xs / 2,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.full,
      alignSelf: 'flex-start',
    },
    accent: {
      backgroundColor: colors.accentLight,
    },
    primary: {
      backgroundColor: colors.primaryLight,
    },
    text: {
      fontSize: 11,
      fontWeight: '700',
    },
    accentText: {
      color: colors.accent,
    },
    primaryText: {
      color: colors.primaryDark,
    },
  });
}
