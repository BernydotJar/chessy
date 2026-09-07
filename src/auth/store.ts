import { create } from 'zustand';
import { readAuthRuntimeConfig } from './config';
import { normalizeAuthError, type AuthErrorCode } from './errors';
import { createFirebaseAuthAdapter } from './firebaseAdapter';
import type { AuthAdapter, AuthStatus, AuthUser } from './types';

interface AuthStore {
  status: AuthStatus;
  user: AuthUser | null;
  busy: boolean;
  error: AuthErrorCode | null;
  notice: 'password-reset-sent' | 'account-deleted' | null;
  initialize(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<boolean>;
  createAccount(email: string, password: string, displayName?: string): Promise<boolean>;
  signInWithGoogle(): Promise<boolean>;
  resetPassword(email: string): Promise<boolean>;
  signOut(): Promise<boolean>;
  deleteCurrentAccount(): Promise<boolean>;
  clearFeedback(): void;
}

let adapter: AuthAdapter | null = null;
let initializePromise: Promise<void> | null = null;
let unsubscribe: (() => void) | null = null;

async function runAuthAction(
  set: (state: Partial<AuthStore>) => void,
  action: (active: AuthAdapter) => Promise<void>,
  notice?: AuthStore['notice'],
): Promise<boolean> {
  if (!adapter) {
    set({ error: 'unknown', busy: false });
    return false;
  }
  set({ busy: true, error: null, notice: null });
  try {
    await action(adapter);
    set({ busy: false, ...(notice ? { notice } : {}) });
    return true;
  } catch (error) {
    set({ busy: false, error: normalizeAuthError(error) });
    return false;
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  status: 'booting',
  user: null,
  busy: false,
  error: null,
  notice: null,
  initialize: async () => {
    if (initializePromise) return initializePromise;
    initializePromise = (async () => {
      const runtime = readAuthRuntimeConfig();
      if (!runtime.firebase) {
        set({ status: 'unconfigured', user: null, busy: false });
        return;
      }
      try {
        adapter = await createFirebaseAuthAdapter(runtime.firebase, runtime.emulatorUrl);
        unsubscribe?.();
        unsubscribe = adapter.observe((user) => set({ status: user ? 'signed-in' : 'signed-out', user, busy: false }));
      } catch (error) {
        set({ status: 'signed-out', user: null, busy: false, error: normalizeAuthError(error) });
      }
    })();
    return initializePromise;
  },
  signInWithEmail: (email, password) => runAuthAction(set, (active) => active.signInWithEmail(email, password)),
  createAccount: (email, password, displayName) => runAuthAction(set, (active) => active.createAccount(email, password, displayName)),
  signInWithGoogle: () => runAuthAction(set, (active) => active.signInWithGoogle()),
  resetPassword: (email) => runAuthAction(set, (active) => active.resetPassword(email), 'password-reset-sent'),
  signOut: () => runAuthAction(set, (active) => active.signOut()),
  deleteCurrentAccount: () => runAuthAction(set, (active) => active.deleteCurrentAccount(), 'account-deleted'),
  clearFeedback: () => set({ error: null, notice: null }),
}));

export function resetAuthStoreForTests() {
  unsubscribe?.();
  unsubscribe = null;
  adapter = null;
  initializePromise = null;
  useAuthStore.setState({ status: 'booting', user: null, busy: false, error: null, notice: null });
}
