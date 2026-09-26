const assert = require('assert');
const Format = require('../lib/format.js');

module.exports = test => {
  test('format: rounds float noise', () => assert.strictEqual(Format.number(0.1 + 0.2), '0.3'));
  test('format: huge numbers use exponents', () => assert.strictEqual(Format.number(1e20), '1e+20'));
  test('format: groups thousands', () => assert.strictEqual(Format.group('-1234567.891'), '-1,234,567.891'));
  test('format: stopwatch under an hour', () => assert.strictEqual(Format.stopwatch(83_456), '01:23.45'));
  test('format: stopwatch over an hour', () => assert.strictEqual(Format.stopwatch(3_723_450), '1:02:03.45'));
  test('format: countdown rounds up', () => assert.strictEqual(Format.countdown(59_001), '1:00'));
  test('format: countdown with hours', () => assert.strictEqual(Format.countdown(3_723_000), '1:02:03'));
  test('format: countdown never negative', () => assert.strictEqual(Format.countdown(-5), '0:00'));
};
