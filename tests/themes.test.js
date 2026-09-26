const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Themes = require('../themes.js');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

// Every token the default theme defines must be redefined by every other theme,
// so no tool ever shows one theme's colour inside another.
const tokensIn = block => new Set([...block.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
const blockFor = selector => {
  const start = css.indexOf(selector + ' {');
  return start < 0 ? null : css.slice(start, css.indexOf('}', start));
};
const baseTokens = tokensIn(blockFor(':root'));

module.exports = test => {
  test('themes: Art Deco is available', () => assert.strictEqual(Themes.resolve('deco').name, 'Art Deco'));
  test('themes: Classic is the default', () => assert.strictEqual(Themes.list[0].id, 'classic'));
  test('themes: unknown id falls back to Classic', () => assert.strictEqual(Themes.resolve('nope').id, 'classic'));
  test('themes: missing id falls back to Classic', () => assert.strictEqual(Themes.resolve(null).id, 'classic'));
  test('themes: ids are unique', () =>
    assert.strictEqual(new Set(Themes.list.map(t => t.id)).size, Themes.list.length));

  for (const t of Themes.list) {
    test(`themes: ${t.id} has a name, colour and preview`, () =>
      assert.ok(t.name && /^#[0-9a-f]{6}$/i.test(t.color) && t.preview.length === 3));
    test(`themes: ${t.id} has an alarm sound`, () => {
      const { wave, notes, gain } = t.sound || {};
      assert.ok(['sine', 'square', 'triangle', 'sawtooth'].includes(wave), 'wave');
      assert.ok(Array.isArray(notes) && notes.length && notes.every(n => n > 100 && n < 5000), 'notes in Hz');
      assert.ok(gain > 0 && gain <= 0.5, 'gain');
    });
    if (t === Themes.list[0]) continue;
    test(`themes: ${t.id} defines every shared token`, () => {
      const block = blockFor(`:root[data-app-theme="${t.id}"]`);
      assert.ok(block, `no token block for ${t.id}`);
      const missing = [...baseTokens].filter(tok => !tokensIn(block).has(tok) && tok !== '--gap');
      assert.deepStrictEqual(missing, []);
    });
  }
};
