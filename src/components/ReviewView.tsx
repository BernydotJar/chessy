import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChessyIcon } from '../design/icons';
import { useGameStore } from '../store/gameStore';
import { PositionBoard, SectionHeading } from './studio/Shared';

export function ReviewView() {
  const { t } = useTranslation();
  const { chess, fen, history, setView, setAnalysisTarget, analysisTarget } = useGameStore();
  const [cursor, setCursor] = useState(analysisTarget?.ply ?? 0);
  const replay = useMemo(() => {
    const copy = new Chess();
    copy.loadPgn(chess.pgn());
    const moves = copy.history({ verbose: true });
    return {
      positions: [moves[0]?.before || fen, ...moves.map(move => move.after)],
      moves,
    };
  }, [chess, fen]);
  const index = Math.min(cursor, replay.positions.length - 1);
  const current = index > 0 ? replay.moves[index - 1] : null;

  return <div className="view-enter review-view-v2">
    <SectionHeading eyebrow={t('studio.review')} title={t('review.title')} subtitle={t('studio.reviewReal')}/>
    {history.length === 0 ? <div className="panel empty-state"><ChessyIcon name="review" size={34}/><p>{t('review.noMoments')}</p><button className="btn primary" onClick={() => setView('play')}>{t('studio.play')}</button></div> : <div className="review-cockpit">
      <section className="review-board-stage" aria-label={t('review.boardLabel')}>
        <div className="review-position-meta">
          <div><p className="eyebrow">{current ? t('review.moveEyebrow', { move: Math.ceil(index / 2) }) : t('review.initialPosition')}</p><strong>{current ? current.san : t('review.startingBoard')}</strong></div>
          <span>{index} / {history.length}</span>
        </div>
        <div className="board-card review-board"><PositionBoard fen={replay.positions[index]} readOnly/></div>
        <nav className="review-navigation" aria-label={t('review.navigation')}>
          <button className="btn secondary" aria-label={t('studio.firstPosition')} disabled={index === 0} onClick={() => setCursor(0)}><ChevronsLeft size={18}/></button>
          <button className="btn secondary" aria-label={t('studio.previous')} disabled={index === 0} onClick={() => setCursor(c => c - 1)}><ArrowLeft size={18}/></button>
          <span aria-live="polite">{current ? current.san : t('review.initialPosition')}</span>
          <button className="btn secondary" aria-label={t('studio.nextPosition')} disabled={index === history.length} onClick={() => setCursor(c => c + 1)}><ArrowRight size={18}/></button>
          <button className="btn secondary" aria-label={t('studio.lastPosition')} disabled={index === history.length} onClick={() => setCursor(history.length)}><ChevronsRight size={18}/></button>
        </nav>
      </section>
      <aside className="panel review-rail">
        <header><div><p className="eyebrow">{t('review.scoreSheet')}</p><h2>{t('studio.line')}</h2></div><span className="tag">{history.length}</span></header>
        <div className="review-moves review-moves-v2">{history.map((move, i) => <button key={`${i}-${move}`} aria-pressed={index === i + 1} className={index === i + 1 ? 'active' : ''} onClick={() => setCursor(i + 1)}><span>{i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}</span><strong>{move}</strong></button>)}</div>
        <div className="review-truth"><ChessyIcon name="shield" size={18}/><p>{t('studio.reviewReal')}</p></div>
        <button className="btn primary full" onClick={() => { setAnalysisTarget({ fen: replay.positions[index], ply: index }); setView('analysis'); }}>{t('review.deepAnalyze')}<ArrowRight size={17}/></button>
      </aside>
    </div>}
  </div>;
}
