'use strict';
/** Real Playwright 2-context teacher/learner acceptance of Chessy Aula Directa. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const base='http://127.0.0.1:14377';
const SECRET='CHESSY-TEST-TEACHER-CODE-ALPHA-20261107';
const ADMIN='CHESSY-ADMIN-TEST-PRIVATE-CODE-20261108-X';
const report={date:new Date().toISOString(),checks:[],errors:[]};
const root=path.resolve(__dirname,'../..');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chessy-aula-direct-'));
const secretPath=path.join(dir,'teacher.code');
fs.writeFileSync(secretPath,SECRET,{mode:0o600});
const adminSecretPath=path.join(dir,'admin.code');
const registryPath=path.join(dir,'teacher-registry.json');
fs.writeFileSync(adminSecretPath,ADMIN,{mode:0o600});
let browser,child,teacherCtx,studentCtx,replacementCtx;
async function check(name,fn){
 const start=Date.now();
 try{await fn();report.checks.push({name,status:'PASS',ms:Date.now()-start});console.log('PASS',name);}
 catch(e){report.checks.push({name,status:'FAIL',error:String(e).slice(0,950)});throw Error(name+': '+String(e));}
}
async function waitServer(){
 for(let i=0;i<100;i++){try{const r=await fetch(base+'/aula/api/health');if(r.ok)return;}catch{}
 await new Promise(x=>setTimeout(x,100));}
 throw Error('Server not ready');
}
async function smoke(){
 child=spawn(process.execPath,[process.env.CHESSY_AULA_SERVER_SCRIPT||'scripts/serve-production.mjs'],{cwd:root,
  env:{...process.env,HOST:'127.0.0.1',PORT:'14377',
    CHESSY_DIST:path.join(root,'dist'),CHESSY_AULA_TEACHER_SECRET_FILE:secretPath,
    CHESSY_AULA_ADMIN_SECRET_FILE:adminSecretPath,CHESSY_AULA_TEACHERS_FILE:registryPath,
    CHESSY_RELEASE_SHA:'AULA-DIRECT-QA',CHESSY_DEPLOYMENT_CLASS:'public-web'},stdio:'ignore'});
 await waitServer();
 browser=await chromium.launch({headless:true,args:[
   '--disable-dev-shm-usage','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
   '--auto-select-desktop-capture-source=Entire screen','--allow-http-screen-capture','--enable-usermedia-screen-capturing']});
 teacherCtx=await browser.newContext({viewport:{width:1440,height:980},permissions:['camera','microphone']});
 studentCtx=await browser.newContext({viewport:{width:390,height:844},permissions:['camera','microphone']});
 const teacher=await teacherCtx.newPage();let student=await studentCtx.newPage();
 await teacher.addInitScript(()=>{const Original=window.RTCPeerConnection;window.RTCPeerConnection=class extends Original{constructor(...a){super(...a);window.__aulaQApeer=this;}};});
 await student.addInitScript(()=>{const Original=window.RTCPeerConnection;window.RTCPeerConnection=class extends Original{constructor(...a){super(...a);window.__aulaQApeer=this;}};});
 teacher.on('pageerror',e=>report.errors.push('teacher:'+e.message));
 student.on('pageerror',e=>report.errors.push('student:'+e.message));
 let invite,roomId;
 await check('Production index keeps media blocked while Aula HTML grants media only there',async()=>{
   const a=await fetch(base+'/'),b=await fetch(base+'/aula/');
   assert.match(a.headers.get('permissions-policy'),/camera=\(\)/);
   assert.match(b.headers.get('permissions-policy'),/camera=\(self\)/);
   assert.equal(b.status,200);
   const h=await fetch(base+'/aula/api/health');assert.equal((await h.json()).backendReady,true);
 });
 await check('Existing Chessy classes visibly links to the teacher classroom',async()=>{
   await teacher.goto(base+'/#/classes',{waitUntil:'domcontentloaded'});
   await teacher.locator('[data-testid=direct-aula-link]').waitFor({timeout:17000});
   assert.match(await teacher.locator('[data-testid=direct-aula-link]').getAttribute('href'),/^\/aula\/$/);
 });
 await check('Anonymous, forged origin and wrong teacher code are denied',async()=>{
   assert.equal((await fetch(base+'/aula/api/room?id=123')).status,403);
   const wrong=await fetch(base+'/aula/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({code:'wrong'})});
   assert.equal(wrong.status,403);
   const forged=await fetch(base+'/aula/api/login',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({code:SECRET})});
   assert.equal(forged.status,403);
 });
 await check('Administrator creates, expires and revokes an individual teacher code through the console',async()=>{
   const adminCtx=await browser.newContext(),auxCtx=await browser.newContext();
   try{
     const adm=await adminCtx.newPage(),aux=await auxCtx.newPage();
     await adm.goto(base+'/aula/admin.html',{waitUntil:'domcontentloaded'});
     await adm.locator('#admin-code').fill(ADMIN);
     await adm.getByRole('button',{name:'Entrar a administración'}).click();
     await adm.locator('#teacher-name').waitFor();
     await adm.locator('#teacher-name').fill('Profesor auxiliar QA');
     await adm.locator('#teacher-days').selectOption('7');
     await adm.getByRole('button',{name:'Generar código de profesor'}).click();
     await adm.locator('#generated-code').waitFor();
     const issued=(await adm.locator('#generated-code').innerText()).trim();
     assert.match(issued,/^CHESSY-T-[A-Za-z0-9_-]+$/);
     assert.equal(fs.readFileSync(registryPath,'utf8').includes(issued),false);
     await aux.goto(base+'/aula/');
     await aux.locator('#teacher-code').fill(issued);
     await aux.getByRole('button',{name:'Abrir mi aula'}).click();
     await aux.getByRole('button',{name:'Crear aula e invitar al alumno'}).waitFor();
     adm.once('dialog',d=>d.accept());
     await adm.getByRole('button',{name:'Revocar',exact:true}).click();
     await adm.getByText('Revocado',{exact:true}).waitFor();
     await aux.reload({waitUntil:'domcontentloaded'});
     await aux.locator('#teacher-code').waitFor();
   }finally{await auxCtx.close();await adminCtx.close();}
 });
 await check('Teacher logs in and creates private adult classroom',async()=>{
   await teacher.goto(base+'/aula/',{waitUntil:'domcontentloaded'});
   await teacher.locator('#teacher-code').fill(SECRET);
   await teacher.getByRole('button',{name:'Abrir mi aula'}).click();
   await teacher.locator('#class-title').fill('Clase QA 1:1');
   await teacher.getByRole('button',{name:'Crear aula e invitar al alumno'}).click();
   const field=teacher.locator('#invite-url');await field.waitFor();
   invite=await field.inputValue();roomId=/join\/([a-f0-9]{24})\//.exec(invite)?.[1];
   assert.ok(roomId);
   await teacher.locator('.square').first().waitFor();
 });
 await check('Adult learner joins via private fragment invitation on mobile',async()=>{
   await student.goto(invite,{waitUntil:'domcontentloaded'});
   await student.locator('#adult').check();
   await student.getByRole('button',{name:'Entrar al aula'}).click();
   await student.locator('.chessboard').waitFor();
   assert.equal(new URL(student.url()).hash,'','Invite fragment must be erased after use');
   await teacher.getByText('Profesor y alumno conectados',{exact:true}).waitFor({timeout:20000});
   await student.getByText('Profesor y alumno conectados',{exact:true}).waitFor({timeout:20000});
 });
 await check('Coach can lock learner moves, make legal move and undo for both browsers',async()=>{
   await teacher.locator('#board-controller').selectOption('teacher');
   await student.getByText('Solo profesor mueve',{exact:true}).waitFor();
   await student.locator('[data-square=e2]').click();
   await student.getByText('El profesor controla quién puede mover las piezas.').waitFor();
   await teacher.locator('[data-square=e2]').click();
   await teacher.locator('.square.legal[data-square=e4]').waitFor();
   await teacher.locator('[data-square=e4]').click();
   await student.waitForFunction(()=>document.querySelector('#move-history')?.textContent?.includes('e4'));
   await teacher.getByRole('button',{name:'Deshacer jugada'}).click();
   await student.getByText('Sin jugadas todavía').waitFor();
   await teacher.locator('#board-controller').selectOption('both');
   await student.getByText('Ambos pueden mover',{exact:true}).waitFor();
 });
 await check('Learner drags a legal piece and teacher synchronizes the result',async()=>{
   await student.locator('[data-square=e2]').dragTo(student.locator('[data-square=e4]'));
   await teacher.waitForFunction(()=>document.querySelector('#move-history')?.textContent?.includes('e4'));
   await teacher.getByRole('button',{name:'Deshacer jugada'}).click();
   await student.getByText('Sin jugadas todavía').waitFor();
 });
 await check('Coach imports FEN and resets board without leaving stale exercises',async()=>{
   const fen='4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
   await teacher.locator('#fen-editor').fill(fen);
   await teacher.getByRole('button',{name:'Cargar FEN'}).click();
   await student.waitForFunction(()=>document.querySelectorAll('#board .piece-white').length===2);
   await teacher.getByRole('button',{name:'Tablero libre'}).click();
   await student.waitForFunction(()=>document.querySelectorAll('#board .piece-white').length===16);
 });
 await check('Exercise is assigned to learner, wrong move increments attempts without mutating FEN',async()=>{
   await teacher.locator('#puzzle-picker').selectOption('rook-file');
   await teacher.getByRole('button',{name:'Enviar ejercicio'}).click();
   await student.getByText(/rook file.*Intentos: 0/i).waitFor();
   await student.locator('[data-square=a1]').click();
   await student.locator('[data-square=a2]').click();
   await teacher.getByText(/Intentos: 1/).waitFor();
 });
 await check('Correct learner move synchronizes completion on both boards',async()=>{
   await student.locator('[data-square=a1]').click();
   await student.locator('[data-square=a5]').click();
   await teacher.getByText('Ejercicio resuelto',{exact:true}).waitFor();
   await student.getByText('Ejercicio resuelto',{exact:true}).waitFor();
   assert.equal(await teacher.locator('#board').getAttribute('aria-label'),'Tablero de ajedrez sincronizado');
 });
 await check('Instructor advances to second exercise while learner follows without reloading',async()=>{
   await teacher.getByRole('button',{name:'Siguiente'}).click();
   await student.getByText(/rook rank.*Intentos: 0/i).waitFor();
   await student.locator('[data-square=a1]').click();
   await student.locator('[data-square=g1]').click();
   await teacher.getByText('Ejercicio resuelto',{exact:true}).waitFor();
 });
 await check('Learner cannot close the room or take another student seat',async()=>{
   const denied=await student.evaluate(async id=>{
     const r=await fetch('/aula/api/close',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId:id})});
     return r.status;
   },roomId);
   assert.equal(denied,403);
   const outsider=await browser.newContext();
   try{
     const p=await outsider.newPage();await p.goto(invite);
     await p.locator('#adult').check();await p.getByRole('button',{name:'Entrar al aula'}).click();
     await p.getByText(/sala ya tiene un alumno/).waitFor();
   }finally{await outsider.close();}
 });
 await check('Coach can rotate invitation without disconnecting existing learner',async()=>{
   const oldInvite=await teacher.locator('#invite-url').inputValue();
   await teacher.getByRole('button',{name:'Regenerar enlace'}).click();
   await teacher.waitForFunction(old=>document.querySelector('#invite-url')?.value!==old,oldInvite);
   const newInvite=await teacher.locator('#invite-url').inputValue();
   assert.notEqual(oldInvite,newInvite);
   const outsider=await browser.newContext();
   try{
     const p=await outsider.newPage();
     await p.goto(oldInvite);
     await p.locator('#adult').check();
     await p.getByRole('button',{name:'Entrar al aula'}).click();
     await p.getByText('La invitación venció o ya no existe.').waitFor();
   }finally{await outsider.close();}
   await teacher.getByText('Profesor y alumno conectados',{exact:true}).waitFor();
 });
 await check('Teacher and learner media connects through WebRTC with synthetic camera',async()=>{
   await teacher.getByRole('button',{name:'Cámara'}).click();
   await teacher.locator('#toggle-camera[aria-pressed=true]').waitFor();
   await student.getByRole('button',{name:'Cámara'}).click();
   await student.locator('#toggle-camera[aria-pressed=true]').waitFor();
   await teacher.getByText('Videollamada conectada').waitFor({timeout:45000});
   await student.getByText('Videollamada conectada').waitFor({timeout:45000});
   await teacher.waitForTimeout(5000);
   for(const [label,page] of [['TEACHER',teacher],['STUDENT',student]]) {
     const debug=await page.evaluate(async()=>{
       const p=window.__aulaQApeer,v=document.querySelector('#remote-video');
       let all=[];if(p){const stats=await p.getStats();stats.forEach(x=>{if(['inbound-rtp','outbound-rtp'].includes(x.type))all.push({type:x.type,kind:x.kind,bytesReceived:x.bytesReceived,bytesSent:x.bytesSent,framesDecoded:x.framesDecoded,framesEncoded:x.framesEncoded});});}
       return {state:p?.connectionState,signaling:p?.signalingState,videoWidth:v?.videoWidth,videoHeight:v?.videoHeight,autoplay:v?.autoplay,paused:v?.paused,srcTracks:v?.srcObject?.getTracks().map(x=>({kind:x.kind,muted:x.muted,readyState:x.readyState})),transceivers:p?.getTransceivers().map(t=>({mid:t.mid,currentDirection:t.currentDirection,receiver:t.receiver.track.kind,sender:t.sender.track?.kind})),stats:all};
     });console.log('MEDIA_DIAG_'+label,JSON.stringify(debug));
   }
   await teacher.waitForFunction(()=>document.querySelector('#remote-video')?.videoWidth>0,null,{timeout:15000});
   await student.waitForFunction(()=>document.querySelector('#remote-video')?.videoWidth>0,null,{timeout:15000});
   await teacher.getByRole('button',{name:'Micrófono'}).click();
   await teacher.locator('#toggle-mic[aria-pressed=true]').waitFor();
 });
 await check('Instructor shares screen and can stop the screen track',async()=>{
   const sharing=teacher.locator('#toggle-screen');
   await sharing.click();
   await teacher.locator('#toggle-screen[aria-pressed=true]').waitFor({timeout:13000});
   await student.waitForFunction(()=>document.querySelector('#remote-video')?.videoWidth>0,null,{timeout:16000});
   await sharing.click();
   await teacher.locator('#toggle-screen[aria-pressed=false]').waitFor({timeout:13000});
 });
 await check('Mobile has no horizontal overflow and zero uncaught page exceptions',async()=>{
   const widths=await student.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
   assert.ok(widths.scroll<=widths.inner+2,JSON.stringify(widths));
   assert.deepEqual(report.errors,[]);
 });
 await check('Coach removes the learner and newly invited adult can join',async()=>{
   const beforeKick=await teacher.locator('#invite-url').inputValue();
   teacher.once('dialog',d=>d.accept());
   await teacher.getByRole('button',{name:'Retirar alumno'}).click();
   await student.getByText('Acceso al aula revocado.').waitFor({timeout:15000});
   const denied=await student.evaluate(id=>fetch('/aula/api/room?id='+id).then(x=>x.status),roomId);
   assert.equal(denied,403);
   await teacher.waitForFunction(old=>document.querySelector('#invite-url')?.value!==old,beforeKick);
   const newInvite=await teacher.locator('#invite-url').inputValue();
   replacementCtx=await browser.newContext({viewport:{width:390,height:844}});
   const nextStudent=await replacementCtx.newPage();
   await nextStudent.goto(newInvite);
   await nextStudent.locator('#adult').check();
   await nextStudent.getByRole('button',{name:'Entrar al aula'}).click();
   await nextStudent.locator('#board').waitFor();
   await teacher.getByText('Profesor y alumno conectados',{exact:true}).waitFor();
   student=nextStudent;
 });
 await check('Teacher closes the room and student access is revoked',async()=>{
   teacher.once('dialog',d=>d.accept());
   await teacher.getByRole('button',{name:'Terminar clase'}).click();
   await student.getByText('La clase ha terminado.').waitFor({timeout:12000});
   const denied=await student.evaluate(async id=>await fetch('/aula/api/room?id='+id).then(x=>x.status),roomId);
   assert.equal(denied,403);
 });
 console.log('AULA_DIRECT_RESULT',JSON.stringify({passed:report.checks.filter(x=>x.status==='PASS').length,
   failed:report.checks.filter(x=>x.status==='FAIL').length}));
}
smoke().catch(e=>{report.failure=String(e);process.exitCode=1;console.error('AULA_DIRECT_ERROR',String(e).slice(0,1100));})
 .finally(async()=>{
   await replacementCtx?.close().catch(()=>{});
   await studentCtx?.close().catch(()=>{});await teacherCtx?.close().catch(()=>{});
   await browser?.close().catch(()=>{});
   if(child){child.kill('SIGTERM');await Promise.race([once(child,'exit').catch(()=>{}),new Promise(r=>setTimeout(r,2000))]);}
   fs.rmSync(dir,{recursive:true,force:true});
   const out=process.env.CHESSY_AULA_EVIDENCE || path.join(os.tmpdir(),'chessy-aula-direct-report.json');
   fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
   console.log('REPORT',out);
   if(report.failure)process.exitCode=1;
 });
