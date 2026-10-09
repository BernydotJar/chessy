import { readAuthRuntimeConfig } from '../auth/config';
import { getChessyFirebaseApp } from '../firebase/client';
import {
  applyInstructorCommand, classroomSnapshotValid, initialClassroomBoard,
  type ClassroomBoard, type ClassroomCommand,
} from './classroomBoard';

export type ClassroomBoardSnapshot = ClassroomBoard & { ownerUid: string };

function validClassroomId(id: string): boolean {
  return /^[A-Za-z0-9]{5,64}$/.test(id);
}

async function classroomDb(sessionId: string) {
  if (!validClassroomId(sessionId)) throw new Error('invalid-session');
  const config = readAuthRuntimeConfig().firebase;
  if (!config) throw new Error('cloud-unconfigured');
  const [firestore, firebaseApp] = await Promise.all([
    import('firebase/firestore'), Promise.resolve(getChessyFirebaseApp(config)),
  ]);
  const database = firestore.getFirestore(firebaseApp);
  return {
    firestore, database,
    ref: firestore.doc(database, 'coachSessions', sessionId, 'liveBoard', 'current'),
  };
}

function parseBoard(data: Record<string, unknown>): ClassroomBoardSnapshot | null {
  if (data.schemaVersion !== 1 || typeof data.ownerUid !== 'string'
    || !/^[A-Za-z0-9_-]{3,128}$/.test(data.ownerUid)
    || !classroomSnapshotValid(data)) return null;
  return {
    ownerUid: data.ownerUid,
    fen: data.fen as string,
    initialFen: data.initialFen as string,
    moves: data.moves as string[],
    revision: data.revision as number,
    locked: data.locked as boolean,
  };
}

/** Replay-validation is mandatory before accepting a remote board, even for a verified coach. */
export function validateRemoteClassroomBoard(data: Record<string, unknown>): ClassroomBoardSnapshot {
  const snapshot = parseBoard(data);
  if (!snapshot) throw new Error('invalid-classroom-snapshot');
  return snapshot;
}

export async function subscribeToClassroomBoard(
  sessionId: string,
  onBoard: (board: ClassroomBoardSnapshot | null) => void,
  onError: (error: Error) => void,
): Promise<() => void> {
  const { firestore, ref } = await classroomDb(sessionId);
  return firestore.onSnapshot(ref, snapshot => {
    try {
      onBoard(snapshot.exists() ? validateRemoteClassroomBoard(snapshot.data()) : null);
    } catch (error) { onError(error instanceof Error ? error : new Error('invalid-board')); }
  }, error => onError(error));
}

export async function initializeClassroomBoard(uid: string, sessionId: string): Promise<void> {
  const { firestore, database, ref } = await classroomDb(sessionId);
  const board = initialClassroomBoard();
  await firestore.runTransaction(database, async transaction => {
    const existing = await transaction.get(ref);
    if (existing.exists()) {
      const current = validateRemoteClassroomBoard(existing.data());
      if (current.ownerUid !== uid) throw new Error('forbidden-owner');
      return;
    }
    transaction.set(ref, {
      ...board, schemaVersion: 1, ownerUid: uid,
      updatedAt: firestore.serverTimestamp(),
    });
  });
}

/** Firestore transaction + expectedRevision prevents two teacher tabs overwriting one another. */
export async function submitInstructorBoardCommand(
  uid: string,
  sessionId: string,
  command: ClassroomCommand,
): Promise<void> {
  const { firestore, database, ref } = await classroomDb(sessionId);
  await firestore.runTransaction(database, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('room-not-created');
    const current = validateRemoteClassroomBoard(snapshot.data());
    if (current.ownerUid !== uid) throw new Error('forbidden-owner');
    const next = applyInstructorCommand(current, command);
    transaction.update(ref, { ...next, updatedAt: firestore.serverTimestamp() });
  });
}
