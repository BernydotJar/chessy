import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalyticsStore } from '../../analytics/store';
import { ChessyIcon } from '../../design/icons';
import { ChessyMark } from '../../design/ChessyMark';
import { ThemePreview } from '../../design/ThemeGallery';
import { useVisualTheme } from '../../design/theme-context';
import { CLASSIC_THEMES, COUNTRY_THEMES, getVisualTheme, type VisualTheme } from '../../design/themes';
import { SectionHeading } from './Shared';

function Signature({ colors }: { colors: readonly [string, string, string] }) {
  return <span className="atlas-signature" aria-hidden="true">{colors.map(color => <i key={color} style={{ background: color }}/>)}</span>;
}

function AtlasThemeCard({ theme, onSelect }: { theme: VisualTheme; onSelect: (theme: VisualTheme) => void }) {
  const { t } = useTranslation();
  const { themeId } = useVisualTheme();
  const selected = theme.id === themeId;
  const style = {
    '--atlas-card-bg': theme.preview.bg,
    '--atlas-card-surface': theme.preview.surface,
    '--atlas-card-accent': theme.preview.accent,
  } as CSSProperties;
  return <button type="button" className={`atlas-card ${selected ? 'is-selected' : ''}`} data-atlas-theme={theme.id} style={style} aria-pressed={selected} onClick={() => onSelect(theme)}>
    <span className="atlas-card__visual">
      <span className="atlas-card__landscape" aria-hidden="true" style={{ backgroundImage: theme.tokens.heroArt }}/>
      {theme.countryCode && <span className="atlas-card__country-code">{theme.countryCode}</span>}
      <ThemePreview theme={theme} large/>
    </span>
    <span className="atlas-card__body">
      <span className="atlas-card__topline"><span>{theme.collection === 'country' ? t('themes.atlasLabel') : t('themes.classicLabel')}</span><Signature colors={theme.signature}/></span>
      <strong>{t(theme.labelKey)}</strong>
      <small>{t(theme.moodKey)}</small>
      <span className="atlas-card__footer"><span>{selected ? t('themes.applied') : t('themes.apply')}</span><ChessyIcon name={selected ? 'check' : 'arrow'} size={16}/></span>
    </span>
  </button>;
}

export function ThemesView() {
  const { t } = useTranslation();
  const { themeId, setThemeId } = useVisualTheme();
  const track = useAnalyticsStore(state => state.track);
  const current = getVisualTheme(themeId);
  const select = (theme: VisualTheme) => {
    setThemeId(theme.id);
    track('settings_changed', { setting: 'theme', value: theme.id });
  };

  return <div className="view-enter themes-view">
    <a className="themes-back" href="#/settings"><ChessyIcon name="arrow" size={16}/>{t('themes.backToSettings')}</a>
    <div className="themes-hero">
      <div>
        <SectionHeading eyebrow={t('themes.eyebrow')} title={t('themes.title')} subtitle={t('themes.subtitle')}/>
        <div className="themes-principles" aria-label={t('themes.principlesLabel')}>
          <span><ChessyIcon name="target" size={16}/>{t('themes.boardFirst')}</span>
          <span><ChessyIcon name="shield" size={16}/>{t('themes.offline')}</span>
          <span><ChessyIcon name="spark" size={16}/>{t('themes.noNovelty')}</span>
        </div>
      </div>
      <aside className="current-theme-hero" aria-label={t('themes.current')}>
        <div className="current-theme-hero__mark"><ChessyMark size={24}/><span>{t('themes.current')}</span></div>
        <ThemePreview theme={current} large/>
        <div className="current-theme-hero__copy"><strong>{t(current.labelKey)}</strong><span>{t(current.moodKey)}</span></div>
      </aside>
    </div>

    <section className="theme-collection" aria-labelledby="themes-classics-title">
      <header className="theme-collection__heading"><div><p className="eyebrow">01 · CHESSY</p><h2 id="themes-classics-title">{t('themes.classicsTitle')}</h2><p>{t('themes.classicsHint')}</p></div><span className="theme-count">{CLASSIC_THEMES.length}</span></header>
      <div className="atlas-grid atlas-grid--classics">{CLASSIC_THEMES.map(theme => <AtlasThemeCard key={theme.id} theme={theme} onSelect={select}/>)}</div>
    </section>

    <section className="theme-collection theme-collection--atlas" aria-labelledby="themes-atlas-title">
      <header className="theme-collection__heading"><div><p className="eyebrow">02 · ATLAS</p><h2 id="themes-atlas-title">{t('themes.atlasTitle')}</h2><p>{t('themes.atlasHint')}</p></div><span className="theme-count">{COUNTRY_THEMES.length}</span></header>
      <div className="atlas-grid">{COUNTRY_THEMES.map(theme => <AtlasThemeCard key={theme.id} theme={theme} onSelect={select}/>)}</div>
    </section>

    <footer className="themes-note"><ChessyIcon name="theme" size={18}/><div><strong>{t('themes.noteTitle')}</strong><p>{t('themes.note')}</p></div></footer>
  </div>;
}
