import { Chess, Move } from 'chess.js';
import { findOpening } from './openings';
import { StockfishService } from './stockfishService';

export type CoachInsight = {
  openingKey?: string;
  principleKey: string;
  principleParams?: Record<string, string>;
  evaluation?: {
    labelKey: string;
    labelParams?: Record<string, string | number>;
    delta?: number;
  };
};

const getUciMoves = (moves: Move[]) =>
  moves.map((move) => `${move.from}${move.to}${move.promotion || ''}`);

const getPieceKey = (piece: string) => {
  switch (piece) {
    case 'p':
      return 'pieces.pawn';
    case 'n':
      return 'pieces.knight';
    case 'b':
      return 'pieces.bishop';
    case 'r':
      return 'pieces.rook';
    case 'q':
      return 'pieces.queen';
    case 'k':
      return 'pieces.king';
    default:
      return 'pieces.pawn';
  }
};

const centerSquares = new Set(['d4', 'e4', 'd5', 'e5']);
const knightDevSquares = new Set(['f3', 'c3', 'f6', 'c6']);

const isKingUncastled = (chess: Chess, color: 'w' | 'b') => {
  const square = color === 'w' ? 'e1' : 'e8';
  const king = chess.get(square);
  return king?.type === 'k' && king?.color === color;
};

const coachEngine = new StockfishService();

const classifyEvaluation = (lossCp: number) => {
  if (lossCp > 200) return 'coach.evaluation.blunder';
  if (lossCp > 100) return 'coach.evaluation.mistake';
  if (lossCp > 30) return 'coach.evaluation.inaccuracy';
  return 'coach.evaluation.good';
};

const evaluateMoveQuality = async (chess: Chess, lastMove: Move) => {
  const before = new Chess(chess.fen());
  const undone = before.undo();
  if (!undone) return null;

  const evalBefore = await coachEngine.evaluatePosition(before.fen(), 12);
  const evalAfter = await coachEngine.evaluatePosition(chess.fen(), 12);

  if (typeof evalAfter.mate === 'number') {
    return {
      labelKey: 'coach.evaluation.mate',
      labelParams: { moves: Math.abs(evalAfter.mate) },
    };
  }

  if (typeof evalBefore.score !== 'number' || typeof evalAfter.score !== 'number') return null;

  const delta = lastMove.color === 'w'
    ? evalAfter.score - evalBefore.score
    : evalBefore.score - evalAfter.score;
  const loss = Math.max(0, -delta);

  return {
    labelKey: classifyEvaluation(loss),
    delta,
  };
};

export const getCoachInsight = (chess: Chess): CoachInsight | null => {
  const moves = chess.history({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  const lastMove = moves[moves.length - 1];
  const uciMoves = getUciMoves(moves);
  const opening = findOpening(uciMoves);

  const moveNumber = Math.ceil(moves.length / 2);
  const pieceKey = getPieceKey(lastMove.piece);

  let principleKey = 'coach.principles.general';
  let principleParams: Record<string, string> = { pieceKey };

  if (lastMove.flags.includes('e')) {
    principleKey = 'coach.principles.enPassant';
  } else if (lastMove.flags.includes('k') || lastMove.flags.includes('q')) {
    principleKey = 'coach.principles.castle';
  } else if (lastMove.piece === 'p' && centerSquares.has(lastMove.to)) {
    principleKey = 'coach.principles.centerPawn';
  } else if (lastMove.piece === 'n' && knightDevSquares.has(lastMove.to) && moveNumber <= 10) {
    principleKey = 'coach.principles.development';
  } else if (lastMove.piece === 'b' && moveNumber <= 10) {
    principleKey = 'coach.principles.development';
  } else if (lastMove.piece === 'q' && moveNumber <= 6 && !lastMove.captured) {
    principleKey = 'coach.principles.earlyQueen';
  } else if (moveNumber >= 8 && isKingUncastled(chess, lastMove.color)) {
    principleKey = 'coach.principles.kingSafety';
  }

  return {
    openingKey: opening?.key,
    principleKey,
    principleParams,
  };
};

export const getCoachInsightWithEval = async (chess: Chess): Promise<CoachInsight | null> => {
  const insight = getCoachInsight(chess);
  if (!insight) return null;

  const moves = chess.history({ verbose: true }) as Move[];
  const lastMove = moves[moves.length - 1];

  try {
    const evaluation = await evaluateMoveQuality(chess, lastMove);
    return {
      ...insight,
      evaluation: evaluation || undefined,
    };
  } catch {
    return insight;
  }
};
