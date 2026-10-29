'use strict';
const {initializeApp,getApps}=require('firebase-admin/app');
const {getFirestore,Timestamp,FieldValue}=require('firebase-admin/firestore');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {logger}=require('firebase-functions');
const {LIMITS,text,isSafeId,isMinor,isAgeBand,isAudience,isLanguage,allows,rateNext}=require('./policy.cjs');
if(getApps().length===0)initializeApp();
const db=getFirestore();
const REGION='us-central1';
// The Functions emulator does not provision an App Check issuer.
 // Production always enforces App Check; emulator tests verify Auth and rules separately.
const PRIVATE={region:REGION,enforceAppCheck:process.env.FUNCTIONS_EMULATOR!=='true',maxInstances:10,memory:'256MiB'};
const LIVE_PRIVATE={...PRIVATE,secrets:['CHESSY_LIVEKIT_API_KEY','CHESSY_LIVEKIT_API_SECRET']};
const live=require('./livekit.cjs').createLiveService({db,Timestamp,HttpsError});
const ttl=ms=>Timestamp.fromMillis(Date.now()+ms);
const now=()=>Timestamp.now();
function requirePublishedPrivacyNotice(){
  if(process.env.FUNCTIONS_EMULATOR==='true')return;
  const uri=process.env.CHESSY_ROOM_PRIVACY_NOTICE_URL||'';
  const version=process.env.CHESSY_ROOM_PRIVACY_VERSION||'';
  if(!/^https:\/\/[^\s/]+\/.+/.test(uri)||!/^[A-Za-z0-9._-]{4,40}$/.test(version))
    throw new HttpsError('failed-precondition','Published privacy notice and version are required before opening private rooms');
}
function principal(request){
  const a=request.auth;
  if(!a || a.token?.email_verified!==true)throw new HttpsError('unauthenticated','Verified account required');
  return a;
}
function coach(request){
  const a=principal(request);
  if(!['coach','admin'].includes(a.token.chessyRole))throw new HttpsError('permission-denied','Approved coach required');
  return a;
}
function checkRoomData(data){
  const title=text(data?.title,6,80);
  if(!title||!isAudience(data?.audience)||!isLanguage(data?.language))throw new HttpsError('invalid-argument','Invalid room metadata');
  return {title,audience:data.audience,language:data.language};
}
function audit(type,actorUid,roomId,details={}){
  return {
    schemaVersion:1,action:type,actorUid,roomId,details,createdAt:now(),
    expiresAt:ttl(LIMITS.auditMs),
  };
}
function writeAudit(tx,action,uid,roomId,details={}){
  tx.create(db.collection('roomAudit').doc(),audit(action,uid,roomId,details));
}
function rateInTransaction(tx,uid,type){
  const ref=db.doc('roomRateLimits/'+uid+'_'+type);
  return {ref,limit:LIMITS[type],type};
}
function rateUpdate(tx,rate,snap){
  const next=rateNext(snap.exists?snap.data():null,Date.now(),rate.limit);
  if(!next)throw new HttpsError('resource-exhausted','Operation rate limit exceeded');
  tx.set(rate.ref,{schemaVersion:1,...next,lastAt:now(),expiresAt:ttl(rate.limit.windowMs+LIMITS.auditMs)});
}

exports.createLearningRoom=onCall(PRIVATE,async request=>{
  requirePublishedPrivacyNotice();
  const a=coach(request), data=checkRoomData(request.data);
  const room=db.collection('learningRooms').doc();
  const board=room.collection('board').doc('current');
  const rate=rateInTransaction(null,a.uid,'roomCreation');
  await db.runTransaction(async tx=>{
    const snap=await tx.get(rate.ref);
    rateUpdate(tx,rate,snap);
    const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    tx.create(room,{
      schemaVersion:1,ownerUid:a.uid,...data,status:'active',
      createdAt:now(),updatedAt:now(),expiresAt:ttl(LIMITS.maxRoomAgeMs),admissionCount:0,
    });
    tx.create(board,{fen,initialFen:fen,moves:[],revision:0,locked:false,updatedAt:now()});
    writeAudit(tx,'room.created',a.uid,room.id,{audience:data.audience});
  });
  return {roomId:room.id};
});

