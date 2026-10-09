import { create } from 'zustand';
import { Progress, emptyProgress, parseProgress, recordCompletion, recordPuzzleMistake } from './progress';
import { Category } from './types';
import { mergeProgress, progressEqual } from '../sync/progressMerge';

// Keep the historical guest key stable. Authenticated users must never share it.
export const GUEST_PROGRESS_KEY = 'chessy-learning-v1';
export const profileProgressKey = (uid: string | null) =>
  uid ? `chessy-learning-user-v1:${encodeURIComponent(uid)}` : GUEST_PROGRESS_KEY;

function readProfile(uid: string | null): { progress: Progress; storageWarning: boolean } {
  try {
    const raw = localStorage.getItem(profileProgressKey(uid));
    return { progress: raw ? parseProgress(raw) : emptyProgress(), storageWarning: false };
  } catch {
    return { progress: emptyProgress(), storageWarning: true };
  }
}

function persist(uid: string | null, progress: Progress): boolean {
  try {
    localStorage.setItem(profileProgressKey(uid), JSON.stringify(progress));
    return true;
  } catch { return false; }
}

const initial = readProfile(null);

export type TrainingMode = 'practice' | 'daily' | 'sprint' | 'review';
interface LearningStore {
  progress: Progress;
  profileUid: string | null;
  storageWarning: boolean;
  mode: TrainingMode;
  category: Category | 'all';
  complete: (kind: 'puzzle' | 'lesson', id: string) => void;
  mistake: (id: string) => void;
  importProgress: (raw: string) => void;
  replaceProgress: (progress: Progress) => void;
  activateProfile: (uid: string | null) => void;
  mergeGuestProgress: () => void;
  configure: (mode: TrainingMode, category?: Category | 'all') => void;
}

export const useLearningStore = create<LearningStore>((set, get) => ({
  ...initial,
  profileUid: null,
  mode: 'practice',
  category: 'all',
  complete: (kind, id) => {
    const progress = recordCompletion(get().progress, kind, id);
    set({ progress, storageWarning: !persist(get().profileUid, progress) });
  },
  mistake: (id) => {
    const progress = recordPuzzleMistake(get().progress, id);
    set({ progress, storageWarning: !persist(get().profileUid, progress) });
  },
  importProgress: (raw) => {
    const progress = parseProgress(raw);
    if (!persist(get().profileUid, progress)) throw new Error('Storage unavailable');
    set({ progress, storageWarning: false });
  },
  replaceProgress: (incoming) => {
    const progress = parseProgress(JSON.stringify(incoming));
    if (!persist(get().profileUid, progress)) throw new Error('Storage unavailable');
    set({ progress, storageWarning: false });
  },
  activateProfile: (uid) => {
    if (get().profileUid === uid) return;
    // Never import anonymous/previous-account data on login without consent.
    const loaded = readProfile(uid);
    set({ profileUid: uid, progress: loaded.progress, storageWarning: loaded.storageWarning });
  },
  mergeGuestProgress: () => {
    const uid = get().profileUid;
    if (!uid) throw new Error('Sign in before importing guest progress');
    const guest = readProfile(null);
    if (guest.storageWarning) throw new Error('Guest progress unavailable');
    const progress = mergeProgress(get().progress, guest.progress);
    if (!persist(uid, progress)) throw new Error('Storage unavailable');
    set({ progress, storageWarning: false });
  },
  configure: (mode, category = 'all') => set({ mode, category }),
}));

export function guestProgressAvailable(): boolean {
  const { progress, storageWarning } = readProfile(null);
  return !storageWarning && (progress.solved.length > 0 || progress.lessons.length > 0 || progress.review.length > 0);
}

export function forgetStoredProfile(uid: string) {
  try { localStorage.removeItem(profileProgressKey(uid)); return true; }
  catch { return false; }
}

export function guestProgressCanImport(current: Progress): boolean {
  const guest = readProfile(null);
  return !guest.storageWarning && !progressEqual(mergeProgress(current, guest.progress), current);
}
