'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getJapaneseArticleRepoPaths } = require('./game-guide-article-catalog.cjs');

const PRIMARY_NAV = Object.freeze([
  Object.freeze({ href: '/games/', label: '🎮 ゲーム別計算' }),
  Object.freeze({ href: '/blog/', label: '📝 記事一覧' }),
  Object.freeze({ href: '/latest/', label: '🆕 最新情報' }),
  Object.freeze({ href: '/author/katakata.html', label: '運営者・検証方針' })
]);

const GLOBAL_NAV = /<nav\b[^>]*class=["'][^"']*\bglobal-nav\b[^"']*["'][^>]*>[\s\S]*?<\/nav>/i;
const SITE_HEADER_LINKS = /<(div|nav)\b[^>]*class=["'][^"']*\bsite-header-links\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/i;
const LATEST_NAV_LINKS = /<(div|nav)\b[^>]*class=["'][^"']*\beng-nav-links\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/i;
const TOP_HEADER_LINKS = /<div\b[^>]*class=["'][^"']*\bheader-links\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPlainLinks(activeHref = '') {
  return PRIMARY_NAV.map(({ href, label }) => {
    const current = href === activeHref ? ' aria-current="page"' : '';
    return `<a href="${escapeHtml(href)}"${current}>${escapeHtml(label)}</a>`;
  }).join('');
}

function renderHeaderLinks(activeHref = '') {
  return `<nav class="site-header-links site-primary-nav" aria-label="メインナビゲーション" data-site-primary-nav="true">${renderPlainLinks(activeHref)}</nav>`;
}

function renderGlobalNav(activeHref = '') {
  const links = PRIMARY_NAV.map(({ href, label }) => {
    const current = href === activeHref;
    return `<a class="nav-item${current ? ' active' : ''}" href="${escapeHtml(href)}"${current ? ' aria-current="page"' : ''}><span>${escapeHtml(label)}</span></a>`;
  }).join('');
  return `<nav class="global-nav site-primary-nav" aria-label="メインナビゲーション" data-site-primary-nav="true"><div class="global-nav-inner">${links}</div></nav>`;
}

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`${label}が見つかりません`);
  return html.replace(pattern, replacement);
}

function syncArticlePrimaryNav(html, relativePath) {
  return replaceRequired(
    html,
    SITE_HEADER_LINKS,
    renderHeaderLinks('/blog/'),
    `${relativePath}: 記事Primary Nav`
  );
}

function syncGamePrimaryNav(html, relativePath) {
  return replaceRequired(
    html,
    GLOBAL_NAV,
    renderGlobalNav('/games/'),
    `${relativePath}: ゲームPrimary Nav`
  );
}

function syncLatestPrimaryNav(html) {
  const replacement = `<nav class="eng-nav-links site-primary-nav" aria-label="メインナビゲーション" data-site-primary-nav="true">${renderPlainLinks('/latest/')}</nav>`;
  return replaceRequired(html, LATEST_NAV_LINKS, replacement, 'latest/index.html: Primary Nav');
}

function syncTopPrimaryNav(html) {
  const match = html.match(TOP_HEADER_LINKS);
  if (!match) throw new Error('index.html: ヘッダーリンクが見つかりません');
  const block = match[0];
  const attention = block.match(/<a\b[^>]*\bdata-country-notes-link\b[^>]*>[\s\S]*?<\/a>/i)?.[0];
  const katakata = block.match(/<a\b[^>]*\bdata-lang-key=["']linkKatakata["'][^>]*>[\s\S]*?<\/a>/i)?.[0];
  if (!attention || !katakata) throw new Error('index.html: 地域注意またはKatakataLab導線を保持できません');

  const links = [
    '<a href="games/" data-lang-key="linkGames">🎮 ゲーム別計算</a>',
    '<a href="blog/" data-lang-key="linkArticles">📝 記事一覧</a>',
    '<a href="latest/" data-lang-key="linkLatest">🆕 最新情報</a>',
    '<a href="author/katakata.html" rel="author" data-lang-key="linkAuthor">運営者・検証方針</a>'
  ].join('\n            ');

  return html.replace(TOP_HEADER_LINKS,
    `<div class="header-links" data-site-primary-nav="true">\n            ${attention}\n            ${links}\n            ${katakata}\n        </div>`);
}

function directJapaneseGamePages(rootDir, articlePaths) {
  const gamesRoot = path.join(rootDir, 'games');
  const articleSet = new Set(articlePaths);
  const targets = ['games/index.html'];
  for (const entry of fs.readdirSync(gamesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const relativePath = `games/${entry.name}/index.html`;
    if (articleSet.has(relativePath)) continue;
    if (fs.existsSync(path.join(rootDir, relativePath))) targets.push(relativePath);
  }
  return targets.sort();
}

function writeIfChanged(rootDir, relativePath, transform) {
  const absolute = path.join(rootDir, relativePath);
  const before = fs.readFileSync(absolute, 'utf8');
  const after = transform(before, relativePath);
  if (before === after) return false;
  fs.writeFileSync(absolute, after, 'utf8');
  return true;
}

function syncJapanesePrimaryNavigation(rootDir) {
  const articlePaths = getJapaneseArticleRepoPaths(rootDir);
  const gamePaths = directJapaneseGamePages(rootDir, articlePaths);
  const changedFiles = [];

  if (writeIfChanged(rootDir, 'index.html', syncTopPrimaryNav)) changedFiles.push('index.html');
  if (writeIfChanged(rootDir, 'latest/index.html', syncLatestPrimaryNav)) changedFiles.push('latest/index.html');

  for (const relativePath of articlePaths) {
    if (writeIfChanged(rootDir, relativePath, syncArticlePrimaryNav)) changedFiles.push(relativePath);
  }
  for (const relativePath of gamePaths) {
    if (writeIfChanged(rootDir, relativePath, syncGamePrimaryNav)) changedFiles.push(relativePath);
  }

  return {
    articleCount: articlePaths.length,
    gameCount: gamePaths.length,
    changedFiles
  };
}

if (require.main === module) {
  const result = syncJapanesePrimaryNavigation(path.join(__dirname, '..'));
  console.log(`[japanese-primary-navigation] articles=${result.articleCount} games=${result.gameCount} changed=${result.changedFiles.length}`);
}

module.exports = {
  PRIMARY_NAV,
  directJapaneseGamePages,
  renderGlobalNav,
  renderHeaderLinks,
  renderPlainLinks,
  syncArticlePrimaryNav,
  syncGamePrimaryNav,
  syncJapanesePrimaryNavigation,
  syncLatestPrimaryNav,
  syncTopPrimaryNav
};
