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
    key: 'italianTwoKnights',
    moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6'],
  },
  {
    key: 'italianGiuocoPiano',
    moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5'],
  },
  {
    key: 'italianEvansGambit',
    moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'b2b4'],
  },
  {
    key: 'ruyLopez',
    moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],
  },
  {
    key: 'ruyLopezBerlin',
    moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'g8f6'],
  },
  {
    key: 'scotch',
    moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'd2d4'],
  },
  {
    key: 'sicilian',
    moves: ['e2e4', 'c7c5'],
  },
  {
    key: 'sicilianClassical',
    moves: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'b8c6'],
  },
  {
    key: 'sicilianDragon',
    moves: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'g7g6'],
  },
  {
    key: 'sicilianNajdorf',
    moves: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6'],
  },
  {
    key: 'french',
    moves: ['e2e4', 'e7e6', 'd2d4', 'd7d5'],
  },
  {
    key: 'frenchAdvance',
    moves: ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'e4e5'],
  },
  {
    key: 'frenchTarrasch',
    moves: ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1d2'],
  },
  {
    key: 'caroKann',
    moves: ['e2e4', 'c7c6', 'd2d4', 'd7d5'],
  },
  {
    key: 'caroKannClassical',
    moves: ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'c3e4'],
  },
  {
    key: 'scandinavian',
    moves: ['e2e4', 'd7d5'],
  },
  {
    key: 'alekhine',
    moves: ['e2e4', 'g8f6'],
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
    key: 'queensGambitAccepted',
    moves: ['d2d4', 'd7d5', 'c2c4', 'd5c4'],
  },
  {
    key: 'queensGambitDeclined',
    moves: ['d2d4', 'd7d5', 'c2c4', 'e7e6'],
  },
  {
    key: 'queensGambitOrthodox',
    moves: ['d2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c1g5', 'f8e7'],
  },
  {
    key: 'slav',
    moves: ['d2d4', 'd7d5', 'c2c4', 'c7c6'],
  },
  {
    key: 'london',
    moves: ['d2d4', 'd7d5', 'g1f3', 'g8f6', 'c1f4'],
  },
  {
    key: 'kingsIndian',
    moves: ['d2d4', 'g8f6', 'c2c4', 'g7g6'],
  },
  {
    key: 'kingsIndianMainline',
    moves: ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'f8g7', 'e2e4', 'd7d6'],
  },
  {
    key: 'pirc',
    moves: ['e2e4', 'd7d6', 'd2d4', 'g8f6', 'b1c3', 'g7g6'],
  },
  {
    key: 'grunfeld',
    moves: ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'd7d5'],
  },
  {
    key: 'nimzoIndian',
    moves: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'b1c3', 'f8b4'],
  },
  {
    key: 'catalan',
    moves: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'g2g3'],
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
