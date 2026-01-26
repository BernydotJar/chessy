import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { CoachInsight, getCoachInsightWithEval } from '../utils/coach';

export const CoachInsights: React.FC = () => {
  const { chess, fen } = useGameStore();
  const { t } = useTranslation();
  const [insights, setInsights] = useState<CoachInsight[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [mode, setMode] = useState<'off' | 'on' | 'paused'>('off');
  const [perspective, setPerspective] = useState<'white' | 'black'>('white');
  const [expanded, setExpanded] = useState(false);
  const requestId = useRef(0);
  const maxVisible = 3;
  const maxStored = 12;

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
    if (result) {
      setInsights((prev) => {
        const next = [result, ...prev.filter((item) => item.fen !== result.fen)];
        return next.slice(0, maxStored);
      });
    }
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

  const resolveEvaluationKey = (entry: CoachInsight) => {
    if (!entry.evaluation) return null;
    const mover = entry.lastMoveColor === 'w' ? 'white' : entry.lastMoveColor === 'b' ? 'black' : null;
    const isOpponentMove = mover && mover !== perspective;
    const key = entry.evaluation.labelKey;
    if (!isOpponentMove) return key;
    const map: Record<string, string> = {
      'coach.evaluation.good': 'coach.evaluation.opponentGood',
      'coach.evaluation.inaccuracy': 'coach.evaluation.opponentInaccuracy',
      'coach.evaluation.mistake': 'coach.evaluation.opponentMistake',
      'coach.evaluation.blunder': 'coach.evaluation.opponentBlunder',
    };
    return map[key] || key;
  };

  const mentorOpeners = useMemo(() => {
    const raw = t('coach.mentor.openers', { returnObjects: true });
    return Array.isArray(raw) ? raw : [];
  }, [t]);

  const getMentorOpener = (entry: CoachInsight) => {
    if (mentorOpeners.length === 0) return '';
    const index = entry.ply ? (entry.ply - 1) % mentorOpeners.length : 0;
    return mentorOpeners[index];
  };

  const visibleInsights = useMemo(() => {
    const side = perspective === 'white' ? 'w' : 'b';
    return insights.filter((entry) => entry.lastMoveColor === side);
  }, [insights, perspective]);

  const displayedInsights = expanded ? visibleInsights : visibleInsights.slice(0, maxVisible);

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

      <p className="text-white/50 text-xs text-center">
        {t('coach.listTitle', {
          shown: expanded ? displayedInsights.length : Math.min(displayedInsights.length, maxVisible),
          total: visibleInsights.length,
          side: t(`colors.${perspective}`),
        })}
      </p>

      {visibleInsights.length === 0 && (
        <p className="text-white/60 text-sm text-center">
          {t('coach.listEmpty', { side: t(`colors.${perspective}`) })}
        </p>
      )}

      {visibleInsights.length > 0 && (
        <div className={`space-y-3 text-white/80 text-sm ${expanded ? 'max-h-96 overflow-y-auto glass-scrollbar pr-1' : ''}`}>
          {displayedInsights.map((entry) => {
          const opener = getMentorOpener(entry);
          const openingName = entry.openingKey ? t(`openings.${entry.openingKey}.name`) : '';
          const openingNote = entry.openingKey ? t(`openings.${entry.openingKey}.note`, { defaultValue: '' }) : '';
          const openingHistory = entry.openingKey ? t(`openings.${entry.openingKey}.history`, { defaultValue: '' }) : '';
          const principleText = t(entry.principleKey, {
            piece: t((entry.principleParams?.pieceKey || 'pieces.pawn') as string),
          });
          const evaluationText = entry.evaluation
            ? t(resolveEvaluationKey(entry) || entry.evaluation.labelKey, entry.evaluation.labelParams)
            : t('coach.evaluation.good');
          const mentorLine = [openingName, principleText, evaluationText].filter(Boolean).join(' · ');
          const sideKey = entry.lastMoveColor === 'w' ? 'white' : 'black';
          const suggestionIdea = entry.suggestedPrincipleKey
            ? t(`coach.principlesShort.${entry.suggestedPrincipleKey.replace('coach.principles.', '')}`)
            : '';
          return (
            <div key={`${entry.fen}-${entry.ply}`} className="glass-container rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>{t('coach.moveLabel', { move: entry.moveNumber, san: entry.san })}</span>
                <span className={`coach-chip coach-chip--${sideKey}`}>
                  {t(`colors.${sideKey}`)}
                </span>
              </div>
              <p className="text-white font-semibold">{t('coach.mentor.title')}</p>
              <p className="text-white/75 text-sm">
                {[opener, mentorLine].filter(Boolean).join(' ')}
              </p>
              <div className="text-white/60 text-xs space-y-1">
                {openingName && (
                  <p>{t('coach.openingShort', { name: openingName })}</p>
                )}
                {openingNote && (
                  <p>{t('coach.openingNote', { note: openingNote })}</p>
                )}
                {openingHistory && (
                  <p>{t('coach.openingHistory', { history: openingHistory })}</p>
                )}
                <p>{principleText}</p>
                {entry.evaluation && (
                  <p>
                    {t(resolveEvaluationKey(entry) || entry.evaluation.labelKey, entry.evaluation.labelParams)}
                    {typeof entry.evaluation.delta === 'number'
                      ? ` · ${t('coach.evaluation.delta', { delta: formatDelta(entry.evaluation.delta) })}`
                      : ''}
                  </p>
                )}
                {entry.suggestedSan && (
                  <p className="text-amber-200/80">
                    {t('coach.suggestion.line', { move: entry.suggestedSan })}
                    {suggestionIdea ? ` ${t('coach.suggestion.reason', { idea: suggestionIdea })}` : ''}
                  </p>
                )}
                {entry.tips && entry.tips.length > 0 && (
                  <p>{t('coach.tipShort', { tip: t(entry.tips[0].key) })}</p>
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}

      {visibleInsights.length > maxVisible && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="glass-button glass-button--subtle w-full px-3 py-2 rounded-lg text-white text-sm"
        >
          {expanded ? t('coach.actions.showLess') : t('coach.actions.showAll')}
        </button>
      )}
    </div>
  );
};
