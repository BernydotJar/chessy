import { useTranslation } from 'react-i18next';
import { ChessyIcon } from './icons';
import { useVisualTheme } from './theme-context';
import { VISUAL_THEMES } from './themes';

export function ThemeGallery({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { themeId, setThemeId } = useVisualTheme();
  return <div className={`theme-gallery ${compact ? 'theme-gallery--compact' : ''}`}>
    {VISUAL_THEMES.map(theme => {
      const selected = theme.id === themeId;
      return <button
        type="button"
        key={theme.id}
        className={`theme-card ${selected ? 'is-selected' : ''}`}
        aria-pressed={selected}
        onClick={() => setThemeId(theme.id)}
      >
        <span className="theme-preview" style={{ background: theme.preview.bg }}>
          <span className="theme-preview__chrome" style={{ background: theme.preview.surface }} />
          <span className="theme-preview__board" aria-hidden="true">
            {Array.from({ length: 16 }, (_, index) => <i key={index} style={{ background: (Math.floor(index / 4) + index % 4) % 2 === 0 ? theme.preview.light : theme.preview.dark }} />)}
          </span>
          <span className="theme-preview__accent" style={{ background: theme.preview.accent }} />
        </span>
        <span className="theme-card__copy"><strong>{t(theme.labelKey)}</strong>{!compact && <small>{t(theme.descriptionKey)}</small>}</span>
        <span className="theme-card__state"><ChessyIcon name={selected ? 'check' : 'theme'} size={16}/></span>
      </button>;
    })}
  </div>;
}
