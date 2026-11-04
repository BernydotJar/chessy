import type { FirebaseClientConfig } from '../auth/config';

export const CHESSY_FIREBASE_APP_NAME = 'chessy-auth';
const emulatorConnections = new Map<string, Promise<void>>();
const appCheckConnections = new Set<string>();
const remotePilot = import.meta.env.VITE_CHESSY_REMOTE_DEV_PILOT === 'true';
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

/** HTTPS-only same-origin transport to the disposable adult QA emulators.
 * This is never enabled in the regular public-web release. */
export async function invokeChessyCallable<T>(config: FirebaseClientConfig, name: string,
  data: Record<string, unknown>): Promise<T> {
  const {functionsSdk, functions}=await getChessyFunctions(config);
  const invoke = remotePilot ?
    functionsSdk.httpsCallableFromURL<Record<string, unknown>, T>(functions,
      `${location.origin}/demo-chessy-livekit/us-central1/${encodeURIComponent(name)}`) :
    functionsSdk.httpsCallable<Record<string, unknown>, T>(functions,name);
  return (await invoke(data)).data;
}

/** All Firebase consumers share one app; local Firestore emulator must be attached before any operation. */
export async function getChessyFirebaseApp(config: FirebaseClientConfig) {
  const appModule = await import('firebase/app');
  const existing = appModule.getApps().find((app) => app.name === CHESSY_FIREBASE_APP_NAME);
  const app = existing ?? appModule.initializeApp(config, CHESSY_FIREBASE_APP_NAME);
  if (remotePilot) {
    // The gateway authenticates users and proxies SDK traffic over TLS. Do not
    // accept a cross-origin or insecure endpoint from build-time configuration.
    if (location.protocol !== 'https:') throw new Error('Remote pilot requires HTTPS');
    if (!emulatorConnections.has(app.name)) {
      emulatorConnections.set(app.name, import('firebase/firestore').then(firestore => {
        firestore.initializeFirestore(app, { host: location.host, ssl: true,
          experimentalForceLongPolling: true });
      }));
    }
    await emulatorConnections.get(app.name);
  }
  const devEmulator = !remotePilot && import.meta.env.DEV && import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_URL;
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
