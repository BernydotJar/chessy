export type OpeningMatch = {
  key: string;
  moves: string[];
};

const OPENINGS: OpeningMatch[] = [
  {
    key: 'italian',
    moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
  },
  {
    key: 'ruyLopez',
    moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],
  },
  {
    key: 'sicilian',
    moves: ['e2e4', 'c7c5'],
  },
  {
    key: 'french',
    moves: ['e2e4', 'e7e6', 'd2d4', 'd7d5'],
  },
  {
    key: 'caroKann',
    moves: ['e2e4', 'c7c6', 'd2d4', 'd7d5'],
  },
  {
    key: 'scandinavian',
    moves: ['e2e4', 'd7d5'],
  },
  {
    key: 'petrov',
    moves: ['e2e4', 'e7e5', 'g1f3', 'g8f6'],
  },
  {
    key: 'philidor',
    moves: ['e2e4', 'e7e5', 'g1f3', 'd7d6'],
  },
  {
    key: 'queensGambit',
    moves: ['d2d4', 'd7d5', 'c2c4'],
  },
  {
    key: 'queensGambitDeclined',
    moves: ['d2d4', 'd7d5', 'c2c4', 'e7e6'],
  },
  {
    key: 'kingsIndian',
    moves: ['d2d4', 'g8f6', 'c2c4', 'g7g6'],
  },
  {
    key: 'english',
    moves: ['c2c4'],
  },
];

export const findOpening = (uciMoves: string[]): OpeningMatch | null => {
  let best: OpeningMatch | null = null;

  for (const opening of OPENINGS) {
    const matches = opening.moves.every((move, idx) => uciMoves[idx] === move);
    if (matches) {
      if (!best || opening.moves.length > best.moves.length) {
        best = opening;
      }
    }
  }

  return best;
};
