const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'http://localhost:4318';
const OUT = path.join(ROOT, 'progress/evidence/browser/theme-verification.json');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.wasm': 'application/wasm' };
const FREE_IDS = ['forest', 'ivory', 'night', 'guatemala', 'colombia', 'mexico', 'brasil', 'usa', 'argentina', 'espana', 'chile', 'peru', 'costarica', 'japon'];
const PREMIUM_IDS = ['obsidian', 'porcelain', 'midnight', 'walnut'];

async function assertNoOverflow(page, description) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth, scroll: document.documentElement.scrollWidth,
  }));
  assert.ok(dimensions.scroll <= dimensions.viewport + 1, `${description}: overflow ${dimensions.scroll}/${dimensions.viewport}`);
}

async function selectTheme(page, id) {
  await page.locator(`[data-atlas-theme="${id}"]`).click();
  const modal = page.getByRole('dialog');
  await modal.waitFor({ state: 'visible' });
  await modal.locator('.theme-preview-dialog__actions .btn.primary').click();
  await modal.waitFor({ state: 'hidden' });
  await page.waitForFunction(themeId => document.documentElement.dataset.visualTheme === themeId, id);
}

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

  await page.goto(`${ORIGIN}/#/themes`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-atlas-theme]').count(), FREE_IDS.length + PREMIUM_IDS.length);
  assert.equal(await page.locator('.theme-collection--premium [data-atlas-theme]').count(), PREMIUM_IDS.length);
  const galleryAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(galleryAxe.violations.map(v => v.id), [], 'gallery WCAG violations');
  await page.screenshot({ path: path.join(ROOT, 'progress/evidence/browser/chessy-atlas-v2-desktop.png'), fullPage: true });

  for (const id of FREE_IDS) {
    await page.goto(`${ORIGIN}/#/themes`, { waitUntil: 'networkidle' });
    await selectTheme(page, id);
    const shell = await page.evaluate(() => ({
      theme: document.documentElement.dataset.visualTheme,
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      stored: localStorage.getItem('chessy-visual-theme-v2'),
    }));
    assert.equal(shell.theme, id);
    assert.equal(shell.stored, id, 'selection persisted');
    assert.ok(shell.accent);
    await assertNoOverflow(page, `${id} gallery desktop`);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.visualTheme), id, 'persists across reload');

    await page.goto(`${ORIGIN}/#/play`, { waitUntil: 'networkidle' });
    const boardA1 = await page.locator('[data-square="a1"] > div').first().evaluate(el => getComputedStyle(el).backgroundColor);
    const playAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(playAxe.violations.map(v => v.id), [], `${id} Play WCAG`);
    themes.push({ id, accent: shell.accent, boardA1, persistence: 'PASS', playWcag: 'PASS' });
  }

  // Discoverable previews must never grant access without a verified Firebase claim.
  for (const id of PREMIUM_IDS) {
    await page.goto(`${ORIGIN}/#/themes`, { waitUntil: 'networkidle' });
    const before = await page.evaluate(() => ({
      active: document.documentElement.dataset.visualTheme,
      saved: localStorage.getItem('chessy-visual-theme-v2'),
    }));
    await page.locator(`[data-atlas-theme="${id}"]`).click();
    const modal = page.getByRole('dialog');
    await modal.waitFor({ state: 'visible' });
    const apply = modal.getByRole('button', { name: /premium/i });
    assert.equal(await apply.isDisabled(), true, `${id} must be locked to guests`);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(axe.violations.map(v => v.id), [], `${id} modal WCAG`);
    await modal.locator('.theme-preview-dialog__actions .btn.secondary').click();
    await modal.waitFor({ state: 'hidden' });
    const after = await page.evaluate(() => ({
      active: document.documentElement.dataset.visualTheme,
      saved: localStorage.getItem('chessy-visual-theme-v2'),
    }));
    assert.deepEqual(after, before, `${id} preview must not apply or persist`);
  }

  // A stored premium ID does not grant access to the signed-out/anonymous user.
  await page.evaluate(() => localStorage.setItem('chessy-visual-theme-v2', 'obsidian'));
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => document.documentElement.dataset.visualTheme), 'forest', 'premium spoof blocked');

  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of FREE_IDS) {
    await page.goto(`${ORIGIN}/#/themes`, { waitUntil: 'networkidle' });
    await selectTheme(page, id);
    await assertNoOverflow(page, `${id} mobile 390`);
  }
  await page.goto(`${ORIGIN}/#/themes`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ROOT, 'progress/evidence/browser/chessy-atlas-v2-mobile.png'), fullPage: true });
  await page.locator('[data-atlas-theme="obsidian"]').click();
  await assertNoOverflow(page, 'premium modal mobile 390');
  const mobileModalAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(mobileModalAxe.violations.map(v => v.id), [], 'premium mobile modal WCAG');
  await page.keyboard.press('Escape');

  for (const width of [320, 760, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await assertNoOverflow(page, `gallery ${width}`);
  }
  await page.evaluate(() => localStorage.setItem('chessy-visual-theme-v2', 'forest'));

  assert.deepEqual(pageErrors, []);
  const report = { result: 'PASS', count: FREE_IDS.length + PREMIUM_IDS.length, free: FREE_IDS.length, lockedPremium: PREMIUM_IDS, themes, desktopGalleryWCAG: 'PASS', premiumModalWCAG: 'PASS', responsive: [320, 390, 760, 1024, 1440], unauthorizedApply: 'BLOCKED', pageErrors };
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
})().catch(error => { console.error(error.stack || error); process.exit(1); });
