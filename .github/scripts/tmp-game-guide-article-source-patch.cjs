'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function write(file, value) { fs.writeFileSync(path.join(root, file), value, 'utf8'); }
function replaceExact(file, before, after, label) {
  const source = read(file);
  if (!source.includes(before)) throw new Error(`${file}: ${label} source not found`);
  write(file, source.replace(before, after));
}
function replaceRegex(file, pattern, replacement, label) {
  const source = read(file);
  if (!pattern.test(source)) throw new Error(`${file}: ${label} pattern not found`);
  pattern.lastIndex = 0;
  write(file, source.replace(pattern, replacement));
}

function patchArticleSanitizers(file, thumbnailFallback) {
  replaceRegex(file,
    /    function sanitizeArticleFile\(value\) \{[\s\S]*?\n    \}/,
`    function sanitizeArticleFile(value) {
        if (typeof value !== 'string') return '#';
        const standardArticle = /^\\.\\.\\/articles\\/[^/]+\\.html$/.test(value);
        const gameGuideArticle = /^\\.\\.\\/games\\/[a-z0-9-]+\\/[a-z0-9-]+\\/index\\.html$/.test(value);
        if (!standardArticle && !gameGuideArticle) return '#';
        if (/[<>"']/.test(value)) return '#';
        return value;
    }`, 'article file sanitizer');
  replaceRegex(file,
    /    function sanitizeArticleThumbnail\(value\) \{[\s\S]*?\n    \}/,
`    function sanitizeArticleThumbnail(value) {
        if (typeof value !== 'string') return ${thumbnailFallback};
        const standardThumbnail = /^\\.\\.\\/articles\\/ogp\\/[^/]+\\.png$/.test(value);
        const sharedSiteOgp = value === '../ogp.png';
        if (!standardThumbnail && !sharedSiteOgp) return ${thumbnailFallback};
        if (/[<>"']/.test(value)) return ${thumbnailFallback};
        return value;
    }`, 'article thumbnail sanitizer');
}

patchArticleSanitizers('blog/script.js', 'BlogUtils.getPlaceholderImage()');
patchArticleSanitizers('blog/article.js', 'CONFIG.placeholderImage');
replaceExact('blog/article.js', "articlesUrl: '../blog/articles.json'", "articlesUrl: '/blog/articles.json'", 'absolute article manifest URL');
replaceExact('blog/article.js', "stylesheet.href = '../articles/source-notice.css?v=3c2ec22615';", "stylesheet.href = '/articles/source-notice.css?v=3c2ec22615';", 'absolute source-note stylesheet');

replaceRegex('blog/utils.js',
  /const GAME_TITLE_FILTERS = Object\.freeze\(\[[^\]]*\]\);/,
  "const GAME_TITLE_FILTERS = Object.freeze(['FGO', '原神', 'モンスト', 'スタレ', 'ゼンゼロ', 'ウマ娘', 'プロセカ', 'ポケポケ', 'パズドラ', 'アークナイツ', 'ドッカン', 'ヘブバン', '崩壊3rd', 'ファンパレ', 'プロスピA', 'Pokémon GO', 'eFootball']);",
  'game-title filter registry');

// The game guide renderer keeps the canonical /games/... URL, but uses the same
// article visual shell instead of the old game-page shell.
replaceExact('scripts/game-guide-article-hub-sync.cjs',
`function standardizeHead(originalHead, article) {
  let head = synchronizeStructuredData(originalHead, article);
  head = ensureMeta(head, 'article:published_time', article.date || PUBLISHED_AT);
  head = ensureMeta(head, 'article:modified_time', article.modified || article.date || PUBLISHED_AT);
  return head;
}`,
`function standardizeHead(originalHead, article) {
  let head = synchronizeStructuredData(originalHead, article);
  head = head.replace(/\\s*<link\\b[^>]*href=["'][^"']*games\\.css(?:\\?[^"']*)?["'][^>]*>\\s*/i, '\\n');
  if (!/article-modern\\.css/.test(head)) {
    head = head.replace(/(<link\\b[^>]*href=["'][^"']*article-shared\\.css(?:\\?[^"']*)?["'][^>]*>)/i,
      '<link rel="stylesheet" href="/articles/article-modern.css" />\\n  $1');
  }
  if (!/game-guide-article\\.css/.test(head)) {
    head = head.replace(/(<link\\b[^>]*href=["'][^"']*article-shared\\.css(?:\\?[^"']*)?["'][^>]*>)/i,
      '$1\\n  <link rel="stylesheet" href="/articles/game-guide-article.css" />');
  }
  head = ensureMeta(head, 'article:published_time', article.date || PUBLISHED_AT);
  head = ensureMeta(head, 'article:modified_time', article.modified || article.date || PUBLISHED_AT);
  return head;
}`,
  'article visual styles');
