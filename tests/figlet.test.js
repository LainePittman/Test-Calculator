const assert = require('assert');
const Figlet = require('../lib/figlet.js');

module.exports = test => {
  test('figlet: every glyph has 6 rows', () => {
    for (const [c, rows] of Object.entries(Figlet.GLYPHS)) assert.strictEqual(rows.length, 6, `"${c}"`);
  });

  test('figlet: draws a digit', () => {
    assert.strictEqual(Figlet.render('7'), [
      ' _____',
      '|___  |',
      '   / /',
      '  / /',
      ' /_/',
    ].join('\n'));
  });

  test('figlet: joins characters side by side, lined up', () => {
    const art = Figlet.render('42');
    const rows = art.split('\n');
    assert.strictEqual(rows.length, 5);
    assert.strictEqual(rows[3], '|__   _| / __/');
  });

  test('figlet: keeps the descender row for commas', () => {
    assert.strictEqual(Figlet.render('1,000').split('\n').length, 6);
  });

  test('figlet: draws clocks and minus signs', () => {
    assert.ok(Figlet.render('01:23.45'));
    assert.strictEqual(Figlet.render('−5'), Figlet.render('-5'), 'typographic minus');
  });

  test('figlet: gives up on characters it has no glyph for', () => {
    for (const text of ['Error', '1.2e+20', '', 'NaN']) assert.strictEqual(Figlet.render(text), null, text);
  });

  test('figlet: every row of a drawing is trimmed on the right', () => {
    for (const row of Figlet.render('10:08').split('\n')) assert.strictEqual(row, row.replace(/\s+$/, ''));
  });
};