exports.issueRoomInvitation=onCall(PRIVATE,async request=>{
  requirePublishedPrivacyNotice();
  const a=coach(request),roomId=request.data?.roomId;
  if(!isSafeId(roomId))throw new HttpsError('invalid-argument','Invalid room identifier');
  const room=db.doc('learningRooms/'+roomId),rate=rateInTransaction(null,a.uid,'invitation');
  const invite=db.collection('roomInvites').doc();
  await db.runTransaction(async tx=>{
    const [roomSnap,rateSnap]=await Promise.all([tx.get(room),tx.get(rate.ref)]);
    const data=roomSnap.data();
    if(!data||data.ownerUid!==a.uid||data.status!=='active'||data.expiresAt?.toMillis()<=Date.now())
      throw new HttpsError('permission-denied','Room is not active or not owned by coach');
    rateUpdate(tx,rate,rateSnap);
    tx.create(invite,{
      schemaVersion:1,roomId,ownerUid:a.uid,roomTitle:data.title,audience:data.audience,
      createdAt:now(),expiresAt:ttl(LIMITS.inviteMs),roomExpiresAt:data.expiresAt,
    });
    writeAudit(tx,'invite.issued',a.uid,roomId);
  });
  return {inviteId:invite.id};
});

exports.joinLearningRoom=onCall(PRIVATE,async request=>{
  requirePublishedPrivacyNotice();
  const a=principal(request);
  const {inviteId,ageBand,guardianAcknowledged}=request.data||{};
  if(!isSafeId(inviteId)||!isAgeBand(ageBand)||guardianAcknowledged!==isMinor(ageBand))
    throw new HttpsError('invalid-argument','Age and adult supervision required');
  const invitation=db.doc('roomInvites/'+inviteId);
  const rate=rateInTransaction(null,a.uid,'enrollment');
  let enrolledRoomId;
  await db.runTransaction(async tx=>{
    const [inviteSnap,rateSnap]=await Promise.all([tx.get(invitation),tx.get(rate.ref)]);
    const invite=inviteSnap.data();
    if(!invite||invite.expiresAt?.toMillis()<=Date.now()||!allows(invite.audience,ageBand)||
      !isSafeId(invite.roomId))
      throw new HttpsError('failed-precondition','Invitation unavailable');
    const room=db.doc('learningRooms/'+invite.roomId);
    const member=room.collection('members').doc(a.uid);
    const userIndex=db.doc('userRooms/'+a.uid+'/rooms/'+invite.roomId);
    const consent=db.doc('roomGuardianApprovals/'+invite.roomId+'_'+a.uid);
    const policy=db.doc('roomSafety/config');
    const [roomSnap,memberSnap,indexSnap,consentSnap,policySnap]=await Promise.all([
      tx.get(room),tx.get(member),tx.get(userIndex),tx.get(consent),tx.get(policy),
    ]);
    const roomData=roomSnap.data(),epoch=Date.now();
    if(!roomData||roomData.status!=='active'||roomData.ownerUid!==invite.ownerUid||
      roomData.expiresAt?.toMillis()<=epoch||indexSnap.exists||memberSnap.exists)
      throw new HttpsError('failed-precondition','Room unavailable or membership exists');
    const admissionCount=Number.isInteger(roomData.admissionCount)?roomData.admissionCount:0;
    if(admissionCount>=LIMITS.maxAdmissionsPerRoom)
      throw new HttpsError('resource-exhausted','Room admission quota reached');
    let deadline=Math.min(epoch+(isMinor(ageBand)?LIMITS.childMembershipMs:LIMITS.adultMembershipMs),
      roomData.expiresAt.toMillis());
    if(isMinor(ageBand)){
      const {policyAllowsMinor}=require('./policy.cjs');
      if(!policyAllowsMinor(policySnap.data(),consentSnap.data(),{
        uid:a.uid,roomId:room.id,ageBand,
      },epoch))throw new HttpsError('permission-denied','Verified guardian authorization required');
      deadline=Math.min(deadline,consentSnap.data().expiresAt.toMillis());
    }
    if(deadline<=epoch)throw new HttpsError('failed-precondition','Membership expiry invalid');
    rateUpdate(tx,rate,rateSnap);
    const payload={schemaVersion:1,uid:a.uid,roomId:room.id,inviteId,ageBand,
      guardianConfirmed:isMinor(ageBand),joinedAt:now(),expiresAt:Timestamp.fromMillis(deadline)};
    tx.create(member,payload);
    tx.create(userIndex,payload);
    tx.update(room,{admissionCount:admissionCount+1,updatedAt:now()});
    writeAudit(tx,'room.member.joined',a.uid,room.id,{ageBand});
    enrolledRoomId=room.id;
  });
  return {roomId:enrolledRoomId};
});

