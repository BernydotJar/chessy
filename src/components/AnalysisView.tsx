import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chess } from 'chess.js';
import { useGameStore } from '../store/gameStore';
import { ChessyIcon } from '../design/icons';
import { StockfishService, MultiPVLine } from '../utils/stockfishService';
import { getExplorerLines } from '../utils/openingsExplorer';
import { PositionBoard, SectionHeading } from './studio/Shared';

export const AnalysisView: React.FC = () => {
  const { t } = useTranslation();
  const { history, fen, analysisTarget, setView } = useGameStore();
  const analysisFen = analysisTarget?.fen ?? fen;
  const analysisHistory = analysisTarget ? history.slice(0, analysisTarget.ply) : history;
  const [lines, setLines] = useState<MultiPVLine[]>([]);
  const [evalScore, setEvalScore] = useState<string>('0.00');
  const [numericEval, setNumericEval] = useState(0);
  const [loading, setLoading] = useState(false);

  const explorerMoves = useMemo(() => {
    const chess = new Chess();
    analysisHistory.forEach((move) => { try { chess.move(move); } catch { /* ignore invalid SAN */ } });
    const verbose = chess.history({ verbose: true });
    return getExplorerLines(verbose.map(move => `${move.from}${move.to}${move.promotion || ''}`));
  }, [analysisHistory]);

  useEffect(() => {
    let alive = true;
    const engine = new StockfishService();
    const run = async () => {
      setLoading(true);
      const result = await engine.evaluatePositionMultiPV(analysisFen, 12, 2);
      if (!alive) return;
      setLines(result);
      const best = result[0];
      if (best?.mate) {
        const signedMate = best.mate * (analysisFen.split(' ')[1] === 'w' ? 1 : -1);
        setEvalScore(`#${signedMate}`);
        setNumericEval(signedMate > 0 ? 12 : -12);
      } else if (typeof best?.score === 'number') {
        const score = best.score * (analysisFen.split(' ')[1] === 'w' ? 1 : -1) / 100;
        setEvalScore(score.toFixed(2));
        setNumericEval(score);
      }
      setLoading(false);
      engine.terminate();
    };
    void run().catch(() => { if (alive) { setLoading(false); setLines([]); setEvalScore(t('analysis.noLines')); setNumericEval(0); } });
    return () => { alive = false; engine.terminate(); };
  }, [analysisFen, t]);

  const whiteShare = Math.max(5, Math.min(95, 50 + 45 * Math.tanh(numericEval / 4)));
  const advantage = Math.abs(numericEval) < .25 ? t('analysis.balanced') : numericEval > 0 ? t('analysis.whiteBetter') : t('analysis.blackBetter');

  return <div className="view-enter analysis-view-v2">
    <SectionHeading eyebrow={t('studio.analysis')} title={t('analysis.title')} subtitle={t('analysis.subtitle')}/>
    {analysisTarget && <div className="analysis-context-bar"><span><ChessyIcon name="review" size={16}/>{analysisTarget.ply ? t('analysis.reviewPosition', { move: Math.ceil(analysisTarget.ply / 2) }) : t('analysis.initialReviewPosition')}</span><button className="text-button" onClick={() => setView('review')}>{t('analysis.backReview')}</button></div>}
    <div className="analysis-cockpit">
      <section className="analysis-board-stage" aria-label={t('analysis.positionLabel')}>
        <div className="analysis-eval" aria-label={t('analysis.eval')}>
          <div className="analysis-eval-track"><span style={{ height: `${whiteShare}%` }}/></div>
          <strong>{loading ? '…' : evalScore}</strong>
          <small>{advantage}</small>
        </div>
        <div className="board-card analysis-board"><PositionBoard fen={analysisFen} readOnly/></div>
      </section>
      <aside className="analysis-rail">
        <section className="panel analysis-card analysis-lines-card">
          <header><ChessyIcon name="analysis" size={18}/><div><p className="eyebrow">{t('analysis.eval')}</p><h2>{loading ? t('analysis.loading') : advantage}</h2></div><strong>{loading ? '…' : evalScore}</strong></header>
          <div className="analysis-lines">{lines.length === 0 ? <p className="muted">{t('analysis.noLines')}</p> : lines.map(line => <div key={line.multipv}><span>{line.multipv}</span><p>{t('analysis.line', { line: line.pv || '' })}</p></div>)}</div>
        </section>
        <section className="panel analysis-card">
          <header><ChessyIcon name="library" size={18}/><div><p className="eyebrow">{t('analysis.explorer')}</p><h2>{t('analysis.openingIdeas')}</h2></div></header>
          <div className="analysis-explorer">{explorerMoves.length === 0 ? <p className="muted">{t('analysis.noExplorer')}</p> : explorerMoves.map(entry => <div key={entry.move}><strong>{entry.name || entry.move}</strong><span>{entry.white}% · {entry.draw}% · {entry.black}%</span></div>)}</div>
        </section>
        <section className="panel analysis-card">
          <header><ChessyIcon name="hint" size={18}/><div><p className="eyebrow">{t('analysis.commentary')}</p><h2>{t('analysis.yourPlan')}</h2></div></header>
          <textarea rows={4} placeholder={t('analysis.addNote')} aria-label={t('analysis.addNote')}/>
        </section>
      </aside>
    </div>
  </div>;
};
