import { PUZZLES } from './puzzles';
import { LESSONS } from './curriculum';
import type { Category } from './types';

export interface PuzzleReviewRecord {
  id:string;
  wrong:number;
  correct:number;
  lastDay:string;
}

export interface Progress {
  version:2;
  solved:string[];
  lessons:string[];
  days:string[];
  mistakes:number;
  review:PuzzleReviewRecord[];
}


export interface WeakThemeSummary {
  category:Category;
  mistakes:number;
  recovered:number;
  outstanding:number;
}

export const emptyProgress=():Progress=>({version:2,solved:[],lessons:[],days:[],mistakes:0,review:[]});
export function localDay(date=new Date()):string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export const xp=(p:Progress)=>p.solved.length*20+p.lessons.length*30;
const dayNumber=(day:string)=>Date.parse(day+'T00:00:00Z')/86400000;
const validDay=(day:unknown,today:string)=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(dayNumber(day))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day&&day>='2020-01-01'&&day<=today;
const puzzleIds=new Set(PUZZLES.map(item=>item.id));
const lessonIds=new Set(LESSONS.map(item=>item.id));

export function streak(p:Progress,today=localDay()):number {
 const days=[...new Set(p.days)].sort().reverse(); if(!days.length)return 0;
 const gap=dayNumber(today)-dayNumber(days[0]); if(gap<0||gap>1)return 0;
 let count=1; for(let i=1;i<days.length&&dayNumber(days[i-1])-dayNumber(days[i])===1;i++) count++;
 return count;
}

export function recordCompletion(p:Progress,kind:'puzzle'|'lesson',id:string,day=localDay()):Progress {
 const valid=kind==='puzzle'?puzzleIds.has(id):lessonIds.has(id);
 if(!valid)throw new Error('Unknown learning item');
 const key=kind==='puzzle'?'solved':'lessons';
 const completed={...p,[key]:[...new Set([...p[key],id])],days:[...new Set([...p.days,day])].sort()} as Progress;
 return kind==='puzzle'?recordPuzzleSolve(completed,id,day):completed;
}

export function recordPuzzleMistake(p:Progress,id:string,day=localDay()):Progress {
 if(!puzzleIds.has(id))throw new Error('Unknown puzzle');
 const current=p.review.find(item=>item.id===id);
 const next: PuzzleReviewRecord=current
  ? {...current,wrong:Math.min(100000,current.wrong+1),lastDay:day}
  : {id,wrong:1,correct:0,lastDay:day};
 return {
  ...p,
  mistakes:Math.min(1000000,p.mistakes+1),
  review:[...p.review.filter(item=>item.id!==id),next],
 };
}

/** A clean solve recovers at most one recorded mistake. Replays cannot drive the score below zero. */
export function recordPuzzleSolve(p:Progress,id:string,day=localDay()):Progress {
 const current=p.review.find(item=>item.id===id);
 if(!current)return p;
 const next={...current,correct:Math.min(current.wrong,current.correct+1),lastDay:day};
 return {...p,review:[...p.review.filter(item=>item.id!==id),next]};
}

/** Outstanding mistakes first, then most recently missed. Stable ID tie-break keeps the queue deterministic. */
export function reviewQueueIds(p:Progress):string[] {
 return p.review
  .filter(item=>item.wrong>item.correct)
  .sort((a,b)=>(b.wrong-b.correct)-(a.wrong-a.correct)||b.lastDay.localeCompare(a.lastDay)||a.id.localeCompare(b.id))
  .map(item=>item.id);
}

/** A weak theme requires at least two observed mistakes and at least one unresolved mistake. */
export function weakThemes(p:Progress,minMistakes=2):WeakThemeSummary[] {
 const byCategory=new Map<Category,WeakThemeSummary>();
 for(const item of p.review){
  const puzzle=PUZZLES.find(candidate=>candidate.id===item.id);if(!puzzle)continue;
  const current=byCategory.get(puzzle.category)||{category:puzzle.category,mistakes:0,recovered:0,outstanding:0};
  current.mistakes+=item.wrong;current.recovered+=item.correct;current.outstanding+=Math.max(0,item.wrong-item.correct);
  byCategory.set(puzzle.category,current);
 }
 return [...byCategory.values()].filter(item=>item.mistakes>=minMistakes&&item.outstanding>0).sort((a,b)=>b.outstanding-a.outstanding||b.mistakes-a.mistakes||a.category.localeCompare(b.category));
}

/** Treat imported and persisted content as untrusted. Never import XP or unknown identifiers. */
export function parseProgress(raw:string,today=localDay()):Progress {
 if(raw.length>100000)throw new Error('Backup too large');
 const value:unknown=JSON.parse(raw);
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid backup');
 const p=value as Record<string,unknown>;
 if((p.version!==1&&p.version!==2)||!Array.isArray(p.solved)||!Array.isArray(p.lessons)||!Array.isArray(p.days))throw new Error('Unsupported backup');
 const check=(items:unknown[],allowed:Set<string>,max:number)=>{
  if(items.length>max||items.some(item=>typeof item!=='string'||!allowed.has(item)))throw new Error('Invalid identifiers');
  return [...new Set(items)] as string[];
 };
 const solved=check(p.solved,puzzleIds,PUZZLES.length*2);
 const lessons=check(p.lessons,lessonIds,LESSONS.length*2);
 if(p.days.length>10000||p.days.some(day=>!validDay(day,today)))throw new Error('Invalid activity dates');
 if(typeof p.mistakes!=='number'||!Number.isSafeInteger(p.mistakes)||p.mistakes<0||p.mistakes>1000000)throw new Error('Invalid count');
 const base={version:2 as const,solved,lessons,days:[...new Set(p.days as string[])].sort(),mistakes:p.mistakes};
 if(p.version===1)return {...base,review:[]};
 if(!Array.isArray(p.review)||p.review.length>PUZZLES.length*2)throw new Error('Invalid review history');
 const seen=new Set<string>();
 const review=p.review.map(entry=>{
  if(!entry||typeof entry!=='object'||Array.isArray(entry))throw new Error('Invalid review item');
  const item=entry as Record<string,unknown>;
  if(typeof item.id!=='string'||!puzzleIds.has(item.id)||seen.has(item.id))throw new Error('Invalid review identifier');
  if(typeof item.wrong!=='number'||!Number.isSafeInteger(item.wrong)||item.wrong<0||item.wrong>100000)throw new Error('Invalid review count');
  if(typeof item.correct!=='number'||!Number.isSafeInteger(item.correct)||item.correct<0||item.correct>item.wrong)throw new Error('Invalid recovery count');
  if(!validDay(item.lastDay,today))throw new Error('Invalid review date');
  seen.add(item.id);
  return {id:item.id,wrong:item.wrong,correct:item.correct,lastDay:item.lastDay as string};
 });
 return {...base,review};
}

/** Longest consecutive run, linear after sorting; bounded imported histories remain cheap. */
export function longestStreak(p:Progress):number {let best=0,current=0,previous=Number.NEGATIVE_INFINITY;for(const day of [...new Set(p.days)].sort()){const n=dayNumber(day);current=n-previous===1?current+1:1;best=Math.max(best,current);previous=n;}return best;}
