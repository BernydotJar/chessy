import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import type { BoardTheme } from '../types/chess.types';
import { ChessyIcon } from '../design/icons';
import { ThemeGallery } from '../design/ThemeGallery';

export function ThemeCustomizer({ compact = false }: { compact?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useGameStore();
  const [customTheme, setCustomTheme] = useState<BoardTheme>(theme);
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (isOpen) { setCustomTheme(theme); requestAnimationFrame(() => closeRef.current?.focus()); } }, [isOpen, theme]);

  const update = (key: keyof BoardTheme, value: string | number) => {
    const next = { ...customTheme, [key]: value };
    setCustomTheme(next);
    setTheme(next);
  };

  return <>
    <button type="button" className={`theme-launch ${compact ? 'theme-launch--compact' : ''}`} onClick={() => setIsOpen(true)} aria-label={t('theme.open')}>
      <ChessyIcon name="theme" size={compact ? 19 : 20}/>{!compact && <span>{t('theme.customize')}</span>}
    </button>
    {isOpen && <div className="theme-modal" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setIsOpen(false); }}>
      <section className="theme-panel" role="dialog" aria-modal="true" aria-labelledby="theme-title">
        <header className="theme-panel__header"><div><p className="eyebrow">Chessy UI Kit</p><h2 id="theme-title">{t('theme.title')}</h2><p>{t('theme.subtitle')}</p></div><button ref={closeRef} type="button" className="icon-button" onClick={() => setIsOpen(false)} aria-label={t('theme.close')}><ChessyIcon name="close" size={20}/></button></header>
        <ThemeGallery/>
        <details className="theme-advanced">
          <summary>{t('theme.advanced')}</summary>
          <p>{t('theme.advancedHint')}</p>
          <div className="theme-fields">
            <label><span>{t('theme.light')}</span><div><input type="color" value={customTheme.lightSquare} onChange={e => update('lightSquare', e.target.value)}/><input type="text" value={customTheme.lightSquare} onChange={e => update('lightSquare', e.target.value)} aria-label={t('theme.light')}/></div></label>
            <label><span>{t('theme.dark')}</span><div><input type="color" value={customTheme.darkSquare} onChange={e => update('darkSquare', e.target.value)}/><input type="text" value={customTheme.darkSquare} onChange={e => update('darkSquare', e.target.value)} aria-label={t('theme.dark')}/></div></label>
          </div>
          <div className="theme-board-preview" aria-label={t('theme.preview')}>{Array.from({ length: 64 }, (_, index) => <i key={index} style={{ background: (Math.floor(index / 8) + index % 8) % 2 === 0 ? customTheme.lightSquare : customTheme.darkSquare }}/>)}</div>
        </details>
      </section>
    </div>}
  </>;
}
