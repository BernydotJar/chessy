import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFirebaseAuthAdapter } from '../src/auth/firebaseAdapter';
import type { AuthUser } from '../src/auth/types';

const authMock = vi.hoisted(() => ({
  listener: null as null | ((user: unknown) => void),
  tokenClaims: {} as Record<string, unknown>,
  tokenError: false,
}));

vi.mock('../src/firebase/client', () => ({
  getChessyFirebaseApp: vi.fn(async () => ({})),
}));

vi.mock('firebase/auth', () => ({
  indexedDBLocalPersistence: {},
  getAuth: () => ({ emulatorConfig: null }),
  setPersistence: vi.fn(async () => {}),
  onIdTokenChanged: (_auth: unknown, callback: (user: unknown) => void) => {
    authMock.listener = callback;
    return () => { authMock.listener = null; };
  },
  getIdTokenResult: vi.fn(async () => {
    if (authMock.tokenError) throw new Error('unavailable');
    return { claims: authMock.tokenClaims };
  }),
}));

const fakeFirebaseConfig = {
  apiKey: 'public-key', authDomain: 'chessy.firebaseapp.com',
  projectId: 'chessy', appId: '1:123:web:public',
};

const account = {
  uid: 'test-id', email: 'player@example.test', displayName: 'Player', photoURL: null,
  providerData: [{ providerId: 'password' }], emailVerified: true,
};

beforeEach(() => {
  authMock.listener = null;
  authMock.tokenClaims = {};
  authMock.tokenError = false;
});

describe('premium theme access from Firebase ID token', () => {
  it('does not unlock from a local profile and only recognizes the server-issued boolean claim', async () => {
    const adapter = await createFirebaseAuthAdapter(fakeFirebaseConfig, null);
    const events: (AuthUser | null)[] = [];
    const unsubscribe = adapter.observe(user => events.push(user));

    expect(authMock.listener).toBeTypeOf('function');
    authMock.listener?.(account);
    await vi.waitFor(() => expect(events).toHaveLength(1));
    expect(events[0]?.premiumThemes).toBe(false);

    authMock.tokenClaims = { chessyPremiumThemes: 'true' }; // strings must not grant premium
    authMock.listener?.(account);
    await vi.waitFor(() => expect(events).toHaveLength(2));
    expect(events[1]?.premiumThemes).toBe(false);

    authMock.tokenClaims = { chessyPremiumThemes: true };
    authMock.listener?.(account);
    await vi.waitFor(() => expect(events).toHaveLength(3));
    expect(events[2]?.premiumThemes).toBe(true);

    authMock.tokenClaims = {};
    authMock.listener?.(account);
    await vi.waitFor(() => expect(events).toHaveLength(4));
    expect(events[3]?.premiumThemes).toBe(false);

    authMock.tokenError = true;
    authMock.listener?.(account);
    await vi.waitFor(() => expect(events).toHaveLength(5));
    expect(events[4]?.premiumThemes).toBe(false);

    authMock.listener?.(null);
    expect(events.at(-1)).toBeNull();
    unsubscribe();
    expect(authMock.listener).toBeNull();
  });
});
