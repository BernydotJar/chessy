import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../auth/store';
import { applyVisualThemeToDocument, canApplyVisualTheme, DEFAULT_VISUAL_THEME, getVisualTheme, readVisualTheme, VISUAL_THEME_STORAGE_KEY, type VisualThemeId } from './themes';
import { ThemeContext } from './theme-context';

export function ThemeManager({ children }: { children: ReactNode }) {
  // Preserve an authenticated premium preference across sign-out without showing it to guests.
  const [requestedThemeId, setRequestedThemeId] = useState<VisualThemeId>(() => readVisualTheme(true));
  const premiumClaim = useAuthStore(state => state.status === 'signed-in' && state.user?.premiumThemes === true);
  const hasPremiumAccess = premiumClaim;
  const themeId = canApplyVisualTheme(requestedThemeId, hasPremiumAccess) ? requestedThemeId : DEFAULT_VISUAL_THEME;
  const setBoardTheme = useGameStore(state => state.setTheme);
  const setThemeId = useCallback((id: VisualThemeId): boolean => {
    if (!canApplyVisualTheme(id, hasPremiumAccess)) return false;
    setRequestedThemeId(id);
    try { localStorage.setItem(VISUAL_THEME_STORAGE_KEY, id); } catch { /* best effort */ }
    return true;
  }, [hasPremiumAccess]);

  useEffect(() => {
    const theme = getVisualTheme(themeId);
    applyVisualThemeToDocument(themeId);
    setBoardTheme(theme.board);
  }, [setBoardTheme, themeId]);

  const value = useMemo(() => ({ themeId, setThemeId, hasPremiumAccess }), [setThemeId, themeId, hasPremiumAccess]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
