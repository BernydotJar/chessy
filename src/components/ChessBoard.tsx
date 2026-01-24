import React from 'react';
import { Chessboard } from 'react-chessboard';
import { useGameStore } from '../store/gameStore';
import { Square } from 'chess.js';

export const ChessBoard: React.FC = () => {
  const { fen, makeMove, theme, chess } = useGameStore();

  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    // Check if the move requires promotion
    const piece = chess.get(sourceSquare);
    const isPromotion =
      piece?.type === 'p' &&
      ((piece.color === 'w' && targetSquare[1] === '8') ||
        (piece.color === 'b' && targetSquare[1] === '1'));

    if (isPromotion) {
      // For now, auto-promote to queen. In Phase 2, we'll add a promotion dialog
      return makeMove(sourceSquare, targetSquare, 'q');
    }

    return makeMove(sourceSquare, targetSquare);
  };

  const customBoardStyle = {
    borderRadius: '12px',
    boxShadow: `
      0 8px 32px 0 rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `,
  };

  const customSquareStyles = {
    ...Object.fromEntries(
      Array.from({ length: 64 }, (_, i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const square = `${String.fromCharCode(97 + col)}${8 - row}` as Square;
        const isLight = (row + col) % 2 === 0;
        
        return [
          square,
          {
            backgroundColor: isLight ? theme.lightSquare : theme.darkSquare,
          },
        ];
      })
    ),
  };

  return (
    <div className="relative">
      {/* Glass overlay effect */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          background: `rgba(255, 255, 255, ${theme.glassOpacity})`,
          backdropFilter: `blur(${theme.glassBlur}px)`,
          WebkitBackdropFilter: `blur(${theme.glassBlur}px)`,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          zIndex: 1,
        }}
      />
      
      {/* Chess board */}
      <div className="relative z-10">
        <Chessboard
          position={fen}
          onPieceDrop={onDrop}
          boardWidth={560}
          customBoardStyle={customBoardStyle}
          customSquareStyles={customSquareStyles}
          animationDuration={200}
          arePiecesDraggable={!chess.isGameOver()}
        />
      </div>
    </div>
  );
};
