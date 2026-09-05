import { create } from 'zustand';
import { Progress, emptyProgress, parseProgress, recordCompletion } from './progress';
import { Category } from './types';
const KEY='chessy-learning-v1';
let initial=emptyProgress(),storageWarning=false;
try { const raw=localStorage.getItem(KEY); if(raw) initial=parseProgress(raw); } catch { storageWarning=true; }
interface LearningStore {
 progress:Progress;storageWarning:boolean;mode:'practice'|'daily'|'sprint';category:Category|'all';
 complete:(kind:'puzzle'|'lesson',id:string)=>void;mistake:()=>void;importProgress:(raw:string)=>void;
 configure:(mode:'practice'|'daily'|'sprint',category?:Category|'all')=>void;
}
function persist(progress:Progress):boolean {try{localStorage.setItem(KEY,JSON.stringify(progress));return true;}catch{return false;}}
export const useLearningStore=create<LearningStore>((set,get)=>({
 progress:initial,storageWarning,mode:'practice',category:'all',
 complete:(kind,id)=>{const progress=recordCompletion(get().progress,kind,id);set({progress,storageWarning:!persist(progress)});},
 mistake:()=>{const progress={...get().progress,mistakes:Math.min(1000000,get().progress.mistakes+1)};set({progress,storageWarning:!persist(progress)});},
 importProgress:raw=>{const progress=parseProgress(raw);if(!persist(progress))throw new Error('Storage unavailable');set({progress,storageWarning:false});},
 configure:(mode,category='all')=>set({mode,category}),
}));
