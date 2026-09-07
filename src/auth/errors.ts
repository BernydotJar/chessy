export type AuthErrorCode =
  | 'invalid-credentials'
  | 'email-in-use'
  | 'weak-password'
  | 'invalid-email'
  | 'network'
  | 'recent-login-required'
  | 'popup-blocked'
  | 'cancelled'
  | 'unknown';

const CODE_MAP: Record<string, AuthErrorCode> = {
  'auth/invalid-credential': 'invalid-credentials',
  'auth/invalid-login-credentials': 'invalid-credentials',
  'auth/wrong-password': 'invalid-credentials',
  'auth/user-not-found': 'invalid-credentials',
  'auth/email-already-in-use': 'email-in-use',
  'auth/weak-password': 'weak-password',
  'auth/invalid-email': 'invalid-email',
  'auth/network-request-failed': 'network',
  'auth/requires-recent-login': 'recent-login-required',
  'auth/popup-blocked': 'popup-blocked',
  'auth/popup-closed-by-user': 'cancelled',
  'auth/cancelled-popup-request': 'cancelled',
};

export function normalizeAuthError(error: unknown): AuthErrorCode {
  if (!error || typeof error !== 'object') return 'unknown';
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  return CODE_MAP[code] ?? 'unknown';
}
