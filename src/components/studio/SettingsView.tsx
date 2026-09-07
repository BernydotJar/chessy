import { useTranslation } from 'react-i18next';
import { ChessyIcon } from '../../design/icons';
import { ThemeGallery } from '../../design/ThemeGallery';
import { ThemeCustomizer } from '../ThemeCustomizer';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useGameStore } from '../../store/gameStore';
import { useAnalyticsStore } from '../../analytics/store';
import { SectionHeading } from './Shared';

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`settings-switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}><span /></button>;
}

export function SettingsView() {
  const { t } = useTranslation();
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const setSoundEnabled = useGameStore((state) => state.setSoundEnabled);
  const showLegalMoves = useGameStore((state) => state.showLegalMoves);
  const setShowLegalMoves = useGameStore((state) => state.setShowLegalMoves);
  const analyticsEnabled = useAnalyticsStore((state) => state.enabled);
  const analyticsStatus = useAnalyticsStore((state) => state.status);
  const setAnalyticsEnabled = useAnalyticsStore((state) => state.setEnabled);
  const track = useAnalyticsStore((state) => state.track);

  const changeSetting = (setting: 'sound' | 'legal_moves', value: boolean, apply: (value: boolean) => void) => {
    apply(value);
    track('settings_changed', { setting, value });
  };

  return <div className="view-enter settings-view">
    <SectionHeading eyebrow={t('settings.eyebrow')} title={t('settings.title')} subtitle={t('settings.subtitle')}/>
    <div className="settings-grid">
      <section className="panel settings-section settings-appearance" aria-labelledby="settings-appearance-title">
        <div className="settings-section-heading"><span className="icon-tile small"><ChessyIcon name="theme" size={19}/></span><div><h2 id="settings-appearance-title">{t('settings.appearance')}</h2><p>{t('settings.appearanceHint')}</p></div></div>
        <ThemeGallery onSelect={(theme) => track('settings_changed', { setting: 'theme', value: theme })}/>
        <div className="setting-row setting-row--action"><div><strong>{t('settings.boardAdvanced')}</strong><span>{t('settings.boardAdvancedHint')}</span></div><ThemeCustomizer includePresets={false}/></div>
      </section>

      <section className="panel settings-section" aria-labelledby="settings-game-title">
        <div className="settings-section-heading"><span className="icon-tile small"><ChessyIcon name="settings" size={19}/></span><div><h2 id="settings-game-title">{t('settings.game')}</h2><p>{t('settings.gameHint')}</p></div></div>
        <div className="setting-row"><div><strong>{t('settings.language')}</strong><span>{t('settings.languageHint')}</span></div><LanguageSwitcher onLanguageChange={(language) => track('settings_changed', { setting: 'language', value: language })}/></div>
        <div className="setting-row"><div><strong>{t('settings.sound')}</strong><span>{t('settings.soundHint')}</span></div><Switch checked={soundEnabled} label={t('settings.sound')} onChange={(value) => changeSetting('sound', value, setSoundEnabled)}/></div>
        <div className="setting-row"><div><strong>{t('settings.legalMoves')}</strong><span>{t('settings.legalMovesHint')}</span></div><Switch checked={showLegalMoves} label={t('settings.legalMoves')} onChange={(value) => changeSetting('legal_moves', value, setShowLegalMoves)}/></div>
      </section>

      <section className="panel settings-section settings-privacy" aria-labelledby="settings-privacy-title">
        <div className="settings-section-heading"><span className="icon-tile small"><ChessyIcon name="shield" size={19}/></span><div><h2 id="settings-privacy-title">{t('settings.privacy')}</h2><p>{t('settings.privacyHint')}</p></div></div>
        <div className="setting-row analytics-consent-row"><div><strong>{t('settings.analytics')}</strong><span>{t('settings.analyticsHint')}</span><small>{t('settings.analyticsNever')}</small></div><Switch checked={analyticsEnabled} label={t('settings.analytics')} onChange={(value) => { void setAnalyticsEnabled(value); }}/></div>
        <div className={`analytics-state analytics-state--${analyticsStatus}`} role="status"><ChessyIcon name={analyticsStatus === 'ready' ? 'check' : analyticsStatus === 'unavailable' ? 'shield' : 'progress'} size={17}/><span>{t(`settings.analyticsStatus.${analyticsStatus}`)}</span></div>
        <p className="settings-privacy-note">{t('settings.analyticsPrivacy')}</p>
      </section>
    </div>
  </div>;
}
