// Number and time formatting shared by all tools.
const Format = {
  // Round away floating-point noise (0.1 + 0.2 → 0.3) and keep output short.
  number(n) {
    if (!isFinite(n)) return 'Error';
    const rounded = parseFloat(n.toPrecision(12));
    const abs = Math.abs(rounded);
    if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) return rounded.toExponential(6).replace(/\.?0+e/, 'e');
    return String(rounded);
  },

  // "1234567.5" → "1,234,567.5"; leaves "Error" and exponent notation alone.
  group(str) {
    if (str === 'Error' || str.includes('e')) return str;
    const [int, dec] = str.split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec !== undefined ? `${grouped}.${dec}` : grouped;
  },

  // Milliseconds → "mm:ss.cc", or "h:mm:ss.cc" once past an hour.
  stopwatch(ms) {
    const total = Math.max(0, Math.floor(ms / 10));
    const cs = total % 100;
    const s = Math.floor(total / 100) % 60;
    const m = Math.floor(total / 6000) % 60;
    const h = Math.floor(total / 360000);
    const pad = n => String(n).padStart(2, '0');
    return (h ? `${h}:${pad(m)}` : pad(m)) + `:${pad(s)}.${pad(cs)}`;
  },

  // Milliseconds → "m:ss" or "h:mm:ss", rounding up so a timer shows 0:01 until it ends.
  countdown(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const s = total % 60;
    const m = Math.floor(total / 60) % 60;
    const h = Math.floor(total / 3600);
    const pad = n => String(n).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  },
};

if (typeof module !== 'undefined') module.exports = Format;
