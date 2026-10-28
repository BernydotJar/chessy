'use strict';
const {describe,it}=require('node:test');
const assert=require('node:assert/strict');
const {generateKeyPairSync,sign,createHash}=require('node:crypto');
const {signedBytes,verifyReleaseApproval}=require('../governance-approval.cjs');

const legal=generateKeyPairSync('ed25519'),security=generateKeyPairSync('ed25519');
const pem=key=>key.export({type:'spki',format:'pem'});
const nowMs=Date.now();
const privacy={
  url:'https://chessy.example.org/legal/privacy-2026',
  version:'chessy-2026-10',
  sha256:createHash('sha256').update('test notice').digest('hex'),
};
const claims={
  schemaVersion:1,purpose:'chessy-minor-safety-release',
  projectId:'demo-chessy-rooms',
  releaseSha:'a'.repeat(40),
  policyVersion:3,
  issuedAtMs:nowMs-10000,expiresAtMs:nowMs+100000,
  ticket:'CASE-REVIEW-2026',
  jurisdictions:['GT','US'],
  privacyNotice:privacy,
  legalReviewRef:'LEGAL-2026-10',
  securityReviewRef:'SECURITY-2026-10',
};
const config={
  legalPublicKeyPem:pem(legal.publicKey),securityPublicKeyPem:pem(security.publicKey),
  projectId:claims.projectId,releaseSha:claims.releaseSha,
  policyVersion:claims.policyVersion,nowMs,
  privacyNoticeUrl:privacy.url,privacyNoticeVersion:privacy.version,
};
const record=(payload=claims)=>({
  payload,
  signatures:{
    legal:sign(null,signedBytes(payload),legal.privateKey).toString('base64url'),
    security:sign(null,signedBytes(payload),security.privateKey).toString('base64url'),
  },
});
describe('independently signed and scoped minor safety release',()=>{
  it('accepts both pinned distinct signatures on the exact canonical release',()=>{
    const checked=verifyReleaseApproval(record(),config);
    assert.equal(checked.payload.releaseSha,claims.releaseSha);
    assert.equal(checked.payload.policyVersion,3);
    assert.match(checked.evidenceDigest,/^[a-f0-9]{64}$/);
    assert.deepEqual(checked.payload.jurisdictions,['GT','US']);
  });
  it('rejects a single signature, arbitrary approval strings and unknown fields',()=>{
    const r=record();
    assert.throws(()=>verifyReleaseApproval({...r,signatures:{legal:r.signatures.legal}},config),/two named signatures/);
    assert.throws(()=>verifyReleaseApproval({...r,signatures:{...r.signatures,security:r.signatures.legal}},config),/security approval signature/);
    assert.throws(()=>verifyReleaseApproval({...r,payload:{...claims,extra:'silent'}},config),/manifest fields/);
    assert.throws(()=>verifyReleaseApproval({...r,legacyReview:'approved'},config),/two named signatures/);
  });
  it('binds the approved release SHA, project, policy version and exact notice',()=>{
    for(const override of [
      {releaseSha:'b'.repeat(40)},
      {projectId:'demo-someotherproject'},
      {policyVersion:4},
      {privacyNoticeUrl:'https://chessy.example.org/privacy-v2'},
      {privacyNoticeVersion:'chessy-2026-11'},
    ])assert.throws(()=>verifyReleaseApproval(record(),{...config,...override}),/scope does not match/);
    assert.throws(()=>verifyReleaseApproval(record(),{...config,nowMs:nowMs+200000}),/expired/);
  });
  it('rejects tampering with legal country or privacy digest even if signature remains',()=>{
    for(const changed of [
      {...claims,jurisdictions:['GT','CA']},
      {...claims,privacyNotice:{...privacy,sha256:'b'.repeat(64)}},
      {...claims,securityReviewRef:'SECURITY-OVERRIDDEN'},
      {...claims,expiresAtMs:nowMs+864000},
    ])assert.throws(()=>verifyReleaseApproval({...record(),payload:changed},config),/signature/);
  });
  it('requires independent Ed25519 signing keys, not one reviewer key reused',()=>{
    assert.throws(()=>verifyReleaseApproval(record(),{...config,securityPublicKeyPem:config.legalPublicKeyPem}),/not share/);
    assert.throws(()=>verifyReleaseApproval(record(),{...config,legalPublicKeyPem:''}),/Two pinned/);
    const rsa=generateKeyPairSync('rsa',{modulusLength:2048});
    assert.throws(()=>verifyReleaseApproval(record(),{...config,securityPublicKeyPem:pem(rsa.publicKey)}),/Ed25519/);
  });
  it('rejects future-dated, expired, duplicate or non-HTTPS unsafe manifests',()=>{
    const malformed=[
      {...claims,issuedAtMs:nowMs+120000,expiresAtMs:nowMs+240000},
      {...claims,expiresAtMs:nowMs-1},
      {...claims,legalReviewRef:claims.securityReviewRef},
      {...claims,jurisdictions:['GT','GT']},
      {...claims,privacyNotice:{...privacy,url:'http://localhost/privacy'}},
    ];
    for(const c of malformed)
      assert.throws(()=>verifyReleaseApproval(record(c),config));
  });
});
