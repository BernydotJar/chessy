import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
interface Props {isOpen:boolean;color:'w'|'b';onSelect:(piece:'q'|'r'|'b'|'n')=>void;onClose:()=>void}
export function PromotionDialog({isOpen,color,onSelect,onClose}:Props) {
 const {t}=useTranslation();const dialog=useRef<HTMLDialogElement>(null);
 const pieces=[{type:'q',key:'Q',name:t('promotion.queen'),symbol:color==='w'?'♕':'♛'},{type:'r',key:'R',name:t('promotion.rook'),symbol:color==='w'?'♖':'♜'},{type:'b',key:'B',name:t('promotion.bishop'),symbol:color==='w'?'♗':'♝'},{type:'n',key:'N',name:t('promotion.knight'),symbol:color==='w'?'♘':'♞'}] as const;
 useEffect(()=>{const node=dialog.current;if(isOpen&&!node?.open)node?.showModal();else if(!isOpen&&node?.open)node.close();return()=>{if(node?.open)node.close();};},[isOpen]);
 return <dialog ref={dialog} className="promotion-dialog" aria-labelledby="promotion-heading" onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>{const found=pieces.find(p=>p.key.toLowerCase()===e.key.toLowerCase());if(found){e.preventDefault();onSelect(found.type);onClose();}}}><h2 id="promotion-heading">{t('promotion.title')}</h2><div className="promotion-options">{pieces.map(piece=><button key={piece.type} aria-label={piece.name} onClick={()=>{onSelect(piece.type);onClose();}}><span className="promotion-symbol" aria-hidden="true">{piece.symbol}</span><strong>{piece.name}</strong><small>{piece.key}</small></button>)}</div><button className="btn quiet" onClick={onClose}>{t('studio.cancel')}</button></dialog>;
}
