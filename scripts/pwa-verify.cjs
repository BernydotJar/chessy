const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
const ROOT=path.resolve(__dirname,'..'),PORT='4318',ORIGIN=`http://127.0.0.1:${PORT}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const server=spawn(process.execPath,['scripts/serve-production.mjs'],{cwd:ROOT,env:{...process.env,PORT,HOST:'127.0.0.1',CHESSY_RELEASE_SHA:'pwa-verification'},stdio:['ignore','pipe','pipe']});
 let stderr='';server.stderr.on('data',d=>stderr+=d);
 try{
  let ready=false;for(let i=0;i<40;i++){try{const r=await fetch(`${ORIGIN}/health`);if(r.ok){ready=true;break;}}catch{}await sleep(100);}assert.ok(ready,`production server not ready ${stderr}`);
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'es-GT'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${ORIGIN}/#/home`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>navigator.serviceWorker?.controller!==null||false,{timeout:8000}).catch(async()=>{await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>navigator.serviceWorker?.controller!==null,{timeout:8000});});
  const manifest=await (await page.request.get(`${ORIGIN}/manifest.webmanifest`)).json();assert.equal(manifest.display,'standalone');assert.ok(manifest.icons.some(i=>i.sizes==='any'&&i.type==='image/svg+xml'&&i.purpose==='any'));assert.ok(manifest.icons.some(i=>i.sizes==='any'&&i.type==='image/svg+xml'&&i.purpose==='maskable'));
  const cached=await page.evaluate(async()=>({shell:!!await caches.match('/index.html'),stockfish:!!await caches.match('/stockfish.js')}));assert.deepEqual(cached,{shell:true,stockfish:true});
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.studio-app').waitFor();
  await page.goto(`${ORIGIN}/#/academy`,{waitUntil:'domcontentloaded'});await page.locator('.track-grid').waitFor();
  await page.goto(`${ORIGIN}/#/training`,{waitUntil:'domcontentloaded'});await page.locator('.challenge-layout').waitFor();
  const uci=await page.evaluate(()=>new Promise((resolve,reject)=>{const worker=new Worker('/stockfish.js');const timer=setTimeout(()=>{worker.terminate();reject(new Error('uci timeout'));},6000);worker.onmessage=e=>{if(String(e.data).includes('uciok')){clearTimeout(timer);worker.terminate();resolve('uciok');}};worker.onerror=()=>{clearTimeout(timer);reject(new Error('worker error'));};worker.postMessage('uci');}));assert.equal(uci,'uciok');
  assert.deepEqual(errors,[]);await context.setOffline(false);await context.close();await browser.close();
  const result={pwa:'PASS',offlineReload:'PASS',offlineAcademy:'PASS',offlineChallenges:'PASS',offlineStockfish:'PASS'};await fs.mkdir(path.join(ROOT,'progress/evidence/browser'),{recursive:true});await fs.writeFile(path.join(ROOT,'progress/evidence/browser/pwa-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{server.kill('SIGTERM');}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
