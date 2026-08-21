const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  MANUAL_LP_FILES,
  extractVisibleLpFaqPairs,
  stableFaqPairsFromStructuredData,
  synchronizeLpFaqStructuredData
} = require('../scripts/lp-faq-sync.cjs');

const root = path.resolve(__dirname, '..');

test('visible details are the source of truth for FAQPage JSON-LD', () => {
  const html = `<!doctype html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Old question","acceptedAnswer":{"@type":"Answer","text":"Old answer"}}]}</script>
</head><body>
<section class="section lp-faq"><h2>よくある疑問</h2>
<details><summary>新しい質問&amp;確認</summary><p>新しい回答です。</p></details>
<details><summary>2つ目の質問</summary><p><strong>本文</strong>から同期します。</p></details>
</section></body></html>`;

  const result = synchronizeLpFaqStructuredData(html);
  assert.equal(result.changed, true);
  assert.deepEqual(stableFaqPairsFromStructuredData(result.html), [
    { question: '新しい質問&確認', answer: '新しい回答です。' },
    { question: '2つ目の質問', answer: '本文から同期します。' }
  ]);
});

test('already synchronized FAQPage stays byte-stable', () => {
  const html = `<!doctype html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"質問","acceptedAnswer":{"@type":"Answer","text":"回答"}}]}</script>
</head><body><section class="lp-faq"><details><summary>質問</summary><p>回答</p></details></section></body></html>`;
  const result = synchronizeLpFaqStructuredData(html);
  assert.equal(result.changed, false);
  assert.equal(result.html, html);
});

test('all seven manual Japanese LPs have visible FAQ and matching FAQPage output', () => {
  assert.equal(MANUAL_LP_FILES.length, 7);
  for (const relativePath of MANUAL_LP_FILES) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const visible = extractVisibleLpFaqPairs(html);
    const structured = stableFaqPairsFromStructuredData(html);
    assert.ok(visible.length > 0, `${relativePath}: visible FAQ is missing`);
    assert.deepEqual(structured, visible, `${relativePath}: FAQPage differs from visible FAQ`);
  }
});
