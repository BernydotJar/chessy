import { create } from 'zustand';
import { Chess } from 'chess.js';
import { BoardTheme, GameState, ThemePreset } from '../types/chess.types';

interface GameStore extends GameState {
  chess: Chess;
  theme: BoardTheme;
  makeMove: (from: string, to: string, promotion?: string) => boolean;
  resetGame: () => void;
  undoMove: () => void;
  setTheme: (theme: BoardTheme) => void;
  loadGame: (fen: string) => void;
}

const defaultTheme: BoardTheme = {
  lightSquare: '#f0d9b5',
  darkSquare: '#b58863',
  glassOpacity: 0.15,
  glassBlur: 10,
};

export const themePresets: ThemePreset[] = [
  {
    name: 'Classic',
    theme: {
      lightSquare: '#f0d9b5',
      darkSquare: '#b58863',
      glassOpacity: 0.15,
      glassBlur: 10,
    },
  },
  {
    name: 'Ocean',
    theme: {
      lightSquare: '#9dd9f3',
      darkSquare: '#4a90a4',
      glassOpacity: 0.2,
      glassBlur: 12,
    },
  },
  {
    name: 'Forest',
    theme: {
      lightSquare: '#c8e6c9',
      darkSquare: '#66bb6a',
      glassOpacity: 0.18,
      glassBlur: 11,
    },
  },
  {
    name: 'Sunset',
    theme: {
      lightSquare: '#ffccbc',
      darkSquare: '#ff7043',
      glassOpacity: 0.22,
      glassBlur: 13,
    },
  },
  {
    name: 'Midnight',
    theme: {
      lightSquare: '#7986cb',
      darkSquare: '#3f51b5',
      glassOpacity: 0.25,
      glassBlur: 15,
    },
  },
  {
    name: 'Rose',
    theme: {
      lightSquare: '#f8bbd0',
      darkSquare: '#ec407a',
      glassOpacity: 0.2,
      glassBlur: 12,
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

export const useGameStore = create<GameStore>((set, get) => ({
  chess: new Chess(),
  fen: new Chess().fen(),
  history: [],
  currentMove: 0,
  isGameOver: false,
  winner: null,
  theme: defaultTheme,
  capturedPieces: { white: [], black: [] },

  makeMove: (from: string, to: string, promotion?: string) => {
    const { chess } = get();
    
    try {
      const move = chess.move({
        from,
        to,
        promotion: promotion || 'q',
      });

      if (move) {
        const newHistory = chess.history();
        const capturedPieces = getCapturedPieces(chess);
        
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
        });
        
        return true;
      }
      return false;
    } catch (error) {
      return false;
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
    });
  },

  undoMove: () => {
    const { chess } = get();
    chess.undo();
    const newHistory = chess.history();
    const capturedPieces = getCapturedPieces(chess);
    
    set({
      fen: chess.fen(),
      history: newHistory,
      currentMove: newHistory.length,
      isGameOver: false,
      winner: null,
      capturedPieces,
    });
  },

  setTheme: (theme: BoardTheme) => {
    set({ theme });
  },

  loadGame: (fen: string) => {
    const newChess = new Chess(fen);
    const capturedPieces = getCapturedPieces(newChess);
    
    set({
      chess: newChess,
      fen: newChess.fen(),
      history: newChess.history(),
      currentMove: newChess.history().length,
      capturedPieces,
    });
  },
}));
