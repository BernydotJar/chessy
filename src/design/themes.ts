import type { BoardTheme } from '../types/chess.types';

export type VisualThemeId = 'forest' | 'ivory' | 'night';

export interface VisualTheme {
  id: VisualThemeId;
  labelKey: string;
  descriptionKey: string;
  board: BoardTheme;
  preview: { bg: string; surface: string; light: string; dark: string; accent: string };
}

export const VISUAL_THEME_STORAGE_KEY = 'chessy-visual-theme-v2';
export const DEFAULT_VISUAL_THEME: VisualThemeId = 'forest';

export const VISUAL_THEMES: readonly VisualTheme[] = [
  {
    id: 'forest',
    labelKey: 'theme.forest',
    descriptionKey: 'theme.forestDescription',
    board: { lightSquare: '#eee6d6', darkSquare: '#5e8273', glassOpacity: 0.08, glassBlur: 4 },
    preview: { bg: '#0b1712', surface: '#14231b', light: '#eee6d6', dark: '#5e8273', accent: '#b9e88f' },
  },
  {
    id: 'ivory',
    labelKey: 'theme.ivory',
    descriptionKey: 'theme.ivoryDescription',
    board: { lightSquare: '#f4efe2', darkSquare: '#9aad93', glassOpacity: 0.04, glassBlur: 2 },
    preview: { bg: '#f0eadf', surface: '#fbf7ef', light: '#f4efe2', dark: '#9aad93', accent: '#4f725c' },
  },
  {
    id: 'night',
    labelKey: 'theme.night',
    descriptionKey: 'theme.nightDescription',
    board: { lightSquare: '#9caec4', darkSquare: '#344b68', glassOpacity: 0.07, glassBlur: 3 },
    preview: { bg: '#0c1320', surface: '#141e2d', light: '#9caec4', dark: '#344b68', accent: '#b7d7ff' },
  },
] as const;

export function getVisualTheme(id: VisualThemeId): VisualTheme {
  return VISUAL_THEMES.find(theme => theme.id === id) ?? VISUAL_THEMES[0];
}

export function readVisualTheme(): VisualThemeId {
  try {
    const saved = localStorage.getItem(VISUAL_THEME_STORAGE_KEY);
    return VISUAL_THEMES.some(theme => theme.id === saved) ? saved as VisualThemeId : DEFAULT_VISUAL_THEME;
  } catch {
    return DEFAULT_VISUAL_THEME;
  }
}

export function applyVisualThemeToDocument(id: VisualThemeId) {
  document.documentElement.dataset.visualTheme = id;
}
