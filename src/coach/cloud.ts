import { readAuthRuntimeConfig } from '../auth/config';
import { getChessyFirebaseApp } from '../firebase/client';
import {
  normalizeCoachInput, parseCoachSession, recordingPath, safeMeetingUrl, validRecording,
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

/** The public catalog never carries live meeting credentials. */
export async function getCoachMeetingUrl(sessionId: string): Promise<string> {
  if (!/^[A-Za-z0-9]{5,64}$/.test(sessionId)) throw new Error('invalid-session');
  const { firestore, database } = await db();
  const snapshot = await firestore.getDoc(firestore.doc(database, 'coachSessionSecrets', sessionId));
  const url = snapshot.exists() && typeof snapshot.data().meetingUrl === 'string'
    ? safeMeetingUrl(snapshot.data().meetingUrl as string)
    : null;
  if (!url) throw new Error('join-unavailable');
  return url;
}

export async function listOwnedCoachSessions(uid: string): Promise<CoachSession[]> {
  const { firestore, database } = await db();
  const results = await firestore.getDocs(firestore.query(
    firestore.collection(database, 'coachSessions'),
    firestore.where('ownerUid', '==', uid),
    firestore.limit(50),
  ));
  const sessions = results.docs.map(record => parseCoachSession(record.id, record.data())).filter(
    (session): session is CoachSession => Boolean(session),
  );
  return Promise.all(sessions.map(async session => {
    if (session.kind !== 'live') return session;
    try { return { ...session, meetingUrl: await getCoachMeetingUrl(session.id) }; }
    catch { return session; }
  }));
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
  // Meeting URLs must NEVER be stored in a published catalog document.
  // A single atomic batch ensures the private credential exists before publication.
  const secret = firestore.doc(database, 'coachSessionSecrets', doc.id);
  const batch = firestore.writeBatch(database);
  const catalogData = { ...safe, meetingUrl: null, status, updatedAt: firestore.serverTimestamp() };
  if (existing) {
    batch.update(doc, catalogData);
  } else {
    batch.set(doc, {
      ...catalogData,
      schemaVersion: 1,
      ownerUid: uid,
      createdAt: firestore.serverTimestamp(),
    });
  }
  if (safe.kind === 'live' && safe.meetingUrl) {
    batch.set(secret, {
      schemaVersion: 1, ownerUid: uid,
      meetingUrl: safe.meetingUrl,
      updatedAt: firestore.serverTimestamp(),
    });
  } else if (existing?.kind === 'live') {
    batch.delete(secret);
  }
  await batch.commit();
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
