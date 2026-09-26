const assert = require('assert');
const Stopwatch = require('../lib/stopwatch.js');

module.exports = test => {
  test('stopwatch: starts at zero and not running', () => {
    const sw = new Stopwatch();
    assert.strictEqual(sw.elapsed(5000), 0);
    assert.strictEqual(sw.started, false);
  });

  test('stopwatch: counts while running and holds when stopped', () => {
    const sw = new Stopwatch();
    sw.start(1000);
    assert.strictEqual(sw.elapsed(3500), 2500);
    sw.stop(4000);
    assert.strictEqual(sw.elapsed(99999), 3000);
  });

  test('stopwatch: resumes adding to earlier time', () => {
    const sw = new Stopwatch();
    sw.start(0); sw.stop(1000);
    sw.start(5000);
    assert.strictEqual(sw.elapsed(5500), 1500);
  });

  test('stopwatch: start and stop twice are ignored', () => {
    const sw = new Stopwatch();
    sw.start(0); sw.start(500);
    sw.stop(1000); sw.stop(2000);
    assert.strictEqual(sw.elapsed(3000), 1000);
  });

  test('stopwatch: laps record lap time and total', () => {
    const sw = new Stopwatch();
    sw.start(0);
    sw.lap(1000); sw.lap(3500); sw.lap(4000);
    assert.deepStrictEqual(sw.laps(), [
      { number: 1, time: 1000, total: 1000 },
      { number: 2, time: 2500, total: 3500 },
      { number: 3, time: 500, total: 4000 },
    ]);
    assert.strictEqual(sw.currentLap(4200), 200);
    assert.deepStrictEqual(sw.extremes(), { fastest: 3, slowest: 2 });
  });

  test('stopwatch: no fastest/slowest with a single lap', () => {
    const sw = new Stopwatch();
    sw.start(0); sw.lap(1000);
    assert.deepStrictEqual(sw.extremes(), { fastest: null, slowest: null });
  });

  test('stopwatch: lap is ignored while stopped', () => {
    const sw = new Stopwatch();
    sw.lap(100);
    assert.strictEqual(sw.laps().length, 0);
  });

  test('stopwatch: reset only when stopped', () => {
    const sw = new Stopwatch();
    sw.start(0); sw.lap(500);
    sw.reset();
    assert.strictEqual(sw.laps().length, 1, 'reset ignored while running');
    sw.stop(1000); sw.reset();
    assert.strictEqual(sw.elapsed(2000), 0);
    assert.strictEqual(sw.laps().length, 0);
  });

  test('stopwatch: survives a save and reload while running', () => {
    const sw = new Stopwatch();
    sw.start(1000); sw.lap(2000);
    const restored = new Stopwatch(JSON.parse(JSON.stringify(sw)));
    assert.strictEqual(restored.elapsed(61000), 60000);
    assert.strictEqual(restored.laps().length, 1);
  });

  test('stopwatch: ignores corrupt saved data', () => {
    const sw = new Stopwatch({ running: 'yes', startedAt: 'x', splits: 'nope' });
    assert.deepStrictEqual(sw.splits, []);
    assert.strictEqual(sw.startedAt, 0);
  });
};
