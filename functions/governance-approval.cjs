'use strict';

/**
 * Two-key policy-release proof. Signers approve an exact release SHA, Firebase
 * project, countries, privacy notice digest, and next policy version.
 *
 * A signature proves possession of an approved key, NOT professional
 * qualifications, legal compliance, deployment or corporate independence.
 */
const {createHash,createPublicKey,verify}=require('node:crypto');
const PURPOSE='chessy-minor-safety-release';
const DOMAIN='chessy:minor-policy-release:v1\n';
const keys=(object)=>Object.keys(object||{}).sort();
const exact=(object,expected)=>object&&typeof object==='object'&&!Array.isArray(object)&&
  JSON.stringify(keys(object))===JSON.stringify([...expected].sort());
const sha=value=>createHash('sha256').update(value).digest('hex');
const ref=value=>typeof value==='string'&&/^[A-Za-z0-9._-]{8,128}$/.test(value);
const release=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function normalizePayload(input){
  const fields=['schemaVersion','purpose','projectId','releaseSha','policyVersion',
    'issuedAtMs','expiresAtMs','ticket','jurisdictions','privacyNotice',
    'legalReviewRef','securityReviewRef'];
  if(!exact(input,fields))throw new Error('Unknown or missing governance manifest fields');
  if(input.schemaVersion!==1||input.purpose!==PURPOSE||
    typeof input.projectId!=='string'||!/^[a-zA-Z][A-Za-z0-9-]{5,60}$/.test(input.projectId)||
    !release(input.releaseSha)||!Number.isSafeInteger(input.policyVersion)||
    input.policyVersion<1||input.policyVersion>1000000)
    throw new Error('Invalid policy release scope');
  if(!Number.isSafeInteger(input.issuedAtMs)||!Number.isSafeInteger(input.expiresAtMs)||
    input.expiresAtMs<=input.issuedAtMs||input.expiresAtMs-input.issuedAtMs>30*86400000)
    throw new Error('Invalid policy release lifetime');
  if(!ref(input.ticket)||!ref(input.legalReviewRef)||!ref(input.securityReviewRef)||
    input.legalReviewRef===input.securityReviewRef)
    throw new Error('Distinct legal and security review references required');
  if(!Array.isArray(input.jurisdictions)||input.jurisdictions.length===0||
    input.jurisdictions.length>20||input.jurisdictions.some(s=>typeof s!=='string'||!/^[A-Z]{2}$/.test(s))||
    new Set(input.jurisdictions).size!==input.jurisdictions.length)
    throw new Error('Unique ISO 3166-1 alpha-2 jurisdictions required');
  if(!exact(input.privacyNotice,['url','version','sha256'])||
    typeof input.privacyNotice.url!=='string'||
    typeof input.privacyNotice.version!=='string'||
    !/^[A-Za-z0-9._-]{4,40}$/.test(input.privacyNotice.version)||
    !digest(input.privacyNotice.sha256))
    throw new Error('Signed, versioned privacy notice digest required');
  let url;
  try{url=new URL(input.privacyNotice.url);}catch{throw new Error('Invalid privacy notice URL');}
  if(url.protocol!=='https:'||!url.hostname||url.username||url.password||
    url.hash||url.hostname==='localhost'||url.pathname==='/'||
    !input.privacyNotice.url.startsWith('https://'))
    throw new Error('Notice must be a published HTTPS document URL');
  return {
    schemaVersion:1,purpose:PURPOSE,projectId:input.projectId,
    releaseSha:input.releaseSha,policyVersion:input.policyVersion,
    issuedAtMs:input.issuedAtMs,expiresAtMs:input.expiresAtMs,
    ticket:input.ticket,
    jurisdictions:[...input.jurisdictions].sort(),
    privacyNotice:{
      url:input.privacyNotice.url,version:input.privacyNotice.version,
      sha256:input.privacyNotice.sha256,
    },
    legalReviewRef:input.legalReviewRef,securityReviewRef:input.securityReviewRef,
  };
}
function signedBytes(claims){
  return Buffer.from(DOMAIN+JSON.stringify(normalizePayload(claims)));
}
function verifyReleaseApproval(record,options){
  if(!exact(record,['payload','signatures'])||
    !exact(record.signatures,['legal','security']))
    throw new Error('Governance manifest must contain two named signatures');
  const {legalPublicKeyPem,securityPublicKeyPem,projectId,releaseSha,policyVersion,
    nowMs=Date.now(),privacyNoticeUrl,privacyNoticeVersion}=options||{};
  const claims=normalizePayload(record.payload);
  if(claims.projectId!==projectId||claims.releaseSha!==releaseSha||
    claims.policyVersion!==policyVersion||claims.privacyNotice.url!==privacyNoticeUrl||
    claims.privacyNotice.version!==privacyNoticeVersion)
    throw new Error('Signed governance scope does not match target deployment');
  if(claims.issuedAtMs>nowMs+60000||claims.expiresAtMs<=nowMs)
    throw new Error('Governance approval expired or issued in future');
  if(!legalPublicKeyPem||!securityPublicKeyPem)
    throw new Error('Two pinned independent approval public keys are required');
  const legalKey=createPublicKey(legalPublicKeyPem);
  const securityKey=createPublicKey(securityPublicKeyPem);
  if(legalKey.asymmetricKeyType!=='ed25519'||securityKey.asymmetricKeyType!=='ed25519')
    throw new Error('Only Ed25519 governance signature keys are accepted');
  if(legalKey.export({format:'der',type:'spki'}).equals(securityKey.export({format:'der',type:'spki'})))
    throw new Error('Legal and security must not share a signing key');
  const payload=signedBytes(claims);
  for(const [role,publicKey] of [['legal',legalKey],['security',securityKey]]){
    const signature=record.signatures[role];
    if(typeof signature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(signature)||
      Buffer.from(signature,'base64url').length!==64||
      !verify(null,payload,publicKey,Buffer.from(signature,'base64url')))
      throw new Error('Missing or invalid '+role+' approval signature');
  }
  return {payload:claims,evidenceDigest:sha(payload)};
}
module.exports={PURPOSE,DOMAIN,normalizePayload,signedBytes,verifyReleaseApproval};
