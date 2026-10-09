import fs from 'node:fs';
import assert from 'node:assert/strict';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

const host = process.env.FIRESTORE_EMULATOR_HOST?.split(':') ?? ['127.0.0.1', '19608'];
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST?.split(':') ?? ['127.0.0.1', '19619'];
const rules = await initializeTestEnvironment({
  projectId: 'demo-chessy',
  firestore: { host:host[0], port:Number(host[1]), rules:fs.readFileSync('firestore.rules','utf8') },
  storage: { host:storageHost[0], port:Number(storageHost[1]), rules:fs.readFileSync('storage.rules','utf8') },
});
const owner='coach_123',viewer='learner_456',stranger='learner_987';
const ownerCoach=rules.authenticatedContext(owner,{email_verified:true,chessyRole:'coach'});
const learner=rules.authenticatedContext(viewer,{email_verified:true});
const outsider=rules.authenticatedContext(stranger,{email_verified:true});
const guest=rules.unauthenticatedContext();
const coachUnverified=rules.authenticatedContext('unverified_123',{email_verified:false,chessyRole:'coach'});
const coachOther=rules.authenticatedContext('other_987',{email_verified:true,chessyRole:'coach'});
const savedTime=firebase.firestore.Timestamp.fromDate(new Date('2026-10-09T12:00:00Z'));
const url='https://meet.google.com/abc-defg-hij';
const pubId='PubClass12345',draftId='DraftClass12345';
const draft={
  schemaVersion:1,ownerUid:owner,kind:'live',status:'draft',
  title:'Curso guiado de ajedrez',description:'Clase de prueba',language:'es',
  startsAt:'2026-10-22T12:00:00.000Z',meetingUrl:null,
  videoPath:null,relatedLessonId:null,createdAt:savedTime,updatedAt:savedTime,
};
const privateData={schemaVersion:1,ownerUid:owner,meetingUrl:url,updatedAt:savedTime};
const enrollment = id => 'coachEnrollments/'+id+'/members/'+viewer;
let passed=0;
async function check(title, op) { await op(); console.log('PASS',title);passed++; }
const stamp=()=>firebase.firestore.FieldValue.serverTimestamp();

