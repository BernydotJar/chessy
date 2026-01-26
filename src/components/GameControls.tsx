import React from 'react';
import { useGameStore } from '../store/gameStore';
import { RotateCcw, Undo2, Flag, Trophy } from 'lucide-react';

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

  const getGameStatus = () => {
    if (!isGameOver) {
      const turn = chess.turn() === 'w' ? 'White' : 'Black';
      if (chess.isCheck()) {
        return `${turn} is in check!`;
      }
      return `${turn} to move`;
    }

    if (winner === 'draw') {
      if (chess.isStalemate()) return 'Draw by stalemate';
      if (chess.isThreefoldRepetition()) return 'Draw by threefold repetition';
      if (chess.isInsufficientMaterial()) return 'Draw by insufficient material';
      return 'Draw';
    }

    return `${winner === 'white' ? 'White' : 'Black'} wins by checkmate!`;
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      {/* Game Status */}
      <div className="text-center">
        <div className="glass-container rounded-lg p-4 mb-4">
          <p className="text-white text-lg font-semibold flex items-center justify-center gap-2">
            {isGameOver && winner !== 'draw' && <Trophy size={24} className="text-yellow-400" />}
            {getGameStatus()}
          </p>
          <p className="text-white/70 text-sm mt-1">
            Move {Math.floor(history.length / 2) + 1}
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={undoMove}
          disabled={history.length === 0}
          className="glass-button px-4 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          aria-label="Undo last move"
        >
          <Undo2 size={20} />
          <span>Undo</span>
        </button>

        <button
          onClick={resetGame}
          className="glass-button px-4 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 hover:scale-105 transition-transform"
          aria-label="Reset game"
        >
          <RotateCcw size={20} />
          <span>New Game</span>
        </button>
      </div>

      {/* Helpers */}
      <div className="glass-container rounded-lg p-4 space-y-3">
        <button
          onClick={() => setShowLegalMoves(!showLegalMoves)}
          className="w-full glass-button px-4 py-3 rounded-lg text-white font-medium hover:scale-105 transition-transform"
          aria-label="Toggle legal move hints"
        >
          {showLegalMoves ? 'Hide Legal Moves' : 'Show Legal Moves'}
        </button>
        {isAIGame && (
          <div className="text-white/70 text-xs text-center">
            AI: {aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1)} · You are{' '}
            {playerColor.charAt(0).toUpperCase() + playerColor.slice(1)}
          </div>
        )}
      </div>

      {/* Resign Button */}
      {!isGameOver && history.length > 0 && (
        <button
          onClick={() => {
            if (confirm('Are you sure you want to resign?')) {
              resetGame();
            }
          }}
          className="w-full glass-button px-4 py-3 rounded-lg text-red-300 font-medium flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"
          aria-label="Resign game"
        >
          <Flag size={20} />
          <span>Resign</span>
        </button>
      )}

      {/* Game Over Actions */}
      {isGameOver && (
        <div className="glass-container rounded-lg p-4 text-center animate-fade-in">
          <p className="text-white/80 text-sm mb-3">
            Game Over
          </p>
          <button
            onClick={resetGame}
            className="w-full glass-button px-4 py-3 rounded-lg text-white font-semibold hover:scale-105 transition-transform bg-gradient-to-r from-blue-500/20 to-purple-500/20"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};
