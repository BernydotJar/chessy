import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Lightbulb, RotateCcw, Sparkles, Target, Trophy } from 'lucide-react';
import { PUZZLES, CATEGORIES, dailyPuzzle } from '../../learning/puzzles';
import { Category, Level, Puzzle, locale } from '../../learning/types';
import { attempt, startSession, solutionSan } from '../../learning/session';
import { localDay } from '../../learning/progress';
import { useLearningStore } from '../../learning/store';
import { MoveEntry, PositionBoard, SectionHeading } from './Shared';

function PuzzlePlayer({puzzle,onNext,hasNext}:{puzzle:Puzzle;onNext:()=>void;hasNext:boolean}) {
 const {t,i18n}=useTranslation(),lang=locale(i18n.resolvedLanguage);
 const [session,setSession]=useState(()=>startSession(puzzle));
 const [hints,setHints]=useState(0),[revealed,setRevealed]=useState(false),[assisted,setAssisted]=useState(false);
 const [previouslySolved]=useState(()=>useLearningStore.getState().progress.solved.includes(puzzle.id));
 const {complete,mistake}=useLearningStore();
 const san=useMemo(()=>solutionSan(puzzle),[puzzle]);
 const white=puzzle.fen.split(' ')[1]==='w';
 const onMove=(move:string)=>{
  const next=attempt(puzzle,session,move);
  if(next.mistakes>session.mistakes)mistake();
  if(next.solved&&!session.solved&&!assisted)complete('puzzle',puzzle.id);
  setSession(next);
  return next.ply>session.ply;
 };
 return <div className="challenge-layout">
  <div className={`board-card ${session.solved?'board-success':''}`}>
   <div className="board-topline"><span className={`side-dot ${white?'white':'black'}`}/><strong>{t(white?'studio.whiteToMove':'studio.blackToMove')}</strong><span className="tag">{t(`studio.level.${puzzle.level}`)}</span></div>
   <PositionBoard fen={session.fen} onMove={onMove} readOnly={session.solved} hintSquare={hints>0&&!session.solved?puzzle.solution[session.ply]?.slice(0,2):undefined}/>
   <div className="board-bottomline"><span>{puzzle.id}</span><span>{t(`studio.category.${puzzle.category}`)}</span></div>
  </div>
  <section className="panel challenge-panel" aria-label={t('studio.training')}>
   <div className="icon-tile mint"><Target size={25}/></div>
   <h2>{puzzle.title?.[lang]||t(`studio.category.${puzzle.category}`)}</h2>
   <p className="muted">{puzzle.rating?t('studio.ratingNote',{rating:puzzle.rating}):t('studio.original')}</p>
   {puzzle.category==='basics'&&<p className="guided-goal">{t('studio.guidedMove',{move:san[0]})}</p>}
   <div className={`feedback ${session.solved?'success':session.feedback==='wrong'||session.feedback==='illegal'?'wrong':''}`} role="status" aria-live="polite">
    {session.solved&&<Check size={22}/>}<span>{t(`studio.feedback.${session.feedback}`)}</span>
   </div>
   {session.solved&&<div className="success-explanation"><Sparkles size={20}/><p>{assisted?t('studio.assisted'):t(previouslySolved?'studio.alreadySolved':'studio.earned')}</p></div>}
   {!session.solved&&<MoveEntry onMove={onMove}/>}
   {session.moves.length>0&&<div className="move-pills" aria-label={t('studio.line')}>{session.moves.map((move,index)=><span key={index}>{index+1}. {move}</span>)}</div>}
   {hints>0&&!session.solved&&<p className="hint-note">{hints===1?t('studio.firstSquare',{square:puzzle.solution[session.ply]?.slice(0,2)}):t('studio.guidedMove',{move:san[session.ply]})}</p>}
   {(revealed||session.solved)&&<div className="solution"><h3>{t('studio.line')}</h3><p className="notation">{san.join('  ·  ')}</p>{puzzle.explanation&&<p>{puzzle.explanation[lang]}</p>}{puzzle.sourceUrl&&<a href={puzzle.sourceUrl} target="_blank" rel="noreferrer">Lichess · CC0 · {t('studio.source')} ↗</a>}</div>}
   <div className="button-row">
    {!session.solved&&<button className="btn secondary" disabled={hints>=2} onClick={()=>{setHints(h=>h+1);setAssisted(true);}}><Lightbulb size={17}/>{t('studio.hint')}</button>}
    <button className="btn quiet" onClick={()=>{setSession(startSession(puzzle));setHints(0);setRevealed(false);}}><RotateCcw size={16}/>{t('studio.retry')}</button>
   </div>
   {!revealed&&!session.solved&&<button className="text-button" onClick={()=>{setRevealed(true);setAssisted(true);}}>{t('studio.reveal')}</button>}
   {assisted&&!session.solved&&<small className="muted">{t('studio.assisted')}</small>}
   {hasNext&&<button className="btn primary full" onClick={onNext} disabled={!session.solved&&!revealed}>{t('studio.next')}<ArrowRight size={18}/></button>}
  </section>
 </div>;
}
export function ChallengeView() {
 const {t,i18n}=useTranslation(),lang=locale(i18n.resolvedLanguage);
 const {mode,category,configure}=useLearningStore();
 const [level,setLevel]=useState<Level|'all'>('all');const [index,setIndex]=useState(0);const [finished,setFinished]=useState(false);const [sessionId,setSessionId]=useState(0);
 const pool=useMemo(()=>{
  if(mode==='daily')return [dailyPuzzle(localDay())];
  const selected=PUZZLES.filter(p=>(category==='all'||p.category===category)&&(level==='all'||p.level===level));
  if(mode==='sprint'){
   const mixed=selected.filter(p=>p.source==='lichess');const source=mixed.length>=5?mixed:selected;
   const offset=source.length?(sessionId*5)%source.length:0;
   return [...source.slice(offset),...source.slice(0,offset)].slice(0,5);
  }
  return selected;
 },[mode,category,level,sessionId]);
 const current=pool[Math.min(index,Math.max(0,pool.length-1))];
 const reset=()=>{setIndex(0);setFinished(false);};
 return <div className="view-enter">
  <SectionHeading eyebrow={t('studio.training')} title={t('studio.challengeTitle')} subtitle={t('studio.challengeSubtitle')}/>
  <div className="challenge-toolbar">
   <div className="segmented" aria-label={t('studio.training')}>{(['practice','daily','sprint'] as const).map(m=><button key={m} aria-pressed={mode===m} className={mode===m?'active':''} onClick={()=>{configure(m,category);reset();}}>{t(`studio.${m==='daily'?'dailyMode':m}`)}</button>)}</div>
   {mode!=='daily'&&<div className="filters"><label>{t('studio.themeLabel')}<select value={category} onChange={e=>{configure(mode,e.target.value as Category|'all');reset();}}><option value="all">{t('studio.all')}</option>{CATEGORIES.map(c=><option key={c} value={c}>{t(`studio.category.${c}`)}</option>)}</select></label><label>{t('studio.difficulty')}<select value={level} onChange={e=>{setLevel(e.target.value as Level|'all');reset();}}><option value="all">{t('studio.all')}</option>{(['beginner','easy','intermediate','advanced'] as const).map(l=><option key={l} value={l}>{t(`studio.level.${l}`)}</option>)}</select></label></div>}
  </div>
  {pool.length===0?<div className="panel empty-state"><Target size={36}/><p>{t('studio.noPuzzles')}</p></div>:finished?<div className="panel session-complete"><Trophy size={64}/><h2>{t('studio.sessionDone')}</h2><p>{t('studio.sessionSummary')}</p><button className="btn primary" onClick={()=>{setSessionId(s=>s+1);reset();}}>{t('studio.newSession')}</button></div>:<>
   <div className="challenge-counter"><span>{Math.min(index+1,pool.length)} / {pool.length}</span>{mode==='practice'&&<label className="puzzle-select"><span className="sr-only">{t('studio.selectPuzzle')}</span><select aria-label={t('studio.selectPuzzle')} value={current.id} onChange={e=>setIndex(pool.findIndex(p=>p.id===e.target.value))}>{pool.map((p,i)=><option key={p.id} value={p.id}>{i+1}. {p.title?.[lang]||`${t(`studio.category.${p.category}`)} · ${p.rating}`}</option>)}</select></label>}</div>
   <PuzzlePlayer key={`${mode}-${current.id}-${sessionId}`} puzzle={current} hasNext={mode!=='daily'} onNext={()=>{if(mode==='sprint'&&index+1>=pool.length)setFinished(true);else setIndex(i=>(i+1)%pool.length);}}/>
  </>}
 </div>;
}