try {
  await rules.withSecurityRulesDisabled(async ctx=>{
    const db=ctx.firestore();
    await Promise.all([
      db.doc('coachSessions/'+draftId).set(draft),
      db.doc('coachSessions/'+pubId).set({...draft,status:'published'}),
      db.doc('coachSessionSecrets/'+draftId).set(privateData),
      db.doc('coachSessionSecrets/'+pubId).set(privateData),
    ]);
  });

  await check('Public catalog contains only published classes, never meeting URLs',async()=>{
    const result=await assertSucceeds(guest.firestore().collection('coachSessions').where('status','==','published').get());
    assert.equal(result.docs.length,1);
    assert.equal(result.docs[0].data().meetingUrl,null);
    await assertFails(guest.firestore().collection('coachSessions').get());
    await assertFails(guest.firestore().doc('coachSessions/'+draftId).get());
  });
  await check('Private meeting credentials cannot be listed or read anonymously',async()=>{
    await assertFails(guest.firestore().collection('coachSessionSecrets').get());
    await assertFails(guest.firestore().doc('coachSessionSecrets/'+pubId).get());
  });
  await check('Signed-in student without enrollment cannot fetch a live class link',async()=>{
    await assertFails(learner.firestore().doc('coachSessionSecrets/'+pubId).get());
    await assertFails(coachOther.firestore().doc('coachSessionSecrets/'+pubId).get());
  });
  await check('Trusted enrollment grants that student and no others meeting access',async()=>{
    await rules.withSecurityRulesDisabled(async ctx=>ctx.firestore().doc(enrollment(pubId)).set({by:'trusted-test'}));
    const record=await assertSucceeds(learner.firestore().doc('coachSessionSecrets/'+pubId).get());
    assert.equal(record.data().meetingUrl,url);
    await assertFails(outsider.firestore().doc('coachSessionSecrets/'+pubId).get());
  });
  await check('Unauthorized learners and coaches cannot self-enroll',async()=>{
    for(const ctx of [learner,guest,ownerCoach,coachOther])
      await assertFails(ctx.firestore().doc('coachEnrollments/'+pubId+'/members/'+stranger).set({active:true}));
  });
  await check('Private draft link remains accessible only to its verified owner',async()=>{
    assert.equal((await assertSucceeds(ownerCoach.firestore().doc('coachSessionSecrets/'+draftId).get())).data().meetingUrl,url);
    await assertFails(learner.firestore().doc('coachSessionSecrets/'+draftId).get());
    await assertFails(coachUnverified.firestore().doc('coachSessionSecrets/'+draftId).get());
  });
  await check('Unauthenticated and unverified actors cannot create catalog records',async()=>{
    for(const ctx of [guest,learner,coachUnverified]){
      await assertFails(ctx.firestore().doc('coachSessions/ForgedDoc123').set({
        ...draft,ownerUid:viewer,createdAt:stamp(),updatedAt:stamp(),
      }));
    }
  });
  await check('Only verified owner can create and atomically store private link',async()=>{
    const id='NewDraft12345';
    const batch=ownerCoach.firestore().batch();
    batch.set(ownerCoach.firestore().doc('coachSessions/'+id),{...draft,createdAt:stamp(),updatedAt:stamp()});
    batch.set(ownerCoach.firestore().doc('coachSessionSecrets/'+id),{...privateData,updatedAt:stamp()});
    await assertSucceeds(batch.commit());
    const records=await assertSucceeds(ownerCoach.firestore().collection('coachSessions').where('ownerUid','==',owner).get());
    assert.ok(records.docs.length>=3);
  });
  await check('Other instructor cannot edit or read another teacher draft',async()=>{
    await assertFails(coachOther.firestore().doc('coachSessions/'+draftId).get());
    await assertFails(coachOther.firestore().doc('coachSessions/'+draftId).update({title:'Altered title',updatedAt:stamp()}));
    await assertFails(coachOther.firestore().doc('coachSessionSecrets/'+draftId).update({meetingUrl:url,updatedAt:stamp()}));
  });
  await check('Public meeting links are rejected even when approved coach publishes',async()=>{
    await assertFails(ownerCoach.firestore().doc('coachSessions/'+draftId).update({
      status:'published',meetingUrl:url,updatedAt:stamp(),
    }));
  });
  await check('Publishing without stored meeting secret is rejected',async()=>{
    const id='MissingSecret123';
    await assertSucceeds(ownerCoach.firestore().doc('coachSessions/'+id).set({
      ...draft,createdAt:stamp(),updatedAt:stamp(),
    }));
    await assertFails(ownerCoach.firestore().doc('coachSessions/'+id).update({
      status:'published',updatedAt:stamp(),
    }));
  });
  await check('Owner publishes a prepared live class, preserving private enrollment',async()=>{
    await assertSucceeds(ownerCoach.firestore().doc('coachSessions/'+draftId).update({
      status:'published',updatedAt:stamp(),
    }));
    const document=await assertSucceeds(learner.firestore().doc('coachSessions/'+draftId).get());
    assert.equal(document.data().meetingUrl,null);
    await assertFails(learner.firestore().doc('coachSessionSecrets/'+draftId).get());
    await assertFails(ownerCoach.firestore().doc('coachSessionSecrets/'+draftId).delete());
  });
  await check('Only owner can update secret with a validated provider URL',async()=>{
    const secret=ownerCoach.firestore().doc('coachSessionSecrets/'+pubId);
    await assertFails(secret.update({meetingUrl:'https://evil.example/join',updatedAt:stamp()}));
    await assertSucceeds(secret.update({meetingUrl:'https://us05web.zoom.us/j/123456',updatedAt:stamp()}));
  });

  const recordingId='Recorded12345';
  const recordingStoragePath='coach-recordings/'+owner+'/'+recordingId+'/video.mp4';
  await rules.withSecurityRulesDisabled(async ctx=>{
    await ctx.firestore().doc('coachSessions/'+recordingId).set({
      ...draft,kind:'recorded',status:'draft',startsAt:null,meetingUrl:null,
      videoPath:null,
    });
  });
  await check('Owner instructor can upload bounded MP4 to private draft',async()=>{
    await assertSucceeds(ownerCoach.storage().ref(recordingStoragePath).putString('test-mp4-bytes','raw',{contentType:'video/mp4'}));
  });
  await check('Other accounts cannot upload to instructor recordings',async()=>{
    for(const ctx of [guest,learner,coachOther]){
      await assertFails(ctx.storage().ref(recordingStoragePath).putString('forged','raw',{contentType:'video/mp4'}));
    }
  });
  await check('Draft recording is inaccessible without instructor ownership',async()=>{
    await assertFails(learner.storage().ref(recordingStoragePath).getDownloadURL());
  });
  await check('Published recording still rejects nonenrolled authenticated learners',async()=>{
    await assertSucceeds(ownerCoach.firestore().doc('coachSessions/'+recordingId).update({
      status:'published',videoPath:recordingStoragePath,updatedAt:stamp(),
    }));
    await assertFails(learner.storage().ref(recordingStoragePath).getDownloadURL());
    await assertFails(guest.storage().ref(recordingStoragePath).getDownloadURL());
  });
  await check('Backend enrollment enables playback metadata only for its member',async()=>{
    await rules.withSecurityRulesDisabled(async ctx=>ctx.firestore().doc(enrollment(recordingId)).set({by:'trusted-test'}));
    const played=await assertSucceeds(learner.storage().ref(recordingStoragePath).getDownloadURL());
    assert.ok(played.includes('video.mp4'));
    await assertFails(outsider.storage().ref(recordingStoragePath).getDownloadURL());
  });
  await check('Revoked enrollment prevents a fresh recording access check',async()=>{
    await rules.withSecurityRulesDisabled(async ctx=>ctx.firestore().doc(enrollment(recordingId)).delete());
    await assertFails(learner.storage().ref(recordingStoragePath).getDownloadURL());
  });
  console.log(JSON.stringify({totalRulesChecks:passed, scope:'firestore+storage+enrollment', privateTokensAreNotRevocable:true},null,2));
} finally { await rules.cleanup(); }
