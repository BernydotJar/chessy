import type { FirebaseApp } from 'firebase/app';
import { emptyProgress, parseProgress, type Progress } from '../learning/progress';
import { mergeProgress, normalizeProgress } from './progressMerge';

export interface CloudSyncResult {
  progress: Progress;
  created: boolean;
}

function readRemoteProgress(data: Record<string, unknown> | undefined): Progress {
  if (!data) return emptyProgress();
  if (data.schemaVersion !== 1 || data.progressVersion !== 2) throw new Error('Unsupported cloud progress schema');
  return parseProgress(JSON.stringify({
    version: 2,
    solved: data.solved,
    lessons: data.lessons,
    days: data.days,
    mistakes: data.mistakes,
    review: data.review,
  }));
}

export async function syncCloudProgress(app: FirebaseApp, uid: string, local: Progress): Promise<CloudSyncResult> {
  const firestore = await import('firebase/firestore');
  const db = firestore.getFirestore(app);
  const ref = firestore.doc(db, 'users', uid, 'progress', 'current');
  const safeLocal = normalizeProgress(local);
  return firestore.runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const remote = snapshot.exists() ? readRemoteProgress(snapshot.data() as Record<string, unknown>) : emptyProgress();
    const merged = mergeProgress(safeLocal, remote);
    transaction.set(ref, {
      schemaVersion: 1,
      ownerUid: uid,
      progressVersion: 2,
      solved: merged.solved,
      lessons: merged.lessons,
      days: merged.days,
      mistakes: merged.mistakes,
      review: merged.review,
      updatedAt: firestore.serverTimestamp(),
    });
    return { progress: merged, created: !snapshot.exists() };
  });
}

export async function deleteCloudProgress(app: FirebaseApp, uid: string) {
  const firestore = await import('firebase/firestore');
  const db = firestore.getFirestore(app);
  await firestore.deleteDoc(firestore.doc(db, 'users', uid, 'progress', 'current'));
}
