const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const APP_PORT = 4323;
const TARGET_PORT = 4324;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async()=>{
  const app = spawn(process.execPath, ['scripts/serve-production.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(APP_PORT), HOST: '127.0.0.1', CHESSY_RELEASE_SHA: 'popup-opener-test' }, stdio: ['ignore','pipe','pipe'] });
  let appErr=''; app.stderr.on('data', d => appErr += d);
  const target = http.createServer((_req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>OAuth target</title><p>target</p>');});
  await new Promise((resolve,reject)=>target.listen(TARGET_PORT,'127.0.0.1',err=>err?reject(err):resolve()));
  let browser;
  try {
    let ready=false; for(let i=0;i<60;i++){try{const r=await fetch(`http://127.0.0.1:${APP_PORT}/health`);if(r.ok){ready=true;break;}}catch{}await sleep(100);} assert.ok(ready,appErr);
    const root=await fetch(`http://127.0.0.1:${APP_PORT}/`);
    assert.equal(root.headers.get('cross-origin-opener-policy'),'same-origin-allow-popups');
    assert.equal(root.headers.get('x-frame-options'),'DENY');
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext();
    const page=await context.newPage();
    await page.goto(`http://127.0.0.1:${APP_PORT}/`,{waitUntil:'domcontentloaded'});
    await page.evaluate((url)=>{const b=document.createElement('button');b.id='oauth-opener-test';b.textContent='Open';b.style.cssText='position:fixed;right:8px;bottom:8px;z-index:2147483647;width:120px;height:48px';b.onclick=()=>window.open(url,'oauth-test','popup,width=480,height=640');document.body.appendChild(b);},`http://127.0.0.1:${TARGET_PORT}/`);
    const [popup]=await Promise.all([
      page.waitForEvent('popup',{timeout:10000}),
      page.click('#oauth-opener-test'),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    assert.equal(await popup.evaluate(()=>Boolean(window.opener)),true,'cross-origin popup lost window.opener');
    const result={coop:'same-origin-allow-popups',xFrameOptions:'DENY',crossOriginPopupOpener:'PASS'};
    fs.mkdirSync(path.join(ROOT,'progress/evidence/release'),{recursive:true});
    fs.writeFileSync(path.join(ROOT,'progress/evidence/release/popup-opener-verification.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
    await context.close();
  } finally {
    if(browser)await browser.close().catch(()=>{});
    target.close();
    app.kill('SIGTERM');
  }
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
