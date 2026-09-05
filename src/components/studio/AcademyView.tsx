import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, Compass, Crosshair, Flag, Lightbulb, Shield, Target } from 'lucide-react';
import { LESSONS, TRACKS } from '../../learning/curriculum';
import { Lesson, locale } from '../../learning/types';
import { useLearningStore } from '../../learning/store';
import { useGameStore } from '../../store/gameStore';
import { SectionHeading } from './Shared';
const icons={fundamentals:Compass,tactics:Target,strategy:Lightbulb,openings:Shield,endgames:Flag,calculation:Crosshair};
function LessonReader({lesson,onBack}:{lesson:Lesson;onBack:()=>void}) {
 const {t,i18n}=useTranslation(),lang=locale(i18n.resolvedLanguage);const [answer,setAnswer]=useState<number|null>(null);
 const {progress,complete,configure}=useLearningStore();const setView=useGameStore(s=>s.setView);const heading=useRef<HTMLHeadingElement>(null);
 const correct=answer===lesson.answer,done=progress.lessons.includes(lesson.id);
 useEffect(()=>{heading.current?.focus();},[]);
 return <article className="lesson-reader view-enter">
  <button className="text-button back-link" onClick={onBack}><ArrowLeft size={17}/>{t('studio.backAcademy')}</button>
  <div className="lesson-meta"><span className="tag">{t(`studio.track.${lesson.track}`)}</span><span><Clock size={15}/>{t('studio.minutes',{count:lesson.minutes})}</span>{done&&<CheckCircle2 size={19} className="accent"/>}</div>
  <h1 ref={heading} tabIndex={-1}>{lesson.title[lang]}</h1>
  <div className="lesson-body">{lesson.body.map((p,index)=><p key={index}>{p[lang]}</p>)}</div>
  <aside className="takeaway"><Lightbulb size={24}/><div><h2>{t('studio.keyIdea')}</h2><p>{lesson.takeaway[lang]}</p></div></aside>
  <section className="panel quiz" aria-labelledby="quiz-heading"><p className="eyebrow">{t('studio.checkUnderstanding')}</p><h2 id="quiz-heading">{lesson.question[lang]}</h2><div className="quiz-options">{lesson.options.map((option,index)=><button key={index} aria-pressed={answer===index} className={`quiz-option ${answer===index?(correct?'correct':'incorrect'):''}`} disabled={correct} onClick={()=>{setAnswer(index);if(index===lesson.answer)complete('lesson',lesson.id);}}><span className="option-letter">{String.fromCharCode(65+index)}</span>{option[lang]}{answer===index&&correct&&<CheckCircle2 size={20}/>}</button>)}</div>
   {answer!==null&&<div className={`feedback ${correct?'success':'wrong'}`} role="status"><div><strong>{t(correct?'studio.answerCorrect':'studio.answerWrong')}</strong>{correct&&<p>{lesson.explanation[lang]}</p>}</div></div>}
  </section>
  <div className="button-row"><button className="btn primary" onClick={()=>{configure('practice',lesson.practice);setView('training');}}>{t('studio.practiceIdea')}<ArrowRight size={18}/></button><button className="btn secondary" onClick={onBack}>{t('studio.backAcademy')}</button></div>
 </article>;
}
export function AcademyView() {
 const {t,i18n}=useTranslation(),lang=locale(i18n.resolvedLanguage);const {progress}=useLearningStore();
 const [selected,setSelected]=useState<Lesson|null>(null);
 if(selected)return <LessonReader key={selected.id} lesson={selected} onBack={()=>setSelected(null)}/>;
 return <div className="view-enter"><SectionHeading eyebrow={t('studio.academyEyebrow')} title={t('studio.academyTitle')} subtitle={t('studio.academySubtitle')}/><div className="academy-summary"><BookOpen size={18}/><span>{t('studio.lessonCount',{count:LESSONS.length})}</span><span className="divider-dot"/><span>{progress.lessons.length} / {LESSONS.length} · {t('studio.completed')}</span></div>
  <div className="track-grid">{TRACKS.map((track,index)=>{const Icon=icons[track];const lessons=LESSONS.filter(l=>l.track===track),count=lessons.filter(l=>progress.lessons.includes(l.id)).length;return <section className={`panel track-card track-${track}`} key={track}><div className="track-card-top"><div className="icon-tile"><Icon size={26}/></div><span className="track-number">0{index+1}</span></div><h2>{t(`studio.track.${track}`)}</h2><div className="track-progress"><span style={{width:`${count/lessons.length*100}%`}}/></div><div className="lesson-list">{lessons.map(lesson=><button key={lesson.id} className="lesson-link" onClick={()=>setSelected(lesson)}><span>{progress.lessons.includes(lesson.id)?<CheckCircle2 size={18} className="accent"/>:<BookOpen size={18}/>}</span><span><strong>{lesson.title[lang]}</strong><small>{t(`studio.level.${lesson.level}`)} · {t('studio.minutes',{count:lesson.minutes})}</small></span><ArrowRight size={17}/></button>)}</div></section>;})}</div>
 </div>;
}
