'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  auditArticleRoleNextActions,
  printAudit
} = require('../scripts/article-role-next-action-audit.cjs');
const { getArticleFiles } = require('../scripts/article-date-contract.cjs');

const root = path.resolve(__dirname, '..');

test('全記事のArticle Roleとgenerated主CTAが一致する', () => {
  const result = auditArticleRoleNextActions(root);
  printAudit(result);

  const expectedArticleFiles = getArticleFiles(root);
  assert.equal(result.articleCount, expectedArticleFiles.length, '登録記事inventoryと同じ全件を監査する');
  assert.deepEqual(result.failures, []);
  assert.equal(
    Object.values(result.roleCounts).reduce((sum, count) => sum + count, 0),
    result.articleCount,
    'every audited article must be counted in exactly one Article Role'
  );
});

test('選定した日本語記事は本文を邪魔しない文脈型の関連ガイドを1枠だけ持つ', () => {
  const expected = new Map([
    ['articles/2025-12-25-weekly-reward.html', './2026-08-16-play-pass-worth-it.html'],
    ['articles/2026-08-16-play-pass-worth-it.html', './2026-08-03-play-points-device-change.html'],
    ['articles/2026-08-03-play-points-device-change.html', './2026-08-05-play-country-change-points.html'],
    ['articles/2026-08-16-points-disappeared.html', './2025-12-25-expiration.html'],
    ['articles/2025-12-25-diamond-vip.html', './2026-09-19-google-play-super-ticket.html'],
    ['articles/2025-12-25-playpoints-rank-maintenance.html', './2025-12-25-refund.html'],
    ['articles/2026-07-24-play-points-1-value.html', './2025-12-25-best-use.html'],
    ['articles/2026-07-25-play-credit-not-working.html', './2025-12-25-expiration.html'],
    ['articles/2025-12-25-getting-started.html', './2025-12-25-best-use.html'],
    ['articles/2026-08-19-redeemed-item-not-received.html', './2025-12-25-check-balance.html'],
    ['articles/2026-08-16-gold-platinum-worth-it.html', './2026-08-16-play-pass-worth-it.html']
  ]);

  for (const [file, href] of expected) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const marker = 'data-contextual-nav="editorial"';
    assert.equal(html.split(marker).length - 1, 1, file + ': contextual guide must appear exactly once');
    assert.ok(html.includes('href="' + href + '"'), file + ': expected contextual target is missing');

    const markerIndex = html.indexOf(marker);
    const navStart = html.lastIndexOf('<nav', markerIndex);
    const navEnd = html.indexOf('</nav>', markerIndex);
    assert.ok(navStart >= 0 && navEnd > navStart, file + ': contextual nav markup is incomplete');
    const card = html.slice(navStart, navEnd + 6);
    assert.ok(card.includes('aria-label="この話をもう少し詳しく"'), file + ': contextual nav needs a concise purpose label');
    assert.ok(!card.includes('関連ガイド｜'), file + ': repeated system-like prefix should not be part of the link text');
    assert.ok(!/>\s*(?:こちら|詳細|詳しくはこちら)\s*(?:→)?\s*<\/a>/.test(card), file + ': generic anchor text is not allowed');
    assert.ok(!/\sstyle=/.test(card), file + ': contextual guide must use the shared design system instead of inline CSS');
    assert.match(
      html,
      /href="\/articles\/contextual-guide-links\.css\?v=[a-f0-9]{10}"/,
      file + ': contextual guide component stylesheet is missing'
    );

    // 実際の祖先要素・幅・フォーカスはui-contract-browserが全対象を確認する。
  }
  // 長い支払い方法の記事は、直前の説明に結び付いた通常の本文リンクを使う。
  // 「詳しくはこちら」という名称も、前後に購入経路・付与時点の説明があれば許容する。
  const payment = fs.readFileSync(path.join(root, 'articles/2026-08-16-payment-methods-points.html'), 'utf8');
  const body = payment.slice(payment.indexOf('<!-- reading-tools:end -->'), payment.indexOf('data-editorial-next="true"'));
  assert.match(body, /Google Playを通らない[\s\S]*?href="\/articles\/2026-08-19-web-store-external-billing-points.html">詳しくはこちら/);
  assert.match(body, /付与タイミング[\s\S]*?href="\/articles\/2025-12-25-gift-card.html">詳しくはこちら/);
  assert.equal((body.match(/href="\/articles\//g) || []).length, 2);
  assert.equal(payment.includes('reader-followthrough:start'), false, '個別のおすすめ欄へ同じ導線を重ねない');
});
