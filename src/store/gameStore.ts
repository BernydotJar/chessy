import { create } from 'zustand';
import { Chess, Move, Square } from 'chess.js';
import { BoardTheme, GameState, ThemePreset } from '../types/chess.types';
import { stockfishService, DifficultyLevel, AIMove } from '../utils/stockfishService';
import { soundManager } from '../utils/soundManager';

interface GameStore extends GameState {
  chess: Chess;
  theme: BoardTheme;
  aiDifficulty: DifficultyLevel;
  isAIGame: boolean;
  isAIThinking: boolean;
  playerColor: 'white' | 'black';
  soundEnabled: boolean;
  showLegalMoves: boolean;
  legalMoves: string[];
  pendingPromotion: { from: string; to: string } | null;
  
  makeMove: (from: string, to: string, promotion?: string, isAIMove?: boolean) => boolean;
  makeAIMove: () => Promise<void>;
  resetGame: () => void;
  undoMove: () => void;
  setTheme: (theme: BoardTheme) => void;
  loadGame: (fen: string) => void;
  startAIGame: (difficulty: DifficultyLevel, playerColor: 'white' | 'black' | 'random') => void;
  toggleSound: () => void;
  setShowLegalMoves: (show: boolean) => void;
  getLegalMovesForSquare: (square: string) => string[];
  setPendingPromotion: (promotion: { from: string; to: string } | null) => void;
}

const defaultTheme: BoardTheme = {
  lightSquare: '#bfe7ff',
  darkSquare: '#2f6fb8',
  glassOpacity: 0.16,
  glassBlur: 11,
};

export const themePresets: ThemePreset[] = [
  {
    name: 'Guatemala',
    theme: {
      lightSquare: '#bfe7ff',
      darkSquare: '#2f6fb8',
      glassOpacity: 0.16,
      glassBlur: 11,
    },
  },
  {
    name: 'Colombia',
    theme: {
      lightSquare: '#f6d369',
      darkSquare: '#1f4e9e',
      glassOpacity: 0.17,
      glassBlur: 11,
    },
  },
  {
    name: 'México',
    theme: {
      lightSquare: '#f4f4f4',
      darkSquare: '#0f6b3e',
      glassOpacity: 0.16,
      glassBlur: 11,
    },
  },
  {
    name: 'Brasil',
    theme: {
      lightSquare: '#f7d14b',
      darkSquare: '#1e7a3b',
      glassOpacity: 0.17,
      glassBlur: 11,
    },
  },
  {
    name: 'USA',
    theme: {
      lightSquare: '#f5f6fb',
      darkSquare: '#294b9a',
      glassOpacity: 0.16,
      glassBlur: 11,
    },
  },
];

const getCapturedPieces = (chess: Chess) => {
  const capturedWhite: string[] = [];
  const capturedBlack: string[] = [];
  
  const pieceCount: { [key: string]: number } = {
    p: 8, n: 2, b: 2, r: 2, q: 1, k: 1,
  };
  
  const currentPieces = chess.board().flat().filter(p => p !== null);
  
  const whitePieces = currentPieces.filter(p => p?.color === 'w');
  const blackPieces = currentPieces.filter(p => p?.color === 'b');
  
  for (const [piece, count] of Object.entries(pieceCount)) {
    const whiteCount = whitePieces.filter(p => p?.type === piece).length;
    const blackCount = blackPieces.filter(p => p?.type === piece).length;
    
    const whiteCaptured = count - whiteCount;
    const blackCaptured = count - blackCount;
    
    for (let i = 0; i < whiteCaptured; i++) {
      capturedBlack.push(piece);
    }
    for (let i = 0; i < blackCaptured; i++) {
      capturedWhite.push(piece);
    }
  }
  
  return { white: capturedWhite, black: capturedBlack };
};

const playMoveSound = (chess: Chess, moveObj: any) => {
  if (chess.isCheckmate()) {
    soundManager.play('checkmate');
  } else if (chess.isCheck()) {
    soundManager.play('check');
  } else if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
    soundManager.play('castle');
  } else if (moveObj.captured) {
    soundManager.play('capture');
  } else {
    soundManager.play('move');
  }
};

