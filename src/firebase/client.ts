import type { FirebaseClientConfig } from '../auth/config';

export const CHESSY_FIREBASE_APP_NAME = 'chessy-auth';

export async function getChessyFirebaseApp(config: FirebaseClientConfig) {
  const appModule = await import('firebase/app');
  const existing = appModule.getApps().find((app) => app.name === CHESSY_FIREBASE_APP_NAME);
  return existing ?? appModule.initializeApp(config, CHESSY_FIREBASE_APP_NAME);
}
