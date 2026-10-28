'use strict';

/**
 * Fail before Firebase Admin SDK initialization if a safety E2E runner is not
 * attached to the isolated, fixed-port demo emulators.
 * No flag or fake project name can convert this into a production test.
 */
const EXPECTED={
  FIRESTORE_EMULATOR_HOST:'127.0.0.1:19608',
  FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:19639',
};
function assertLocalFirebaseEmulators({auth=true,firestore=true}={}){
  for(const key of Object.keys(EXPECTED)){
    if((key==='FIREBASE_AUTH_EMULATOR_HOST'&&!auth)||
       (key==='FIRESTORE_EMULATOR_HOST'&&!firestore))continue;
    if(process.env[key]!==EXPECTED[key])
      throw new Error('SAFETY_STOP: '+key+' must be '+EXPECTED[key]+'; refusing to access a live Firebase project');
  }
}
module.exports={assertLocalFirebaseEmulators};
