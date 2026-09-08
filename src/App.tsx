import { Component, ErrorInfo, ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GamesHub } from './components/GamesHub';
import { ReviewView } from './components/ReviewView';
import { AnalysisView } from './components/AnalysisView';
import { HomeView } from './components/studio/HomeView';
import { AcademyView } from './components/studio/AcademyView';
import { ChallengeView } from './components/studio/ChallengeView';
import { ProgressView } from './components/studio/ProgressView';
import { LibraryView } from './components/studio/LibraryView';
import { useGameStore, type GameView } from './store/gameStore';
import { useLearningStore } from './learning/store';
import { locale } from './learning/types';
import { ChessyIcon, type ChessyIconName } from './design/icons';
import { ChessyMark } from './design/ChessyMark';
import { OfflineStatus } from './components/OfflineStatus';
import { AccountView } from './components/studio/AccountView';
import { SettingsView } from './components/studio/SettingsView';
import { ThemesView } from './components/studio/ThemesView';
import { PlayView } from './components/studio/PlayView';
import { useAuthStore } from './auth/store';
import { useProgressSyncStore } from './sync/store';
import { useAnalyticsStore } from './analytics/store';
import './styles/glassmorphism.css';
import './styles/studio.css';
import './styles/design-system.css';

const NAV: readonly {id:'home'|'play'|'training'|'academy'|'progress'|'library'|'games'|'analysis'|'review'|'account'|'settings';icon:ChessyIconName}[]=[
 {id:'home',icon:'home'}, {id:'play',icon:'play'}, {id:'training',icon:'challenges'}, {id:'academy',icon:'academy'}, {id:'progress',icon:'progress'}, {id:'library',icon:'library'}, {id:'games',icon:'games'}, {id:'analysis',icon:'analysis'}, {id:'review',icon:'review'}, {id:'account',icon:'profile'}, {id:'settings',icon:'settings'}
];
const ROUTABLE_VIEWS = new Set<GameView>([...NAV.map(item => item.id), 'themes']);
const MOBILE_NAV = NAV.slice(0,5);

class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error,info:ErrorInfo){console.error('Chessy view failed',error,info.componentStack);}
 render(){return this.state.failed?<div className="panel empty-state"><h1>Chessy</h1><p>ES: No pudimos abrir esta vista. Recarga la página.<br/>EN: This view could not load. Reload the page.<br/>PT: Não foi possível abrir esta tela. Recarregue a página.</p><button className="btn primary" aria-label="Reload / Recargar / Recarregar" onClick={()=>window.location.reload()}>↻</button></div>:this.props.children;}
}

