import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { Activity } from 'lucide-react';
import { StockfishService, MultiPVLine } from '../utils/stockfishService';
import { getExplorerLines } from '../utils/openingsExplorer';
import { Chess } from 'chess.js';

export const AnalysisView: React.FC = () => {
  const { t } = useTranslation();
  const { history, fen } = useGameStore();
  const [lines, setLines] = useState<MultiPVLine[]>([]);
  const [evalScore, setEvalScore] = useState<string>('0.00');
  const [loading, setLoading] = useState(false);

  const explorerMoves = useMemo(() => {
    const chess = new Chess();
    history.forEach((move) => {
      try {
        chess.move(move);
      } catch {
        // ignore invalid SAN in history
      }
    });
    const verbose = chess.history({ verbose: true }) as any[];
    const uciMoves = verbose.map((m) => `${m.from}${m.to}${m.promotion || ''}`);
    return getExplorerLines(uciMoves);
  }, [history]);

  useEffect(() => {
    let alive = true;
    const engine = new StockfishService();
    const run = async () => {
      setLoading(true);
      const result = await engine.evaluatePositionMultiPV(fen, 12, 2);
      if (!alive) return;
      setLines(result);
      const best = result[0];
      if (best?.mate) {
        setEvalScore(`#${best.mate}`);
      } else if (typeof best?.score === 'number') {
        setEvalScore((best.score / 100).toFixed(2));
      }
      setLoading(false);
      engine.terminate();
    };
    void run();
    return () => {
      alive = false;
      engine.terminate();
    };
  }, [fen]);

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
          <p className="text-white font-semibold">
            {loading ? t('analysis.loading') : evalScore}
          </p>
        </div>
      </div>

      <div className="glass-container rounded-lg p-4 space-y-2">
        <p className="text-white font-semibold">{t('analysis.lines')}</p>
        {lines.length === 0 && (
          <p className="text-white/60 text-sm">{t('analysis.noLines')}</p>
        )}
        {lines.map((line) => (
          <p key={line.multipv} className="text-white/70 text-sm">
            {t('analysis.line', { line: line.pv || '' })}
          </p>
        ))}
      </div>

      <div className="glass-container rounded-lg p-4 space-y-2">
        <p className="text-white font-semibold">{t('analysis.explorer')}</p>
        {explorerMoves.length === 0 ? (
          <p className="text-white/60 text-sm">{t('analysis.noExplorer')}</p>
        ) : (
          explorerMoves.map((entry) => (
            <div key={entry.move} className="flex items-center justify-between text-white/70 text-sm">
              <span>{entry.name || entry.move}</span>
              <span>{entry.white}% / {entry.draw}% / {entry.black}%</span>
            </div>
          ))
        )}
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
