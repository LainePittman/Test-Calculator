// Theme registry and persistence. To add a theme, add an entry here and style it
// in style.css under :root[data-calc-theme="<id>"].
const Themes = {
  list: [
    { id: 'classic', name: 'Classic', color: '#000000', preview: ['#333333', '#a5a5a5', '#ff9f0a'] },
    { id: 'pixel', name: 'Pixel', color: '#1a1c2c', preview: ['#333c57', '#94b0c2', '#ef7d57'] },
  ],
  storageKey: 'calc-theme',

  resolve(id) {
    return this.list.find(t => t.id === id) || this.list[0];
  },

  load() {
    try { return this.resolve(localStorage.getItem(this.storageKey)); } catch { return this.list[0]; }
  },

  save(id) {
    try { localStorage.setItem(this.storageKey, id); } catch {}
  },

  apply(id) {
    const theme = this.resolve(id);
    document.documentElement.dataset.calcTheme = theme.id;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme.color;
    return theme;
  },
};

if (typeof module !== 'undefined') module.exports = Themes;
else Themes.apply(Themes.load().id); // runs in <head> so the page never flashes the wrong theme
