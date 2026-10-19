import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalyticsStore } from '../../analytics/store';
import { ChessyIcon } from '../../design/icons';
import { ChessyMark } from '../../design/ChessyMark';
import { ThemePreview } from '../../design/ThemeGallery';
import { useVisualTheme } from '../../design/theme-context';
import { CLASSIC_THEMES, COUNTRY_THEMES, PREMIUM_THEMES, getVisualTheme, type VisualTheme } from '../../design/themes';
import { SectionHeading } from './Shared';

function Signature({ colors }: { colors: readonly [string, string, string] }) {
  return <span className="atlas-signature" aria-hidden="true">{colors.map(color => <i key={color} style={{ background: color }}/>)}</span>;
}

// A real board sample makes piece/square legibility inspectable before applying.
const SAMPLE_PIECES: Record<number, string> = {
  0: '♜', 2: '♝', 3: '♛', 4: '♚', 6: '♞', 7: '♜',
  9: '♟', 11: '♟', 12: '♟', 14: '♟',
  28: '♟', 35: '♙', 37: '♘',
  48: '♙', 49: '♙', 51: '♙', 53: '♙', 54: '♙',
  56: '♖', 58: '♗', 59: '♕', 60: '♔', 63: '♖',
};

function BoardSample({ theme }: { theme: VisualTheme }) {
  const { t } = useTranslation();
  return <div className="theme-board-sample" role="img" aria-label={t('themes.boardPreview')}>
    {Array.from({ length: 64 }, (_, index) => {
      const light = (Math.floor(index / 8) + index % 8) % 2 === 0;
      const piece = SAMPLE_PIECES[index];
      return <span key={index} className={piece ? index < 32 ? 'theme-board-sample__black' : 'theme-board-sample__white' : undefined} style={{ background: light ? theme.board.lightSquare : theme.board.darkSquare }}>{piece}</span>;
    })}
  </div>;
}

function AtlasThemeCard({ theme, onPreview }: { theme: VisualTheme; onPreview: (theme: VisualTheme) => void }) {
  const { t } = useTranslation();
  const { themeId, hasPremiumAccess } = useVisualTheme();
  const selected = theme.id === themeId;
  const premium = theme.collection === 'premium';
  const locked = premium && !hasPremiumAccess;
  const style = {
    '--atlas-card-bg': theme.preview.bg,
    '--atlas-card-surface': theme.preview.surface,
    '--atlas-card-accent': theme.preview.accent,
  } as CSSProperties;
  return <button type="button" className={`atlas-card ${selected ? 'is-selected' : ''} ${premium ? 'atlas-card--premium' : ''}`} data-atlas-theme={theme.id} style={style} aria-haspopup="dialog" aria-label={t('themes.previewTheme', { name: t(theme.labelKey) })} onClick={() => onPreview(theme)}>
    <span className="atlas-card__visual">
      <span className="atlas-card__landscape" aria-hidden="true" style={{ backgroundImage: theme.tokens.heroArt }}/>
      {theme.countryCode && <span className="atlas-card__country-code">{theme.countryCode}</span>}
      {premium && <span className="atlas-card__premium-stamp"><ChessyIcon name="spark" size={12}/>{t('themes.premiumLabel')}</span>}
      <ThemePreview theme={theme} large/>
    </span>
    <span className="atlas-card__body">
      <span className="atlas-card__topline"><span>{t(premium ? 'themes.premiumLabel' : theme.collection === 'country' ? 'themes.atlasLabel' : 'themes.classicLabel')}</span><Signature colors={theme.signature}/></span>
      <strong>{t(theme.labelKey)}</strong>
      <small>{t(theme.moodKey)}</small>
      <span className="atlas-card__footer"><span>{selected ? t('themes.applied') : locked ? t('themes.previewOnly') : t('themes.preview')}</span><ChessyIcon name={selected ? 'check' : locked ? 'shield' : 'arrow'} size={16}/></span>
    </span>
  </button>;
}

