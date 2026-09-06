import { createContext, useContext } from 'react';
import type { VisualThemeId } from './themes';

export type ThemeContextValue = {
  themeId: VisualThemeId;
  setThemeId: (id: VisualThemeId) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useVisualTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useVisualTheme must be used inside ThemeManager');
  return value;
}
