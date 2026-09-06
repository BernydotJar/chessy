import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard, type ChessboardOptions } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { useTranslation } from 'react-i18next';
import { PromotionDialog } from '../PromotionDialog';
import { createAccessibleChessPieces } from '../accessibleChessPieces';

export function PositionBoard({fen,onMove,readOnly=false,hintSquare}:{fen:string;onMove?:(move:string)=>boolean;readOnly?:boolean;hintSquare?:string}) {
 const {t}=useTranslation();
 const accessiblePieces=useMemo(()=>createAccessibleChessPieces(t),[t]);
 const ref=useRef<HTMLDivElement>(null),[selected,setSelected]=useState<Square|null>(null),[promotion,setPromotion]=useState<{from:Square;to:Square}|null>(null);
 const game=new Chess(fen);
 const [orientation]=useState<'white'|'black'>(()=>game.turn()==='w'?'white':'black');
 const [reduced,setReduced]=useState(false);
 useEffect(()=>{const m=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(m.matches);update();m.addEventListener('change',update);return()=>m.removeEventListener('change',update);},[]);
 useEffect(()=>{setSelected(null);},[fen]);
 function play(from:Square,to:Square){
  if(readOnly||!onMove)return false;
  const legal=game.moves({square:from,verbose:true}).filter(m=>m.to===to);
  if(!legal.length){setSelected(null);return false;}
  if(legal.some(m=>m.promotion)){setPromotion({from,to});return false;}
  setSelected(null);return onMove(from+to);
 }
 const styles:Record<string,CSSProperties>={};
 if(selected){styles[selected]={backgroundColor:'rgba(232,193,111,.65)'};for(const m of game.moves({square:selected,verbose:true}))styles[m.to]={backgroundImage:'radial-gradient(circle, rgba(14,30,25,.35) 20%, transparent 23%)'};}
 if(hintSquare)styles[hintSquare]={boxShadow:'inset 0 0 0 4px #f3bf60'};
 const options:ChessboardOptions={
  id:readOnly?'daily-preview':'challenge-board',
  position:fen,
  pieces:accessiblePieces,
  boardOrientation:orientation,
  animationDurationInMs:reduced?0:180,
  allowDragging:!readOnly,
  allowDragOffBoard:false,
  allowAutoScroll:false,
  dragActivationDistance:2,
  allowDrawingArrows:!readOnly,
  lightSquareStyle:{backgroundColor:'#eee6d6'},
  darkSquareStyle:{backgroundColor:'#5e8273'},
  boardStyle:{borderRadius:'8px',width:'100%',height:'100%'},
  squareStyles:styles,
  onPieceDrop:({sourceSquare,targetSquare})=>!!targetSquare&&play(sourceSquare as Square,targetSquare as Square),
  onSquareClick:({square})=>{if(readOnly)return;if(selected&&play(selected,square as Square))return;const piece=game.get(square as Square);setSelected(piece?.color===game.turn()?square as Square:null);},
 };
 return <div className="position-wrap" ref={ref}>
  <Chessboard options={options} />
  <PromotionDialog isOpen={!!promotion} color={game.turn()} onSelect={piece=>{if(promotion)onMove?.(promotion.from+promotion.to+piece);setPromotion(null);}} onClose={()=>setPromotion(null)} />
 </div>;
}
export function SectionHeading({eyebrow,title,subtitle}:{eyebrow?:string;title:string;subtitle?:string}) {return <div className="section-heading">{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{subtitle&&<p className="section-description">{subtitle}</p>}</div>;}
export function MoveEntry({onMove,disabled=false}:{onMove:(move:string)=>boolean;disabled?:boolean}) {
 const {t}=useTranslation();const [move,setMove]=useState('');
 return <form className="move-entry" onSubmit={e=>{e.preventDefault();if(onMove(move.trim().toLowerCase()))setMove('');}}><label htmlFor="typed-move">{t('studio.moveLabel')}</label><div><input id="typed-move" aria-describedby="move-help" value={move} onChange={e=>setMove(e.target.value)} placeholder="e2e4" maxLength={5} autoComplete="off" spellCheck={false} disabled={disabled}/><button className="btn primary" disabled={disabled||move.length<4}>{t('studio.submit')}</button></div><small id="move-help">{t('studio.moveHelp')}</small></form>;
}
