import { describe, expect, it } from 'vitest';
import { applyInstructorCommand, initialClassroomBoard } from '../src/coach/classroomBoard';
import { validateRemoteClassroomBoard } from '../src/coach/liveBoardCloud';

const session = () => ({ ...initialClassroomBoard(), ownerUid: 'coach_123', schemaVersion: 1 });

describe('authoritative classroom snapshot validation', () => {
  it('accepts an instructor board with canonical initial FEN and zero revision', () => {
    expect(validateRemoteClassroomBoard(session())).toMatchObject({
      ownerUid: 'coach_123',
      moves: [],
      revision: 0,
    });
  });
  it('replays a valid multi-move instructor lesson in order', () => {
    let board = initialClassroomBoard();
    for (const uci of ['e2e4', 'e7e5', 'g1f3', 'b8c6']) {
      board = applyInstructorCommand(board, { type: 'move', uci, expectedRevision: board.revision });
    }
    expect(validateRemoteClassroomBoard({ ...board, ownerUid:'coach_123', schemaVersion:1 }).moves)
      .toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });
  it('rejects forged move histories and an impossible position despite matching schema', () => {
    const value = session();
    expect(() => validateRemoteClassroomBoard({ ...value, moves: ['Qh9'] }))
      .toThrow('invalid-classroom-snapshot');
    expect(() => validateRemoteClassroomBoard({ ...value, fen: 'invalid fen' }))
      .toThrow('invalid-classroom-snapshot');
  });
  it('rejects forged owners, negative revisions, or an unsupported schema', () => {
    const value = session();
    for (const invalid of [
      { ...value, ownerUid:'../../admin' },
      { ...value, revision:-1 },
      { ...value, schemaVersion:999 },
      { ...value, revision:0.5 },
    ]) expect(() => validateRemoteClassroomBoard(invalid)).toThrow('invalid-classroom-snapshot');
  });
  it('supports an instructor reset and rejects stale snapshots with too few revisions', () => {
    const start = session();
    const moved = applyInstructorCommand(start, {type:'move', uci:'e2e4',expectedRevision:0});
    const reset = applyInstructorCommand(moved, {type:'reset',expectedRevision:1});
    expect(validateRemoteClassroomBoard({ ...reset, ownerUid:'coach_123', schemaVersion:1 }).revision).toBe(2);
    expect(() => validateRemoteClassroomBoard({
      ...moved, ownerUid:'coach_123',schemaVersion:1,revision:0,
    })).toThrow('invalid-classroom-snapshot');
  });
});
