'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {liveConfig,joinGrant,providerRoom,participantId,createLiveService,TOKEN_SECONDS}=require('../livekit.cjs');
const base={CHESSY_LIVEKIT_URL:'wss://example.livekit.cloud',CHESSY_LIVEKIT_API_KEY:'test-key',CHESSY_LIVEKIT_API_SECRET:'synthetic-test-secret'};
test('Cloud credentials are mandatory; loopback requires both emulator and explicit QA mode',()=>{
  assert.equal(liveConfig(base).cloud,true);
  for(const url of ['https://example.livekit.cloud','ws://example.livekit.cloud','wss://evil.example','wss://example.livekit.cloud.evil.test','wss://user:pass@example.livekit.cloud']){
    assert.throws(()=>liveConfig({...base,CHESSY_LIVEKIT_URL:url}));
  }
  assert.throws(()=>liveConfig({...base,CHESSY_LIVEKIT_API_SECRET:''}));
  assert.throws(()=>liveConfig({...base,CHESSY_LIVEKIT_URL:'ws://127.0.0.1:7880'}));
  assert.equal(liveConfig({...base,CHESSY_LIVEKIT_URL:'ws://127.0.0.1:7880',FUNCTIONS_EMULATOR:'true',CHESSY_LIVEKIT_QA_MODE:'local'}).cloud,false);
});
test('Learners cannot share screens or mutate room metadata/data; moderation remains server-side',()=>{
  const sources={CAMERA:1,MICROPHONE:2,SCREEN_SHARE:3,SCREEN_SHARE_AUDIO:4};
  const student=joinGrant('room','learner',sources),coach=joinGrant('room','coach',sources);
  assert.deepEqual(student.canPublishSources,[1,2]);assert.deepEqual(coach.canPublishSources,[1,2,3,4]);
  for(const grant of [student,coach])for(const right of ['roomAdmin','roomCreate','roomRecord','canPublishData','canUpdateOwnMetadata'])assert.equal(grant[right],false,right);
  assert.ok(TOKEN_SECONDS<=90);
});
test('Provider identities are opaque, scoped per class and never disclose user identifiers',()=>{
  const uid='private-person@example.test';
  const first=participantId('classA',uid);
  assert.match(first,/^p_[a-f0-9]{64}$/);assert.ok(!first.includes(uid));
  assert.notEqual(first,participantId('classB',uid));
  assert.notEqual(providerRoom('roomA','classA'),providerRoom('roomB','classA'));
});
test('Feature-disabled and unverified requests fail before any database or media access',async()=>{
  class Failure extends Error{constructor(code,message){super(message);this.code=code;}}
  const denyDb=new Proxy({}, {get(){throw new Error('unexpected database access');}});
  const service=createLiveService({db:denyDb,Timestamp:{},HttpsError:Failure,enabled:()=>false});
  await assert.rejects(()=>service.start({}),{code:'failed-precondition'});
  await assert.rejects(()=>service.join({}),{code:'failed-precondition'});
  await assert.rejects(()=>service.end({}),{code:'unauthenticated'});
});
test('Malformed JSON identifiers are rejected before database/provider access across every endpoint',async()=>{
  class Failure extends Error{constructor(code,message){super(message);this.code=code;}}
  const db=new Proxy({}, {get(){throw new Error('malformed request reached database');}});
  const service=createLiveService({db,Timestamp:{},HttpsError:Failure,enabled:()=>true,getConfig:()=>({}),makeProvider:()=>({})});
  const auth={uid:'coach',token:{email_verified:true,chessyRole:'coach'}};
  const good='A'.repeat(20);
  const values=[null,[],{roomId:[good],sessionId:good},{roomId:{},sessionId:good},
    {roomId:42,sessionId:good},{roomId:good,sessionId:[good]},{roomId:'../other',sessionId:good}];
  for(const name of ['start','join','end','moderate'])for(const data of values)
    await assert.rejects(()=>service[name]({auth,data}),{code:'invalid-argument'},name+' rejects malformed JSON');
});
test('Moderation rejects identity arrays instead of coercing them to a provider identity',async()=>{
  class Failure extends Error{constructor(code,message){super(message);this.code=code;}}
  const db=new Proxy({}, {get(){throw new Error('invalid moderation reached database');}});
  const service=createLiveService({db,Timestamp:{},HttpsError:Failure,enabled:()=>true});
  await assert.rejects(()=>service.moderate({auth:{uid:'coach',token:{email_verified:true,chessyRole:'coach'}},
    data:{roomId:'A'.repeat(20),sessionId:'B'.repeat(20),identity:['p_'+'a'.repeat(64)],action:'remove'}}),{code:'invalid-argument'});
});
test('Body-supplied identities and nonboolean verified claims cannot elevate a request',async()=>{
  class Failure extends Error{constructor(code,message){super(message);this.code=code;}}
  const db=new Proxy({}, {get(){throw new Error('spoofed identity reached database');}});
  const service=createLiveService({db,Timestamp:{},HttpsError:Failure,enabled:()=>true});
  for(const auth of [undefined,{uid:'attacker',token:{email_verified:'true',chessyRole:'coach'}},
    {uid:'attacker',token:{email_verified:false,chessyRole:'admin'}}])
    await assert.rejects(()=>service.start({auth,data:{roomId:'A'.repeat(20),auth:{uid:'coach',token:{email_verified:true,chessyRole:'coach'}}}}),{code:'unauthenticated'});
});
