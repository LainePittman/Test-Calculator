// Run with: node test.js
const assert = require('assert');
const Calculator = require('./calculator.js');

function run(keys) {
  const c = new Calculator();
  for (const k of keys.split(' ')) {
    if (/^\d$/.test(k)) c.inputDigit(k);
    else if (k === '.') c.inputDecimal();
    else if ('+-*/'.includes(k)) c.setOperator(k);
    else if (k === '=') c.equals();
    else if (k === '%') c.percent();
    else if (k === '±') c.toggleSign();
    else if (k === 'AC') c.clear();
  }
  return c.current;
}

const cases = [
  ['1 2 + 3 4 =', '46'],
  ['9 - 1 2 =', '-3'],
  ['6 * 7 =', '42'],
  ['1 / 4 =', '0.25'],
  ['0 . 1 + 0 . 2 =', '0.3'],
  ['2 + 3 * 4 =', '20'],          // immediate execution, like a basic calculator
  ['5 / 0 =', 'Error'],
  ['5 / 0 = 3', '3'],             // typing after an error starts fresh
  ['2 + 3 = =', '8'],             // repeated equals
  ['5 0 %', '0.5'],
  ['2 0 0 + 1 0 % =', '220'],
  ['5 ±', '-5'],
  ['1 . . 5', '1.5'],
  ['2 + * 3 =', '6'],             // changing operator
  ['9 AC', '0'],
];

for (const [keys, expected] of cases) {
  assert.strictEqual(run(keys), expected, `${keys} → expected ${expected}`);
}
console.log(`All ${cases.length} tests passed`);

// Themes
const fs = require('fs');
const Themes = require('./themes.js');
const css = fs.readFileSync(__dirname + '/style.css', 'utf8');

assert.strictEqual(Themes.list[0].id, 'classic', 'Classic is the default theme');
assert.strictEqual(Themes.resolve('pixel').id, 'pixel');
assert.strictEqual(Themes.resolve('nonexistent').id, 'classic', 'unknown themes fall back to Classic');
assert.strictEqual(Themes.resolve(null).id, 'classic', 'no saved theme falls back to Classic');
assert.strictEqual(new Set(Themes.list.map(t => t.id)).size, Themes.list.length, 'theme ids are unique');
for (const t of Themes.list) {
  assert.ok(t.name && /^#[0-9a-f]{6}$/i.test(t.color) && t.preview.length === 3, `${t.id} is complete`);
  if (t !== Themes.list[0]) {
    assert.ok(css.includes(`:root[data-calc-theme="${t.id}"]`), `${t.id} has styles in style.css`);
  }
}
console.log(`All ${Themes.list.length} themes passed`);