replaceExact('scripts/game-guide-article-hub-sync.cjs',
`<script src="/js/analytics-core.js"></script><script src="/blog/article.js"></script><script src="/blog/components.js"></script>`,
`<script src="/js/analytics-core.js"></script>`,
  'game guide runtime scripts');

// Keep game-decision next action inside the current game's calculator rather
// than sending readers back to the generic /games/ portal.
replaceExact('scripts/japanese-navigation-sidebar.cjs',
`function nextFor(role, related) {
  if (role === 'calculator_bridge') return ['/', 'あなたの必要額を計算する'];
  if (role === 'retention') return ['/latest/', '次回の特典・確認日を調べる'];
  if (role === 'game_decision') return ['/games/', 'ゲーム別の購入額を試算する'];
  if (role === 'hold' || !related.length) return ['/blog/', '公開中のガイドを探す'];
  return [related[0].href, related[0].label];
}`,
`function nextFor(role, related, article) {
  if (role === 'calculator_bridge') return ['/', 'あなたの必要額を計算する'];
  if (role === 'retention') return ['/latest/', '次回の特典・確認日を調べる'];
  if (role === 'game_decision') {
    const match = String(article?.path || '').match(/^games\\/([^/]+)\\/[^/]+\\/index\\.html$/);
    if (match) return ['/games/' + match[1] + '/', '同じゲームの課金額を計算する'];
    return ['/games/', 'ゲーム別の購入額を試算する'];
  }
  if (role === 'hold' || !related.length) return ['/blog/', '公開中のガイドを探す'];
  return [related[0].href, related[0].label];
}`,
  'contextual game next action');
replaceExact('scripts/japanese-navigation-sidebar.cjs',
  `const [href, label] = nextFor(role, related);`,
  `const [href, label] = nextFor(role, related, article);`,
  'sidebar nextFor call');

// Article intent/navigation audit: include the 17 explicit /games/... deep guides.
replaceExact('scripts/article-content-navigation-normalize.cjs',
  `const ARTICLE_DIRS = ['articles', 'en/articles', 'ko/articles', 'tw/articles'];`,
  `const ARTICLE_DIRS = ['articles', 'en/articles', 'ko/articles', 'tw/articles'];\nconst { getJapaneseArticleRepoPaths, isGameGuideArticlePath } = require('./game-guide-article-catalog.cjs');`,
  'game-guide catalog import');
replaceRegex('scripts/article-content-navigation-normalize.cjs',
  /function listArticleFiles\(root\) \{[\s\S]*?\n\}/,
`function listArticleFiles(root) {
  const files = [...getJapaneseArticleRepoPaths(root)];
  for (const dir of ARTICLE_DIRS.filter(value => value !== 'articles')) {
    const absoluteDir = path.join(root, dir);
    if (!fs.existsSync(absoluteDir)) continue;
    for (const name of fs.readdirSync(absoluteDir).sort()) {
      if (!name.endsWith('.html') || name === 'index.html') continue;
      files.push(path.posix.join(dir, name));
    }
  }
  return [...new Set(files)].sort();
}`,
  'article navigation file list');
replaceExact('scripts/article-content-navigation-normalize.cjs',
  `.filter(target => /(?:^|\\/)articles\\/[^/]+\\.html$/i.test(target)))];`,
  `.filter(target => /(?:^|\\/)articles\\/[^/]+\\.html$/i.test(target) || isGameGuideArticlePath(target)))];`,
  'related target filter');

// FAQ/schema normalization: scan manifest-backed Japanese articles, including deep game guides.
replaceExact('scripts/article-seo-normalize.cjs',
  `const path = require('node:path');`,
  `const path = require('node:path');\nconst { getJapaneseArticleRepoPaths } = require('./game-guide-article-catalog.cjs');`,
  'article SEO catalog import');
replaceRegex('scripts/article-seo-normalize.cjs',
  /function getArticleFiles\(rootDir\) \{[\s\S]*?\n\}/,
`function getArticleFiles(rootDir) {
  const files = [...getJapaneseArticleRepoPaths(rootDir)];
  for (const directory of ARTICLE_DIRECTORIES.filter(value => value !== 'articles')) {
    const absoluteDirectory = path.join(rootDir, directory);
    if (!fs.existsSync(absoluteDirectory)) continue;
    files.push(...fs.readdirSync(absoluteDirectory, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html')
      .map(entry => path.join(directory, entry.name)));
  }
  return [...new Set(files.map(file => String(file).replaceAll('\\\\', '/')))].sort();
}`,
  'article SEO file list');

// Publication/update/official verification date contract: include game guides.
replaceExact('scripts/article-date-contract.cjs',
  `const path = require('node:path');`,
  `const path = require('node:path');\nconst { getJapaneseArticleRepoPaths } = require('./game-guide-article-catalog.cjs');`,
  'article date catalog import');
