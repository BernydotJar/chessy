const CACHE='chessy-mobile-v1-20260906';
const CORE=['/','/index.html','/manifest.webmanifest','/chess-icon.svg','/chess-icon-maskable.svg','/stockfish.js','/art/forest-study.svg','/art/ivory-study.svg','/art/night-study.svg'];

async function cacheBuiltShell(cache){
  const response=await fetch('/',{cache:'no-store'});
  if(!response.ok)throw new Error(`shell ${response.status}`);
  const text=await response.clone().text();
  await cache.put('/index.html',response.clone());
  await cache.put('/',response);
  const urls=[...text.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match=>match[1]);
  await Promise.all([...new Set(urls)].map(async url=>{const asset=await fetch(url,{cache:'no-store'});if(asset.ok)await cache.put(url,asset);}));
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.all(CORE.map(async url=>{try{const response=await fetch(url,{cache:'no-store'});if(response.ok)await cache.put(url,response);}catch{/* optional during install */}}));
    try{await cacheBuiltShell(cache);}catch{/* runtime caching will complete the shell */}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('chessy-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||url.pathname==='/health')return;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request);
        if(response.ok){const cache=await caches.open(CACHE);await cache.put('/index.html',response.clone());await cache.put('/',response.clone());}
        return response;
      }catch{
        return (await caches.match('/index.html'))||(await caches.match('/'))||Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(request);
    if(cached)return cached;
    try{
      const response=await fetch(request);
      if(response.ok&&url.protocol==='https:'||response.ok&&self.location.hostname==='localhost'||response.ok&&self.location.hostname==='127.0.0.1'){
        const cache=await caches.open(CACHE);await cache.put(request,response.clone());
      }
      return response;
    }catch{return cached||Response.error();}
  })());
});
