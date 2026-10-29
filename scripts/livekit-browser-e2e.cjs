'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {spawn}=require('node:child_process'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.resolve(ROOT,process.env.CHESSY_LIVE_QA_OUT||'progress/evidence/livekit'),ORIGIN='http://127.0.0.1:14329';
const PROJECT='demo-chessy-livekit',AUTH='http://127.0.0.1:19739/identitytoolkit.googleapis.com/v1';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:19708'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:19739')
  throw new Error('Refusing QA outside dedicated local demo emulators');
const report={startedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
  environment:'Firebase emulators + LiveKit Cloud QA; synthetic media/adult identities',checks:[],pageErrors:[],screenshots:[]};
const password='ChessyLiveQa123',users=[
 {uid:'coachLiveE2E',email:'coach-live@example.test',role:'coach'},
 {uid:'studentOneLiveE2E',email:'learner-one-live@example.test'},
 {uid:'studentTwoLiveE2E',email:'learner-two-live@example.test'},
 {uid:'outsiderLiveE2E',email:'outsider-live@example.test'},
 {uid:'minorLiveE2E',email:'minor-guardian-live@example.test'},
];
const tokens={},credentials={},contexts=[];
let server,browser,roomId,sessionId,teacher,one,two;
async function check(name,fn){
  const start=Date.now();try{await fn();report.checks.push({name,result:'PASS',ms:Date.now()-start});console.log('PASS',name);}
  catch(error){report.checks.push({name,result:'FAIL',error:String(error).replace(/eyJ[^\s]+/g,'[JWT_REDACTED]').slice(0,1000)});
    throw new Error(name+': '+String(error).replace(/eyJ[^\s]+/g,'[JWT_REDACTED]').slice(0,1000));}
}
async function until(fn,timeout=30000){
  const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,200));}
  throw new Error('Timed out waiting for observable state');
}
async function callable(user,name,data){
  const res=await fetch('http://127.0.0.1:19749/'+PROJECT+'/us-central1/'+name,{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tokens[user]},
    body:JSON.stringify({data}),signal:AbortSignal.timeout(15000)});
  const value=await res.json();if(!res.ok||value.error)throw new Error(value.error?.status||'callable-failed');
  return value.result;
}
async function login(page,email){
  await page.goto(ORIGIN+'/#/account');
  const form=page.locator('.account-login-card form');await form.waitFor();
  await form.locator('input[type=email]').fill(email);await form.locator('input[type=password]').fill(password);
  await form.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await page.locator('.account-profile').waitFor({timeout:30000});
}
async function context(user,viewport){
  const ctx=await browser.newContext({viewport,locale:'es-GT',timezoneId:'America/Guatemala',
    permissions:['camera','microphone'],reducedMotion:'reduce'});
  contexts.push(ctx);const page=await ctx.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>report.pageErrors.push(e.message));
  page.on('response',async res=>{
    if(res.url().endsWith('/joinLearningRoomLive')&&res.ok()){
      const body=await res.json().catch(()=>({}));if(body.result?.token)credentials[user]=body.result;
    }
  });
  await login(page,users.find(x=>x.uid===user).email);return page;
}
async function enroll(page,invite){
  await page.goto(invite);await page.locator('.room-accept form').waitFor();
  await page.locator('.room-accept select').selectOption('adult');
  await page.getByRole('button',{name:'Entrar a la sala',exact:true}).click();
  await page.getByTestId('live-classroom').waitFor();
}
async function connected(page){await until(async()=>await page.getByTestId('live-status').innerText()==='Conectado',45000);}
async function rejectedReplay(page,credential){
  return page.evaluate(async cred=>{
    const {Room}=await import('/node_modules/.vite/deps/livekit-client.js');
    const r=new Room();
    try{await r.connect(cred.serverUrl,cred.token,{peerConnectionTimeout:6000,websocketTimeout:6000});await r.disconnect();return false;}
    catch{await r.disconnect();return true;}
  },credential);
}
async function shot(page,name){
  await page.getByTestId('live-classroom').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(OUT,name),fullPage:true});report.screenshots.push(name);
}
(async()=>{
  await fs.mkdir(OUT,{recursive:true});
  const imported=await fetch(AUTH+'/projects/'+PROJECT+'/accounts:batchCreate',{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},
    body:JSON.stringify({users:users.map(u=>({localId:u.uid,email:u.email,rawPassword:password,emailVerified:true,
      ...(u.role?{customAttributes:JSON.stringify({chessyRole:u.role})}:{})}))})});
  assert.equal(imported.ok,true,'disposable auth fixtures');
  for(const user of users){
    const res=await fetch(AUTH+'/accounts:signInWithPassword?key=synthetic-emulator-key',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:user.email,password,returnSecureToken:true})});
    const body=await res.json();assert.ok(body.idToken,'fixture sign-in');tokens[user.uid]=body.idToken;
  }
  const env={...process.env,VITE_FIREBASE_API_KEY:'synthetic-emulator-key',
    VITE_FIREBASE_AUTH_DOMAIN:PROJECT+'.firebaseapp.com',VITE_FIREBASE_PROJECT_ID:PROJECT,
    VITE_FIREBASE_APP_ID:'1:123456789:web:chessylive',VITE_FIREBASE_AUTH_EMULATOR_URL:'http://127.0.0.1:19739',
    VITE_FIREBASE_FIRESTORE_EMULATOR_URL:'http://127.0.0.1:19708',VITE_FIREBASE_FUNCTIONS_EMULATOR_URL:'http://127.0.0.1:19749',
    VITE_CHESSY_ROOM_PRIVACY_URL:ORIGIN+'/privacy-qa',VITE_CHESSY_PRIVATE_ROOMS_ENABLED:'true',
    VITE_CHESSY_ROOMS_DATA_MAY_EXIST:'true',VITE_CHESSY_LIVEKIT_ENABLED:'true'};
  server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','14329','--strictPort'],{cwd:ROOT,env,stdio:'ignore'});
  await until(async()=>{try{return(await fetch(ORIGIN)).ok;}catch{return false;}});
  browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--disable-gpu','--renderer-process-limit=4','--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream','--auto-select-desktop-capture-source=Entire screen','--allow-http-screen-capture','--enable-usermedia-screen-capturing']});
  await check('Three separate authenticated adult browser sessions',async()=>{
    teacher=await context('coachLiveE2E',{width:1440,height:1000});
    one=await context('studentOneLiveE2E',{width:390,height:844});
    two=await context('studentTwoLiveE2E',{width:760,height:1000});
  });
  let invite;
  await check('Instructor creates an adult room and learners enroll through its private invitation',async()=>{
    await teacher.goto(ORIGIN+'/#/rooms');await teacher.locator('.room-author form').waitFor();
    await teacher.locator('.room-author form input').fill('Clase LiveKit QA para adultos');
    await teacher.locator('.room-author form select').first().selectOption('adults');
    await teacher.locator('.room-author form button').click();await teacher.locator('.room-heading-panel').waitFor();
    roomId=teacher.url().split('/').pop();
    await teacher.getByRole('button',{name:'Generar invitación',exact:true}).click();
    const field=teacher.locator('.room-share-actions input[readonly]');await field.waitFor();invite=await field.inputValue();
    await enroll(one,invite);await enroll(two,invite);
    assert.equal(await one.getByRole('button',{name:'Iniciar clase',exact:true}).count(),0);
  });
  await check('A learner and an outsider cannot start the class or access its private state',async()=>{
    await assert.rejects(()=>callable('studentOneLiveE2E','startLearningRoomLive',{roomId}),/PERMISSION_DENIED/);
    await assert.rejects(()=>callable('outsiderLiveE2E','startLearningRoomLive',{roomId}),/PERMISSION_DENIED/);
    const url='http://127.0.0.1:19708/v1/projects/'+PROJECT+'/databases/(default)/documents/learningRooms/'+roomId+'/live/current';
    const denied=await fetch(url,{headers:{Authorization:'Bearer '+tokens.outsiderLiveE2E}});assert.equal(denied.status,403);
  });
  await require('./livekit-backend-e2e.cjs')({check,roomId});
  await require('./livekit-adversarial-backend.cjs')({check});
  await check('Instructor starts class, two learners join with devices off, all see three participants',async()=>{
    await teacher.getByRole('button',{name:'Iniciar clase',exact:true}).click();await connected(teacher);
    sessionId=credentials.coachLiveE2E.sessionId;
    for(const p of [one,two]){await p.getByRole('button',{name:'Entrar a la clase',exact:true}).click();await connected(p);}
    for(const p of [teacher,one,two]){
      await until(async()=>await p.locator('.live-grid .live-tile').count()===3);
      assert.equal(await p.getByRole('button',{name:'Activar micrófono',exact:true}).getAttribute('aria-pressed'),'false');
      assert.equal(await p.getByRole('button',{name:'Activar cámara',exact:true}).getAttribute('aria-pressed'),'false');
    }
  });
  await check('Real Cloud media: synthetic camera is decoded in both learner browsers and audio plays',async()=>{
    await teacher.getByRole('button',{name:'Activar cámara',exact:true}).click();
    await teacher.getByRole('button',{name:'Activar micrófono',exact:true}).click();
    for(const p of [one,two]){
      await p.waitForFunction(()=>[...document.querySelectorAll('.live-grid video')].some(v=>v.videoWidth>0),{timeout:30000});
      await p.waitForFunction(()=>[...document.querySelectorAll('.live-classroom audio')].some(a=>a.readyState>=2&&!a.paused),{timeout:30000});
    }
  });
  await check('Only the instructor can share a screen; learner grants forbid screen/data/admin permissions',async()=>{
    for(const p of [one,two])assert.equal(await p.getByRole('button',{name:'Compartir pantalla',exact:true}).count(),0);
    const grant=JSON.parse(Buffer.from(credentials.studentOneLiveE2E.token.split('.')[1],'base64url').toString()).video;
    assert.deepEqual(grant.canPublishSources,['camera','microphone']);
    assert.equal(grant.roomAdmin,false);assert.equal(grant.canPublishData,false);assert.equal(grant.roomRecord,false);
    await teacher.getByRole('button',{name:'Compartir pantalla',exact:true}).click();
    await teacher.locator('.live-screen').waitFor();
    await one.waitForFunction(()=>document.querySelector('.live-screen video')?.videoWidth>0);
    await teacher.getByRole('button',{name:'Dejar de compartir',exact:true}).click();
  });
  await check('Adversarial browser: a malformed live snapshot disconnects safely and recovery restores the class',async()=>{
    const {createRequire}=require('node:module'),backend=createRequire(path.join(ROOT,'functions/index.cjs'));
    const {initializeApp}=backend('firebase-admin/app'),{getFirestore}=backend('firebase-admin/firestore');
    const db=getFirestore(initializeApp({projectId:PROJECT},'chessy-live-snapshot-qa'));
    const live=db.doc('learningRooms/'+roomId+'/live/current'),before=(await live.get()).data();
    try{
      await live.update({endsAt:'malformed-synthetic-timestamp'});
      for(const p of [teacher,one,two]){
        await until(async()=>await p.locator('.live-grid').count()===0);
        await p.getByTestId('live-classroom').getByRole('alert').waitFor();
      }
    }finally{await live.update({endsAt:before.endsAt});}
    for(const p of [teacher,one,two]){
      await p.getByRole('button',{name:'Entrar a la clase',exact:true}).click();await connected(p);
    }
    await teacher.getByRole('button',{name:'Activar cámara',exact:true}).click();
    await teacher.getByRole('button',{name:'Activar micrófono',exact:true}).click();
    await until(async()=>await teacher.locator('.live-grid .live-tile').count()===3);
  });
  await check('Instructor moves update both shared boards without scrolling the mobile learner',async()=>{
    await one.locator('.room-position').scrollIntoViewIfNeeded();const y=await one.evaluate(()=>scrollY);
    await teacher.locator('.room-position [data-square="e2"]').first().click();
    await teacher.locator('.room-position [data-square="e4"]').first().click();
    await until(async()=>/e4/.test(await one.locator('.room-moves').innerText()));
    assert.match(await two.locator('.room-moves').innerText(),/e4/);
    assert.ok(Math.abs((await one.evaluate(()=>scrollY))-y)<4,'incoming moves preserve mobile scroll');
    assert.equal(await one.locator('.room-board-controls').count(),0);
  });
  await check('Adversarial browser: a delayed join response cannot reopen media after navigating away',async()=>{
    await one.getByRole('button',{name:'Salir de la llamada',exact:true}).click();
    let captured,release;const received=new Promise(resolve=>{captured=resolve;}),gate=new Promise(resolve=>{release=resolve;});
    let socketCount=0;const onSocket=socket=>{if(socket.url().includes('.livekit.cloud'))socketCount++;};one.on('websocket',onSocket);
    await one.route('**/joinLearningRoomLive',async route=>{const response=await route.fetch();captured();await gate;await route.fulfill({response});});
    try{
      await one.getByRole('button',{name:'Entrar a la clase',exact:true}).click();await received;
      await one.locator('.account-launch').click();await one.locator('.account-profile').waitFor();
      const finished=one.waitForResponse(response=>response.url().endsWith('/joinLearningRoomLive'));
      release();await finished;await one.waitForTimeout(1500);
      assert.equal(socketCount,0,'Cancelled navigation must not open a provider WebSocket');
      assert.equal(await one.locator('.live-grid').count(),0);
    }finally{release();await one.unroute('**/joinLearningRoomLive');one.off('websocket',onSocket);}
    await one.goto(ORIGIN+'/#/rooms/open/'+roomId);await one.getByTestId('live-classroom').waitFor();
    await one.getByRole('button',{name:'Entrar a la clase',exact:true}).click();await connected(one);
  });
  await check('A learner leaves and rejoins the same Cloud class with its latest board and video',async()=>{
    await one.getByRole('button',{name:'Salir de la llamada',exact:true}).click();
    await until(async()=>await one.locator('.live-grid').count()===0);
    await one.getByRole('button',{name:'Entrar a la clase',exact:true}).click();await connected(one);
    await one.waitForFunction(()=>[...document.querySelectorAll('.live-grid video')].some(v=>v.videoWidth>0));
    assert.match(await one.locator('.room-moves').innerText(),/e4/);
    await until(async()=>await teacher.locator('.live-grid .live-tile').count()===3);
  });
  await check('Instructor mutes a learner through the authenticated server control',async()=>{
    await one.getByRole('button',{name:'Activar micrófono',exact:true}).click();
    await teacher.locator('.live-participant').filter({hasText:credentials.studentOneLiveE2E.identity.slice(2,6)}).getByRole('button',{name:'Silenciar',exact:true}).click();
    await one.getByRole('button',{name:'Activar micrófono',exact:true}).waitFor();
    await assert.rejects(()=>callable('studentTwoLiveE2E','moderateLearningRoomLive',{
      roomId,sessionId,identity:credentials.coachLiveE2E.identity,action:'remove'}),/PERMISSION_DENIED/);
  });
  await check('Responsive desktop/mobile classroom has no horizontal overflow or serious accessibility violations',async()=>{
    const axe=require('@axe-core/playwright').default;
    for(const [p,name] of [[teacher,'classroom-desktop.png'],[one,'classroom-mobile.png']]){
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      const results=await new axe({page:p}).include('.room-classroom-workspace').analyze();
      assert.deepEqual(results.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[]);
      await shot(p,name);
    }
  });
  await check('Removed learner disconnects, cannot obtain another token, and cannot replay the cached Cloud token',async()=>{
    const cached=credentials.studentOneLiveE2E;
    teacher.once('dialog',d=>d.accept());
    await teacher.locator('.live-participant').filter({hasText:cached.identity.slice(2,6)}).getByRole('button',{name:'Retirar',exact:true}).click();
    await until(async()=>await one.locator('.live-grid').count()===0);
    await assert.rejects(()=>callable('studentOneLiveE2E','joinLearningRoomLive',{roomId,sessionId}),/PERMISSION_DENIED/);
    assert.equal(await rejectedReplay(one,cached),true);
  });
  await check('Ending the class disconnects the remaining learner and rejects cached learner/instructor tokens',async()=>{
    const cached=[credentials.studentTwoLiveE2E,credentials.coachLiveE2E];
    teacher.once('dialog',d=>d.accept());await teacher.getByRole('button',{name:'Terminar clase para todos',exact:true}).click();
    await until(async()=>await two.locator('.live-grid').count()===0);
    await teacher.getByRole('button',{name:'Iniciar clase',exact:true}).waitFor();
    for(const credential of cached)assert.equal(await rejectedReplay(two,credential),true);
    await assert.rejects(()=>callable('studentTwoLiveE2E','joinLearningRoomLive',{roomId,sessionId}),/FAILED_PRECONDITION/);
  });
  await check('A new class has a distinct session; withdrawal revokes media and room closure ends instructor media',async()=>{
    const previous=sessionId;
    await teacher.getByRole('button',{name:'Iniciar clase',exact:true}).click();await connected(teacher);sessionId=credentials.coachLiveE2E.sessionId;
    assert.notEqual(sessionId,previous);
    await two.getByRole('button',{name:'Entrar a la clase',exact:true}).click();await connected(two);
    const cached=credentials.studentTwoLiveE2E;
    await two.locator('.account-launch').click();await two.locator('.account-profile').waitFor();
    await until(async()=>await teacher.locator('.live-grid .live-tile').count()===1);
    await two.goto(ORIGIN+'/#/rooms/open/'+roomId);await two.getByTestId('live-classroom').waitFor();
    await two.getByRole('button',{name:'Entrar a la clase',exact:true}).click();await connected(two);
    two.once('dialog',d=>d.accept());await two.getByRole('button',{name:'Salir y borrar mis datos de esta sala',exact:true}).click();
    await two.locator('.room-list-section').waitFor();assert.equal(await two.locator('.live-grid').count(),0);
    assert.equal(await rejectedReplay(two,cached),true);
    await callable('coachLiveE2E','closeLearningRoom',{roomId});
    await until(async()=>await teacher.locator('.live-grid').count()===0);
  });
  await check('No unhandled browser exceptions',async()=>assert.deepEqual(report.pageErrors,[]));
})().catch(async error=>{
  report.failure=String(error);process.exitCode=1;console.error('LIVE_QA_FAILURE',String(error));
  if(teacher)await teacher.screenshot({path:path.join(OUT,'failure.png'),fullPage:true}).catch(()=>{});
}).finally(async()=>{
  // Dispose only the room created by this test; no existing account or room is touched.
  if(roomId)await callable('coachLiveE2E','closeLearningRoom',{roomId}).catch(()=>{});
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  await browser?.close().catch(()=>{});server?.kill('SIGTERM');
  report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(c=>c.result==='PASS').length;
  report.failed=report.checks.filter(c=>c.result==='FAIL').length;
  await fs.mkdir(OUT,{recursive:true});await fs.writeFile(path.join(OUT,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('CHESSY_LIVEKIT_QA',JSON.stringify({passed:report.passed,failed:report.failed}));
});
