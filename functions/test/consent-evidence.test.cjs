'use strict';
const {describe,it}=require('node:test');
const assert=require('node:assert/strict');
const {generateKeyPairSync,sign}=require('node:crypto');
const {verifyConsentEvidence}=require('../consent-evidence.cjs');
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const publicKeyPem=publicKey.export({type:'spki',format:'pem'});
const nowMs=Date.now();
const claim={
  iss:'trusted-vpc-provider',purpose:'chessy-guardian-consent',
  guardianUid:'testParent1',roomId:'R'.repeat(20),ageBand:'6-9',
  policyVersion:3,requestId:'R'.repeat(20)+'_testParent1',consented:true,
  iat:Math.floor(nowMs/1000)-10,exp:Math.floor(nowMs/1000)+3600,
};
const config={publicKeyPem,issuer:'trusted-vpc-provider',kid:'vpc-key-1',
  guardianUid:'testParent1',roomId:'R'.repeat(20),ageBand:'6-9',policyVersion:3,nowMs};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function make(claims=claim,headers={alg:'EdDSA',typ:'JWT',kid:'vpc-key-1'}){
  const payload=encode(headers)+'.'+encode(claims);
  const signature=sign(null,Buffer.from(payload),privateKey);
  return payload+'.'+signature.toString('base64url');
}
describe('out of band guardian consent provider signature',()=>{
  it('verifies a bound, signed assertion and stores only its digest',()=>{
    const result=verifyConsentEvidence(make(),config);
    assert.match(result.receiptDigest,/^[a-f0-9]{64}$/);
    assert.ok(result.expiresAtMs>nowMs);
    assert.ok(!JSON.stringify(result).includes('testParent1'));
  });
  it('rejects a forged or modified assertion',()=>{
    const value=make();
    const [header,payload,sig]=value.split('.');
    assert.throws(()=>verifyConsentEvidence(header+'.'+encode({...claim,ageBand:'10-12'})+'.'+sig,config),/signature/);
    assert.throws(()=>verifyConsentEvidence(value.slice(0,-1)+'?',config));
  });
  it('rejects wrong account, room, age, policy, source and replay context',()=>{
    for(const bad of [
      {...claim,guardianUid:'other'},
      {...claim,roomId:'O'.repeat(20)},
      {...claim,ageBand:'13-17'},
      {...claim,policyVersion:2},
      {...claim,requestId:'wrong'},
      {...claim,iss:'untrusted'},
      {...claim,consented:false},
      {...claim,purpose:'another-site'},
    ])assert.throws(()=>verifyConsentEvidence(make(bad),config),/match/);
  });
  it('rejects bad key id, signature algorithm and expired or future assertions',()=>{
    assert.throws(()=>verifyConsentEvidence(make(claim,{alg:'none',typ:'JWT',kid:'vpc-key-1'}),config),/Untrusted/);
    assert.throws(()=>verifyConsentEvidence(make(claim,{alg:'EdDSA',typ:'JWT',kid:'wrong'}),config),/Untrusted/);
    assert.throws(()=>verifyConsentEvidence(make({...claim,exp:Math.floor(nowMs/1000)-1}),config),/expired/);
    assert.throws(()=>verifyConsentEvidence(make({...claim,iat:Math.floor(nowMs/1000)+3600}),config),/invalid/);
    assert.throws(()=>verifyConsentEvidence(make({...claim,exp:Math.floor(nowMs/1000)+45*86400}),config),/invalid/);
  });
});
