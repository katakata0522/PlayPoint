'use strict';

const fs = require('node:fs');
const path = require('node:path');

function normalizeTaiwanText(text) {
  return text
    .replace(/(?<![白黃])金級/g, '黃金級')
    .replace(/累積率/g, '積點率')
    .replace(/累積條件/g, '積點條件');
}

function syncTaiwanTerminology(rootDir) {
  const twRoot = path.join(rootDir, 'tw');
  let checked = 0;
  let changed = 0;
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith('.html')) {
        checked += 1;
        const current = fs.readFileSync(file, 'utf8');
        const next = normalizeTaiwanText(current);
        if (next !== current) {
          fs.writeFileSync(file, next, 'utf8');
          changed += 1;
        }
      }
    }
  }
  if (fs.existsSync(twRoot)) visit(twRoot);
  return { checked, changed };
}

module.exports = { normalizeTaiwanText, syncTaiwanTerminology };
