import { describe,it,expect } from 'vitest';
import { Chess } from 'chess.js';
import { PUZZLES,dailyPuzzle } from '../src/learning/puzzles';
import { LESSONS,TRACKS } from '../src/learning/curriculum';
import { attempt,startSession,solutionSan } from '../src/learning/session';
import { emptyProgress,parseProgress,recordCompletion,streak,xp } from '../src/learning/progress';
describe('Every shipped puzzle is playable',()=>{
 it('has unique ids and diverse difficulty',()=>{expect(new Set(PUZZLES.map(p=>p.id)).size).toBe(PUZZLES.length);expect(PUZZLES.length).toBeGreaterThan(100);expect(PUZZLES.some(p=>p.fen.split(' ')[1]==='b')).toBe(true);});
 for(const p of PUZZLES)it(p.id,()=>{
  const game=new Chess(p.fen);expect(game.isGameOver()).toBe(false);expect(p.solution.length%2).toBe(1);
  const opposite=p.fen.split(' ');opposite[1]=opposite[1]==='w'?'b':'w';opposite[3]='-';expect(new Chess(opposite.join(' ')).isCheck()).toBe(false);
  let state=startSession(p);
  for(let i=0;i<p.solution.length;i+=2)state=attempt(p,state,p.solution[i]);
  expect(state.solved).toBe(true);expect(state.feedback).toBe('solved');expect(solutionSan(p).length).toBe(p.solution.length);
  if(p.tags.some(t=>/^mateIn\d+$/.test(t)))expect(new Chess(state.fen).isCheckmate()).toBe(true);
  expect(attempt(p,state,p.solution[0])).toBe(state);
 });
 it('does not corrupt a position after a wrong move',()=>{const p=PUZZLES[0],s=startSession(p);expect(attempt(p,s,'a1a8').fen).toBe(s.fen);expect(attempt(p,s,'e1e2').feedback).toBe('wrong');expect(attempt(p,s,'e1e2').ply).toBe(0);});
 it('does not mutate after an illegal move',()=>{const p=PUZZLES[0],s=startSession(p);expect(attempt(p,s,'a1b2')).toEqual({...s,feedback:'illegal'});});
 it('uses a deterministic daily selection',()=>{expect(dailyPuzzle('2026-09-04').id).toBe(dailyPuzzle('2026-09-04').id);});
 it('underpromotion avoids stalemate',()=>{const p=PUZZLES.find(p=>p.id==='underpromotion')!;const q=new Chess(p.fen);q.move('c8=Q');expect(q.isStalemate()).toBe(true);expect(new Chess(attempt(p,startSession(p),'c7c8r').fen).isStalemate()).toBe(false);});
});
describe('Original academy',()=>{
 it('covers six tracks with two complete lessons each',()=>{for(const track of TRACKS)expect(LESSONS.filter(l=>l.track===track)).toHaveLength(2);});
 for(const l of LESSONS)it(l.id,()=>{expect(l.answer).toBeGreaterThanOrEqual(0);expect(l.answer).toBeLessThan(l.options.length);for(const locale of ['es','en','pt'] as const){expect(l.title[locale].length).toBeGreaterThan(5);expect(l.body.every(p=>p[locale].length>100)).toBe(true);expect(l.explanation[locale]).toBeTruthy();expect(l.options.every(o=>o[locale])).toBe(true);}});
});
describe('Safe local learning progress',()=>{
 it('never farms XP from replaying a completed puzzle or lesson',()=>{let p=recordCompletion(emptyProgress(),'puzzle',PUZZLES[0].id,'2026-09-04');p=recordCompletion(p,'puzzle',PUZZLES[0].id,'2026-09-04');expect(xp(p)).toBe(20);p=recordCompletion(p,'lesson',LESSONS[0].id,'2026-09-04');p=recordCompletion(p,'lesson',LESSONS[0].id,'2026-09-04');expect(xp(p)).toBe(50);});
 it('roundtrips a valid backup',()=>{const p=recordCompletion(emptyProgress(),'puzzle',PUZZLES[0].id,'2026-09-04');expect(parseProgress(JSON.stringify(p),'2026-09-04')).toEqual(p);});
 it.each(['null','[]','{}','invalid',JSON.stringify({...emptyProgress(),version:2}),JSON.stringify({...emptyProgress(),solved:['fake']}),JSON.stringify({...emptyProgress(),days:['2026-02-30']}),JSON.stringify({...emptyProgress(),days:['9999-01-01']}),JSON.stringify({...emptyProgress(),mistakes:-1})])('rejects malformed backup: %s',raw=>{expect(()=>parseProgress(raw,'2026-09-04')).toThrow();});
 it('rejects oversized backup',()=>expect(()=>parseProgress(' '.repeat(100001))).toThrow());
 it('computes consecutive calendar days',()=>{const p={...emptyProgress(),days:['2026-09-02','2026-09-03']};expect(streak(p,'2026-09-04')).toBe(2);expect(streak(p,'2026-09-05')).toBe(0);});
 it('rejects unknown completion ids',()=>expect(()=>recordCompletion(emptyProgress(),'puzzle','fake')).toThrow());
});