exports.revokeRoomInvitation=onCall(PRIVATE,async request=>{
  const a=coach(request),id=request.data?.inviteId;
  if(!isSafeId(id))throw new HttpsError('invalid-argument','Invalid invitation identifier');
  const ref=db.doc('roomInvites/'+id);
  await db.runTransaction(async tx=>{
    const snapshot=await tx.get(ref);
    const data=snapshot.data();
    if(!data||data.ownerUid!==a.uid)throw new HttpsError('permission-denied','Invitation not found');
    tx.delete(ref);
    writeAudit(tx,'invite.revoked',a.uid,data.roomId);
  });
  return {revoked:true};
});

exports.closeLearningRoom=onCall(LIVE_PRIVATE,async request=>{
  const a=coach(request),id=request.data?.roomId;
  if(!isSafeId(id))throw new HttpsError('invalid-argument','Invalid room identifier');
  const ref=db.doc('learningRooms/'+id);
  await db.runTransaction(async tx=>{
    const snapshot=await tx.get(ref),data=snapshot.data();
    if(!data||data.ownerUid!==a.uid||!['active','closed'].includes(data.status))throw new HttpsError('permission-denied','Active room not found');
    if(data.status==='active')tx.update(ref,{status:'closed',updatedAt:now(),closedAt:now(),purgeAfter:ttl(LIMITS.closedRoomGraceMs)});
    writeAudit(tx,'room.closed',a.uid,id);
  });
  await live.closeRoom(id);
  return {closed:true};
});

/**
 * This only creates a PENDING request. It does not verify parental identity,
 * the legal basis or consent. It must never create a guardian approval.
 */
exports.requestGuardianReview=onCall(PRIVATE,async request=>{
  requirePublishedPrivacyNotice();
  const a=principal(request);
  const {inviteId,ageBand,guardianAcknowledged}=request.data||{};
  if(!isSafeId(inviteId)||!isMinor(ageBand)||guardianAcknowledged!==true)
    throw new HttpsError('invalid-argument','Age band and responsible adult acknowledgment required');
  const invite=db.doc('roomInvites/'+inviteId);
  const rate=rateInTransaction(null,a.uid,'reviewRequest');
  const requested=db.collection('guardianReviewRequests');
  let resultId;
  await db.runTransaction(async tx=>{
    const [inviteSnap,rateSnap]=await Promise.all([tx.get(invite),tx.get(rate.ref)]);
    const info=inviteSnap.data();
    if(!info||info.expiresAt?.toMillis()<=Date.now()||!allows(info.audience,ageBand))
      throw new HttpsError('failed-precondition','Invitation unavailable');
    const roomSnap=await tx.get(db.doc('learningRooms/'+info.roomId));
    if(!roomSnap.exists||roomSnap.data().status!=='active')
      throw new HttpsError('failed-precondition','Room unavailable');
    rateUpdate(tx,rate,rateSnap);
    const review=requested.doc(info.roomId+'_'+a.uid);
    resultId=review.id;
    tx.set(review,{schemaVersion:1,roomId:info.roomId,guardianUid:a.uid,
      ageBand,status:'pending',createdAt:now(),expiresAt:ttl(LIMITS.reviewRequestMs)});
    writeAudit(tx,'guardian.review.requested',a.uid,info.roomId);
  });
  return {requestId:resultId,status:'pending'};
});

