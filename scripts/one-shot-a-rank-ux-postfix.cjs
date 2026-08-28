'use strict';
const fs = require('node:fs');
const path = require('node:path');

const switcherFile = path.join(__dirname, 'article-locale-switcher.cjs');
let switcher = fs.readFileSync(switcherFile, 'utf8');
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
if (!/^function attr\(tag, name\).*$/m.test(switcher)) throw new Error('attr function line not found');
switcher = switcher.replace(/^function attr\(tag, name\).*$/m, replacement);
fs.writeFileSync(switcherFile, switcher, 'utf8');

const localeFile = path.join(__dirname, 'locale-config.cjs');
let locale = fs.readFileSync(localeFile, 'utf8');
const before = "linkAuthor: '營運者與政策 (日文)'";
const after = "linkAuthor: '營運者與驗證方針'";
if (!locale.includes(before) && !locale.includes(after)) throw new Error('Taiwan editorial policy label not found');
locale = locale.replace(before, after);
fs.writeFileSync(localeFile, locale, 'utf8');

console.log('locale switcher syntax and Taiwan editorial label fixed');
