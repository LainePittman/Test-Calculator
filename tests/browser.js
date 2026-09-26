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
async function textFits(p, selector) {
  const fits = await p.$eval(selector, el => {
    const box = el.parentElement;
    const cs = getComputedStyle(box);
    return el.scrollWidth <= box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 1;
  });
  assert.ok(fits, `${selector} text overflows its panel`);
}
async function fullyVisible(p, selector) {
  const ok = await p.$eval(selector, el => el.scrollWidth <= el.clientWidth + 1);
  assert.ok(ok, `${selector} text is cut off`);
}
async function oneLine(p, selector) {
  const ok = await p.$$eval(selector, els => els.every(e => {
    const lh = parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.3;
    return e.getBoundingClientRect().height < lh * 2 + parseFloat(getComputedStyle(e).paddingTop) * 2;
  }));
  assert.ok(ok, `${selector} wraps onto two lines`);
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

// ---- Stopwatch ------------------------------------------------------------------
const T0 = new Date('2026-01-01T09:00:00Z');
async function openTool(p, id) {
  await p.click(`[data-tab="${id}"]`);
  assert.ok(await p.isVisible(`#tool-${id}`), `${id} panel visible`);
}
const laps = p => p.$$eval('#sw-laps li', rows => rows.map(r => ({
  text: [...r.children].map(c => c.textContent).join(' '), cls: r.className })));

suite('stopwatch: start, stop and exact time', async p => {
  await openTool(p, 'stopwatch');
  assert.strictEqual(await p.textContent('#tool-title'), 'Stopwatch');
  assert.strictEqual(await p.textContent('#sw-time'), '00:00.00');
  assert.ok(await p.isDisabled('#sw-secondary'), 'Lap disabled before starting');
  await p.click('#sw-primary');
  assert.strictEqual(await p.textContent('#sw-primary'), 'Stop');
  await p.clock.runFor(1500);
  await p.click('#sw-primary');
  assert.strictEqual(await p.textContent('#sw-time'), '00:01.50');
  assert.strictEqual(await p.textContent('#sw-secondary'), 'Reset');
});

suite('stopwatch: laps, fastest and slowest, reset', async p => {
  await openTool(p, 'stopwatch');
  await p.click('#sw-primary');
  await p.clock.runFor(1000); await p.click('#sw-secondary');
  await p.clock.runFor(3000); await p.click('#sw-secondary');
  await p.clock.runFor(500); await p.click('#sw-secondary');
  await p.clock.runFor(250);
  await p.click('#sw-primary');
  assert.deepStrictEqual(await laps(p), [
    { text: 'Lap 4 00:00.25', cls: '' },
    { text: 'Lap 3 00:00.50', cls: 'lap-fastest' },
    { text: 'Lap 2 00:03.00', cls: 'lap-slowest' },
    { text: 'Lap 1 00:01.00', cls: '' },
  ]);
  assert.strictEqual(await p.textContent('#sw-time'), '00:04.75');
  await shot(p, 'stopwatch-laps');
  await p.click('#sw-secondary'); // Reset
  assert.strictEqual(await p.textContent('#sw-time'), '00:00.00');
  assert.deepStrictEqual(await laps(p), []);
  assert.ok(await p.isDisabled('#sw-secondary'));
});

suite('stopwatch: keeps running while on another tool', async p => {
  await openTool(p, 'stopwatch');
  await p.click('#sw-primary');
  await openTool(p, 'calculator');
  await p.clock.runFor(3000);
  await openTool(p, 'stopwatch');
  assert.strictEqual(await p.textContent('#sw-time'), '00:03.00');
});

suite('stopwatch: survives closing the app', async p => {
  await openTool(p, 'stopwatch');
  await p.click('#sw-primary');
  await p.clock.runFor(2000);
  await p.click('#sw-primary');
  await p.reload();
  assert.strictEqual(await p.textContent('#tool-title'), 'Stopwatch', 'reopens on the last tool');
  assert.strictEqual(await p.textContent('#sw-time'), '00:02.00');
  assert.strictEqual(await p.textContent('#sw-secondary'), 'Reset');
  await p.click('#sw-primary');
  await p.reload();
  assert.strictEqual(await p.textContent('#sw-primary'), 'Stop', 'still running after reload');
});

suite('stopwatch: keyboard (space, L, R)', async p => {
  await openTool(p, 'stopwatch');
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('Space');
  await p.clock.runFor(1000);
  await p.keyboard.press('l');
  await p.keyboard.press('Space');
  assert.strictEqual((await laps(p)).length, 2);
  await p.keyboard.press('r');
  assert.strictEqual(await p.textContent('#sw-time'), '00:00.00');
});

for (const id of ['classic', 'pixel']) {
  suite(`stopwatch (${id}): hour-long times fit, layout`, async p => {
    await p.evaluate(() => localStorage.setItem('stopwatch',
      JSON.stringify({ running: false, banked: 3_723_450, splits: [1_000_000, 2_500_000] })));
    await p.reload();
    await setTheme(p, id);
    await openTool(p, 'stopwatch');
    assert.strictEqual(await p.textContent('#sw-time'), '1:02:03.45');
    assert.ok(await p.evaluate(() => {
      const t = document.getElementById('sw-time');
      return t.scrollWidth <= t.parentElement.clientWidth;
    }), 'long time fits');
    await noHorizontalScroll(p);
    await fitsInViewport(p, '#sw-primary');
    await shot(p, `stopwatch-${id}`);
    await p.setViewportSize({ width: 320, height: 568 });
    await noHorizontalScroll(p);
    await fitsInViewport(p, '#sw-primary');
  });
}

// ---- Timer ----------------------------------------------------------------------
const entryText = p => p.$eval('#timer-entry', e => e.textContent.replace(/\s+/g, ' ').trim());
async function typeTimer(p, digits) {
  for (const d of digits) await p.click(`.timer-keypad [data-digit="${d}"]`);
}

suite('timer: keypad entry, delete and presets', async p => {
  await openTool(p, 'timer');
  assert.strictEqual(await entryText(p), '00h 00m 00s');
  assert.ok(await p.isDisabled('#timer-start'), 'Start disabled at zero');
  await typeTimer(p, '130');
  assert.strictEqual(await entryText(p), '00h 01m 30s');
  assert.ok(!(await p.isDisabled('#timer-start')));
  await p.click('.timer-keypad [data-action="backspace"]');
  assert.strictEqual(await entryText(p), '00h 00m 13s');
  await p.click('[data-preset="300000"]');
  assert.strictEqual(await entryText(p), '00h 05m 00s');
  await shot(p, 'timer-setup-classic');
});

suite('timer: counts down, pauses, resumes, adds a minute', async p => {
  await openTool(p, 'timer');
  await typeTimer(p, '130');
  await p.click('#timer-start');
  assert.ok(await p.isVisible('#timer-run'));
  assert.strictEqual(await p.textContent('#timer-left'), '1:30');
  assert.match(await p.textContent('#timer-status'), /^Ends at /);
  await p.clock.runFor(30_000);
  assert.strictEqual(await p.textContent('#timer-left'), '1:00');
  const progress = await p.$eval('#timer-meter', m => +m.style.getPropertyValue('--progress'));
  assert.ok(Math.abs(progress - 2 / 3) < 0.01, `progress ${progress}`);
  await p.click('#timer-toggle');
  assert.strictEqual(await p.textContent('#timer-status'), 'Paused');
  assert.strictEqual(await p.textContent('#timer-toggle'), 'Resume');
  await p.clock.runFor(60_000);
  assert.strictEqual(await p.textContent('#timer-left'), '1:00', 'holds while paused');
  await p.click('#timer-toggle');
  await p.click('#timer-add');
  assert.strictEqual(await p.textContent('#timer-left'), '2:00');
  await shot(p, 'timer-running-classic');
  await p.click('#timer-cancel');
  assert.ok(await p.isVisible('#timer-setup'));
  assert.strictEqual(await entryText(p), '00h 01m 30s', 'last length ready again');
});

suite('timer: rings when done, even from another tool', async p => {
  await openTool(p, 'timer');
  await typeTimer(p, '5');
  await p.click('#timer-start');
  await openTool(p, 'calculator');
  await p.clock.runFor(6000);
  assert.strictEqual(await p.textContent('#tool-title'), 'Timer', 'switched to the timer');
  assert.strictEqual(await p.textContent('#timer-status'), "Time's up");
  assert.strictEqual(await p.textContent('#timer-left'), '0:00');
  assert.ok(await p.$eval('#timer-readout', r => r.classList.contains('alarm')));
  assert.ok(!(await p.isVisible('#timer-cancel')), 'only Stop is offered');
  assert.strictEqual(await p.textContent('#timer-toggle'), 'Stop');
  await shot(p, 'timer-done-classic');
  await p.click('#timer-add'); // snooze a minute
  assert.strictEqual(await p.textContent('#timer-left'), '1:00');
  await p.clock.runFor(61_000);
  await p.click('#timer-toggle'); // Stop
  assert.ok(await p.isVisible('#timer-setup'));
  assert.strictEqual(await entryText(p), '00h 00m 05s');
});

suite('timer: survives closing the app, and opens if it finished meanwhile', async p => {
  await openTool(p, 'timer');
  await typeTimer(p, '100');
  await p.click('#timer-start');
  await p.clock.runFor(10_000);
  await p.reload();
  assert.strictEqual(await p.textContent('#timer-left'), '0:50');
  await openTool(p, 'calculator');
  await p.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('timer'));
    saved.timer.endsAt = Date.now() - 5000;
    localStorage.setItem('timer', JSON.stringify(saved));
  });
  await p.reload();
  assert.strictEqual(await p.textContent('#tool-title'), 'Timer');
  assert.strictEqual(await p.textContent('#timer-status'), "Time's up");
});

