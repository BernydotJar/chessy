import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLASSIC_THEMES, COUNTRY_THEMES, DEFAULT_VISUAL_THEME, PREMIUM_THEMES, VISUAL_THEMES, canApplyVisualTheme, getVisualTheme, readVisualTheme, VISUAL_THEME_STORAGE_KEY } from '../src/design/themes';
import es from '../src/locales/es/translation.json';
import en from '../src/locales/en/translation.json';
import pt from '../src/locales/pt/translation.json';

afterEach(() => vi.unstubAllGlobals());

describe('Chessy visual theme catalog', () => {
  it('preserves every previously published country/classic theme and adds distinct premium designs', () => {
    expect(CLASSIC_THEMES.map(theme => theme.id)).toEqual(['forest', 'ivory', 'night']);
    expect(COUNTRY_THEMES.map(theme => theme.id)).toEqual([
      'guatemala', 'colombia', 'mexico', 'brasil', 'usa', 'argentina', 'espana', 'chile',
      'peru', 'costarica', 'japon',
    ]);
    expect(PREMIUM_THEMES.map(theme => theme.id)).toEqual(['obsidian', 'porcelain', 'midnight', 'walnut']);
    expect(VISUAL_THEMES).toHaveLength(18);
    expect(new Set(VISUAL_THEMES.map(theme => theme.id)).size).toBe(18);
  });

  it('defines complete, offline-first board, preview, identity and chrome tokens with ES/EN/PT copy', () => {
    for (const theme of VISUAL_THEMES) {
      expect(theme.labelKey).toMatch(/^theme\./);
      expect(theme.descriptionKey).toMatch(/^theme\./);
      expect(theme.moodKey).toMatch(/^theme\./);
      expect(theme.signature).toHaveLength(3);
      expect(theme.board.lightSquare).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.board.darkSquare).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.tokens.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.tokens.text).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.tokens.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.tokens.heroArt).toMatch(/^url\('\/art\/[a-z-]+\.svg'\)$/);
      for (const locale of [es, en, pt]) {
        for (const key of [theme.labelKey, theme.descriptionKey, theme.moodKey]) {
          expect(locale.theme[key.replace('theme.', '') as keyof typeof locale.theme]).toBeTruthy();
        }
      }
    }
  });

  it('does not grant premium access based on a saved preference alone', () => {
    vi.stubGlobal('localStorage', { getItem: (key: string) => key === VISUAL_THEME_STORAGE_KEY ? 'obsidian' : null });
    expect(readVisualTheme()).toBe('forest');
    expect(readVisualTheme(false)).toBe('forest');
    expect(readVisualTheme(true)).toBe('obsidian');
    expect(canApplyVisualTheme('obsidian', false)).toBe(false);
    expect(canApplyVisualTheme('obsidian', true)).toBe(true);
    expect(canApplyVisualTheme('guatemala', false)).toBe(true);
    expect(canApplyVisualTheme('unknown' as never, true)).toBe(false);
  });

  it('preserves Forest as safe fallback for corrupt values', () => {
    expect(DEFAULT_VISUAL_THEME).toBe('forest');
    expect(getVisualTheme('not-a-theme' as never).id).toBe('forest');
    vi.stubGlobal('localStorage', { getItem: () => 'impossible-theme' });
    expect(readVisualTheme(true)).toBe('forest');
  });
});
