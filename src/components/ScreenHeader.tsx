import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, spacing } from '../theme';

type ScreenHeaderProps = {
  title: string;
  onBack: () => void;
};

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={8}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={typography.heading}>{title}</Text>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      gap: spacing.xs,
    },
    back: {
      color: colors.primary,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
  });
}
