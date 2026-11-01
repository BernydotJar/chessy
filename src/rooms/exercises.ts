import { Chess } from 'chess.js';
import { readAuthRuntimeConfig } from '../auth/config';
import { getChessyFirebaseApp, getChessyFunctions } from '../firebase/client';
import { PUZZLES } from '../learning/puzzles';
import { orderPracticePuzzles } from '../learning/trainingBlocks';
import type { Puzzle } from '../learning/types';

export const CLASSROOM_EXERCISES: readonly Puzzle[] = orderPracticePuzzles(PUZZLES);
const catalogue = new Map(CLASSROOM_EXERCISES.map(item => [item.id, item]));
const safeId = (value: string) => /^[A-Za-z0-9]{20}$/.test(value);

export interface AssignedRoomExercise {
  puzzleId: string;
  assignedUid: string;
  fen: string;
  ply: number;
  attempts: number;
  revision: number;
  status: 'active' | 'completed' | 'ended';
  lastResult: 'assigned' | 'retry' | 'correct' | 'completed' | 'ended';
}
export function parseAssignedRoomExercise(raw: unknown): AssignedRoomExercise | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  if (d.schemaVersion !== 1 || typeof d.puzzleId !== 'string' || !catalogue.has(d.puzzleId) ||
    typeof d.assignedUid !== 'string' || !/^[A-Za-z0-9_-]{3,128}$/.test(d.assignedUid) ||
    typeof d.fen !== 'string' || typeof d.revision !== 'number' || !Number.isSafeInteger(d.revision) ||
    d.revision < 0 || d.revision > 1000000 || !Number.isSafeInteger(d.ply) ||
    (d.ply as number) < 0 || (d.ply as number) > catalogue.get(d.puzzleId)!.solution.length ||
    !Number.isSafeInteger(d.attempts) || (d.attempts as number) < 0 ||
    (d.attempts as number) > 1000000 ||
    !['active', 'completed', 'ended'].includes(d.status as string) ||
    !['assigned', 'retry', 'correct', 'completed', 'ended'].includes(d.lastResult as string)) return null;
  try { new Chess(d.fen); } catch { return null; }
  return {
    puzzleId: d.puzzleId, assignedUid: d.assignedUid, fen: d.fen,
    revision: d.revision as number, ply: d.ply as number, attempts: d.attempts as number,
    status: d.status as AssignedRoomExercise['status'],
    lastResult: d.lastResult as AssignedRoomExercise['lastResult'],
  };
}
async function call<T>(name: string, data: Record<string, unknown>): Promise<T> {
  const config=readAuthRuntimeConfig().firebase;
  if (!config) throw new Error('classroom-unconfigured');
  const {functions,functionsSdk}=await getChessyFunctions(config);
  return (await functionsSdk.httpsCallable<Record<string, unknown>, T>(functions,name)(data)).data;
}
export async function watchRoomExercise(roomId: string, onChange:(value:AssignedRoomExercise|null)=>void,
  onDenied:()=>void):Promise<()=>void>{
  if (!safeId(roomId)) throw new Error('invalid-room');
  const config=readAuthRuntimeConfig().firebase;
  if (!config) throw new Error('classroom-unconfigured');
  const app=await getChessyFirebaseApp(config);
  const f=await import('firebase/firestore');
  const database=f.getFirestore(app);
  const current=f.doc(database,'learningRooms',roomId,'exercise','current');
  const signal=f.doc(database,'learningRooms',roomId,'exercise','announcement');
  let stopPrivate=()=>{};
  let disposed=false;
  const stopSignal=f.onSnapshot(signal,()=>{
    // Firestore terminates denied listeners. Restart only when the trusted
    // announcement revision changes; answers and attempts stay private.
    stopPrivate();
    if (disposed) return;
    stopPrivate=f.onSnapshot(current,snapshot=>{
      const raw=snapshot.data();
      if (!raw) onChange(null);
      else {const value=parseAssignedRoomExercise(raw);if (value) onChange(value);else onDenied();}
    },()=>{if(!disposed) onDenied();});
  },onDenied);
  return ()=>{
    disposed=true;
    stopSignal();
    stopPrivate();
  };
}
export const assignRoomExercise=(roomId:string,puzzleId:string,learnerUid:string)=>
  call<{assigned:true}>('assignLearningRoomExercise',{roomId,puzzleId,learnerUid});
export const submitRoomExerciseMove=(roomId:string,uci:string,expectedRevision:number)=>
  call<{result:'retry'|'correct'|'completed',completed:boolean}>(
    'submitLearningRoomExerciseMove',{roomId,uci,expectedRevision});
export const endRoomExercise=(roomId:string)=>call<{ended:true}>('endLearningRoomExercise',{roomId});
