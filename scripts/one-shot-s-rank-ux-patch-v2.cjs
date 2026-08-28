'use strict';

const fs = require('node:fs');
const path = require('node:path');

require('./one-shot-s-rank-ux-patch.cjs');

const root = path.resolve(__dirname, '..');
const relativePath = 'scripts/article-content-navigation-normalize.cjs';
const file = path.join(root, relativePath);
const before = fs.readFileSync(file, 'utf8');
const target = `    for (const name of fs.readdirSync(absoluteDir).sort()) {\n      if (name.endsWith('.html')) files.push(path.posix.join(dir, name));\n    }`;
const replacement = `    for (const name of fs.readdirSync(absoluteDir).sort()) {\n      if (!name.endsWith('.html')) continue;\n      // International article indexes are discovery hubs, not article details.\n      // Keep the related-guide requirement strict for every actual article.\n      if (name === 'index.html' && dir !== 'articles') continue;\n      files.push(path.posix.join(dir, name));\n    }`;
if (!before.includes(target)) throw new Error(`expected article file enumeration was not found: ${relativePath}`);
fs.writeFileSync(file, before.replace(target, replacement), 'utf8');
console.log(`patched ${relativePath}`);
