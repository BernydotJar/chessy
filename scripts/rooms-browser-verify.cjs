const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'progress/evidence/rooms');
const ORIGIN='http://localhost:4318';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.wasm':'application/wasm'};
const report={createdAt:new Date().toISOString(),checks:[],pageErrors:[],screenshots:[]};
async function check(name,run){
  const start=Date.now();
  try {
    await run();
    report.checks.push({name,result:'PASS',ms:Date.now()-start});
    console.log('PASS',name);
  } catch(error) {
    report.checks.push({name,result:'FAIL',error:String(error).slice(0,1200)});
    console.error('FAIL',name,String(error).slice(0,300));
  }
}
(async()=>{
  await fs.mkdir(OUT,{recursive:true});
  await fs.access(path.join(ROOT,'dist','index.html')).catch(()=>{
    throw new Error('ROOMS_BROWSER_PRECHECK: dist/index.html missing; run npm run build before the static UI suite');
  });
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},locale:'es-GT',timezoneId:'America/Guatemala',reducedMotion:'reduce'});
  await ctx.route(ORIGIN+'/**',async route=>{
    const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
    const file=path.resolve(ROOT,'dist',pathname==='/'?'index.html':pathname.slice(1));
    if(!file.startsWith(path.join(ROOT,'dist')+path.sep)){await route.fulfill({status:403});return;}
    try { await route.fulfill({status:200,body:await fs.readFile(file),contentType:MIME[path.extname(file)]||'application/octet-stream'}); }
    catch { await route.fulfill({status:404,body:'Not found'}); }
  });
  const page=await ctx.newPage();
  page.on('pageerror',e=>report.pageErrors.push(String(e)));
  page.setDefaultTimeout(10000);
  const goto=async route=>{await page.goto(ORIGIN+'/#/'+route,{waitUntil:'domcontentloaded'});await page.locator('.studio-app').waitFor();};
  try {
    await check('Anonymous learner finds level zero-to-one with five evidence milestones',async()=>{
      await goto('rooms');
      await page.getByRole('heading',{name:'Salas de aprendizaje'}).waitFor();
      assert.equal(await page.locator('.zero-milestones li').count(),5);
      assert.equal(await page.locator('.zero-path progress').getAttribute('max'),'5');
      assert.match(await page.locator('.zero-level').innerText(),/nivel 0/);
      assert.equal(await page.locator('.room-author form').count(),0);
    });
    await check('Zero-to-one milestones open the exact next unfinished lesson or puzzle',async()=>{
      await goto('rooms');
      const path=page.locator('.zero-milestones li');
      await path.first().getByRole('button',{name:'Practicar ahora'}).click();
      await page.locator('.lesson-reader h1').waitFor();
      assert.equal(new URL(page.url()).hash,'#/academy/board-vision');
      await page.locator('.quiz-option').nth(1).click();
      await goto('rooms');
      await page.locator('.zero-milestones li.done').first().waitFor();
      await page.locator('.zero-milestones li').nth(1).getByRole('button',{name:'Practicar ahora'}).click();
      await page.locator('#training-current-puzzle select').waitFor();
      assert.equal(new URL(page.url()).hash,'#/training/rook-file');
      assert.equal(await page.getByLabel('Elegir posición').inputValue(),'rook-file');
      await page.locator('#typed-move').fill('a1a5');
      await page.locator('.move-entry button').click();
      await page.locator('.board-success').waitFor();
      await goto('rooms');
      await page.locator('.zero-milestones li').nth(1).getByRole('button',{name:'Practicar ahora'}).click();
      await page.locator('#training-current-puzzle select').waitFor();
      assert.equal(new URL(page.url()).hash,'#/training/bishop-diagonal');
      await page.waitForFunction(()=>document.querySelector('select[aria-label="Elegir posición"]')?.value==='bishop-diagonal');
    });
    await check('Classes offers the interactive classroom even if the catalogue backend is unavailable',async()=>{
      await goto('classes');
      const cta=page.locator('.coach-classroom-cta');
      await cta.getByRole('heading',{name:'Aula interactiva con tu profesor'}).waitFor();
      await cta.getByRole('button',{name:'Abrir mis salas'}).click();
      await page.getByTestId('private-rooms-disabled').waitFor();
      assert.match(new URL(page.url()).hash,/rooms/);
    });
    await check('Signup visibly distinguishes guardian and blocks a minor account',async()=>{
      // The safe public pilot has no private-room login CTA; account registration
      // must still work directly for existing and new adult users.
      await goto('account');
      await page.locator('.account-login-card').waitFor();
      await page.locator('.account-tabs button').nth(1).click();
      const form=page.locator('.account-form');
      await form.locator('input[type=email]').fill('adult.test@example.test');
      await form.locator('input[type=password]').fill('ExamplePassword1234');
      const select=form.locator('select');
      assert.equal(await select.count(),1);
      await select.selectOption('minor');
      assert.equal(await form.locator('button.btn.primary').isDisabled(),true);
      assert.match(await form.innerText(),/cuentas son de adultos/);
      await select.selectOption('guardian');
      assert.equal(await form.locator('button.btn.primary').isEnabled(),true);
      await select.selectOption('adult');
      assert.equal(await form.locator('button.btn.primary').isEnabled(),true);
    });
    await check('Production pilot denies private invitation and classroom API UI',async()=>{
      await goto('rooms/InviteTesting1234567');
      assert.equal(await page.locator('.room-auth').count(),0);
      assert.equal(await page.locator('.room-accept form').count(),0);
      assert.equal(await page.locator('.room-author').count(),0);
      await page.getByTestId('private-rooms-disabled').waitFor();
      assert.match(await page.getByTestId('private-rooms-disabled').innerText(),/Salas privadas en preparación/);
    });
    await check('Desktop room action and mobile drawer do not obstruct navigation',async()=>{
      await goto('rooms');
      for(const size of [1440,760,390,375]){
        await page.setViewportSize({width:size,height:844});
        await page.locator('.zero-milestones li').first().waitFor();
        const metrics=await page.evaluate(()=>{
          const main=document.querySelector('.rooms-view');
          const view=main?.getBoundingClientRect();
          return {viewWidth:view?.width,scrollWidth:document.documentElement.scrollWidth,viewport:window.innerWidth};
        });
        assert.ok(metrics.viewWidth>150);
        assert.ok(metrics.scrollWidth<=size+3,'Horizontal overflow at '+size+'px: '+JSON.stringify(metrics));
        const location=path.join(OUT,'rooms-'+size+'.png');
        await page.screenshot({path:location,fullPage:true});
        report.screenshots.push(location);
      }
      await page.setViewportSize({width:390,height:844});
      await page.locator('.mobile-menu').click();
      const nav=page.locator('#chessy-navigation');
      assert.ok(await nav.getByText('Salas',{exact:true}).count()>=1);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#chessy-navigation').evaluate(e=>e.classList.contains('is-open')),false);
      await page.setViewportSize({width:1440,height:1000});
    });
    await check('Room and account anonymous screens pass automated accessibility scan',async()=>{
      for(const view of ['rooms','account']){
        await goto(view);
        const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
        assert.equal(audit.violations.length,0,view+': '+audit.violations.map(v=>v.id+': '+v.nodes.length).join(', '));
      }
    });
    await check('Language switch preserves translated room navigation labels',async()=>{
      for(const [language,label] of [['es','Salas'],['en','Rooms'],['pt','Salas']]){
        await page.evaluate(lang=>localStorage.setItem('i18nextLng',lang),language);
        await goto('rooms');
        await page.reload({waitUntil:'domcontentloaded'});
        await page.locator('.rooms-view').waitFor();
        assert.ok((await page.locator('aside.sidebar nav').innerText()).includes(label));
        assert.ok(!(await page.locator('main').innerText()).includes('rooms.eyebrow'));
      }
    });
    await check('No unhandled JavaScript errors during room journeys',async()=>assert.deepEqual(report.pageErrors,[]));
  } finally {
    await fs.writeFile(path.join(OUT,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
    await browser.close();
  }
  console.log('ROOMS_BROWSER_RESULT',JSON.stringify({checks:report.checks.length,passed:report.checks.filter(c=>c.result==='PASS').length,failed:report.checks.filter(c=>c.result==='FAIL').length}));
  if(report.checks.some(c=>c.result==='FAIL'))process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
