import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ChessyIcon } from './icons';
import { useVisualTheme } from './theme-context';
import { getVisualTheme, VISUAL_THEMES, type VisualTheme, type VisualThemeId } from './themes';

export function ThemePreview({ theme, large = false }: { theme: VisualTheme; large?: boolean }) {
  const style = {
    '--theme-preview-bg': theme.preview.bg,
    '--theme-preview-surface': theme.preview.surface,
    '--theme-preview-accent': theme.preview.accent,
    background: theme.preview.bg,
  } as CSSProperties;
  return <span className={`theme-preview ${large ? 'theme-preview--large' : ''}`} style={style}>
    <span className="theme-preview__art" aria-hidden="true" style={{ backgroundImage: theme.tokens.heroArt }} />
    <span className="theme-preview__chrome" style={{ background: theme.preview.surface }} />
    <span className="theme-preview__board" aria-hidden="true">
      {Array.from({ length: 16 }, (_, index) => <i key={index} style={{ background: (Math.floor(index / 4) + index % 4) % 2 === 0 ? theme.preview.light : theme.preview.dark }} />)}
    </span>
    <span className="theme-preview__accent" style={{ background: theme.preview.accent }} />
  </span>;
}

export function ThemeCard({ theme, compact = false, onSelect }: { theme: VisualTheme; compact?: boolean; onSelect?: (theme: VisualThemeId) => void }) {
  const { t } = useTranslation();
  const { themeId, setThemeId } = useVisualTheme();
  const selected = theme.id === themeId;
  return <button
    type="button"
    data-theme-card={theme.id}
    className={`theme-card ${selected ? 'is-selected' : ''}`}
    aria-pressed={selected}
    onClick={() => { setThemeId(theme.id); onSelect?.(theme.id); }}
  >
    <ThemePreview theme={theme}/>
    <span className="theme-card__copy"><strong>{t(theme.labelKey)}</strong>{!compact && <small>{t(theme.descriptionKey)}</small>}</span>
    <span className="theme-card__state"><ChessyIcon name={selected ? 'check' : 'theme'} size={16}/></span>
  </button>;
}

export function ThemeGallery({ compact = false, onSelect, themes = VISUAL_THEMES }: { compact?: boolean; onSelect?: (theme: VisualThemeId) => void; themes?: readonly VisualTheme[] }) {
  return <div className={`theme-gallery ${compact ? 'theme-gallery--compact' : ''}`}>
    {themes.map(theme => <ThemeCard key={theme.id} theme={theme} compact={compact} onSelect={onSelect}/>)}
  </div>;
}

export function CurrentThemeSummary({ href = '#/themes' }: { href?: string }) {
  const { t } = useTranslation();
  const { themeId } = useVisualTheme();
  const theme = getVisualTheme(themeId);
  return <div className="current-theme-summary" data-current-theme={theme.id}>
    <ThemePreview theme={theme}/>
    <div className="current-theme-summary__copy">
      <span>{t('settings.currentTheme')}</span>
      <strong>{t(theme.labelKey)}</strong>
      <small>{t(theme.moodKey)}</small>
    </div>
    <a className="btn secondary current-theme-summary__action" href={href}>{t('settings.exploreThemes')}<ChessyIcon name="arrow" size={16}/></a>
  </div>;
}
