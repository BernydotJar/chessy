/* Chessy release notices — shared by the PWA and the 1:1 classroom. */
(()=>{
  'use strict';
  const current=document.querySelector('meta[name="chessy-ui-version"]')?.content||'';
  if(!/^[a-f0-9]{24}$/.test(current))return; // Dev and unversioned previews do not show production notices.
  const CHECK_INTERVAL_MS=90_000;
  let pending='',dismissed='',busy=false;
  let banner=null,button=null,description=null;

  function activeClass(){
    return location.pathname.startsWith('/aula/')&&!!document.querySelector('#board');
  }

  function refreshAction(){
    if(!banner)return;
    const inClass=activeClass();
    button.disabled=inClass;
    button.textContent=inClass?'Al terminar la clase':'Actualizar';
    description.textContent=inClass
      ?'Tu clase continúa sin interrupciones. Al terminar, actualiza para ver las mejoras.'
      :'Puedes actualizar ahora para ver las últimas mejoras.';
  }

  function hide(){
    if(banner)banner.remove();
    banner=null;button=null;description=null;
  }

  async function doUpdate(){
    if(activeClass()){refreshAction();return;}
    button.disabled=true;
    button.textContent='Preparando…';
    try{
      // A new service worker must release the old cached shell/assets.
      // The classroom also uses a build-specific asset query string.
      const reg=await navigator.serviceWorker?.getRegistration('/');
      if(reg)await reg.update();
    }catch{/* Network-first navigation and versioned assets still work. */}
    location.reload();
  }

  function show(version){
    if(banner){refreshAction();return;}
    banner=document.createElement('section');
    banner.id='chessy-update-banner';
    banner.className='chessy-update-banner';
    banner.setAttribute('role','status');
    banner.setAttribute('aria-live','polite');
    const heading=document.createElement('strong');
    heading.textContent='Nueva versión de Chessy';
    description=document.createElement('p');
    const controls=document.createElement('div');
    controls.className='chessy-update-actions';
    const later=document.createElement('button');
    later.type='button';
    later.textContent='Más tarde';
    later.className='chessy-update-later';
    later.addEventListener('click',()=>{dismissed=version;hide();});
    button=document.createElement('button');
    button.type='button';
    button.className='chessy-update-now';
    button.addEventListener('click',()=>void doUpdate());
    controls.append(later,button);
    banner.append(heading,description,controls);
    document.body.append(banner);
    refreshAction();
  }

  async function check(){
    if(busy||!navigator.onLine)return;
    busy=true;
    try{
      // /health is excluded from the app service worker and explicitly no-store.
      const res=await fetch('/health',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(6500)});
      if(!res.ok)return;
      const data=await res.json();
      const latest=data?.ui_version;
      if(data?.product!=='chessy'||typeof latest!=='string'||!/^[a-f0-9]{24}$/.test(latest))return;
      if(latest!==current){
        pending=latest;
        if(latest!==dismissed)show(latest);
      }else{
        pending='';
        hide();
      }
    }catch{/* Offline users continue their current session. */}
    finally{busy=false;}
    if(pending)refreshAction();
  }

  const start=()=>{
    void check();
    const interval=setInterval(()=>{if(!document.hidden)void check();},CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check();});
    window.addEventListener('focus',()=>void check());
    window.addEventListener('online',()=>void check());
    window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});
    // When the teacher ends the session, enable the already-visible update button.
    const app=document.querySelector('#app');
    if(app)new MutationObserver(()=>{if(pending&&banner)refreshAction();})
      .observe(app,{childList:true}); // No observation of board-piece changes.
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
