// Unit tests (no dependencies): node test.js
const fs = require('fs');
const path = require('path');

let passed = 0;
const failed = [];
const test = (name, fn) => {
  try { fn(); passed++; } catch (e) { failed.push(`✗ ${name}\n    ${e.message}`); }
};

const dir = path.join(__dirname, 'tests');
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort()) {
  require(path.join(dir, file))(test);
}

if (failed.length) {
  console.error(failed.join('\n'));
  console.error(`\n${failed.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`All ${passed} unit tests passed`);