/** Retire all learner-derived room records, even when a safety policy has been disabled. */
exports.withdrawRoomParticipation=onCall(LIVE_PRIVATE,async request=>{
  const a=principal(request),roomId=request.data?.roomId;
  if(!isSafeId(roomId))throw new HttpsError('invalid-argument','Invalid room identifier');
  const member=db.doc('learningRooms/'+roomId+'/members/'+a.uid);
  const index=db.doc('userRooms/'+a.uid+'/rooms/'+roomId);
  const diagnostic=db.doc('learningRooms/'+roomId+'/diagnostics/'+a.uid);
  const approval=db.doc('roomGuardianApprovals/'+roomId+'_'+a.uid);
  const review=db.doc('guardianReviewRequests/'+roomId+'_'+a.uid);
  await db.runTransaction(async tx=>{
    const membership=await tx.get(index);
    // Safe to retry even when the membership no longer exists.
    tx.delete(index);
    tx.delete(member);
    tx.delete(diagnostic);
    tx.delete(approval);
    tx.delete(review);
    if(membership.exists)writeAudit(tx,'learner.withdrawn',a.uid,roomId);
  });
  await live.withdraw(roomId,a.uid);
  return {removed:true};
});

/** Account-rights cleanup for review records with no remaining active membership. */
exports.eraseAllMyGuardianReviews=onCall(PRIVATE,async request=>{
  const a=principal(request);
  const enrolled=await db.collection('userRooms').doc(a.uid).collection('rooms').limit(1).get();
  if(!enrolled.empty)throw new HttpsError('failed-precondition','Leave every room first');
  const [requests,approvals]=await Promise.all([
    db.collection('guardianReviewRequests').where('guardianUid','==',a.uid).limit(100).get(),
    db.collection('roomGuardianApprovals').where('guardianUid','==',a.uid).limit(100).get(),
  ]);
  if(requests.size===100||approvals.size===100)
    throw new HttpsError('failed-precondition','Contact support for bulk erasure');
  const batch=db.batch();
  requests.forEach(doc=>batch.delete(doc.ref));
  approvals.forEach(doc=>batch.delete(doc.ref));
  writeAudit(batch,'guardian.reviews.erased',a.uid,'account');
  await batch.commit();
  return {deleted:requests.size+approvals.size};
});

/** This is informational: approval must originate from verified out-of-band process and policy release. */
exports.getGuardianAccessStatus=onCall(PRIVATE,async request=>{
  const a=principal(request);
  const {roomId,ageBand}=request.data||{};
  if(!isSafeId(roomId)||!isMinor(ageBand))throw new HttpsError('invalid-argument','Invalid request');
  const [policy,approval,pending]=await Promise.all([
    db.doc('roomSafety/config').get(),
    db.doc('roomGuardianApprovals/'+roomId+'_'+a.uid).get(),
    db.doc('guardianReviewRequests/'+roomId+'_'+a.uid).get(),
  ]);
  const {policyAllowsMinor}=require('./policy.cjs');
  const allowed=policyAllowsMinor(policy.data(),approval.data(),{uid:a.uid,roomId,ageBand},Date.now());
  return {allowed,approvalExpiresAt:allowed?approval.data().expiresAt.toMillis():null,pending:pending.exists&&pending.data().status==='pending'&&pending.data().expiresAt?.toMillis()>Date.now()};
});

exports.eraseGuardianReview=onCall(PRIVATE,async request=>{
  const a=principal(request);
  const id=request.data?.roomId;
  if(!isSafeId(id))throw new HttpsError('invalid-argument','Invalid room');
  const [member,index]=[db.doc('learningRooms/'+id+'/members/'+a.uid),db.doc('userRooms/'+a.uid+'/rooms/'+id)];
  const snap=await index.get();
  // A caller must first withdraw room membership via the normal transaction.
  if(snap.exists)throw new HttpsError('failed-precondition','Leave the room before withdrawing approval');
  const batch=db.batch();
  batch.delete(db.doc('guardianReviewRequests/'+id+'_'+a.uid));
  batch.delete(db.doc('roomGuardianApprovals/'+id+'_'+a.uid));
  batch.delete(member);
  batch.set(db.collection('roomAudit').doc(),audit('guardian.review.erased',a.uid,id));
  await batch.commit();
  return {deleted:true};
});


