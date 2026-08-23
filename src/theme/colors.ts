export type ColorPalette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  border: string;
  danger: string;
  success: string;
};

/* Editorial palette — desaturated blush and cream with a terracotta accent.
   Deliberately low-contrast between background and surface so photography
   carries the page rather than competing with coloured blocks. */
export const lightColors: ColorPalette = {
  background: '#FBF6F0',
  surface: '#FFFDFB',
  surfaceMuted: '#F4E8E0',

  primary: '#B4553C',
  primaryDark: '#7E3728',
  primaryLight: '#F2E2DA',

  accent: '#C98B6B',
  accentLight: '#F7EDE5',

  text: '#2A1C16',
  textMuted: '#947D6E',
  textOnPrimary: '#FFFDFB',

  border: '#EADFD6',
  danger: '#B03A2E',
  success: '#6B8F6F',
};

export const darkColors: ColorPalette = {
  background: '#17110E',
  surface: '#221A15',
  surfaceMuted: '#2D221C',

  primary: '#D08A6E',
  primaryDark: '#B06C52',
  primaryLight: '#33241D',

  accent: '#C98B6B',
  accentLight: '#38271F',

  text: '#F4EAE2',
  textMuted: '#AE988A',
  textOnPrimary: '#1A120C',

  border: '#37281F',
  danger: '#D9705C',
  success: '#7FA883',
};

// Default export kept for any non-theme-aware usage; prefer useTheme() in components.
export const colors = lightColors;