export function ThemesView() {
  const { t } = useTranslation();
  const { themeId, setThemeId, hasPremiumAccess } = useVisualTheme();
  const track = useAnalyticsStore(state => state.track);
  const current = getVisualTheme(themeId);
  const [preview, setPreview] = useState<VisualTheme | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const canApply = !!preview && (preview.collection !== 'premium' || hasPremiumAccess);

  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    if (preview && !modal.open) modal.showModal();
    else if (!preview && modal.open) modal.close();
  }, [preview]);

  const selectPreview = () => {
    if (!preview || !canApply || !setThemeId(preview.id)) return;
    track('settings_changed', { setting: 'theme', value: preview.id });
    setPreview(null);
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
      <div className="atlas-grid atlas-grid--classics">{CLASSIC_THEMES.map(theme => <AtlasThemeCard key={theme.id} theme={theme} onPreview={setPreview}/>)}</div>
    </section>

    <section className="theme-collection theme-collection--atlas" aria-labelledby="themes-atlas-title">
      <header className="theme-collection__heading"><div><p className="eyebrow">02 · ATLAS</p><h2 id="themes-atlas-title">{t('themes.atlasTitle')}</h2><p>{t('themes.atlasHint')}</p></div><span className="theme-count">{COUNTRY_THEMES.length}</span></header>
      <div className="atlas-grid">{COUNTRY_THEMES.map(theme => <AtlasThemeCard key={theme.id} theme={theme} onPreview={setPreview}/>)}</div>
    </section>

    <section className="theme-collection theme-collection--premium" aria-labelledby="themes-premium-title">
      <header className="theme-collection__heading"><div><p className="eyebrow">03 · STUDIO</p><h2 id="themes-premium-title">{t('themes.premiumTitle')}</h2><p>{t('themes.premiumHint')}</p></div><span className="theme-count">{PREMIUM_THEMES.length}</span></header>
      <div className="atlas-grid">{PREMIUM_THEMES.map(theme => <AtlasThemeCard key={theme.id} theme={theme} onPreview={setPreview}/>)}</div>
    </section>

    <footer className="themes-note"><ChessyIcon name="theme" size={18}/><div><strong>{t('themes.noteTitle')}</strong><p>{t('themes.note')}</p></div></footer>

    <dialog ref={dialog} className="theme-preview-dialog" aria-labelledby="theme-preview-title" aria-describedby="theme-preview-description" onClose={() => setPreview(null)}>
      {preview && <div className="theme-preview-dialog__inside">
        <div className="theme-preview-dialog__header">
          <span className="eyebrow">{t(preview.collection === 'premium' ? 'themes.premiumLabel' : 'themes.preview')}</span>
          <button type="button" className="theme-preview-dialog__close icon-button" aria-label={t('themes.closePreview')} onClick={() => setPreview(null)}><ChessyIcon name="close" size={20}/></button>
        </div>
        <div className="theme-preview-dialog__content">
          <div className="theme-preview-dialog__visual" style={{ background: preview.preview.bg }}>
            <div className="theme-preview-dialog__landscape" style={{ backgroundImage: preview.tokens.heroArt }} aria-hidden="true"/>
            <BoardSample theme={preview}/>
          </div>
          <div className="theme-preview-dialog__details">
            <h2 id="theme-preview-title">{t(preview.labelKey)}</h2>
            <p id="theme-preview-description">{t(preview.descriptionKey)}</p>
            <Signature colors={preview.signature}/>
            <p className="theme-preview-dialog__mood">{t(preview.moodKey)}</p>
            {!canApply && <p className="theme-preview-dialog__access" role="status"><ChessyIcon name="shield" size={18}/>{t('themes.premiumAccessHint')}</p>}
          </div>
        </div>
        <div className="theme-preview-dialog__actions">
          <button type="button" className="btn secondary" onClick={() => setPreview(null)}>{t('themes.closePreview')}</button>
          <button type="button" className="btn primary" disabled={!canApply} onClick={selectPreview}>{preview.id === themeId ? t('themes.applied') : canApply ? t('themes.apply') : t('themes.locked')}</button>
        </div>
      </div>}
    </dialog>
  </div>;
}
