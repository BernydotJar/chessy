import { Square } from 'chess.js';

export interface BoardTheme {
  lightSquare: string;
  darkSquare: string;
  glassOpacity: number;
  glassBlur: number;
}

export interface GameState {
  fen: string;
  history: string[];
  currentMove: number;
  isGameOver: boolean;
  winner: 'white' | 'black' | 'draw' | null;
  capturedPieces: {
    white: string[];
    black: string[];
  };
}

export interface Move {
  from: Square;
  to: Square;
  promotion?: string;
  piece: string;
  captured?: string;
  san: string;
  timestamp: Date;
}

export interface ThemePreset {
  name: string;
  theme: BoardTheme;
}

export interface GameSettings {
  playerColor: 'white' | 'black' | 'random';
  timeControl: {
    enabled: boolean;
    minutes: number;
    increment: number;
  };
  soundEnabled: boolean;
  showLegalMoves: boolean;
  autoQueen: boolean;
}
