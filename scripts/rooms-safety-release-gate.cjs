'use strict';
/**
 * Local release-readiness preflight. Does not access cloud accounts or claim
 * legal compliance. Set --strict to fail when a release cannot proceed.
 */
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const mode=process.argv.includes('--minors')?'minors':'adults';
const strict=process.argv.includes('--strict');
const rules=read('firestore.rules');
const functions=read('functions/index.cjs');
const indexes=JSON.parse(read('firestore.indexes.json'));
const exist=file=>fs.existsSync(path.join(ROOT,file));
const configPresent=(key,regex)=>regex.test(process.env[key]||'');
const technical={
  denyDirectMinorConsents:rules.includes('function currentMinorApproval')&&rules.includes("allow read, write: if false;"),
  denyDirectRoomCreation:rules.includes('allow create: if false; // Server-only: quota'),
  callableAppCheck:functions.includes("enforceAppCheck:process.env.FUNCTIONS_EMULATOR!=='true'"),
  retentionWorker:exist('functions/retention.cjs')&&functions.includes('cleanupExpiredLearningRooms'),
  auditsAndQuotas:functions.includes('roomAudit')&&functions.includes('rateUpdate'),
  ttlDefinitions:indexes.fieldOverrides.filter(f=>f.ttl===true).length>=7,
  browserSecurityTests:exist('scripts/rooms-auth-browser-e2e.cjs')&&exist('scripts/room-rules-verify.mjs'),
  consentSignatureValidation:exist('functions/consent-evidence.cjs')&&functions.includes('requestGuardianReview'),
  publishedPrivacyNotice:configPresent('CHESSY_ROOM_PRIVACY_NOTICE_URL',/^https:\/\/[^\s/]+\/.+/) &&
    configPresent('CHESSY_ROOM_PRIVACY_VERSION',/^[A-Za-z0-9._-]{4,40}$/),
  appCheckSiteKey:configPresent('VITE_FIREBASE_APP_CHECK_SITE_KEY',/^[A-Za-z0-9_-]{12,}$/),
};
const external={
  legalReviewApproved:configPresent('CHESSY_LEGAL_REVIEW_REF',/^[A-Za-z0-9._-]{8,}$/),
  securityReviewApproved:configPresent('CHESSY_SECURITY_REVIEW_REF',/^[A-Za-z0-9._-]{8,}$/),
  externalConsentProviderConfigured:!!process.env.CHESSY_VPC_ED25519_PUBLIC_KEY_PEM &&
    !!process.env.CHESSY_VPC_ISSUER && !!process.env.CHESSY_VPC_KEY_ID,
  providerContractAndJurisdictionReview:configPresent('CHESSY_PRIVACY_DPA_APPROVAL_REF',/^[A-Za-z0-9._-]{8,}$/),
  productionBudgetsAndMonitoring:configPresent('CHESSY_FIREBASE_OPS_APPROVAL_REF',/^[A-Za-z0-9._-]{8,}$/),
  signedFinalPrivacyNotices:configPresent('CHESSY_PRIVACY_NOTICE_APPROVAL_REF',/^[A-Za-z0-9._-]{8,}$/),
};
const missing=Object.entries(technical).filter(([,value])=>!value).map(([name])=>name);
if(mode==='minors')missing.push(...Object.entries(external).filter(([,value])=>!value).map(([name])=>name));
const report={
  generatedAt:new Date().toISOString(),mode,status:missing.length?'NO_GO':'CONFIGURATION_CHECKS_PASS',
  note:'Configuration checks do not prove legal compliance or verify live cloud deployment. Live security and legal sign-off are separately mandatory.',
  technical,external,missing,approvalRequired:mode==='minors',
};
const target=path.join(ROOT,'progress/evidence/rooms/safety-release-gate-'+mode+'.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(strict&&missing.length)process.exitCode=2;
