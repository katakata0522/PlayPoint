'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const superWeeklyPath = 'articles/2026-07-31-super-weekly-reward.html';
const questsPath = 'articles/2026-07-31-google-play-quests.html';

test('新規記事は記事台帳へ一意に登録される', () => {
  const articles = JSON.parse(read('blog/articles.json'));
  const ids = articles.map(article => article.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('super-weekly-reward'));
  assert.ok(ids.includes('google-play-quests'));
  assert.ok(fs.existsSync(path.join(root, superWeeklyPath)));
  assert.ok(fs.existsSync(path.join(root, questsPath)));
});

test('スーパーウィークリー記事は一般条件と個別条件を分離する', () => {
  const html = read(superWeeklyPath);

  assert.ok(html.includes('ゴールド・プラチナ・ダイヤモンド'));
  assert.ok(html.includes('金曜日の午前0時以降'));
  assert.ok(html.includes('賞品数には限り'));
  assert.ok(html.includes('今週あなたに表示される賞品と残数は確認できません'));
  assert.ok(html.includes('play.google.com/store/apps/editorial'));
  assert.ok(html.includes('./2025-12-25-weekly-reward.html'));

  const misleadingGuarantees = html
    .replace(/<[^>]*>/g, ' ')
    .split(/[。！？\n]/)
    .filter(sentence => /必ず当たる|絶対に当たる/.test(sentence))
    .filter(sentence => !/ではなく|ではない|とは限ら|保証(?:され)?(?:ない|ません)/.test(sentence));

  assert.deepEqual(misleadingGuarantees, []);
});

test('クエスト記事は対象・購入・ログイン・返金条件を案内する', () => {
  const html = read(questsPath);

  assert.ok(html.includes('アカウントごとに異なります'));
  assert.ok(html.includes('Play Gamesプロフィールへのログイン'));
  assert.ok(html.includes('ポイントをアイテムへ交換する行為は'));
  assert.ok(html.includes('キャンセル・返金'));
  assert.ok(html.includes('support.google.com/googleplay/answer/11534416'));
  assert.ok(html.includes('./2025-12-25-play-games.html'));
});

test('週次親記事は3制度を比較し日記を主要導線にする', () => {
  const html = read('articles/2025-12-25-weekly-reward.html');

  assert.ok(html.includes('通常のウィークリーリワード'));
  assert.ok(html.includes('スーパーウィークリーリワード'));
  assert.ok(html.includes('Play Passの週次ボーナス・ブースター'));
  assert.ok(html.includes('ほくほくリワード日記'));
  assert.ok(html.includes('./2026-07-31-super-weekly-reward.html'));
});

test('無料獲得記事は無料・追加購入なし・有料条件を混同しない', () => {
  const html = read('articles/2026-07-24-earn-play-points-free.html');

  assert.ok(html.includes('完全無料'));
  assert.ok(html.includes('追加購入なし'));
  assert.ok(html.includes('Play Pass契約が前提'));
  assert.ok(html.includes('購入が必要'));
  assert.ok(html.includes('./2026-07-31-google-play-quests.html'));
});

test('買い切り購入と継続課金の記事は役割を相互案内する', () => {
  const purchaseHtml = read('articles/2025-12-25-movies-books.html');
  const subscriptionHtml = read('articles/2025-12-25-subscription.html');

  assert.ok(purchaseHtml.includes('買い切り購入'));
  assert.ok(purchaseHtml.includes('./2025-12-25-subscription.html'));
  assert.ok(subscriptionHtml.includes('継続課金'));
  assert.ok(subscriptionHtml.includes('Google Play経由で請求'));
  assert.ok(subscriptionHtml.includes('./2025-12-25-movies-books.html'));
});

test('今回のPlay Points公式記事群へ第三者決済キャンペーンを混入させない', () => {
  const paths = [
    superWeeklyPath,
    questsPath,
    'articles/2025-12-25-weekly-reward.html',
    'articles/2026-07-24-earn-play-points-free.html',
    'latest/index.html'
  ];

  for (const relativePath of paths) {
    assert.doesNotMatch(read(relativePath), /\bJCB\b/i, relativePath);
  }
});
