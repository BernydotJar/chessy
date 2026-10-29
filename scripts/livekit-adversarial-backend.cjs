'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{createRequire}=require('node:module');
module.exports=async function adversarialBackend({check}){
  if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:19708')throw new Error('Dedicated local emulator required');
  const backend=createRequire(path.resolve(__dirname,'../functions/index.cjs'));
  const {initializeApp}=backend('firebase-admin/app'),{getFirestore,Timestamp}=backend('firebase-admin/firestore');
  const {HttpsError}=backend('firebase-functions/v2/https'),{createLiveService,participantId}=require('../functions/livekit.cjs');
  const db=getFirestore(initializeApp({projectId:'demo-chessy-livekit'},'chessy-adversarial-qa'));
  let serial=0;
  async function fixture(){
    const owner='adversarialCoach'+(++serial),room=db.collection('learningRooms').doc(),events=[];
    const request=(uid,data={},role)=>({auth:{uid,token:{email_verified:true,
      ...((uid===owner||role==='coach')?{chessyRole:'coach'}:{})}},data:{roomId:room.id,...data}});
    await room.set({schemaVersion:1,ownerUid:owner,title:'Disposable adversarial classroom',audience:'adults',
      language:'es',status:'active',expiresAt:Timestamp.fromMillis(Date.now()+3600000)});
    const member=async(uid,extra={})=>room.collection('members').doc(uid).set({
      uid,ageBand:'adult',expiresAt:Timestamp.fromMillis(Date.now()+3600000),...extra});
    const fake={create:async()=>events.push('create'),sign:async(_name,id,role)=>'UNIT-CREDENTIAL-'+role+'-'+id,
      remove:async(_name,id)=>events.push('remove:'+id),delete:async()=>events.push('delete'),list:async()=>[]};
    const service=createLiveService({db,Timestamp,HttpsError,getConfig:()=>({}),makeProvider:()=>fake,enabled:()=>true});
    return {owner,room,request,member,fake,service,events};
  }
  await check('Adversarial: another coach and body-supplied role cannot acquire owner powers across rooms',async()=>{
    const f=await fixture(),{sessionId}=await f.service.start(f.request(f.owner));
    await f.member('otherCoach');
    const guest=await f.service.join(f.request('otherCoach',{sessionId,role:'coach'},'coach'));
    assert.equal(guest.role,'learner');
    await assert.rejects(()=>f.service.start(f.request('otherCoach',{},'coach')),{code:'permission-denied'});
    await assert.rejects(()=>f.service.end(f.request('otherCoach',{sessionId},'coach')),{code:'permission-denied'});
    await assert.rejects(()=>f.service.moderate(f.request('otherCoach',{sessionId,identity:guest.identity,action:'remove'},'coach')),{code:'permission-denied'});
    await f.service.end(f.request(f.owner,{sessionId}));
  });
  await check('Adversarial: missing, expired and minor membership cannot be replaced by client-supplied eligibility',async()=>{
    const f=await fixture(),{sessionId}=await f.service.start(f.request(f.owner));
    for(const [uid,extra] of [['expired',{expiresAt:Timestamp.fromMillis(Date.now()-1)}],['minor',{ageBand:'6-9'}]])await f.member(uid,extra);
    for(const uid of ['outsider','expired','minor'])await assert.rejects(()=>f.service.join(
      f.request(uid,{sessionId,ageBand:'adult',guardianConfirmed:true,member:true,role:'coach'})),{code:'permission-denied'});
    await f.service.end(f.request(f.owner,{sessionId}));
  });
  await check('Adversarial: a valid owner cannot use a session identifier belonging to another room',async()=>{
    const a=await fixture(),b=await fixture(),s1=await a.service.start(a.request(a.owner)),s2=await b.service.start(b.request(b.owner));
    await assert.rejects(()=>a.service.join(a.request(a.owner,{sessionId:s2.sessionId})),{code:'failed-precondition'});
    await assert.rejects(()=>a.service.end(a.request(a.owner,{sessionId:s2.sessionId})),{code:'not-found'});
    await a.service.end(a.request(a.owner,s1));await b.service.end(b.request(b.owner,s2));
  });
  await check('Adversarial: concurrent learner joins reserve an instructor seat and never exceed class capacity',async()=>{
    const f=await fixture(),{sessionId}=await f.service.start(f.request(f.owner));
    const learners=Array.from({length:16},(_,i)=>'capacityLearner'+i);
    await Promise.all(learners.map(uid=>f.member(uid)));
    await Promise.allSettled(learners.map(uid=>f.service.join(f.request(uid,{sessionId}))));
    const ledger=db.doc('learningRoomLiveSessions/'+sessionId).collection('participants');
    // Retry after transaction contention to distinguish capacity rejection from emulator retries.
    for(const uid of learners){try{await f.service.join(f.request(uid,{sessionId}));}catch(e){assert.ok(['resource-exhausted',10].includes(e.code));}}
    const people=await ledger.get();
    assert.ok(people.size<=11,'Learners must leave the twelfth seat available to the instructor; got '+people.size);
    const coach=await f.service.join(f.request(f.owner,{sessionId}));assert.equal(coach.role,'coach');
    assert.ok((await ledger.get()).size<=12);
    await f.service.end(f.request(f.owner,{sessionId}));
  });
  await check('Adversarial: withdrawing membership during credential signing prevents a late token response',async()=>{
    const f=await fixture(),{sessionId}=await f.service.start(f.request(f.owner));await f.member('withdrawDuringSign');
    let started,release;const waiting=new Promise(resolve=>{started=resolve;});
    f.fake.sign=async()=>{started();await new Promise(resolve=>{release=resolve;});return 'UNIT-LATE-TOKEN';};
    const pending=f.service.join(f.request('withdrawDuringSign',{sessionId}));
    const denied=assert.rejects(()=>pending,{code:'permission-denied'});
    await waiting;await f.room.collection('members').doc('withdrawDuringSign').delete();
    await f.service.withdraw(f.room.id,'withdrawDuringSign');release();await denied;
    const entry=await db.doc('learningRoomLiveSessions/'+sessionId+'/participants/'+participantId(sessionId,'withdrawDuringSign')).get();
    assert.equal(entry.data().blocked,true);assert.equal(entry.data().uid,null);
    await f.service.end(f.request(f.owner,{sessionId}));
  });
  await check('Adversarial: removing a learner during signing blocks both the pending response and future tokens',async()=>{
    const f=await fixture(),{sessionId}=await f.service.start(f.request(f.owner));await f.member('removeDuringSign');
    let started,release;const waiting=new Promise(resolve=>{started=resolve;});
    f.fake.sign=async()=>{started();await new Promise(resolve=>{release=resolve;});return 'UNIT-LATE-TOKEN';};
    const pending=f.service.join(f.request('removeDuringSign',{sessionId}));
    const denied=assert.rejects(()=>pending,{code:'permission-denied'});await waiting;
    await f.service.moderate(f.request(f.owner,{sessionId,identity:participantId(sessionId,'removeDuringSign'),action:'remove'}));
    release();await denied;
    await assert.rejects(()=>f.service.join(f.request('removeDuringSign',{sessionId})),{code:'permission-denied'});
    await f.service.end(f.request(f.owner,{sessionId}));
  });
  await check('Adversarial: token rate limits and closed-room checks remain server-authoritative',async()=>{
    const f=await fixture(),{sessionId}=await f.service.start(f.request(f.owner));await f.member('rateLearner');
    for(let i=0;i<15;i++)await f.service.join(f.request('rateLearner',{sessionId}));
    await assert.rejects(()=>f.service.join(f.request('rateLearner',{sessionId})),{code:'resource-exhausted'});
    await f.room.update({status:'closed'});
    await assert.rejects(()=>f.service.join(f.request(f.owner,{sessionId})),{code:'permission-denied'});
    await f.service.end(f.request(f.owner,{sessionId}));
  });
  await check('Adversarial: uncertain provider startup is retryable on the same class, without duplicate sessions',async()=>{
    const f=await fixture();let fail=true;
    f.fake.create=async()=>{if(fail)throw new Error('synthetic create timeout');};
    await assert.rejects(()=>f.service.start(f.request(f.owner)),{code:'unavailable'});
    const before=(await f.room.collection('live').doc('current').get()).data();
    assert.equal(before.status,'starting');
    await assert.rejects(()=>f.service.join(f.request(f.owner,{sessionId:before.sessionId})),{code:'failed-precondition'});
    fail=false;const retried=await f.service.start(f.request(f.owner));
    assert.equal(retried.sessionId,before.sessionId);
    await f.service.end(f.request(f.owner,retried));
  });
};
if(require.main===module){
  const fs=require('node:fs'),report={startedAt:new Date().toISOString(),checks:[]};
  const out=path.resolve(__dirname,'../progress/evidence/livekit-adversarial');
  fs.mkdirSync(out,{recursive:true});
  module.exports({check:async(name,fn)=>{
    try{await fn();report.checks.push({name,result:'PASS'});console.log('PASS',name);}
    catch(e){report.checks.push({name,result:'FAIL',error:String(e)});throw e;}
  }}).catch(e=>{report.failure=String(e);process.exitCode=1;}).finally(()=>{
    report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'backend-report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({pass:report.checks.filter(x=>x.result==='PASS').length,fail:report.checks.filter(x=>x.result==='FAIL').length}));
  });
}
