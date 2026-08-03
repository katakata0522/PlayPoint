'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const resolvePath = relativePath => path.join(root, relativePath);
const read = relativePath => fs.readFileSync(resolvePath(relativePath), 'utf8');
const write = (relativePath, content) => fs.writeFileSync(resolvePath(relativePath), content, 'utf8');

function replaceRequired(content, before, after, label) {
  if (!content.includes(before)) {
    throw new Error(`置換対象が見つかりません: ${label}`);
  }
  return content.replace(before, after);
}

function ensureContains(content, expected, label) {
  if (!content.includes(expected)) {
    throw new Error(`必要な内容がありません: ${label}`);
  }
}

const balancePath = 'articles/2025-12-25-check-balance.html';
let balance = read(balancePath);
balance = balance.replace(
  './2025-12-25-rank-maintenance-reset.html',
  './2025-12-25-playpoints-rank-maintenance.html'
);
const reflectionParagraph = '      <p>履歴に購入自体がない場合は、別のGoogleアカウントで購入していないか、注文が完了しているかを先に確認します。履歴に購入はあるのにポイントだけ見当たらない場合は、反映待ちや対象条件を確認します。</p>';
const reflectionNote = '      <p>Google公式は、ポイントの反映にはコンテンツやデバイスによって時間がかかる場合があると案内しています。購入履歴があるのにポイントだけ見当たらない場合は、<a href="./2026-03-10-play-points-reflection-timing.html">反映が遅い時の確認順</a>へ進んでください。</p>';
if (!balance.includes('コンテンツやデバイスによって時間がかかる場合')) {
  balance = replaceRequired(
    balance,
    reflectionParagraph,
    `${reflectionParagraph}\n${reflectionNote}`,
    '残高・履歴記事の反映遅延案内'
  );
}
ensureContains(balance, './2025-12-25-playpoints-rank-maintenance.html', '正しいランク維持記事へのリンク');
write(balancePath, balance);

const devicePath = 'articles/2026-08-03-play-points-device-change.html';
let device = read(devicePath);
const deviceSourceMarker = '        <li><a href="https://support.google.com/googleplay/answer/9077247?hl=ja" target="_blank" rel="noopener noreferrer">Google Play Pointsに関する問題を解決する方法</a></li>';
if (!device.includes('answer/7431675')) {
  device = replaceRequired(
    device,
    deviceSourceMarker,
    `${deviceSourceMarker}\n        <li><a href="https://support.google.com/googleplay/answer/7431675?hl=ja" target="_blank" rel="noopener noreferrer">Google Playの国を変更した場合のポイントとステータス</a></li>\n        <li><a href="https://support.google.com/googleplay/answer/15776077?hl=ja" target="_blank" rel="noopener noreferrer">Google Play Pointsの参加条件と対応端末</a></li>`,
    '機種変更記事の国変更・対応端末の一次情報'
  );
}
write(devicePath, device);

const weeklyPath = 'articles/2025-12-25-weekly-reward.html';
let weekly = read(weeklyPath);
weekly = weekly
  .replace(
    '<meta property="article:modified_time" content="2026-07-31T00:00:00+09:00" />',
    '<meta property="article:modified_time" content="2026-08-03T00:00:00+09:00" />'
  )
  .replace(
    '<p class="hero-meta">2026/07/31 更新 ・ 読了 6分</p>',
    '<p class="hero-meta">2026/08/03 更新 ・ 読了 7分</p>'
  )
  .replace(/"dateModified":"2026-07-31"/g, '"dateModified":"2026-08-03"');

const weeklyMarker = `    <section class="section">\n      <h2>表示されない時の確認順</h2>`;
const weeklyDeviceSection = `    <section class="section">\n      <h2>新しい端末ではPlay Pass特典の表示に時間がかかる場合がある</h2>\n      <p>Google公式は、Play Passアカウントを新しいモバイル端末へ追加した場合、ポリシーとコンプライアンスの確認により、Play Pointsの週次リワードやその他のプロモーション特典が表示されるまでに<strong>最長15日ほどかかることがある</strong>と案内しています。</p>\n      <p>これは通常のポイント残高が消えるという意味ではありません。新端末で同じGoogleアカウントを選び、残高・履歴とPlay Passの週次特典を分けて確認してください。</p>\n      <p><a href="./2026-08-03-play-points-device-change.html">機種変更後の引き継ぎと、特典が表示されない時の確認順</a></p>\n    </section>\n\n`;
if (!weekly.includes('2026-08-03-play-points-device-change.html')) {
  weekly = replaceRequired(weekly, weeklyMarker, weeklyDeviceSection + weeklyMarker, '週次記事の新端末セクション');
}
write(weeklyPath, weekly);

const blogIndexPath = 'blog/index.html';
let blogIndex = read(blogIndexPath);
const staticNewArticleLink = '                    <li><a href="../articles/2026-08-03-play-points-device-change.html">機種変更でGoogle Play Pointsは消える？引き継ぎ・表示されない時の確認</a></li>';
const staticNewArticleMarker = '                <ul>\n                    <li><a href="../articles/2026-07-31-super-weekly-reward.html">Google Play Pointsのスーパーウィークリーリワードとは？Super Ticketの注意点</a></li>';
if (!blogIndex.includes('../articles/2026-08-03-play-points-device-change.html')) {
  blogIndex = replaceRequired(
    blogIndex,
    staticNewArticleMarker,
    `                <ul>\n${staticNewArticleLink}\n                    <li><a href="../articles/2026-07-31-super-weekly-reward.html">Google Play Pointsのスーパーウィークリーリワードとは？Super Ticketの注意点</a></li>`,
    'JavaScript無効時の新着記事リンク'
  );
}
write(blogIndexPath, blogIndex);

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

const updatedArticles = articles.filter(article => article.id !== newArticle.id);
updatedArticles.unshift(newArticle);

function updateEntry(id, patch) {
  const entry = updatedArticles.find(article => article.id === id);
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

write(articlesPath, JSON.stringify(updatedArticles, null, 2) + '\n');
fs.rmSync(resolvePath('articles/styles/2025-12-25-check-balance.css'), { force: true });

console.log('人間向けの記事統合、静的導線、一次情報、残滓削除を適用しました。');
