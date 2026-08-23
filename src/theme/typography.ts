import { ColorPalette, lightColors } from './colors';

export function createTypography(colors: ColorPalette) {
  return {
    heading: {
      fontSize: 22,
      fontWeight: '800' as const,
      color: colors.text,
    },
    subheading: {
      fontSize: 17,
      fontWeight: '700' as const,
      color: colors.text,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: colors.text,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      color: colors.textMuted,
    },
    price: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: colors.text,
    },
  };
}

export type Typography = ReturnType<typeof createTypography>;

// Default export kept for any non-theme-aware usage; prefer useTheme() in components.
export const typography = createTypography(lightColors);
