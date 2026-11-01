'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {evaluate,httpsNotice,livekitCloud}=require('../adult-pilot-release-gate.cjs');
const config={
  VITE_FIREBASE_PROJECT_ID:'chessy-pwa-2026',CHESSY_RELEASE_FIREBASE_PROJECT_ID:'chessy-pwa-2026',
  CHESSY_RELEASE_SHA:'a'.repeat(40),
  VITE_CHESSY_PRIVATE_ROOMS_ENABLED:'true',VITE_CHESSY_LIVEKIT_ENABLED:'true',
  VITE_CHESSY_ADULT_PILOT_ONLY:'true',CHESSY_ADULT_PILOT_ONLY:'true',
  CHESSY_LIVEKIT_ENABLED:'true',CHESSY_DEPLOYMENT_CLASS:'adult-pilot',
  CHESSY_MEDIA_PERMISSIONS_ENABLED:'true',VITE_CHESSY_ROOMS_DATA_MAY_EXIST:'true',
  VITE_FIREBASE_APP_CHECK_SITE_KEY:'example-only-public-key',
  VITE_CHESSY_ROOM_PRIVACY_URL:'https://chessy.example.com/privacy/rooms',
  CHESSY_ROOM_PRIVACY_NOTICE_URL:'https://chessy.example.com/privacy/rooms',
  CHESSY_ROOM_PRIVACY_VERSION:'adult-v1',
  CHESSY_LIVEKIT_URL:'wss://chessy-pilot.livekit.cloud'
};
test('default environment cannot accidentally turn on the adult video pilot',()=>{
  const report=evaluate({});
  assert.equal(report.status,'NO_GO');
  assert.equal(report.deploymentAllowed,false);
  assert.ok(report.missing.includes('appCheckWebKey'));
  assert.ok(report.missing.includes('reviewedNoticeConfigured'));
  assert.ok(report.missing.includes('adultBackendOnly'));
});
test('even all locally satisfied flags do not constitute external production acceptance',()=>{
  const report=evaluate(config);
  assert.equal(report.status,'CONFIGURATION_READY_REQUIRES_LIVE_ACCEPTANCE');
  assert.equal(report.deploymentAllowed,false);
  assert.equal(report.missing.length,0);
  assert.ok(report.externalAcceptanceRequired.length>=6);
});
test('every required setting fails closed if removed independently',()=>{
  for(const key of Object.keys(config)){
    const broken={...config};
    delete broken[key];
    assert.equal(evaluate(broken).status,'NO_GO',key);
  }
});
test('unsafe URLs are not accepted for notices or provider endpoints',()=>{
  for(const url of ['http://chessy.example.com/privacy','https://localhost/privacy','https://user:pass@example.com/legal',
    'https://example.com/','https://example.com/legal#fragment','javascript:alert(1)']){
    assert.equal(httpsNotice(url),false,url);
  }
  for(const url of ['ws://chessy.livekit.cloud','wss://chessy.livekit.cloud.evil.com',
    'wss://user:pass@chessy.livekit.cloud','wss://local.host','wss://chessy.livekit.cloud/?token=1']){
    assert.equal(livekitCloud(url),false,url);
  }
});
