'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { ARTICLE_JA_ALTERNATES, INTL_LOCALES, SITE_ORIGIN, intlUrl } = require('../scripts/intl-article-hreflang-sync.cjs');
const terminologyContract = require('../scripts/tw-terminology-contract.cjs');

const root = path.resolve(__dirname, '..');
function sitePathToFile(sitePath) {
  const relative = sitePath.replace(/^\//, '');
  return path.join(root, relative.endsWith('/') ? relative + 'index.html' : relative);
}
function walkHtml(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkHtml(file));
    else if (entry.name.endsWith('.html')) files.push(file);
  }
  return files;
}

test('Korean article hub keeps the missing/not-completing negation', () => {
  const source = fs.readFileSync(path.join(root, 'scripts', 'intl-manual-content-sync.cjs'), 'utf8');
  const hub = fs.readFileSync(path.join(root, 'ko', 'articles', 'index.html'), 'utf8');
  assert.ok(!source.includes('퀘스트가 표시되거나 완료되지 않을 때'));
  assert.ok(!hub.includes('퀘스트가 표시되거나 완료되지 않을 때'));
  assert.ok(source.includes('퀘스트가 표시되지 않거나 완료되지 않을 때'));
  assert.ok(hub.includes('퀘스트가 표시되지 않거나 완료되지 않을 때'));
});

test('Taiwan pages and Taiwan-owned source assets use the official terminology contract', () => {
  const files = walkHtml(path.join(root, 'tw'));
  assert.ok(files.length > 0);
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    assert.ok(!/(?<![白黃])金級/.test(html), path.relative(root, file) + ': bare Taiwan Gold tier');
    assert.ok(!html.includes('累積率'), path.relative(root, file) + ': old earning-rate term');
    assert.ok(!html.includes('累積條件'), path.relative(root, file) + ': old earning-condition term');
  }

  const summary = terminologyContract.assertTaiwanTerminology(root);
  assert.equal(summary.violations, 0);
  assert.equal(summary.htmlFilesChecked, files.length);
  assert.equal(summary.sourceFilesChecked, terminologyContract.TAIWAN_SOURCE_FILES.length);

  const runtime = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  assert.ok(runtime.includes('"黃金級": 1.5'));
  assert.ok(!runtime.includes('"金級": 1.5'));
});

test('Hong Kong keeps its own official tier names', () => {
  const hk = fs.readFileSync(path.join(root, 'hk', 'index.html'), 'utf8');
  assert.ok(hk.includes('金級'));
  assert.ok(hk.includes('鉑金級'));
  assert.ok(!hk.includes('黃金級'));
  assert.ok(!hk.includes('白金級'));
  const share = fs.readFileSync(path.join(root, 'js', 'share.js'), 'utf8');
  assert.ok(share.includes('黃金|金級'), 'shared target normalization must support both Taiwan and Hong Kong Gold labels');
});

test('Taiwan terminology contract covers the embeddable widget and fails instead of silently rewriting', () => {
  const widget = fs.readFileSync(path.join(root, 'embed', 'playpoint-widget.js'), 'utf8');
  const zhStart = widget.indexOf('        zh: {');
  const zhEnd = widget.indexOf('    };', zhStart);
  assert.ok(zhStart >= 0 && zhEnd > zhStart, 'Taiwan widget dictionary block not found');
  const zh = widget.slice(zhStart, zhEnd);
  assert.ok(zh.includes("'1.5': '黃金級'"));
  assert.ok(zh.includes("label: '黃金級', val: 1000"));
  assert.doesNotMatch(zh, /(?<![白黃])金級/);

  assert.equal(terminologyContract.findTaiwanTerminologyViolations('<p>金級</p>').length, 1);
  assert.equal(terminologyContract.findTaiwanTerminologyViolations('<p>累積率</p>').length, 1);
  assert.equal(terminologyContract.findTaiwanTerminologyViolations('<p>累積條件</p>').length, 1);
  assert.equal(terminologyContract.findTaiwanTerminologyViolations('<span data-foreign-terminology>香港では金級</span>').length, 0);

  const source = fs.readFileSync(path.join(root, 'scripts', 'tw-terminology-contract.cjs'), 'utf8');
  assert.doesNotMatch(source, /writeFileSync/);
  assert.doesNotMatch(source, /normalizeTaiwanText/);
  assert.doesNotMatch(source, /syncTaiwanTerminology/);
});

