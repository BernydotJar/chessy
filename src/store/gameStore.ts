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
  setupMode: boolean;
  setupBoard: Array<Array<SetupPiece>>;
  setupSideToMove: 'w' | 'b';
  setupSelectedPiece: SetupPiece;
  setupFen: string;
  view: 'home' | 'academy' | 'progress' | 'library' | 'play' | 'games' | 'review' | 'analysis' | 'training';
  activeGameId: string | null;
  trainingMode: boolean;
  engineError: boolean;
  endReason: 'resignation' | null;
  resignGame: () => void;

  makeMove: (from: string, to: string, promotion?: string, isAIMove?: boolean) => boolean;
  makeAIMove: () => Promise<void>;
  resetGame: () => void;
  undoMove: () => void;
  setTheme: (theme: BoardTheme) => void;
  loadGame: (fen: string) => void;
  loadPgn: (pgn: string) => void;
  startAIGame: (difficulty: DifficultyLevel, playerColor: 'white' | 'black' | 'random') => void;
  toggleSound: () => void;
  setShowLegalMoves: (show: boolean) => void;
  getLegalMovesForSquare: (square: string) => string[];
  setPendingPromotion: (promotion: { from: string; to: string } | null) => void;
  setSetupMode: (open: boolean) => void;
  setSetupSelectedPiece: (piece: SetupPiece) => void;
  setSetupSideToMove: (side: 'w' | 'b') => void;
  setSetupSquare: (square: string, piece: SetupPiece) => void;
  clearSetupBoard: () => void;
  applySetupBoard: () => { ok: boolean; error?: string };
  loadSetupExample: (fen: string) => void;
  setView: (view: GameStore['view']) => void;
  setActiveGameId: (id: string | null) => void;
  setTrainingMode: (mode: boolean) => void;
}

const defaultTheme: BoardTheme = {
  lightSquare: '#ece6d9',
  darkSquare: '#51766b',
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
  const captured: { white: string[]; black: string[] } = { white: [], black: [] };
  for (const move of chess.history({ verbose: true })) {
    if (move.captured) captured[move.color === 'w' ? 'white' : 'black'].push(move.captured);
  }
  return captured;
};

const playMoveSound = (chess: Chess, moveObj: Move) => {
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

type SetupPiece =
  | 'wK' | 'wQ' | 'wR' | 'wB' | 'wN' | 'wP'
  | 'bK' | 'bQ' | 'bR' | 'bB' | 'bN' | 'bP'
  | null;

const pieceToFen: Record<Exclude<SetupPiece, null>, string> = {
  wK: 'K',
  wQ: 'Q',
  wR: 'R',
  wB: 'B',
  wN: 'N',
  wP: 'P',
  bK: 'k',
  bQ: 'q',
  bR: 'r',
  bB: 'b',
  bN: 'n',
  bP: 'p',
};

const fenToPiece: Record<string, Exclude<SetupPiece, null>> = {
  K: 'wK',
  Q: 'wQ',
  R: 'wR',
  B: 'wB',
  N: 'wN',
  P: 'wP',
  k: 'bK',
  q: 'bQ',
  r: 'bR',
  b: 'bB',
  n: 'bN',
  p: 'bP',
};

const createEmptySetupBoard = (): Array<Array<SetupPiece>> =>
  Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));

const parseFenToSetupBoard = (fen: string) => {
  const board = createEmptySetupBoard();
  const boardPart = fen.split(' ')[0];
  const rows = boardPart.split('/');
  rows.forEach((row, rowIndex) => {
    let col = 0;
    for (const char of row) {
      if (/\d/.test(char)) {
        col += parseInt(char, 10);
      } else {
        board[rowIndex][col] = fenToPiece[char];
        col += 1;
      }
    }
  });
  return board;
};

const boardToFen = (board: Array<Array<SetupPiece>>) => {
  return board
    .map((row) => {
      let empty = 0;
      let fenRow = '';
      row.forEach((cell) => {
        if (!cell) {
          empty += 1;
          return;
        }
        if (empty > 0) {
          fenRow += empty;
          empty = 0;
        }
        fenRow += pieceToFen[cell];
      });
      if (empty > 0) fenRow += empty;
      return fenRow;
    })
    .join('/');
};

