/**
 * Theme context. Zero Native resolves the pack against the OS appearance
 * for free; here `useColorScheme` does the same job and re-renders the
 * tree when the device flips between light and dark.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { dark, light, type Palette } from './tokens';

export type Theme = {
  colors: Palette;
  scheme: 'light' | 'dark';
};

const ThemeContext = createContext<Theme>({ colors: dark, scheme: 'dark' });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const value = useMemo<Theme>(
    () => ({ colors: scheme === 'light' ? light : dark, scheme }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