export const useGameStore = create<GameStore>((set, get) => ({
  chess: new Chess(),
  fen: new Chess().fen(),
  history: [],
  currentMove: 0,
  isGameOver: false,
  winner: null,
  theme: defaultTheme,
  capturedPieces: { white: [], black: [] },
  aiDifficulty: 'medium',
  isAIGame: false,
  isAIThinking: false,
  playerColor: 'white',
  soundEnabled: true,
  showLegalMoves: true,
  legalMoves: [],
  pendingPromotion: null,

  makeMove: (from: string, to: string, promotion?: string, isAIMove: boolean = false) => {
    const { chess, isAIGame, playerColor, isAIThinking } = get();
    
    // Prevent moves during AI thinking
    if (isAIThinking && !isAIMove) return false;
    
    // In AI game, prevent moves when it's not player's turn
    if (isAIGame && !isAIMove) {
      const currentTurn = chess.turn();
      const playerTurn = playerColor === 'white' ? 'w' : 'b';
      if (currentTurn !== playerTurn) return false;
    }
    
    try {
      const moveObj = chess.move({
        from,
        to,
        promotion: promotion || 'q',
      });

      if (moveObj) {
        const newHistory = chess.history();
        const capturedPieces = getCapturedPieces(chess);
        
        // Play sound
        playMoveSound(chess, moveObj);
        
        set({
          fen: chess.fen(),
          history: newHistory,
          currentMove: newHistory.length,
          isGameOver: chess.isGameOver(),
          winner: chess.isCheckmate()
            ? chess.turn() === 'w'
              ? 'black'
              : 'white'
            : chess.isDraw()
            ? 'draw'
            : null,
          capturedPieces,
          legalMoves: [],
        });
        
        // If AI game and it's now AI's turn, trigger AI move
        const aiTurn = playerColor === 'white' ? 'b' : 'w';
        if (isAIGame && !chess.isGameOver() && chess.turn() === aiTurn) {
          setTimeout(() => {
            get().makeAIMove();
          }, 500);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  makeAIMove: async () => {
    const { chess, aiDifficulty, isAIGame, playerColor } = get();
    const aiTurn = playerColor === 'white' ? 'b' : 'w';
    
    if (!isAIGame || chess.isGameOver() || chess.turn() !== aiTurn) return;
    
    set({ isAIThinking: true });
    
    try {
      const aiMove: AIMove | null = await stockfishService.getBestMove(chess.fen(), aiDifficulty);

      if (aiMove) {
        get().makeMove(aiMove.from, aiMove.to, aiMove.promotion, true);
        return;
      }

      const fallbackMoves = chess.moves({ verbose: true }) as Move[];
      if (fallbackMoves.length > 0) {
        const randomMove = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
        get().makeMove(randomMove.from, randomMove.to, randomMove.promotion, true);
      }
    } catch (error) {
      console.error('AI move error:', error);
      const fallbackMoves = chess.moves({ verbose: true }) as Move[];
      if (fallbackMoves.length > 0) {
        const randomMove = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)];
        get().makeMove(randomMove.from, randomMove.to, randomMove.promotion, true);
      }
    } finally {
      set({ isAIThinking: false });
    }
  },

  startAIGame: (difficulty: DifficultyLevel, playerColor: 'white' | 'black' | 'random') => {
    const actualColor = playerColor === 'random' 
      ? Math.random() > 0.5 ? 'white' : 'black'
      : playerColor;
    
    const newChess = new Chess();
    
    set({
      chess: newChess,
      fen: newChess.fen(),
      history: [],
      currentMove: 0,
      isGameOver: false,
      winner: null,
      capturedPieces: { white: [], black: [] },
      aiDifficulty: difficulty,
      isAIGame: true,
      playerColor: actualColor,
      isAIThinking: false,
    });
    
    soundManager.play('gameStart');
    
    // If player chose black, AI moves first
    if (actualColor === 'black') {
      setTimeout(() => {
        get().makeAIMove();
      }, 1000);
    }
  },

  resetGame: () => {
    const newChess = new Chess();
    set({
      chess: newChess,
      fen: newChess.fen(),
      history: [],
      currentMove: 0,
      isGameOver: false,
      winner: null,
      capturedPieces: { white: [], black: [] },
      isAIGame: false,
      isAIThinking: false,
      legalMoves: [],
      pendingPromotion: null,
    });
    soundManager.play('gameStart');
  },

  undoMove: () => {
    const { chess, isAIGame } = get();
    
    // In AI game, undo both player and AI move
    if (isAIGame) {
      chess.undo(); // Undo AI move
      chess.undo(); // Undo player move
    } else {
      chess.undo();
    }
    
    const newHistory = chess.history();
    const capturedPieces = getCapturedPieces(chess);
    
    set({
      fen: chess.fen(),
      history: newHistory,
      currentMove: newHistory.length,
      isGameOver: false,
      winner: null,
      capturedPieces,
      legalMoves: [],
    });
  },

  setTheme: (theme: BoardTheme) => {
    set({ theme });
  },

  loadGame: (fen: string) => {
    const newChess = new Chess(fen);
    const capturedPieces = getCapturedPieces(newChess);
    const isGameOver = newChess.isGameOver();
    const winner = newChess.isCheckmate()
      ? newChess.turn() === 'w'
        ? 'black'
        : 'white'
      : newChess.isDraw()
      ? 'draw'
      : null;

    set({
      chess: newChess,
      fen: newChess.fen(),
      history: newChess.history(),
      currentMove: newChess.history().length,
      capturedPieces,
      isGameOver,
      winner,
      legalMoves: [],
    });
  },

  toggleSound: () => {
    const enabled = !get().soundEnabled;
    set({ soundEnabled: enabled });
    soundManager.setEnabled(enabled);
  },

  setShowLegalMoves: (show: boolean) => {
    set({ showLegalMoves: show });
  },

  getLegalMovesForSquare: (square: string) => {
    const { chess } = get();
    const moves = chess.moves({ square: square as Square, verbose: true }) as Move[];
    return moves.map(move => move.to);
  },

  setPendingPromotion: (promotion: { from: string; to: string } | null) => {
    set({ pendingPromotion: promotion });
  },
}));
