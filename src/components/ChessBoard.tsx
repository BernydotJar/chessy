import { useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { useGameStore } from '../store/gameStore';
import { Square } from 'chess.js';
import { PromotionDialog } from './PromotionDialog';
import { useTranslation } from 'react-i18next';

export const ChessBoard: React.FC = () => {
  const { 
    fen,
    makeMove, 
    theme, 
    chess, 
    showLegalMoves, 
    getLegalMovesForSquare,
    pendingPromotion,
    setPendingPromotion,
    isAIThinking,
    isGameOver,
    setupMode,
    setupFen,
    setupSelectedPiece,
    setSetupSquare, playerColor, isAIGame
  } = useGameStore();
  
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [boardWidth, setBoardWidth] = useState(560);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    if (setupMode || isAIThinking || isGameOver) return false;
    if (!chess.moves({ square: sourceSquare, verbose: true }).some(m => m.to === targetSquare)) return false;
    // Check if the move requires promotion
    const piece = chess.get(sourceSquare);
    const isPromotion =
      piece?.type === 'p' &&
      ((piece.color === 'w' && targetSquare[1] === '8') ||
        (piece.color === 'b' && targetSquare[1] === '1'));

    if (isPromotion) {
      // Open promotion dialog
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      return false; // Don't make the move yet
    }

    return makeMove(sourceSquare, targetSquare);
  };

  const handlePromotionSelect = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (pendingPromotion) {
      makeMove(pendingPromotion.from, pendingPromotion.to, piece);
      setPendingPromotion(null);
    }
  };

  const onSquareClick = (square: Square) => {
    if (isAIThinking || isGameOver) return;
    if (setupMode) {
      setSetupSquare(square, setupSelectedPiece);
      return;
    }

    if (selectedSquare === square) {
      // Deselect
      setSelectedSquare(null);
      setHighlightedSquares([]);
      return;
    }

    const piece = chess.get(square);
    
    // If a piece is selected and we click on another square
    if (selectedSquare) {
      onDrop(selectedSquare as Square, square);
      setSelectedSquare(null);
      setHighlightedSquares([]);
      return;
    }

    // Select piece and show legal moves
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      const legalMoves = getLegalMovesForSquare(square);
      setHighlightedSquares(showLegalMoves ? legalMoves : []);
    }
  };

  const customBoardStyle = {
    borderRadius: '12px',
    boxShadow: `
      0 8px 32px 0 rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `,
  };

  useEffect(() => {
    const updateSize = () => {
      if (!boardRef.current) return;
      const maxSize = 560;
      const width = Math.min(boardRef.current.clientWidth, maxSize);
      setBoardWidth(width);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const files = useMemo(() => isAIGame && playerColor === 'black' ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'], [isAIGame, playerColor]);
  const ranks = useMemo(() => isAIGame && playerColor === 'black' ? ['1','2','3','4','5','6','7','8'] : ['8','7','6','5','4','3','2','1'], [isAIGame, playerColor]);
  const setupSquares = useMemo(
    () => ranks.flatMap((rank) => files.map((file) => `${file}${rank}` as Square)),
    [files, ranks]
  );

  useEffect(() => {
    if (!setupMode) return;
    setSelectedSquare(null);
    setHighlightedSquares([]);
  }, [setupMode]);

  // Custom square styles for board colors
  const baseSquareStyles = Object.fromEntries(
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
  );

  // Add highlighted squares for legal moves
  const customSquareStyles = setupMode
    ? baseSquareStyles
    : {
        ...baseSquareStyles,
        ...Object.fromEntries(
          highlightedSquares.map(square => [
            square,
            {
              ...baseSquareStyles[square],
              backgroundColor: `${baseSquareStyles[square].backgroundColor}dd`,
              boxShadow: 'inset 0 0 0 3px rgba(255, 255, 0, 0.5)',
            },
          ])
        ),
        // Highlight selected square
        ...(selectedSquare ? {
          [selectedSquare]: {
            ...baseSquareStyles[selectedSquare],
            boxShadow: 'inset 0 0 0 3px rgba(100, 200, 255, 0.7)',
          },
        } : {}),
      };

  return (
    <>
      {setupMode && (
        <div className="board-setup-banner">
          <span className="board-setup-banner__title">{t('setup.mode')}</span>
          <span className="board-setup-banner__hint">{t('setup.hint')}</span>
        </div>
      )}

      <div className={`relative board-shell ${setupMode ? 'board-shell--setup' : ''}`} ref={boardRef} style={{ height: boardWidth }}>
        {/* AI Thinking Overlay */}
        {isAIThinking && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-xl">
            <div className="glass-card px-6 py-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="spinner" />
                <span className="text-white font-semibold">{t('ai.thinking')}</span>
              </div>
            </div>
          </div>
        )}

        <div className="board-notation board-notation--left">
          {ranks.map((rank) => (
            <span key={rank} className="board-notation__label">{rank}</span>
          ))}
        </div>
        <div className="board-notation board-notation--bottom">
          {files.map((file) => (
            <span key={file} className="board-notation__label">{file}</span>
          ))}
        </div>

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
        <div className={`relative z-10 ${setupMode ? 'board-setup-disable' : ''}`}>
          <Chessboard
            boardOrientation={isAIGame ? playerColor : 'white'}
            position={setupMode ? setupFen : fen}
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            boardWidth={boardWidth}
            customBoardStyle={customBoardStyle}
            customSquareStyles={customSquareStyles}
            animationDuration={window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220}
            arePiecesDraggable={!isGameOver && !isAIThinking && !setupMode}
            areArrowsAllowed={true}
            showBoardNotation={false}
          />
        </div>

        {setupMode && (
          <div className="board-setup-overlay">
            {setupSquares.map((square) => (
              <button
                key={square}
                className="board-setup-cell"
                onClick={() => setSetupSquare(square, setupSelectedPiece)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const data = event.dataTransfer.getData('text/plain');
                  if (!data) return;
                  if (data === 'erase') {
                    setSetupSquare(square, null);
                    return;
                  }
                  if (/^[wb][KQRBNP]$/.test(data)) setSetupSquare(square, data as Exclude<typeof setupSelectedPiece, null>);
                }}
                aria-label={square}
              />
            ))}
          </div>
        )}

      </div>

      {/* Promotion Dialog */}
      <PromotionDialog
        isOpen={!!pendingPromotion}
        color={chess.turn()}
        onSelect={handlePromotionSelect}
        onClose={() => setPendingPromotion(null)}
      />
    </>
  );
};
