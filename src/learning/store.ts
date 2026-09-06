import { create } from 'zustand';
import { Progress, emptyProgress, parseProgress, recordCompletion, recordPuzzleMistake } from './progress';
import { Category } from './types';
const KEY='chessy-learning-v1'; // Keep the storage key stable; parseProgress migrates v1 payloads to v2.
let initial=emptyProgress(),storageWarning=false;
try { const raw=localStorage.getItem(KEY); if(raw) initial=parseProgress(raw); } catch { storageWarning=true; }
export type TrainingMode='practice'|'daily'|'sprint'|'review';
interface LearningStore {
 progress:Progress;storageWarning:boolean;mode:TrainingMode;category:Category|'all';
 complete:(kind:'puzzle'|'lesson',id:string)=>void;mistake:(id:string)=>void;importProgress:(raw:string)=>void;
 configure:(mode:TrainingMode,category?:Category|'all')=>void;
}
function persist(progress:Progress):boolean {try{localStorage.setItem(KEY,JSON.stringify(progress));return true;}catch{return false;}}
export const useLearningStore=create<LearningStore>((set,get)=>({
 progress:initial,storageWarning,mode:'practice',category:'all',
 complete:(kind,id)=>{const progress=recordCompletion(get().progress,kind,id);set({progress,storageWarning:!persist(progress)});},
 mistake:id=>{const progress=recordPuzzleMistake(get().progress,id);set({progress,storageWarning:!persist(progress)});},
 importProgress:raw=>{const progress=parseProgress(raw);if(!persist(progress))throw new Error('Storage unavailable');set({progress,storageWarning:false});},
 configure:(mode,category='all')=>set({mode,category}),
}));