replaceRegex('scripts/article-date-contract.cjs',
  /function getArticleFiles\(rootDir\) \{[\s\S]*?\n\}/,
`function getArticleFiles(rootDir) {
  const files = [...getJapaneseArticleRepoPaths(rootDir)];
  for (const directory of ARTICLE_DIRECTORIES.filter(value => value !== 'articles')) {
    const absoluteDirectory = path.join(rootDir, directory);
    if (!fs.existsSync(absoluteDirectory)) continue;
    files.push(...fs.readdirSync(absoluteDirectory, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html')
      .map(entry => normalizeRelativePath(path.join(directory, entry.name))));
  }
  return [...new Set(files.map(normalizeRelativePath))].sort();
}`,
  'article date file list');

// Japanese complete-guide branding should also cover /games/... deep guides.
replaceExact('scripts/japanese-guide-brand.cjs',
  `const path = require('node:path');`,
  `const path = require('node:path');\nconst { getJapaneseArticleRepoPaths } = require('./game-guide-article-catalog.cjs');`,
  'article brand catalog import');
replaceRegex('scripts/japanese-guide-brand.cjs',
  /function japaneseArticleFiles\(rootDir\) \{[\s\S]*?\n\}/,
`function japaneseArticleFiles(rootDir) {
  return getJapaneseArticleRepoPaths(rootDir);
}`,
  'Japanese article file list');

// Noscript/static blog index should use the same supported Japanese article set.
replaceExact('scripts/blog-feeds.cjs',
  `const path = require('path');`,
  `const path = require('path');\nconst { isSupportedJapaneseArticleManifestFile } = require('./game-guide-article-catalog.cjs');`,
  'feed catalog import');
replaceExact('scripts/blog-feeds.cjs',
`function isJapaneseArticleFile(file) {
  return /^\\.\\.\\/articles\\/[^/]+\\.html$/.test(String(file || ''));
}`,
`function isJapaneseArticleFile(file) {
  return isSupportedJapaneseArticleManifestFile(file);
}`,
  'feed/static article file predicate');

// Visual browser smoke: add one deep-game representative and verify its sidebar too.
replaceExact('.github/scripts/article-design-smoke.cjs',
`  { key: 'retention-quests', path: 'articles/2026-07-31-google-play-quests.html', related: true },
  { key: 'international-decision', path: 'en/articles/google-play-points-earn-free.html', related: true }`,
`  { key: 'retention-quests', path: 'articles/2026-07-31-google-play-quests.html', related: true },
  { key: 'game-decision-deep', path: 'games/fgo/pity-cost/index.html', allArticle: true, intro: true, related: true },
  { key: 'international-decision', path: 'en/articles/google-play-points-earn-free.html', related: true }`,
  'game-guide representative browser case');
replaceExact('.github/scripts/article-design-smoke.cjs',
  `if (article.path.startsWith('articles/')) {`,
  `if (article.path.startsWith('articles/') || article.path.startsWith('games/')) {`,
  'Japanese sidebar browser condition');

// Every newly registered game guide has the same official-source verification date.
{
  const file = 'scripts/article-official-verification-dates.json';
  const registry = JSON.parse(read(file));
  const { GAME_GUIDE_ARTICLES } = require(path.join(root, 'scripts/game-guide-article-catalog.cjs'));
  for (const article of GAME_GUIDE_ARTICLES) registry[article.file.replace(/^\\.\\.\\//, '')] = '2026-09-13';
  const sorted = Object.fromEntries(Object.entries(registry).sort(([a], [b]) => a.localeCompare(b)));
  write(file, JSON.stringify(sorted, null, 2) + '\n');
}

// Fix/strengthen the focused test after source contracts exist.
{
  const file = 'tests/game-guide-article-hub.test.cjs';
  let source = read(file);
  source = source.replace(
`  assert.match(script, /\\.\\.\\\\\\/games\\\\\\/[a-z0-9\\-\\]\\+\\/); // strict local game-guide branch is present
  assert.match(script, /index\\\\\\.html/);
  assert.match(script, /value\\.startsWith\\('\\.\\.\\/articles\\/'\\)/);
  assert.doesNotMatch(script, /startsWith\\('\\.\\.\\/games\\/'\\)\\s*return value/);`,
`  assert.match(script, /gameGuideArticle/);
  assert.match(script, /\\^\\\\\\.\\\\\\.\\\\\\/games/);
  assert.match(script, /index\\\\\\.html/);
  assert.doesNotMatch(script, /value\\.startsWith\\('\\.\\.\\/games\\/'\\)/);`);
  write(file, source);
}

console.log('[tmp-game-guide-article-patch] source integration applied');
