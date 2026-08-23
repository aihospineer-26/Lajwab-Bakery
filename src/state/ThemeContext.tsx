import React, { createContext, useContext, useMemo } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import { ColorPalette, darkColors, lightColors } from '../theme/colors';
import { createTypography, Typography } from '../theme/typography';

type ThemeContextValue = {
  isDark: boolean;
  toggleDark: () => void;
  colors: ColorPalette;
  typography: Typography;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = usePersistedState('theme_dark', false);

  const value = useMemo(() => {
    const colors = isDark ? darkColors : lightColors;
    return {
      isDark,
      toggleDark: () => setIsDark((prev) => !prev),
      colors,
      typography: createTypography(colors),
    };
  }, [isDark, setIsDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
