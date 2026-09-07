import { create } from 'zustand';
import { readAuthRuntimeConfig } from '../auth/config';
import { useAuthStore } from '../auth/store';
import { getChessyFirebaseApp } from '../firebase/client';
import { useLearningStore } from '../learning/store';
import { deleteCloudProgress as deleteCloudDocument, syncCloudProgress } from './progressCloud';

export type ProgressSyncStatus = 'local-only' | 'syncing' | 'synced' | 'pending' | 'error';

interface ProgressSyncStore {
  status: ProgressSyncStatus;
  lastSyncedAt: number | null;
  error: 'network' | 'cloud-delete' | 'unknown' | null;
  initialize(): Promise<void>;
  syncNow(): Promise<boolean>;
  deleteCloudProgress(): Promise<boolean>;
}

let initialized = false;
let currentUid: string | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight: Promise<boolean> | null = null;
let applyingCloud = false;
let unsubscribeAuth: (() => void) | null = null;
let unsubscribeLearning: (() => void) | null = null;
let onlineHandler: (() => void) | null = null;
let authGeneration = 0;

const scheduleSync = (delay = 700) => {
  if (!currentUid) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void useProgressSyncStore.getState().syncNow();
  }, delay);
};

const isNetworkError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: unknown; message?: unknown };
  return value.code === 'unavailable' || value.code === 'failed-precondition' ||
    (typeof value.message === 'string' && /network|offline|failed to fetch/i.test(value.message));
};

export const useProgressSyncStore = create<ProgressSyncStore>((set) => ({
  status: 'local-only',
  lastSyncedAt: null,
  error: null,
  initialize: async () => {
    if (initialized) return;
    initialized = true;

    unsubscribeAuth = useAuthStore.subscribe((state, previous) => {
      if (state.user?.id === previous.user?.id && state.status === previous.status) return;
      authGeneration += 1;
      currentUid = state.status === 'signed-in' ? state.user?.id ?? null : null;
      if (!currentUid) {
        set({ status: 'local-only', error: null });
        return;
      }
      scheduleSync(0);
    });

    unsubscribeLearning = useLearningStore.subscribe((state, previous) => {
      if (applyingCloud || state.progress === previous.progress || !currentUid) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        set({ status: 'pending', error: 'network' });
        return;
      }
      set({ status: 'pending', error: null });
      scheduleSync();
    });

    onlineHandler = () => {
      if (currentUid) scheduleSync(0);
    };
    window.addEventListener('online', onlineHandler);

    const auth = useAuthStore.getState();
    currentUid = auth.status === 'signed-in' ? auth.user?.id ?? null : null;
    if (currentUid) scheduleSync(0);
  },
  syncNow: async () => {
    if (syncInFlight) return syncInFlight;
    syncInFlight = (async () => {
      const uid = currentUid;
      const generation = authGeneration;
      if (!uid) {
        set({ status: 'local-only', error: null });
        return false;
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        set({ status: 'pending', error: 'network' });
        return false;
      }
      const runtime = readAuthRuntimeConfig();
      if (!runtime.firebase) {
        set({ status: 'local-only', error: null });
        return false;
      }
      set({ status: 'syncing', error: null });
      try {
        const app = await getChessyFirebaseApp(runtime.firebase);
        const result = await syncCloudProgress(app, uid, useLearningStore.getState().progress);
        if (currentUid !== uid || authGeneration !== generation) return false;
        applyingCloud = true;
        try {
          useLearningStore.getState().replaceProgress(result.progress);
        } finally {
          applyingCloud = false;
        }
        set({ status: 'synced', lastSyncedAt: Date.now(), error: null });
        return true;
      } catch (error) {
        if (isNetworkError(error)) set({ status: 'pending', error: 'network' });
        else set({ status: 'error', error: 'unknown' });
        return false;
      }
    })();
    try {
      return await syncInFlight;
    } finally {
      syncInFlight = null;
    }
  },
  deleteCloudProgress: async () => {
    const uid = currentUid;
    const generation = authGeneration;
    if (!uid) return true;
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
    if (syncInFlight) await syncInFlight;
    if (currentUid !== uid || authGeneration !== generation) return false;
    const runtime = readAuthRuntimeConfig();
    if (!runtime.firebase) return true;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ status: 'error', error: 'cloud-delete' });
      return false;
    }
    set({ status: 'syncing', error: null });
    try {
      const app = await getChessyFirebaseApp(runtime.firebase);
      await deleteCloudDocument(app, uid);
      if (currentUid !== uid || authGeneration !== generation) return false;
      set({ status: 'local-only', lastSyncedAt: null, error: null });
      return true;
    } catch {
      set({ status: 'error', error: 'cloud-delete' });
      return false;
    }
  },
}));

export function resetProgressSyncStoreForTests() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = null;
  unsubscribeAuth?.();
  unsubscribeAuth = null;
  unsubscribeLearning?.();
  unsubscribeLearning = null;
  if (onlineHandler) window.removeEventListener('online', onlineHandler);
  onlineHandler = null;
  currentUid = null;
  syncInFlight = null;
  applyingCloud = false;
  initialized = false;
  authGeneration = 0;
  useProgressSyncStore.setState({ status: 'local-only', lastSyncedAt: null, error: null });
}
