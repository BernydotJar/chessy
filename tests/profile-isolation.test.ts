import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

describe('identity-isolated device progress', () => {
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.resetModules();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('never merges a guest or another account into a signed-in profile implicitly', async () => {
    const { useLearningStore, profileProgressKey } = await import('../src/learning/store');
    const store = useLearningStore.getState();
    store.complete('puzzle', 'rook-file');
    store.activateProfile('alice');
    expect(useLearningStore.getState().progress.solved).toEqual([]);
    useLearningStore.getState().complete('puzzle', 'rook-rank');
    store.activateProfile('bob');
    expect(useLearningStore.getState().progress.solved).toEqual([]);
    useLearningStore.getState().complete('puzzle', 'bishop-diagonal');
    store.activateProfile('alice');
    expect(useLearningStore.getState().progress.solved).toEqual(['rook-rank']);
    store.activateProfile(null);
    expect(useLearningStore.getState().progress.solved).toEqual(['rook-file']);
    expect(storage.data.has(profileProgressKey('alice'))).toBe(true);
    expect(storage.data.has(profileProgressKey('bob'))).toBe(true);
  });

  it('imports guest progress only with a specific action and retains a guest backup', async () => {
    const { useLearningStore, guestProgressCanImport, GUEST_PROGRESS_KEY } = await import('../src/learning/store');
    const store = useLearningStore.getState();
    store.complete('puzzle', 'rook-file');
    store.activateProfile('alice');
    useLearningStore.getState().complete('puzzle', 'rook-rank');
    expect(guestProgressCanImport(useLearningStore.getState().progress)).toBe(true);
    useLearningStore.getState().mergeGuestProgress();
    expect(new Set(useLearningStore.getState().progress.solved)).toEqual(new Set(['rook-file', 'rook-rank']));
    expect(guestProgressCanImport(useLearningStore.getState().progress)).toBe(false);
    expect(JSON.parse(storage.data.get(GUEST_PROGRESS_KEY)!).solved).toEqual(['rook-file']);
  });

  it('removes only the deleted account profile without affecting the guest or another account', async () => {
    const { useLearningStore, forgetStoredProfile, profileProgressKey } = await import('../src/learning/store');
    useLearningStore.getState().complete('puzzle', 'rook-file');
    useLearningStore.getState().activateProfile('alice');
    useLearningStore.getState().complete('puzzle', 'rook-rank');
    useLearningStore.getState().activateProfile('bob');
    useLearningStore.getState().complete('puzzle', 'bishop-diagonal');
    expect(forgetStoredProfile('alice')).toBe(true);
    expect(storage.data.has(profileProgressKey('alice'))).toBe(false);
    expect(storage.data.has(profileProgressKey('bob'))).toBe(true);
    useLearningStore.getState().activateProfile(null);
    expect(useLearningStore.getState().progress.solved).toEqual(['rook-file']);
  });

  it('surfaces storage failure rather than silently claiming durability', async () => {
    const { useLearningStore } = await import('../src/learning/store');
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    useLearningStore.getState().complete('puzzle', 'rook-file');
    expect(useLearningStore.getState().storageWarning).toBe(true);
    expect(useLearningStore.getState().progress.solved).toEqual(['rook-file']);
  });
});
