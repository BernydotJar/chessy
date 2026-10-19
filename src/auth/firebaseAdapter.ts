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
      let active = true;
      let revision = 0;
      const unsubscribe = authModule.onIdTokenChanged(auth, async (user) => {
        const current = ++revision;
        if (!user) {
          listener(null);
          return;
        }
        const mapped = mapUser(user);
        try {
          const token = await authModule.getIdTokenResult(user);
          mapped.premiumThemes = token.claims.chessyPremiumThemes === true;
        } catch {
          // Authentication remains usable offline; premium access fails closed.
          mapped.premiumThemes = false;
        }
        if (active && current === revision) listener(mapped);
      });
      return () => { active = false; ++revision; unsubscribe(); };
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
