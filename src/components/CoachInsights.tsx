import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { getCoachInsightWithEval } from '../utils/coach';

export const CoachInsights: React.FC = () => {
  const { chess, fen } = useGameStore();
  const { t } = useTranslation();
  const [insight, setInsight] = useState<Awaited<ReturnType<typeof getCoachInsightWithEval>> | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [mode, setMode] = useState<'off' | 'on' | 'paused'>('off');
  const [perspective, setPerspective] = useState<'white' | 'black'>('white');
  const requestId = useRef(0);

  useEffect(() => {
    if (mode === 'on') {
      void runInsight();
    }
  }, [fen, mode]);

  const runInsight = async () => {
    const id = ++requestId.current;
    setStatus('running');
    const result = await getCoachInsightWithEval(chess);
    if (requestId.current !== id) return;
    setInsight(result);
    setStatus('done');
  };

  const handleToggle = () => {
    if (mode === 'off') {
      setMode('on');
      void runInsight();
      return;
    }
    if (mode === 'on') {
      setMode('paused');
      setStatus('done');
      return;
    }
    setMode('on');
    void runInsight();
  };

  const buttonClass = mode === 'on'
    ? 'coach-action coach-action--active'
    : mode === 'paused'
    ? 'coach-action coach-action--done'
    : 'coach-action';

  const formatDelta = (delta?: number) => {
    if (typeof delta !== 'number') return '';
    const pawn = delta / 100;
    const sign = pawn >= 0 ? '+' : '';
    return `${sign}${pawn.toFixed(2)}`;
  };

  const mover = insight?.lastMoveColor === 'w' ? 'white' : insight?.lastMoveColor === 'b' ? 'black' : null;
  const isOpponentMove = mover && mover !== perspective;

  const resolveEvaluationKey = () => {
    if (!insight?.evaluation) return null;
    const key = insight.evaluation.labelKey;
    if (!isOpponentMove) return key;
    const map: Record<string, string> = {
      'coach.evaluation.good': 'coach.evaluation.opponentGood',
      'coach.evaluation.inaccuracy': 'coach.evaluation.opponentInaccuracy',
      'coach.evaluation.mistake': 'coach.evaluation.opponentMistake',
      'coach.evaluation.blunder': 'coach.evaluation.opponentBlunder',
    };
    return map[key] || key;
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4 mt-6">
      <div className="flex items-center gap-2 text-white font-semibold text-lg">
        <Lightbulb size={22} />
        <span>{t('coach.title')}</span>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleToggle}
          disabled={status === 'running'}
          className={`glass-button w-full px-4 py-3 rounded-lg text-white font-semibold hover:scale-105 transition-transform ${buttonClass}`}
        >
          {mode === 'on' ? t('coach.actions.pause') : mode === 'paused' ? t('coach.actions.resume') : t('coach.actions.start')}
        </button>

        <div className="coach-toggle">
          <button
            onClick={() => setPerspective('white')}
            className={`coach-toggle__btn ${perspective === 'white' ? 'coach-toggle__btn--active' : ''}`}
          >
            {t('colors.white')}
          </button>
          <button
            onClick={() => setPerspective('black')}
            className={`coach-toggle__btn ${perspective === 'black' ? 'coach-toggle__btn--active' : ''}`}
          >
            {t('colors.black')}
          </button>
        </div>
      </div>

      {!insight && (
        <p className="text-white/60 text-sm text-center">
          {t('coach.noMoves')}
        </p>
      )}

      {insight && (
        <div className="space-y-3 text-white/80 text-sm">
          <div className="glass-container rounded-lg p-3">
            <p className="text-white font-semibold">{t('coach.mentor.title')}</p>
            <p className="text-white/80 mt-1">
              {t('coach.mentor.line', {
                opening: insight.openingKey ? t(`openings.${insight.openingKey}.name`) : '',
                principle: t(insight.principleKey, {
                  piece: t((insight.principleParams?.pieceKey || 'pieces.pawn') as string),
                }),
                evaluation: insight.evaluation ? t(resolveEvaluationKey() || insight.evaluation.labelKey, insight.evaluation.labelParams) : t('coach.evaluation.good'),
              })}
            </p>
            <p className="text-white/50 mt-2 text-xs">
              {t('coach.perspective', { side: t(`colors.${perspective}`) })}{mover ? ` · ${t('coach.lastMove', { side: t(`colors.${mover}`) })}` : ''}
            </p>
          </div>

          {insight.openingKey && (
            <div className="glass-container rounded-lg p-3">
              <p className="text-white font-semibold">
                {t('coach.opening', { name: t(`openings.${insight.openingKey}.name`) })}
              </p>
              {!!t(`openings.${insight.openingKey}.note`, { defaultValue: '' }) && (
                <p className="text-white/70 mt-1">
                  {t(`openings.${insight.openingKey}.note`)}
                </p>
              )}
              {!!t(`openings.${insight.openingKey}.history`, { defaultValue: '' }) && (
                <p className="text-white/50 mt-2 text-xs">
                  {t(`openings.${insight.openingKey}.history`)}
                </p>
              )}
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

          {insight.evaluation && (
            <div className="glass-container rounded-lg p-3">
              <p className="text-white font-semibold">{t('coach.evaluation.title')}</p>
              <p className="text-white/70 mt-1">
                {t(resolveEvaluationKey() || insight.evaluation.labelKey, insight.evaluation.labelParams)}
              </p>
              {typeof insight.evaluation.delta === 'number' && (
                <p className="text-white/50 mt-1 text-xs">
                  {t('coach.evaluation.delta', { delta: formatDelta(insight.evaluation.delta) })}
                </p>
              )}
            </div>
          )}

          {insight.tips && insight.tips.length > 0 && (
            <div className="glass-container rounded-lg p-3">
              <p className="text-white font-semibold">{t('coach.tips.title')}</p>
              <p className="text-white/70 mt-1">
                {t(insight.tips[0].key)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
