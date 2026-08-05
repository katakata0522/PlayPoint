const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('日本語のランク総合記事が5段階と判定値の違いを説明する', () => {
  const html = read('articles/2026-08-05-play-points-levels-guide.html');
  for (const term of ['ブロンズ', 'シルバー', 'ゴールド', 'プラチナ', 'ダイヤモンド']) {
    assert.match(html, new RegExp(term));
  }
  for (const threshold of ['250', '1,000', '4,000', '15,000']) {
    assert.match(html, new RegExp(threshold));
  }
  assert.match(html, /使えるポイント残高/);
  assert.match(html, /年間のレベル進捗/);
});

test('登録できない記事が参加条件を順番に切り分ける', () => {
  const html = read('articles/2026-08-05-play-points-cannot-join.html');
  assert.match(html, /管理されていないGoogleアカウント/);
  assert.match(html, /有効な支払い方法/);
  assert.match(html, /請求先住所/);
  assert.match(html, /Google Playの国/);
  assert.doesNotMatch(html, /国を変更すれば必ず/);
});

test('国変更記事がポイント・残高・変更条件を混同しない', () => {
  const html = read('articles/2026-08-05-play-country-change-points.html');
  assert.match(html, /Play Pointsとステータスは.*引き継がれ/);
  assert.match(html, /Google Play残高/);
  assert.match(html, /90日/);
  assert.match(html, /ファミリーグループ/);
  assert.match(html, /最大48時間|最長48時間|48時間/);
});

test('倍率記事が直接レートと倍率入力を足し合わせない', () => {
  const html = read('articles/2026-08-05-play-points-multiplier-stacking.html');
  assert.match(html, /足し算しない/);
  assert.match(html, /100円あたり3ポイント/);
  assert.match(html, /税金を除いた/);
  assert.match(html, /商品ごと/);
  assert.match(html, /四捨五入/);
});

test('シルバー記事が購入予定と高い獲得率を組み合わせる', () => {
  const html = read('articles/2026-08-05-fastest-silver.html');
  assert.match(html, /250ポイント/);
  assert.match(html, /25,000円/);
  assert.match(html, /お得/);
  assert.match(html, /購入予定/);
  assert.match(html, /高い獲得率|高獲得率/);
  assert.doesNotMatch(html, /無駄な課金/);
  assert.match(html, /status\/silver/);
});

test('ウィークリー記事が通常リワードとPlay Pass週次特典を分離する', () => {
  const html = read('articles/2025-12-25-weekly-reward.html');
  assert.match(html, /通常のウィークリーリワードはシルバー以上が公式対象/);
  assert.match(html, /通常のウィークリーリワードはシルバー以上/);
  assert.match(html, /Play Pass加入中なら木曜日/);
  assert.doesNotMatch(html, /利用者報告/);
  assert.match(html, /Play Pass/);
  assert.doesNotMatch(html, /ブロンズは通常リワードの対象外です/);
});

test('シルバー計算入口の上部からお得記事へ移動できる', () => {
  const html = read('status/silver/index.html');
  assert.match(html, /lp-secondary-link[^>]+2026-08-05-fastest-silver\.html/);
});

test('倍率キャンペーン入口からシルバーのお得記事へ移動できる', () => {
  for (const file of ['campaign/2x/index.html', 'campaign/3x/index.html']) {
    assert.match(read(file), /2026-08-05-fastest-silver\.html/);
  }
});

test('記事一覧へ新規5本が重複なく登録される', () => {
  const articles = JSON.parse(read('blog/articles.json'));
  const ids = [
    'play-points-levels-guide',
    'play-points-cannot-join',
    'play-country-change-points',
    'play-points-multiplier-stacking',
    'fastest-silver'
  ];
  for (const id of ids) assert.equal(articles.filter(article => article.id === id).length, 1);
  const weekly = articles.find(article => article.id === 'weekly-reward');
  assert.equal(weekly.modified, '2026-08-05');
  assert.match(weekly.title, /対象ランク/);
});
