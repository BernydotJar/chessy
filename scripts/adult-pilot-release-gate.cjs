'use strict';
/*
 * Fail-closed CONFIGURATION check. It does not read cloud credentials, authorize
 * a production deploy or replace legal, App Check or provider acceptance.
 */
const project='chessy-pwa-2026';
function httpsNotice(value){
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&url.username===''&&url.password===''&&
      url.hash===''&&url.hostname!=='localhost'&&url.pathname.length>1;
  }catch{return false;}
}
function livekitCloud(value){
  try{
    const url=new URL(value);
    return url.protocol==='wss:' && /^[a-z0-9-]+\.livekit\.cloud$/i.test(url.hostname) &&
      url.username===''&&url.password===''&&url.search===''&&url.hash==='';
  }catch{return false;}
}
function evaluate(env){
  const frontendNotice=env.VITE_CHESSY_ROOM_PRIVACY_URL;
  const backendNotice=env.CHESSY_ROOM_PRIVACY_NOTICE_URL;
  const checks={
    firebaseProject:env.VITE_FIREBASE_PROJECT_ID===project&&env.CHESSY_RELEASE_FIREBASE_PROJECT_ID===project,
    releaseSha:/^[a-f0-9]{40}$/.test(env.CHESSY_RELEASE_SHA||''),
    privateRoomsOn:env.VITE_CHESSY_PRIVATE_ROOMS_ENABLED==='true',
    liveFrontendOn:env.VITE_CHESSY_LIVEKIT_ENABLED==='true',
    adultFrontendOnly:env.VITE_CHESSY_ADULT_PILOT_ONLY==='true',
    adultBackendOnly:env.CHESSY_ADULT_PILOT_ONLY==='true',
    backendMediaEnabled:env.CHESSY_LIVEKIT_ENABLED==='true',
    mediaHeaderExplicit:env.CHESSY_DEPLOYMENT_CLASS==='adult-pilot'&&env.CHESSY_MEDIA_PERMISSIONS_ENABLED==='true',
    rollbackKeepsRoomData:env.VITE_CHESSY_ROOMS_DATA_MAY_EXIST==='true',
    appCheckWebKey:/^[A-Za-z0-9_-]{12,}$/.test(env.VITE_FIREBASE_APP_CHECK_SITE_KEY||''),
    reviewedNoticeConfigured:httpsNotice(frontendNotice)&&httpsNotice(backendNotice)&&frontendNotice===backendNotice,
    privacyVersion:/^[A-Za-z0-9._-]{4,40}$/.test(env.CHESSY_ROOM_PRIVACY_VERSION||''),
    dedicatedLiveKitCloudEndpoint:livekitCloud(env.CHESSY_LIVEKIT_URL),
  };
  const missing=Object.entries(checks).filter(([,passed])=>!passed).map(([key])=>key);
  return {
    mode:'adult-livekit-pilot',
    status:missing.length?'NO_GO':'CONFIGURATION_READY_REQUIRES_LIVE_ACCEPTANCE',
    deploymentAllowed:false,
    checks,missing,
    externalAcceptanceRequired:[
      'Cloud Functions API, project billing and quotas',
      'Dedicated Chessy LiveKit Cloud credentials in Secret Manager, backend deployed and reachable',
      'Published legally reviewed privacy notice including video and provider processing',
      'App Check reCAPTCHA Enterprise registered for exact domain and enforced; real attestation tested',
      'Firestore rules, TTL/retention, scheduled reconciliation and minor-enrollment=false verified',
      'Approved coach role assigned via trusted admin and verified adult test accounts',
      'Synthetic browser/device/network E2E, monitoring, controlled activation and tested rollback',
    ],
    note:'All checks here are local assertions. A passing configuration is NOT production approval.',
  };
}
if(require.main===module){
  const report={generatedAt:new Date().toISOString(),...evaluate(process.env)};
  console.log(JSON.stringify(report,null,2));
  if(process.argv.includes('--strict')&&report.status==='NO_GO')process.exitCode=2;
}
module.exports={evaluate,httpsNotice,livekitCloud};
