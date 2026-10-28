'use strict';
/**
 * Operator-only CLI. Uses Firebase Admin SDK/ADC; never runs in the browser.
 * Consent issuance requires a receipt confirmed OUTSIDE Chessy.
 * This CLI does not verify the receipt with an external provider and is NOT evidence of legal compliance.
 *
 * Default is READ ONLY. Mutations require --apply and a case/ticket ID.
 */
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,Timestamp}=require('firebase-admin/firestore');
const fs=require('node:fs');
const {verifyConsentEvidence}=require('./consent-evidence.cjs');
const {verifyReleaseApproval}=require('./governance-approval.cjs');
const {LIMITS,isSafeId,isMinor,text}=require('./policy.cjs');
const opts=Object.fromEntries(process.argv.slice(2).filter(arg=>arg.startsWith('--'))
  .map(arg=>arg.slice(2).split(/=(.*)/s).slice(0,2)));
const action=process.argv[2];
const project=opts.project||process.env.GCLOUD_PROJECT;
if(!project||!/^[a-zA-Z][a-zA-Z0-9-]{5,60}$/.test(project)){
  process.stderr.write('Provide an explicit --project=PROJECT_ID and authorized Google ADC.\n');
  process.exit(2);
}
initializeApp({projectId:project});
const db=getFirestore();
const apply=opts.apply==='yes';
const ticket=text(opts.ticket,6,120);
const yes=()=>{if(!apply||!ticket)throw new Error('No mutation without --apply=yes and --ticket=approved-case-id');};
const validAge=age=>isMinor(age);
function requireId(){if(!isSafeId(opts.room))throw new Error('Invalid --room=roomId');}
function requireUid(){if(!opts.uid||!/^[A-Za-z0-9:_-]{5,128}$/.test(opts.uid))throw new Error('Invalid --uid=UID');}
async function log(action,roomId,details={}){
  const now=Timestamp.now();
  await db.collection('roomAudit').add({
    schemaVersion:1,action,actorUid:'ops-admin-iam',roomId,details:{ticket,...details},
    createdAt:now,expiresAt:Timestamp.fromMillis(Date.now()+LIMITS.auditMs),
  });
}
async function main(){
  if(!['policy-status','policy-disable','policy-enable','requests','approve','revoke'].includes(action))
    throw new Error('Use policy-status, policy-disable, policy-enable, requests, approve, or revoke');
  if(action==='policy-status'){
    const snap=await db.doc('roomSafety/config').get();
    console.log(JSON.stringify({project,policy:snap.data()||{minorEnrollmentEnabled:false,policyVersion:null}},null,2));
    return;
  }
  if(action==='requests'){
    const docs=await db.collection('guardianReviewRequests').where('status','==','pending').limit(50).get();
    console.log(JSON.stringify(docs.docs.map(doc=>({
      id:doc.id,roomId:doc.get('roomId'),ageBand:doc.get('ageBand'),expiresAt:doc.get('expiresAt')?.toDate()?.toISOString(),
    })),null,2));
    return;
  }
  if(action==='policy-disable'){
    yes();
    const ref=db.doc('roomSafety/config');
    await db.runTransaction(async tx=>{
      const prior=(await tx.get(ref)).data()||{};
      tx.set(ref,{schemaVersion:1,minorEnrollmentEnabled:false,policyVersion:(prior.policyVersion||0)+1,
        disabledAt:Timestamp.now(),reviewTicket:ticket},{merge:true});
    });
    await log('safety.minors.disabled','global');
    console.log('Minor enrollment disabled. Existing approvals invalidated by policy version change.');
    return;
  }
  if(action==='policy-enable'){
    yes();
    if(!opts.approvalFile||!/^[a-f0-9]{40}$/.test(opts.releaseSha||''))
      throw new Error('A --releaseSha and --approvalFile with two independent signatures are required');
    if(!process.env.CHESSY_LEGAL_APPROVAL_PUBLIC_KEY_PEM||
       !process.env.CHESSY_SECURITY_APPROVAL_PUBLIC_KEY_PEM)
      throw new Error('Both independent pinned governance public keys are required');
    const source=fs.readFileSync(opts.approvalFile,'utf8');
    if(Buffer.byteLength(source,'utf8')>16384)throw new Error('Governance approval manifest too large');
    const approvalManifest=JSON.parse(source);
    const ref=db.doc('roomSafety/config');
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref),prior=snap.data()||{};
      if(prior.minorEnrollmentEnabled===true)
        throw new Error('The minor safety policy is already enabled: disable it before a new release');
      const nextVersion=(prior.policyVersion||0)+1;
      const evidence=verifyReleaseApproval(approvalManifest,{
        legalPublicKeyPem:process.env.CHESSY_LEGAL_APPROVAL_PUBLIC_KEY_PEM,
        securityPublicKeyPem:process.env.CHESSY_SECURITY_APPROVAL_PUBLIC_KEY_PEM,
        projectId:project,releaseSha:opts.releaseSha,policyVersion:nextVersion,
        privacyNoticeUrl:process.env.CHESSY_ROOM_PRIVACY_NOTICE_URL,
        privacyNoticeVersion:process.env.CHESSY_ROOM_PRIVACY_VERSION,
      });
      if(evidence.payload.ticket!==ticket)throw new Error('Signed review ticket mismatch');
      const receipt=db.doc('roomReleaseApprovals/'+evidence.evidenceDigest);
      const consumed=await tx.get(receipt);
      if(consumed.exists)throw new Error('Signed release approval has already been used');
      const timestamp=Timestamp.now();
      tx.create(receipt,{schemaVersion:1,projectId:project,policyVersion:nextVersion,
        releaseSha:opts.releaseSha,createdAt:timestamp,
        expiresAt:Timestamp.fromMillis(Date.now()+LIMITS.auditMs)});
      tx.set(ref,{
        schemaVersion:1,minorEnrollmentEnabled:true,policyVersion:nextVersion,
        enabledAt:timestamp,reviewTicket:ticket,
        legalReviewerRef:evidence.payload.legalReviewRef,
        securityReviewerRef:evidence.payload.securityReviewRef,
        evidenceDigest:evidence.evidenceDigest,
        approvedReleaseSha:opts.releaseSha,
        privacyNoticeVersion:evidence.payload.privacyNotice.version,
        privacyNoticeUrl:evidence.payload.privacyNotice.url,
        privacyNoticeSha256:evidence.payload.privacyNotice.sha256,
        allowedJurisdictions:evidence.payload.jurisdictions,
      },{merge:true});
      tx.create(db.collection('roomAudit').doc(),{
        schemaVersion:1,action:'safety.minors.enabled',actorUid:'ops-admin-iam',
        roomId:'global',
        details:{ticket,releaseSha:opts.releaseSha,policyVersion:nextVersion,
          jurisdictions:evidence.payload.jurisdictions,
          approvalDigest:evidence.evidenceDigest},
        createdAt:timestamp,expiresAt:Timestamp.fromMillis(Date.now()+LIMITS.auditMs),
      });
    });
    console.log('Signed two-reviewer policy authorization verified and activated.');
    return;
  }
  requireId();requireUid();
  const approval=db.doc('roomGuardianApprovals/'+opts.room+'_'+opts.uid);
  const review=db.doc('guardianReviewRequests/'+opts.room+'_'+opts.uid);
  if(action==='approve'){
    yes();
    const source=opts.assertionFile;
    if(!source||!process.env.CHESSY_VPC_ED25519_PUBLIC_KEY_PEM||
      !process.env.CHESSY_VPC_ISSUER||!process.env.CHESSY_VPC_KEY_ID)
      throw new Error('Trusted provider signing key, issuer, key id and --assertionFile are required');
    const raw=fs.readFileSync(source,'utf8').trim();
    const roomRef=db.doc('learningRooms/'+opts.room);
    const policyRef=db.doc('roomSafety/config');
    let accepted=false;
    await db.runTransaction(async tx=>{
      const [pending,policy,room]=await Promise.all([
        tx.get(review),tx.get(policyRef),tx.get(roomRef),
      ]);
      const data=pending.data(),settings=policy.data();
      if(!data||data.status!=='pending'||data.guardianUid!==opts.uid||!validAge(data.ageBand)||
        data.expiresAt?.toMillis()<=Date.now()||room.data()?.status!=='active')
        throw new Error('No active matching request and room');
      if(!settings||settings.minorEnrollmentEnabled!==true||
         !Number.isSafeInteger(settings.policyVersion)||settings.policyVersion<1)
        throw new Error('Active signed safety policy is required before guardian verification');
      const evidence=verifyConsentEvidence(raw,{
        publicKeyPem:process.env.CHESSY_VPC_ED25519_PUBLIC_KEY_PEM,
        issuer:process.env.CHESSY_VPC_ISSUER,kid:process.env.CHESSY_VPC_KEY_ID,
        guardianUid:opts.uid,roomId:opts.room,ageBand:data.ageBand,policyVersion:settings.policyVersion,
      });
      const receipt=db.doc('roomConsentReceipts/'+evidence.receiptDigest);
      const [receiptExists,approvalExists]=await Promise.all([tx.get(receipt),tx.get(approval)]);
      if(receiptExists.exists||approvalExists.exists)throw new Error('Receipt reused or consent already approved');
      tx.create(receipt,{schemaVersion:1,roomId:opts.room,guardianUid:opts.uid,
        issuedAt:Timestamp.now(),expiresAt:Timestamp.fromMillis(Date.now()+LIMITS.auditMs)});
      tx.create(approval,{
        schemaVersion:1,status:'approved',guardianUid:opts.uid,roomId:opts.room,ageBand:data.ageBand,
        policyVersion:settings.policyVersion,verificationMethod:'signed-external-vpc',
        receiptDigest:evidence.receiptDigest,operatorTicket:ticket,
        issuedAt:Timestamp.now(),expiresAt:Timestamp.fromMillis(evidence.expiresAtMs),
      });
      tx.delete(review);
      tx.create(db.collection('roomAudit').doc(),{
        schemaVersion:1,action:'guardian.approval.recorded',actorUid:'ops-admin-iam',
        roomId:opts.room,details:{ticket,ageBand:data.ageBand,issuer:evidence.issuer},
        createdAt:Timestamp.now(),expiresAt:Timestamp.fromMillis(Date.now()+LIMITS.auditMs),
      });
      accepted=true;
    });
    if(!accepted)throw new Error('Consent transaction did not complete');
    console.log('Signed external evidence verified and replay-protected; approval recorded.');
    return;
  }
  if(action==='revoke'){
    yes();
    // Remove live enrollment, answers summary, and both permissions immediately.
    const batch=db.batch();
    batch.delete(approval);
    batch.delete(review);
    batch.delete(db.doc('userRooms/'+opts.uid+'/rooms/'+opts.room));
    batch.delete(db.doc('learningRooms/'+opts.room+'/members/'+opts.uid));
    batch.delete(db.doc('learningRooms/'+opts.room+'/diagnostics/'+opts.uid));
    await batch.commit();
    await log('guardian.approval.revoked',opts.room);
    console.log('Approval revoked; membership and diagnostic erased.');
  }
}
main().catch(error=>{console.error('OPS_ABORTED:',error.message);process.exitCode=1;});
