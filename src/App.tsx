import { Component, ErrorInfo, ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChessBoard } from './components/ChessBoard';
import { GameControls } from './components/GameControls';
import { MoveHistory } from './components/MoveHistory';
import { ThemeCustomizer } from './components/ThemeCustomizer';
import { AIOpponent } from './components/AIOpponent';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { CoachInsights } from './components/CoachInsights';
import { ChessGlossary } from './components/ChessGlossary';
import { BoardSetupPanel } from './components/BoardSetupPanel';
import { GamesHub } from './components/GamesHub';
import { ReviewView } from './components/ReviewView';
import { AnalysisView } from './components/AnalysisView';
import { HomeView } from './components/studio/HomeView';
import { AcademyView } from './components/studio/AcademyView';
import { ChallengeView } from './components/studio/ChallengeView';
import { ProgressView } from './components/studio/ProgressView';
import { LibraryView } from './components/studio/LibraryView';
import { GameFiles } from './components/studio/GameFiles';
import { MoveEntry, SectionHeading } from './components/studio/Shared';
import { useGameStore } from './store/gameStore';
import { useLearningStore } from './learning/store';
import { locale } from './learning/types';
import { ChessyIcon, type ChessyIconName } from './design/icons';
import './styles/glassmorphism.css';
import './styles/studio.css';
import './styles/design-system.css';

const NAV: readonly {id:'home'|'play'|'training'|'academy'|'progress'|'library'|'games'|'analysis'|'review';icon:ChessyIconName}[]=[
 {id:'home',icon:'home'}, {id:'play',icon:'play'}, {id:'training',icon:'challenges'}, {id:'academy',icon:'academy'}, {id:'progress',icon:'progress'}, {id:'library',icon:'library'}, {id:'games',icon:'games'}, {id:'analysis',icon:'analysis'}, {id:'review',icon:'review'}
];
const MOBILE_NAV = NAV.slice(0,5);

class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error,info:ErrorInfo){console.error('Chessy view failed',error,info.componentStack);}
 render(){return this.state.failed?<div className="panel empty-state"><h1>Chessy</h1><p>ES: No pudimos abrir esta vista. Recarga la página.<br/>EN: This view could not load. Reload the page.<br/>PT: Não foi possível abrir esta tela. Recarregue a página.</p><button className="btn primary" aria-label="Reload / Recargar / Recarregar" onClick={()=>window.location.reload()}>↻</button></div>:this.props.children;}
}

