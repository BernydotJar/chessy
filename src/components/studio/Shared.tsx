import { CSSProperties, useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { useTranslation } from 'react-i18next';
import { PromotionDialog } from '../PromotionDialog';
export function PositionBoard({fen,onMove,readOnly=false,hintSquare}:{fen:string;onMove?:(move:string)=>boolean;readOnly?:boolean;hintSquare?:string}) {
 const ref=useRef<HTMLDivElement>(null),[width,setWidth]=useState(400),[selected,setSelected]=useState<Square|null>(null),[promotion,setPromotion]=useState<{from:Square;to:Square}|null>(null);
 const game=new Chess(fen);
 const [orientation]=useState<'white'|'black'>(()=>game.turn()==='w'?'white':'black');
 const [reduced,setReduced]=useState(false);
 useEffect(()=>{const m=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(m.matches);update();m.addEventListener('change',update);return()=>m.removeEventListener('change',update);},[]);
 useEffect(()=>{const node=ref.current;if(!node)return;const observer=new ResizeObserver(()=>setWidth(Math.floor(node.clientWidth)));observer.observe(node);setWidth(Math.floor(node.clientWidth));return()=>observer.disconnect();},[]);
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
 return <div className="position-wrap" ref={ref}>
  <Chessboard id={readOnly?'daily-preview':'challenge-board'} position={fen} boardWidth={width} boardOrientation={orientation} animationDuration={reduced?0:230} arePiecesDraggable={!readOnly} areArrowsAllowed={!readOnly} customLightSquareStyle={{backgroundColor:'#eee6d6'}} customDarkSquareStyle={{backgroundColor:'#5e8273'}} customBoardStyle={{borderRadius:'8px'}} customSquareStyles={styles} onPieceDrop={play} onSquareClick={square=>{if(readOnly)return;if(selected&&play(selected,square))return;const piece=game.get(square);setSelected(piece?.color===game.turn()?square:null);}} />
  <PromotionDialog isOpen={!!promotion} color={game.turn()} onSelect={piece=>{if(promotion)onMove?.(promotion.from+promotion.to+piece);setPromotion(null);}} onClose={()=>setPromotion(null)} />
 </div>;
}
export function SectionHeading({eyebrow,title,subtitle}:{eyebrow?:string;title:string;subtitle?:string}) {return <div className="section-heading">{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{subtitle&&<p className="section-description">{subtitle}</p>}</div>;}
export function MoveEntry({onMove,disabled=false}:{onMove:(move:string)=>boolean;disabled?:boolean}) {
 const {t}=useTranslation();const [move,setMove]=useState('');
 return <form className="move-entry" onSubmit={e=>{e.preventDefault();if(onMove(move.trim().toLowerCase()))setMove('');}}><label htmlFor="typed-move">{t('studio.moveLabel')}</label><div><input id="typed-move" aria-describedby="move-help" value={move} onChange={e=>setMove(e.target.value)} placeholder="e2e4" maxLength={5} autoComplete="off" spellCheck={false} disabled={disabled}/><button className="btn primary" disabled={disabled||move.length<4}>{t('studio.submit')}</button></div><small id="move-help">{t('studio.moveHelp')}</small></form>;
}
