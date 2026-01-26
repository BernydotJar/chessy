import { Chess, Move } from 'chess.js';
import { findOpening } from './openings';
import { StockfishService } from './stockfishService';

export type CoachInsight = {
  fen: string;
  moveNumber: number;
  ply: number;
  san: string;
  uci: string;
  openingKey?: string;
  principleKey: string;
  principleParams?: Record<string, string>;
  suggestedSan?: string;
  suggestedUci?: string;
  suggestedPrincipleKey?: string;
  suggestedPrincipleParams?: Record<string, string>;
  evaluation?: {
    labelKey: string;
    labelParams?: Record<string, string | number>;
    delta?: number;
  };
  tips?: Array<{ key: string; params?: Record<string, string> }>;
  lastMoveColor?: 'w' | 'b';
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
  if (lossCp > 120) return 'coach.evaluation.blunder';
  if (lossCp > 50) return 'coach.evaluation.mistake';
  if (lossCp > 15) return 'coach.evaluation.inaccuracy';
  return 'coach.evaluation.good';
};

const getPrincipleForMove = (chess: Chess, move: Move, moveNumber: number) => {
  const pieceKey = getPieceKey(move.piece);
  let principleKey = 'coach.principles.general';
  let principleParams: Record<string, string> = { pieceKey };

  if (move.flags.includes('e')) {
    principleKey = 'coach.principles.enPassant';
  } else if (move.flags.includes('k') || move.flags.includes('q')) {
    principleKey = 'coach.principles.castle';
  } else if (move.piece === 'p' && centerSquares.has(move.to)) {
    principleKey = 'coach.principles.centerPawn';
  } else if (move.piece === 'n' && knightDevSquares.has(move.to) && moveNumber <= 10) {
    principleKey = 'coach.principles.development';
  } else if (move.piece === 'b' && moveNumber <= 10) {
    principleKey = 'coach.principles.development';
  } else if (move.piece === 'q' && moveNumber <= 6 && !move.captured) {
    principleKey = 'coach.principles.earlyQueen';
  } else if (moveNumber >= 8 && isKingUncastled(chess, move.color)) {
    principleKey = 'coach.principles.kingSafety';
  }

  const tips: Array<{ key: string; params?: Record<string, string> }> = [];

  if (move.san.includes('+')) {
    tips.push({ key: 'coach.tips.check' });
  }

  if (move.piece === 'n' && (move.to[0] === 'a' || move.to[0] === 'h')) {
    tips.push({ key: 'coach.tips.knightRim' });
  }

  if (move.piece === 'p' && ['b', 'g'].includes(move.from[0]) && moveNumber <= 8) {
    tips.push({ key: 'coach.tips.fianchetto' });
  }

  if (move.piece === 'p' && ['a', 'h'].includes(move.from[0]) && moveNumber <= 6) {
    tips.push({ key: 'coach.tips.wingPawn' });
  }

  if (move.piece === 'k' && !move.flags.includes('k') && !move.flags.includes('q')) {
    tips.push({ key: 'coach.tips.kingMove' });
  }

  return { principleKey, principleParams, tips };
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
    bestMove: evalBefore.bestMove,
  };
};

export const getCoachInsight = (chess: Chess): CoachInsight | null => {
  const moves = chess.history({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  const lastMove = moves[moves.length - 1];
  const fen = chess.fen();
  const uciMoves = getUciMoves(moves);
  const opening = findOpening(uciMoves);

  const moveNumber = Math.ceil(moves.length / 2);
  const ply = moves.length;
  const san = lastMove.san;
  const uci = `${lastMove.from}${lastMove.to}${lastMove.promotion || ''}`;

  const { principleKey, principleParams, tips } = getPrincipleForMove(chess, lastMove, moveNumber);

  return {
    fen,
    moveNumber,
    ply,
    san,
    uci,
    openingKey: opening?.key,
    principleKey,
    principleParams,
    tips,
    lastMoveColor: lastMove.color,
  };
};

export const getCoachInsightWithEval = async (chess: Chess): Promise<CoachInsight | null> => {
  const insight = getCoachInsight(chess);
  if (!insight) return null;

  const moves = chess.history({ verbose: true }) as Move[];
  const lastMove = moves[moves.length - 1];
  const before = new Chess(chess.fen());
  const undone = before.undo();
  if (!undone) return insight;

  try {
    const evaluation = await evaluateMoveQuality(chess, lastMove);
    if (!evaluation) {
      return insight;
    }

    const lastMoveUci = insight.uci;
    const bestMoveUci = evaluation.bestMove;
    const shouldSuggest = evaluation.labelKey !== 'coach.evaluation.good'
      && typeof bestMoveUci === 'string'
      && bestMoveUci !== lastMoveUci;

    if (shouldSuggest && bestMoveUci) {
      const bestChess = new Chess(before.fen());
      const from = bestMoveUci.slice(0, 2);
      const to = bestMoveUci.slice(2, 4);
      const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
      const bestMove = bestChess.move({ from, to, promotion } as any);
      if (bestMove) {
        const { principleKey: suggestedPrincipleKey, principleParams: suggestedPrincipleParams } =
          getPrincipleForMove(bestChess, bestMove as Move, insight.moveNumber);
        return {
          ...insight,
          evaluation: {
            labelKey: evaluation.labelKey,
            labelParams: evaluation.labelParams,
            delta: evaluation.delta,
          },
          suggestedSan: bestMove.san,
          suggestedUci: bestMoveUci,
          suggestedPrincipleKey,
          suggestedPrincipleParams,
        };
      }
    }

    return {
      ...insight,
      evaluation: {
        labelKey: evaluation.labelKey,
        labelParams: evaluation.labelParams,
        delta: evaluation.delta,
      },
    };
  } catch {
    return insight;
  }
};
