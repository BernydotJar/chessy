import { PUZZLES } from './puzzles';
import { LESSONS } from './curriculum';
export interface Progress { version:1; solved:string[]; lessons:string[]; days:string[]; mistakes:number }
export const emptyProgress=():Progress=>({version:1,solved:[],lessons:[],days:[],mistakes:0});
export function localDay(date=new Date()):string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export const xp=(p:Progress)=>p.solved.length*20+p.lessons.length*30;
const dayNumber=(day:string)=>Date.parse(day+'T00:00:00Z')/86400000;
export function streak(p:Progress,today=localDay()):number {
 const days=[...new Set(p.days)].sort().reverse(); if(!days.length)return 0;
 const gap=dayNumber(today)-dayNumber(days[0]); if(gap<0||gap>1)return 0;
 let count=1; for(let i=1;i<days.length&&dayNumber(days[i-1])-dayNumber(days[i])===1;i++) count++;
 return count;
}
export function recordCompletion(p:Progress,kind:'puzzle'|'lesson',id:string,day=localDay()):Progress {
 const valid=kind==='puzzle'?PUZZLES.some(item=>item.id===id):LESSONS.some(item=>item.id===id);
 if(!valid)throw new Error('Unknown learning item');
 const key=kind==='puzzle'?'solved':'lessons';
 return {...p,[key]:[...new Set([...p[key],id])],days:[...new Set([...p.days,day])].sort()};
}
/** Treat imported and persisted content as untrusted. Never import XP or unknown identifiers. */
export function parseProgress(raw:string,today=localDay()):Progress {
 if(raw.length>100000)throw new Error('Backup too large');
 const value:unknown=JSON.parse(raw);
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid backup');
 const p=value as Record<string,unknown>;
 if(p.version!==1||!Array.isArray(p.solved)||!Array.isArray(p.lessons)||!Array.isArray(p.days))throw new Error('Unsupported backup');
 const check=(items:unknown[],allowed:Set<string>,max:number)=>{
  if(items.length>max||items.some(item=>typeof item!=='string'||!allowed.has(item)))throw new Error('Invalid identifiers');
  return [...new Set(items)] as string[];
 };
 const solved=check(p.solved,new Set(PUZZLES.map(item=>item.id)),PUZZLES.length*2);
 const lessons=check(p.lessons,new Set(LESSONS.map(item=>item.id)),LESSONS.length*2);
 if(p.days.length>10000||p.days.some(day=>typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(dayNumber(day))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day||day<'2020-01-01'||day>today))throw new Error('Invalid activity dates');
 if(typeof p.mistakes!=='number'||!Number.isSafeInteger(p.mistakes)||p.mistakes<0||p.mistakes>1000000)throw new Error('Invalid count');
 return {version:1,solved,lessons,days:[...new Set(p.days as string[])].sort(),mistakes:p.mistakes};
}

/** Longest consecutive run, linear after sorting; bounded imported histories remain cheap. */
export function longestStreak(p:Progress):number {let best=0,current=0,previous=Number.NEGATIVE_INFINITY;for(const day of [...new Set(p.days)].sort()){const n=dayNumber(day);current=n-previous===1?current+1:1;best=Math.max(best,current);previous=n;}return best;}
