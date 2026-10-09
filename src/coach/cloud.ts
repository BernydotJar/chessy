import { readAuthRuntimeConfig } from '../auth/config';
import { getChessyFirebaseApp } from '../firebase/client';
import {
  normalizeCoachInput, parseCoachSession, recordingPath, validRecording,
  type CoachSession, type CoachSessionInput, type CoachSessionStatus,
} from './model';

async function app() {
  const config = readAuthRuntimeConfig().firebase;
  if (!config) throw new Error('cloud-unconfigured');
  return getChessyFirebaseApp(config);
}

async function db() {
  const [firebaseApp, firestore] = await Promise.all([app(), import('firebase/firestore')]);
  return { firestore, database: firestore.getFirestore(firebaseApp) };
}

export async function isApprovedCoach(): Promise<boolean> {
  const [firebaseApp, authSdk] = await Promise.all([app(), import('firebase/auth')]);
  const identity = authSdk.getAuth(firebaseApp).currentUser;
  if (!identity || !identity.emailVerified) return false;
  const token = await authSdk.getIdTokenResult(identity);
  return token.claims.chessyRole === 'coach' || token.claims.chessyRole === 'admin';
}

export async function listPublishedCoachSessions(): Promise<CoachSession[]> {
  const { firestore, database } = await db();
  const results = await firestore.getDocs(firestore.query(
    firestore.collection(database, 'coachSessions'),
    firestore.where('status', '==', 'published'),
    firestore.limit(50),
  ));
  return results.docs.map(record => parseCoachSession(record.id, record.data())).filter(
    (session): session is CoachSession => Boolean(session),
  );
}

export async function listOwnedCoachSessions(uid: string): Promise<CoachSession[]> {
  const { firestore, database } = await db();
  const results = await firestore.getDocs(firestore.query(
    firestore.collection(database, 'coachSessions'),
    firestore.where('ownerUid', '==', uid),
    firestore.limit(50),
  ));
  return results.docs.map(record => parseCoachSession(record.id, record.data())).filter(
    (session): session is CoachSession => Boolean(session),
  );
}

export async function saveCoachSession(
  uid: string,
  input: CoachSessionInput,
  existing?: CoachSession,
  status: CoachSessionStatus = 'draft',
): Promise<string> {
  const safe = normalizeCoachInput(input, status === 'published');
  if (existing && existing.ownerUid !== uid) throw new Error('invalid-owner');
  const { firestore, database } = await db();
  const doc = existing
    ? firestore.doc(database, 'coachSessions', existing.id)
    : firestore.doc(firestore.collection(database, 'coachSessions'));
  if (safe.videoPath && safe.videoPath !== recordingPath(uid, doc.id)) {
    throw new Error('invalid-video-path');
  }
  if (existing) {
    await firestore.updateDoc(doc, { ...safe, status, updatedAt: firestore.serverTimestamp() });
  } else {
    await firestore.setDoc(doc, {
      ...safe,
      status,
      schemaVersion: 1,
      ownerUid: uid,
      createdAt: firestore.serverTimestamp(),
      updatedAt: firestore.serverTimestamp(),
    });
  }
  return doc.id;
}

export async function uploadCoachRecording(
  uid: string,
  sessionId: string,
  video: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  if (!validRecording(video)) throw new Error('invalid-video');
  if (!await isApprovedCoach()) throw new Error('coach-only');
  const [firebaseApp, storageSdk] = await Promise.all([app(), import('firebase/storage')]);
  const videoPath = recordingPath(uid, sessionId);
  const ref = storageSdk.ref(storageSdk.getStorage(firebaseApp), videoPath);
  const task = storageSdk.uploadBytesResumable(ref, video, { contentType: 'video/mp4' });
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', snapshot => {
      onProgress(Math.round(100 * snapshot.bytesTransferred / snapshot.totalBytes));
    }, reject, resolve);
  });
  return videoPath;
}

export async function getCoachPlaybackUrl(session: CoachSession): Promise<string> {
  if (session.status !== 'published' || session.kind !== 'recorded' || !session.videoPath ||
    session.videoPath !== recordingPath(session.ownerUid, session.id)) {
    throw new Error('recording-unavailable');
  }
  const [firebaseApp, storageSdk] = await Promise.all([app(), import('firebase/storage')]);
  return storageSdk.getDownloadURL(storageSdk.ref(storageSdk.getStorage(firebaseApp), session.videoPath));
}