suite('timer: keyboard', async p => {
  await openTool(p, 'timer');
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.type('15');
  await p.keyboard.press('Enter');
  assert.strictEqual(await p.textContent('#timer-left'), '0:15');
  await p.keyboard.press('Space');
  assert.strictEqual(await p.textContent('#timer-status'), 'Paused');
  await p.keyboard.press('Escape');
  assert.ok(await p.isVisible('#timer-setup'));
});

for (const id of ['classic', 'pixel']) {
  suite(`timer (${id}): layout`, async p => {
    await setTheme(p, id);
    await openTool(p, 'timer');
    await typeTimer(p, '13000');
    await noHorizontalScroll(p);
    await textFits(p, '#timer-entry');
    await fitsInViewport(p, '#timer-start');
    await shot(p, `timer-setup-${id}`);
    await p.click('#timer-start');
    assert.strictEqual(await p.textContent('#timer-left'), '1:30:00');
    await p.clock.runFor(20 * 60_000);
    await noHorizontalScroll(p);
    await fitsInViewport(p, '#timer-toggle');
    await shot(p, `timer-running-${id}`);
    await p.setViewportSize({ width: 320, height: 568 });
    await p.click('#timer-cancel');
    await noHorizontalScroll(p);
    await textFits(p, '#timer-entry');
    await oneLine(p, '#timer-presets .chip');
    await p.locator('#timer-start').scrollIntoViewIfNeeded();
    await fitsInViewport(p, '#timer-start');
    await shot(p, `timer-small-${id}`);
  });
}

