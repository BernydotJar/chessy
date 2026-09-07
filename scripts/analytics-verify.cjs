const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const ROOT = path.resolve(__dirname, '..');
const PORT = '4327', ORIGIN = `http://127.0.0.1:${PORT}`, MEASUREMENT = 'G-LWQED9BJG6';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const collectPattern = /^https:\/\/(?:www\.|region\d+\.)?google-analytics\.com\/g\/collect/i;
const payload = request => `${request.url()}&${request.postData() || ''}`;
(async()=>{
  const server = spawn(process.execPath, ['scripts/serve-production.mjs'], { cwd: ROOT, env: { ...process.env, PORT, HOST: '127.0.0.1', CHESSY_RELEASE_SHA: 'analytics-verification' }, stdio: ['ignore','pipe','pipe'] });
  let stderr = ''; server.stderr.on('data', d => stderr += d);
  let browser, context;
  try {
    let ready=false; for(let i=0;i<50;i++){ try{ if((await fetch(`${ORIGIN}/health`)).ok){ready=true;break;} }catch{} await sleep(100); } assert.ok(ready, stderr);
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-GT' });
    const collects=[];
    await context.route(collectPattern, async route => { collects.push(payload(route.request())); await route.fulfill({ status: 204, body: '' }); });
    const page = await context.newPage(); const errors=[]; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${ORIGIN}/#/settings`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.removeItem('chessy-analytics-consent-v1'));
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.getByRole('switch', { name: 'Ayudar a mejorar Chessy' }).getAttribute('aria-checked'), 'false');
    await sleep(800);
    assert.equal(collects.length, 0, `analytics emitted before consent: ${collects.join('\n')}`);

    await page.getByRole('switch', { name: 'Ayudar a mejorar Chessy' }).click();
    await page.locator('.analytics-state--ready').waitFor({ timeout: 12000 });
    assert.equal(await page.evaluate(() => localStorage.getItem('chessy-analytics-consent-v1')), 'granted');
    await page.goto(`${ORIGIN}/#/play`, { waitUntil: 'domcontentloaded' });
    for(let i=0;i<50 && !collects.some(row => /(?:^|[&?])en=screen_view(?:&|$)/.test(row));i++) await sleep(100);
    const screen = collects.find(row => /(?:^|[&?])en=screen_view(?:&|$)/.test(row));
    assert.ok(screen, `screen_view collect missing: ${collects.slice(-5).join('\n')}`);
    assert.ok(screen.includes(`tid=${encodeURIComponent(MEASUREMENT)}`) || screen.includes(`tid=${MEASUREMENT}`), 'wrong measurement id');
    const all = collects.join('\n').toLowerCase();
    for(const forbidden of ['fen=', 'pgn=', 'e2e4', 'email=', 'display_name=', 'puzzle_id=', 'answer=']) assert.ok(!all.includes(forbidden), `forbidden analytics payload ${forbidden}`);
    assert.ok(!/uid=|user_id=/.test(all), 'analytics must not bind Firebase user identity');

    await page.goto(`${ORIGIN}/#/settings`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('switch', { name: 'Ayudar a mejorar Chessy' }).click();
    await page.locator('.analytics-state--disabled').waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('chessy-analytics-consent-v1')), 'denied');
    assert.equal(await page.evaluate(id => window[`ga-disable-${id}`] === true, MEASUREMENT), true);
    const before = collects.filter(row => /(?:^|[&?])en=screen_view(?:&|$)/.test(row)).length;
    await page.goto(`${ORIGIN}/#/home`, { waitUntil: 'domcontentloaded' }); await sleep(1200);
    const after = collects.filter(row => /(?:^|[&?])en=screen_view(?:&|$)/.test(row)).length;
    assert.equal(after, before, 'screen_view emitted after consent withdrawal');
    assert.deepEqual(errors, []);
    const result = { analytics: 'PASS', measurementId: MEASUREMENT, defaultOff: 'PASS', explicitOptIn: 'PASS', screenView: 'PASS', sensitivePayloadBoundary: 'PASS', firebaseUserIdNotLinked: 'PASS', withdrawalStopsCollection: 'PASS', pageErrors: [] };
    await fs.mkdir(path.join(ROOT,'progress/evidence/release'),{recursive:true}); await fs.writeFile(path.join(ROOT,'progress/evidence/release/analytics-live-verification.json'),JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result));
  } finally { if(context) await context.close().catch(()=>{}); if(browser) await browser.close().catch(()=>{}); server.kill('SIGTERM'); }
})().catch(e=>{ console.error(e.stack||e); process.exit(1); });
