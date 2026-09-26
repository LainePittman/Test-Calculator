// Unit conversion tables. Each unit is a factor to the category's base unit
// (exact definitions where they exist); temperature uses formulas instead.
const Units = {
  categories: [
    {
      id: 'length', name: 'Length', base: 'm',
      defaults: ['mi', 'km'],
      units: [
        { id: 'mm', name: 'Millimeters', symbol: 'mm', factor: 0.001 },
        { id: 'cm', name: 'Centimeters', symbol: 'cm', factor: 0.01 },
        { id: 'm', name: 'Meters', symbol: 'm', factor: 1 },
        { id: 'km', name: 'Kilometers', symbol: 'km', factor: 1000 },
        { id: 'in', name: 'Inches', symbol: 'in', factor: 0.0254 },
        { id: 'ft', name: 'Feet', symbol: 'ft', factor: 0.3048 },
        { id: 'yd', name: 'Yards', symbol: 'yd', factor: 0.9144 },
        { id: 'mi', name: 'Miles', symbol: 'mi', factor: 1609.344 },
      ],
    },
    {
      id: 'weight', name: 'Weight', base: 'kg',
      defaults: ['lb', 'kg'],
      units: [
        { id: 'g', name: 'Grams', symbol: 'g', factor: 0.001 },
        { id: 'kg', name: 'Kilograms', symbol: 'kg', factor: 1 },
        { id: 'oz', name: 'Ounces', symbol: 'oz', factor: 0.028349523125 },
        { id: 'lb', name: 'Pounds', symbol: 'lb', factor: 0.45359237 },
        { id: 'st', name: 'Stone', symbol: 'st', factor: 6.35029318 },
        { id: 't', name: 'Metric tons', symbol: 't', factor: 1000 },
      ],
    },
    {
      id: 'temperature', name: 'Temperature', base: 'c',
      defaults: ['f', 'c'],
      units: [
        { id: 'c', name: 'Celsius', symbol: '°C', toBase: v => v, fromBase: v => v },
        { id: 'f', name: 'Fahrenheit', symbol: '°F', toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
        { id: 'k', name: 'Kelvin', symbol: 'K', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
      ],
    },
    {
      id: 'volume', name: 'Volume', base: 'l',
      defaults: ['cup', 'ml'],
      units: [
        { id: 'ml', name: 'Milliliters', symbol: 'mL', factor: 0.001 },
        { id: 'l', name: 'Liters', symbol: 'L', factor: 1 },
        { id: 'tsp', name: 'Teaspoons (US)', symbol: 'tsp', factor: 0.00492892159375 },
        { id: 'tbsp', name: 'Tablespoons (US)', symbol: 'tbsp', factor: 0.01478676478125 },
        { id: 'floz', name: 'Fluid ounces (US)', symbol: 'fl oz', factor: 0.0295735295625 },
        { id: 'cup', name: 'Cups (US)', symbol: 'cup', factor: 0.2365882365 },
        { id: 'pt', name: 'Pints (US)', symbol: 'pt', factor: 0.473176473 },
        { id: 'gal', name: 'Gallons (US)', symbol: 'gal', factor: 3.785411784 },
      ],
    },
    {
      id: 'speed', name: 'Speed', base: 'mps',
      defaults: ['mph', 'kmh'],
      units: [
        { id: 'mps', name: 'Meters per second', symbol: 'm/s', factor: 1 },
        { id: 'kmh', name: 'Kilometers per hour', symbol: 'km/h', factor: 1000 / 3600 },
        { id: 'mph', name: 'Miles per hour', symbol: 'mph', factor: 1609.344 / 3600 },
        { id: 'kn', name: 'Knots', symbol: 'kn', factor: 1852 / 3600 },
      ],
    },
  ],

  category(id) {
    return this.categories.find(c => c.id === id) || this.categories[0];
  },

  unit(categoryId, unitId) {
    return this.category(categoryId).units.find(u => u.id === unitId);
  },

  convert(value, categoryId, fromId, toId) {
    const from = this.unit(categoryId, fromId);
    const to = this.unit(categoryId, toId);
    if (!from || !to || !isFinite(value)) return NaN;
    const base = from.toBase ? from.toBase(value) : value * from.factor;
    return to.fromBase ? to.fromBase(base) : base / to.factor;
  },

  // Accepts what people type: "1,234.5", " 12 ", "-40", ".5", "5.", and a comma as the
  // decimal point ("1,5") unless it's followed by exactly three digits. NaN otherwise.
  parse(text) {
    let cleaned = String(text).replace(/\s/g, '');
    if (/^[-+]?\d*,(\d{1,2}|\d{4,})$/.test(cleaned)) cleaned = cleaned.replace(',', '.');
    cleaned = cleaned.replace(/,/g, '');
    return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(cleaned) ? Number(cleaned) : NaN;
  },
};

if (typeof module !== 'undefined') module.exports = Units;
