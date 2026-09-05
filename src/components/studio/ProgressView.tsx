import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, BookOpen, Check, Download, Flame, LockKeyhole, ShieldCheck, Target, Upload, Zap } from 'lucide-react';
import { useLearningStore } from '../../learning/store';
import { localDay, longestStreak, parseProgress, streak, xp } from '../../learning/progress';
import { LESSONS, TRACKS } from '../../learning/curriculum';
import { downloadText } from '../../utils/download';
import { SectionHeading } from './Shared';
export function ProgressView() {
 const {t}=useTranslation();const {progress,importProgress}=useLearningStore();const [pending,setPending]=useState<string|null>(null),[message,setMessage]=useState('');
 const streakBest=longestStreak(progress);
 const badges=[{id:'first',icon:SparkIcon,unlocked:progress.solved.length>0},{id:'ten',icon:Target,unlocked:progress.solved.length>=10},{id:'scholar',icon:BookOpen,unlocked:progress.lessons.length===LESSONS.length},{id:'streak',icon:Flame,unlocked:streakBest>=3}];
 return <div className="view-enter"><SectionHeading eyebrow={t('studio.progress')} title={t('studio.progressTitle')} subtitle={t('studio.progressSubtitle')}/>
  <div className="stat-grid four"><div className="stat-card"><Zap size={25}/><div><strong>{xp(progress)}</strong><span>{t('studio.xp')}</span></div></div><div className="stat-card"><Flame size={25}/><div><strong>{streak(progress)}</strong><span>{t('studio.streak')}</span></div></div><div className="stat-card"><Target size={25}/><div><strong>{progress.solved.length}</strong><span>{t('studio.solved')}</span></div></div><div className="stat-card"><BookOpen size={25}/><div><strong>{progress.lessons.length}</strong><span>{t('studio.completed')}</span></div></div></div>
  <p className="fine-print">{t('studio.noElo')}</p>
  <section className="progress-section"><h2>{t('studio.achievements')}</h2><div className="badge-grid">{badges.map(b=>{const Icon=b.icon;return <div key={b.id} className={`panel achievement ${b.unlocked?'earned':'locked'}`}><div className="achievement-icon"><Icon size={34}/></div><h3>{t(`studio.badge.${b.id}`)}</h3><span>{b.unlocked?<Check size={14}/>:<LockKeyhole size={14}/>} {t(b.unlocked?'studio.unlocked':'studio.locked')}</span></div>;})}</div></section>
  <div className="progress-bottom"><section className="panel"><h2>{t('studio.academy')}</h2>{TRACKS.map(track=>{const items=LESSONS.filter(l=>l.track===track),done=items.filter(l=>progress.lessons.includes(l.id)).length;return <div className="track-completion" key={track}><div><span>{t(`studio.track.${track}`)}</span><span>{done}/{items.length}</span></div><progress max={items.length} value={done} aria-label={t(`studio.track.${track}`)}/></div>;})}</section><section className="panel backup-panel"><div className="icon-tile mint"><ShieldCheck size={26}/></div><h2>{t('studio.backup')}</h2><p>{t('studio.progressSubtitle')}</p><div className="button-row"><button className="btn secondary" onClick={()=>downloadText(`chessy-progress-${localDay()}.json`,JSON.stringify(progress,null,2))}><Download size={17}/>{t('studio.export')}</button><label className="btn secondary file-button"><Upload size={17}/>{t('studio.import')}<input type="file" accept="application/json,.json" aria-label={t('studio.import')} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>100000)throw new Error('size');const raw=await file.text();parseProgress(raw);setPending(raw);setMessage('');}catch{setPending(null);setMessage('studio.importError');}}}/></label></div>
    {pending&&<div className="confirm-panel"><p>{t('studio.importConfirm')}</p><div className="button-row"><button className="btn primary" onClick={()=>{try{importProgress(pending);setMessage('studio.importSuccess');}catch{setMessage('studio.importError');}setPending(null);}}>{t('studio.replace')}</button><button className="btn quiet" onClick={()=>setPending(null)}>{t('studio.cancel')}</button></div></div>}{message&&<p className="feedback" role="status">{t(message)}</p>}
  </section></div>
 </div>;
}
const SparkIcon=Award;
