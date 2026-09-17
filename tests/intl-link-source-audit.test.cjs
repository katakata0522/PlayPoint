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
  routeForFile,
  scanSourceGenerators
} = require('../scripts/intl-link-source-audit.cjs');
const {
  buildBaseline,
  markdownReport,
  ownershipForFile,
  runtimeRegionContract,
  sameMaintenanceFamily
} = require('../scripts/intl-link-source-baseline.cjs');

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

function writeCiEvidence(report) {
  if (!process.env.RUNNER_TEMP) return;
  const dir = path.join(process.env.RUNNER_TEMP, 'playpoint-ci-evidence');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'intl-link-source-audit.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'intl-link-source-audit.md'), markdownReport(report) + '\n');
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
  assert.equal(normalizeInternalHref('en/articles/a.html', 'https://playpoint-sim.com/en/').route, '/en/');
  assert.equal(normalizeInternalHref('en/articles/a.html', 'https://example.com/').kind, 'external');
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

test('region switcher inventory requires all six supported calculator destinations for anchor-based switchers', () => {
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

test('maintenance cross-locale links are recognized as explicit language-switch intent', () => {
  assert.equal(sameMaintenanceFamily('en/maintenance/diamond/index.html', '/maintenance/diamond/'), true);
  assert.equal(sameMaintenanceFamily('en/maintenance/diamond/index.html', '/ko/maintenance/diamond/'), true);
  assert.equal(sameMaintenanceFamily('en/maintenance/diamond/index.html', '/tw/maintenance/platinum/'), false);
});

test('ownership classification points international families at the responsible build stages', () => {
  assert.equal(ownershipForFile('en/articles/example.html').sourceFamily, 'intl-article');
  assert.equal(ownershipForFile('ko/games/fgo/index.html').sourceFamily, 'intl-game');
  assert.equal(ownershipForFile('tw/status/diamond/index.html').sourceFamily, 'intl-seo-landing');
  assert.ok(ownershipForFile('en/index.html').ownerCandidates.includes('scripts/language-page-builder.cjs'));
});

test('runtime region contract requires all six supported calculator regions', () => {
  withFixture({
    'js/region-navigation.js': "const REGION_PATHS={JP: '',US: 'en/',KR: 'ko/',TW: 'tw/',HK: 'hk/',IN: 'in/'};"
  }, root => {
    assert.deepEqual(runtimeRegionContract(root), { file: 'js/region-navigation.js', ok: true, missing: [] });
  });
});

test('current repository baseline remains executable, precise, and emits full CI evidence', () => {
  const root = path.resolve(__dirname, '..');
  const report = buildBaseline(root);
  assert.ok(report.summary.htmlFiles > 0, 'HTMLを1件以上検出すること');
  assert.ok(report.summary.anchors > 0, 'リンクを1件以上検出すること');
  assert.ok(report.summary.generatorCandidates > 0, '生成元候補を1件以上検出すること');
  assert.equal(report.summary.problematicLinks, report.problematicLinks.length, '精密化後サマリーと詳細件数が一致すること');
  assert.equal(report.summary.regionFindings, report.regionFindings.length, 'regionサマリーと詳細件数が一致すること');
  assert.equal(report.runtimeRegionContract.ok, true, 'runtime region mapが6地域を保持すること');
  writeCiEvidence(report);
  console.log('[intl-link-source-baseline]', JSON.stringify(report.summary));
});
