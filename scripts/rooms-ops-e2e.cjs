'use strict';
const assert=require('node:assert/strict');
const fromFunctions=require('node:module').createRequire(require('node:path').resolve(__dirname,'../functions/package.json'));
const {initializeApp}=fromFunctions('firebase-admin/app');
const {getFirestore,Timestamp}=fromFunctions('firebase-admin/firestore');
const {cleanupExpired}=require('../functions/retention.cjs');
const project='demo-chessy-rooms';
initializeApp({projectId:project});
const db=getFirestore();
const authBase='http://127.0.0.1:19639/identitytoolkit.googleapis.com/v1';
const fnBase='http://127.0.0.1:19649/'+project+'/us-central1/';
const email='coach-rooms-e2e@example.test',password='ChessyEmulator123';
const day=86400000;
let passed=0;
const check=async(title,fn)=>{await fn();passed++;console.log('PASS',title);};
async function token(account){
  const res=await fetch(authBase+'/accounts:signInWithPassword?key=test-key',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:account,password,returnSecureToken:true}),
  });
  const data=await res.json();
  assert.equal(res.status,200,JSON.stringify(data));
  return data.idToken;
}
async function call(fn,data,idToken){
  const res=await fetch(fnBase+fn,{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+idToken},
    body:JSON.stringify({data}),
  });
  const payload=await res.json();
  return {status:res.status,...payload};
}
const until=offset=>Timestamp.fromMillis(Date.now()+offset);
(async()=>{
  const coach=await token(email);
  const learner=await token('student-rooms-e2e@example.test');
  let roomId,inviteId;
  await check('Unverified direct callable requests cannot create rooms',async()=>{
    const attempt=await call('createLearningRoom',{title:'Unauthorized Test',audience:'mixed',language:'es'},'bogus-token');
    assert.ok(attempt.status===401||attempt.status===403,JSON.stringify(attempt));
  });
  await check('Server quotas deny the fourth room creation in one 24-hour window',async()=>{
    const made=[];
    for(let i=0;i<3;i++){
      const r=await call('createLearningRoom',{title:'Group '+i+' Chessy',audience:'mixed',language:'es'},coach);
      assert.equal(r.status,200,JSON.stringify(r));
      made.push(r.result.roomId);
    }
    roomId=made[0];
    const denied=await call('createLearningRoom',{title:'Group 4 Chessy',audience:'mixed',language:'es'},coach);
    assert.notEqual(denied.status,200);
    assert.match(JSON.stringify(denied),/RESOURCE_EXHAUSTED|resource.exhausted/i);
    assert.equal((await db.doc('roomRateLimits/coachChessyE2E_roomCreation').get()).data().count,3);
  });
  await check('Server quotas deny the eleventh invitation in one hour',async()=>{
    for(let i=0;i<10;i++){
      const reply=await call('issueRoomInvitation',{roomId},coach);
      assert.equal(reply.status,200,JSON.stringify(reply));
      if(i===0)inviteId=reply.result.inviteId;
    }
    const denied=await call('issueRoomInvitation',{roomId},coach);
    assert.notEqual(denied.status,200);
    assert.equal((await db.doc('roomRateLimits/coachChessyE2E_invitation').get()).data().count,10);
    assert.equal((await db.doc('roomInvites/'+inviteId).get()).data().roomId,roomId);
  });
  await check('A leaked invite cannot bypass the server admission cap',async()=>{
    const target=db.doc('learningRooms/'+roomId);
    await target.update({admissionCount:50});
    const refused=await call('joinLearningRoom',{inviteId,ageBand:'adult',guardianAcknowledged:false},learner);
    assert.notEqual(refused.status,200);
    assert.match(JSON.stringify(refused),/RESOURCE_EXHAUSTED|resource.exhausted/i);
    await target.update({admissionCount:0});
  });
  await check('Review request stays pending and cannot grant minor access',async()=>{
    const req=await call('requestGuardianReview',{inviteId,ageBand:'6-9',guardianAcknowledged:true},learner);
    assert.equal(req.status,200,JSON.stringify(req));
    assert.equal(req.result.status,'pending');
    const status=await call('getGuardianAccessStatus',{roomId,ageBand:'6-9'},learner);
    assert.equal(status.result.allowed,false);
    assert.equal(status.result.pending,true);
    const pending=(await db.doc('guardianReviewRequests/'+roomId+'_studentChessyE2E').get()).data();
    assert.equal(pending.ageBand,'6-9');
    assert.equal(pending.childEmail,undefined);
  });
  await check('Repeated guardian verification requests have a strict daily quota',async()=>{
    assert.equal((await call('requestGuardianReview',{inviteId,ageBand:'6-9',guardianAcknowledged:true},learner)).status,200);
    const denied=await call('requestGuardianReview',{inviteId,ageBand:'6-9',guardianAcknowledged:true},learner);
    assert.notEqual(denied.status,200);
    assert.match(JSON.stringify(denied),/RESOURCE_EXHAUSTED|resource.exhausted/i);
  });
  await check('Self-attestation and a fabricated approval without policy release do not grant access',async()=>{
    await db.doc('roomGuardianApprovals/'+roomId+'_studentChessyE2E').set({
      schemaVersion:1,status:'approved',guardianUid:'studentChessyE2E',roomId,ageBand:'6-9',
      policyVersion:1,expiresAt:until(20*day),issuedAt:Timestamp.now(),
    });
    const status=await call('getGuardianAccessStatus',{roomId,ageBand:'6-9'},learner);
    assert.equal(status.result.allowed,false);
    await db.doc('roomSafety/config').set({schemaVersion:1,minorEnrollmentEnabled:true,policyVersion:2});
    assert.equal((await call('getGuardianAccessStatus',{roomId,ageBand:'6-9'},learner)).result.allowed,false);
    await db.doc('roomGuardianApprovals/'+roomId+'_studentChessyE2E').update({policyVersion:2});
    assert.equal((await call('getGuardianAccessStatus',{roomId,ageBand:'6-9'},learner)).result.allowed,true);
    await db.doc('roomSafety/config').update({minorEnrollmentEnabled:false});
    assert.equal((await call('getGuardianAccessStatus',{roomId,ageBand:'6-9'},learner)).result.allowed,false);
  });
  await check('Account erasure clears any pending and approved guardian review records',async()=>{
    const response=await call('eraseAllMyGuardianReviews',{},learner);
    assert.equal(response.status,200,JSON.stringify(response));
    assert.equal(response.result.deleted,2);
    assert.equal((await db.doc('guardianReviewRequests/'+roomId+'_studentChessyE2E').get()).exists,false);
    assert.equal((await db.doc('roomGuardianApprovals/'+roomId+'_studentChessyE2E').get()).exists,false);
    assert.equal((await call('getGuardianAccessStatus',{roomId,ageBand:'6-9'},learner)).result.allowed,false);
  });
  await check('Audit ledger captures privileged events without quiz answers or child identifiers',async()=>{
    const docs=await db.collection('roomAudit').get();
    const actions=docs.docs.map(s=>s.get('action'));
    assert.ok(actions.includes('room.created'));
    assert.ok(actions.includes('invite.issued'));
    assert.ok(actions.includes('guardian.review.requested'));
    assert.ok(docs.size>=15);
    for(const item of docs.docs){
      assert.ok(item.get('expiresAt')?.toMillis()>Date.now());
      assert.ok(!Object.hasOwn(item.data(),'answers'));
      assert.ok(!Object.hasOwn(item.data(),'childName'));
    }
  });
  await check('Closing a room schedules purge and blocks new invitation issuance',async()=>{
    const result=await call('closeLearningRoom',{roomId},coach);
    assert.equal(result.status,200,JSON.stringify(result));
    const room=(await db.doc('learningRooms/'+roomId).get()).data();
    assert.equal(room.status,'closed');
    assert.ok(room.purgeAfter.toMillis()>Date.now()+29*day);
    assert.notEqual((await call('issueRoomInvitation',{roomId},coach)).status,200);
  });
  await check('Dry-run retention is non-destructive and actual run erases expired indexes',async()=>{
    const child='expiredLearnerFake',index=db.doc('userRooms/'+child+'/rooms/'+roomId);
    const member=db.doc('learningRooms/'+roomId+'/members/'+child);
    const diagnostic=db.doc('learningRooms/'+roomId+'/diagnostics/'+child);
    const payload={schemaVersion:1,uid:child,roomId,inviteId,ageBand:'adult',guardianConfirmed:false,
      joinedAt:until(-90*day),expiresAt:until(-day)};
    await index.set(payload);await member.set(payload);
    await diagnostic.set({schemaVersion:2,uid:child,roomId,ageBand:'adult',score:1,total:5,goal:'discover',
      submittedAt:until(-40*day),expiresAt:until(-day)});
    const preview=await cleanupExpired({db,dryRun:true});
    assert.ok(preview.expiredEnrollmentIndexes>=1);
    assert.equal((await member.get()).exists,true);
    const cleaned=await cleanupExpired({db,dryRun:false});
    assert.ok(cleaned.expiredEnrollmentIndexes>=1);
    assert.equal((await member.get()).exists,false);
    assert.equal((await index.get()).exists,false);
    assert.equal((await diagnostic.get()).exists,false);
  });
  await check('Retention deletes full closed room subtree and linked invites',async()=>{
    await db.doc('learningRooms/'+roomId).update({purgeAfter:until(-day)});
    const preview=await cleanupExpired({db,dryRun:true});
    assert.ok(preview.closedRooms>=1);
    assert.equal((await db.doc('learningRooms/'+roomId).get()).exists,true);
    const removed=await cleanupExpired({db,dryRun:false});
    assert.ok(removed.deletedRooms>=1);
    assert.equal((await db.doc('learningRooms/'+roomId).get()).exists,false);
    assert.equal((await db.doc('learningRooms/'+roomId+'/board/current').get()).exists,false);
    assert.equal((await db.doc('roomInvites/'+inviteId).get()).exists,false);
    assert.equal((await db.doc('guardianReviewRequests/'+roomId+'_studentChessyE2E').get()).exists,false);
    assert.equal((await db.doc('roomGuardianApprovals/'+roomId+'_studentChessyE2E').get()).exists,false);
  });
  console.log('CHESSY_OPS_E2E',JSON.stringify({checks:passed,result:'PASS'}));
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
