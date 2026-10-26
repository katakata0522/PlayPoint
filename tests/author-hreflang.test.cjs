'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { schemas } = require('./helpers/intl-check.cjs');
const { openingTags } = require('./helpers/markup-contract.cjs');
const { renderIntlAuthorPage } = require('../scripts/intl-author-pages.cjs');
const { getContentDateForFile } = require('../scripts/content-dates.cjs');
const { syncHtmlFile } = require('../scripts/html-sync.cjs');
const {
  AUTHOR_ALTERNATES,
  extractAuthorAlternates,
  synchronizeJapaneseAuthorHreflang
} = require('../scripts/author-hreflang-sync.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('日本語運営者ページへ完全なhreflangクラスターを一度だけ同期する', () => {
  const source = '<html><head>\n  <link rel="canonical" href="https://playpoint-sim.com/author/katakata.html">\n</head></html>';
  const result = synchronizeJapaneseAuthorHreflang(source);
  assert.equal(result.changed, true);
  assert.deepEqual(extractAuthorAlternates(result.html), AUTHOR_ALTERNATES);

  const stable = synchronizeJapaneseAuthorHreflang(result.html);
  assert.equal(stable.changed, false);
  assert.equal(stable.html, result.html);
});

test('日本語と生成3言語の運営者ページは同じ相互hreflangクラスターを持つ', () => {
  for (const relativePath of [
    'author/katakata.html',
    'en/author/katakata.html',
    'ko/author/katakata.html',
    'tw/author/katakata.html'
  ]) {
    assert.deepEqual(
      extractAuthorAlternates(read(relativePath)),
      AUTHOR_ALTERNATES,
      `${relativePath}: author alternate cluster differs`
    );
  }
});

test('公開・再生成したプロフィールの更新日時は日付を保ったタイムゾーン付きISO日時になる', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-profile-date-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'author'));
  const japaneseFile = 'author/katakata.html';
  fs.writeFileSync(path.join(dir, japaneseFile), read(japaneseFile));
  syncHtmlFile(dir, japaneseFile, {}, getContentDateForFile(japaneseFile));
  const pages = [
    ...['author/katakata.html', 'en/author/katakata.html', 'ko/author/katakata.html', 'tw/author/katakata.html']
      .map(file => [file, read(file)]),
    ...['en', 'ko', 'tw'].map(locale => [`generated:${locale}`, renderIntlAuthorPage(locale)]),
    [japaneseFile, fs.readFileSync(path.join(dir, japaneseFile), 'utf8')]
  ];
  for (const [name, html] of pages) {
    const profiles = schemas(html).filter(schema => schema['@type'] === 'ProfilePage');
    assert.equal(profiles.length, 1, `${name}: ProfilePage`);
    const modifiedAt = profiles[0].dateModified;
    assert.match(modifiedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/, `${name}: dateModified`);
    assert.ok(Number.isFinite(Date.parse(modifiedAt)), `${name}: dateModified must be parseable`);
    const meta = openingTags(html).find(node => node.tag === 'meta' && node.attrs.name === 'last-modified');
    const contentDate = name === 'author/katakata.html' ? getContentDateForFile(name) : meta?.attrs.content;
    assert.equal(modifiedAt.slice(0, 10), contentDate, `${name}: existing content date`);
  }
});
