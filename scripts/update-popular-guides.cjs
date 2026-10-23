'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { buildSnapshot } = require('./update-japanese-popular-guides.cjs');
const { INTERNATIONAL_LOCALES } = require('./locale-ids.cjs');

// Decode supported references once. In particular, &amp;quot; stays literal &quot;.
// This extracts title text only; HTML output must still use the existing escapeHtml.
function decodeTitleReferences(value) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
  return value.replace(/&(?:amp|quot|apos|lt|gt|#[0-9]+|#x[0-9a-f]+);/gi, reference => {
    const key = reference.slice(1, -1);
    if (key[0] !== '#') return Object.hasOwn(named, key) ? named[key] : reference;
    const hexadecimal = key[1].toLowerCase() === 'x';
    const code = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    // Do not invent characters for malformed, null, or surrogate references.
    if (!Number.isSafeInteger(code) || code <= 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return reference;
    return String.fromCodePoint(code);
  });
}

// 同じ正常なページ別集計から、各言語の記事だけを比較する。PVは公開しない。
function prepareSnapshots(input, root, today) {
  const jaFile = 'scripts/japanese-popular-guides.snapshot.json';
  const intlFile = 'scripts/intl-popular-guides.snapshot.json';
  const jaPrevious = JSON.parse(fs.readFileSync(path.join(root, jaFile), 'utf8'));
  const intlPrevious = JSON.parse(fs.readFileSync(path.join(root, intlFile), 'utf8'));
  const jaRegistry = JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8'));
  const changes = [];
  const jaNext = buildSnapshot(input, jaRegistry, jaPrevious, today);
  if (jaNext) changes.push([jaFile, jaNext]);
  const guides = {};
  let changed = false;
  for (const locale of INTERNATIONAL_LOCALES) {
    const directory = path.join(root, locale, 'articles');
    const registry = fs.readdirSync(directory).filter(file => file.endsWith('.html') && file !== 'index.html').map(file => {
      const html = fs.readFileSync(path.join(directory, file), 'utf8');
      const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
      const title = heading === undefined ? undefined : decodeTitleReferences(heading.replace(/<[^>]+>/g, '')).trim();
      if (!title) throw Error('記事タイトルがありません: ' + file);
      return { file: '../' + locale + '/articles/' + file, title };
    });
    const previous = { ...intlPrevious, guides: intlPrevious.guides[locale] };
    const next = buildSnapshot(input, registry, previous, today);
    changed ||= Boolean(next);
    guides[locale] = (next || previous).guides;
  }
  if (changed) changes.push([intlFile, { snapshot: today, start: input.start, end: input.end, guides }]);
  return changes;
}

if (require.main === module) {
  try {
    const [inputFile, flag] = process.argv.slice(2);
    if (!inputFile || (flag && flag !== '--write')) throw Error('使い方: node scripts/update-popular-guides.cjs <非公開JSON> [--write]');
    const root = path.resolve(__dirname, '..');
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
    const changes = prepareSnapshots(JSON.parse(fs.readFileSync(inputFile, 'utf8')), root, today);
    // 全言語の検証が通った後にだけ書き込む。不正な入力ではどの順位も変えない。
    if (flag === '--write') for (const [file, next] of changes) {
      const target = path.join(root, file), temporary = target + '.tmp';
      fs.writeFileSync(temporary, JSON.stringify(next, null, 2) + '\n');
      fs.renameSync(temporary, target);
    }
    console.log(changes.length ? (flag ? 'UPDATED' : 'CHANGE_AVAILABLE') : 'UNCHANGED');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { prepareSnapshots };
