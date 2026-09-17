'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { audit } = require('../scripts/navigation-source-map.cjs');
const { auditFragments, checkFragments } = require('../scripts/navigation-fragments.cjs');
const { writeJson, evidenceDir } = require('../.github/scripts/ci-evidence.cjs');
const root = path.resolve(__dirname, '..');

test('公開ページのリンク先・言語横断・fragmentを全件検証し、案内自体を削らない', () => {
  const report = audit(root);
  assert.deepEqual(report.suspiciousEdges, [], 'Unexplained locale crossings or missing public targets');
  for (const locale of ['en', 'ko', 'tw', 'hk', 'in']) {
    const links = report.edges.filter(edge => edge.source === `/${locale}/` && edge.target === '/embed.html');
    assert.equal(links.length, 1, `${locale}: keep one widget entry point`);
    assert.equal(links[0].explicitLocaleFallback, true);
  }
  const diamond = report.edges.filter(edge => edge.source === '/en/status/diamond/' && edge.target === '/articles/2025-12-25-diamond-worth-it.html');
  assert.equal(diamond.length, 1, 'Do not remove the value-comparison reference to pass the audit');
  assert.match(diamond[0].label, /Japan, Japanese/);
  const fragments = auditFragments(root, report.pages);
  writeJson(path.join(evidenceDir(), 'navigation-contract.json'), { checkedAt: new Date().toISOString(), stats: report.stats, fragments });
  assert.ok(fragments.checked > 0, 'Fragment coverage must not be empty');
  assert.deepEqual(fragments.issues, []);
});

test('fragment検査は別ページ・同一ページ・index alias・日本語ID・従来nameを解決する', () => {
  const report = checkFragments([
    { publicPath: '/en/', html: '<a href="/other/index.html?x=1&amp;y=2#%E7%A2%BA%E8%AA%8D">a</a><a href="#local">b</a><i id="local"></i><a href="/other/#legacy">c</a>' },
    { publicPath: '/other/', html: '<p id="確認"></p><a name="legacy"></a>' }
  ]);
  assert.equal(report.checked, 3);
  assert.deepEqual(report.issues, []);
});

test('fragment検査は欠損・不正escapeを落とし、コメント内やscript内の偽IDを認めない', () => {
  const report = checkFragments([{ publicPath: '/', html: '<a href="#missing">a</a><a href="#%ZZ">b</a><a href="#fake">c</a><!-- <i id="fake"> --><script>"<i id=\'missing\'>"</script><a href="#">top</a><a href="#:~:text=abc">text</a><a href="https://example.org/#foreign">external</a>' }]);
  assert.equal(report.checked, 3);
  assert.deepEqual(report.issues.map(item => item.reason), ['missing-fragment', 'invalid-fragment-encoding', 'missing-fragment']);
});
