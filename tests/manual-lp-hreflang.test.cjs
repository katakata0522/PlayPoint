const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  HREFLANG_ORDER,
  MANUAL_LP_SLUGS,
  expectedAlternates,
  extractAlternateLinks,
  synchronizeManualLpHreflang
} = require('../scripts/manual-lp-hreflang-sync.cjs');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('manual LP synchronizer inserts the complete alternate cluster once', () => {
  const html = '<html><head>\n    <link rel="canonical" href="https://playpoint-sim.com/status/gold/">\n</head></html>';
  const result = synchronizeManualLpHreflang(html, 'status/gold');
  assert.equal(result.changed, true);
  assert.deepEqual(extractAlternateLinks(result.html), expectedAlternates('status/gold'));

  const stable = synchronizeManualLpHreflang(result.html, 'status/gold');
  assert.equal(stable.changed, false);
  assert.equal(stable.html, result.html);
});

test('all seven Japanese manual LPs advertise ja/en/ko/zh-TW/x-default exactly once', () => {
  assert.equal(MANUAL_LP_SLUGS.length, 7);
  for (const slug of MANUAL_LP_SLUGS) {
    const html = read(`${slug}/index.html`);
    const links = extractAlternateLinks(html);
    assert.deepEqual(links, expectedAlternates(slug), `${slug}: alternate cluster differs`);
    for (const hreflang of HREFLANG_ORDER) {
      assert.equal(links.filter(([lang]) => lang === hreflang).length, 1, `${slug}: duplicate ${hreflang}`);
    }
  }
});

test('generated international LPs reciprocate the same Japanese URL cluster', () => {
  for (const slug of MANUAL_LP_SLUGS) {
    const expected = expectedAlternates(slug);
    for (const locale of ['en', 'ko', 'tw']) {
      const html = read(`${locale}/${slug}/index.html`);
      const links = extractAlternateLinks(html);
      assert.deepEqual(links, expected, `${locale}/${slug}: reciprocal alternate cluster differs`);
    }
  }
});
