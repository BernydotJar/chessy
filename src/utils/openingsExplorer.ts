export type ExplorerEntry = {
  move: string;
  white: number;
  draw: number;
  black: number;
  sample: number;
  name?: string;
};

type ExplorerMap = Record<string, ExplorerEntry[]>;

export const OPENING_EXPLORER: ExplorerMap = {
  '': [
    { move: 'e2e4', white: 37, draw: 35, black: 28, sample: 10000, name: 'King’s Pawn' },
    { move: 'd2d4', white: 36, draw: 36, black: 28, sample: 9000, name: 'Queen’s Pawn' },
    { move: 'c2c4', white: 35, draw: 38, black: 27, sample: 5000, name: 'English' },
    { move: 'g1f3', white: 34, draw: 40, black: 26, sample: 3000, name: 'Reti' },
  ],
  'e2e4': [
    { move: 'c7c5', white: 35, draw: 33, black: 32, sample: 8000, name: 'Sicilian Defense' },
    { move: 'e7e5', white: 36, draw: 38, black: 26, sample: 7000, name: 'Open Game' },
    { move: 'e7e6', white: 37, draw: 36, black: 27, sample: 4500, name: 'French Defense' },
    { move: 'c7c6', white: 36, draw: 37, black: 27, sample: 3000, name: 'Caro-Kann' },
  ],
  'd2d4': [
    { move: 'd7d5', white: 35, draw: 39, black: 26, sample: 7000, name: 'Queen’s Gambit' },
    { move: 'g8f6', white: 34, draw: 40, black: 26, sample: 6500, name: 'Indian Defenses' },
  ],
  'e2e4 e7e5': [
    { move: 'g1f3', white: 38, draw: 36, black: 26, sample: 6000, name: 'King’s Knight' },
    { move: 'f2f4', white: 39, draw: 30, black: 31, sample: 1200, name: 'King’s Gambit' },
  ],
  'e2e4 c7c5': [
    { move: 'g1f3', white: 36, draw: 34, black: 30, sample: 5200, name: 'Open Sicilian' },
    { move: 'c2c3', white: 35, draw: 36, black: 29, sample: 1600, name: 'Alapin' },
  ],
};

export const getExplorerLines = (uciMoves: string[]): ExplorerEntry[] => {
  const key = uciMoves.join(' ');
  return OPENING_EXPLORER[key] || OPENING_EXPLORER[''] || [];
};
