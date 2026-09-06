import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard, type ChessboardOptions } from 'react-chessboard';
import { useGameStore } from '../store/gameStore';
import { Square } from 'chess.js';
import { PromotionDialog } from './PromotionDialog';
import { useTranslation } from 'react-i18next';
import { createAccessibleChessPieces } from './accessibleChessPieces';

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
  const accessiblePieces = useMemo(() => createAccessibleChessPieces(t), [t]);

  const onDrop = useCallback((sourceSquare: Square, targetSquare: Square) => {
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
  }, [chess, isAIThinking, isGameOver, makeMove, setPendingPromotion, setupMode]);

  const handlePromotionSelect = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (pendingPromotion) {
      makeMove(pendingPromotion.from, pendingPromotion.to, piece);
      setPendingPromotion(null);
    }
  };

  const onSquareClick = useCallback((square: Square) => {
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
  }, [chess, getLegalMovesForSquare, isAIThinking, isGameOver, onDrop, selectedSquare, setSetupSquare, setupMode, setupSelectedPiece, showLegalMoves]);

  const customBoardStyle = useMemo(() => ({
    borderRadius: '12px',
    boxShadow: `
      0 12px 30px rgba(0, 0, 0, 0.22)
    `,
  }), []);

  useEffect(() => {
    const node = boardRef.current;
    if (!node) return;
    const updateSize = () => setBoardWidth(Math.min(node.clientWidth, 560));
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
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
  const baseSquareStyles = useMemo(() => Object.fromEntries(
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
  ), [theme.darkSquare, theme.lightSquare]);

  // Add highlighted squares for legal moves
  const customSquareStyles = useMemo(() => setupMode
    ? baseSquareStyles
    : {
        ...baseSquareStyles,
        ...Object.fromEntries(
          highlightedSquares.map(square => [
            square,
            {
              ...baseSquareStyles[square],
              backgroundColor: `${baseSquareStyles[square].backgroundColor}dd`,
              boxShadow: 'inset 0 0 0 3px var(--board-legal)',
            },
          ])
        ),
        // Highlight selected square
        ...(selectedSquare ? {
          [selectedSquare]: {
            ...baseSquareStyles[selectedSquare],
            boxShadow: 'inset 0 0 0 3px var(--board-selected)',
          },
        } : {}),
      }, [baseSquareStyles, highlightedSquares, selectedSquare, setupMode]);

  const boardOptions = useMemo<ChessboardOptions>(() => ({
    id: 'play-board',
    boardOrientation: isAIGame ? playerColor : 'white',
    position: setupMode ? setupFen : fen,
    pieces: accessiblePieces,
    onPieceDrop: ({ sourceSquare, targetSquare }) =>
      !!targetSquare && onDrop(sourceSquare as Square, targetSquare as Square),
    onSquareClick: ({ square }) => onSquareClick(square as Square),
    boardStyle: {
      ...customBoardStyle,
      width: '100%',
      height: '100%',
    },
    squareStyles: customSquareStyles,
    animationDurationInMs: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180,
    allowDragging: !isGameOver && !isAIThinking && !setupMode,
    allowDragOffBoard: false,
    allowAutoScroll: false,
    dragActivationDistance: 4,
    draggingPieceGhostStyle: {
      opacity: 0,
    },
    draggingPieceStyle: {
      transform: 'scale(1.04)',
      filter: 'drop-shadow(0 8px 8px rgba(0, 0, 0, 0.34))',
    },
    allowDrawingArrows: true,
    showNotation: false,
  }), [accessiblePieces, customBoardStyle, customSquareStyles, fen, isAIGame, isAIThinking, isGameOver, onDrop, onSquareClick, playerColor, setupFen, setupMode]);

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
        <div className={`relative z-10 h-full w-full ${setupMode ? 'board-setup-disable' : ''}`}>
          <Chessboard options={boardOptions} />
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
