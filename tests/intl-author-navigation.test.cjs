'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { audit, extractAnchors } = require('../scripts/navigation-source-map.cjs');
const { syncIntlManualLpFooters } = require('../scripts/insert-lp-footers.cjs');
const { synchronizeIntlArticleLayouts } = require('../scripts/intl-article-layout.cjs');
const { buildHongKongPage, buildIndiaPage } = require('../scripts/region-page-sync.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-author-links-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function write(dir, file, content) {
  const target = path.join(dir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return target;
}

test('全公開海外ページの通常の著者導線は同言語版を使い、言語切替を残す', () => {
  const report = audit(root);
  const links = report.edges.filter(edge => edge.sourceLocale !== 'ja' && edge.target.endsWith('/author/katakata.html'));
  for (const locale of ['en', 'ko', 'tw', 'hk', 'in']) {
    assert.ok(links.some(edge => edge.sourceLocale === locale), `${locale}: author navigation must not be deleted`);
  }
  for (const edge of links) {
    assert.ok(fs.existsSync(path.join(root, edge.target)), `${edge.source}: exact author target must exist`);
    if (edge.source.includes('/author/') && edge.transitionKind === 'locale-switch') continue;
    const expected = { hk: 'tw', in: 'en' }[edge.sourceLocale] || edge.sourceLocale;
    assert.equal(edge.targetLocale, expected, `${edge.source}: ${edge.rawHref}`);
    if (['hk', 'in'].includes(edge.sourceLocale)) {
      assert.equal(edge.explicitLocaleFallback, true, `${edge.source}: fallback language must be visible`);
    }
  }
  for (const locale of ['en', 'ko', 'tw']) {
    for (const page of report.pages.filter(page => page.locale === locale && page.area !== 'author')) {
      assert.ok(links.some(edge => edge.source === page.publicPath), `${page.publicPath}: author navigation is required`);
    }
  }
});

test('海外手書きLPは共通フッターに同期し、本文・法務リンクを保って冪等になる', t => {
  const dir = fixture(t);
  const paths = [];
  for (const locale of ['en', 'ko', 'tw']) {
    for (const slug of ['maintenance/diamond', 'maintenance/platinum', 'points-cost']) {
      const file = `${locale}/${slug}/index.html`;
      paths.push(write(dir, file, read(file).replace(`href="/${locale}/author/katakata.html"`, 'href="/author/katakata.html"')));
    }
  }
  const unrelated = write(dir, 'en/articles/unrelated.html', '<p>Do not touch.</p>');
  const beforeMain = paths.map(file => fs.readFileSync(file, 'utf8').split('<footer')[0]);
  assert.deepEqual(syncIntlManualLpFooters(dir), { checked: 9, changed: 9 });
  assert.deepEqual(syncIntlManualLpFooters(dir), { checked: 9, changed: 0 });
  assert.deepEqual(paths.map(file => fs.readFileSync(file, 'utf8').split('<footer')[0]), beforeMain);
  assert.equal(fs.readFileSync(unrelated, 'utf8'), '<p>Do not touch.</p>');
  for (const file of paths) {
    const html = fs.readFileSync(file, 'utf8');
    assert.equal((html.match(/<footer\b/g) || []).length, 1);
    assert.ok(html.includes('href="/privacy.html"'));
    assert.ok(html.includes('href="/terms.html"'));
  }
  fs.writeFileSync(paths[0], '<main>Missing managed footer</main>');
  assert.throws(() => syncIntlManualLpFooters(dir), /Expected one managed footer/);
});

test('記事の旧二階層相対著者リンクを生成元で直し、外部参照や本文を変えない', t => {
  const dir = fixture(t);
  const original = '<html><body><main class="main-card"><h1>Test guide</h1><p>Exact article copy.</p>'
    + '<a href="../../author/katakata.html" rel="author">Katakata</a>'
    + '<a href="https://example.com/author/katakata.html">External</a></main></body></html>';
  const file = write(dir, 'en/articles/sample.html', original);
  synchronizeIntlArticleLayouts(dir);
  const first = fs.readFileSync(file, 'utf8');
  assert.ok(first.includes('<a href="/en/author/katakata.html" rel="author">Katakata</a>'));
  assert.ok(first.includes('<a href="https://example.com/author/katakata.html">External</a>'));
  assert.ok(first.includes('<p>Exact article copy.</p>'));
  synchronizeIntlArticleLayouts(dir);
  assert.equal(fs.readFileSync(file, 'utf8'), first);
});

test('香港・インドの著者参照は既存言語版へ向き、地域計算条件を流用しない', () => {
  for (const [locale, sourceLocale, build, lang] of [
    ['hk', 'tw', buildHongKongPage, '繁體中文'],
    ['in', 'en', buildIndiaPage, 'English']
  ]) {
    const html = build(read(`${sourceLocale}/index.html`));
    const authorLinks = extractAnchors(html, `/${locale}/`).filter(edge => edge.target.endsWith('/author/katakata.html'));
    assert.equal(authorLinks.length, 3, `${locale}: description, footer, byline remain present`);
    for (const edge of authorLinks) {
      assert.equal(edge.target, `/${sourceLocale}/author/katakata.html`);
      assert.ok(edge.label.includes(lang));
      assert.equal(edge.label.split(lang).length, 2, 'language marker must not be duplicated');
    }
    assert.ok(html.includes(`https://playpoint-sim.com/${locale}/`));
    assert.ok(html.includes(locale === 'hk' ? '"priceCurrency": "HKD"' : '"priceCurrency": "INR"'));
  }
});
