'use strict';

// RSS時差判定の実装箇所を診断するための一時マーカー。
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const write = (relativePath, content) => fs.writeFileSync(path.join(root, relativePath), content, 'utf8');

function replaceRequired(content, before, after, label) {
  if (!content.includes(before)) {
    throw new Error(`置換対象が見つかりません: ${label}`);
  }
  return content.replace(before, after);
}

const weeklyPath = 'articles/2025-12-25-weekly-reward.html';
let weekly = read(weeklyPath);
weekly = replaceRequired(
  weekly,
  '<meta property="article:modified_time" content="2026-07-31T00:00:00+09:00" />',
  '<meta property="article:modified_time" content="2026-08-03T00:00:00+09:00" />',
  '週次記事 modified meta'
);
weekly = replaceRequired(
  weekly,
  '<p class="hero-meta">2026/07/31 更新 ・ 読了 6分</p>',
  '<p class="hero-meta">2026/08/03 更新 ・ 読了 7分</p>',
  '週次記事 hero date'
);
weekly = weekly.replace(/"dateModified":"2026-07-31"/g, '"dateModified":"2026-08-03"');

const weeklyMarker = `    <section class="section">
      <h2>表示されない時の確認順</h2>`;
const weeklyDeviceSection = `    <section class="section">
      <h2>新しい端末ではPlay Pass特典の表示に時間がかかる場合がある</h2>
      <p>Google公式は、Play Passアカウントを新しいモバイル端末へ追加した場合、ポリシーとコンプライアンスの確認により、Play Pointsの週次リワードやその他のプロモーション特典が表示されるまでに<strong>最長15日ほどかかることがある</strong>と案内しています。</p>
      <p>これは通常のポイント残高が消えるという意味ではありません。新端末で同じGoogleアカウントを選び、残高・履歴とPlay Passの週次特典を分けて確認してください。</p>
      <p><a href="./2026-08-03-play-points-device-change.html">機種変更後の引き継ぎと、特典が表示されない時の確認順</a></p>
    </section>

`;
if (!weekly.includes('2026-08-03-play-points-device-change.html')) {
  weekly = replaceRequired(weekly, weeklyMarker, weeklyDeviceSection + weeklyMarker, '週次記事の新端末セクション');
}
write(weeklyPath, weekly);

const articlesPath = 'blog/articles.json';
const articles = JSON.parse(read(articlesPath));
const newArticle = {
  id: 'device-change',
  title: '機種変更でGoogle Play Pointsは消える？引き継ぎ・表示されない時の確認',
  date: '2026-08-03',
  modified: '2026-08-03',
  category: 'トラブル',
  tags: ['Play Points', '機種変更', '引き継ぎ', '新端末'],
  description: '機種変更後も同じGoogleアカウントならPlay Pointsの残高・ランク・履歴は通常引き継がれます。別アカウント、国変更、Play Pass特典の最長15日遅延など、表示されない時の確認順を解説します。',
  file: '../articles/2026-08-03-play-points-device-change.html',
  thumbnail: '../articles/ogp/multiple-accounts.png'
};

const withoutDevice = articles.filter(article => article.id !== newArticle.id);
withoutDevice.unshift(newArticle);

function updateEntry(id, patch) {
  const entry = withoutDevice.find(article => article.id === id);
  if (!entry) throw new Error(`記事台帳に対象がありません: ${id}`);
  Object.assign(entry, patch);
}

updateEntry('check-balance', {
  modified: '2026-08-03',
  description: 'Google Play Pointsの残高、ポイント履歴、有効期限、年間のレベル進捗を確認する手順を解説。購入・週次特典・交換・返金の履歴の見分け方と、表示されない時の確認順も整理します。'
});
updateEntry('weekly-reward', {
  modified: '2026-08-03',
  description: 'Google Play Pointsの通常・スーパー・Play Pass週次特典を比較。対象者、木曜・金曜の更新、受け取り方、新端末でPlay Pass特典が最長15日ほど遅れる場合の確認順を解説します。'
});
updateEntry('play-points-cash-conversion', {
  title: 'Google Play Pointsは現金化できる？交換先・使い道を比較',
  modified: '2026-08-03',
  category: '使い方',
  tags: ['Play Points', '現金化', '交換先', '使い道'],
  description: 'Google Play Pointsは現金、PayPay、銀行口座へ送れません。Playクレジット、クーポン、アプリ内アイテム、パートナー特典、購入時利用を期限・払い戻し条件で比較します。'
});

write(articlesPath, JSON.stringify(withoutDevice, null, 2) + '\n');
console.log('人間向けの記事構成と台帳を更新しました。');
