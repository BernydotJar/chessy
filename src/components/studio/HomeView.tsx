import { useTranslation } from 'react-i18next';
import { ArrowRight, Globe2 } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useLearningStore } from '../../learning/store';
import { PUZZLES, dailyPuzzle } from '../../learning/puzzles';
import { LESSONS } from '../../learning/curriculum';
import { localDay, streak, xp } from '../../learning/progress';
import { locale } from '../../learning/types';
import { PositionBoard } from './Shared';
import { ChessyIcon } from '../../design/icons';
import { ThemeGallery } from '../../design/ThemeGallery';

export function HomeView() {
 const {t,i18n}=useTranslation(),lang=locale(i18n.resolvedLanguage);const {progress,configure}=useLearningStore();const setView=useGameStore(s=>s.setView);
 const daily=dailyPuzzle(localDay()),next=LESSONS.find(l=>!progress.lessons.includes(l.id))||LESSONS[0];
 const start=(mode:'practice'|'daily'|'sprint')=>{configure(mode);setView('training');};
 return <div className="view-enter home-view">
  <div className="hero-grid home-workspace">
   <section className="hero-copy"><p className="eyebrow"><span className="live-dot"/>{t('studio.heroEyebrow')}</p><h1>{t('studio.heroTitle')}</h1><p>{t('studio.heroSubtitle')}</p><div className="button-row"><button className="btn primary large" onClick={()=>start('practice')}>{t('studio.startPractice')}<ChessyIcon name="arrow" size={18}/></button><button className="btn secondary large" onClick={()=>setView('academy')}>{t('studio.exploreAcademy')}</button></div><div className="hero-proof"><span><ChessyIcon name="target" size={16}/>{t('studio.challengeCount',{count:PUZZLES.length})}</span><span><Globe2 size={16}/>ES / EN / PT</span></div></section>
   <section className="hero-board-panel"><div className="hero-board-heading"><span className="icon-tile small"><ChessyIcon name="spark" size={18}/></span><div><h2>{t('studio.daily')}</h2><p>{t('studio.dailyHint')}</p></div><span className="tag gold">{localDay().slice(5).replace('-',' / ')}</span></div><div className="hero-board"><PositionBoard fen={daily.fen} readOnly/></div><button className="hero-board-cta" onClick={()=>start('daily')}><span>{t('studio.solveDaily')}</span><ChessyIcon name="arrow" size={19}/></button></section>
  </div>
  <div className="stat-grid home-metrics"><div className="stat-card"><div className="icon-tile"><ChessyIcon name="xp" size={21}/></div><div><strong>{xp(progress)}</strong><span>{t('studio.xp')}</span></div></div><div className="stat-card"><div className="icon-tile achievement-tone"><ChessyIcon name="streak" size={21}/></div><div><strong>{streak(progress)}</strong><span>{t('studio.streak')}</span></div></div><div className="stat-card"><div className="icon-tile"><ChessyIcon name="target" size={21}/></div><div><strong>{progress.solved.length}<small> / {PUZZLES.length}</small></strong><span>{t('studio.solved')}</span></div></div></div>
  <div className="home-section-title"><div><p className="eyebrow">{t('studio.yourPath')}</p><h2>{t('studio.choosePath')}</h2></div><button className="text-button" onClick={()=>setView('progress')}>{t('studio.progress')}<ArrowRight size={17}/></button></div>
  <div className="path-grid"><button className="panel path-card" onClick={()=>setView('academy')}><span className="icon-tile"><ChessyIcon name="academy" size={25}/></span><span className="path-eyebrow">{t('studio.continueLearning')}</span><h3>{next.title[lang]}</h3><p>{t(`studio.track.${next.track}`)} · {t('studio.minutes',{count:next.minutes})}</p><span className="card-action">{t('studio.readLesson')}<ChessyIcon name="arrow" size={18}/></span></button><button className="panel path-card" onClick={()=>start('sprint')}><span className="icon-tile achievement-tone"><ChessyIcon name="xp" size={25}/></span><span className="path-eyebrow">{t('studio.training')}</span><h3>{t('studio.sprint')}</h3><p>{t('studio.challengeSubtitle')}</p><span className="card-action">{t('studio.startPractice')}<ChessyIcon name="arrow" size={18}/></span></button><button className="panel path-card" onClick={()=>setView('play')}><span className="icon-tile"><ChessyIcon name="play" size={25}/></span><span className="path-eyebrow">Stockfish · 5</span><h3>{t('studio.playTitle')}</h3><p>{t('studio.local')}</p><span className="card-action">{t('studio.play')}<ChessyIcon name="arrow" size={18}/></span></button></div>
  <section className="home-theme-section" aria-labelledby="home-themes"><div className="home-section-title"><div><p className="eyebrow">UI Kit</p><h2 id="home-themes">{t('theme.choose')}</h2></div><span className="fine-print">{t('theme.persistHint')}</span></div><ThemeGallery compact/></section>
 </div>;
}
