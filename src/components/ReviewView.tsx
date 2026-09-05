import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { PositionBoard, SectionHeading } from './studio/Shared';
export function ReviewView() {
 const {t}=useTranslation();const {chess,fen,history,setView}=useGameStore();const [cursor,setCursor]=useState(0);
 const positions=useMemo(()=>{const copy=new Chess();copy.loadPgn(chess.pgn());const moves=copy.history({verbose:true});return [moves[0]?.before||fen,...moves.map(m=>m.after)];},[chess,fen]);
 const index=Math.min(cursor,positions.length-1);
 return <div className="view-enter"><SectionHeading eyebrow={t('studio.review')} title={t('review.title')} subtitle={t('studio.reviewReal')}/>{history.length===0?<div className="panel empty-state"><p>{t('review.noMoments')}</p><button className="btn primary" onClick={()=>setView('play')}>{t('studio.play')}</button></div>:<div className="challenge-layout"><div className="board-card"><PositionBoard fen={positions[index]} readOnly/><div className="review-navigation"><button className="btn secondary" aria-label={t('studio.firstPosition')} disabled={index===0} onClick={()=>setCursor(0)}><ChevronsLeft size={18}/></button><button className="btn secondary" aria-label={t('studio.previous')} disabled={index===0} onClick={()=>setCursor(c=>c-1)}><ArrowLeft size={18}/></button><span aria-live="polite">{index} / {history.length}</span><button className="btn secondary" aria-label={t('studio.nextPosition')} disabled={index===history.length} onClick={()=>setCursor(c=>c+1)}><ArrowRight size={18}/></button><button className="btn secondary" aria-label={t('studio.lastPosition')} disabled={index===history.length} onClick={()=>setCursor(history.length)}><ChevronsRight size={18}/></button></div></div><section className="panel"><h2>{t('studio.line')}</h2><div className="review-moves">{history.map((move,i)=><button key={i} aria-pressed={index===i+1} className={index===i+1?'active':''} onClick={()=>setCursor(i+1)}>{i%2===0?`${Math.floor(i/2)+1}. `:''}{move}</button>)}</div><p className="fine-print">{t('studio.reviewReal')}</p><button className="btn secondary" onClick={()=>setView('analysis')}>{t('studio.analysis')}<ArrowRight size={17}/></button></section></div>}</div>;
}
