'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { classifyArticleRole } = require('./article-role-registry.cjs');
const { extractRelatedTargets } = require('./article-role-next-action-audit.cjs');
const { selectRelatedArticles } = require('./intl-related-guides.cjs');

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

function categoryFor(article, role) {
  if (role === 'troubleshooting') return 'troubleshooting';
  if (article.category === 'ランク') return 'levels';
  if (article.category === 'キャンペーン' || role === 'decision_support' || role === 'retention') return 'earn';
  return 'account';
}

function relatedFor(article, html, catalog) {
  // 本文で編集済みの関連記事を正本にし、不足分だけ既存の関連度選択で補う。
  const byPath = new Map(catalog.map(item => [item.path, item]));
  const selected = extractRelatedTargets(article.path, html)
    .filter(target => target !== article.path && byPath.has(target));
  for (const [href] of selectRelatedArticles(catalog, article.path, catalog.length)) {
    const target = href.replace(/^\//, '');
    if (!selected.includes(target)) selected.push(target);
  }
  return selected.slice(0, 3).map(target => byPath.get(target));
}

function nextFor(role, related) {
  if (role === 'calculator_bridge') return ['/', 'あなたの必要額を計算する'];
  if (role === 'retention') return ['/latest/', '次回の特典・確認日を調べる'];
  if (role === 'game_decision') return ['/games/', 'ゲーム別の購入額を試算する'];
  if (role === 'hold' || !related.length) return ['/blog/', '公開中のガイドを探す'];
  return [related[0].href, related[0].label];
}

function renderSidebar(article, role, related) {
  const [href, label] = nextFor(role, related);
  return `<aside class="sidebar-column ja-article-sidebar" aria-label="記事の次の行動と関連ガイド" data-article-role="${role}" data-article-category="${categoryFor(article, role)}">
  <section class="sidebar-widget sidebar-widget--next sidebar-widget--role-${role}">
    <h2 class="sidebar-widget-title">次にやること</h2>
    <div class="sidebar-widget-body"><a class="sidebar-next-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a></div>
  </section>
  <section class="sidebar-widget sidebar-widget--related">
    <h2 class="sidebar-widget-title">あわせて読みたい</h2>
    <div class="sidebar-widget-body"><ul class="sidebar-related-list">${related.map(item => `<li><a class="sidebar-related-link" href="${item.href}">${escapeHtml(item.label)}</a></li>`).join('')}</ul></div>
  </section>
  <section class="sidebar-widget sidebar-widget--author">
    <h2 class="sidebar-widget-title">運営者・情報の確認方針</h2>
    <div class="sidebar-widget-body"><p>かたかたが運営する非公式の計算・情報サイトです。</p><div class="sidebar-author-links"><a href="/author/katakata.html">運営者と検証方針</a><a href="https://katakatalab.com/" target="_blank" rel="noopener noreferrer">KatakataLab</a></div></div>
  </section>
  <section class="sidebar-widget sidebar-widget--browse">
    <h2 class="sidebar-widget-title">記事を探す</h2>
    <div class="sidebar-widget-body"><a class="sidebar-browse-link" href="/blog/">すべてのガイド</a><a class="sidebar-browse-link" href="/latest/">キャンペーン・最新情報</a></div>
  </section>
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
  let after = html.replace(GLOBAL_NAV, nav);
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
module.exports = { NAV, relatedFor, nextFor, transformArticle, syncJapaneseNavigation };