// Theme registry and persistence, shared by every tool. To add a theme, add an entry
// here and give it a token block in style.css under :root[data-app-theme="<id>"].
const Themes = {
  // sound: the timer alarm. Each beep plays the notes (Hz) in turn on that oscillator wave.
  // figlet: draw big readouts ([data-figlet]) as ASCII art.
  list: [
    { id: 'classic', name: 'Classic', color: '#000000', preview: ['#333333', '#a5a5a5', '#ff9f0a'],
      sound: { wave: 'sine', notes: [880, 880, 880], gain: 0.35 } },
    { id: 'pixel', name: 'Pixel', color: '#1a1c2c', preview: ['#333c57', '#94b0c2', '#ef7d57'],
      sound: { wave: 'square', notes: [988, 988, 988], gain: 0.12 } },
    { id: 'deco', name: 'Art Deco', color: '#0b0d12', preview: ['#161a22', '#e8dcc0', '#d4af37'],
      sound: { wave: 'triangle', notes: [1318.5, 1046.5], gain: 0.3 } }, // two-tone lobby chime
    { id: 'ascii', name: 'ASCII Art', color: '#0c0c0c', preview: ['#0c0c0c', '#9a9a9a', '#ffffff'],
      figlet: true, // big readouts drawn as ASCII-art digits (lib/figlet.js)
      sound: { wave: 'sawtooth', notes: [740, 740], gain: 0.12 } }, // terminal bell
  ],
  storageKey: 'app-theme',
  legacyKey: 'calc-theme', // saved by the calculator-only version

  resolve(id) {
    return this.list.find(t => t.id === id) || this.list[0];
  },

  load() {
    try {
      return this.resolve(localStorage.getItem(this.storageKey) || localStorage.getItem(this.legacyKey));
    } catch {
      return this.list[0];
    }
  },

  save(id) {
    try { localStorage.setItem(this.storageKey, id); } catch {}
  },

  apply(id) {
    const theme = this.resolve(id);
    document.documentElement.dataset.appTheme = theme.id;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme.color;
    document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
    return theme;
  },
};

if (typeof module !== 'undefined') module.exports = Themes;
else Themes.apply(Themes.load().id); // runs in <head> so the page never flashes the wrong theme
