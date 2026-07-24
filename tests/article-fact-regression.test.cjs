const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function readArticle(fileName) {
  return fs.readFileSync(path.join(root, 'articles', fileName), 'utf8');
}

test('通常のウィークリーリワードと例外的な週次特典を区別して案内する', () => {
  const html = readArticle('2025-12-25-weekly-reward.html');
  assert.match(html, /通常のウィークリーリワード/);
  assert.match(html, /シルバー以上/);
  assert.match(html, /Play Pass/);
  assert.match(html, /ブロンズは通常リワードの対象外です/);
  assert.doesNotMatch(html, /最大\s*(?:3|10|200|500|1,000)\s*pt/);
  assert.doesNotMatch(html, /Play Pointsに登録していれば<strong>無料で毎週もらえます/);
});

test('入門記事の獲得対象は現在の日本向け公式案内に合わせる', () => {
  const html = readArticle('2025-12-25-getting-started.html');
  assert.match(html, /Androidから購入したGoogle One/);
  assert.doesNotMatch(html, /映画・書籍・音楽/);
  assert.doesNotMatch(html, /YouTube Premium、Google One/);
  assert.doesNotMatch(html, /ウィークリーリワードの上限アップ/);
  assert.match(html, /シルバー以上になったら<strong>通常のウィークリーリワード/);
});

test('週次特典を使う補足記事にもシルバー以上の条件を明記する', () => {
  const expiration = readArticle('2025-12-25-expiration.html');
  const multipleAccounts = readArticle('2025-12-25-multiple-accounts.html');
  assert.match(expiration, /シルバー以上/);
  assert.doesNotMatch(expiration, /ウィークリーリワード<\/strong>を受け取る（毎週無料）/);
  assert.match(multipleAccounts, /通常のウィークリーリワードは、<strong>シルバー以上の対象アカウント/);
  assert.match(multipleAccounts, /Play Pass向け/);
});

test('ゲーム以外の記事は終了・未確認サービスを獲得対象と断定しない', () => {
  const html = readArticle('2025-12-25-movies-books.html');
  assert.match(html, /対象は国や時期、アカウントによって変わる/);
  assert.doesNotMatch(html, /購入・レンタルした映画/);
  assert.doesNotMatch(html, /購入した楽曲やアルバム/);
  assert.doesNotMatch(html, /映画・書籍・音楽・有料アプリ、<strong>すべて対象/);
});

test('サブスク記事は現行の公式確認項目だけを例示する', () => {
  const html = readArticle('2025-12-25-subscription.html');
  assert.match(html, /Androidから購入したGoogle One/);
  assert.doesNotMatch(html, /YouTube Premium/);
  assert.doesNotMatch(html, /Spotify, Netflix/);
  assert.match(html, /Play Pointsの履歴/);
});

test('ダイヤモンド記事は未公表の週次上限を事実扱いしない', () => {
  const html = readArticle('2025-12-25-diamond-vip.html');
  assert.doesNotMatch(html, /プラチナ最大500pt/);
  assert.doesNotMatch(html, /上限が高いのは事実/);
  assert.match(html, /平均値や当選分布は公表されていません/);
});

test('反映時間は公式案内にない時間幅を断定しない', () => {
  const html = readArticle('2025-12-25-check-balance.html');
  assert.doesNotMatch(html, /数時間〜数日/);
  assert.match(html, /コンテンツやデバイスによって時間がかかる場合/);
});

test('節約効果を税務上の完全非課税と断定しない', () => {
  const html = readArticle('2026-06-29-savings-game-fire.html');
  assert.doesNotMatch(html, /完全に非課税/);
  assert.doesNotMatch(html, /2,400万円/);
  assert.match(html, /120万円 ÷ 4% = 3,000万円/);
  assert.match(html, /利回りは保証されず、元本割れの可能性/);
  assert.match(html, /個別の税務判断は収入やポイントの取得方法などで異なります/);
});

test('終了済みの2025年末から2026年正月予測には履歴記事の明示がある', () => {
  const html = readArticle('2025-12-25-new-year-campaign.html');
  assert.match(html, /現在は予測対象期間が終了している/);
  assert.match(html, /過去予測の記録/);
});
