'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { renderHeader, renderNavigation } = require('./japanese-navigation-sidebar.cjs');
const { createRevision } = require('./article-asset-versioning.cjs');
const ORIGIN = 'https://playpoint-sim.com';
const MODIFIED = '2026-10-04';
const TOPIC_GUIDES = [
  { slug: 'ranks', label: 'ランクを上げる・維持する', title: 'Play Pointsのランクを上げる・維持するには？', topic: 'ランク・ステータス',
    description: '今年のステータス判定ポイントとポイント残高を分け、目標ランク・翌年の維持・必要額を順番に確認する案内です。',
    answer: 'ランクを上げたいときは「今年のステータス判定ポイント」を確認します。交換に使うポイント残高とは別です。ポイントを使ってもステータス判定ポイントは減らず、達成したランクは翌年末まで維持されます。',
    sections: [
      ['最初に、目標と現在地を確認する', '今のランクだけでなく、今年のステータス判定ポイントと次のランクまでの差を見ます。過去に交換したポイントを差し戻して数える必要はありません。', '/articles/2026-08-05-play-points-levels-guide.html', 'ランクごとの獲得率・必要ポイントを見る'],
      ['「ランク維持」と「年初の進捗リセット」を分ける', '今年ランクへ到達した場合と、前年のランクを引き継いでいる場合では、次に必要な確認が違います。現在のランクと今年の進捗を見て、翌年の再判定に必要な獲得を確認します。', '/articles/2025-12-25-playpoints-rank-maintenance.html', '維持期間と翌年の再判定を確認する'],
      ['必要額は、実際の獲得率で計算する', '通常の獲得率と、表示されている増量オファーを分けます。増量が有効な対象購入なら、その条件を使って不足ポイントに必要な額を見積もります。税・購入ごとの丸め・対象外購入により実際の値は変わるため、購入画面の予定ポイントも確認してください。', '/', '現在のポイントから必要額を計算する'],
      ['追加課金する価値があるか判断する', 'ランク特典を使う予定がない場合、ランクのためだけの購入は節約になりません。すでに予定している対象購入で達成できるかを先に見て、特典の利用頻度と追加負担を比べます。', '/articles/2026-08-16-gold-platinum-worth-it.html', 'ゴールド・プラチナの特典と負担を考える']
    ] },
  { slug: 'using-points', label: 'ポイントの使い道を選ぶ', title: 'Play Pointsの使い道はどう選ぶ？', topic: '使う・交換',
    description: '使う予定、交換先の条件、有効期限から、Playクレジット・クーポン・アイテムを選ぶための案内です。',
    answer: '近いうちに使う予定がある交換先を優先します。使える場所を広く取りたいならPlayクレジット、対象ゲームの商品を買う予定があるならクーポンやアイテムの条件を比べます。Play Points自体を現金に換えたり、他のアカウントへ移したりはできません。',
    sections: [
      ['「使う」に出ている交換先から比べる', '交換先は国・アカウント・時期で変わります。他の人の画面と同じとは限らないため、自分の「使う」に出ている必要ポイントと内容を比べてください。交換先が見つからないときは、アカウントと対象地域を確認します。', '/articles/2025-12-25-best-use.html', 'Playクレジット・クーポン・アイテムを比較する'],
      ['交換前に、利用条件と期限を確認する', 'クーポンは対象ゲームや最低購入額、利用期限を確認します。条件を満たす購入予定がなければ、表示上の割引額をそのまま得する額として扱えません。', '/articles/2026-07-25-play-points-coupon-not-applied.html', 'クーポンの適用条件と確認手順を見る'],
      ['ポイントとPlayクレジットの期限を分ける', '交換に使うポイント残高と、交換後のPlayクレジットは別の残高です。ポイント残高は最後の獲得または使用から1年。交換後はクレジット側の期限も確認し、使い切る予定がある分を交換します。', '/articles/2025-12-25-expiration.html', 'ポイントの失効日を確認する'],
      ['現金・PayPayに替えたい場合', 'Google Play Pointsは換金できません。Playクレジットへの交換も現金化ではなく、対象のGoogle Play購入に使う残高への交換です。換金をうたう案内と混同しないでください。', '/articles/2026-07-24-play-points-cash-conversion.html', '現金化・PayPay交換の可否を見る']
    ] },
  { slug: 'troubleshooting', label: '困っている状況から探す', title: 'Play Pointsのトラブルはどこから確認する？', topic: 'トラブル・アカウント',
    description: '登録できない、購入ポイントが付かない、残高が減った、週次特典が見えない場合を切り分ける案内です。',
    answer: 'まず「参加できない」「購入後に増えない」「残高が減った」「特典カードがない」のどれかを選びます。ポイント残高、今年のランク進捗、特典の受取期限は別です。購入したGoogleアカウントと、今見ているアカウントが同じかを先に確認してください。',
    sections: [
      ['登録ボタンやPlay Pointsが見つからない', 'アカウントの参加条件とPlayの国を確認します。学校や保護者に管理されているアカウント、支払い方法などの条件を、公式の案内と自分の設定で照合します。', '/articles/2026-08-05-play-points-cannot-join.html', '参加できない・表示されないときの確認順'],
      ['購入したのにポイントが増えない', '注文が完了・保留・キャンセル・返金のどれかを確認し、Play Pointsの履歴と購入アカウントを照合します。通常購入とインストール特典では条件や待ち時間が異なるため、一律に待つだけでは切り分けられません。', '/articles/2026-03-10-play-points-reflection-timing.html', '購入ポイントの反映を確認する'],
      ['残高や今年の進捗が減った', '残高の失効・交換・返金・国変更と、年初のランク再判定を分けて確認します。ランク進捗がリセットされたことだけで、交換に使える残高まで消えたとは判断できません。', '/articles/2026-08-16-points-disappeared.html', '消えたもの別の確認手順へ進む'],
      ['ウィークリーのカードが来ない', '対象ランク、受け取り済みか、画面に書かれた期限、対象となる週を確認します。受取前のカードの期限と、受取後のポイント残高の期限は別です。', '/articles/2026-08-16-weekly-reward-not-showing.html', 'ウィークリーが表示されないときの確認順']
    ] }
];
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function guideFiles() { return TOPIC_GUIDES.map(guide => `guides/${guide.slug}/index.html`); }
function guideEntries() { return TOPIC_GUIDES.map(guide => ({ url: `${ORIGIN}/guides/${guide.slug}/`, lastmod: MODIFIED })); }
function renderTopicGuide(root, guide) {
  const url = `${ORIGIN}/guides/${guide.slug}/`, image = `${ORIGIN}/images/guides/${guide.slug}.jpg`;
  const css = ['articles/article-modern.css', 'articles/japanese-shell.css', 'articles/guide-navigation.css', 'articles/guide-editorial.css', 'articles/article-discovery.css', 'articles/reading-theme.css'];
  const js = ['js/reading-theme.js', 'js/analytics-core.js', 'js/guide-navigation.js', 'js/third-party.js'];
  const assets = css.map(asset => `<link rel="stylesheet" href="/${asset}?v=${createRevision(path.join(root, asset))}">`).join('\n');
  const scripts = js.map((asset, i) => `<script${i ? ' defer' : ''} src="/${asset}?v=${createRevision(path.join(root, asset))}"></script>`).join('\n');
  const structured = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': url, url, name: guide.title, description: guide.description, inLanguage: 'ja', dateModified: MODIFIED, author: { '@type': 'Person', name: 'かたかた', url: ORIGIN + '/author/katakata.html' } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'ホーム', item: ORIGIN + '/' }, { '@type': 'ListItem', position: 2, name: '記事一覧', item: ORIGIN + '/blog/' }, { '@type': 'ListItem', position: 3, name: guide.label, item: url }] }
  ] };
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(guide.title)} | PlayPoint</title><meta name="description" content="${escape(guide.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta property="og:type" content="website"><meta property="og:site_name" content="Google Play Points 完全攻略ガイド"><meta property="og:title" content="${escape(guide.title)}"><meta property="og:description" content="${escape(guide.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:alt" content="${escape(guide.label)}"><meta property="og:locale" content="ja_JP"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${image}"><script type="application/ld+json">${JSON.stringify(structured)}</script>${assets}${scripts}</head><body>${renderHeader()}${renderNavigation('')}<div class="breadcrumbs-wrapper"><nav aria-label="パンくずリスト"><a href="/">ホーム</a> &gt; <a href="/blog/">記事一覧</a> &gt; <span aria-current="page">${escape(guide.label)}</span></nav></div><main class="reader-guide"><header class="hero"><h1>${escape(guide.title)}</h1><p class="reader-source">案内更新 ${MODIFIED} · 基本ルールの公式確認 ${MODIFIED} · 日本向け</p></header><section class="answer-box"><h2>最初に確認すること</h2><p>${escape(guide.answer)}</p><p class="reader-source"><a href="https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&amp;hl=ja">Google公式：獲得・残高・ステータスの基本ルール</a></p></section><nav class="reader-guide-order" aria-label="状況別の読む順番"><ol>${guide.sections.map(([heading], i) => `<li><a href="#step-${i + 1}">${escape(heading)}</a></li>`).join('')}</ol></nav>${guide.sections.map(([heading, body, href, label], i) => `<section class="section" id="step-${i + 1}"><h2>${escape(heading)}</h2><p>${escape(body)}</p><p><a href="${href}">${escape(label)} →</a></p></section>`).join('')}<p><a href="/blog/?topic=${encodeURIComponent(guide.topic)}">このテーマのすべての記事を見る</a></p><p><a href="/author/katakata.html" rel="author">運営者・検証方針：かたかた</a></p></main><footer class="site-footer"><p><a href="/blog/">記事一覧</a> · <a href="/privacy.html">プライバシーポリシー</a> · <a href="/terms.html">利用規約</a></p><p>PlayPointは非公式のガイド・計算サイトです。</p></footer></body></html>\n`;
}
function syncTopicGuides(root) {
  for (const guide of TOPIC_GUIDES) {
    const file = path.join(root, `guides/${guide.slug}/index.html`); fs.mkdirSync(path.dirname(file), { recursive: true });
    const output = renderTopicGuide(root, guide);
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output) fs.writeFileSync(file, output);
  }
  const file = path.join(root, 'blog/index.html'); let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<!-- reader-topics:start -->[\s\S]*?<!-- reader-topics:end -->\s*/g, '');
  const links = '<!-- reader-topics:start --><nav class="reader-topic-entry" aria-label="目的別の読む順番">' + TOPIC_GUIDES.map(guide => `<a href="/guides/${guide.slug}/">${guide.label}</a>`).join('') + '</nav><!-- reader-topics:end -->';
  html = html.replace('<!-- hub-library-mount -->', links + '\n        <!-- hub-library-mount -->'); fs.writeFileSync(file, html);
  return TOPIC_GUIDES.length;
}
module.exports = { TOPIC_GUIDES, MODIFIED, guideFiles, guideEntries, renderTopicGuide, syncTopicGuides };