function App() {
 const {t,i18n}=useTranslation();const game=useGameStore();const {view,setView,setupMode}=game;
 const storageWarning=useLearningStore(s=>s.storageWarning);const authStatus=useAuthStore(s=>s.status);const initializeAuth=useAuthStore(s=>s.initialize);const initializeProgressSync=useProgressSyncStore(s=>s.initialize);const progressSyncStatus=useProgressSyncStore(s=>s.status);const initializeAnalytics=useAnalyticsStore(s=>s.initialize);const analyticsStatus=useAnalyticsStore(s=>s.status);const track=useAnalyticsStore(s=>s.track);const [mobileMenu,setMobileMenu]=useState(false);const main=useRef<HTMLElement>(null);const sidebar=useRef<HTMLElement>(null);const lastSyncTracked=useRef('');
 const lang=locale(i18n.resolvedLanguage);
 useEffect(()=>{void initializeProgressSync();void initializeAuth();void initializeAnalytics();},[initializeAuth,initializeProgressSync,initializeAnalytics]);
 useEffect(()=>{
  const media=window.matchMedia('(max-width: 760px)');
  const sync=()=>{if(sidebar.current)sidebar.current.inert=media.matches&&!mobileMenu;};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&mobileMenu){setMobileMenu(false);document.querySelector<HTMLButtonElement>('.mobile-menu')?.focus();}};
  sync();media.addEventListener('change',sync);window.addEventListener('keydown',escape);
  return()=>{media.removeEventListener('change',sync);window.removeEventListener('keydown',escape);};
 },[mobileMenu]);
 useEffect(()=>{document.documentElement.lang=lang;document.title=`Chessy · ${t(`studio.${view}`)}`;},[lang,t,view]);
 useEffect(()=>{if(analyticsStatus==='ready')track('screen_view',{screen_name:view});},[analyticsStatus,track,view]);
 useEffect(()=>{if(authStatus!=='signed-in'||!['synced','pending','error'].includes(progressSyncStatus)||lastSyncTracked.current===progressSyncStatus)return;lastSyncTracked.current=progressSyncStatus;track('progress_sync_result',{result:progressSyncStatus});},[authStatus,progressSyncStatus,track]);
 useEffect(()=>{
  const sync=()=>{const id=window.location.hash.replace(/^#\/?/,'').split('/')[0] as GameView;if(ROUTABLE_VIEWS.has(id))useGameStore.getState().setView(id);};
  sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);
 },[]);
 useEffect(()=>{setMobileMenu(false);main.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});},[view]);
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{if(view!=='play'||event.ctrlKey||event.metaKey||event.altKey)return;const target=event.target as HTMLElement|null;if(target?.isContentEditable||target?.closest('input,textarea,select,[role="dialog"]'))return;if(event.key==='Escape'&&setupMode)game.setSetupMode(false);};
  window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[view,setupMode,game]);
 const navigate=(id:GameView)=>{if(id==='analysis')game.setAnalysisTarget(null);setView(id);window.location.hash=`/${id}`;};
 const boardFocused=view==='play'||view==='training'||view==='review'||view==='analysis';
 return <div className={`studio-app ${boardFocused?'board-focus':''}`}><a className="skip-link" href="#main-content">{t('studio.skip')}</a>
  {mobileMenu&&<button className="nav-scrim" aria-label={t('studio.close')} onClick={()=>setMobileMenu(false)}/>}
  <aside ref={sidebar} id="chessy-navigation" className={`sidebar ${mobileMenu?'is-open':''}`}><a className="brand" href="#/home" onClick={()=>navigate('home')} aria-label="Chessy"><span className="brand-symbol"><ChessyMark size={30}/></span><span>chessy<span className="brand-period">.</span></span></a><p className="sidebar-caption">{t('studio.workspace')}</p>
   <nav aria-label={t('studio.navLabel')}>{NAV.map((item,index)=> <div key={item.id}>{index===6&&<p className="sidebar-caption secondary-caption">{t('studio.tools')}</p>}<a href={`#/${item.id}`} onClick={()=>navigate(item.id)} className={`nav-link ${view===item.id?'active':''}`} aria-current={view===item.id?'page':undefined}><ChessyIcon name={item.icon} size={20} filled={view===item.id}/><span>{t(`studio.${item.id}`)}</span>{view===item.id&&<span className="nav-indicator"/>}</a></div>)}</nav>
   <div className="sidebar-bottom"><ChessyIcon name="shield" size={20}/><p>{t('studio.local')}</p><a href="https://github.com/BernydotJar/chessy" target="_blank" rel="noreferrer">GitHub <ChessyIcon className="external-arrow" name="arrow" size={14}/></a></div>
  </aside>
  <div className="main-shell"><header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={()=>setMobileMenu(m=>!m)} aria-label={t(mobileMenu?'studio.close':'studio.menu')} aria-controls="chessy-navigation" aria-expanded={mobileMenu}><ChessyIcon name={mobileMenu?'close':'menu'} size={22}/></button>{boardFocused&&<a className="mobile-focus-home icon-button" href="#/home" onClick={()=>navigate('home')} aria-label={t('studio.home')}><ChessyIcon name="home" size={20}/></a>}<span className="breadcrumb">Chessy <span>/</span> {t(`studio.${view}`)}</span></div><OfflineStatus/><div className="topbar-actions"><a className={`account-launch icon-button ${view==='account'?'active':''}`} href="#/account" onClick={()=>navigate('account')} aria-label={t('studio.account')} title={t('studio.account')}><ChessyIcon name="profile" size={20} filled={authStatus==='signed-in'}/><span className={`account-status-dot ${authStatus}`}/></a><a className={`settings-launch icon-button ${view==='settings'||view==='themes'?'active':''}`} href="#/settings" onClick={()=>navigate('settings')} aria-label={t('studio.settings')} title={t('studio.settings')}><ChessyIcon name="settings" size={20} filled={view==='settings'||view==='themes'}/></a></div></header>
   <main id="main-content" ref={main} tabIndex={-1} className="main-content">{storageWarning&&<div className="storage-warning" role="status">{t('studio.storageWarning')} <button className="text-button" onClick={()=>navigate('progress')}>{t('studio.backup')}</button></div>}<ErrorBoundary key={view}>{view==='home'&&<HomeView/>}{view==='academy'&&<AcademyView/>}{view==='training'&&<ChallengeView/>}{view==='progress'&&<ProgressView/>}{view==='library'&&<LibraryView/>}{view==='play'&&<PlayView/>}{view==='games'&&<GamesHub/>}{view==='review'&&<ReviewView/>}{view==='analysis'&&<AnalysisView/>}{view==='account'&&<AccountView/>}{view==='settings'&&<SettingsView/>}{view==='themes'&&<ThemesView/>}</ErrorBoundary></main>
   <footer className="studio-footer"><span><ChessyMark size={16}/> Chessy</span><p>{t('studio.footer')}</p><span>ES / EN / PT</span></footer>
  </div>
  <nav className={`mobile-bottom-nav ${boardFocused?'mobile-bottom-nav--board':''}`} aria-label={t('studio.navLabel')}>{MOBILE_NAV.map(item=><a key={item.id} href={`#/${item.id}`} onClick={()=>navigate(item.id)} className={view===item.id?'active':''} aria-current={view===item.id?'page':undefined}><ChessyIcon name={item.icon} size={21} filled={view===item.id}/><span>{t(`studio.${item.id}`)}</span></a>)}</nav>
 </div>;
}
export default App;
