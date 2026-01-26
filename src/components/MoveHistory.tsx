import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ScrollText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const MoveHistory: React.FC = () => {
  const { history, capturedPieces } = useGameStore();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);

  const pieceSymbols: { [key: string]: string } = {
    p: '♟',
    n: '♞',
    b: '♝',
    r: '♜',
    q: '♛',
    k: '♚',
  };

  const formatMoves = () => {
    const moves: { moveNumber: number; white: string; black?: string }[] = [];
    for (let i = 0; i < history.length; i += 2) {
      moves.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: history[i],
        black: history[i + 1],
      });
    }
    return moves;
  };

  const renderCapturedPieces = (pieces: string[], color: 'white' | 'black') => {
    if (pieces.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1">
        {pieces.map((piece, index) => (
          <span
            key={`${piece}-${index}`}
            className={`text-2xl ${color === 'white' ? 'text-white' : 'text-gray-800'}`}
            style={{
              filter: color === 'white' 
                ? 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))'
                : 'drop-shadow(0 1px 2px rgba(255, 255, 255, 0.5))',
            }}
          >
            {pieceSymbols[piece]}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between text-white font-semibold text-lg mb-4">
        <div className="flex items-center gap-2">
          <ScrollText size={24} />
          <span>{t('history.title')}</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="glass-button px-3 py-1 rounded-md text-xs text-white hover:scale-105 transition-transform"
        >
          {isOpen ? t('history.hide') : t('history.show')}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Captured Pieces */}
          <div className="space-y-3">
            <div className="glass-container rounded-lg p-3">
              <p className="text-white text-xs font-semibold mb-2 uppercase tracking-wide">
                {t('history.capturedByWhite')}
              </p>
              {capturedPieces.white.length > 0 ? (
                renderCapturedPieces(capturedPieces.white, 'white')
              ) : (
                <p className="text-white/40 text-sm">{t('history.none')}</p>
              )}
            </div>

            <div className="glass-container rounded-lg p-3">
              <p className="text-gray-800 text-xs font-semibold mb-2 uppercase tracking-wide">
                {t('history.capturedByBlack')}
              </p>
              {capturedPieces.black.length > 0 ? (
                renderCapturedPieces(capturedPieces.black, 'black')
              ) : (
                <p className="text-white/40 text-sm">{t('history.none')}</p>
              )}
            </div>
          </div>

          {/* Move List */}
          <div className="glass-container rounded-lg p-4 max-h-64 overflow-y-auto glass-scrollbar">
            {history.length === 0 ? (
              <p className="text-white/60 text-sm text-center py-4">
                {t('history.noMoves')}
              </p>
            ) : (
              <div className="space-y-2">
                {formatMoves().map((move) => (
                  <div
                    key={move.moveNumber}
                    className="flex gap-3 text-white text-sm hover:bg-white/10 rounded px-2 py-1 transition-colors"
                  >
                    <span className="text-white/60 font-semibold w-8">
                      {move.moveNumber}.
                    </span>
                    <span className="flex-1 font-mono">{move.white}</span>
                    {move.black && (
                      <span className="flex-1 font-mono text-gray-300">{move.black}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
