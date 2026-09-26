const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const assets = [...sw.matchAll(/'([^']+\.(?:js|css|html|svg|woff2|webmanifest))'/g)].map(m => m[1]);
const loaded = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => m[1]);

module.exports = test => {
  test('app: every file the page loads is cached for offline use', () => {
    const missing = loaded.filter(f => !assets.includes(f));
    assert.deepStrictEqual(missing, []);
  });

  test('app: every cached file exists', () => {
    const missing = assets.filter(f => !fs.existsSync(path.join(root, f)));
    assert.deepStrictEqual(missing, []);
  });

  test('app: every tab has a panel and a tool script', () => {
    for (const [, id] of html.matchAll(/data-tab="([\w-]+)"/g)) {
      assert.ok(html.includes(`id="tool-${id}"`), `panel for ${id}`);
      const script = fs.readFileSync(path.join(root, 'tools', `${id}.js`), 'utf8');
      assert.ok(script.includes(`id: '${id}'`), `tools/${id}.js registers ${id}`);
    }
  });
};
