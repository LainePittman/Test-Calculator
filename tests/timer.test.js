const assert = require('assert');
const Timer = require('../lib/timer.js');

module.exports = test => {
  test('timer: idle by default', () => {
    const t = new Timer();
    assert.strictEqual(t.status(0), 'idle');
    assert.strictEqual(t.remaining(0), 0);
  });

  test('timer: counts down and finishes', () => {
    const t = new Timer();
    t.start(60_000, 1000);
    assert.strictEqual(t.status(1000), 'running');
    assert.strictEqual(t.remaining(31_000), 30_000);
    assert.strictEqual(t.progress(31_000), 0.5);
    assert.strictEqual(t.status(61_000), 'done');
    assert.strictEqual(t.remaining(99_000), 0);
  });

  test('timer: zero or negative length does not start', () => {
    const t = new Timer();
    t.start(0, 0);
    t.start(-5, 0);
    assert.strictEqual(t.status(0), 'idle');
  });

  test('timer: pause holds the time left, resume continues', () => {
    const t = new Timer();
    t.start(10_000, 0);
    t.pause(4000);
    assert.strictEqual(t.status(50_000), 'paused');
    assert.strictEqual(t.remaining(50_000), 6000);
    t.resume(50_000);
    assert.strictEqual(t.remaining(51_000), 5000);
    assert.strictEqual(t.status(56_000), 'done');
  });

  test('timer: cannot pause a finished timer', () => {
    const t = new Timer();
    t.start(1000, 0);
    t.pause(2000);
    assert.strictEqual(t.status(2000), 'done');
  });

  test('timer: +1 minute while running or paused', () => {
    const t = new Timer();
    t.start(30_000, 0);
    t.addTime(60_000, 10_000);
    assert.strictEqual(t.remaining(10_000), 80_000);
    assert.strictEqual(t.duration, 90_000);
    t.pause(20_000);
    t.addTime(60_000, 20_000);
    assert.strictEqual(t.remaining(20_000), 130_000);
  });

  test('timer: cancel returns to idle', () => {
    const t = new Timer();
    t.start(5000, 0);
    t.cancel();
    assert.strictEqual(t.status(1000), 'idle');
  });

  test('timer: survives a save and reload', () => {
    const t = new Timer();
    t.start(120_000, 0);
    const restored = new Timer(JSON.parse(JSON.stringify(t)));
    assert.strictEqual(restored.remaining(60_000), 60_000);
    assert.strictEqual(restored.status(200_000), 'done', 'finishes while the app was closed');
  });

  test('timer: keypad entry fills from the right', () => {
    assert.deepStrictEqual(Timer.entryParts('5'), { h: 0, m: 0, s: 5 });
    assert.deepStrictEqual(Timer.entryParts('500'), { h: 0, m: 5, s: 0 });
    assert.deepStrictEqual(Timer.entryParts('13000'), { h: 1, m: 30, s: 0 });
    assert.deepStrictEqual(Timer.entryParts('12345678'), { h: 34, m: 56, s: 78 }, 'keeps the last 6 digits');
  });

  test('timer: entry converts to milliseconds', () => {
    assert.strictEqual(Timer.entryToMs('500'), 300_000);
    assert.strictEqual(Timer.entryToMs('90'), 90_000, '90 seconds');
    assert.strictEqual(Timer.entryToMs('13000'), 5_400_000);
    assert.strictEqual(Timer.entryToMs(''), 0);
  });

  test('timer: presets convert back to entries', () => {
    assert.strictEqual(Timer.msToEntry(300_000), '500');
    assert.strictEqual(Timer.msToEntry(5_400_000), '13000');
    assert.strictEqual(Timer.msToEntry(0), '');
    assert.strictEqual(Timer.entryToMs(Timer.msToEntry(1_500_000)), 1_500_000);
  });
};
