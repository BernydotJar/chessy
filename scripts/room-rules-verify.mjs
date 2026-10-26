import fs from 'node:fs';
import assert from 'node:assert/strict';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Chess } from 'chess.js';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

const host = process.env.FIRESTORE_EMULATOR_HOST?.split(':') ?? ['127.0.0.1','19608'];
const env = await initializeTestEnvironment({
  projectId:'demo-chessy-rooms',
  firestore:{host:host[0],port:Number(host[1]),rules:fs.readFileSync('firestore.rules','utf8')},
});
const ownerUid='coach_A',learnerUid='adult_B',otherUid='stranger_C';
const coach=env.authenticatedContext(ownerUid,{email_verified:true,chessyRole:'coach'}).firestore();
const member=env.authenticatedContext(learnerUid,{email_verified:true}).firestore();
const outsider=env.authenticatedContext(otherUid,{email_verified:true}).firestore();
const notVerified=env.authenticatedContext('coach_unverified',{email_verified:false,chessyRole:'coach'}).firestore();
const anonymous=env.unauthenticatedContext().firestore();
const stamp=()=>firebase.firestore.FieldValue.serverTimestamp();
const roomId='RoomTesting012345678',inviteId='InviteTesting1234567';
const roomRef=db=>db.doc('learningRooms/'+roomId);
const boardRef=db=>db.doc('learningRooms/'+roomId+'/board/current');
const inviteRef=db=>db.doc('roomInvites/'+inviteId);
const memberRef=db=>db.doc('learningRooms/'+roomId+'/members/'+learnerUid);
const memberIndex=db=>db.doc('userRooms/'+learnerUid+'/rooms/'+roomId);
const diagnosticRef=db=>db.doc('learningRooms/'+roomId+'/diagnostics/'+learnerUid);
const memberData={
  schemaVersion:1,uid:learnerUid,roomId,inviteId,ageBand:'10-12',
  guardianConfirmed:true,joinedAt:stamp(),
};
const diagnosticData={
  schemaVersion:1,uid:learnerUid,roomId,ageBand:'10-12',guardianConfirmed:true,
  goal:'discover',answers:{q1:'b',q2:'a',q3:'c',q4:'a',q5:'b'},submittedAt:stamp(),
};
let passed=0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log('PASS',name);
}
try {
  const fen=new Chess().fen();
  await check('Only a verified approved coach creates an atomic room and board',async()=>{
    const payload={schemaVersion:1,ownerUid,title:'Aprende desde cero',audience:'children',language:'es',status:'active',createdAt:stamp(),updatedAt:stamp()};
    await assertFails(notVerified.doc('learningRooms/UnverifiedTesting001').set({...payload,ownerUid:'coach_unverified'}));
    await assertFails(member.doc('learningRooms/ForgedTesting12345678').set({...payload,ownerUid:learnerUid}));
    const batch=coach.batch();
    batch.set(roomRef(coach),payload);
    batch.set(boardRef(coach),{fen,initialFen:fen,moves:[],revision:0,locked:false,updatedAt:stamp()});
    await assertSucceeds(batch.commit());
    assert.equal((await roomRef(coach).get()).data().title,'Aprende desde cero');
  });
  await check('Room is private before invitation acceptance',async()=>{
    await assertFails(roomRef(anonymous).get());
    await assertFails(roomRef(member).get());
    await assertFails(roomRef(outsider).get());
    await assertFails(boardRef(member).get());
    await assertFails(member.collection('learningRooms').get());
    await assertSucceeds(coach.collection('learningRooms').where('ownerUid','==',ownerUid).get());
    await assertSucceeds(member.collection('learningRooms').where('ownerUid','==',learnerUid).get());
  });
  await check('Only verified owner issues a short-lived opaque invitation',async()=>{
    const invite={
      schemaVersion:1,roomId,ownerUid,roomTitle:'Aprende desde cero',audience:'children',
      createdAt:stamp(),expiresAt:firebase.firestore.Timestamp.fromMillis(Date.now()+7*24*3600000),
    };
    await assertFails(member.doc('roomInvites/InvalidTesting1234567').set({...invite,ownerUid:learnerUid}));
    await assertFails(notVerified.doc('roomInvites/InvalidTesting4567890').set({...invite,ownerUid:'coach_unverified'}));
    await assertSucceeds(inviteRef(coach).set(invite));
  });
  await check('Bearer invite get works for verified identity but enumeration is denied',async()=>{
    await assertFails(inviteRef(anonymous).get());
    await assertSucceeds(inviteRef(member).get());
    await assertSucceeds(inviteRef(outsider).get());
    await assertFails(member.collection('roomInvites').get());
    await assertFails(coach.collection('roomInvites').get());
    await assertSucceeds(coach.collection('roomInvites').where('ownerUid','==',ownerUid).get());
  });
  await check('Missing, incorrect, or unpaired invitation enrollment is denied',async()=>{
    await assertFails(memberRef(member).set({...memberData,inviteId:'InvalidToken01234567'}));
    await assertFails(memberIndex(member).set(memberData));
    await assertFails(memberRef(member).set({...memberData,guardianConfirmed:false}));
    const memberBatch=member.batch();
    memberBatch.set(memberRef(member),memberData);
    memberBatch.set(memberIndex(member),memberData);
    await assertSucceeds(memberBatch.commit());
  });
  await check('Only enrolled learner sees private room and teacher-owned board',async()=>{
    const room=await assertSucceeds(roomRef(member).get());
    assert.equal(room.data().ownerUid,ownerUid);
    await assertSucceeds(boardRef(member).get());
    await assertFails(roomRef(outsider).get());
    await assertFails(boardRef(outsider).get());
    await assertSucceeds(memberIndex(member).get());
    await assertFails(memberIndex(outsider).get());
  });
  await check('Learner cannot write coach board or role-controlled room metadata',async()=>{
    await assertFails(boardRef(member).update({revision:1,updatedAt:stamp()}));
    await assertFails(roomRef(member).update({title:'Hijacked name',updatedAt:stamp()}));
    await assertFails(memberRef(member).update({ageBand:'adult'}));
    await assertFails(memberRef(outsider).get());
    await assertSucceeds(boardRef(coach).update({revision:1,updatedAt:stamp()}));
    await assertFails(boardRef(coach).update({revision:1,updatedAt:stamp()}));
  });
  await check('Learner creates exactly one own questionnaire for the appropriate age band',async()=>{
    await assertFails(diagnosticRef(member).set({...diagnosticData,guardianConfirmed:false}));
    await assertFails(diagnosticRef(member).set({...diagnosticData,answers:{...diagnosticData.answers,extra:'b'}}));
    await assertSucceeds(diagnosticRef(member).set(diagnosticData));
    await assertFails(diagnosticRef(member).set(diagnosticData));
  });
  await check('No cross-user diagnostic access; teacher sees only their room',async()=>{
    await assertSucceeds(diagnosticRef(member).get());
    await assertSucceeds(diagnosticRef(coach).get());
    await assertFails(diagnosticRef(outsider).get());
    await assertFails(member.collection('learningRooms/'+roomId+'/diagnostics').get());
    await assertSucceeds(coach.collection('learningRooms/'+roomId+'/diagnostics').get());
    await assertFails(outsider.collection('learningRooms/'+roomId+'/diagnostics').get());
  });
  await check('Closed rooms cannot issue fresh invitations or enroll new members',async()=>{
    await assertSucceeds(roomRef(coach).update({status:'closed',updatedAt:stamp()}));
    await assertFails(roomRef(coach).update({status:'active',updatedAt:stamp()}));
    await assertFails(inviteRef(member).get());
    await assertFails(coach.doc('roomInvites/ClosedInvite01234567').set({
      schemaVersion:1,roomId,ownerUid,roomTitle:'Aprende desde cero',audience:'children',
      createdAt:stamp(),expiresAt:firebase.firestore.Timestamp.fromMillis(Date.now()+7*24*3600000),
    }));
    const second={
      ...memberData,uid:otherUid,ageBand:'10-12',joinedAt:stamp(),
    };
    const index=outsider.doc('userRooms/'+otherUid+'/rooms/'+roomId);
    const secondMember=outsider.doc('learningRooms/'+roomId+'/members/'+otherUid);
    const batch=outsider.batch();batch.set(index,second);batch.set(secondMember,second);
    await assertFails(batch.commit());
  });
  await check('Expired invitations fail closed',async()=>{
    const expired='ExpiredInvite0123456';
    await env.withSecurityRulesDisabled(async ctx=>{
      await ctx.firestore().doc('roomInvites/'+expired).set({
        schemaVersion:1,roomId,ownerUid,roomTitle:'Aprende desde cero',audience:'children',
        createdAt:firebase.firestore.Timestamp.fromMillis(Date.now()-10*86400000),
        expiresAt:firebase.firestore.Timestamp.fromMillis(Date.now()-86400000),
      });
    });
    await assertFails(member.doc('roomInvites/'+expired).get());
  });
  await check('Participant withdraws consent and deletes room data atomically',async()=>{
    const remove=member.batch();
    remove.delete(diagnosticRef(member));
    remove.delete(memberRef(member));
    remove.delete(memberIndex(member));
    await assertSucceeds(remove.commit());
    await assertFails(roomRef(member).get());
    assert.equal((await assertSucceeds(diagnosticRef(member).get())).exists,false);
    assert.equal((await assertSucceeds(memberIndex(member).get())).exists,false);
    await assertSucceeds(roomRef(coach).get());
  });
  await check('Invitation revocation is strictly owner-only',async()=>{
    await assertFails(inviteRef(member).delete());
    await assertSucceeds(inviteRef(coach).delete());
  });
  console.log(JSON.stringify({checks:passed,result:'PASS',project:'Chessy zero-to-one private rooms'}));
} finally {
  await env.cleanup();
}
