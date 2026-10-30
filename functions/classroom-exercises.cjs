'use strict';
const {Chess}=require('chess.js');
const {DAY,isSafeId,rateNext}=require('./policy.cjs');
const bank=require('./classroom-exercise-bank.json');
const exercises=new Map(bank.map(item=>[item.id,item]));
const safeUid=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{3,128}$/.test(value);
const safeUci=value=>typeof value==='string'&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value);
const expiry=value=>typeof value?.toMillis==='function'?value.toMillis():0;
const safeRevision=value=>Number.isSafeInteger(value)&&value>=0&&value<=1000000;
function applyExerciseMove(exercise,answer,uci) {
  if(exercise.status!=='active'||!safeRevision(exercise.ply)||exercise.ply>=answer.solution.length)
    throw new Error('invalid-exercise-state');
  const expected=answer.solution[exercise.ply];
  const game=new Chess(exercise.fen);
  if(uci!==expected) return {fen:exercise.fen,ply:exercise.ply,status:'active',lastResult:'retry',attempts:exercise.attempts+1};
  game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
  let next=exercise.ply+1;
  if(next<answer.solution.length){
    const response=answer.solution[next];
    game.move({from:response.slice(0,2),to:response.slice(2,4),promotion:response[4]});
    next++;
  }
  return {fen:game.fen(),ply:next,status:next===answer.solution.length?'completed':'active',
    lastResult:next===answer.solution.length?'completed':'correct',attempts:exercise.attempts};
}
function createExerciseService({db,Timestamp,HttpsError,clock=Date.now}){
  const fail=(code,message)=>{throw new HttpsError(code,message);};
  const stamped=ms=>Timestamp.fromMillis(ms);
  const principal=request=>{
    const a=request.auth;
    if(!a||a.token?.email_verified!==true||!safeUid(a.uid))fail('unauthenticated','Verified adult account required');
    return a;
  };
  const roomPath=id=>'learningRooms/'+id;
  const exercisePath=id=>roomPath(id)+'/exercise/current';
  const signalPath=id=>roomPath(id)+'/exercise/announcement';
  async function roomAccess(tx,roomId,a){
    const ref=db.doc(roomPath(roomId));
    const room=(await tx.get(ref)).data();
    if(!room||room.status!=='active'||room.audience!=='adults'||expiry(room.expiresAt)<=clock())
      fail('permission-denied','Active adult classroom required');
    return room;
  }
  function requireCoach(room,a){
    if(room.ownerUid!==a.uid||!['coach','admin'].includes(a.token.chessyRole))
      fail('permission-denied','Instructor required');
  }
  async function adultMember(tx,roomId,uid){
    const member=(await tx.get(db.doc(roomPath(roomId)+'/members/'+uid))).data();
    if(!member||member.ageBand!=='adult'||expiry(member.expiresAt)<=clock())
      fail('permission-denied','Adult member required');
    return member;
  }
  async function charge(tx,uid,kind,count,windowMs){
    const ref=db.doc('roomRateLimits/'+uid+'_exercise_'+kind);
    const previous=(await tx.get(ref)).data();
    const next=rateNext(previous,clock(),{count,windowMs});
    if(!next)fail('resource-exhausted','Exercise action limit reached');
    return ()=>tx.set(ref,{schemaVersion:1,...next,expiresAt:stamped(clock()+windowMs+DAY)});
  }
  function fields(data,required){
    if(!data||typeof data!=='object'||Array.isArray(data)||!isSafeId(data.roomId)||
      required.some(key=>!Object.prototype.hasOwnProperty.call(data,key)))
      fail('invalid-argument','Malformed classroom request');
    return data.roomId;
  }
  async function assign(request) {
    const a=principal(request),roomId=fields(request.data,['puzzleId','learnerUid']);
    const {puzzleId,learnerUid}=request.data;
    if(typeof puzzleId!=='string'||!exercises.has(puzzleId)||!safeUid(learnerUid))
      fail('invalid-argument','Invalid exercise or learner');
    const puzzle=exercises.get(puzzleId),ref=db.doc(exercisePath(roomId));
    await db.runTransaction(async tx=>{
      const room=await roomAccess(tx,roomId,a);
      requireCoach(room,a);
      if(learnerUid===a.uid)fail('invalid-argument','Select a learner');
      await adultMember(tx,roomId,learnerUid);
      const existing=await tx.get(ref),chargeRate=await charge(tx,a.uid,'assign',100,DAY);
      const revision=existing.exists?existing.data().revision+1:0;
      if(!safeRevision(revision))fail('failed-precondition','Exercise revision unavailable');
      chargeRate();
      tx.set(ref,{schemaVersion:1,puzzleId,assignedUid:learnerUid,fen:puzzle.fen,
        ply:0,status:'active',revision,attempts:0,lastResult:'assigned',
        createdAt:stamped(clock()),updatedAt:stamped(clock()),expiresAt:room.expiresAt});
      tx.set(db.doc(signalPath(roomId)),{schemaVersion:1,revision,status:'active',updatedAt:stamped(clock())});
    });
    return {assigned:true};
  }
  async function submit(request){
    const a=principal(request),roomId=fields(request.data,['expectedRevision','uci']);
    const {expectedRevision,uci}=request.data;
    if(!safeRevision(expectedRevision)||!safeUci(uci))
      fail('invalid-argument','Invalid move or revision');
    const ref=db.doc(exercisePath(roomId));
    return db.runTransaction(async tx=>{
      const room=await roomAccess(tx,roomId,a);
      if(room.ownerUid===a.uid)fail('permission-denied','Instructor cannot submit learner attempts');
      await adultMember(tx,roomId,a.uid);
      const snapshot=await tx.get(ref),data=snapshot.data();
      if(!data||data.assignedUid!==a.uid||data.status!=='active')
        fail('permission-denied','No active assignment for this learner');
      if(data.revision!==expectedRevision)fail('aborted','Exercise changed; reload before moving');
      const answer=exercises.get(data.puzzleId);
      if(!answer||!safeRevision(data.ply)||typeof data.attempts!=='number'||!safeRevision(data.attempts)||
        !Number.isSafeInteger(data.revision)||!safeRevision(data.revision+1))
        fail('failed-precondition','Invalid exercise state');
      const chargeRate=await charge(tx,a.uid,'move',180,10*60*1000);
      let next;
      try{next=applyExerciseMove(data,answer,uci);}
      catch{fail('failed-precondition','Cannot apply exercise move');}
      chargeRate();
      tx.update(ref,{...next,revision:data.revision+1,updatedAt:stamped(clock())});
      tx.update(db.doc(signalPath(roomId)),{revision:data.revision+1,status:next.status,updatedAt:stamped(clock())});
      return {result:next.lastResult,completed:next.status==='completed'};
    });
  }
  async function end(request){
    const a=principal(request),roomId=fields(request.data,[]);
    const ref=db.doc(exercisePath(roomId));
    await db.runTransaction(async tx=>{
      const r=(await tx.get(db.doc(roomPath(roomId)))).data();
      if(!r||r.ownerUid!==a.uid||!['coach','admin'].includes(a.token.chessyRole))
        fail('permission-denied','Instructor required');
      const snap=await tx.get(ref);
      if(!snap.exists||snap.data().status==='ended')return;
      const revision=snap.data().revision+1;
      if(!safeRevision(revision))fail('failed-precondition','Exercise revision unavailable');
      tx.update(ref,{status:'ended',lastResult:'ended',revision,updatedAt:stamped(clock())});
      tx.update(db.doc(signalPath(roomId)),{revision,status:'ended',updatedAt:stamped(clock())});
    });
    return {ended:true};
  }
  return {assign,submit,end};
}
module.exports={createExerciseService,applyExerciseMove,exercises,safeUid,safeUci};
