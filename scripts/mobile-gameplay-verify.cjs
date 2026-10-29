// Isolated, source-served regression suite; never attaches to personal browsers.
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'progress/evidence/mobile-gameplay');
const report = { createdAt: new Date().toISOString(), environment: 'isolated Chromium; Vite source server; no production build', checks: [], pageErrors: [], measurements: [] };
let browser, server, origin;
const settle = async page => { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await page.waitForTimeout(210); };
const count = page => page.locator('.move-count').innerText().then(Number);
const measure = page => page.evaluate(() => {
  const rect = selector => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height } : null; };
  return { scrollY, board: rect('.board-shell'), stage: rect('.match-stage'), controls: rect('.game-controls-v3'), scrollWidth: document.documentElement.scrollWidth, viewport: { width: innerWidth, height: innerHeight } };
});
function stable(before, after, label) {
  const delta = after.scrollY - before.scrollY;
  report.measurements.push({ label, scrollDelta: delta, before, after });
  assert.ok(Math.abs(delta) <= 2, `${label}: document scrolled ${delta}px`);
  for (const key of ['top', 'width', 'height']) assert.ok(Math.abs(before.board[key] - after.board[key]) <= 2, `${label}: board ${key} shifted`);
}
async function tapLocator(page, locator) {
  const r = await locator.boundingBox();
  assert.ok(r, 'Missing touch target');
  assert.ok(r.y + r.height / 2 > 0 && r.y + r.height / 2 < (await page.viewportSize()).height, 'Touch target is offscreen');
  await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
}
const square = (page, name) => page.locator(`[data-square="${name}"]`).first();
async function positionForMove(page, from, to) {
  const a = await square(page, from).boundingBox(), b = await square(page, to).boundingBox();
  const height = page.viewportSize().height;
  if (Math.min(a.y, b.y) < 70 || Math.max(a.y + a.height, b.y + b.height) > height - 6) {
    // An explicit user scroll is setup for short landscape screens, never part of a move assertion.
    await page.evaluate(y => window.scrollBy(0, y), (a.y + a.height / 2 + b.y + b.height / 2) / 2 - height / 2);
    await settle(page);
  }
}
async function tapMove(page, from, to, label) {
  await positionForMove(page, from, to);
  const before = await measure(page), previous = await count(page);
  await tapLocator(page, square(page, from));
  await tapLocator(page, square(page, to));
  await page.waitForFunction(n => Number(document.querySelector('.move-count')?.textContent) > n, previous);
  await settle(page);
  stable(before, await measure(page), label);
}
async function fresh(viewport = { width: 390, height: 844 }, options = {}) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 1000, hasTouch: true, locale: 'es-GT', timezoneId: 'America/Guatemala', reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  await page.goto(origin + '/#/play', { waitUntil: 'load' });
  await square(page, 'e2').waitFor();
  await settle(page);
  return { page, context };
}
async function check(name, run) {
  const started = Date.now();
  try { await run(); report.checks.push({ name, result: 'PASS', ms: Date.now() - started }); console.log('PASS', name); }
  catch (error) { report.checks.push({ name, result: 'FAIL', error: String(error.stack || error).slice(0,2200) }); console.error('FAIL', name, error.message); }
}
(async () => {
  await fs.mkdir(OUT, { recursive: true });
  report.baseSha = execFileSync('git', ['rev-parse','HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  report.sourceSha256 = crypto.createHash('sha256').update(await fs.readFile(path.join(ROOT,'src/components/MoveHistory.tsx'))).update(await fs.readFile(path.join(ROOT,'src/components/studio/PlayView.tsx'))).update(await fs.readFile(path.join(ROOT,'src/styles/design-system.css'))).digest('hex');
  const { createServer } = await import('vite');
  server = await createServer({ root: ROOT, server: { host: '127.0.0.1', port: 0 }, cacheDir: path.join(os.tmpdir(),'chessy-mobile-vite-cache') });
  await server.listen();
  origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true });
  report.browser = browser.version();
  try {
    for (const viewport of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:760,height:1024},{width:844,height:390},{width:1440,height:1000}]) {
      await check(`Legal tap moves preserve viewport at ${viewport.width}x${viewport.height}`, async () => {
        const { page, context } = await fresh(viewport);
        try {
          for (const [from,to] of [['e2','e4'],['e7','e5'],['g1','f3'],['b8','c6']]) await tapMove(page, from, to, `${viewport.width}: ${from}-${to}`);
          const state = await measure(page);
          assert.ok(state.scrollWidth <= viewport.width + 1, 'Horizontal overflow');
          const notation = await page.locator('.board-notation__label').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
          for (const r of notation) { assert.ok(r.left >= state.board.left && r.right <= state.board.right + 1, 'Coordinate outside board width'); assert.ok(r.top >= state.board.top && r.bottom <= state.board.bottom + 1, 'Coordinate overlaps a player bar'); }
          if (viewport.width === 390) {
            assert.ok(state.controls.top >= state.stage.bottom, 'Actions must follow player bars');
            assert.ok(state.controls.bottom <= viewport.height, 'Primary actions are below the fold');
            for (const target of await page.locator('.game-core-actions .btn, .resign-link').all()) assert.ok((await target.boundingBox()).height >= 44, 'Small touch target');
            await page.screenshot({path:path.join(OUT,'mobile-after.png'),fullPage:true});
          }
          if (viewport.width === 1440) await page.screenshot({path:path.join(OUT,'desktop-after.png'),fullPage:true});
        } finally { await context.close(); }
      });
    }
    for (const reducedMotion of ['reduce','no-preference']) await check(`Touch drag at a deliberate scroll offset stays stable (${reducedMotion})`, async () => {
      const {page,context} = await fresh(undefined,{reducedMotion});
      try {
        await page.evaluate(() => window.scrollTo(0,60)); await settle(page);
        const before = await measure(page), a = await square(page,'e2').boundingBox(), b = await square(page,'e4').boundingBox();
        const session = await context.newCDPSession(page), point = (x,y) => ({x,y,radiusX:1,radiusY:1,force:1,id:1});
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(a.x+a.width/2,a.y+a.height/2)]});
        for(let i=1;i<=12;i++) await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(a.x+a.width/2,(a.y+a.height/2)+(b.y-a.y)*i/12)]});
        await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await session.detach();
        await page.waitForFunction(()=>document.querySelector('.move-count')?.textContent==='1'); await settle(page);
        stable(before, await measure(page), `drag ${reducedMotion}`);
      } finally { await context.close(); }
    });
    await check('Long score sheet follows internally, respects manual review and resumes at its end', async () => {
      const {page,context} = await fresh();
      try {
        // A legal deterministic fixture fills the score sheet; assertions below use real board taps.
        await page.evaluate(async()=>{const {useGameStore}=await import('/src/store/gameStore.ts');const opening=['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O','h3','Nb8','d4','Nbd7','c4','c6','Nc3','Bb7','a3','Re8','Ba2','Bf8','b4','exd4','Nxd4','Ne5'];for(const san of opening){const game=useGameStore.getState();const move=game.chess.moves({verbose:true}).find(m=>m.san===san);if(!move||!game.makeMove(move.from,move.to,move.promotion))throw new Error('Bad opening fixture '+san);}});
        await settle(page);
        const list = page.locator('.move-history-list');
        const atEnd = () => list.evaluate(node=>({top:node.scrollTop,gap:node.scrollHeight-node.clientHeight-node.scrollTop}));
        assert.ok((await atEnd()).top > 0, 'Fixture does not overflow'); assert.ok((await atEnd()).gap <= 2, 'Latest move is not shown');
        await list.evaluate(node=>{node.scrollTop=0;node.dispatchEvent(new Event('scroll'));});
        await tapMove(page,'c4','b5','manual history review');
        assert.equal((await atEnd()).top,0, 'New move displaced manual history review');
        await list.evaluate(node=>{node.scrollTop=node.scrollHeight;node.dispatchEvent(new Event('scroll'));});
        await tapMove(page,'a6','b5','resume history follow');
        assert.ok((await atEnd()).gap <= 2, 'History did not resume following');
        assert.equal(await list.getAttribute('tabindex'),'0');
        assert.ok(await list.getAttribute('aria-label'),'Scrollable history needs an accessible name');
      } finally { await context.close(); }
    });
    await check('Real Stockfish thinking, replies, undo and reset preserve mobile board position', async () => {
      const {page,context} = await fresh();
      try {
        await page.locator('.ai-configure').click(); await page.locator('.ai-game-setup select').first().selectOption('beginner');
        await page.getByRole('button',{name:'Comenzar partida',exact:true}).click();
        await page.evaluate(()=>window.scrollTo(0,0)); await settle(page);
        assert.equal(await page.locator('.ai-opponent').isVisible(),false, 'Mobile engine setup duplicates the player bar');
        assert.match(await page.locator('.match-player-bar').first().innerText(),/Stockfish/);
        await page.evaluate(async()=>{const {useGameStore}=await import('/src/store/gameStore.ts');window.__mobileThinking=[];useGameStore.subscribe(state=>window.__mobileThinking.push({thinking:state.isAIThinking,scroll:scrollY}));});
        const before=await measure(page); await tapMove(page,'e2','e4','human AI opening');
        await page.waitForFunction(()=>document.querySelector('.move-count')?.textContent==='2',undefined,{timeout:20000}); await settle(page);
        stable(before,await measure(page),'Stockfish reply');
        assert.ok(await page.evaluate(()=>window.__mobileThinking.some(s=>s.thinking)),'Thinking state was not exercised');
        assert.equal(await page.locator('.feedback.wrong').count(),0,'Engine error');
        let prior=await measure(page); await tapLocator(page,page.getByRole('button',{name:'Deshacer',exact:true}));
        await page.waitForFunction(()=>document.querySelector('.move-count')?.textContent==='0'); await settle(page); stable(prior,await measure(page),'AI undo');
        prior=await measure(page); await tapLocator(page,page.getByRole('button',{name:'Nueva partida',exact:true})); await settle(page); stable(prior,await measure(page),'reset');
        assert.equal(await page.locator('.ai-opponent').isVisible(),true,'Setup did not return after reset');
        await page.screenshot({path:path.join(OUT,'mobile-reset.png'),fullPage:true});
      } finally { await context.close(); }
    });
    await check('Playing black keeps the reversed board stable through an engine reply', async()=>{
      const {page,context}=await fresh();
      try {
        await page.locator('.ai-configure').click();await page.locator('.ai-game-setup select').first().selectOption('beginner');
        await page.locator('.ai-color-segment button').nth(1).click(); await page.getByRole('button',{name:'Comenzar partida',exact:true}).click();
        await page.waitForFunction(()=>document.querySelector('.move-count')?.textContent==='1',undefined,{timeout:20000});await page.evaluate(()=>window.scrollTo(0,0));await settle(page);
        assert.equal(await page.locator('.match-player-bar').last().getAttribute('data-player-color'),'black');
        const before=await measure(page);await tapMove(page,'e7','e5','black response');
        await page.waitForFunction(()=>document.querySelector('.move-count')?.textContent==='3',undefined,{timeout:20000});await settle(page);stable(before,await measure(page),'reversed board engine reply');
        await page.screenshot({path:path.join(OUT,'mobile-ai-black.png'),fullPage:true});
      } finally {await context.close();}
    });
    for(const lang of ['es','en','pt']) await check(`Mobile action layout and WCAG AA in ${lang}`,async()=>{
      const {page,context}=await fresh();
      try {
        await page.evaluate(async lang=>{const {default:i18n}=await import('/src/i18n.ts');await i18n.changeLanguage(lang);},lang);await settle(page);
        await tapMove(page,'e2','e4',`${lang} opening`);
        const state=await measure(page);assert.ok(state.scrollWidth<=390,'Translated layout overflows');
        const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
        assert.equal(results.violations.length,0,results.violations.map(v=>`${v.id}: ${v.nodes.map(n=>n.target).join(',')}`).join('\n'));
      } finally {await context.close();}
    });
    await check('No uncaught page errors',async()=>assert.deepEqual(report.pageErrors,[]));
  } finally {
    report.passed=report.checks.filter(c=>c.result==='PASS').length;report.failed=report.checks.filter(c=>c.result==='FAIL').length;
    await fs.writeFile(path.join(OUT,'verification.json'),JSON.stringify(report,null,2));
    await browser.close();await server.close();
  }
  console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:path.join(OUT,'verification.json')}));
  if(report.failed)process.exitCode=1;
})().catch(async error=>{console.error(error);if(browser)await browser.close();if(server)await server.close();process.exitCode=1;});
