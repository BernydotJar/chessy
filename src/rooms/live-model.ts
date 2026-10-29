export interface LiveSession {
  sessionId: string;
  status: 'starting' | 'live' | 'closing' | 'ended';
  endsAt: number;
}
/** Reject malformed server snapshots without throwing inside a realtime listener. */
export function parseLiveSession(value: unknown): LiveSession | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (typeof data.sessionId !== 'string' || !/^[A-Za-z0-9]{20}$/.test(data.sessionId) ||
    !['starting','live','closing','ended'].includes(data.status as string)) return null;
  try {
    const timestamp = data.endsAt as {toMillis?: unknown} | undefined;
    if (typeof timestamp?.toMillis !== 'function') return null;
    const endsAt: unknown = timestamp.toMillis();
    if (typeof endsAt !== 'number' || !Number.isFinite(endsAt) || endsAt <= 0) return null;
    return {sessionId: data.sessionId, status: data.status as LiveSession['status'], endsAt};
  } catch { return null; }
}

/** Late snapshots from an older class must not cancel a newer join attempt. */
export function sessionEndsConnection(state: LiveSession | null, sessionId: string | null, connected: boolean): boolean {
  if (!sessionId) return false;
  if (!state) return connected;
  if (state.sessionId !== sessionId) return false;
  return state.status === 'closing' || state.status === 'ended';
}
