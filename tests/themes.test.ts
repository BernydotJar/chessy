import { describe, expect, it } from 'vitest';
import { CLASSIC_THEMES, COUNTRY_THEMES, DEFAULT_VISUAL_THEME, VISUAL_THEMES, getVisualTheme } from '../src/design/themes';

describe('Chessy visual theme catalog', () => {
  it('keeps the three classics and restores eight premium country themes', () => {
    expect(CLASSIC_THEMES.map(theme => theme.id)).toEqual(['forest', 'ivory', 'night']);
    expect(COUNTRY_THEMES.map(theme => theme.id)).toEqual(['guatemala', 'colombia', 'mexico', 'brasil', 'usa', 'argentina', 'espana', 'chile']);
    expect(VISUAL_THEMES).toHaveLength(11);
    expect(new Set(VISUAL_THEMES.map(theme => theme.id)).size).toBe(11);
  });

  it('defines complete board, preview, identity and chrome tokens for every theme', () => {
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
    }
  });

  it('preserves Forest as the safe fallback', () => {
    expect(DEFAULT_VISUAL_THEME).toBe('forest');
    expect(getVisualTheme('forest').id).toBe('forest');
    expect(getVisualTheme('not-a-theme' as never).id).toBe('forest');
  });
});
