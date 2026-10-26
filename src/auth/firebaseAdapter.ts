import type { AuthAdapter, AuthProviderName, AuthUser } from './types';
import type { FirebaseClientConfig } from './config';
import { getChessyFirebaseApp } from '../firebase/client';

const providerName = (providerId: string | undefined): AuthProviderName => {
  if (providerId === 'google.com') return 'google';
  if (providerId === 'password') return 'password';
  return 'unknown';
};

export async function createFirebaseAuthAdapter(
  config: FirebaseClientConfig,
  emulatorUrl: string | null,
): Promise<AuthAdapter> {
  const authModule = await import('firebase/auth');
  const app = await getChessyFirebaseApp(config);
  const auth = authModule.getAuth(app);

  // Configure the emulator before any async auth operation; on a page reload
  // setPersistence() may restore a user and begin token refresh immediately.
  if (emulatorUrl && !auth.emulatorConfig) {
    authModule.connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
  }
  await authModule.setPersistence(auth, authModule.indexedDBLocalPersistence);

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
      // Verification is required for private rooms. A retry button is available if delivery fails.
      try { await authModule.sendEmailVerification(credential.user); }
      catch { /* Account exists; verified-email action remains available for retry. */ }
    },
    async signInWithGoogle() {
      const provider = new authModule.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await authModule.signInWithPopup(auth, provider);
    },
    async sendVerificationEmail() {
      if (!auth.currentUser) throw Object.assign(new Error('Sign in first'), { code: 'auth/user-not-found' });
      await authModule.sendEmailVerification(auth.currentUser);
    },
    async refreshVerification() {
      if (!auth.currentUser) throw Object.assign(new Error('Sign in first'), { code: 'auth/user-not-found' });
      await authModule.reload(auth.currentUser);
      await authModule.getIdToken(auth.currentUser, true);
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
