import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { Trophy, AlertTriangle, Sparkles } from 'lucide-react';

export const ReviewView: React.FC = () => {
  const { t } = useTranslation();
  const { history } = useGameStore();

  const sampleMoments = history.slice(-6).reverse().map((move, index) => ({
    id: `${move}-${index}`,
    move,
    note: t('review.moment', { move }),
  }));

  return (
    <div className="glass-card rounded-xl p-6 space-y-6">
      <div>
        <h3 className="text-white font-semibold text-lg">{t('review.title')}</h3>
        <p className="text-white/60 text-sm">{t('review.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-container rounded-lg p-4">
          <p className="text-white/60 text-xs">{t('review.accuracy')}</p>
          <p className="text-white text-2xl font-semibold">82%</p>
        </div>
        <div className="glass-container rounded-lg p-4">
          <p className="text-white/60 text-xs">{t('review.bestMoves')}</p>
          <p className="text-white text-2xl font-semibold">12</p>
        </div>
        <div className="glass-container rounded-lg p-4">
          <p className="text-white/60 text-xs">{t('review.blunders')}</p>
          <p className="text-white text-2xl font-semibold">1</p>
        </div>
      </div>

      <div className="glass-container rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Sparkles size={18} />
          <span>{t('review.coachSummary')}</span>
        </div>
        <p className="text-white/70 text-sm">{t('review.coachLine')}</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-white font-semibold">
          <AlertTriangle size={18} />
          <span>{t('review.critical')}</span>
        </div>
        {sampleMoments.length === 0 ? (
          <p className="text-white/60 text-sm">{t('review.noMoments')}</p>
        ) : (
          sampleMoments.map((moment) => (
            <div key={moment.id} className="glass-container rounded-lg p-3 text-white/80 text-sm">
              <span className="font-semibold mr-2">{moment.move}</span>
              {moment.note}
            </div>
          ))
        )}
      </div>

      <div className="glass-container rounded-lg p-4 text-white/70 text-sm flex items-center gap-2">
        <Trophy size={18} />
        <span>{t('review.nextStep')}</span>
      </div>
    </div>
  );
};
