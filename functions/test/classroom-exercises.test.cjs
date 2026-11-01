'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Chess}=require('chess.js');
const {exercises,safeUid,safeUci,applyExerciseMove,createExerciseService}=require('../classroom-exercises.cjs');
class Failure extends Error {constructor(code,message){super(message);this.code=code;}}
const emptyDb=new Proxy({}, {get(){throw new Error('Unexpected database access');}});
const instance=createExerciseService({db:emptyDb,HttpsError:Failure,Timestamp:{}});
const verified={auth:{uid:'coach_001',token:{email_verified:true,chessyRole:'coach'}}};
const goodRoom='A'.repeat(20);
test('Canonical 200-exercise bank is unique, organized into five blocks, and replayable legally',()=>{
  assert.equal(exercises.size,200);
  assert.deepEqual([1,2,3,4,5].map(n=>[...exercises.values()].filter(item=>item.block===n).length),[40,40,40,40,40]);
  for(const puzzle of exercises.values()){
    const game=new Chess(puzzle.fen);
    for(const move of puzzle.solution){
      assert.equal(safeUci(move),true,puzzle.id);
      assert.ok(game.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]}),puzzle.id);
    }
  }
});
test('Correct learner move advances safely, auto-plays replies, and never includes the secret solution',()=>{
  for(const puzzle of exercises.values()){
    let state={fen:puzzle.fen,ply:0,attempts:0,status:'active'};
    for(let index=0;index<puzzle.solution.length;index+=2){
      const result=applyExerciseMove(state,puzzle,puzzle.solution[index]);
      assert.ok(['active','completed'].includes(result.status),puzzle.id);
      assert.ok(!Object.prototype.hasOwnProperty.call(result,'solution'),puzzle.id);
      state={...state,...result};
    }
    assert.equal(state.status,'completed',puzzle.id);
    assert.equal(state.ply,puzzle.solution.length,puzzle.id);
  }
});
test('Wrong move cannot mutate position or leak the solution',()=>{
  const puzzle=exercises.get('rook-file');
  const before={status:'active',fen:puzzle.fen,ply:0,attempts:2};
  const next=applyExerciseMove(before,puzzle,'a1a2');
  assert.equal(next.lastResult,'retry');assert.equal(next.fen,puzzle.fen);assert.equal(next.ply,0);
  assert.equal(next.attempts,3);
  assert.equal(JSON.stringify(next).includes(puzzle.solution[0]),false);
});
test('Malformed JSON and wrong identities are rejected before touching Firestore',async()=>{
  const broken=[null,[],{}, {roomId:[goodRoom],puzzleId:'rook-file',learnerUid:'adult_001'},
    {roomId:goodRoom,puzzleId:['rook-file'],learnerUid:'adult_001'},
    {roomId:goodRoom,puzzleId:'rook-file',learnerUid:['adult_001']},
    {roomId:goodRoom,puzzleId:'unknown',learnerUid:'adult_001'}];
  for(const data of broken)await assert.rejects(()=>instance.assign({...verified,data}),{code:'invalid-argument'});
  for(const data of [null,[],{}, {roomId:goodRoom,uci:['a1a5'],expectedRevision:0},
    {roomId:goodRoom,uci:'a1a5',expectedRevision:[0]},{roomId:goodRoom,uci:'A1A5',expectedRevision:0}])
    await assert.rejects(()=>instance.submit({...verified,data}),{code:'invalid-argument'});
  for(const data of [null,[],{}, {roomId:[goodRoom]}])
    await assert.rejects(()=>instance.end({...verified,data}),{code:'invalid-argument'});
});
test('Verified email and authenticated adult identity are mandatory',async()=>{
  const data={roomId:goodRoom,puzzleId:'rook-file',learnerUid:'adult_001'};
  for(const auth of [null,{uid:'coach_001',token:{email_verified:false,chessyRole:'coach'}},
    {uid:['coach_001'],token:{email_verified:true,chessyRole:'coach'}}])
    await assert.rejects(()=>instance.assign({auth,data}),{code:'unauthenticated'});
});
test('Invalid moves, identities and non-integer revisions are denied',()=>{
  for(const value of [['ab'],{},'../admin', '',null])assert.equal(safeUid(value),false);
  for(const value of [[],{},'a1a9','e2e4qmore','e2E4'])assert.equal(safeUci(value),false);
  const answer=exercises.get('rook-file');
  assert.throws(()=>applyExerciseMove({fen:answer.fen,ply:99,attempts:0,status:'active'},answer,'a1a5'));
});
