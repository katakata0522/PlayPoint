const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function readArticle(fileName) {
  return fs.readFileSync(path.join(root, 'articles', fileName), 'utf8');
}

test('通常のウィークリーリワードとPlay Pass週次特典を区別して案内する', () => {
  const html = readArticle('2025-12-25-weekly-reward.html');
  assert.match(html, /通常のウィークリーリワード/);
  assert.match(html, /シルバー以上/);
  assert.match(html, /Play Pass/);
  assert.match(html, /通常のウィークリーリワードはシルバー以上が公式対象/);
  assert.match(html, /通常のウィークリーリワードはシルバー以上/);
  assert.match(html, /Play Pass加入中なら木曜日/);
  assert.doesNotMatch(html, /利用者.*表示報告|例外的な表示報告/);
  assert.doesNotMatch(html, /最大\s*(?:3|10|200|500|1,000)\s*pt/);
  assert.doesNotMatch(html, /Play Pointsに登録していれば<strong>無料で毎週もらえます/);
});

test('入門記事の獲得対象は現在の日本向け公式案内に合わせる', () => {
  const html = readArticle('2025-12-25-getting-started.html');
  assert.match(html, /Androidから(?:購入したGoogle One|のGoogle One定期購入|Google Oneを定期購入)/);
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
  assert.match(html, /対象コンテンツは国によって異なります|対象は国や時期、アカウントによって変わる/);
  assert.doesNotMatch(html, /購入・レンタルした映画/);
  assert.doesNotMatch(html, /購入した楽曲やアルバム/);
  assert.doesNotMatch(html, /映画・書籍・音楽・有料アプリ、<strong>すべて対象/);
});

test('サブスク記事は現行の公式確認項目だけを例示する', () => {
  const html = readArticle('2025-12-25-subscription.html');
  assert.match(html, /Androidから(?:購入したGoogle One|のGoogle One定期購入|Google Oneを定期購入)/);
  assert.doesNotMatch(html, /YouTube Premium/);
  assert.doesNotMatch(html, /Spotify, Netflix/);
  assert.match(html, /Play Pointsの(?:ポイント)?履歴/);
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

test('終了済みの2025年末から2026年正月予測には履歴記事の明示がある', () => {
  const html = readArticle('2025-12-25-new-year-campaign.html');
  assert.match(html, /(?:予測対象期間|当時の予測期間|2025年末の予測)(?:は|が)?(?:すでに)?終了/);
  assert.match(html, /過去(?:の開始日や倍率|傾向|予測)/);
});

// 旧 jp-guide-batch-20260805 から、計算・参加条件の誤案内防止に直結する要点だけ残す
test('日本語ランク総合記事は5段階としきい値の違いを説明する', () => {
  const html = readArticle('2026-08-05-play-points-levels-guide.html');
  for (const term of ['ブロンズ', 'シルバー', 'ゴールド', 'プラチナ', 'ダイヤモンド']) {
    assert.match(html, new RegExp(term));
  }
  for (const threshold of ['250', '1,000', '4,000', '15,000']) {
    assert.match(html, new RegExp(threshold));
  }
  assert.match(html, /使えるポイント残高|年間のレベル進捗/);
});

test('倍率記事は直接レートと倍率入力を足し合わせない', () => {
  const html = readArticle('2026-08-05-play-points-multiplier-stacking.html');
  assert.match(html, /高い方|いずれか高い|max|最大/);
  assert.doesNotMatch(html, /レートに倍率を掛けてさらに加算|加算して合算/);
});

test('参加できない記事は条件を順番に切り分け、国変更を万能策にしない', () => {
  const html = readArticle('2026-08-05-play-points-cannot-join.html');
  assert.match(html, /管理されていないGoogleアカウント|有効な支払い方法|請求先住所|Google Playの国/);
  assert.doesNotMatch(html, /国を変更すれば必ず/);
});

test('Playポイントデー記事は最大7倍を全員共通と書かない', () => {
  const html = readArticle('2026-08-16-play-points-day.html');
  assert.match(html, /最大7倍/);
  assert.match(html, /貯める/);
  assert.match(html, /ステータスによって変わる/);
  assert.doesNotMatch(html, /ダイヤ(?:モンド)?は5倍|プラチナは3倍|全員が7倍/);
  assert.doesNotMatch(html, /カレンダー/);
});

test('YouTube Premium記事は公式獲得対象リストへ載せない', () => {
  const html = readArticle('2026-08-16-youtube-premium-play-points.html');
  assert.match(html, /YouTube Premiumというサービス名は載っていません/);
  assert.match(html, /AndroidからのGoogle One定期購入/);
  assert.doesNotMatch(html, /Android(?:アプリ)?から契約すれば必ず貯まる/);
  assert.doesNotMatch(html, /公式の獲得対象です[^か]/);
});

test('Pixel割引記事は常設特典表に無いことを明記する', () => {
  const html = readArticle('2026-08-16-pixel-discount-coupon.html');
  assert.match(html, /Pixel割引は載っていません/);
  assert.match(html, /特典/);
  assert.doesNotMatch(html, /必ずクーポン|常設特典としてPixel|最大3万円/);
});

test('ウィークリーリワード非表示記事はシルバー以上と金曜を守り上限を断定しない', () => {
  const html = readArticle('2026-08-16-weekly-reward-not-showing.html');
  assert.match(html, /シルバー以上/);
  assert.match(html, /金曜日/);
  assert.doesNotMatch(html, /最大\s*(?:100|200|500|1,000)\s*(?:pt|ポイント)/);
  assert.doesNotMatch(html, /カレンダー/);
});

test('1月1日再判定記事は残高リセットと到達年の即日降格を書かない', () => {
  const html = readArticle('2026-08-16-january-rank-reset.html');
  assert.match(html, /翌年の年末まで維持/);
  assert.match(html, /前年の獲得ポイント/);
  assert.doesNotMatch(html, /1月1日にポイント(?:残高)?(?:も)?(?:が)?消える/);
  assert.doesNotMatch(html, /到達した翌年1月1日に必ず下がる/);
});