// ---- Unit converter ------------------------------------------------------------
const result = p => p.textContent('#conv-result');
async function amount(p, text) {
  await p.fill('#conv-value', text);
}

suite('convert: miles to km by default, converts as you type', async p => {
  await openTool(p, 'convert');
  assert.strictEqual(await p.textContent('#tool-title'), 'Unit Converter');
  assert.strictEqual(await p.getAttribute('[data-category="length"]', 'aria-pressed'), 'true');
  assert.strictEqual(await result(p), '1.609344');
  assert.strictEqual(await p.textContent('#conv-formula'), '1 mi = 1.609344 km');
  await amount(p, '26.2');
  assert.strictEqual(await result(p), '42.1648128');
  await amount(p, '1,000');
  assert.strictEqual(await result(p), '1,609.344');
});

suite('convert: swap, change units, categories', async p => {
  await openTool(p, 'convert');
  await amount(p, '10');
  await p.click('#conv-swap');
  assert.strictEqual(await p.inputValue('#conv-from'), 'km');
  assert.strictEqual(await p.inputValue('#conv-to'), 'mi');
  assert.strictEqual(await result(p), '6.21371192237');
  await p.selectOption('#conv-to', 'm');
  assert.strictEqual(await result(p), '10,000');

  await p.click('[data-category="temperature"]');
  assert.strictEqual(await p.inputValue('#conv-from'), 'f');
  await amount(p, '212');
  assert.strictEqual(await result(p), '100');
  await amount(p, '-40');
  assert.strictEqual(await result(p), '−40');

  await p.click('[data-category="volume"]');
  await amount(p, '1');
  assert.strictEqual(await p.textContent('#conv-formula'), '1 cup = 236.5882365 mL');

  await p.click('[data-category="weight"]');
  await amount(p, '1,5'); // comma as decimal point
  assert.strictEqual(await result(p), '0.680388555');

  await p.click('[data-category="length"]');
  assert.strictEqual(await p.inputValue('#conv-from'), 'km', 'remembers units per category');
  assert.strictEqual(await p.inputValue('#conv-to'), 'm');
});

