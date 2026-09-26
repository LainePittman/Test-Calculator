const assert = require('assert');
const Units = require('../lib/units.js');

const close = (actual, expected, digits = 9) =>
  assert.ok(Math.abs(actual - expected) < 10 ** -digits * Math.max(1, Math.abs(expected)),
    `${actual} ≠ ${expected}`);

module.exports = test => {
  test('units: 1 mile = 1.609344 km', () => close(Units.convert(1, 'length', 'mi', 'km'), 1.609344));
  test('units: 12 inches = 1 foot', () => close(Units.convert(12, 'length', 'in', 'ft'), 1));
  test('units: 1 kg = 2.20462 lb', () => close(Units.convert(1, 'weight', 'kg', 'lb'), 2.2046226218, 8));
  test('units: 16 oz = 1 lb', () => close(Units.convert(16, 'weight', 'oz', 'lb'), 1));
  test('units: 100 °C = 212 °F', () => close(Units.convert(100, 'temperature', 'c', 'f'), 212));
  test('units: -40 °F = -40 °C', () => close(Units.convert(-40, 'temperature', 'f', 'c'), -40));
  test('units: 0 K = -273.15 °C', () => close(Units.convert(0, 'temperature', 'k', 'c'), -273.15));
  test('units: 1 cup = 16 tbsp = 48 tsp', () => {
    close(Units.convert(1, 'volume', 'cup', 'tbsp'), 16);
    close(Units.convert(1, 'volume', 'cup', 'tsp'), 48);
  });
  test('units: 1 gallon = 128 fl oz', () => close(Units.convert(1, 'volume', 'gal', 'floz'), 128));
  test('units: 100 km/h = 62.137 mph', () => close(Units.convert(100, 'speed', 'kmh', 'mph'), 62.1371192237, 8));
  test('units: same unit is unchanged', () => close(Units.convert(7.5, 'length', 'm', 'm'), 7.5));

  test('units: every conversion round-trips', () => {
    for (const c of Units.categories) {
      for (const a of c.units) for (const b of c.units) {
        close(Units.convert(Units.convert(123.456, c.id, a.id, b.id), c.id, b.id, a.id), 123.456);
      }
    }
  });

  test('units: every category is complete', () => {
    for (const c of Units.categories) {
      assert.ok(Units.unit(c.id, c.base), `${c.id} base unit exists`);
      for (const d of c.defaults) assert.ok(Units.unit(c.id, d), `${c.id} default ${d} exists`);
      assert.strictEqual(new Set(c.units.map(u => u.id)).size, c.units.length, `${c.id} ids unique`);
    }
  });

  test('units: unknown unit gives NaN', () => assert.ok(Number.isNaN(Units.convert(1, 'length', 'm', 'lb'))));

  test('units: parses what people type', () => {
    assert.strictEqual(Units.parse('1,234.5'), 1234.5);
    assert.strictEqual(Units.parse(' -40 '), -40);
    assert.strictEqual(Units.parse('.5'), 0.5);
    assert.strictEqual(Units.parse('5.'), 5);
    assert.strictEqual(Units.parse('1,5'), 1.5, 'comma as decimal point');
    assert.strictEqual(Units.parse('0,25'), 0.25);
    assert.strictEqual(Units.parse('1,234'), 1234, 'comma before 3 digits is a thousands separator');
    assert.strictEqual(Units.parse('1,234,567.8'), 1234567.8);
    for (const bad of ['', '-', '.', 'abc', '1.2.3', '5e3']) assert.ok(Number.isNaN(Units.parse(bad)), bad);
  });
};
