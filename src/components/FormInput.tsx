import React, { useMemo, useState } from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type FormInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  /* Fixed text pinned inside the field, e.g. a +91 dialling code. */
  prefix?: string;
  maxLength?: number;
};

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  autoCapitalize = 'sentences',
  autoFocus,
  prefix,
  maxLength,
  secureTextEntry,
}: FormInputProps) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isFocused, setIsFocused] = useState(false);

  const shared = {
    accessibilityLabel: label,
    placeholder,
    placeholderTextColor: colors.textMuted,
    value,
    onChangeText,
    keyboardType,
    autoCapitalize,
    autoFocus,
    maxLength,
    secureTextEntry,
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      {prefix ? (
        <View
          style={[
            styles.prefixRow,
            isFocused && styles.inputFocused,
            error && styles.inputError,
          ]}
        >
          <Text style={styles.prefix}>{prefix}</Text>
          <TextInput style={styles.prefixInput} {...shared} />
        </View>
      ) : (
        <TextInput
          style={[styles.input, isFocused && styles.inputFocused, error && styles.inputError]}
          {...shared}
        />
      )}

      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.xs / 2,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      fontSize: 15,
      color: colors.text,
    },
    prefixRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
    },
    prefix: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textMuted,
      marginRight: spacing.sm,
    },
    prefixInput: {
      flex: 1,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: 0,
      fontSize: 15,
      color: colors.text,
    },
    inputFocused: {
      borderColor: colors.primary,
    },
    inputError: {
      borderColor: colors.danger,
    },
    error: {
      color: colors.danger,
    },
  });
}
