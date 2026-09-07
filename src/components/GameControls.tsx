import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { RotateCcw, Undo2, Flag } from 'lucide-react';
import { ChessyIcon } from '../design/icons';
import { useTranslation } from 'react-i18next';

export const GameControls: React.FC = () => {
  const {
    resetGame, undoMove, isGameOver, winner, history, chess, isAIGame, playerColor,
    isAIThinking, engineError, makeAIMove, resignGame, endReason, setView,
  } = useGameStore();
  const { t } = useTranslation();
  const [confirmResign, setConfirmResign] = useState(false);

  const getGameStatus = () => {
    if (!isGameOver) {
      const turn = chess.turn() === 'w' ? t('colors.white') : t('colors.black');
      if (chess.isCheck()) return t('status.inCheck', { color: turn });
      return t('status.turn', { color: turn });
    }
    if (winner === 'draw') {
      if (chess.isStalemate()) return t('status.drawStalemate');
      if (chess.isThreefoldRepetition()) return t('status.drawThreefold');
      if (chess.isInsufficientMaterial()) return t('status.drawInsufficient');
      return t('status.draw');
    }
    const winnerColor = winner === 'white' ? t('colors.white') : t('colors.black');
    return t(endReason === 'resignation' ? 'status.winsResignation' : 'status.winsCheckmate', { color: winnerColor });
  };

  return <section className="panel game-controls-v2" aria-label={t('controls.gameStatus')}>
    <div className="game-status-v2"><div><p className="eyebrow">{t('controls.gameStatus')}</p><strong>{getGameStatus()}</strong><span>{t('controls.moveNumber', { count: Math.floor(history.length / 2) + 1 })}</span></div>{isGameOver && winner !== 'draw' && <ChessyIcon name="achievement" size={28} className="achievement-color"/>}</div>
    <div className="game-core-actions">
      <button onClick={undoMove} disabled={history.length <= (isAIGame && playerColor === 'black' ? 1 : 0) || isAIThinking} className="btn secondary" aria-label={t('controls.undo')}><Undo2 size={18}/><span>{t('controls.undo')}</span></button>
      <button onClick={resetGame} className="btn secondary" aria-label={t('controls.newGame')}><RotateCcw size={18}/><span>{t('controls.newGame')}</span></button>
    </div>
    {!isGameOver && history.length > 0 && !confirmResign && <button onClick={() => setConfirmResign(true)} className="text-button resign-link" aria-label={t('controls.resign')}><Flag size={16}/><span>{t('controls.resign')}</span></button>}
    {confirmResign && <div className="resign-confirm" role="group" aria-label={t('controls.resignConfirm')}><p>{t('controls.resignConfirm')}</p><div className="button-row"><button className="btn danger" onClick={() => { resignGame(); setConfirmResign(false); }}>{t('controls.resign')}</button><button className="btn quiet" onClick={() => setConfirmResign(false)}>{t('studio.cancel')}</button></div></div>}
    {engineError && !isGameOver && <div className="feedback wrong" role="status"><p>{t('studio.engineError')}</p><button className="btn secondary" onClick={() => void makeAIMove()}>{t('studio.retry')}</button></div>}
    {isGameOver && <div className="game-over-actions game-over-actions-v2"><button onClick={() => { setView('analysis'); window.location.hash='/analysis'; }} className="btn primary full"><ChessyIcon name="analysis" size={19}/>{t('games.actions.analyze')}</button><button onClick={resetGame} className="btn secondary full">{t('controls.playAgain')}</button></div>}
  </section>;
};
