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

export const lightColors: ColorPalette = {
  background: '#FDF8F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F7EEE2',

  primary: '#A9542F',
  primaryDark: '#7A3A1E',
  primaryLight: '#F5E4D7',

  accent: '#E8A33D',
  accentLight: '#FDF0DC',

  text: '#24170F',
  textMuted: '#8A7462',
  textOnPrimary: '#FFFFFF',

  border: '#EADFD1',
  danger: '#C4452F',
  success: '#3D8B5F',
};

export const darkColors: ColorPalette = {
  background: '#16100C',
  surface: '#221812',
  surfaceMuted: '#2C201A',

  primary: '#D98F63',
  primaryDark: '#B87249',
  primaryLight: '#33241B',

  accent: '#F0B85C',
  accentLight: '#3A2A16',

  text: '#F4EAE0',
  textMuted: '#B09A87',
  textOnPrimary: '#1A120C',

  border: '#362720',
  danger: '#E8705A',
  success: '#5FB483',
};

// Default export kept for any non-theme-aware usage; prefer useTheme() in components.
export const colors = lightColors;
