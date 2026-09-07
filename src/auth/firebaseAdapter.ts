import type { AuthAdapter, AuthProviderName, AuthUser } from './types';
import type { FirebaseClientConfig } from './config';

const providerName = (providerId: string | undefined): AuthProviderName => {
  if (providerId === 'google.com') return 'google';
  if (providerId === 'password') return 'password';
  return 'unknown';
};

export async function createFirebaseAuthAdapter(
  config: FirebaseClientConfig,
  emulatorUrl: string | null,
): Promise<AuthAdapter> {
  const appModule = await import('firebase/app');
  const authModule = await import('firebase/auth');
  const existing = appModule.getApps().find((app) => app.name === 'chessy-auth');
  const app = existing ?? appModule.initializeApp(config, 'chessy-auth');
  const auth = authModule.getAuth(app);

  await authModule.setPersistence(auth, authModule.indexedDBLocalPersistence);
  if (emulatorUrl && !auth.emulatorConfig) {
    authModule.connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
  }

  const mapUser = (user: import('firebase/auth').User): AuthUser => ({
    id: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoURL,
    provider: providerName(user.providerData[0]?.providerId),
    emailVerified: user.emailVerified,
  });

  return {
    observe(listener) {
      return authModule.onAuthStateChanged(auth, (user) => listener(user ? mapUser(user) : null));
    },
    async signInWithEmail(email, password) {
      await authModule.signInWithEmailAndPassword(auth, email, password);
    },
    async createAccount(email, password, displayName) {
      const credential = await authModule.createUserWithEmailAndPassword(auth, email, password);
      if (displayName?.trim()) await authModule.updateProfile(credential.user, { displayName: displayName.trim() });
    },
    async signInWithGoogle() {
      const provider = new authModule.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await authModule.signInWithPopup(auth, provider);
    },
    async resetPassword(email) {
      await authModule.sendPasswordResetEmail(auth, email);
    },
    async signOut() {
      await authModule.signOut(auth);
    },
    async deleteCurrentAccount() {
      if (!auth.currentUser) throw Object.assign(new Error('No authenticated user'), { code: 'auth/user-not-found' });
      await authModule.deleteUser(auth.currentUser);
    },
  };
}