suite('convert: flags input that is not a number', async p => {
  await openTool(p, 'convert');
  await amount(p, 'abc');
  assert.strictEqual(await result(p), '—');
  assert.strictEqual(await p.getAttribute('#conv-value', 'aria-invalid'), 'true');
  await amount(p, '');
  assert.strictEqual(await p.getAttribute('#conv-value', 'aria-invalid'), 'false', 'empty is not an error');
  await amount(p, '5');
  assert.strictEqual(await p.getAttribute('#conv-value', 'aria-invalid'), 'false');
});

suite('convert: remembers everything after closing', async p => {
  await openTool(p, 'convert');
  await p.click('[data-category="speed"]');
  await p.selectOption('#conv-from', 'kn');
  await amount(p, '30');
  await p.reload();
  assert.strictEqual(await p.textContent('#tool-title'), 'Unit Converter');
  assert.strictEqual(await p.getAttribute('[data-category="speed"]', 'aria-pressed'), 'true');
  assert.strictEqual(await p.inputValue('#conv-value'), '30');
  assert.strictEqual(await p.inputValue('#conv-from'), 'kn');
  assert.strictEqual(await result(p), '55.56');
});

suite('convert: typing in the amount does not reach other tools', async p => {
  await openTool(p, 'convert');
  await p.click('#conv-value');
  await p.keyboard.type('77');
  await p.keyboard.press('Enter');
  await openTool(p, 'calculator');
  assert.strictEqual(await p.textContent('#calc-result'), '0');
});

for (const id of ['classic', 'pixel']) {
  suite(`convert (${id}): layout`, async p => {
    await setTheme(p, id);
    await openTool(p, 'convert');
    await amount(p, '123456789');
    await p.selectOption('#conv-to', 'mm');
    assert.strictEqual(await result(p), '198,684,442,636,000'); // 198,684,442,636,416 to 12 significant digits
    await fullyVisible(p, '#conv-result');
    await fullyVisible(p, '#conv-value');
    await noHorizontalScroll(p);
    await fitsInViewport(p, '#conv-formula');
    await oneLine(p, '#conv-categories .chip');
    await shot(p, `convert-${id}`);
    await p.setViewportSize({ width: 320, height: 568 });
    await p.click('[data-category="temperature"]');
    await fullyVisible(p, '#conv-result');
    await noHorizontalScroll(p);
    await fitsInViewport(p, '#conv-formula');
    await shot(p, `convert-small-${id}`);
  });
}

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
      await p.clock.install({ time: T0 });
      await p.goto(url);
      await p.clock.pauseAt(new Date(T0.getTime() + 1000));
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
