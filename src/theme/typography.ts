import { ColorPalette, lightColors } from './colors';

/* Editorial type: a high-contrast serif carries display text, the system sans
   carries everything functional. `serif` falls back to the platform serif when
   Playfair has not finished loading, so text never renders invisible. */
export const SERIF = 'PlayfairDisplay_600SemiBold';
export const SERIF_BOLD = 'PlayfairDisplay_700Bold';

export function createTypography(colors: ColorPalette) {
  return {
    /* Reserved for page-level titles — the one place the serif gets to be large. */
    display: {
      fontFamily: SERIF_BOLD,
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.4,
      color: colors.text,
    },
    heading: {
      fontFamily: SERIF_BOLD,
      fontSize: 24,
      lineHeight: 31,
      letterSpacing: -0.2,
      color: colors.text,
    },
    subheading: {
      fontFamily: SERIF,
      fontSize: 18,
      lineHeight: 24,
      color: colors.text,
    },
    /* Wide-tracked caps for section labels — "SHOP CATEGORIES" rather than a
       bold sans heading. Small, quiet, and does a lot of the editorial work. */
    overline: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 1.6,
      textTransform: 'uppercase' as const,
      color: colors.textMuted,
    },
    body: {
      fontSize: 14,
      lineHeight: 21,
      fontWeight: '400' as const,
      color: colors.text,
    },
    caption: {
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '400' as const,
      color: colors.textMuted,
    },
    price: {
      fontFamily: SERIF,
      fontSize: 17,
      color: colors.text,
    },
  };
}

export type Typography = ReturnType<typeof createTypography>;

// Default export kept for any non-theme-aware usage; prefer useTheme() in components.
export const typography = createTypography(lightColors);
