'use strict';

const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'intl-article-hreflang-sync.cjs');
let source = fs.readFileSync(file, 'utf8');

const oldIntl = `function upsertIntlJa(html, jaPath) {
  const tag = '    <link rel="alternate" hreflang="ja" href="' + SITE_ORIGIN + jaPath + '">';
  let next = html.replace(/\\s*<link rel="alternate" hreflang="ja"[^>]*>\\s*/g, '\\n');
  const anchor = /\\s*(<link rel="alternate" hreflang="en"[^>]*>)/;
  if (!anchor.test(next)) throw new Error('International article is missing en hreflang anchor.');
  return next.replace(anchor, '\\n' + tag + '\\n    $1');
}`;
const newIntl = `function upsertIntlJa(html, jaPath) {
  const tag = '    <link rel="alternate" hreflang="ja" href="' + SITE_ORIGIN + jaPath + '">';
  let next = html.replace(/^[\\t ]*<link rel="alternate" hreflang="ja"[^>]*>[\\t ]*\\r?\\n?/gm, '');
  const anchor = /(^[\\t ]*<link rel="alternate" hreflang="en"[^>]*>)/m;
  if (!anchor.test(next)) throw new Error('International article is missing en hreflang anchor.');
  return next.replace(anchor, tag + '\\n$1');
}`;

const oldJaStart = `function upsertJapaneseIntlSet(html, slug) {
  let next = html.replace(/\\s*<link rel="alternate" hreflang="(?:en|ko|zh-TW|x-default)"[^>]*>\\s*/g, '\\n');`;
const newJaStart = `function upsertJapaneseIntlSet(html, slug) {
  let next = html.replace(/^[\\t ]*<link rel="alternate" hreflang="(?:en|ko|zh-TW|x-default)"[^>]*>[\\t ]*\\r?\\n?/gm, '');`;

const oldCanonical = `  const canonical = /(<link rel="canonical"[^>]*>)/;
  if (!canonical.test(next)) throw new Error('Japanese counterpart is missing canonical link.');
  return next.replace(canonical, '$1\\n' + tags);`;
const newCanonical = `  const canonical = /(^[\\t ]*<link rel="canonical"[^>]*>)/m;
  if (!canonical.test(next)) throw new Error('Japanese counterpart is missing canonical link.');
  return next.replace(canonical, '$1\\n' + tags);`;

for (const [from, to, label] of [
  [oldIntl, newIntl, 'intl ja upsert'],
  [oldJaStart, newJaStart, 'Japanese alternate removal'],
  [oldCanonical, newCanonical, 'Japanese canonical anchor']
]) {
  if (!source.includes(from)) throw new Error('Could not patch ' + label);
  source = source.replace(from, to);
}

fs.writeFileSync(file, source, 'utf8');
console.log('Hreflang synchronizer made line-idempotent.');
