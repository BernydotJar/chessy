const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'http://localhost:4318';
const OUT = path.join(ROOT, 'progress/evidence/browser/theme-verification.json');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.wasm': 'application/wasm' };
const IDS = ['forest', 'ivory', 'night', 'guatemala', 'colombia', 'mexico', 'brasil', 'usa', 'argentina', 'espana', 'chile'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-GT', reducedMotion: 'reduce' });
  await context.route(ORIGIN + '/**', async route => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.resolve(ROOT, 'dist', pathname === '/' ? 'index.html' : pathname.slice(1));
    if (!file.startsWith(path.join(ROOT, 'dist') + path.sep)) return route.fulfill({ status: 403 });
    try { await route.fulfill({ status: 200, body: await fs.readFile(file), contentType: MIME[path.extname(file)] || 'application/octet-stream' }); }
    catch { await route.fulfill({ status: 404, body: 'Not found' }); }
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const themes = [];

  for (const id of IDS) {
    await page.goto(`${ORIGIN}/#/themes`, { waitUntil: 'networkidle' });
    await page.locator(`[data-atlas-theme="${id}"]`).click();
    await page.waitForFunction(themeId => document.documentElement.dataset.visualTheme === themeId, id);
    const shell = await page.evaluate(() => ({
      theme: document.documentElement.dataset.visualTheme,
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    }));
    const themesAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await page.goto(`${ORIGIN}/#/play`, { waitUntil: 'networkidle' });
    const boardA1 = await page.locator('[data-square="a1"] > div').first().evaluate(el => getComputedStyle(el).backgroundColor);
    const playAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.equal(shell.theme, id);
    assert.ok(shell.accent);
    assert.ok(shell.scrollWidth <= shell.viewportWidth + 1, `${id}: desktop overflow`);
    assert.equal(themesAxe.violations.length, 0, `${id} themes: ${themesAxe.violations.map(v => v.id).join(',')}`);
    assert.equal(playAxe.violations.length, 0, `${id} play: ${playAxe.violations.map(v => v.id).join(',')}`);
    themes.push({ id, accent: shell.accent, boardA1, themesWcag: 'PASS', playWcag: 'PASS' });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of IDS) {
    await page.goto(`${ORIGIN}/#/themes`, { waitUntil: 'networkidle' });
    await page.locator(`[data-atlas-theme="${id}"]`).click();
    await page.waitForFunction(themeId => document.documentElement.dataset.visualTheme === themeId, id);
    const size = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth }));
    assert.ok(size.scrollWidth <= size.viewportWidth + 1, `${id}: mobile overflow ${size.scrollWidth}/${size.viewportWidth}`);
  }

  await page.evaluate(() => localStorage.setItem('chessy-visual-theme-v2', 'forest'));
  assert.deepEqual(pageErrors, []);
  const report = { result: 'PASS', count: IDS.length, themes, mobile390: 'PASS', pageErrors };
  await fs.writeFile(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
})().catch(error => { console.error(error.stack || error); process.exit(1); });
