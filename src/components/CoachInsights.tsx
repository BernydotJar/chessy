import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { getCoachInsight } from '../utils/coach';

export const CoachInsights: React.FC = () => {
  const { chess } = useGameStore();
  const { t } = useTranslation();
  const [insight, setInsight] = useState<ReturnType<typeof getCoachInsight> | null>(null);

  const handleInsight = () => {
    const result = getCoachInsight(chess);
    setInsight(result);
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4 mt-6">
      <div className="flex items-center gap-2 text-white font-semibold text-lg">
        <Lightbulb size={22} />
        <span>{t('coach.title')}</span>
      </div>

      <button
        onClick={handleInsight}
        className="glass-button w-full px-4 py-3 rounded-lg text-white font-semibold hover:scale-105 transition-transform"
      >
        {t('coach.getInsight')}
      </button>

      {!insight && (
        <p className="text-white/60 text-sm text-center">
          {t('coach.noMoves')}
        </p>
      )}

      {insight && (
        <div className="space-y-3 text-white/80 text-sm">
          {insight.openingKey && (
            <div className="glass-container rounded-lg p-3">
              <p className="text-white font-semibold">
                {t('coach.opening', { name: t(`openings.${insight.openingKey}.name`) })}
              </p>
              <p className="text-white/70 mt-1">
                {t(`openings.${insight.openingKey}.note`)}
              </p>
            </div>
          )}

          <div className="glass-container rounded-lg p-3">
            <p className="text-white font-semibold">{t('coach.principle')}</p>
            <p className="text-white/70 mt-1">
              {t(insight.principleKey, {
                piece: t((insight.principleParams?.pieceKey || 'pieces.pawn') as string),
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
