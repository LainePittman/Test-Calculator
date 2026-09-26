// Bundles the app into one self-contained HTML file (dist/pocket-tools.html) for hosts
// that only accept a single page: inlines CSS, scripts and the font; drops the
// service worker and manifest, which need separate files.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const font = fs.readFileSync(path.join(root, 'fonts/PressStart2P-latin.woff2')).toString('base64');

let html = read('index.html')
  .replace(/^\s*<link rel="(manifest|icon|apple-touch-icon|preload)"[^>]*>\n/gm, '')
  .replace('<link rel="stylesheet" href="style.css">', () =>
    `<style>\n${read('style.css')
      .replace('url("fonts/PressStart2P-latin.woff2")', `url("data:font/woff2;base64,${font}")`)
      // Embedding pages pad the root for phone safe areas; fill the page rather than the screen.
      .replace('height: 100dvh;', 'height: 100%;')}</style>`)
  .replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>\n${read(src)}</script>`);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/pocket-tools.html'), html);
console.log(`dist/pocket-tools.html (${(html.length / 1024).toFixed(1)} KB)`);
