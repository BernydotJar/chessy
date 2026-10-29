'use strict';
const {createPublicKey,verify,createHash}=require('node:crypto');
const {DAY,isSafeId,isMinor}=require('./policy.cjs');
const re=/^[A-Za-z0-9_-]+$/;
function decode(part){
  if(typeof part!=='string'||part.length>4096||!re.test(part))throw new Error('Invalid signed assertion encoding');
  return JSON.parse(Buffer.from(part,'base64url').toString('utf8'));
}
/**
 * Authenticate a narrow, provider-signed verification assertion. Verification of
 * a guardian's real-world identity and the legal adequacy of the consent process
 * remain the contracted VPC provider's and the operator's responsibility.
 */
function verifyConsentEvidence(assertion,{publicKeyPem,issuer,kid,guardianUid,roomId,ageBand,policyVersion,nowMs=Date.now()}){
  if(typeof assertion!=='string'||assertion.length>8192||!publicKeyPem||!issuer||!kid||
    !isSafeId(roomId)||!isMinor(ageBand)||!Number.isSafeInteger(policyVersion)||policyVersion<1)
    throw new Error('Missing trusted provider configuration or input');
  const parts=assertion.split('.');
  if(parts.length!==3)throw new Error('Not a JWS');
  const [head,body,sig]=parts;
  const header=decode(head),payload=decode(body);
  if(header.alg!=='EdDSA'||header.typ!=='JWT'||header.kid!==kid)
    throw new Error('Untrusted signature algorithm or key identifier');
  const valid=verify(null,Buffer.from(head+'.'+body),createPublicKey(publicKeyPem),Buffer.from(sig,'base64url'));
  if(!valid)throw new Error('Invalid consent provider signature');
  if(payload.iss!==issuer||payload.purpose!=='chessy-guardian-consent'||
    payload.guardianUid!==guardianUid||payload.roomId!==roomId||
    payload.ageBand!==ageBand||payload.policyVersion!==policyVersion||
    payload.requestId!==roomId+'_'+guardianUid||payload.consented!==true)
    throw new Error('Consent verification assertions must match the exact request');
  if(!Number.isSafeInteger(payload.iat)||!Number.isSafeInteger(payload.exp)||
    payload.iat*1000>nowMs+60000||payload.exp*1000<=nowMs||
    payload.exp<=payload.iat||payload.exp-payload.iat>30*24*3600)
    throw new Error('Verification receipt expired, invalid, or too long-lived');
  const digest=createHash('sha256').update(assertion).digest('hex');
  return {receiptDigest:digest,issuer,kid,expiresAtMs:Math.min(payload.exp*1000,nowMs+30*DAY)};
}
module.exports={verifyConsentEvidence};
