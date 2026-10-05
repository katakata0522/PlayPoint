'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { renderGuideBrand } = require('./japanese-guide-brand.cjs');
const { classifyArticleRole } = require('./article-role-registry.cjs');
const { normalizeSharedArticleCopy } = require('./article-static-usability.cjs');
const { extractRelatedTargets } = require('./article-role-next-action-audit.cjs');
const { selectRelatedArticles } = require('./intl-related-guides.cjs');
const { getJapanesePopularGuides, POPULAR_GUIDES_SNAPSHOT, POPULAR_GUIDES_WINDOW } = require('./japanese-popular-guides.cjs');

const BROWSE_CATEGORIES = Object.freeze([
  'はじめて・基本',
  'ランク・ステータス',
  '貯める・キャンペーン',
  '使う・交換',
  'トラブル・アカウント',
  'ゲーム別課金',
  '最新情報・イベント'
]);

const NAV = Object.freeze([
  ['/blog/', '記事トップ'],
  ['/latest/', '開催中の特典'],
  ['/guides/ranks/', 'ランク・維持条件'],
  ['/blog/?topic=' + encodeURIComponent('貯める・キャンペーン'), '貯める・キャンペーン'],
  ['/guides/using-points/', '使い道を選ぶ'],
  ['/guides/troubleshooting/', '困ったときの確認'],
  ['/', '必要額を計算する']
]);
const escapeHtml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SIDEBAR = /<aside\b[^>]*class=["'][^"']*\bsidebar-column\b[^"']*["'][^>]*>[\s\S]*?<\/aside>/i;
const GLOBAL_NAV = /<nav\b[^>]*class=["'][^"']*\bglobal-nav\b[^"']*["'][^>]*>[\s\S]*?<\/nav>/i;

const LEGACY_SIDEBAR_LINKS = Object.freeze([
  '<link rel="stylesheet" href="/articles/japanese-sidebar-v2.css?v=a151192444">\n',
  '<link rel="stylesheet" href="/articles/japanese-sidebar-v2.css">\n'
]);

function removeLegacySidebarStylesheet(html) {
  let result = html;
  for (const link of LEGACY_SIDEBAR_LINKS) result = result.replaceAll(link, '');
  return result;
}


function categoryFor(article, role) {
  if (role === 'troubleshooting') return 'troubleshooting';
  if (article.category === 'ランク') return 'levels';
  if (article.category === 'キャンペーン' || role === 'decision_support' || role === 'retention') return 'earn';
  return 'account';
}

function relatedFor(article, html, catalog) {
  const byPath = new Map(catalog.map(item => [item.path, item]));
  const selected = extractRelatedTargets(article.path, html).filter(target => target !== article.path && byPath.has(target));
  // 本文に3件そろっている場合は、全候補の採点・並べ替えを省く。
  if (selected.length < 3) {
    for (const [href] of selectRelatedArticles(catalog, article.path, catalog.length)) {
      const target = href.replace(/^\//, '');
      if (!selected.includes(target)) selected.push(target);
      if (selected.length >= 3) break;
    }
  }
  return selected.slice(0, 3).map(target => byPath.get(target));
}

function nextFor(role, related, article) {
  if (/pixel-discount/.test(article?.path || '')) return ['/latest/', '最新情報の「その他の特典」を確認する'];
  if (role === 'calculator_bridge') return ['/', 'あなたの必要額を計算する'];
  if (role === 'retention') return ['/latest/', '次回の特典・確認日を調べる'];
  if (role === 'game_decision') {
    const match = String(article?.path || '').match(/^games\/([^/]+)\/[^/]+\/index\.html$/);
    if (match) return ['/games/' + match[1] + '/', '同じゲームの課金額を計算する'];
    const calculator = (article?.related || []).find(([href]) => /^\/games\/[a-z0-9-]+\/$/.test(href));
    if (calculator) return [calculator[0], (article.gameTitle || '同じゲーム') + 'の購入額を計算する'];
    if (article?.gameTitle === 'ポケスリ') return ['/articles/2026-07-25-play-points-coupon-not-applied.html', 'クーポンが使えないときの確認順を見る'];
    return ['/games/', 'ゲーム別の購入額を試算する'];
  }
  if (role === 'hold' || !related.length) return ['/blog/', '公開中のガイドを探す'];
  return [related[0].href, related[0].label];
}

function renderSearchWidget() {
  return `  <section class="sidebar-widget sidebar-widget--search"><h2 class="sidebar-widget-title">記事を探す</h2><div class="sidebar-widget-body"><form class="sidebar-search-form" action="/blog/" method="get" role="search"><input class="sidebar-search-input" type="search" name="q" aria-label="記事を検索"><button class="sidebar-search-button" type="submit">検索</button></form><div class="sidebar-search-footer"><a class="sidebar-browse-link" href="/blog/">すべての記事を見る</a></div></div></section>`;
}

function renderBrowseWidget(catalog = [], currentArticle = null) {
  const counts = new Map(BROWSE_CATEGORIES.map(label => [label, 0]));
  for (const article of catalog) {
    if (counts.has(article.browseCategory)) counts.set(article.browseCategory, counts.get(article.browseCategory) + 1);
  }
  return `  <section class="sidebar-widget sidebar-widget--browse"><h2 class="sidebar-widget-title">カテゴリーで絞る</h2><div class="sidebar-widget-body"><ul class="sidebar-browse-list">${BROWSE_CATEGORIES.map(label => {
    const count = counts.get(label) || 0;
    const current = currentArticle?.browseCategory === label;
    return `<li class="sidebar-browse-item${current ? ' is-current-topic' : ''}"><a class="sidebar-browse-category" href="/blog/?topic=${encodeURIComponent(label)}"><span>${escapeHtml(label)}</span><span class="sidebar-browse-count" aria-label="${count}件">${count}</span></a></li>`;
  }).join('')}</ul></div></section>`;
}

function publicThumbnail(value, rootDir = path.resolve(__dirname, '..')) {
  const relative = String(value || '').replace(/^\.\.\//, '');
  if (!/^(?:articles\/ogp\/[^/?#]+\.png|articles\/thumbnails\/[a-z0-9-]+\.webp|images\/game-icons\/[a-z0-9-]+\.(?:png|jpe?g|webp)|ogp\.png)$/i.test(relative)) return '';
  const original = '/' + relative;
  const sourcePath = path.join(rootDir, relative);
  if (!fs.existsSync(sourcePath)) return original;
  // 小表示用の派生画像は原本の内容に結び付ける。原本更新時は古い派生を使わない。
  const digest = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex').slice(0, 16);
  const thumbnail = `images/navigation-thumbnails/${digest}-186.webp`;
  return fs.existsSync(path.join(rootDir, thumbnail)) ? '/' + thumbnail : original;
}

function isSquareThumbnail(value) {
  const relative = String(value || '').replace(/^\.\.\//, '');
  return /^(?:articles\/thumbnails\/[a-z0-9-]+\.webp|images\/game-icons\/[a-z0-9-]+\.(?:png|jpe?g|webp))$/i.test(relative);
}

function renderPopularWidget(article, catalog = []) {
  const popular = getJapanesePopularGuides(article.href, 5);
  const byHref = new Map(catalog.map(item => [item.href, item]));
  return `  <section class="sidebar-widget sidebar-widget--popular" data-popular-snapshot="${escapeHtml(POPULAR_GUIDES_SNAPSHOT)}"><h2 class="sidebar-widget-title">よく読まれている記事</h2><div class="sidebar-widget-body"><p class="sidebar-widget-note">集計期間 ${escapeHtml(POPULAR_GUIDES_WINDOW)}</p><ol class="sidebar-popular-list">${popular.map(item => {
    const rank = String(item.rank).padStart(2, '0');
    const meta = byHref.get(item.href);
    const featured = item.rank === 1;
    const thumbnail = featured ? publicThumbnail(meta?.thumbnail) : '';
    const squareThumbnail = thumbnail && isSquareThumbnail(meta?.thumbnail);
    const topic = featured && meta?.browseCategory ? `<span class="sidebar-popular-topic">${escapeHtml(meta.browseCategory)}</span>` : '';
    const title = item.isCurrent
      ? `<span class="sidebar-popular-current-title">${escapeHtml(item.label)}</span><span class="sidebar-popular-reading">閲覧中</span>`
      : `<a class="sidebar-popular-link" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`;
    if (featured) {
      return `<li class="sidebar-popular-item sidebar-popular-item--featured${thumbnail ? '' : ' sidebar-popular-item--text-only'}${item.isCurrent ? ' is-current' : ''}"><span class="sidebar-popular-rank">${rank}</span>${thumbnail ? `<div class="sidebar-popular-thumb${squareThumbnail ? ' sidebar-popular-thumb--square' : ''}"><img src="${escapeHtml(thumbnail)}" alt="" loading="lazy" decoding="async"></div>` : ''}<div class="sidebar-popular-feature-copy">${topic}${title}</div></li>`;
    }
    return `<li class="sidebar-popular-item${item.isCurrent ? ' is-current' : ''}"><span class="sidebar-popular-rank">${rank}</span><div>${title}</div></li>`;
  }).join('')}</ol></div></section>`;
}

function renderAuthorWidget() {
  return `  <section class="sidebar-widget sidebar-widget--author"><h2 class="sidebar-widget-title">運営者情報</h2><div class="sidebar-widget-body"><div class="sidebar-author-avatar" aria-hidden="true">か</div><p class="sidebar-author-name">かたかた</p><p class="sidebar-author-copy">2026年9月、ついにGoogle Play Pointsのダイヤモンドに到達。本人がいちばんびっくりしつつ、お得なゲーム課金やGoogle Playまわりの情報を、実際に使いながら調べて発信しています。</p><div class="sidebar-author-links"><a href="/author/katakata.html">運営者について</a><a href="https://katakatalab.com/" target="_blank" rel="noopener noreferrer">KatakataLab</a></div></div></section>`;
}

// 一覧・本文・最新情報で同じ入口と見た目を使う。
function renderHeader(isBlog = false) {
  return `<header class="site-header guide-header"><div class="site-header-inner"><a href="/blog/" class="${isBlog ? 'brand' : 'site-logo'}">${renderGuideBrand(isBlog)}</a><div class="site-header-links"><a href="/author/katakata.html">運営者・検証方針</a><button type="button" id="theme-toggle" class="reading-theme-toggle" aria-label="テーマ切替">☀️</button></div></div></header>`;
}

function navigationAssets(html) {
  const existing = html.match(/<!-- guide-navigation-assets:start -->[\s\S]*?<!-- guide-navigation-assets:end -->/)?.[0];
  if (existing?.includes('/articles/guide-editorial.css')) return html;
  // 生成済みの専用ブロックを置換する。旧配置は独立した行ごと移行する。
  html = html.replace(/<!-- guide-navigation-assets:start -->[\s\S]*?<!-- guide-navigation-assets:end -->\n?/g, '');
  html = html.split('\n').filter(line => !/^\s*<(?:link|script)\s[^<>]*(?:href="\/articles\/(?:guide-navigation|guide-editorial)\.css|src="\/js\/guide-navigation\.js)/.test(line)).join('\n');
  return html.replace('</head>', '<!-- guide-navigation-assets:start -->\n<link rel="stylesheet" href="/articles/guide-navigation.css">\n<script src="/js/guide-navigation.js"></script>\n<link rel="stylesheet" href="/articles/guide-editorial.css">\n<!-- guide-navigation-assets:end -->\n</head>');
}

function renderGamesWidget(catalog) {
  const games = [...new Set(catalog.map(item => item.gameTitle).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'));
  return `<section class="sidebar-widget sidebar-widget--games"><h2 class="sidebar-widget-title">ゲーム別に探す</h2><div class="sidebar-widget-body"><ul class="sidebar-game-list">${games.map(name => `<li><a href="/blog/?game=${encodeURIComponent(name)}">${escapeHtml(name)}</a></li>`).join('')}</ul><a href="/games/">ゲーム別の計算機を見る</a></div></section>`;
}

function renderNavigation(current) {
  const guideByTopic = { 'ランク・ステータス': '/guides/ranks/', '使う・交換': '/guides/using-points/', 'トラブル・アカウント': '/guides/troubleshooting/' };
  const topic = new URL(current || '/', 'https://playpoint-sim.com').searchParams.get('topic');
  current = guideByTopic[topic] || current;
  return '<nav class="global-nav ja-global-nav" aria-label="目的から探す"><div class="global-nav-inner">'
    + NAV.map(([href, label]) => `<a class="nav-item" href="${escapeHtml(href)}"${href === current ? ' aria-current="page"' : ''}><span>${label}</span></a>`).join('') + '</div></nav>';
}

function renderHubSidebar(current, catalog = []) {
  return `<aside class="sidebar-column ja-article-sidebar guide-hub-sidebar" aria-label="カテゴリー・人気記事と計算機">
${renderSearchWidget()}
${renderBrowseWidget(catalog)}
${renderGamesWidget(catalog)}
${renderPopularWidget({ href: current }, catalog)}
<section class="sidebar-widget"><h2 class="sidebar-widget-title">必要額を計算する</h2><div class="sidebar-widget-body"><p>目標ランクまであといくら？現在のポイントから確認できます。</p><a class="sidebar-next-link" href="/">Playポイント計算機へ →</a></div></section>
${renderAuthorWidget()}
</aside>`;
}

function syncGuideHubs(root, catalog) {
  for (const [file, current] of [['blog/index.html', '/blog/'], ['latest/index.html', '/latest/']]) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) continue;
    const before = fs.readFileSync(absolute, 'utf8');
    let html = before;
    const isBlog = current === '/blog/';
    const header = renderHeader(isBlog) + '\n' + renderNavigation(current);
    if (html.includes('<!-- guide-header:start -->')) {
      html = html.replace(/<!-- guide-header:start -->[\s\S]*?<!-- guide-header:end -->/, `<!-- guide-header:start -->${header}<!-- guide-header:end -->`);
    } else if (isBlog) {
      html = html.replace(/<header class="blog-header[\s\S]*?<\/aside>/, `<!-- guide-header:start -->${header}<!-- guide-header:end -->`);
      html = html.replace('<main>', '<div class="guide-hub-layout"><main class="guide-hub-main">');
      html = html.replace('</main>', '</main><!-- guide-sidebar:start --><!-- guide-sidebar:end --></div>');
    } else {
      html = html.replace(/[ \t]*<header class="lp-page-header">[\s\S]*?<\/header>/, '');
      html = html.replace(/(<main class="calculator-wrapper lp-wrapper latest-visual">)/, `<!-- guide-header:start -->${header}<!-- guide-header:end --><div class="guide-hub-layout guide-latest-layout">$1`);
      html = html.replace('</main>', '</main><!-- guide-sidebar:start --><!-- guide-sidebar:end --></div>');
      html = html.replace('<html lang="ja">', '<html lang="ja" data-reading-theme="light">');
      html = html.replace('</head>', '<script src="/js/reading-theme.js"></script>\n<link rel="stylesheet" href="/articles/reading-theme.css">\n</head>');
    }
    html = html.replace(/<!-- guide-sidebar:start -->[\s\S]*?<!-- guide-sidebar:end -->/, `<!-- guide-sidebar:start -->${renderHubSidebar(current, catalog)}<!-- guide-sidebar:end -->`);
    if (!html.includes('/articles/japanese-shell.css')) html = html.replace('</head>', '<link rel="stylesheet" href="/articles/japanese-shell.css">\n</head>');
    html = navigationAssets(html);
    if (before !== html) fs.writeFileSync(absolute, html);
  }
}

function renderSidebar(article, role, related, catalog = []) {
  const [href, label] = nextFor(role, related, article);
  return `<aside class="sidebar-column ja-article-sidebar" aria-label="記事検索・カテゴリー・人気記事・次の行動" data-article-role="${role}" data-article-category="${categoryFor(article, role)}">
${renderSearchWidget()}
${renderBrowseWidget(catalog, article)}
${renderGamesWidget(catalog)}
${renderPopularWidget(article, catalog)}
  <section class="sidebar-widget sidebar-widget--next sidebar-widget--role-${role}"><h2 class="sidebar-widget-title">次にやること</h2><div class="sidebar-widget-body"><a class="sidebar-next-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a></div></section>
${renderAuthorWidget()}
</aside>`;
}

function transformArticle(html, article, catalog) {
  if (!GLOBAL_NAV.test(html)) throw new Error(article.path + ': 記事の共通ナビ・サイドバーが見つかりません');
  const role = classifyArticleRole(article.path, { listed: article.listed !== false });
  if (!role) throw new Error(article.path + ': 記事Roleがありません');
  const related = relatedFor(article, html, catalog);
  const nav = renderNavigation(article.href);
  const sidebar = renderSidebar(article, role, related, catalog);
  let after = normalizeSharedArticleCopy(removeLegacySidebarStylesheet(html.replace(GLOBAL_NAV, nav)));
  const topic = article.browseCategory || categoryFor(article, role);
  const trail = [{ name: '記事トップ', href: '/blog/' },
    { name: topic, href: '/blog/?topic=' + encodeURIComponent(topic) }];
  const label = (article.listTitle || article.title).split('｜').join('：');
  const breadcrumb = `<div class="breadcrumbs-wrapper"><nav aria-label="パンくずリスト">${trail.map(item => `<a href="${item.href}">${escapeHtml(item.name)}</a> <span aria-hidden="true">&gt;</span> `).join('')}<span aria-current="page">${escapeHtml(label)}</span></nav></div>`;
  after = after.replace(/<div class="breadcrumbs-wrapper">[\s\S]*?<\/div>/, breadcrumb);
  after = after.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (whole, start, json, end) => {
    const data = JSON.parse(json);
    const update = node => {
      if (!node || typeof node !== 'object') return;
      if (node['@type'] === 'BreadcrumbList') node.itemListElement = [...trail, { name: label, href: article.href }].map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: 'https://playpoint-sim.com' + item.href }));
      if (Array.isArray(node)) node.forEach(update); else Object.values(node).forEach(update);
    };
    update(data); return start + JSON.stringify(data) + end;
  });
  after = after.replace(/<header\b[^>]*class="[^"]*\bsite-header\b[^"]*"[^>]*>[\s\S]*?<\/header>/, renderHeader());
  if (SIDEBAR.test(after)) after = after.replace(SIDEBAR, sidebar);
  else {
    const end = after.lastIndexOf('</article>');
    if (end < 0) throw new Error(article.path + ': 本文の終端がありません');
    after = after.slice(0, end + 10) + '\n' + sidebar + after.slice(end + 10);
  }
  if (!after.includes('/articles/japanese-shell.css')) after = after.replace('</head>', '<link rel="stylesheet" href="/articles/japanese-shell.css">\n</head>');
  return navigationAssets(after);
}

function syncJapaneseNavigation(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8'));
  const articles = manifest.map(item => ({ ...item, path: item.file.replace(/^\.\.\//, ''), href: '/' + item.file.replace(/^\.\.\//, ''), label: item.title }));
  const catalog = articles.filter(item => item.listed !== false);
  let changed = 0;
  for (const article of catalog) {
    const absolute = path.join(root, article.path);
    const before = fs.readFileSync(absolute, 'utf8');
    const after = transformArticle(before, article, catalog);
    if (before !== after) { fs.writeFileSync(absolute, after); changed++; }
  }
  syncGuideHubs(root, catalog);
  const home = path.join(root, 'index.html');
  const homeBefore = fs.readFileSync(home, 'utf8');
  // 計算機トップは9月22日の独立したヘッダーを維持する。
  const homeAfter = homeBefore
    .replace(/<!-- guide-navigation-assets:start -->[\s\S]*?<!-- guide-navigation-assets:end -->\s*/g, '')
    .replace(/<!-- guide-calculator-header:start -->[\s\S]*?<!-- guide-calculator-header:end -->\s*/g, '');
  if (homeAfter !== homeBefore) fs.writeFileSync(home, homeAfter);
  return { checked: catalog.length, changed };
}
module.exports = { publicThumbnail, isSquareThumbnail, BROWSE_CATEGORIES, NAV, relatedFor, nextFor, renderBrowseWidget, renderSidebar, renderHeader, renderNavigation, syncGuideHubs, transformArticle, syncJapaneseNavigation };