test('Hong Kong tier localization preserves explicitly marked foreign-region terminology', () => {
  const source = '<p>黃金級 / 白金級</p><span data-foreign-terminology>台灣：黃金級 / 白金級</span>';
  const localized = terminologyContract.mapOutsideForeignTerminology(source, chunk => chunk
    .replace(/黃金級/g, '金級')
    .replace(/白金級/g, '鉑金級'));
  assert.ok(localized.includes('<p>金級 / 鉑金級</p>'));
  assert.ok(localized.includes('<span data-foreign-terminology>台灣：黃金級 / 白金級</span>'));
  const regionSource = fs.readFileSync(path.join(root, 'scripts', 'region-page-sync.cjs'), 'utf8');
  assert.ok(regionSource.includes('mapOutsideForeignTerminology'));
  assert.ok(regionSource.includes("require('./tw-terminology-contract.cjs')"));
  assert.doesNotMatch(regionSource, /html\.replace\(\/黃金級\/g/);
  assert.doesNotMatch(regionSource, /html\.replace\(\/白金級\/g/);
});

test('verified Japanese counterparts have reciprocal hreflang sets', () => {
  for (const [slug, jaPath] of Object.entries(ARTICLE_JA_ALTERNATES)) {
    const jaFile = sitePathToFile(jaPath);
    assert.ok(fs.existsSync(jaFile), 'missing Japanese target: ' + jaPath);
    const jaHtml = fs.readFileSync(jaFile, 'utf8');
    // A reciprocal language cluster must include the Japanese page itself exactly once.
    const jaSelf = 'hreflang="ja" href="' + SITE_ORIGIN + jaPath + '"';
    assert.equal(jaHtml.split(jaSelf).length - 1, 1, 'Japanese counterpart must expose exactly one self-referential ja hreflang: ' + jaPath);
    for (const [locale, hreflang] of INTL_LOCALES) {
      const intlFile = path.join(root, locale, 'articles', slug);
      const intlHtml = fs.readFileSync(intlFile, 'utf8');
      assert.ok(intlHtml.includes('hreflang="ja" href="' + SITE_ORIGIN + jaPath + '"'));
      assert.ok(jaHtml.includes('hreflang="' + hreflang + '" href="' + intlUrl(locale, slug) + '"'));
    }
    assert.ok(jaHtml.includes('hreflang="x-default" href="' + intlUrl('en', slug) + '"'));
  }
});

test('international expansion sitemap adds ja only for verified equivalents', () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap-intl-content-expansion.xml'), 'utf8');
  for (const [slug, jaPath] of Object.entries(ARTICLE_JA_ALTERNATES)) {
    if (slug === 'index.html' || !xml.includes('/en/articles/' + slug)) continue;
    const start = xml.indexOf('<loc>https://playpoint-sim.com/en/articles/' + slug + '</loc>');
    assert.ok(start >= 0);
    const blockEnd = xml.indexOf('</url>', start);
    const block = xml.slice(start, blockEnd);
    assert.ok(block.includes('hreflang="ja" href="https://playpoint-sim.com' + jaPath + '"'));
  }
  const slug = 'google-play-points-500-1000-cost.html';
  const start = xml.indexOf('<loc>https://playpoint-sim.com/en/articles/' + slug + '</loc>');
  assert.ok(start >= 0);
  const block = xml.slice(start, xml.indexOf('</url>', start));
  assert.ok(!block.includes('hreflang="ja"'));
});