const buildSetupFen = (board: Array<Array<SetupPiece>>, side: 'w' | 'b') =>
  `${boardToFen(board)} ${side} - - 0 1`;

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
  setupMode: false,
  setupBoard: createEmptySetupBoard(),
  setupSideToMove: 'w',
  setupSelectedPiece: 'wP',
  setupFen: '8/8/8/8/8/8/8/8 w - - 0 1',
  view: 'home',
  activeGameId: null,
  trainingMode: false,
  engineError: false, endReason: null,

  makeMove: (from: string, to: string, promotion?: string, isAIMove: boolean = false) => {
    const { chess, isAIGame, playerColor, isAIThinking, trainingMode } = get();
    
    // Prevent moves during AI thinking
    if (get().isGameOver || (isAIThinking && !isAIMove)) return false;
    
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
        if (isAIGame && !trainingMode && !chess.isGameOver() && chess.turn() === aiTurn) {
          setTimeout(() => {
            if (get().chess === chess) void get().makeAIMove();
          }, 500);
        }
        
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  makeAIMove: async () => {
    const { chess, aiDifficulty, isAIGame, playerColor } = get();
    const aiTurn = playerColor === 'white' ? 'b' : 'w';
    
    if (!isAIGame || get().isGameOver || get().isAIThinking || chess.isGameOver() || chess.turn() !== aiTurn) return;
    
    set({ isAIThinking: true, engineError: false });
    
    try {
      const position = chess.fen();
      const aiMove: AIMove | null = await stockfishService.getBestMove(position, aiDifficulty);
      if (get().chess !== chess || get().fen !== position || !get().isAIGame || get().isGameOver) return;

      if (aiMove) {
        get().makeMove(aiMove.from, aiMove.to, aiMove.promotion, true);
        return;
      }

      set({ engineError: true });
    } catch {
      if (get().chess === chess && get().isAIGame && !get().isGameOver) set({ engineError: true });
    } finally {
      if (get().chess === chess) set({ isAIThinking: false });
    }
  },

  startAIGame: (difficulty: DifficultyLevel, playerColor: 'white' | 'black' | 'random') => {
    stockfishService.terminate();
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
      endReason: null, engineError: false, activeGameId: null,
      capturedPieces: { white: [], black: [] },
      aiDifficulty: difficulty,
      isAIGame: true,
      trainingMode: false, setupMode: false, pendingPromotion: null, view: 'play',
      playerColor: actualColor,
      isAIThinking: false,
    });
    
    soundManager.play('gameStart');
    
    // If player chose black, AI moves first
    if (actualColor === 'black') {
      setTimeout(() => {
        if (get().chess === newChess) void get().makeAIMove();
      }, 1000);
    }
  },

  resignGame: () => {
    const state = get();
    stockfishService.terminate();
    set({isGameOver:true,isAIThinking:false,endReason:'resignation',winner:state.isAIGame ? (state.playerColor==='white'?'black':'white') : (state.chess.turn()==='w'?'black':'white')});
  },
  resetGame: () => {
    stockfishService.terminate();
    const newChess = new Chess();
    set({
      chess: newChess,
      fen: newChess.fen(),
      history: [],
      currentMove: 0,
      isGameOver: false,
      winner: null,
      endReason: null, engineError: false, activeGameId: null,
      capturedPieces: { white: [], black: [] },
      isAIGame: false,
      playerColor: 'white',
      isAIThinking: false,
      legalMoves: [],
      pendingPromotion: null,
    });
    soundManager.play('gameStart');
  },

  undoMove: () => {
    const { chess, isAIGame, isAIThinking, playerColor } = get();
    if (isAIThinking) return;
    if (isAIGame) {
      const human = playerColor === 'white' ? 'w' : 'b';
      const moves = chess.history({ verbose: true });
      if (!moves.some(move => move.color === human)) return;
      chess.undo();
      if (chess.turn() !== human) chess.undo();
    } else {
      if (chess.history().length === 0) return;
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
      endReason: null, engineError: false, activeGameId: null,
      capturedPieces,
      legalMoves: [],
    });
  },

  setTheme: (theme: BoardTheme) => {
    set({ theme });
  },

  loadGame: (fen: string) => {
    stockfishService.terminate();
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
      isAIGame: false, isAIThinking: false, pendingPromotion: null, endReason: null, engineError: false, activeGameId: null,
      capturedPieces,
      isGameOver,
      winner,
      legalMoves: [],
    });
  },

  loadPgn: (pgn: string) => {
    stockfishService.terminate();
    const newChess = new Chess();
    newChess.loadPgn(pgn);
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
      isAIGame: false, isAIThinking: false, pendingPromotion: null, endReason: null, engineError: false, activeGameId: null,
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

  setSetupMode: (open: boolean) => {
    if (open) {
      const { fen } = get();
      const setupBoard = parseFenToSetupBoard(fen);
      const side = fen.split(' ')[1] === 'b' ? 'b' : 'w';
      set({
        setupMode: true,
        setupBoard,
        setupSideToMove: side,
        setupSelectedPiece: 'wP',
        setupFen: buildSetupFen(setupBoard, side),
      });
      return;
    }
    set({ setupMode: false });
  },

  setSetupSelectedPiece: (piece: SetupPiece) => {
    set({ setupSelectedPiece: piece });
  },

  setSetupSideToMove: (side: 'w' | 'b') => {
    const { setupBoard } = get();
    set({
      setupSideToMove: side,
      setupFen: buildSetupFen(setupBoard, side),
    });
  },

  setSetupSquare: (square: string, piece: SetupPiece) => {
    const { setupBoard, setupSideToMove } = get();
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1], 10);
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return;
    const next = setupBoard.map((row) => row.slice());
    next[rank][file] = piece;
    set({
      setupBoard: next,
      setupFen: buildSetupFen(next, setupSideToMove),
    });
  },

  clearSetupBoard: () => {
    const { setupSideToMove } = get();
    const empty = createEmptySetupBoard();
    set({
      setupBoard: empty,
      setupFen: buildSetupFen(empty, setupSideToMove),
    });
  },

  applySetupBoard: () => {
    const { setupBoard, setupSideToMove } = get();
    const flat = setupBoard.flat();
    const hasWhiteKing = flat.includes('wK');
    const hasBlackKing = flat.includes('bK');
    if (!hasWhiteKing || !hasBlackKing) {
      return { ok: false, error: 'kings' };
    }
    const fen = buildSetupFen(setupBoard, setupSideToMove);
    try {
      get().loadGame(fen);
      set({ setupMode: false });
      return { ok: true };
    } catch {
      return { ok: false, error: 'invalid' };
    }
  },

  loadSetupExample: (fen: string) => {
    const setupBoard = parseFenToSetupBoard(fen);
    const side = fen.split(' ')[1] === 'b' ? 'b' : 'w';
    set({
      setupBoard,
      setupSideToMove: side,
      setupFen: buildSetupFen(setupBoard, side),
    });
  },

  setView: (view) => {
    set({ view });
    if (typeof window !== 'undefined' && window.location.hash !== '#/'+view) window.location.hash='/'+view;
  },
  setActiveGameId: (id) => set({ activeGameId: id }),
  setTrainingMode: (mode) => set({ trainingMode: mode }),
}));
