export type AuthStatus = 'booting' | 'unconfigured' | 'signed-out' | 'signed-in';

export type AuthProviderName = 'password' | 'google' | 'unknown';

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  provider: AuthProviderName;
  emailVerified: boolean;
  // Only set from Firebase ID-token custom claims, never a client-side preference.
  premiumThemes?: boolean;
}

export interface AuthAdapter {
  observe(listener: (user: AuthUser | null) => void): () => void;
  signInWithEmail(email: string, password: string): Promise<void>;
  createAccount(email: string, password: string, displayName?: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  deleteCurrentAccount(): Promise<void>;
}
