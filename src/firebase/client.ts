import type { FirebaseClientConfig } from '../auth/config';

export const CHESSY_FIREBASE_APP_NAME = 'chessy-auth';
const emulatorConnections = new Map<string, Promise<void>>();

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
  return app;
}
