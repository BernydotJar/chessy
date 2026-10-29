import type { FirebaseClientConfig } from '../auth/config';

export const CHESSY_FIREBASE_APP_NAME = 'chessy-auth';
const emulatorConnections = new Map<string, Promise<void>>();
const appCheckConnections = new Set<string>();
export async function getChessyFunctions(config: FirebaseClientConfig) {
  const app=await getChessyFirebaseApp(config);
  const functionsSdk=await import('firebase/functions');
  const functions=functionsSdk.getFunctions(app,'us-central1');
  const endpoint=import.meta.env.DEV && import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_URL;
  if (typeof endpoint==='string' && endpoint.trim()) {
    const url=new URL(endpoint);
    if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname)||!url.port)
      throw new Error('Invalid local Functions emulator URL');
    if(!appCheckConnections.has('functions-'+app.name)){
      functionsSdk.connectFunctionsEmulator(functions,url.hostname,Number(url.port));
      appCheckConnections.add('functions-'+app.name);
    }
  }
  return {functionsSdk,functions};
}

/** All Firebase consumers share one app; local Firestore emulator must be attached before any operation. */
export async function getChessyFirebaseApp(config: FirebaseClientConfig) {
  const appModule = await import('firebase/app');
  const existing = appModule.getApps().find((app) => app.name === CHESSY_FIREBASE_APP_NAME);
  const app = existing ?? appModule.initializeApp(config, CHESSY_FIREBASE_APP_NAME);
  const devEmulator = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_URL;
  if (typeof devEmulator === 'string' && devEmulator.trim()) {
    if (!emulatorConnections.has(app.name)) {
      const uri = new URL(devEmulator);
      if (uri.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(uri.hostname) ||
        !uri.port || !Number.isSafeInteger(Number(uri.port))) throw new Error('Invalid local Firestore emulator address');
      emulatorConnections.set(app.name, import('firebase/firestore').then(firestore => {
        firestore.connectFirestoreEmulator(firestore.getFirestore(app),uri.hostname,Number(uri.port));
      }));
    }
    await emulatorConnections.get(app.name);
  }
  const siteKey=import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
  if(import.meta.env.PROD && typeof siteKey==='string' && siteKey.trim() &&
    !appCheckConnections.has('appcheck-'+app.name)){
    const appCheckSdk=await import('firebase/app-check');
    appCheckSdk.initializeAppCheck(app,{
      provider:new appCheckSdk.ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled:true,
    });
    appCheckConnections.add('appcheck-'+app.name);
  }
  return app;
}
