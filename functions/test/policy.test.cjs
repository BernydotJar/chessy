'use strict';
const {describe,it}=require('node:test');
const assert=require('node:assert/strict');
const {LIMITS,isSafeId,allows,rateNext,policyAllowsMinor,sha256}=require('../policy.cjs');
describe('bounded operations and mandatory minor safeguards',()=>{
  it('denies malformed tokens and inappropriate room audiences',()=>{
    assert.equal(isSafeId('A'.repeat(20)),true);
    assert.equal(isSafeId('../123'),false);
    assert.equal(allows('children','adult'),false);
    assert.equal(allows('adults','6-9'),false);
    assert.equal(allows('mixed','10-12'),true);
  });
  it('counts within fixed windows and rejects every over-quota call',()=>{
    const start=1000,limit={count:2,windowMs:10000};
    const first=rateNext(null,start,limit);
    assert.deepEqual(first,{windowStartMs:start,count:1});
    const second=rateNext(first,2000,limit);
    assert.equal(second.count,2);
    assert.equal(rateNext(second,3000,limit),null);
    assert.deepEqual(rateNext(second,11000,limit),{windowStartMs:11000,count:1});
    assert.equal(rateNext({count:999,windowStartMs:30000},20000,limit)?.count,1);
    assert.equal(LIMITS.roomCreation.count,3);
    assert.equal(LIMITS.invitation.count,10);
  });
  it('requires both operator policy release and exact server issued approval',()=>{
    const time=Date.now();
    const approval={schemaVersion:1,status:'approved',guardianUid:'parentA',roomId:'room1',ageBand:'6-9',policyVersion:5,expiresAt:{toMillis:()=>time+1000}};
    const input={uid:'parentA',roomId:'room1',ageBand:'6-9'};
    const policy={minorEnrollmentEnabled:true,policyVersion:5};
    assert.equal(policyAllowsMinor(null,approval,input,time),false);
    assert.equal(policyAllowsMinor({...policy,minorEnrollmentEnabled:false},approval,input,time),false);
    assert.equal(policyAllowsMinor(policy,null,input,time),false);
    assert.equal(policyAllowsMinor(policy,{...approval,status:'pending'},input,time),false);
    assert.equal(policyAllowsMinor(policy,{...approval,policyVersion:4},input,time),false);
    assert.equal(policyAllowsMinor(policy,approval,{...input,uid:'other'},time),false);
    assert.equal(policyAllowsMinor(policy,approval,{...input,ageBand:'10-12'},time),false);
    assert.equal(policyAllowsMinor(policy,approval,input,time+1500),false);
    assert.equal(policyAllowsMinor(policy,approval,input,time),true);
  });
  it('hashes external receipt references without storing raw evidence',()=>{
    assert.match(sha256('external-test-receipt'),/^[a-f0-9]{64}$/);
    assert.notEqual(sha256('receipt1'),sha256('receipt2'));
  });
});
