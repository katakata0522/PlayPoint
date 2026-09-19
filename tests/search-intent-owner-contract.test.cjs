'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('high-impression JP articles expose the observed search intent without keyword stuffing', () => {
  const superWeekly = read('articles/2026-07-31-super-weekly-reward.html');
  assert.match(
    superWeekly,
    /<title>Google Play Pointsスーパーウィークリーリワードとは？賞品・確率・Super Ticket<\/title>/
  );
  assert.match(
    superWeekly,
    /<h1[^>]*>Google Play Pointsスーパーウィークリーリワードとは？賞品・確率・Super Ticket<\/h1>/
  );
  assert.match(superWeekly, /スーパーウィークリーリワードとは？何が当たるの？/);

  const quests = read('articles/2026-07-31-google-play-quests.html');
  assert.match(
    quests,
    /<title>Google Playのクエストとは？購入条件と表示・達成されない時の確認方法<\/title>/
  );
  assert.match(
    quests,
    /<h1[^>]*>Google Playのクエストとは？購入条件と表示・達成されない時の確認方法<\/h1>/
  );
  assert.match(quests, /「購入」に数えられる取引/);

  const reflection = read('articles/2026-03-10-play-points-reflection-timing.html');
  assert.match(
    reflection,
    /<title>Google Play Pointsが反映されない・遅い時は？いつ付くかと確認する順番<\/title>/
  );
  assert.match(
    reflection,
    /<h1[^>]*>Google Play Pointsが反映されない・遅い時は？いつ付くかと確認する順番<\/h1>/
  );
});

test('Korean balance-check intent has one clear owner and descriptive internal anchors', () => {
  const balance = read('ko/articles/google-play-points-balance-history-progress.html');
  assert.match(
    balance,
    /<title>Google Play Points 잔액·내역·등급 진행도 확인 방법<\/title>/
  );
  assert.match(
    balance,
    /<h1[^>]*>Google Play Points 잔액·내역·등급 진행도 확인 방법<\/h1>/
  );
  assert.match(
    balance,
    /Google Play Points 사용법｜쿠폰·Play 크레딧 교환 방법/
  );

  const useCoupons = read('ko/articles/google-play-points-use-coupons.html');
  assert.match(
    useCoupons,
    /href="\/ko\/articles\/google-play-points-balance-history-progress\.html">Google Play Points 잔액·내역·등급 진행도 확인 방법<\/a>/
  );

  const hub = read('ko/articles/index.html');
  assert.match(hub, /data-search="구글포인트 확인 google play points 확인 잔액 내역 등급 진행도 계정·기본"/);
  assert.match(hub, />Google Play Points 잔액·내역·등급 진행도 확인 방법<\/span>/);

  const generator = read('scripts/intl-content-expansion.cjs');
  assert.match(generator, /ko: "Google Play Points 잔액·내역·등급 진행도 확인 방법"/);
});

test('exchange comparison and cash-out pages state their different jobs with reciprocal links', () => {
  const cash = read('articles/2026-07-24-play-points-cash-conversion.html');
  assert.match(
    cash,
    /href="\.\/2025-12-25-best-use\.html">交換先おすすめ・使い道の比較ガイド<\/a>/
  );
  assert.match(cash, /「現金化できるか」ではなく、<strong>交換先や使い道を比べたい<\/strong>/);

  const bestUse = read('articles/2025-12-25-best-use.html');
  assert.match(
    bestUse,
    /href="\.\/2026-07-24-play-points-cash-conversion\.html">現金化・PayPay交換の可否ガイド<\/a>/
  );
  assert.match(bestUse, /<strong>現金やPayPayへ換えられるか<\/strong>を先に確認したい場合/);
});

test('central article surfaces stay in sync with updated JP titles', () => {
  const expected = [
    'Google Play Pointsスーパーウィークリーリワードとは？賞品・確率・Super Ticket',
    'Google Playのクエストとは？購入条件と表示・達成されない時の確認方法',
    'Google Play Pointsが反映されない・遅い時は？いつ付くかと確認する順番'
  ];

  for (const file of ['blog/articles.json', 'blog/index.html', 'feed.xml', 'atom.xml']) {
    const source = read(file);
    for (const title of expected) {
      assert.ok(source.includes(title), `${file} missing updated title: ${title}`);
    }
  }
});
