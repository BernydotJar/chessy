'use strict';
/** Two independent Chromium profiles, one authoritative teacher and an adult learner. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const {once}=require('node:events');
const root=path.resolve(__dirname,'../..');
const SECRET='CHESSY-LOCAL-TEST-AULA-FREE-BOARD-20261110';
const results={checks:[],errors:[]};

async function check(name,fn){
  const started=Date.now();
  await fn();
  results.checks.push({name,status:'PASS',ms:Date.now()-started});
  console.log('PASS',name);
}
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chessy-board-browser-'));
  const secretFile=path.join(dir,'secret');
  fs.writeFileSync(secretFile,SECRET,{mode:0o600});
  let server,browser;
  try{
    const {attachAulaDirect}=await import('../aula-direct.mjs');
    let aula;
    server=http.createServer((req,res)=>{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname.startsWith('/aula/api/')){
        void aula.handle(req,res,url.pathname).catch(e=>{
          if(!res.headersSent){res.writeHead(500);res.end(String(e));}
        });
        return;
      }
      const assets={
        '/aula/':['public/aula/index.html','text/html'],
        '/aula/app.js':['public/aula/app.js','text/javascript'],
        '/aula/style.css':['public/aula/style.css','text/css']
      };
      const file=assets[url.pathname];
      if(!file){res.writeHead(404);res.end('Not found');return;}
      res.writeHead(200,{'Content-Type':file[1],'Cache-Control':'no-store'});
      fs.createReadStream(path.join(root,file[0])).pipe(res);
    });
    aula=attachAulaDirect(server,{secretPath:secretFile});
    server.listen(0,'127.0.0.1');
    await once(server,'listening');
    const base='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({executablePath:process.env.CHESSY_PLAYWRIGHT_CHROMIUM||chromium.executablePath(),headless:true,
      args:['--no-sandbox','--disable-dev-shm-usage']});
    const teacherCtx=await browser.newContext({viewport:{width:1440,height:900}});
    const learnerCtx=await browser.newContext({viewport:{width:390,height:844}});
    const teacher=await teacherCtx.newPage(),student=await learnerCtx.newPage();
    teacher.on('pageerror',e=>results.errors.push('teacher:'+e.message));
    student.on('pageerror',e=>results.errors.push('student:'+e.message));
    let invite;
    await check('teacher creates isolated classroom and shares invite',async()=>{
      await teacher.goto(base+'/aula/');
      await teacher.locator('#teacher-code').fill(SECRET);
      await teacher.getByRole('button',{name:'Abrir mi aula'}).click();
      await teacher.locator('#class-title').fill('Prueba REA del tablero libre');
      await teacher.getByRole('button',{name:'Crear aula e invitar al alumno'}).click();
      invite=await teacher.locator('#invite-url').inputValue();
      assert.ok(invite.includes('/join/'));
    });
    await check('learner joins and receives same board',async()=>{
      await student.goto(invite);
      await student.locator('#adult').check();
      await student.getByRole('button',{name:'Entrar al aula'}).click();
      await student.getByText('Profesor y alumno conectados',{exact:true}).waitFor();
      await teacher.getByText('Profesor y alumno conectados',{exact:true}).waitFor();
      assert.equal(await student.locator('.square').count(),64);
    });
    await check('mobile teacher sees board controls without scrolling to the sidebar',async()=>{
      await teacher.setViewportSize({width:390,height:844});
      const controls=await teacher.evaluate(()=>{
        const quickbar=document.querySelector('.board-quickbar');
        const board=document.querySelector('#board');
        const advanced=document.querySelector('#board-advanced');
        const buttons=[...quickbar.querySelectorAll('button')];
        return {
          scrollWidth:document.documentElement.scrollWidth,
          viewportWidth:innerWidth,
          beforeBoard:quickbar.getBoundingClientRect().bottom<=board.getBoundingClientRect().top,
          advancedBeforeBoard:advanced.getBoundingClientRect().bottom<=board.getBoundingClientRect().top,
          buttonCount:buttons.length,
          minTouchHeight:Math.min(...buttons.map(button=>button.getBoundingClientRect().height)),
          editLabel:document.querySelector('#toggle-editor')?.textContent,
          uniqueEditorButton:document.querySelectorAll('#toggle-editor').length
        };
      });
      assert.ok(controls.beforeBoard&&controls.advancedBeforeBoard,JSON.stringify(controls));
      assert.equal(controls.buttonCount,4);
      assert.ok(controls.minTouchHeight>=44,JSON.stringify(controls));
      assert.equal(controls.editLabel,'Editar tablero');
      assert.equal(controls.uniqueEditorButton,1);
      assert.ok(controls.scrollWidth<=controls.viewportWidth+2,JSON.stringify(controls));
      assert.equal(await student.locator('.board-quickbar').count(),0);
      await teacher.locator('#board-advanced summary').click();
      assert.equal(await teacher.locator('#board-controller').isVisible(),true);
      await teacher.locator('#board-advanced summary').click();
      await teacher.setViewportSize({width:320,height:760});
      const mobile320=await teacher.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
      assert.ok(mobile320.scroll<=mobile320.width+2,JSON.stringify(mobile320));
      await teacher.setViewportSize({width:390,height:844});
    });
    await check('teacher opens REAL unrestricted free-board editor',async()=>{
      await teacher.locator('#toggle-editor').click();
      await teacher.locator('#editor-panel:visible').waitFor();
      const editorPlacement=await teacher.evaluate(()=>({
        paletteEnd:document.querySelector('#piece-palette').getBoundingClientRect().bottom,
        boardStart:document.querySelector('#board').getBoundingClientRect().top,
        expanded:document.querySelector('#toggle-editor').getAttribute('aria-expanded'),
        pressed:document.querySelector('#toggle-editor').getAttribute('aria-pressed'),
        buttonText:document.querySelector('#toggle-editor').textContent
      }));
      assert.ok(editorPlacement.paletteEnd<=editorPlacement.boardStart,JSON.stringify(editorPlacement));
      assert.equal(editorPlacement.expanded,'true');
      assert.equal(editorPlacement.pressed,'true');
      assert.equal(editorPlacement.buttonText,'Finalizar preparación');
      await student.getByText('Preparando posición · movimientos libres').waitFor();
      await teacher.locator('#clear-position').click();
      await student.waitForFunction(()=>document.querySelectorAll('#board [data-piece]:not([data-piece=""])').length===0);
      for(const [piece,square] of [['K','e1'],['k','e8'],['R','a1']]){
        await teacher.locator('[data-piece="'+piece+'"].palette-piece').click();
        await teacher.locator('#board [data-square="'+square+'"]').click();
        await student.locator('#board [data-square="'+square+'"][data-piece="'+piece+'"]').waitFor();
      }
      await teacher.locator('#toggle-editor').click();
      await student.getByText('Jugadas legales · posición sincronizada').waitFor();
      assert.equal(await teacher.locator('#toggle-editor').getAttribute('aria-expanded'),'false');
      assert.equal(await teacher.locator('#editor-panel').isVisible(),false);
      assert.equal(await student.locator('#board [data-square="a1"]').getAttribute('data-piece'),'R');
    });
    await check('teacher controls drawing arrows shared with learner',async()=>{
      await teacher.locator('#annotation-mode').click();
      await teacher.locator('#board [data-square=a1]').click();
      await teacher.locator('#board [data-square=a8]').click();
      await student.locator('svg.annotation-layer line').waitFor({state:'attached'});
      assert.equal(await student.locator('svg.annotation-layer').isVisible(),true);
      assert.equal(await student.locator('svg.annotation-layer line').count(),1);
      await teacher.locator('#annotation-mode').click();
    });
    await check('incoming chat does not interrupt selected rook move',async()=>{
      await teacher.locator('#board [data-square=a1]').click();
      await teacher.locator('#board [data-square=a1].selected').waitFor();
      await student.locator('#chat-input').fill('Analizamos la torre');
      await student.locator('#chat-form button').click();
      await teacher.getByText('Analizamos la torre').waitFor();
      assert.equal(await teacher.locator('#board [data-square=a1].selected').count(),1);
      await teacher.locator('#board [data-square=a4]').click();
      await student.locator('#board [data-square=a4][data-piece=R]').waitFor();
      await teacher.waitForFunction(()=>document.querySelector('#move-history')?.textContent==='Ra4');
    });
    await check('Undo and redo synchronize both boards',async()=>{
      await teacher.locator('#undo-move').click();
      await student.locator('#board [data-square=a1][data-piece=R]').waitFor();
      await teacher.locator('#redo-move').click();
      await student.locator('#board [data-square=a4][data-piece=R]').waitFor();
    });
    await check('mobile width and runtime errors',async()=>{
      const dim=await student.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
      assert.ok(dim.scroll<=dim.width+2,JSON.stringify(dim));
      assert.deepEqual(results.errors,[]);
    });
    console.log('AULA_FREE_BOARD_BROWSER_RESULT',JSON.stringify(results));
  }finally{
    if(browser)await browser.close().catch(()=>{});
    if(server)await new Promise(resolve=>server.close(resolve));
    fs.rmSync(dir,{recursive:true,force:true});
  }
})().catch(e=>{console.error('AULA_FREE_BOARD_BROWSER_FAIL',e.stack||e);process.exitCode=1;});
