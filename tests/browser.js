// Browser tests at phone size: npm run test:browser
// Set CHROMIUM_PATH to use an existing Chromium; set SCREENSHOTS=1 to save screenshots.
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const shotsDir = path.join(root, 'test-screenshots');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const target = file.endsWith(path.sep) ? path.join(file, 'index.html') : file;
    if (!target.startsWith(root) || !fs.existsSync(target)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise(r => server.listen(0, () => r(server)));
}

const suites = [];
const suite = (name, fn) => suites.push({ name, fn });

// ---- Helpers ----------------------------------------------------------------
const theme = p => p.evaluate(() => document.documentElement.dataset.appTheme);
async function setTheme(p, id) {
  await p.click('#settings-btn');
  await p.click(`[data-theme-id="${id}"]`);
  await p.click('#settings-done');
}
async function noHorizontalScroll(p) {
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'page scrolls sideways');
}
async function fitsInViewport(p, selector) {
  const box = await p.locator(selector).boundingBox();
  const vh = p.viewportSize().height;
  assert.ok(box && box.y + box.height <= vh + 1, `${selector} is cut off (${box && box.y + box.height} > ${vh})`);
}
async function shot(p, name) {
  if (!process.env.SCREENSHOTS) return;
  fs.mkdirSync(shotsDir, { recursive: true });
  await p.screenshot({ path: path.join(shotsDir, name + '.png') });
}
async function press(p, ...selectors) { for (const s of selectors) await p.click(s); }

// ---- Shell & themes -------------------------------------------------------------
suite('shell: opens on the calculator with Classic theme', async p => {
  assert.strictEqual(await theme(p), 'classic');
  assert.ok(await p.isVisible('#tool-calculator'));
  assert.strictEqual(await p.textContent('#tool-title'), 'Calculator');
});

suite('shell: theme picker switches, persists and closes', async p => {
  await p.click('#settings-btn');
  assert.ok(await p.isVisible('#settings'));
  await p.click('[data-theme-id="pixel"]');
  assert.strictEqual(await theme(p), 'pixel');
  assert.strictEqual(await p.getAttribute('meta[name="theme-color"]', 'content'), '#1a1c2c');
  await shot(p, 'theme-picker');
  await p.keyboard.press('Escape');
  assert.ok(!(await p.isVisible('#settings')));
  await p.reload();
  assert.strictEqual(await theme(p), 'pixel');
  assert.ok(await p.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some(f => f.family.includes('Press Start 2P') && f.status === 'loaded');
  }), 'pixel font loaded');
  // Tapping outside the sheet closes it.
  await p.click('#settings-btn');
  await p.mouse.click(200, 20);
  assert.ok(!(await p.isVisible('#settings')));
});

suite('shell: keeps a theme saved by the calculator-only version', async p => {
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('calc-theme', 'pixel'); });
  await p.reload();
  assert.strictEqual(await theme(p), 'pixel');
});

// ---- Calculator -----------------------------------------------------------------
for (const id of ['classic', 'pixel']) {
  suite(`calculator (${id}): math, long numbers, layout`, async p => {
    await setTheme(p, id);
    await press(p, '[data-digit="7"]', '[data-op="*"]', '[data-digit="6"]', '[data-action="equals"]');
    assert.strictEqual(await p.textContent('#calc-result'), '42');
    await press(p, '[data-action="clear"]');
    for (const d of '123456789') await p.click(`#tool-calculator [data-digit="${d}"]`);
    await press(p, '[data-op="*"]', '[data-digit="3"]', '[data-action="equals"]');
    assert.strictEqual(await p.textContent('#calc-result'), '370,370,367');
    assert.ok(await p.evaluate(() => {
      const r = document.getElementById('calc-result');
      return r.scrollWidth <= r.parentElement.clientWidth;
    }), 'long result fits');
    await noHorizontalScroll(p);
    await fitsInViewport(p, '#tool-calculator [data-action="equals"]');
    await shot(p, `calculator-${id}`);
  });
}

suite('calculator: keyboard input', async p => {
  await p.keyboard.type('12+30');
  await p.keyboard.press('Enter');
  assert.strictEqual(await p.textContent('#calc-result'), '42');
});

suite('calculator: fits a short phone screen', async p => {
  await p.setViewportSize({ width: 320, height: 568 });
  for (const id of ['classic', 'pixel']) {
    await setTheme(p, id);
    await fitsInViewport(p, '#tool-calculator [data-action="equals"]');
    await noHorizontalScroll(p);
    await shot(p, `calculator-small-${id}`);
  }
});

// ---- Runner ---------------------------------------------------------------------
(async () => {
  const server = await serve();
  const url = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const only = process.argv[2];
  let failed = 0;
  for (const { name, fn } of suites) {
    if (only && !name.includes(only)) continue;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
      hasTouch: true, isMobile: true });
    const p = await context.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    try {
      await p.clock?.install?.();
      await p.goto(url);
      await fn(p);
      assert.deepStrictEqual(errors, [], 'page errors');
      console.log(`✓ ${name}`);
    } catch (e) {
      failed++;
      console.log(`✗ ${name}\n    ${e.message.split('\n').join('\n    ')}`);
      await shot(p, 'FAILED-' + name.replace(/\W+/g, '-'));
    }
    await context.close();
  }
  await browser.close();
  server.close();
  if (failed) { console.log(`\n${failed} browser test(s) failed`); process.exit(1); }
  console.log('\nAll browser tests passed');
})();
