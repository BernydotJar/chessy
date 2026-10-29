'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{createRequire}=require('node:module');
module.exports=async function backendChecks({check,roomId}){
  if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:19708')throw new Error('Dedicated local Firestore emulator required');
  const backend=createRequire(path.resolve(__dirname,'../functions/index.cjs'));
  const {initializeApp}=backend('firebase-admin/app'),{getFirestore,Timestamp}=backend('firebase-admin/firestore');
  const {HttpsError}=backend('firebase-functions/v2/https'),{createLiveService}=require('../functions/livekit.cjs');
  const db=getFirestore(initializeApp({projectId:'demo-chessy-livekit'},'chessy-live-backend-qa'));
  const auth=uid=>({uid,token:{email_verified:true,...(uid==='coachLiveE2E'?{chessyRole:'coach'}:{})}});
  const req=(uid,data)=>({auth:auth(uid),data:{roomId,...data}});
  let releaseSign,signStarted,hold=false,failRemove=false;
  const operations=[];
  const fake={create:async()=>{},sign:async()=>{
    if(hold){signStarted();await new Promise(resolve=>{releaseSign=resolve;});}
    return 'SYNTHETIC-UNIT-CREDENTIAL-NOT-A-JWT';
  },remove:async(_name,id)=>{operations.push('remove:'+id);if(failRemove)throw new Error('synthetic provider outage');},
    delete:async()=>{operations.push('delete');}};
  const service=createLiveService({db,Timestamp,HttpsError,getConfig:()=>({url:'synthetic-provider'}),
    makeProvider:()=>fake,enabled:()=>true});
  await check('Firestore emulator: pre-existing minor membership is denied by the adult video pilot',async()=>{
    const {sessionId}=await service.start(req('coachLiveE2E',{}));
    await db.doc('learningRooms/'+roomId+'/members/minorLiveE2E').set({
      uid:'minorLiveE2E',ageBand:'6-9',expiresAt:Timestamp.fromMillis(Date.now()+3600000)});
    await assert.rejects(()=>service.join(req('minorLiveE2E',{sessionId})),{code:'permission-denied'});
    await service.end(req('coachLiveE2E',{sessionId}));
    await db.doc('learningRooms/'+roomId+'/members/minorLiveE2E').delete();
  });
  await check('Firestore emulator: closing while a credential is signed fences the response and revokes its ledger entry',async()=>{
    const {sessionId}=await service.start(req('coachLiveE2E',{}));
    hold=true;const started=new Promise(resolve=>{signStarted=resolve;});
    const pending=service.join(req('studentOneLiveE2E',{sessionId}));await started;
    const rejected=assert.rejects(()=>pending,{code:'failed-precondition'});
    await service.end(req('coachLiveE2E',{sessionId}));hold=false;releaseSign();await rejected;
    assert.match(operations.at(-2),/^remove:/);assert.equal(operations.at(-1),'delete');
  });
  await check('Firestore emulator: provider revocation failure keeps closing retryable and blocks new credentials',async()=>{
    const {sessionId}=await service.start(req('coachLiveE2E',{}));
    await service.join(req('studentOneLiveE2E',{sessionId}));
    failRemove=true;await assert.rejects(()=>service.end(req('coachLiveE2E',{sessionId})),{code:'unavailable'});
    assert.equal((await db.doc('learningRoomLiveSessions/'+sessionId).get()).data().status,'closing');
    await assert.rejects(()=>service.join(req('studentTwoLiveE2E',{sessionId})),{code:'failed-precondition'});
    failRemove=false;await service.end(req('coachLiveE2E',{sessionId}));
    assert.equal((await db.doc('learningRoomLiveSessions/'+sessionId).get()).data().status,'ended');
    assert.equal(operations.at(-1),'delete');
  });
  await check('Firestore emulator: lifecycle reconciliation ends an expired class and its issued credentials',async()=>{
    const {sessionId}=await service.start(req('coachLiveE2E',{}));
    await service.join(req('studentOneLiveE2E',{sessionId}));
    await db.doc('learningRoomLiveSessions/'+sessionId).update({endsAt:Timestamp.fromMillis(Date.now()-1)});
    const result=await service.reconcile();assert.equal(result.failed,0);assert.equal(result.ended,1);
    assert.equal((await db.doc('learningRoomLiveSessions/'+sessionId).get()).data().status,'ended');
  });
};
