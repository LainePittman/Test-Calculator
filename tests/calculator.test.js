const assert = require('assert');
const Calculator = require('../lib/calculator.js');

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

module.exports = test => {
  for (const [keys, expected] of cases) {
    test(`calculator: ${keys} → ${expected}`, () => assert.strictEqual(run(keys), expected));
  }
};
