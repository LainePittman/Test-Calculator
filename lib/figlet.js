// Big ASCII-art digits (in the style of FIGlet's "standard" font) for themes that
// want them. render() is pure; mirror() shows the art next to a live readout.
const Figlet = {
  ROWS: 6,

  // Each glyph is 6 rows; rows are padded to the glyph's widest row.
  GLYPHS: {
    '0': ['  ___  ', ' / _ \\ ', '| | | |', '| |_| |', ' \\___/ ', ''],
    '1': [' _ ', '/ |', '| |', '| |', '|_|', ''],
    '2': [' ____  ', '|___ \\ ', '  __) |', ' / __/ ', '|_____|', ''],
    '3': [' _____ ', '|___ / ', '  |_ \\ ', ' ___) |', '|____/ ', ''],
    '4': [' _  _   ', '| || |  ', '| || |_ ', '|__   _|', '   |_|  ', ''],
    '5': [' ____  ', '| ___| ', '|___ \\ ', ' ___) |', '|____/ ', ''],
    '6': ['  __   ', ' / /_  ', "| '_ \\ ", '| (_) |', ' \\___/ ', ''],
    '7': [' _____ ', '|___  |', '   / / ', '  / /  ', ' /_/   ', ''],
    '8': ['  ___  ', ' ( _ ) ', ' / _ \\ ', '| (_) |', ' \\___/ ', ''],
    '9': ['  ___  ', ' / _ \\ ', '| (_) |', ' \\__, |', '   /_/ ', ''],
    ':': ['   ', ' _ ', '(_)', ' _ ', '(_)', ''],
    '.': ['   ', '   ', '   ', ' _ ', '(_)', ''],
    ',': ['   ', '   ', '   ', ' _ ', '( )', '|/ '],
    '-': ['       ', '       ', ' _____ ', '|_____|', '       ', ''],
    ' ': ['   ', '', '', '', '', ''],
  },

  // Returns the art as a multi-line string, or null if a character has no glyph.
  render(text) {
    const chars = [...String(text).replace(/−/g, '-')];
    if (!chars.length || chars.some(c => !(c in this.GLYPHS))) return null;
    const rows = Array.from({ length: this.ROWS }, () => '');
    for (const c of chars) {
      const glyph = this.GLYPHS[c];
      const width = Math.max(...glyph.map(r => r.length));
      glyph.forEach((row, i) => { rows[i] += row.padEnd(width); });
    }
    // Drop the descender row when nothing uses it.
    if (!rows[this.ROWS - 1].trim()) rows.pop();
    return rows.map(r => r.replace(/\s+$/, '')).join('\n');
  },

  // Keeps a <pre> of art next to `el`, updated whenever el's text or the theme changes.
  // The theme decides (via Themes: figlet: true); the original stays for screen readers.
  mirror(el, { maxPx = 22, minPx = 8, charRatio = 0.6 } = {}) {
    const pre = document.createElement('pre');
    pre.className = 'figlet';
    pre.setAttribute('aria-hidden', 'true');
    el.after(pre);

    const update = () => {
      const on = Themes.resolve(document.documentElement.dataset.appTheme).figlet;
      const art = on && el.offsetParent !== null ? Figlet.render(el.textContent.trim()) : null;
      let size = 0;
      if (art) {
        const box = el.parentElement;
        const cs = getComputedStyle(box);
        const width = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const cols = Math.max(...art.split('\n').map(r => r.length));
        size = Math.min(maxPx, width / (cols * charRatio));
      }
      // Too long to draw legibly: fall back to the plain readout.
      const show = art && size >= minPx;
      el.classList.toggle('figlet-on', Boolean(show));
      pre.textContent = show ? art : '';
      pre.style.fontSize = show ? `${Math.floor(size * 10) / 10}px` : '';
    };

    new MutationObserver(update).observe(el, { childList: true, characterData: true, subtree: true });
    document.addEventListener('themechange', update);
    window.addEventListener('resize', update);
    return update;
  },
};

if (typeof module !== 'undefined') module.exports = Figlet;
