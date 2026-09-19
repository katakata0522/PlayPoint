'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { classifyArticleRole } = require('./article-role-registry.cjs');
const { extractRelatedTargets } = require('./article-role-next-action-audit.cjs');
const { selectRelatedArticles } = require('./intl-related-guides.cjs');
const { getJapanesePopularGuides, POPULAR_GUIDES_SNAPSHOT, POPULAR_GUIDES_WINDOW } = require('./japanese-popular-guides.cjs');

const NAV = Object.freeze([
  ['/', '計算する'],
  ['/blog/', 'ガイドを探す'],
  ['/blog/?category=トラブル', 'トラブルを解決'],
  ['/articles/2025-12-25-best-use.html', '貯める・使う'],
  ['/articles/2026-08-05-play-points-levels-guide.html', 'ランク・特典'],
  ['/articles/2025-12-25-getting-started.html', 'アカウント・基本']
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
  for (const [href] of selectRelatedArticles(catalog, article.path, catalog.length)) {
    const target = href.replace(/^\//, '');
    if (!selected.includes(target)) selected.push(target);
  }
  return selected.slice(0, 3).map(target => byPath.get(target));
}

function nextFor(role, related, article) {
  if (role === 'calculator_bridge') return ['/', 'あなたの必要額を計算する'];
  if (role === 'retention') return ['/latest/', '次回の特典・確認日を調べる'];
  if (role === 'game_decision') {
    const match = String(article?.path || '').match(/^games\/([^/]+)\/[^/]+\/index\.html$/);
    if (match) return ['/games/' + match[1] + '/', '同じゲームの課金額を計算する'];
    return ['/games/', 'ゲーム別の購入額を試算する'];
  }
  if (role === 'hold' || !related.length) return ['/blog/', '公開中のガイドを探す'];
  return [related[0].href, related[0].label];
}

function renderSearchWidget() {
  return `  <section class="sidebar-widget sidebar-widget--search"><h2 class="sidebar-widget-title">記事を探す</h2><div class="sidebar-widget-body"><form class="sidebar-search-form" action="/blog/" method="get" role="search"><input class="sidebar-search-input" type="search" name="q" aria-label="記事を検索"><button class="sidebar-search-button" type="submit">検索</button></form><div class="sidebar-search-footer"><a class="sidebar-browse-link" href="/blog/">すべての記事を見る</a></div></div></section>`;
}

function renderPopularWidget(article) {
  const popular = getJapanesePopularGuides(article.href, 5);
  return `  <section class="sidebar-widget sidebar-widget--popular" data-popular-snapshot="${escapeHtml(POPULAR_GUIDES_SNAPSHOT)}"><h2 class="sidebar-widget-title">今月よく読まれている記事</h2><div class="sidebar-widget-body"><p class="sidebar-widget-note">${escapeHtml(POPULAR_GUIDES_WINDOW)}の閲覧傾向・週1回更新</p><ol class="sidebar-popular-list">${popular.map(item => {
    const rank = String(item.rank).padStart(2, '0');
    if (item.isCurrent) return `<li class="sidebar-popular-item is-current"><span class="sidebar-popular-rank">${rank}</span><div><span class="sidebar-popular-current-title">${escapeHtml(item.label)}</span><span class="sidebar-popular-reading">閲覧中</span></div></li>`;
    return `<li class="sidebar-popular-item"><span class="sidebar-popular-rank">${rank}</span><a class="sidebar-popular-link" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`;
  }).join('')}</ol></div></section>`;
}

function renderAuthorWidget() {
  return `  <section class="sidebar-widget sidebar-widget--author"><h2 class="sidebar-widget-title">運営者情報</h2><div class="sidebar-widget-body"><div class="sidebar-author-avatar" aria-hidden="true">か</div><p class="sidebar-author-name">かたかた</p><p class="sidebar-author-copy">2026年9月、ついにGoogle Play Pointsのダイヤモンドに到達。本人がいちばんびっくりしつつ、お得なゲーム課金やGoogle Playまわりの情報を、実際に使いながら調べて発信しています。</p><p class="sidebar-author-aside">好きな食べ物は湯葉と納豆。ここはGoogle Playとは特に関係ありません。</p><div class="sidebar-author-links"><a href="/author/katakata.html">運営者について</a><a href="https://katakatalab.com/" target="_blank" rel="noopener noreferrer">KatakataLab</a></div></div></section>`;
}

function renderSidebar(article, role, related) {
  const [href, label] = nextFor(role, related, article);
  return `<aside class="sidebar-column ja-article-sidebar" aria-label="記事検索・人気記事・次の行動と関連記事" data-article-role="${role}" data-article-category="${categoryFor(article, role)}">
${renderSearchWidget()}
${renderPopularWidget(article)}
  <section class="sidebar-widget sidebar-widget--next sidebar-widget--role-${role}"><h2 class="sidebar-widget-title">次にやること</h2><div class="sidebar-widget-body"><a class="sidebar-next-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a></div></section>
  <section class="sidebar-widget sidebar-widget--related"><h2 class="sidebar-widget-title">あわせて読みたい</h2><div class="sidebar-widget-body"><ul class="sidebar-related-list">${related.map(item => `<li><a class="sidebar-related-link" href="${item.href}">${escapeHtml(item.label)}</a></li>`).join('')}</ul></div></section>
${renderAuthorWidget()}
</aside>`;
}

function transformArticle(html, article, catalog) {
  if (!GLOBAL_NAV.test(html)) throw new Error(article.path + ': 記事の共通ナビ・サイドバーが見つかりません');
  const role = classifyArticleRole(article.path, { listed: article.listed !== false });
  if (!role) throw new Error(article.path + ': 記事Roleがありません');
  const related = relatedFor(article, html, catalog);
  const nav = '<nav class="global-nav ja-global-nav" aria-label="目的から探す"><div class="global-nav-inner">'
    + NAV.map(([href, label]) => `<a class="nav-item" href="${escapeHtml(href)}"${href === article.href ? ' aria-current="page"' : ''}><span>${label}</span></a>`).join('') + '</div></nav>';
  const sidebar = renderSidebar(article, role, related);
  let after = removeLegacySidebarStylesheet(html.replace(GLOBAL_NAV, nav));
  if (SIDEBAR.test(after)) after = after.replace(SIDEBAR, sidebar);
  else {
    const end = after.lastIndexOf('</article>');
    if (end < 0) throw new Error(article.path + ': 本文の終端がありません');
    after = after.slice(0, end + 10) + '\n' + sidebar + after.slice(end + 10);
  }
  if (!after.includes('/articles/japanese-shell.css')) after = after.replace('</head>', '<link rel="stylesheet" href="/articles/japanese-shell.css">\n</head>');
  return after;
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
  return { checked: catalog.length, changed };
}
module.exports = { NAV, relatedFor, nextFor, renderSidebar, transformArticle, syncJapaneseNavigation };
