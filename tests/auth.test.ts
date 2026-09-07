import { describe, expect, it } from 'vitest';
import { missingFirebaseVariables, readFirebaseClientConfig } from '../src/auth/config';
import { normalizeAuthError } from '../src/auth/errors';

describe('Firebase client configuration', () => {
  it('stays unconfigured unless all required public client values exist', () => {
    const env = { VITE_FIREBASE_API_KEY: 'key', VITE_FIREBASE_PROJECT_ID: 'chessy' };
    expect(readFirebaseClientConfig(env)).toBeNull();
    expect(missingFirebaseVariables(env)).toEqual(['VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_APP_ID']);
  });

  it('normalizes complete config and trims public values', () => {
    const config = readFirebaseClientConfig({
      VITE_FIREBASE_API_KEY: ' key ',
      VITE_FIREBASE_AUTH_DOMAIN: ' chessy.firebaseapp.com ',
      VITE_FIREBASE_PROJECT_ID: ' chessy-prod ',
      VITE_FIREBASE_APP_ID: ' 1:123:web:abc ',
      VITE_FIREBASE_MESSAGING_SENDER_ID: ' 123 ',
      VITE_FIREBASE_STORAGE_BUCKET: ' chessy.firebasestorage.app ',
    });
    expect(config).toEqual({
      apiKey: 'key',
      authDomain: 'chessy.firebaseapp.com',
      projectId: 'chessy-prod',
      appId: '1:123:web:abc',
      messagingSenderId: '123',
      storageBucket: 'chessy.firebasestorage.app',
    });
  });

  it('does not require optional Firebase fields', () => {
    const config = readFirebaseClientConfig({
      VITE_FIREBASE_API_KEY: 'key',
      VITE_FIREBASE_AUTH_DOMAIN: 'chessy.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'chessy-prod',
      VITE_FIREBASE_APP_ID: '1:123:web:abc',
    });
    expect(config).toEqual({
      apiKey: 'key', authDomain: 'chessy.firebaseapp.com', projectId: 'chessy-prod', appId: '1:123:web:abc',
    });
  });
});

describe('Authentication error boundary', () => {
  it.each([
    ['auth/invalid-credential', 'invalid-credentials'],
    ['auth/email-already-in-use', 'email-in-use'],
    ['auth/weak-password', 'weak-password'],
    ['auth/invalid-email', 'invalid-email'],
    ['auth/network-request-failed', 'network'],
    ['auth/requires-recent-login', 'recent-login-required'],
    ['auth/popup-blocked', 'popup-blocked'],
    ['auth/popup-closed-by-user', 'cancelled'],
  ])('maps %s to a safe public error %s', (code, expected) => {
    expect(normalizeAuthError({ code })).toBe(expected);
  });

  it('does not leak unknown provider error codes', () => {
    expect(normalizeAuthError({ code: 'auth/internal-error', message: 'sensitive provider detail' })).toBe('unknown');
    expect(normalizeAuthError('not an error object')).toBe('unknown');
  });
});
