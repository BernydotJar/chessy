import {describe,it,expect} from 'vitest';
import { CLASSROOM_EXERCISES, parseAssignedRoomExercise } from '../src/rooms/exercises';
const example={
  schemaVersion:1,puzzleId:'rook-file',assignedUid:'student_abc',
  fen:'4k3/8/8/p7/8/8/8/R3K3 w - - 0 1',ply:0,status:'active',revision:0,
  attempts:0,lastResult:'assigned',
};
describe('guided chess room model and trusted server catalogue',()=>{
  it('reuses exactly five original practice blocks of forty exercises without order drift',()=>{
    expect(CLASSROOM_EXERCISES).toHaveLength(200);
    expect(new Set(CLASSROOM_EXERCISES.map(item=>item.id)).size).toBe(200);
    expect(CLASSROOM_EXERCISES[0].id).toBe('rook-file');
  });
  it('parses a valid published assignment but strips all untrusted extra fields',()=>{
    expect(parseAssignedRoomExercise({...example,solution:['a1a5'],secret:'private'})).toEqual({
      puzzleId:'rook-file',assignedUid:'student_abc',fen:example.fen,ply:0,status:'active',
      revision:0,attempts:0,lastResult:'assigned'
    });
  });
  it('rejects malformed or arbitrary exercise documents',()=>{
    const invalid=[
      null,[],{}, { ...example,puzzleId:['rook-file']},{...example,puzzleId:'../../credentials'},
      {...example,assignedUid:['student_abc']},{...example,fen:'invalid'},{...example,status:'future'},
      {...example,attempts:[]},{...example,revision:-1},{...example,revision:[0]},
      {...example,ply:99},{...example,lastResult:'unexpected'},
    ];
    for(const value of invalid)expect(parseAssignedRoomExercise(value)).toBeNull();
  });
});
