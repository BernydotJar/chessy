import React, { useState } from 'react';
import { RotateCcw, Undo2, Flag } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { ChessyIcon } from '../design/icons';
import { TIME_CONTROLS, type TimeControlId } from '../game/timeControls';
import { useTranslation } from 'react-i18next';

export const GameControls: React.FC = () => {
  const game = useGameStore();
  const { t } = useTranslation();
  const [confirmResign, setConfirmResign] = useState(false);

  const getGameStatus = () => {
    if (!game.isGameOver) {
      const turn = game.chess.turn() === 'w' ? t('colors.white') : t('colors.black');
      if (game.chess.isCheck()) return t('status.inCheck', { color: turn });
      return t('status.turn', { color: turn });
    }
    if (game.winner === 'draw') {
      if (game.chess.isStalemate()) return t('status.drawStalemate');
      if (game.chess.isThreefoldRepetition()) return t('status.drawThreefold');
      if (game.chess.isInsufficientMaterial()) return t('status.drawInsufficient');
      return t('status.draw');
    }
    const winnerColor = game.winner === 'white' ? t('colors.white') : t('colors.black');
    if (game.endReason === 'resignation') return t('status.winsResignation', { color: winnerColor });
    if (game.endReason === 'timeout') return t('status.winsTimeout', { color: winnerColor });
    return t('status.winsCheckmate', { color: winnerColor });
  };

  const playAgain = () => game.isAIGame ? game.startAIGame(game.aiDifficulty, game.playerColor) : game.resetGame();
  const newGame = () => game.resetGame();

  return <section className={`panel game-controls-v3 ${game.isGameOver ? 'is-finished' : ''}`} aria-label={t('controls.gameStatus')}>
    <div className="game-status-v3">
      <div><p className="eyebrow">{game.isGameOver ? t('match.resultLabel') : t('controls.gameStatus')}</p><strong>{getGameStatus()}</strong><span>{t('controls.moveNumber', { count: Math.max(1, Math.floor(game.history.length / 2) + 1) })}</span></div>
      {game.isGameOver ? <ChessyIcon name="achievement" size={28} className="achievement-color"/> : <span className={`match-status-dot ${game.chess.isCheck() ? 'is-check' : ''}`} aria-hidden="true"/>}
    </div>

    {!game.isAIGame && game.history.length === 0 && <label className="local-clock-picker">
      <span>{t('match.timeControlLabel')}</span>
      <select aria-label={t('match.timeControlLabel')} value={game.timeControlId} onChange={event => game.setTimeControl(event.target.value as TimeControlId)}>{TIME_CONTROLS.map(control => <option key={control.id} value={control.id}>{t(control.labelKey)}</option>)}</select>
      <small>{t('match.clockStartsAfterFirst')}</small>
    </label>}

    {!game.isGameOver && <>
      <div className="game-core-actions">
        <button onClick={game.undoMove} disabled={game.history.length <= (game.isAIGame && game.playerColor === 'black' ? 1 : 0) || game.isAIThinking} className="btn secondary" aria-label={t('controls.undo')}><Undo2 size={18}/><span>{t('controls.undo')}</span></button>
        <button onClick={newGame} className="btn secondary" aria-label={t('controls.newGame')}><RotateCcw size={18}/><span>{t('controls.newGame')}</span></button>
      </div>
      {game.history.length > 0 && !confirmResign && <button onClick={() => setConfirmResign(true)} className="text-button resign-link" aria-label={t('controls.resign')}><Flag size={16}/><span>{t('controls.resign')}</span></button>}
      {confirmResign && <div className="resign-confirm" role="group" aria-label={t('controls.resignConfirm')}><p>{t('controls.resignConfirm')}</p><div className="button-row"><button className="btn danger" onClick={() => { game.resignGame(); setConfirmResign(false); }}>{t('controls.resign')}</button><button className="btn quiet" onClick={() => setConfirmResign(false)}>{t('studio.cancel')}</button></div></div>}
    </>}

    {game.engineError && !game.isGameOver && <div className="feedback wrong" role="status"><p>{t('studio.engineError')}</p><button className="btn secondary" onClick={() => void game.makeAIMove()}>{t('studio.retry')}</button></div>}

    {game.isGameOver && <div className="match-result-actions">
      <button onClick={() => game.setView('review')} className="btn primary full"><ChessyIcon name="review" size={18}/>{t('games.actions.review')}</button>
      <button onClick={() => { game.setAnalysisTarget(null); game.setView('analysis'); }} className="btn secondary full"><ChessyIcon name="analysis" size={18}/>{t('games.actions.analyze')}</button>
      <button onClick={playAgain} className="btn quiet full"><RotateCcw size={17}/>{t('controls.playAgain')}</button>
    </div>}
  </section>;
};
