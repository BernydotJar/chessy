import { describe, expect, it } from 'vitest';
import { applyInstructorCommand, ClassroomConflict, classroomSnapshotValid, initialClassroomBoard } from '../src/coach/classroomBoard';

describe('classroom board: deterministic host authority', () => {
  it('starts as a valid immutable position and records legal SAN', () => {
    const first = initialClassroomBoard();
    const next = applyInstructorCommand(first, {type:'move',uci:'e2e4',expectedRevision:0});
    expect(first.moves).toEqual([]);
    expect(next.moves).toEqual(['e4']);
    expect(next.revision).toBe(1);
    expect(classroomSnapshotValid(next)).toBe(true);
  });
  it('rejects illegal moves and stale concurrent updates', () => {
    const state = initialClassroomBoard();
    expect(() => applyInstructorCommand(state,{type:'move',uci:'e2e5',expectedRevision:0})).toThrow(ClassroomConflict);
    const progressed = applyInstructorCommand(state,{type:'move',uci:'e2e4',expectedRevision:0});
    expect(() => applyInstructorCommand(progressed,{type:'move',uci:'d2d4',expectedRevision:0})).toThrow('stale-classroom-revision');
  });
  it('prevents moves when instructor locks the board', () => {
    const locked = applyInstructorCommand(initialClassroomBoard(),{type:'lock',locked:true,expectedRevision:0});
    expect(() => applyInstructorCommand(locked,{type:'move',uci:'e2e4',expectedRevision:1})).toThrow('board-locked');
    const open = applyInstructorCommand(locked,{type:'lock',locked:false,expectedRevision:1});
    expect(applyInstructorCommand(open,{type:'move',uci:'e2e4',expectedRevision:2}).moves).toEqual(['e4']);
  });
  it('allows a teacher to reset without maintaining stale move histories', () => {
    const start = initialClassroomBoard();
    const after = applyInstructorCommand(start,{type:'move',uci:'g1f3',expectedRevision:0});
    const reset = applyInstructorCommand(after,{type:'reset',expectedRevision:1});
    expect(reset.moves).toEqual([]);
    expect(reset.fen).toBe(start.fen);
    expect(reset.revision).toBe(2);
    expect(classroomSnapshotValid(reset)).toBe(true);
  });
  it('detects a forged move history or forged fen in student snapshots', () => {
    const state = initialClassroomBoard();
    expect(classroomSnapshotValid({...state, moves:['Qh9']})).toBe(false);
    expect(classroomSnapshotValid({...state, fen:'invalid'})).toBe(false);
  });
  it('supports promotion and instructor selected positions', () => {
    const setup = initialClassroomBoard();
    const set = applyInstructorCommand(setup,{type:'set-position',fen:'8/5P1k/5K2/8/8/8/8/8 w - - 0 1',expectedRevision:0});
    const done = applyInstructorCommand(set,{type:'move',uci:'f7f8q',expectedRevision:1});
    expect(done.moves).toEqual(['f8=Q']);
    expect(classroomSnapshotValid(done)).toBe(true);
  });
});
