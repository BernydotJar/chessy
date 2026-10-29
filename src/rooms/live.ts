import { readAuthRuntimeConfig } from '../auth/config';
import { getChessyFirebaseApp, getChessyFunctions } from '../firebase/client';
import { privateRoomsEnabled } from './release';

export const liveClassroomEnabled = privateRoomsEnabled && import.meta.env.VITE_CHESSY_LIVEKIT_ENABLED === 'true';
import { parseLiveSession } from './live-model';
import type { LiveSession } from './live-model';
export type { LiveSession } from './live-model';
export interface LiveCredentials {
  token: string; serverUrl: string; identity: string;
  role: 'coach' | 'learner'; sessionId: string; expiresIn: number;
}
async function call<T>(name: string, data: Record<string, unknown>): Promise<T> {
  const config = readAuthRuntimeConfig().firebase;
  if (!config) throw new Error('live-unconfigured');
  const {functionsSdk, functions} = await getChessyFunctions(config);
  return (await functionsSdk.httpsCallable<Record<string, unknown>, T>(functions, name)(data)).data;
}
export const startLiveClass = (roomId: string) => call<{sessionId: string}>('startLearningRoomLive', {roomId});
export const joinLiveClass = (roomId: string, sessionId: string) =>
  call<LiveCredentials>('joinLearningRoomLive', {roomId, sessionId});
export const endLiveClass = (roomId: string, sessionId: string) =>
  call('endLearningRoomLive', {roomId, sessionId});
export const moderateLiveClass = (roomId: string, sessionId: string, identity: string, action: 'mute' | 'remove') =>
  call('moderateLearningRoomLive', {roomId, sessionId, identity, action});
export async function observeLiveClass(roomId: string, onState: (state: LiveSession | null) => void, onError: () => void) {
  const config = readAuthRuntimeConfig().firebase;
  if (!config) throw new Error('live-unconfigured');
  const app = await getChessyFirebaseApp(config);
  const f = await import('firebase/firestore');
  return f.onSnapshot(f.doc(f.getFirestore(app), 'learningRooms', roomId, 'live', 'current'), snapshot => {
    const data = snapshot.data();
    if (!data) { onState(null); return; }
    const state = parseLiveSession(data);
    if (!state) { onError(); return; }
    onState(state);
  }, onError);
}
export function liveErrorKey(error: unknown): string {
  const value = error instanceof Error ? error.message : '';
  if (/live-removed|Adult enrollment|live-access-denied|permission-denied/.test(value)) return 'live.accessDenied';
  if (/live-disabled|live-unconfigured/.test(value)) return 'live.unconfigured';
  if (/NotAllowed|Permission|permission denied/i.test(value)) return 'live.permissionDenied';
  if (/live-close-retry|live-closing/.test(value)) return 'live.closeRetry';
  if (/live-full/.test(value)) return 'live.full';
  return 'live.error';
}
