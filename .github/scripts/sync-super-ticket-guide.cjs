const fs = require('fs');

const ARTICLE_PATH = 'articles/2026-09-08-google-play-super-ticket.html';
const SUPER_WEEKLY_PATH = 'articles/2026-07-31-super-weekly-reward.html';
const ARTICLES_JSON_PATH = 'blog/articles.json';
const VERIFIED_DATES_PATH = 'scripts/article-official-verification-dates.json';

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`置換対象が見つかりません: ${label}`);
  }
  return source.replace(before, after);
}

const articles = JSON.parse(fs.readFileSync(ARTICLES_JSON_PATH, 'utf8'));
if (!articles.some(article => article.id === 'google-play-super-ticket')) {
  articles.unshift({
    id: 'google-play-super-ticket',
    title: 'Google PlayのSuper Ticketとは？使い方・もらい方・保存・注意点',
    date: '2026-09-08',
    category: '使い方',
    tags: ['Play Points', 'Super Ticket', 'スーパーチケット', 'スーパーウィークリー'],
    description: 'Google Play PointsのSuper Ticket（スーパーチケット）について、元の賞品との関係、使い方・もらい方・保存、Play Pass・プラチナ・ダイヤとの関係、通知だけ来て見つからない時まで整理します。',
    file: '../articles/2026-09-08-google-play-super-ticket.html',
    thumbnail: '../articles/ogp/weekly-reward.png'
  });
}
fs.writeFileSync(ARTICLES_JSON_PATH, JSON.stringify(articles, null, 2) + '\n');

const verifiedDates = JSON.parse(fs.readFileSync(VERIFIED_DATES_PATH, 'utf8'));
verifiedDates[ARTICLE_PATH] = '2026-09-08';
const sortedVerifiedDates = Object.fromEntries(Object.entries(verifiedDates).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(VERIFIED_DATES_PATH, JSON.stringify(sortedVerifiedDates, null, 2) + '\n');

let superWeekly = fs.readFileSync(SUPER_WEEKLY_PATH, 'utf8');
superWeekly = replaceRequired(
  superWeekly,
  '<title>Google Play Pointsスーパーウィークリーリワード｜賞品・確率・当選例・Super Ticket</title>',
  '<title>Google Play Pointsスーパーウィークリーリワード｜賞品・確率・当選例</title>',
  'title'
);
superWeekly = replaceRequired(
  superWeekly,
  '<meta name="description" content="スーパーウィークリーリワードでは何が当たる？Google公式の過去賞品、2024年に日本で確認された例、確率が非公開である点、早めに受け取る意味、Super Ticketの注意を整理します。" />',
  '<meta name="description" content="スーパーウィークリーリワードでは何が当たる？Google公式の過去賞品、2024年に日本で確認された例、確率が非公開である点、早めに受け取る意味を整理します。" />',
  'meta description'
);
superWeekly = replaceRequired(
  superWeekly,
  '<meta property="og:title" content="Google Play Pointsスーパーウィークリーリワード｜賞品・確率・当選例・Super Ticket" />',
  '<meta property="og:title" content="Google Play Pointsスーパーウィークリーリワード｜賞品・確率・当選例" />',
  'og:title'
);
superWeekly = replaceRequired(
  superWeekly,
  '"headline":"Google Play Pointsスーパーウィークリーリワード｜賞品・確率・当選例・Super Ticket",',
  '"headline":"Google Play Pointsスーパーウィークリーリワード｜賞品・確率・当選例",',
  'JSON-LD headline'
);
superWeekly = replaceRequired(
  superWeekly,
  '<h1 class="article-title">Google Play Pointsスーパーウィークリーリワード｜賞品・確率・当選例・Super Ticket</h1>',
  '<h1 class="article-title">Google Play Pointsスーパーウィークリーリワード｜賞品・確率・当選例</h1>',
  'H1'
);
superWeekly = replaceRequired(
  superWeekly,
  '<li><a href="#super-ticket">Super Ticketは「もう一回」。使うと最初の特典は残らない</a></li>',
  '<li><a href="#super-ticket">Super Ticketの詳しい使い方は専用ガイドへ</a></li>',
  'TOC Super Ticket'
);

const superTicketSection = /  <section class="section" id="super-ticket">[\s\S]*?\n  <\/section>/;
if (!superTicketSection.test(superWeekly)) {
  throw new Error('Super Ticketセクションが見つかりません');
}
superWeekly = superWeekly.replace(superTicketSection, `  <section class="section" id="super-ticket">
    <h2>Super Ticketの詳しい使い方は専用ガイドへ</h2>
    <p>Super Ticketは、スーパーウィークリーで受け取ったPlay Points賞品を手放して、プレミアム特典へもう一度挑戦するためのチケットです。<strong>元の賞品をキープしたまま追加抽選する仕組みではありません。</strong></p>
    <p>「どうやってもらう？」「保存とは？」「複数枚使える？」「何ポイントなら使う？」まで知りたい場合は、<a href="./2026-09-08-google-play-super-ticket.html">Super Ticketの使い方・もらい方・保存・注意点</a>で詳しく整理しています。</p>
  </section>`);

superWeekly = replaceRequired(
  superWeekly,
  '<li>Super Ticketを使うなら、今の特典を手放してよいか一度考える</li>',
  '<li><a href="./2026-09-08-google-play-super-ticket.html">Super Ticket</a>を使うなら、今の特典を手放してよいか一度考える</li>',
  '金曜ルーティンのSuper Ticket導線'
);

superWeekly = replaceRequired(
  superWeekly,
  '<div class="faq-item"><h3>Super Ticketで外したら元の特典に戻せる？</h3><p>Googleが以前公開していたSuper Ticketの案内では、使うと以前の特典は保持できないと説明されていました。現在の付与状況や期限はGoogle Playの「特典」画面を優先してください。</p></div>\n',
  '',
  'visible FAQ Super Ticket'
);

superWeekly = replaceRequired(
  superWeekly,
  '<li><a href="./2025-12-25-weekly-reward.html">普通のウィークリーリワードは何が出る？毎週の基本を確認</a></li>',
  '<li><a href="./2026-09-08-google-play-super-ticket.html">Super Ticketの使い方・もらい方・保存を詳しく確認</a></li>\n      <li><a href="./2025-12-25-weekly-reward.html">普通のウィークリーリワードは何が出る？毎週の基本を確認</a></li>',
  '関連リンク'
);

fs.writeFileSync(SUPER_WEEKLY_PATH, superWeekly);
console.log('Super Ticket専用記事の台帳・検証日・既存記事の役割分担を同期しました。');
