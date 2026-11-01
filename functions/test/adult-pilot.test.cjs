'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {adultPilotOnly,allowsAdultRoom,allowsAdultEnrollment}=require('../adult-pilot.cjs');

test('adult-only mode denies child or mixed classroom creation and invitations',()=>{
  const enabled={CHESSY_ADULT_PILOT_ONLY:'true'};
  assert.equal(adultPilotOnly(enabled),true);
  for(const audience of ['children','mixed',null,undefined,[],['adults'],{}]){
    assert.equal(allowsAdultRoom(audience,enabled),false);
  }
  assert.equal(allowsAdultRoom('adults',enabled),true);
});
test('adult-only mode denies minor enrollment even on forged adult invite',()=>{
  const enabled={CHESSY_ADULT_PILOT_ONLY:'true'};
  for(const audience of ['children','mixed','adults',null,undefined]){
    for(const band of ['6-9','10-12','13-17',[],['adult'],null]){
      assert.equal(allowsAdultEnrollment(audience,band,enabled),false);
    }
  }
  assert.equal(allowsAdultEnrollment('adults','adult',enabled),true);
  assert.equal(allowsAdultEnrollment('mixed','adult',enabled),false);
});
test('legacy opt-out keeps prior behavior for existing protected rooms',()=>{
  const disabled={CHESSY_ADULT_PILOT_ONLY:'false'};
  for(const env of [disabled,{}]){
    assert.equal(adultPilotOnly(env),false);
    assert.equal(allowsAdultRoom('children',env),true);
    assert.equal(allowsAdultEnrollment('children','6-9',env),true);
  }
});
