import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Progress } from '../src/learning/progress';

const mocks = vi.hoisted(() => ({
  sync: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../src/sync/progressCloud', () => ({
  syncCloudProgress: mocks.sync,
  deleteCloudProgress: mocks.remove,
}));
vi.mock('../src/auth/config', () => ({
  readAuthRuntimeConfig: () => ({
    firebase: { apiKey: 'public-test', authDomain: 'example.test', projectId: 'test', appId: '1:test:web' },
    emulatorUrl: null,
  }),
}));
vi.mock('../src/firebase/client', () => ({
  getChessyFirebaseApp: async () => ({ name: 'mock' }),
}));

const empty = (): Progress => ({ version: 2, solved: [], lessons: [], days: [], mistakes: 0, review: [] });
const user = (id: string) => ({
  id, email: id + '@example.test', displayName: id, photoUrl: null,
  provider: 'password' as const, emailVerified: true,
});
const storage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
  };
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
type CloudResult = { progress: Progress; created: boolean };
async function bootstrap() {
  const { useAuthStore } = await import('../src/auth/store');
  const { useProgressSyncStore, resetProgressSyncStoreForTests } = await import('../src/sync/store');
  const { useLearningStore } = await import('../src/learning/store');
  await useProgressSyncStore.getState().initialize();
  return { auth: useAuthStore, sync: useProgressSyncStore, learning: useLearningStore, cleanup: resetProgressSyncStoreForTests };
}

describe('cloud sync adversarial races', () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', storage());
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('window', new EventTarget());
    mocks.sync.mockReset();
    mocks.remove.mockReset();
  });
  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('preserves a lesson completed while a cloud transaction is in flight and schedules a follow-up', async () => {
    const f = await bootstrap();
    cleanup = f.cleanup;
    const initial = deferred<CloudResult>();
    mocks.sync.mockImplementationOnce(() => initial.promise)
      .mockImplementation(async (_app: unknown, _uid: string, local: Progress) => ({ progress: local, created: false }));
    f.auth.setState({ status: 'signed-in', user: user('alice') });
    const upload = f.sync.getState().syncNow();
    await Promise.resolve();
    f.learning.getState().complete('puzzle', 'rook-file');
    initial.resolve({ progress: empty(), created: false });
    expect(await upload).toBe(true);
    expect(f.learning.getState().progress.solved).toEqual(['rook-file']);
    expect(f.sync.getState().status).toBe('pending');
    await vi.advanceTimersByTimeAsync(10);
    expect(mocks.sync).toHaveBeenCalledTimes(2);
    expect(f.sync.getState().status).toBe('synced');
  });

  it('cannot apply account A cloud results to account B and initiates B sync', async () => {
    const f = await bootstrap();
    cleanup = f.cleanup;
    const initial = deferred<CloudResult>();
    mocks.sync.mockImplementation(async (_app: unknown, uid: string, local: Progress) => {
      return uid === 'alice' ? initial.promise : { progress: local, created: false };
    });
    f.auth.setState({ status: 'signed-in', user: user('alice') });
    const syncA = f.sync.getState().syncNow();
    await Promise.resolve();
    f.auth.setState({ status: 'signed-in', user: user('bob') });
    f.learning.getState().complete('puzzle', 'bishop-diagonal');
    const syncB = f.sync.getState().syncNow();
    initial.resolve({ progress: { ...empty(), solved: ['rook-file'] }, created: false });
    expect(await syncA).toBe(false);
    expect(await syncB).toBe(true);
    expect(f.learning.getState().profileUid).toBe('bob');
    expect(f.learning.getState().progress.solved).toEqual(['bishop-diagonal']);
    expect(mocks.sync.mock.calls.map(args => args[1])).toEqual(['alice', 'bob']);
  });
});
