/**
 * Independent professor and learner browser contexts against the local Auth+Firestore emulators.
 * Never run with production Firebase credentials.
 */
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),ORIGIN='http://127.0.0.1:14319';
const OUT=path.join(ROOT,'progress/evidence/rooms');
const report={timestamp:new Date().toISOString(),checks:[],pageErrors:[]};
const env={
  ...process.env,
  VITE_FIREBASE_API_KEY:'chessy-emulator-key',
  VITE_FIREBASE_AUTH_DOMAIN:'demo-chessy-rooms.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID:'demo-chessy-rooms',
  VITE_FIREBASE_APP_ID:'1:123456789:web:chessyrooms',
  VITE_FIREBASE_AUTH_EMULATOR_URL:'http://127.0.0.1:19639',
  VITE_FIREBASE_FIRESTORE_EMULATOR_URL:'http://127.0.0.1:19608',
};
let server,browser,teacher,student;
async function waitForServer(){
  for(let tries=0;tries<70;tries++){
    try {if((await fetch(ORIGIN,{signal:AbortSignal.timeout(800)})).ok)return;}
    catch{}
    await new Promise(done=>setTimeout(done,220));
  }
  throw new Error('Vite dev server unavailable at '+ORIGIN);
}
async function check(name,fn){
  const start=Date.now();
  try {await fn();report.checks.push({name,result:'PASS',ms:Date.now()-start});console.log('PASS',name);}
  catch(error){report.checks.push({name,result:'FAIL',error:String(error).slice(0,1400)});console.error('FAIL',name,error.stack||String(error));throw error;}
}
async function signIn(page,email){
  await page.goto(ORIGIN+'/#/account',{waitUntil:'domcontentloaded'});
  const form=page.locator('.account-login-card form');
  await form.waitFor();
  await form.locator('input[type=email]').fill(email);
  await form.locator('input[type=password]').fill('ChessyEmulator123');
  await form.getByRole('button',{name:'Iniciar sesión'}).click();
  await page.locator('.account-profile').waitFor({timeout:20000});
  assert.match(await page.locator('.account-profile').innerText(),new RegExp(email));
}
(async()=>{
  await fs.mkdir(OUT,{recursive:true});
  server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','14319','--strictPort'],
    {cwd:ROOT,env,stdio:'ignore'});
  await waitForServer();
  browser=await chromium.launch({headless:true});
  teacher=await browser.newContext({viewport:{width:1440,height:900},locale:'es-GT',timezoneId:'America/Guatemala'});
  student=await browser.newContext({viewport:{width:390,height:844},locale:'es-GT',timezoneId:'America/Guatemala'});
  const t=await teacher.newPage(),s=await student.newPage();
  t.on('pageerror',e=>report.pageErrors.push('coach: '+e.message));
  s.on('pageerror',e=>report.pageErrors.push('student: '+e.message));
  t.setDefaultTimeout(16000);s.setDefaultTimeout(16000);
  let invite,roomUrl;
  await check('Coach has a verified identity and an approved coach claim',async()=>{
    await signIn(t,'coach-rooms-e2e@example.test');
    await t.goto(ORIGIN+'/#/rooms');
    await t.locator('.room-author form').waitFor({timeout:15000});
    assert.equal(await t.locator('.room-author form').count(),1);
  });
  await check('Coach creates a private age-gated room with a live board',async()=>{
    await t.locator('.room-author form input').fill('Chessy nivel cero aula A');
    await t.locator('.room-author form select').first().selectOption('children');
    await t.locator('.room-author form button').click();
    await t.locator('.room-heading-panel').waitFor({timeout:20000});
    assert.match(await t.locator('.room-heading-panel').innerText(),/Chessy nivel cero aula A/);
    const snapshot=await t.locator('.room-board .position-wrap');
    await snapshot.waitFor({timeout:15000});
    roomUrl=t.url();
  });
  await check('Teacher generates a seven-day invitation and shares the link',async()=>{
    await t.getByRole('button',{name:'Generar invitación'}).click();
    const field=t.locator('.room-share-actions input[readonly]');
    await field.waitFor({timeout:15000});
    invite=await field.inputValue();
    assert.match(invite,/\/#\/rooms\/[A-Za-z0-9]{20}$/);
    await t.getByRole('button',{name:'Compartir invitación'}).waitFor();
    await t.evaluate(()=>window.scrollTo(0,0));
    await t.screenshot({path:path.join(OUT,'coach-created-room.png'),fullPage:true});
  });
  await check('Student follows link and signs in on separate 390px browser session',async()=>{
    await s.goto(invite,{waitUntil:'domcontentloaded'});
    await s.getByRole('heading',{name:'Entra para participar'}).waitFor({timeout:15000});
    await signIn(s,'student-rooms-e2e@example.test');
    await s.getByRole('button',{name:'Retomar invitación'}).waitFor({timeout:15000});
    await s.getByRole('button',{name:'Retomar invitación'}).click();
    await s.locator('.room-accept form').waitFor({timeout:15000});
    assert.match(await s.locator('.room-accept h2').innerText(),/Chessy nivel cero aula A/);
  });
  await check('Guardian selects age band and joins via the bearer invitation',async()=>{
    await s.locator('.room-accept select').selectOption('10-12');
    const guardian=s.locator('.room-consent input');
    await guardian.check();
    await s.getByRole('button',{name:'Entrar a la sala'}).click();
    await s.locator('.room-heading-panel').waitFor({timeout:18000});
    await s.locator('.room-question').first().waitFor({timeout:18000});
    assert.equal(await s.locator('.room-question').count(),5);
  });
  await check('Child-specific diagnostic is persisted and produces an advisory route',async()=>{
    const answer=['b','a','c','a','b'];
    for(let i=0;i<answer.length;i++){
      await s.locator('.room-question').nth(i).locator('input[value="'+answer[i]+'"]').check();
    }
    await s.getByRole('button',{name:'Enviar respuestas'}).click();
    await s.locator('.room-diagnostic-done').waitFor({timeout:15000});
    assert.match(await s.locator('.room-diagnostic-done').innerText(),/5 \/ 5/);
    await s.evaluate(()=>window.scrollTo(0,0));
    await s.screenshot({path:path.join(OUT,'guardian-diagnostic-mobile.png'),fullPage:true});
    assert.equal(await s.locator('.room-question').count(),0);
  });
  await check('Account deletion blocks while a private classroom record exists',async()=>{
    const roomLink=s.url();
    await s.goto(ORIGIN+'/#/account',{waitUntil:'domcontentloaded'});
    await s.locator('.account-danger .btn.quiet').first().click();
    await s.locator('.account-danger .btn.danger').click();
    await s.locator('.account-room-deletion').waitFor({timeout:18000});
    assert.match(await s.locator('.account-room-deletion').innerText(),/Primero revisa tus salas/);
    assert.match(await s.locator('.account-profile').innerText(),/student-rooms-e2e/);
    await s.goto(roomLink,{waitUntil:'domcontentloaded'});
    await s.locator('.room-diagnostic-done').waitFor({timeout:18000});
  });
  await check('Coach sees anonymous scores and exercises instructor-only board control',async()=>{
    // Teacher stays in the room: results must arrive live, without a manual refresh.
    await t.locator('.room-results').getByText('5 / 5').waitFor({timeout:20000});
    await t.locator('.room-position [data-square="e2"]').first().click();
    await t.locator('.room-position [data-square="e4"]').first().click();
    await t.locator('.room-moves').getByText(/e4/).waitFor({timeout:15000});
    await s.locator('.room-moves').getByText(/e4/).waitFor({timeout:15000});
    assert.match(await s.locator('.room-moves').innerText(),/e4/);
    assert.equal(await s.locator('.room-board-controls').count(),0);
  });
  await check('Coach closes room and learners retain read-only access',async()=>{
    t.once('dialog',dialog=>dialog.accept());
    await t.getByRole('button',{name:'Cerrar sala'}).click();
    await t.locator('.room-heading-panel').getByText('Cerrada').waitFor({timeout:15000});
    await s.reload();
    await s.locator('.room-heading-panel').waitFor({timeout:15000});
    assert.match(await s.locator('.room-heading-panel').innerText(),/Cerrada/);
    assert.equal(await s.locator('.room-board-controls').count(),0);
  });
  await check('Guardian withdraws membership and deletes diagnostic data',async()=>{
    const previousRoom=s.url();
    s.once('dialog',dialog=>dialog.accept());
    await s.getByRole('button',{name:'Salir y borrar mis datos de esta sala'}).click();
    await s.locator('.room-list-section').waitFor({timeout:15000});
    assert.equal(await s.locator('.room-card').count(),0);
    await s.goto(previousRoom,{waitUntil:'domcontentloaded'});
    await s.getByRole('alert').waitFor({timeout:15000});
    assert.equal(await s.locator('.room-heading-panel').count(),0);
    await t.goto(roomUrl,{waitUntil:'domcontentloaded'});
    await t.locator('.room-results').waitFor({timeout:20000});
    await t.getByTestId('room-loading-state').waitFor({state:'hidden',timeout:20000});
    await t.locator('.room-result-row').first().waitFor({state:'hidden',timeout:20000});
    assert.equal(await t.locator('.room-result-row').count(),0);
    const currentRoomId=new URL(roomUrl).hash.split('/').pop();
    const base='http://127.0.0.1:19608/v1/projects/demo-chessy-rooms/databases/(default)/documents/learningRooms/'+currentRoomId;
    const [d,m]=await Promise.all([
      fetch(base+'/diagnostics/studentChessyE2E',{headers:{Authorization:'Bearer owner'}}),
      fetch(base+'/members/studentChessyE2E',{headers:{Authorization:'Bearer owner'}}),
    ]);
    assert.equal(d.status,404,'diagnostic must be physically deleted');
    assert.equal(m.status,404,'membership must be physically deleted');
  });
  await check('Independent sessions generated no unhandled browser exceptions',async()=>assert.deepEqual(report.pageErrors,[]));
})().catch(e=>{report.failure=String(e);process.exitCode=1;}).finally(async()=>{
  await fs.mkdir(OUT,{recursive:true});
  await fs.writeFile(path.join(OUT,'browser-auth-report.json'),JSON.stringify(report,null,2)+'\n');
  try{await teacher?.close();}catch{}
  try{await student?.close();}catch{}
  try{await browser?.close();}catch{}
  try{server?.kill('SIGTERM');}catch{}
  console.log('CHESSY_ROOMS_E2E',JSON.stringify({total:report.checks.length,passed:report.checks.filter(x=>x.result==='PASS').length,failed:report.checks.filter(x=>x.result==='FAIL').length}));
});
