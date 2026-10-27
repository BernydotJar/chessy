import fs from 'node:fs';
import assert from 'node:assert/strict';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import {assertFails,assertSucceeds,initializeTestEnvironment} from '@firebase/rules-unit-testing';

const host=(process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:19608').split(':');
const env=await initializeTestEnvironment({
  projectId:'demo-chessy-rooms',
  firestore:{host:host[0],port:Number(host[1]),rules:fs.readFileSync('firestore.rules','utf8')},
});
const uid={coach:'coach_A',adult:'adult_B',guardian:'guardian_D',outsider:'stranger_C'};
const coach=env.authenticatedContext(uid.coach,{email_verified:true,chessyRole:'coach'}).firestore();
const adult=env.authenticatedContext(uid.adult,{email_verified:true}).firestore();
const guardian=env.authenticatedContext(uid.guardian,{email_verified:true}).firestore();
const outsider=env.authenticatedContext(uid.outsider,{email_verified:true}).firestore();
const anonymous=env.unauthenticatedContext().firestore();
const unverified=env.authenticatedContext('unverified',{email_verified:false,chessyRole:'coach'}).firestore();
const serverTimestamp=()=>firebase.firestore.FieldValue.serverTimestamp();
const ts=offset=>firebase.firestore.Timestamp.fromMillis(Date.now()+offset);
const DAY=86400000;
const roomId='RoomTesting012345678',inviteId='InviteTesting1234567';
const ref=(db,path)=>db.doc(path);
const room=db=>ref(db,'learningRooms/'+roomId);
const invite=db=>ref(db,'roomInvites/'+inviteId);
const member=(db,id)=>ref(db,'learningRooms/'+roomId+'/members/'+id);
const index=(db,id)=>ref(db,'userRooms/'+id+'/rooms/'+roomId);
const diagnostic=(db,id)=>ref(db,'learningRooms/'+roomId+'/diagnostics/'+id);
const policy=db=>ref(db,'roomSafety/config');
const approval=db=>ref(db,'roomGuardianApprovals/'+roomId+'_'+uid.guardian);
const seed=async fn=>env.withSecurityRulesDisabled(async ctx=>fn(ctx.firestore()));
const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const roomExpiry=ts(90*DAY);
const baseRoom={schemaVersion:1,ownerUid:uid.coach,title:'Academia de inicio',audience:'mixed',language:'es',status:'active',createdAt:ts(-DAY),updatedAt:ts(-DAY),expiresAt:roomExpiry};
const baseInvite={schemaVersion:1,roomId,ownerUid:uid.coach,roomTitle:baseRoom.title,audience:'mixed',createdAt:ts(-1000),expiresAt:ts(7*DAY),roomExpiresAt:roomExpiry};
const enrollment=(who,ageBand,inviteToken=inviteId,expiresAt=ts(ageBand==='adult'?89*DAY:20*DAY))=>({
  schemaVersion:1,uid:who,roomId,inviteId:inviteToken,ageBand,
  guardianConfirmed:ageBand!=='adult',joinedAt:serverTimestamp(),expiresAt,
});
const batchEnroll=async(db,who,data)=>{
  const b=db.batch();b.set(member(db,who),data);b.set(index(db,who),data);return b.commit();
};
const checks=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
try {
  await seed(async db=>{
    await room(db).set(baseRoom);
    await ref(db,'learningRooms/'+roomId+'/board/current').set({
      fen,initialFen:fen,moves:[],revision:0,locked:false,updatedAt:ts(-DAY),
    });
    await invite(db).set(baseInvite);
  });
  await check('Client cannot create/update/close a room even with a valid coach claim',async()=>{
    await assertFails(room(coach).update({status:'closed',updatedAt:serverTimestamp()}));
    await assertFails(room(adult).update({status:'closed'}));
    await assertFails(coach.doc('learningRooms/RoomMaking123456789').set(baseRoom));
    await assertFails(unverified.doc('learningRooms/RoomCreating1234567').set(baseRoom));
  });
  await check('Client cannot mint/revoke invitations or change rate-limit/audit records',async()=>{
    await assertFails(invite(coach).delete());
    await assertFails(coach.doc('roomInvites/AnotherInvite1234567').set(baseInvite));
    await assertFails(coach.doc('roomRateLimits/coach_A_invitation').set({count:0}));
    await assertFails(coach.collection('roomAudit').add({action:'forged'}));
  });
  await check('Anonymous cannot read invitations and a token does not reveal a room without enrollment',async()=>{
    await assertFails(invite(anonymous).get());
    await assertSucceeds(invite(adult).get());
    await assertFails(room(adult).get());
    await assertFails(room(guardian).get());
    await assertFails(room(outsider).get());
    await assertFails(adult.collection('roomInvites').get());
    await assertSucceeds(coach.collection('roomInvites').where('ownerUid','==',uid.coach).get());
  });
  await check('No client can create memberships or indexes; server must enforce enrollment quota',async()=>{
    await assertFails(batchEnroll(adult,uid.adult,enrollment(uid.adult,'adult','WrongInvite012345678')));
    await assertFails(member(adult,uid.adult).set(enrollment(uid.adult,'adult')));
    await assertFails(batchEnroll(adult,uid.adult,enrollment(uid.adult,'adult')));
    await assertFails(batchEnroll(coach,uid.coach,enrollment(uid.coach,'adult')));
    await seed(async db=>batchEnroll(db,uid.adult,enrollment(uid.adult,'adult')));
    assert.equal((await assertSucceeds(room(adult).get())).data().ownerUid,uid.coach);
  });
  await check('Self-declared guardian checkbox cannot create minor membership',async()=>{
    const proposed=enrollment(uid.guardian,'6-9');
    await assertFails(batchEnroll(guardian,uid.guardian,proposed));
    await assertFails(room(guardian).get());
    await assertFails(guardian.doc('roomGuardianApprovals/'+roomId+'_'+uid.guardian).set({status:'approved'}));
    await assertFails(guardian.doc('roomSafety/config').set({minorEnrollmentEnabled:true}));
  });
  await check('An administrator-approved record alone cannot bypass the default-off minor release switch',async()=>{
    await seed(async db=>{
      await policy(db).set({schemaVersion:1,minorEnrollmentEnabled:false,policyVersion:7});
      await approval(db).set({
        schemaVersion:1,status:'approved',guardianUid:uid.guardian,roomId,ageBand:'6-9',policyVersion:7,
        issuedAt:ts(-DAY),expiresAt:ts(25*DAY),verificationMethod:'external-vpc',
      });
    });
    await assertFails(batchEnroll(guardian,uid.guardian,enrollment(uid.guardian,'6-9')));
  });
  await check('Policy version and age binding protect against a forged or obsolete approval',async()=>{
    await seed(async db=>policy(db).update({minorEnrollmentEnabled:true,policyVersion:8}));
    await assertFails(batchEnroll(guardian,uid.guardian,enrollment(uid.guardian,'6-9')));
    await seed(async db=>approval(db).update({policyVersion:8}));
    await assertFails(batchEnroll(guardian,uid.guardian,enrollment(uid.guardian,'10-12')));
    await assertFails(batchEnroll(guardian,uid.guardian,enrollment(uid.guardian,'6-9')));
    await seed(async db=>batchEnroll(db,uid.guardian,enrollment(uid.guardian,'6-9')));
    await assertSucceeds(room(guardian).get());
  });
  await check('Revocation or expiry immediately removes minor room access without a client refresh',async()=>{
    await seed(async db=>policy(db).update({minorEnrollmentEnabled:false}));
    await assertFails(room(guardian).get());
    await assertFails(ref(guardian,'learningRooms/'+roomId+'/board/current').get());
    await assertSucceeds(room(adult).get());
    await seed(async db=>policy(db).update({minorEnrollmentEnabled:true}));
    await assertSucceeds(room(guardian).get());
    await seed(async db=>approval(db).update({expiresAt:ts(-DAY)}));
    await assertFails(room(guardian).get());
    await seed(async db=>approval(db).update({expiresAt:ts(25*DAY)}));
    await assertSucceeds(room(guardian).get());
  });
  await check('Raw diagnostic answers and fabricated scores cannot be written directly',async()=>{
    const data={schemaVersion:2,uid:uid.guardian,roomId,ageBand:'6-9',goal:'discover',
      score:5,total:5,submittedAt:serverTimestamp(),expiresAt:ts(20*DAY)};
    await assertFails(diagnostic(guardian,uid.guardian).set(data));
    await assertFails(diagnostic(coach,uid.guardian).set(data));
    await seed(async db=>diagnostic(db,uid.guardian).set({...data,submittedAt:ts(-1000)}));
    const snap=await assertSucceeds(diagnostic(guardian,uid.guardian).get());
    assert.equal(snap.data().answers,undefined);
    await assertFails(diagnostic(adult,uid.guardian).get());
    await assertFails(guardian.collection('learningRooms/'+roomId+'/diagnostics').get());
    await assertSucceeds(coach.collection('learningRooms/'+roomId+'/diagnostics').get());
  });
  await check('Learner cannot move instructor board; coach can use monotonic revisions',async()=>{
    const board=ref(coach,'learningRooms/'+roomId+'/board/current');
    await assertFails(ref(adult,board.path).update({revision:1,updatedAt:serverTimestamp()}));
    await assertSucceeds(board.update({revision:1,updatedAt:serverTimestamp()}));
    await assertFails(board.update({revision:1,updatedAt:serverTimestamp()}));
  });
  await check('Room closures and expired invitation tokens deny new reads',async()=>{
    await seed(async db=>room(db).update({status:'closed',closedAt:ts(-1000),purgeAfter:ts(30*DAY)}));
    await assertFails(invite(adult).get());
    await assertFails(batchEnroll(outsider,uid.outsider,enrollment(uid.outsider,'adult')));
    await seed(async db=>invite(db).update({expiresAt:ts(-DAY)}));
    await assertFails(invite(guardian).get());
  });
  await check('Direct partial deletion fails closed; withdrawal requires the server transaction',async()=>{
    await seed(async db=>policy(db).update({minorEnrollmentEnabled:false}));
    await assertFails(diagnostic(guardian,uid.guardian).delete());
    await assertFails(member(guardian,uid.guardian).delete());
    await assertFails(index(guardian,uid.guardian).delete());
    await assertFails(room(guardian).get());
  });
  console.log(JSON.stringify({checks:checks.length,result:'PASS',project:'Chessy room safety'}));
}finally{await env.cleanup();}
