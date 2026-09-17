'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  auditRepository,
  localeForRoute,
  normalizeInternalHref,
  pageLocale,
  resolveTarget,
  routeForFile,
  scanSourceGenerators
} = require('../scripts/intl-link-source-audit.cjs');

function withFixture(files, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-intl-audit-'));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const absolutePath = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, content, 'utf8');
    }
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('locale and route helpers distinguish Japanese root from regional directories', () => {
  assert.equal(pageLocale('index.html'), 'ja');
  assert.equal(pageLocale('articles/example.html'), 'ja');
  assert.equal(pageLocale('en/articles/example.html'), 'en');
  assert.equal(pageLocale('hk/index.html'), 'hk');
  assert.equal(routeForFile('index.html'), '/');
  assert.equal(routeForFile('en/index.html'), '/en/');
  assert.equal(routeForFile('en/articles/example.html'), '/en/articles/example.html');
  assert.equal(localeForRoute('/tw/articles/example.html'), 'tw');
  assert.equal(localeForRoute('/blog/'), 'ja');
});

test('relative and absolute same-origin hrefs resolve against the source page', () => {
  assert.deepEqual(
    normalizeInternalHref('en/articles/a.html', './b.html?x=1#part'),
    { kind: 'internal', href: './b.html?x=1#part', route: '/en/articles/b.html', hash: '#part', query: '?x=1' }
  );
  assert.equal(
    normalizeInternalHref('en/articles/a.html', 'https://playpoint-sim.com/en/').route,
    '/en/'
  );
  assert.equal(
    normalizeInternalHref('en/articles/a.html', 'https://example.com/').kind,
    'external'
  );
});

test('repository audit detects broken targets and localized Japanese fallbacks', () => {
  withFixture({
    'index.html': '<html><head><link rel="canonical" href="https://playpoint-sim.com/"></head><body></body></html>',
    'articles/foo.html': '<html><head><link rel="canonical" href="https://playpoint-sim.com/articles/foo.html"></head><body></body></html>',
    'en/index.html': '<html><head><link rel="canonical" href="https://playpoint-sim.com/en/"></head><body><a href="/blog/">Blog</a><a href="/articles/foo.html">Foo</a><a href="./missing.html">Missing</a></body></html>',
    'en/articles/foo.html': '<html><head><link rel="canonical" href="https://playpoint-sim.com/en/articles/foo.html"></head><body></body></html>',
    'scripts/example-sync.cjs': "const href='/articles/'; const locale='en'; require('node:fs').writeFileSync('x','x');"
  }, root => {
    const report = auditRepository(root);
    const issues = report.problematicLinks.flatMap(row => row.issues);
    assert.ok(issues.includes('NON_JA_TO_JA_BLOG'));
    assert.ok(issues.includes('LOCALIZED_EQUIVALENT_EXISTS'));
    assert.ok(issues.includes('BROKEN_INTERNAL_TARGET'));
    assert.ok(report.generatorInventory.some(row => row.file === 'scripts/example-sync.cjs'));
  });
});

test('region switcher inventory requires all six supported calculator destinations', () => {
  withFixture({
    'index.html': '<html><head><link rel="canonical" href="https://playpoint-sim.com/"></head><body></body></html>',
    'en/index.html': '<html><head><link rel="canonical" href="https://playpoint-sim.com/en/"></head><body><details class="site-region-switcher"><a href="/">JP</a><a href="/en/">US</a></details></body></html>'
  }, root => {
    const report = auditRepository(root);
    assert.equal(report.regionFindings.length, 1);
    assert.deepEqual(report.regionFindings[0].missing, ['/ko/', '/tw/', '/hk/', '/in/']);
  });
});

test('source inventory only includes files carrying navigation/localization signals', () => {
  withFixture({
    'scripts/a.cjs': "const href='/en/'; const locale='en';",
    'scripts/b.cjs': "console.log('plain utility');",
    'js/c.js': "const region='JP';",
    'README.md': 'href locale'
  }, root => {
    const files = scanSourceGenerators(root).map(row => row.file);
    assert.deepEqual(files, ['js/c.js', 'scripts/a.cjs']);
  });
});

test('current repository scan remains executable and covers every public HTML file discovered', () => {
  const root = path.resolve(__dirname, '..');
  const report = auditRepository(root);
  assert.ok(report.summary.htmlFiles > 0, 'HTMLを1件以上検出すること');
  assert.ok(report.summary.anchors > 0, 'リンクを1件以上検出すること');
  assert.ok(report.summary.generatorCandidates > 0, '生成元候補を1件以上検出すること');
  assert.equal(
    report.summary.problematicLinks,
    report.problematicLinks.length,
    'サマリーと詳細件数が一致すること'
  );
  assert.equal(
    report.summary.headFindings,
    report.headFindings.length,
    'Head監査のサマリーと詳細件数が一致すること'
  );
});
