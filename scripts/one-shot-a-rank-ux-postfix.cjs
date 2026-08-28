'use strict';
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, 'article-locale-switcher.cjs');
let s = fs.readFileSync(file, 'utf8');
const replacement = `function attr(tag, name) {
  const lower = tag.toLowerCase();
  const attrName = String(name).toLowerCase();
  for (const quote of ['"', "'"]) {
    const needle = attrName + '=' + quote;
    const start = lower.indexOf(needle);
    if (start < 0) continue;
    const valueStart = start + needle.length;
    const end = tag.indexOf(quote, valueStart);
    if (end > valueStart) return tag.slice(valueStart, end);
  }
  return '';
}`;
if (!/^function attr\(tag, name\).*$/m.test(s)) throw new Error('attr function line not found');
s = s.replace(/^function attr\(tag, name\).*$/m, replacement);
fs.writeFileSync(file, s, 'utf8');
console.log('locale switcher syntax fixed');
