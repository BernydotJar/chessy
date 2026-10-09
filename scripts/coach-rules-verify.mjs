import fs from 'node:fs';
import assert from 'node:assert/strict';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

const host = process.env.FIRESTORE_EMULATOR_HOST?.split(':') ?? ['127.0.0.1', '19608'];
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST?.split(':') ?? ['127.0.0.1', '19619'];
const rules = await initializeTestEnvironment({
  projectId: 'demo-chessy',
  firestore: {
    host: host[0], port: Number(host[1]), rules: fs.readFileSync('firestore.rules','utf8'),
  },
  storage: {
    host: storageHost[0], port: Number(storageHost[1]), rules: fs.readFileSync('storage.rules','utf8'),
  },
});
const owner='coach_123', viewer='learner_456';
const ownerCoach=rules.authenticatedContext(owner,{email_verified:true,chessyRole:'coach'});
const learner=rules.authenticatedContext(viewer,{email_verified:true});
const guest=rules.unauthenticatedContext();
const coachUnverified=rules.authenticatedContext('unverified_123',{email_verified:false,chessyRole:'coach'});
const coachOther=rules.authenticatedContext('other_987',{email_verified:true,chessyRole:'coach'});
const savedTime=firebase.firestore.Timestamp.fromDate(new Date('2026-10-09T12:00:00Z'));
const pubId='PubClass12345', draftId='DraftClass12345';
const draft={
  schemaVersion:1,ownerUid:owner,kind:'live',status:'draft',
  title:'Curso guiado de ajedrez',description:'Clase de prueba',language:'es',
  startsAt:'2026-10-22T12:00:00.000Z',meetingUrl:'https://meet.google.com/abc-defg-hij',
  videoPath:null,relatedLessonId:null,createdAt:savedTime,updatedAt:savedTime,
};
let passed=0;
async function check(title, op) { await op(); console.log('PASS',title);passed++; }

try {
  await rules.withSecurityRulesDisabled(async context => {
    const db=context.firestore();
    await db.doc('coachSessions/'+draftId).set(draft);
    await db.doc('coachSessions/'+pubId).set({...draft,status:'published'});
  });

  await check('Public catalog is readable without exposing draft listings',async()=>{
    const result=await assertSucceeds(guest.firestore().collection('coachSessions').where('status','==','published').get());
    assert.equal(result.docs.length,1);
    await assertFails(guest.firestore().collection('coachSessions').get());
    await assertFails(guest.firestore().doc('coachSessions/'+draftId).get());
  });

  await check('Guest, learner and unverified coach cannot write instructor content',async()=>{
    for (const context of [guest,learner,coachUnverified]) {
      await assertFails(context.firestore().doc('coachSessions/ForgedDoc123').set({...draft,
        ownerUid:viewer, createdAt:firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:firebase.firestore.FieldValue.serverTimestamp()}));
    }
  });

  await check('Owner coach can create drafts and list personal sessions',async()=>{
    await assertSucceeds(ownerCoach.firestore().doc('coachSessions/NewDraft12345').set({
      ...draft, createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    }));
    const records=await assertSucceeds(ownerCoach.firestore().collection('coachSessions').where('ownerUid','==',owner).get());
    assert.ok(records.docs.length>=2);
  });

  await check('Wrong owner cannot edit or read private drafts',async()=>{
    await assertFails(coachOther.firestore().doc('coachSessions/'+draftId).get());
    await assertFails(coachOther.firestore().doc('coachSessions/'+draftId).update({title:'Altered title',updatedAt:firebase.firestore.FieldValue.serverTimestamp()}));
  });

  await check('Owner cannot publish an incomplete recorded class or spoof other owner',async()=>{
    await assertFails(ownerCoach.firestore().doc('coachSessions/'+draftId).update({
      kind:'recorded',meetingUrl:null,startsAt:null,videoPath:null,status:'published',
      updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    }));
    await assertFails(ownerCoach.firestore().doc('coachSessions/'+draftId).update({
      ownerUid:'other_987',updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    }));
  });

  await check('Coach can publish ready live classes and learner can read',async()=>{
    await assertSucceeds(ownerCoach.firestore().doc('coachSessions/'+draftId).update({
      status:'published',updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    }));
    const document=await assertSucceeds(learner.firestore().doc('coachSessions/'+draftId).get());
    assert.equal(document.data().status,'published');
  });


  const recordingId='Recorded12345';
  const recordingStoragePath='coach-recordings/'+owner+'/'+recordingId+'/video.mp4';
  await rules.withSecurityRulesDisabled(async context => {
    await context.firestore().doc('coachSessions/'+recordingId).set({
      ...draft, kind:'recorded',status:'draft',startsAt:null,meetingUrl:null,
      videoPath:null,
    });
  });
  await check('Coach can upload a bounded MP4 into an owned draft',async()=>{
    const reference=ownerCoach.storage().ref(recordingStoragePath);
    await assertSucceeds(reference.putString('test-mp4-bytes','raw',{contentType:'video/mp4'}));
  });
  await check('Guest and learner cannot upload to the coach path',async()=>{
    for(const context of [guest,learner,coachOther]){
      await assertFails(context.storage().ref(recordingStoragePath).putString(
        'forged-bytes','raw',{contentType:'video/mp4'}
      ));
    }
  });
  await check('Draft playback is denied to learners before publication',async()=>{
    await assertFails(learner.storage().ref(recordingStoragePath).getDownloadURL());
  });
  await check('Published recording allows authenticated playback but never guest playback',async()=>{
    await assertSucceeds(ownerCoach.firestore().doc('coachSessions/'+recordingId).update({
      status:'published',videoPath:recordingStoragePath,
      updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
    }));
    const url=await assertSucceeds(learner.storage().ref(recordingStoragePath).getDownloadURL());
    assert.ok(url.includes('video.mp4'));
    await assertFails(guest.storage().ref(recordingStoragePath).getDownloadURL());
  });
  console.log(JSON.stringify({totalRulesChecks:passed,firestoreChecks:6,storageChecks:4},null,2));

}finally { await rules.cleanup(); }
