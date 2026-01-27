import React from 'react';
import { useGameStore } from '../store/gameStore';
import { RotateCcw, Undo2, Flag, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BoardSetupModal } from './BoardSetupModal';

export const GameControls: React.FC = () => {
  const {
    resetGame,
    undoMove,
    isGameOver,
    winner,
    history,
    chess,
    isAIGame,
    aiDifficulty,
    playerColor,
    showLegalMoves,
    setShowLegalMoves,
  } = useGameStore();
  const { t } = useTranslation();

  const getGameStatus = () => {
    if (!isGameOver) {
      const turn = chess.turn() === 'w' ? t('colors.white') : t('colors.black');
      if (chess.isCheck()) {
        return t('status.inCheck', { color: turn });
      }
      return t('status.turn', { color: turn });
    }

    if (winner === 'draw') {
      if (chess.isStalemate()) return t('status.drawStalemate');
      if (chess.isThreefoldRepetition()) return t('status.drawThreefold');
      if (chess.isInsufficientMaterial()) return t('status.drawInsufficient');
      return t('status.draw');
    }

    const winnerColor = winner === 'white' ? t('colors.white') : t('colors.black');
    return t('status.winsCheckmate', { color: winnerColor });
  };

  return (
    <div className="glass-card glass-card--subtle rounded-xl p-5 space-y-4">
      {/* Game Status */}
      <div className="text-center">
        <div className="glass-container rounded-lg p-4 mb-4">
          <p className="text-white text-base font-semibold flex items-center justify-center gap-2">
            {isGameOver && winner !== 'draw' && <Trophy size={24} className="text-yellow-400" />}
            {getGameStatus()}
          </p>
          <p className="text-white/70 text-sm mt-1">
            {t('controls.moveNumber', { count: Math.floor(history.length / 2) + 1 })}
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={undoMove}
          disabled={history.length === 0}
          className="glass-button glass-button--subtle px-4 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t('controls.undo')}
        >
          <Undo2 size={20} />
          <span>{t('controls.undo')}</span>
        </button>

        <button
          onClick={resetGame}
          className="glass-button glass-button--subtle px-4 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2"
          aria-label={t('controls.newGame')}
        >
          <RotateCcw size={20} />
          <span>{t('controls.newGame')}</span>
        </button>
      </div>

      {/* Helpers */}
      <div className="glass-container rounded-lg p-4 space-y-3">
        <button
          onClick={() => setShowLegalMoves(!showLegalMoves)}
          className="w-full glass-button glass-button--subtle px-4 py-3 rounded-lg text-white font-medium"
          aria-label={showLegalMoves ? t('controls.hideLegalMoves') : t('controls.showLegalMoves')}
        >
          {showLegalMoves ? t('controls.hideLegalMoves') : t('controls.showLegalMoves')}
        </button>
        <BoardSetupModal />
        {isAIGame && (
          <div className="text-white/70 text-xs text-center">
            {t('controls.aiInfo', {
              level: t(`ai.difficultyLevels.${aiDifficulty}.label`),
              color: t(`colors.${playerColor}`),
            })}
          </div>
        )}
      </div>

      {/* Resign Button */}
      {!isGameOver && history.length > 0 && (
        <button
          onClick={() => {
            if (confirm(t('controls.resignConfirm'))) {
              resetGame();
            }
          }}
          className="w-full glass-button glass-button--subtle px-4 py-3 rounded-lg text-red-300 font-medium flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
          aria-label={t('controls.resign')}
        >
          <Flag size={20} />
          <span>{t('controls.resign')}</span>
        </button>
      )}

      {/* Game Over Actions */}
      {isGameOver && (
        <div className="glass-container rounded-lg p-4 text-center animate-fade-in">
          <p className="text-white/80 text-sm mb-3">
            {t('controls.gameOver')}
          </p>
          <button
            onClick={resetGame}
            className="w-full glass-button glass-button--subtle px-4 py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-blue-500/20 to-purple-500/20"
          >
            {t('controls.playAgain')}
          </button>
        </div>
      )}
    </div>
  );
};