function App() {
 const {t,i18n}=useTranslation();const game=useGameStore();const {view,setView,setupMode}=game;
 const storageWarning=useLearningStore(s=>s.storageWarning);const [mobileMenu,setMobileMenu]=useState(false);const main=useRef<HTMLElement>(null);const sidebar=useRef<HTMLElement>(null);
 const lang=locale(i18n.resolvedLanguage);
 useEffect(()=>{
  const media=window.matchMedia('(max-width: 760px)');
  const sync=()=>{if(sidebar.current)sidebar.current.inert=media.matches&&!mobileMenu;};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&mobileMenu){setMobileMenu(false);document.querySelector<HTMLButtonElement>('.mobile-menu')?.focus();}};
  sync();media.addEventListener('change',sync);window.addEventListener('keydown',escape);
  return()=>{media.removeEventListener('change',sync);window.removeEventListener('keydown',escape);};
 },[mobileMenu]);
 useEffect(()=>{document.documentElement.lang=lang;document.title=`Chessy · ${t(`studio.${view}`)}`;},[lang,t,view]);
 useEffect(()=>{
  const sync=()=>{const id=window.location.hash.replace(/^#\/?/,'').split('/')[0];const found=NAV.find(item=>item.id===id);if(found)useGameStore.getState().setView(found.id);};
  sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);
 },[]);
 useEffect(()=>{setMobileMenu(false);main.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});},[view]);
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{if(view!=='play'||event.ctrlKey||event.metaKey||event.altKey)return;const target=event.target as HTMLElement|null;if(target?.isContentEditable||target?.closest('input,textarea,select,[role="dialog"]'))return;if(event.key==='Escape'&&setupMode)game.setSetupMode(false);};
  window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[view,setupMode,game]);
 const navigate=(id:typeof NAV[number]['id'])=>{setView(id);window.location.hash=`/${id}`;};
 const renderPlay=()=> <div className="view-enter"><SectionHeading eyebrow={t('studio.play')} title={t('studio.playTitle')} subtitle={t('studio.playSubtitle')}/><div className={`play-layout ${setupMode?'setup-layout':''}`}>
  <div className="play-board-area"><div className="play-board-frame"><ChessBoard/></div>{!setupMode&&<><MoveEntry disabled={game.isGameOver||game.isAIThinking} onMove={move=>game.makeMove(move.slice(0,2),move.slice(2,4),move[4])}/><GameFiles/></>}</div>
  <div className="play-controls">{setupMode?<BoardSetupPanel/>:<><AIOpponent onStartGame={game.startAIGame} isPlaying={game.isAIGame} soundEnabled={game.soundEnabled} onToggleSound={game.toggleSound}/><GameControls/></>}</div>
  {!setupMode&&<div className="play-details"><MoveHistory/><details className="panel"><summary>{t('studio.analysis')}</summary><CoachInsights/><ChessGlossary/></details><details className="panel"><summary>{t('theme.title')}</summary><ThemeCustomizer/></details></div>}
 </div></div>;
 return <div className="studio-app"><a className="skip-link" href="#main-content">{t('studio.skip')}</a>
  {mobileMenu&&<button className="nav-scrim" aria-label={t('studio.close')} onClick={()=>setMobileMenu(false)}/>}
  <aside ref={sidebar} id="chessy-navigation" className={`sidebar ${mobileMenu?'is-open':''}`}><a className="brand" href="#/home" onClick={()=>navigate('home')} aria-label="Chessy"><span className="brand-symbol"><ChessyIcon name="achievement" size={30}/></span><span>chessy<span className="brand-period">.</span></span></a><p className="sidebar-caption">{t('studio.workspace')}</p>
   <nav aria-label={t('studio.navLabel')}>{NAV.map((item,index)=> <div key={item.id}>{index===6&&<p className="sidebar-caption secondary-caption">{t('studio.tools')}</p>}<a href={`#/${item.id}`} onClick={()=>navigate(item.id)} className={`nav-link ${view===item.id?'active':''}`} aria-current={view===item.id?'page':undefined}><ChessyIcon name={item.icon} size={20} filled={view===item.id}/><span>{t(`studio.${item.id}`)}</span>{view===item.id&&<span className="nav-indicator"/>}</a></div>)}</nav>
   <div className="sidebar-bottom"><ChessyIcon name="shield" size={20}/><p>{t('studio.local')}</p><a href="https://github.com/BernydotJar/chessy" target="_blank" rel="noreferrer">GitHub <ChessyIcon className="external-arrow" name="arrow" size={14}/></a></div>
  </aside>
  <div className="main-shell"><header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={()=>setMobileMenu(m=>!m)} aria-label={t(mobileMenu?'studio.close':'studio.menu')} aria-controls="chessy-navigation" aria-expanded={mobileMenu}><ChessyIcon name={mobileMenu?'close':'menu'} size={22}/></button><span className="breadcrumb">Chessy <span>/</span> {t(`studio.${view}`)}</span></div><div className="topbar-actions"><ThemeCustomizer compact/><LanguageSwitcher/></div></header>
   <main id="main-content" ref={main} tabIndex={-1} className="main-content">{storageWarning&&<div className="storage-warning" role="status">{t('studio.storageWarning')} <button className="text-button" onClick={()=>navigate('progress')}>{t('studio.backup')}</button></div>}<ErrorBoundary key={view}>{view==='home'&&<HomeView/>}{view==='academy'&&<AcademyView/>}{view==='training'&&<ChallengeView/>}{view==='progress'&&<ProgressView/>}{view==='library'&&<LibraryView/>}{view==='play'&&renderPlay()}{view==='games'&&<GamesHub/>}{view==='review'&&<ReviewView/>}{view==='analysis'&&<AnalysisView/>}</ErrorBoundary></main>
   <footer className="studio-footer"><span><ChessyIcon name="achievement" size={16}/> Chessy</span><p>{t('studio.footer')}</p><span>ES / EN / PT</span></footer>
  </div>
  <nav className={`mobile-bottom-nav ${view==='play'||view==='training'?'mobile-bottom-nav--board':''}`} aria-label={t('studio.navLabel')}>{MOBILE_NAV.map(item=><a key={item.id} href={`#/${item.id}`} onClick={()=>navigate(item.id)} className={view===item.id?'active':''} aria-current={view===item.id?'page':undefined}><ChessyIcon name={item.icon} size={21} filled={view===item.id}/><span>{t(`studio.${item.id}`)}</span></a>)}</nav>
 </div>;
}
export default App;
