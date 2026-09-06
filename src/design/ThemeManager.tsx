import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';
import { applyVisualThemeToDocument, getVisualTheme, readVisualTheme, VISUAL_THEME_STORAGE_KEY, type VisualThemeId } from './themes';
import { ThemeContext } from './theme-context';

export function ThemeManager({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<VisualThemeId>(() => readVisualTheme());
  const setBoardTheme = useGameStore(state => state.setTheme);
  const setThemeId = useCallback((id: VisualThemeId) => setThemeIdState(id), []);

  useEffect(() => {
    const theme = getVisualTheme(themeId);
    applyVisualThemeToDocument(themeId);
    setBoardTheme(theme.board);
    try { localStorage.setItem(VISUAL_THEME_STORAGE_KEY, themeId); } catch { /* local-first preference is best-effort */ }
  }, [setBoardTheme, themeId]);

  const value = useMemo(() => ({ themeId, setThemeId }), [setThemeId, themeId]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
