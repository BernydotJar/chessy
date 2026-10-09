import { Chess } from 'chess.js';

/** Pure, deterministic reducer for an instructor-controlled classroom board.
 * No learner-controlled writes or optimistic moves are accepted here.
 * Server-side role enforcement must still be implemented before realtime publication.
 */
export interface ClassroomBoard {
  fen: string;
  initialFen: string;
  moves: string[];
  revision: number;
  locked: boolean;
}
export type ClassroomCommand =
  | { type: 'move'; uci: string; expectedRevision: number }
  | { type: 'reset'; expectedRevision: number }
  | { type: 'set-position'; fen: string; expectedRevision: number }
  | { type: 'lock'; locked: boolean; expectedRevision: number };

export class ClassroomConflict extends Error {
  constructor(message: string) { super(message); this.name = 'ClassroomConflict'; }
}

export function initialClassroomBoard(fen = new Chess().fen()): ClassroomBoard {
  const game = new Chess(fen);
  return { fen: game.fen(), initialFen: game.fen(), moves: [], revision: 0, locked: false };
}

export function applyInstructorCommand(state: ClassroomBoard, command: ClassroomCommand): ClassroomBoard {
  if (!Number.isSafeInteger(command.expectedRevision) || command.expectedRevision !== state.revision) {
    throw new ClassroomConflict('stale-classroom-revision');
  }
  if (state.locked && command.type === 'move') throw new ClassroomConflict('board-locked');
  if (command.type === 'lock') {
    return { ...state, locked: command.locked, revision: state.revision + 1 };
  }
  if (command.type === 'reset') {
    return { ...initialClassroomBoard(state.initialFen), revision: state.revision + 1 };
  }
  if (command.type === 'set-position') {
    const result = initialClassroomBoard(command.fen);
    return { ...result, revision: state.revision + 1 };
  }
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(command.uci)) {
    throw new ClassroomConflict('invalid-uci');
  }
  const game = new Chess(state.fen);
  const previous = game.turn();
  let move;
  try {
    move = game.move({
      from: command.uci.slice(0, 2),
      to: command.uci.slice(2, 4),
      promotion: command.uci[4],
    });
  } catch { throw new ClassroomConflict('illegal-move'); }
  if (!move || (move.color !== previous)) throw new ClassroomConflict('illegal-move');
  return {
    ...state, fen: game.fen(), moves: [...state.moves, move.san],
    revision: state.revision + 1,
  };
}

export function classroomSnapshotValid(candidate: unknown): candidate is ClassroomBoard {
  if (!candidate || typeof candidate !== 'object') return false;
  const value = candidate as Partial<ClassroomBoard>;
  if (typeof value.fen !== 'string' || typeof value.initialFen !== 'string'
    || !Number.isSafeInteger(value.revision) || (value.revision ?? -1) < 0
    || typeof value.locked !== 'boolean' || !Array.isArray(value.moves)
    || value.moves.length > 500 || value.moves.some(move => typeof move !== 'string' || move.length > 20)) return false;
  try {
    const game = new Chess(value.initialFen);
    for (const san of value.moves) game.move(san);
    return game.fen() === value.fen && value.revision! >= value.moves.length;
  } catch { return false; }
}
