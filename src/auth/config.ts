export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
  storageBucket?: string;
  measurementId?: string;
}

export interface AuthRuntimeConfig {
  firebase: FirebaseClientConfig | null;
  emulatorUrl: string | null;
}

type ClientEnv = Record<string, string | boolean | undefined>;

const text = (value: string | boolean | undefined) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export const requiredFirebaseVariables = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export function missingFirebaseVariables(env: ClientEnv): string[] {
  return requiredFirebaseVariables.filter((key) => !text(env[key]));
}

export function readFirebaseClientConfig(env: ClientEnv): FirebaseClientConfig | null {
  if (missingFirebaseVariables(env).length > 0) return null;
  const config: FirebaseClientConfig = {
    apiKey: text(env.VITE_FIREBASE_API_KEY)!,
    authDomain: text(env.VITE_FIREBASE_AUTH_DOMAIN)!,
    projectId: text(env.VITE_FIREBASE_PROJECT_ID)!,
    appId: text(env.VITE_FIREBASE_APP_ID)!,
  };
  const messagingSenderId = text(env.VITE_FIREBASE_MESSAGING_SENDER_ID);
  const storageBucket = text(env.VITE_FIREBASE_STORAGE_BUCKET);
  const measurementId = text(env.VITE_FIREBASE_MEASUREMENT_ID);
  if (messagingSenderId) config.messagingSenderId = messagingSenderId;
  if (storageBucket) config.storageBucket = storageBucket;
  if (measurementId) config.measurementId = measurementId;
  return config;
}

export function readAuthRuntimeConfig(env: ClientEnv = import.meta.env): AuthRuntimeConfig {
  return {
    firebase: readFirebaseClientConfig(env),
    emulatorUrl: text(env.VITE_FIREBASE_AUTH_EMULATOR_URL) ?? null,
  };
}
