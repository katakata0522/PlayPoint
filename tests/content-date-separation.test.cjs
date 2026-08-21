'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  CONTENT_DATE_OVERRIDES,
  GENERATED_INTL_PAGE_CONTENT_DATE,
  TOP_PAGE_CONTENT_DATES,
  isGeneratedGamePagePath
} = require('../scripts/content-dates.cjs');
const { getSyncedHtmlFiles } = require('../scripts/build-targets.cjs');
const { createLocales } = require('../scripts/locale-config.cjs');
const { getIntlSitemapEntries } = require('../scripts/intl-seo-pages.cjs');
const { syncIndexMetadataContent } = require('../scripts/build-metadata.cjs');
const { syncSitemapContent } = require('../scripts/sitemap-sync.cjs');

const root = path.resolve(__dirname, '..');

test('ビルド日を変えてもトップと多言語ページの内容更新日は変わらない', () => {
  const locales = createLocales('2099-12-31');
  assert.equal(locales.en.modifiedAt, TOP_PAGE_CONTENT_DATES.en);
  assert.equal(locales.ko.modifiedAt, TOP_PAGE_CONTENT_DATES.ko);
  assert.equal(locales.tw.modifiedAt, TOP_PAGE_CONTENT_DATES.tw);

  const entries = getIntlSitemapEntries('2099-12-31');
  assert.ok(entries.some(entry => entry.lastmod === GENERATED_INTL_PAGE_CONTENT_DATE));
  assert.ok(entries.every(entry => entry.lastmod !== '2099-12-31'));
});

test('トップHTMLは内容更新日とアセット版を独立して同期する', () => {
  const source = [
    '<meta name="last-modified" content="2020-01-01">',
    '<script src="js/main.js?v=old"></script>',
    '<p>サイト更新: 2020-01-01</p>'
  ].join('\n');
  const output = syncIndexMetadataContent(source, TOP_PAGE_CONTENT_DATES.ja, '20991231_2359');
  assert.match(output, new RegExp(`last-modified" content="${TOP_PAGE_CONTENT_DATES.ja}`));
  assert.match(output, new RegExp(`サイト更新: ${TOP_PAGE_CONTENT_DATES.ja}`));
  assert.match(output, /js\/main\.js\?v=20991231_2359a/);
  assert.doesNotMatch(output, /2099-12-31/);
});

test('サイトマップの言語トップはページごとの固定内容日を使う', () => {
  const source = Object.values({
    ja: 'https://playpoint-sim.com/',
    en: 'https://playpoint-sim.com/en/',
    ko: 'https://playpoint-sim.com/ko/',
    tw: 'https://playpoint-sim.com/tw/'
  }).map(url => `<url><loc>${url}</loc><lastmod>2099-12-31</lastmod></url>`).join('\n');
  const output = syncSitemapContent(source);
  for (const date of Object.values(TOP_PAGE_CONTENT_DATES)) {
    assert.match(output, new RegExp(`<lastmod>${date}<\\/lastmod>`));
  }
  assert.doesNotMatch(output, /2099-12-31/);
});

test('静的HTML同期対象は内容日台帳から導出し、対象一覧を二重管理しない', () => {
  const expectedStaticFiles = Object.keys(CONTENT_DATE_OVERRIDES)
    .filter(file => !isGeneratedGamePagePath(file))
    .sort();
  const actualStaticFiles = getSyncedHtmlFiles(root)
    .filter(file => !isGeneratedGamePagePath(file))
    .sort();
  const buildTargetsSource = fs.readFileSync(path.join(root, 'scripts', 'build-targets.cjs'), 'utf8');

  assert.deepEqual(actualStaticFiles, expectedStaticFiles);
  assert.match(buildTargetsSource, /Object\.keys\(CONTENT_DATE_OVERRIDES\)/);
  assert.doesNotMatch(
    buildTargetsSource,
    /const staticSyncedHtmlFiles = \[\s*['"]/,
    'build-targets.cjs must not restore a second handwritten static sync-target list'
  );
});
