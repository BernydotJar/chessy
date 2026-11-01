import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpenCheck, Users } from 'lucide-react';
import { useAuthStore } from '../../auth/store';
import { locale } from '../../learning/types';
import type { LearningRoom } from '../../rooms/model';
import { listRoomMembers } from '../../rooms/cloud';
import { CLASSROOM_EXERCISES, assignRoomExercise, endRoomExercise, submitRoomExerciseMove,
  watchRoomExercise, type AssignedRoomExercise } from '../../rooms/exercises';
import { PositionBoard } from './Shared';
import '../../styles/guided-exercises.css';

const banks=[1,2,3,4,5] as const;
export default function GuidedExercisePanel({room,owns,memberCount}:{room:LearningRoom;owns:boolean;memberCount:number}) {
  const {t,i18n}=useTranslation();
  const lang=locale(i18n.resolvedLanguage);
  const uid=useAuthStore(s=>s.user?.id);
  const [exercise,setExercise]=useState<AssignedRoomExercise|null>(null);
  const [members,setMembers]=useState<string[]>([]);
  const [learner,setLearner]=useState('');
  const [block,setBlock]=useState(1);
  const [puzzleId,setPuzzleId]=useState(CLASSROOM_EXERCISES[0].id);
  const [busy,setBusy]=useState(false);
  const membersRequest=useRef(0);
  const [status,setStatus]=useState<'ready'|'waiting'|'unavailable'|'error'>('waiting');
  const [moveFeedback,setMoveFeedback]=useState('');
  const exercises=useMemo(()=>CLASSROOM_EXERCISES.filter((_,index)=>Math.floor(index/40)+1===block),[block]);
  const selected=CLASSROOM_EXERCISES.find(item=>item.id===exercise?.puzzleId);
  const exerciseIndex=CLASSROOM_EXERCISES.findIndex(item=>item.id===exercise?.puzzleId);
  const nextExercise=exerciseIndex>=0?CLASSROOM_EXERCISES[exerciseIndex+1]:null;
  const assignedToMe=Boolean(exercise && uid === exercise.assignedUid);
  const canPlay=Boolean(assignedToMe && room.status==='active' && exercise?.status==='active' && !busy);
  const learnerLabel=(value:string)=>t('rooms.learner')+' '+value.slice(0,6)+'…';

  const reloadMembers=useCallback(async()=>{
    const request=++membersRequest.current;
    if(!owns){setMembers([]);setLearner('');return;}
    try{
      const list=(await listRoomMembers(room.id)).filter(entry=>entry.ageBand==='adult')
        .map(entry=>entry.uid).filter(item=>item!==uid);
      if(request!==membersRequest.current)return;
      setMembers(list);
      setLearner(value=>list.includes(value)?value:list[0]||'');
    }catch{if(request===membersRequest.current)setStatus('error');}
  },[owns,room.id,uid]);
  useEffect(()=>{
    const counter=membersRequest;
    void reloadMembers();
    return ()=>{counter.current++;};
  },[reloadMembers,memberCount]);
  useEffect(()=>{
    let active=true;let stop=()=>{};
    setStatus('waiting');setExercise(null);setMoveFeedback('');
    void watchRoomExercise(room.id,value=>{
      if(!active)return;
      setExercise(value);
      setStatus(value?'ready':'waiting');
    },()=>{
      if(active){setExercise(null);setStatus('unavailable');}
    }).then(unsubscribe=>{if(active)stop=unsubscribe;else unsubscribe();})
      .catch(()=>{if(active)setStatus('unavailable');});
    return ()=>{active=false;stop();};
  },[room.id,uid,owns]);
  async function perform(fn:()=>Promise<unknown>){
    if(busy)return;setBusy(true);setMoveFeedback('');
    try{await fn();}
    catch{setMoveFeedback('rooms.exerciseActionError');}
    finally{setBusy(false);}
  }
  const sendMove=(uci:string)=>{
    if(!exercise||!canPlay)return false;
    void perform(async()=>{
      const result=await submitRoomExerciseMove(room.id,uci,exercise.revision);
      setMoveFeedback(result.result==='retry'?'rooms.exerciseRetry':
        result.completed?'rooms.exerciseCompleted':'rooms.exerciseCorrect');
    });
    return true;
  };
  function selectBlock(next:number){
    setBlock(next);setPuzzleId(CLASSROOM_EXERCISES[(next-1)*40].id);
  }
  if(room.audience!=='adults')return null;
  return <section className="panel guided-exercise" data-testid="guided-exercise" aria-labelledby="exercise-title">
    <div className="guided-heading">
      <div><p className="eyebrow"><BookOpenCheck size={16} aria-hidden="true"/> {t('rooms.exerciseEyebrow')}</p>
        <h3 id="exercise-title">{t('rooms.exerciseTitle')}</h3>
      </div><span className="tag">{t('rooms.exerciseOneToOne')}</span>
    </div>
    <p className="muted">{t('rooms.exerciseDescription')}</p>
    {owns && room.status==='active' && <div className="guided-controls">
      <label>{t('rooms.exerciseLearner')}
        <select value={learner} onChange={e=>setLearner(e.target.value)} disabled={busy}>
          {members.length===0 && <option value="">{t('rooms.exerciseNoLearner')}</option>}
          {members.map(item=><option key={item} value={item}>{learnerLabel(item)}</option>)}
        </select>
      </label>
      <label>{t('rooms.exerciseBlock')}
        <select value={block} onChange={e=>selectBlock(Number(e.target.value))} disabled={busy}>
          {banks.map(value=><option key={value} value={value}>{t('rooms.exerciseBlock')} {value} / 5</option>)}
        </select>
      </label>
      <label className="guided-picker">{t('rooms.exerciseChoose')}
        <select value={puzzleId} disabled={busy} onChange={e=>setPuzzleId(e.target.value)}>
          {exercises.map((p,index)=><option key={p.id} value={p.id}>
            {(block-1)*40+index+1}. {p.title?.[lang]||p.category+' · '+p.id}
          </option>)}
        </select>
      </label>
      <div className="button-row guided-actions">
        <button className="btn primary" type="button" disabled={!learner||busy} onClick={()=>void perform(async()=>{
          await assignRoomExercise(room.id,puzzleId,learner);
        })}>{t(exercise?.status==='active'?'rooms.exerciseChange':'rooms.exerciseAssign')}</button>
        <button className="btn secondary" type="button" disabled={busy} onClick={()=>void reloadMembers()}>
          <Users size={16} aria-hidden="true"/>{t('rooms.exerciseRefreshLearners')}
        </button>
        {exercise?.status==='active' && <button className="btn quiet" type="button" disabled={busy}
          onClick={()=>void perform(()=>endRoomExercise(room.id))}>{t('rooms.exerciseEnd')}</button>}
      </div>
    </div>}
    {status==='unavailable' && <p className="fine-print" role="status">{t('rooms.exerciseNotAssigned')}</p>}
    {status==='error' && <p className="feedback wrong" role="alert">{t('rooms.exerciseActionError')}</p>}
    {!exercise && status==='waiting' && <p role="status" className="fine-print">{t(owns?'rooms.exerciseChooseToStart':'rooms.exerciseWaiting')}</p>}
    {exercise && <div className="guided-active">
      <div className="guided-active-header">
        <div><h4>{selected?.title?.[lang]||t('rooms.exercisePosition')}</h4>
          <p className="fine-print">{t('rooms.exerciseBlock')} {Math.floor(CLASSROOM_EXERCISES.findIndex(x=>x.id===exercise.puzzleId)/40)+1}
            {' · '}{t('rooms.exerciseAttempts')}: {exercise.attempts}
          </p></div>
        <span className="tag">{t('rooms.exercise'+(exercise.status==='completed'?'Finished':exercise.status==='ended'?'Ended':'Active'))}</span>
      </div>
      {(owns||assignedToMe) && <div className="guided-play">
        <div className="guided-board"><PositionBoard key={exercise.puzzleId} fen={exercise.fen}
          readOnly={!canPlay} boardId="guided-exercise-board" onMove={sendMove}/></div>
        <div className="guided-instruction">
          <p>{t(owns?'rooms.exerciseCoachPrompt':assignedToMe?'rooms.exerciseStudentPrompt':'rooms.exerciseWaiting')}</p>
          {exercise.status==='active' && !owns && <p className="fine-print">{t('rooms.exerciseYourTurn')}</p>}
          {exercise.status==='completed' && <p className="feedback success" role="status">{t('rooms.exerciseCompleted')}</p>}
          {exercise.status==='ended' && <p className="fine-print" role="status">{t('rooms.exerciseEnded')}</p>}
          {moveFeedback && <p className={moveFeedback==='rooms.exerciseActionError'?'feedback wrong':'fine-print'} role="status">{t(moveFeedback)}</p>}
          {owns && selected?.explanation?.[lang] && <p className="fine-print">{selected.explanation[lang]}</p>}
          {owns && exercise.status==='completed' && nextExercise && members.includes(exercise.assignedUid) &&
            <button className="btn primary" type="button" disabled={busy} onClick={()=>void perform(async()=>{
              await assignRoomExercise(room.id,nextExercise.id,exercise.assignedUid);
              const nextIndex=CLASSROOM_EXERCISES.indexOf(nextExercise);
              setBlock(Math.floor(nextIndex/40)+1);
              setPuzzleId(nextExercise.id);
            })}>{t('rooms.exerciseNext')}</button>}
          {owns && <p className="fine-print">{t('rooms.exercisePrivate')}</p>}
        </div>
      </div>}
    </div>}
  </section>;
}
