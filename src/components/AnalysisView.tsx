import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { Activity } from 'lucide-react';

export const AnalysisView: React.FC = () => {
  const { t } = useTranslation();
  const { history } = useGameStore();

  const lines = [
    t('analysis.line', { line: history.slice(-6).join(' ') || 'e4 e5 Nf3 Nc6' }),
    t('analysis.line', { line: 'd4 d5 c4 e6 Nc3 Nf6' }),
  ];

  return (
    <div className="glass-card rounded-xl p-6 space-y-5">
      <div>
        <h3 className="text-white font-semibold text-lg">{t('analysis.title')}</h3>
        <p className="text-white/60 text-sm">{t('analysis.subtitle')}</p>
      </div>

      <div className="glass-container rounded-lg p-4 flex items-center gap-3">
        <Activity size={18} className="text-emerald-300" />
        <div>
          <p className="text-white/70 text-xs">{t('analysis.eval')}</p>
          <p className="text-white font-semibold">+0.35</p>
        </div>
      </div>

      <div className="glass-container rounded-lg p-4 space-y-2">
        <p className="text-white font-semibold">{t('analysis.lines')}</p>
        {lines.map((line, idx) => (
          <p key={idx} className="text-white/70 text-sm">{line}</p>
        ))}
      </div>

      <div className="glass-container rounded-lg p-4">
        <p className="text-white font-semibold">{t('analysis.commentary')}</p>
        <textarea
          className="glass-input w-full mt-2 px-3 py-2 rounded-lg text-white text-sm"
          rows={3}
          placeholder={t('analysis.addNote')}
        />
      </div>
    </div>
  );
};
