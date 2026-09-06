import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChessyIcon } from '../design/icons';

const normalizeLanguage = (language: string | undefined) => {
  if (!language) return 'en';
  if (language.startsWith('es')) return 'es';
  if (language.startsWith('pt')) return 'pt';
  return 'en';
};

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const current = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  return <div className="glass-container rounded-lg px-3 py-2 inline-flex items-center gap-2 language-switcher">
    <ChessyIcon name="language" size={16}/><span className="text-white/70 text-xs">{t('language.label')}</span>
    <select value={current} onChange={e => i18n.changeLanguage(e.target.value)} className="glass-button text-white text-xs px-2 py-1 rounded-md bg-transparent" aria-label={t('language.label')}>
      <option value="en">{t('language.en')}</option><option value="es">{t('language.es')}</option><option value="pt">{t('language.pt')}</option>
    </select>
  </div>;
};
