const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const PORT = '4321';
const ORIGIN = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async()=>{
 const email=`chessy-ui-e2e-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@example.com`;
 const password=`C!${crypto.randomBytes(15).toString('base64url')}9a`;
 const server=spawn(process.execPath,['scripts/serve-production.mjs'],{cwd:ROOT,env:{...process.env,PORT,HOST:'127.0.0.1',CHESSY_RELEASE_SHA:'auth-ui-live'},stdio:['ignore','pipe','pipe']});
 let stderr='';server.stderr.on('data',d=>stderr+=d);
 let browser,context;let accountMayExist=false;
 async function cleanupAccount(){if(!accountMayExist)return;try{const sign=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});if(!sign.ok)return;const j=await sign.json();if(!j.idToken)return;if(j.localId)await fetch(`https://firestore.googleapis.com/v1/projects/chessy-pwa-2026/databases/(default)/documents/users/${encodeURIComponent(j.localId)}/progress/current`,{method:'DELETE',headers:{authorization:`Bearer ${j.idToken}`}}).catch(()=>{});await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:j.idToken})});}catch{}}
 try{
  let ready=false;for(let i=0;i<50;i++){try{if((await fetch(`${ORIGIN}/health`)).ok){ready=true;break;}}catch{}await sleep(100);}assert.ok(ready,stderr);
  browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:390,height:844},locale:'es-GT'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${ORIGIN}/#/account`,{waitUntil:'networkidle'});await page.locator('.account-form').waitFor({timeout:10000});
  const localBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('chessy-learning-v1')||'{"version":2,"solved":[],"lessons":[],"days":[],"mistakes":0,"review":[]}'));
  const readLocal=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('chessy-learning-v1')||'{"version":2,"solved":[],"lessons":[],"days":[],"mistakes":0,"review":[]}'));
  await page.getByRole('button',{name:'Crear cuenta',exact:true}).first().click();
  await page.getByLabel('Nombre visible').fill('Chessy E2E');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.locator('form.account-form').getByRole('button',{name:'Crear cuenta',exact:true}).click();
  await page.locator('.account-profile').waitFor({timeout:10000});accountMayExist=true;await page.locator('.sync-status--synced').waitFor({timeout:12000});assert.match(await page.locator('.account-profile').innerText(),new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.deepEqual(await readLocal(),localBefore);
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await page.locator('.account-form').waitFor({timeout:10000});
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).first().click();
  await page.getByLabel('Correo electrónico').fill(email);await page.getByLabel('Contraseña').fill(password);await page.locator('form.account-form').getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await page.locator('.account-profile').waitFor({timeout:10000});await page.locator('.sync-status--synced').waitFor({timeout:12000});assert.deepEqual(await readLocal(),localBefore);
  await page.getByRole('button',{name:'Eliminar mi cuenta',exact:true}).click();await page.getByRole('button',{name:'Sí, eliminar cuenta',exact:true}).click();await page.locator('.account-form').waitFor({timeout:10000});accountMayExist=false;
  assert.deepEqual(await readLocal(),localBefore);assert.deepEqual(errors,[]);
  const result={project:'chessy-pwa-2026',viewport:390,createUi:'PASS',signOutUi:'PASS',signInUi:'PASS',deleteUi:'PASS',localProgressPreserved:'PASS',pageErrors:[]};
  fs.mkdirSync(path.join(ROOT,'progress/evidence/release'),{recursive:true});fs.writeFileSync(path.join(ROOT,'progress/evidence/release/auth-ui-live-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 } finally {await cleanupAccount();if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
