import { useState } from 'react';
import { Chess } from 'chess.js';
import { ChessyIcon } from '../../design/icons';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { putGame } from '../../utils/gamesDb';
import { downloadText } from '../../utils/download';
import { localDay } from '../../learning/progress';
export function GameFiles() {
 const {t}=useTranslation(),game=useGameStore();const [message,setMessage]=useState(''),[pending,setPending]=useState<string|null>(null),[saving,setSaving]=useState(false);
 const exportPgn=()=>{const copy=new Chess();copy.loadPgn(game.chess.pgn());copy.header('Event','Chessy local training','Site','Chessy','Result',game.isGameOver?(game.winner==='draw'?'1/2-1/2':game.winner==='white'?'1-0':'0-1'):'*');return copy.pgn();};
 const save=async()=>{setSaving(true);try{const id=game.activeGameId||crypto.randomUUID();await putGame({id,opponent:game.isAIGame?`Stockfish (${game.aiDifficulty})`:t('studio.localGame'),color:game.playerColor,result:!game.isGameOver?'ongoing':game.winner==='draw'?'draw':game.winner===game.playerColor?'win':'loss',timeControl:t('studio.untimed'),date:new Date().toISOString(),pgn:exportPgn()});game.setActiveGameId(id);setMessage('studio.gameSaved');}catch{setMessage('studio.saveError');}finally{setSaving(false);}};
 return <section className="game-files" aria-label={t('studio.games')}><div className="button-row"><button className="btn secondary" disabled={saving||!game.history.length} onClick={()=>void save()}><ChessyIcon name="save" size={16}/>{t('studio.saveGame')}</button><button className="btn secondary" onClick={()=>downloadText(`chessy-${localDay()}.pgn`,exportPgn(),'application/x-chess-pgn')}><ChessyIcon name="export" size={16}/>{t('studio.exportPgn')}</button><label className="btn secondary file-button"><ChessyIcon name="import" size={16}/>{t('studio.importPgn')}<input type="file" accept=".pgn,text/plain,application/x-chess-pgn" aria-label={t('studio.importPgn')} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>100000)throw new Error('size');const pgn=await file.text();const check=new Chess();check.loadPgn(pgn);if(!check.history().length)throw new Error('empty');setPending(pgn);setMessage('');}catch{setMessage('studio.pgnError');}}}/></label></div>{pending&&<div className="confirm-panel"><p>{t('studio.pgnReplace')}</p><div className="button-row"><button className="btn primary" onClick={()=>{game.loadPgn(pending);game.setActiveGameId(null);setPending(null);}}>{t('studio.importPgn')}</button><button className="btn quiet" onClick={()=>setPending(null)}>{t('studio.cancel')}</button></div></div>}{message&&<p className="feedback" role="status">{t(message)}</p>}</section>;
}