/** Only canonical scores are stored, never a learner's raw answers. */
exports.submitRoomDiagnostic=onCall(PRIVATE,async request=>{
  requirePublishedPrivacyNotice();
  const a=principal(request);
  const {roomId,goal,answers}=request.data||{};
  if(!isSafeId(roomId)||!['discover','family','compete'].includes(goal)||
    !answers||typeof answers!=='object'||Array.isArray(answers)||
    Object.keys(answers).length!==5||
    Object.keys(answers).some(id=>!['q1','q2','q3','q4','q5'].includes(id))||
    Object.values(answers).some(value=>!['a','b','c'].includes(value)))
    throw new HttpsError('invalid-argument','Invalid diagnostic');
  const room=db.doc('learningRooms/'+roomId);
  const member=room.collection('members').doc(a.uid);
  const diagnostic=room.collection('diagnostics').doc(a.uid);
  const grade=Object.entries({q1:'b',q2:'a',q3:'c',q4:'a',q5:'b'})
    .reduce((score,[id,answer])=>score+Number(answers[id]===answer),0);
  await db.runTransaction(async tx=>{
    const [roomSnap,memberSnap,diagnosticSnap,policySnap,approvalSnap]=await Promise.all([
      tx.get(room),tx.get(member),tx.get(diagnostic),tx.get(db.doc('roomSafety/config')),
      tx.get(db.doc('roomGuardianApprovals/'+roomId+'_'+a.uid)),
    ]);
    const info=roomSnap.data(),membership=memberSnap.data();
    if(!info||!membership||info.status!=='active'||info.expiresAt?.toMillis()<=Date.now()||
      membership.expiresAt?.toMillis()<=Date.now()||diagnosticSnap.exists)
      throw new HttpsError('failed-precondition','Valid active membership and first submission required');
    const {policyAllowsMinor}=require('./policy.cjs');
    if(isMinor(membership.ageBand) &&
      !policyAllowsMinor(policySnap.data(),approvalSnap.data(),
        {uid:a.uid,roomId,ageBand:membership.ageBand},Date.now()))
      throw new HttpsError('permission-denied','Parental approval must still be active');
    tx.create(diagnostic,{
      schemaVersion:2,uid:a.uid,roomId,ageBand:membership.ageBand,goal,
      score:grade,total:5,submittedAt:now(),
      expiresAt:membership.expiresAt,
    });
    writeAudit(tx,'diagnostic.completed',a.uid,roomId,{ageBand:membership.ageBand});
  });
  return {score:grade,total:5,route:grade>=4?'bridge':'zero'};
});

const {cleanupExpired}=require('./retention.cjs');
exports.cleanupExpiredLearningRooms=onSchedule({
  schedule:'every 24 hours',timeZone:'Etc/UTC',region:REGION,
  memory:'512MiB',timeoutSeconds:540,retryCount:0,
},async()=>{
  const report=await cleanupExpired({db,logger});
  logger.info('Chessy room retention cleanup',report);
  if(report.errors>0)throw new Error('Retention cleanup had failures; review logs and retry');
});

// Media endpoints keep the same verified identity/App Check boundary as private rooms.
exports.startLearningRoomLive=onCall(LIVE_PRIVATE,request=>{requirePublishedPrivacyNotice();return live.start(request);});
exports.joinLearningRoomLive=onCall(LIVE_PRIVATE,request=>{requirePublishedPrivacyNotice();return live.join(request);});
exports.endLearningRoomLive=onCall(LIVE_PRIVATE,request=>live.end(request));
exports.moderateLearningRoomLive=onCall(LIVE_PRIVATE,request=>live.moderate(request));
exports.reconcileLearningRoomLive=onSchedule({region:REGION,schedule:'every 1 minutes',
  secrets:LIVE_PRIVATE.secrets,memory:'256MiB',timeoutSeconds:120,maxInstances:1,retryCount:0,
},async()=>{
  const report=await live.reconcile();
  logger.info('Chessy media lifecycle reconciliation',report);
  if(report.failed)throw new Error('Classroom media cleanup needs retry');
});
