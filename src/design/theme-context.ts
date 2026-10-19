import { createContext, useContext } from 'react';
import type { VisualThemeId } from './themes';

export type ThemeContextValue = {
  themeId: VisualThemeId;
  // Returns false when a premium theme is unavailable for this account.
  setThemeId: (id: VisualThemeId) => boolean;
  hasPremiumAccess: boolean;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useVisualTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useVisualTheme must be used inside ThemeManager');
  return value;
}
