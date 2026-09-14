'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, 'utf8');
}

function replaceOnce(relativePath, source, from, to, label) {
  if (!source.includes(from)) {
    throw new Error(`${relativePath}: patch target not found (${label})`);
  }
  return source.replace(from, to);
}

function patchIntlGameGuideGenerator() {
  const file = 'scripts/intl-game-guide-expansion.cjs';
  let source = read(file);

  source = replaceOnce(file, source,
    "    badge: 'Game purchase guide', scope: 'English · United States Google Play reference',",
    "    badge: 'Game purchase guide', scope: 'English · United States Google Play reference',\n    toc: 'Contents', authorAria: 'Article author', authorLabel: 'Article author', commonRule: 'Play Points common rules', earningRuleLink: 'Google Play Points earning rules — United States', levelsRuleLink: 'Google Play Points levels — United States',",
    'EN shared labels');
  source = replaceOnce(file, source,
    "    badge: '게임 결제 가이드', scope: '한국어 · 대한민국 Google Play 기준',",
    "    badge: '게임 결제 가이드', scope: '한국어 · 대한민국 Google Play 기준',\n    toc: '목차', authorAria: '글 작성자', authorLabel: '작성자', commonRule: 'Play Points 공통 규칙', earningRuleLink: 'Google Play Points 적립 규칙 — 대한민국', levelsRuleLink: 'Google Play Points 등급 기준 — 대한민국',",
    'KO shared labels');
  source = replaceOnce(file, source,
    "    badge: '遊戲消費指南', scope: '繁體中文 · 台灣 Google Play 條件',",
    "    badge: '遊戲消費指南', scope: '繁體中文 · 台灣 Google Play 條件',\n    toc: '目錄', authorAria: '文章作者', authorLabel: '文章作者', commonRule: 'Play Points 共通規則', earningRuleLink: 'Google Play Points 積點規則 — 台灣', levelsRuleLink: 'Google Play Points 等級規則 — 台灣',",
    'TW shared labels');

  source = replaceOnce(file, source,
    "  const decisions = content.decisions.map(item => `<li>${escapeHtml(item)}</li>`).join('');",
    "  const decisions = content.decisions.slice(1).map(item => `<li>${escapeHtml(item)}</li>`).join('');",
    'avoid repeated primary decision');

  source = replaceOnce(file, source,
    '<nav class="intl-article-toc" aria-label="Table of contents"><h2>Contents</h2><ol>',
    '<nav class="intl-article-toc" aria-label="${escapeHtml(locale.toc)}"><h2>${escapeHtml(locale.toc)}</h2><ol>',
    'localized TOC');
  source = replaceOnce(file, source,
    '<li><a href="#google-play-rule">${escapeHtml(locale.points)}</a></li>',
    '',
    'remove common rule from TOC');
  source = replaceOnce(file, source,
    '<section class="section" id="google-play-rule"><h2>${escapeHtml(locale.points)}</h2><p>${escapeHtml(locale.googleRule)}</p><p>${escapeHtml(locale.routeRule)}</p></section>',
    '<aside class="decision-box article-common-rule" aria-label="${escapeHtml(locale.commonRule)}"><strong>${escapeHtml(locale.commonRule)}</strong><ul><li>${escapeHtml(locale.googleRule)}</li><li>${escapeHtml(locale.routeRule)}</li></ul></aside>',
    'compact common rule UI');
  source = replaceOnce(file, source,
    'Google Play Points earning rules — ${escapeHtml(locale.region)}',
    '${escapeHtml(locale.earningRuleLink)}',
    'localized earning rule link');
  source = replaceOnce(file, source,
    'Google Play Points levels — ${escapeHtml(locale.region)}',
    '${escapeHtml(locale.levelsRuleLink)}',
    'localized levels rule link');
  source = replaceOnce(file, source,
    '<aside class="author-box" aria-label="Article author"><p class="author-box-label">${escapeHtml(locale.author)}</p>',
    '<aside class="author-box" aria-label="${escapeHtml(locale.authorAria)}"><p class="author-box-label">${escapeHtml(locale.authorLabel)}</p>',
    'localized author UI');

  write(file, source);
}

function patchArticleDateContract() {
  const file = 'scripts/article-date-contract.cjs';
  let source = read(file);
  source = replaceOnce(file, source,
    "    en: /^(?:Published|Updated|Official info checked)\\b/i,",
    "    en: /^(?:Published|Updated|Official (?:info|sources?) checked)\\b/i,",
    'EN generated date aliases');
  source = replaceOnce(file, source,
    "    ko: /^(?:공개|업데이트|공식 정보 확인)(?:\\s|[:：])/,",
    "    ko: /^(?:공개|게시|업데이트|공식 정보 (?:확인|최종 확인))(?:\\s|[:：])/,",
    'KO generated date aliases');
  source = replaceOnce(file, source,
    "    tw: /^(?:發布|更新|官方資訊確認)(?:\\s|[:：])/",
    "    tw: /^(?:發布|更新|官方(?:資訊|資料)確認)(?:\\s|[:：])/",
    'TW generated date aliases');
  source = replaceOnce(file, source,
    "    if (generatedPrefixes[localeKey].test(segment)) return false;\n    if (extractReadTime(segment, localeKey)) return false;",
    "    if (generatedPrefixes[localeKey].test(segment)) return false;\n    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(segment)) return false;\n    if (extractReadTime(segment, localeKey)) return false;",
    'drop legacy bare ISO date');
  write(file, source);
}

function patchJapaneseGameGuideAuthor() {
  const file = 'scripts/game-guide-article-hub-sync.cjs';
  let source = read(file);
  source = replaceOnce(file, source,
    '<h4>この記事の著者：<a href="/author/katakata.html" rel="author">かたかた</a></h4>',
    '<p class="author-profile-title">この記事の著者：<a href="/author/katakata.html" rel="author">かたかた</a></p>',
    'semantic author label');
  write(file, source);
}

function writeAuthorSemanticsModule() {
  const file = 'scripts/article-author-semantics.cjs';
  const content = `'use strict';\n\nconst fs = require('node:fs');\nconst path = require('node:path');\nconst { getJapaneseArticleRepoPaths } = require('./game-guide-article-catalog.cjs');\n\nconst AUTHOR_HEADING_PATTERN = /<h4(?:\\s[^>]*)?>\\s*(この記事の著者：[\\s\\S]*?)<\\/h4>/gi;\n\nfunction normalizeAuthorSemantics(html) {\n  return String(html).replace(AUTHOR_HEADING_PATTERN, '<p class="author-profile-title">$1</p>');\n}\n\nfunction syncArticleAuthorSemantics(rootDir, { checkOnly = false } = {}) {\n  const files = getJapaneseArticleRepoPaths(rootDir);\n  const summary = { checked: files.length, changed: 0, changedFiles: [] };\n  for (const relativePath of files) {\n    const absolutePath = path.join(rootDir, relativePath);\n    if (!fs.existsSync(absolutePath)) continue;\n    const current = fs.readFileSync(absolutePath, 'utf8');\n    const next = normalizeAuthorSemantics(current);\n    if (next === current) continue;\n    summary.changed += 1;\n    summary.changedFiles.push(relativePath);\n    if (!checkOnly) fs.writeFileSync(absolutePath, next, 'utf8');\n  }\n  return summary;\n}\n\nmodule.exports = { AUTHOR_HEADING_PATTERN, normalizeAuthorSemantics, syncArticleAuthorSemantics };\n`;
  write(file, content);
}

function writeTableOverflowModule() {
  const file = 'scripts/article-table-overflow-sync.cjs';
  const content = `'use strict';\n\nconst fs = require('node:fs');\nconst path = require('node:path');\n\nconst ARTICLE_TABLE_OVERFLOW_PATHS = Object.freeze([\n  'articles/2026-06-20-discount-gift-cards.html',\n  'en/articles/google-play-points-join-eligibility.html',\n  'ko/articles/google-play-points-join-eligibility.html',\n  'tw/articles/google-play-points-join-eligibility.html'\n]);\nconst WRAPPED_TABLE_PREFIX = /<(?:div|figure)\\b[^>]*class=["'][^"']*(?:table-wrap|table-card|pack-table-wrap|lp-table-wrap|comparison-reference-table-wrap)[^"']*["'][^>]*>\\s*$/i;\n\nfunction wrapUnwrappedTables(html) {\n  return String(html).replace(/<table\\b[\\s\\S]*?<\\/table>/gi, (table, offset, source) => {\n    const prefix = source.slice(Math.max(0, offset - 320), offset);\n    if (WRAPPED_TABLE_PREFIX.test(prefix)) return table;\n    return '<div class="table-wrap">' + table + '</div>';\n  });\n}\n\nfunction syncArticleTableOverflow(rootDir, { checkOnly = false } = {}) {\n  const summary = { checked: 0, changed: 0, changedFiles: [] };\n  for (const relativePath of ARTICLE_TABLE_OVERFLOW_PATHS) {\n    const absolutePath = path.join(rootDir, relativePath);\n    if (!fs.existsSync(absolutePath)) throw new Error('Table overflow target missing: ' + relativePath);\n    summary.checked += 1;\n    const current = fs.readFileSync(absolutePath, 'utf8');\n    const next = wrapUnwrappedTables(current);\n    if (next === current) continue;\n    summary.changed += 1;\n    summary.changedFiles.push(relativePath);\n    if (!checkOnly) fs.writeFileSync(absolutePath, next, 'utf8');\n  }\n  return summary;\n}\n\nmodule.exports = { ARTICLE_TABLE_OVERFLOW_PATHS, WRAPPED_TABLE_PREFIX, wrapUnwrappedTables, syncArticleTableOverflow };\n`;
  write(file, content);
}

function patchBuildPipeline() {
  const file = 'scripts/build-html.js';
  let source = read(file);
  source = replaceOnce(file, source,
    "const { syncGameGuideArticleHub } = require('./game-guide-article-hub-sync.cjs');",
    "const { syncGameGuideArticleHub } = require('./game-guide-article-hub-sync.cjs');\nconst { syncArticleAuthorSemantics } = require('./article-author-semantics.cjs');\nconst { syncArticleTableOverflow } = require('./article-table-overflow-sync.cjs');",
    'quality normalizer imports');
  source = replaceOnce(file, source,
    "const gameArticleHubSummary = syncGameGuideArticleHub(rootDir);\nconsole.log('[build-html] synchronized Japanese game article hub:', gameArticleHubSummary);",
    "const gameArticleHubSummary = syncGameGuideArticleHub(rootDir);\nconsole.log('[build-html] synchronized Japanese game article hub:', gameArticleHubSummary);\nconst authorSemanticsSummary = syncArticleAuthorSemantics(rootDir);\nconsole.log(`[build-html] normalized Japanese author semantics: ${authorSemanticsSummary.changed}/${authorSemanticsSummary.checked} updated`);\nconst articleTableOverflowSummary = syncArticleTableOverflow(rootDir);\nconsole.log(`[build-html] normalized article table overflow: ${articleTableOverflowSummary.changed}/${articleTableOverflowSummary.checked} updated`);",
    'quality normalizer execution');
  write(file, source);
}

function patchSharedCss() {
  const file = 'articles/article-shared.css';
  let source = read(file);
  source = replaceOnce(file, source,
    '.author-info h4, .author-box-name {\nfont-size: 16px;',
    '.author-info h4, .author-info .author-profile-title, .author-box-name {\nfont-size: 16px;\nfont-weight: 700;',
    'author profile title style');
  write(file, source);
}

function writeRegressionTest() {
  const file = 'tests/article-quality-polish.test.cjs';
  const content = `'use strict';\n\nconst assert = require('node:assert/strict');\nconst fs = require('node:fs');\nconst path = require('node:path');\nconst test = require('node:test');\n\nconst root = path.join(__dirname, '..');\nconst { ALL_GUIDES, LOCALES, renderGuide } = require('../scripts/intl-game-guide-expansion.cjs');\nconst { extractSupplementalMetaItems, getArticleFiles } = require('../scripts/article-date-contract.cjs');\nconst { getJapaneseArticleRepoPaths } = require('../scripts/game-guide-article-catalog.cjs');\nconst { ARTICLE_TABLE_OVERFLOW_PATHS, wrapUnwrappedTables } = require('../scripts/article-table-overflow-sync.cjs');\n\nfunction stripTags(value) {\n  return String(value).replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim();\n}\n\nfunction heroMetaText(html) {\n  const match = String(html).match(/<p\\b(?=[^>]*class=["'][^"']*\\bhero-meta\\b[^"']*["'])[^>]*>[\\s\\S]*?<\\/p>/i);\n  return match ? stripTags(match[0]) : '';\n}\n\ntest('韓国語・繁体字ゲーム記事の共通UIを各言語で表示する', () => {\n  for (const localeKey of ['ko', 'tw']) {\n    const locale = LOCALES[localeKey];\n    for (const guide of ALL_GUIDES) {\n      const html = renderGuide(localeKey, guide);\n      assert.match(html, new RegExp('aria-label="' + locale.toc + '"'));\n      assert.match(html, new RegExp('>' + locale.toc + '<'));\n      assert.match(html, new RegExp('aria-label="' + locale.authorAria + '"'));\n      assert.match(html, new RegExp('>' + locale.authorLabel + '<'));\n      assert.ok(html.includes(locale.earningRuleLink));\n      assert.ok(html.includes(locale.levelsRuleLink));\n      assert.doesNotMatch(html, /aria-label="Table of contents"|>Contents<|aria-label="Article author"|>Article author</);\n      assert.doesNotMatch(html, />Google Play Points earning rules —|>Google Play Points levels —/);\n    }\n  }\n});\n\ntest('ゲーム記事は共通Play Points説明を補助UIへ寄せ、本文の判断軸を重複させない', () => {\n  for (const localeKey of Object.keys(LOCALES)) {\n    for (const guide of ALL_GUIDES) {\n      const html = renderGuide(localeKey, guide);\n      assert.match(html, /class="decision-box article-common-rule"/);\n      const toc = html.match(/<nav class="intl-article-toc"[\\s\\S]*?<\\/nav>/)?.[0] || '';\n      assert.doesNotMatch(toc, /#google-play-rule/);\n      const firstDecision = guide.content[localeKey].decisions[0];\n      assert.equal(stripTags(html).split(firstDecision).length - 1, 1, `${localeKey}/${guide.slug}: primary decision duplicated`);\n    }\n  }\n});\n\ntest('日付同期は旧ラベルと裸のISO日付を補足情報として残さない', () => {\n  assert.deepEqual(extractSupplementalMetaItems('<p class="hero-meta">Published 2026-09-13 · Updated 2026-09-13 · Official sources checked 2026-09-13 · United States guide · 2026-09-13</p>', 'en'), ['United States guide']);\n  assert.deepEqual(extractSupplementalMetaItems('<p class="hero-meta">게시 2026-09-13 · 업데이트 2026-09-13 · 공식 정보 확인 2026-09-13</p>', 'ko'), []);\n  assert.deepEqual(extractSupplementalMetaItems('<p class="hero-meta">發布 2026-09-13 · 更新 2026-09-13 · 官方資料確認 2026-09-13</p>', 'tw'), []);\n});\n\ntest('公開中の海外記事hero-metaに旧日付ラベルや裸ISO日付を残さない', () => {\n  for (const relativePath of getArticleFiles(root).filter(file => /^(?:en|ko|tw)\\//.test(file))) {\n    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');\n    const meta = heroMetaText(html);\n    if (!meta) continue;\n    assert.doesNotMatch(meta, /(?:^|[·・]\\s*)\\d{4}-\\d{2}-\\d{2}(?:\\s*[·・]|$)/, relativePath);\n    if (relativePath.startsWith('en/')) assert.doesNotMatch(meta, /Official sources checked/i, relativePath);\n    if (relativePath.startsWith('ko/')) assert.doesNotMatch(meta, /(?:^|·\\s*)게시\\s+\\d{4}-\\d{2}-\\d{2}/, relativePath);\n    if (relativePath.startsWith('tw/')) assert.doesNotMatch(meta, /官方資料確認/, relativePath);\n  }\n});\n\ntest('日本語記事の著者プロフィールを見出し階層から外す', () => {\n  let profiles = 0;\n  for (const relativePath of getJapaneseArticleRepoPaths(root)) {\n    const absolute = path.join(root, relativePath);\n    if (!fs.existsSync(absolute)) continue;\n    const html = fs.readFileSync(absolute, 'utf8');\n    if (!html.includes('author-profile-box')) continue;\n    profiles += 1;\n    assert.doesNotMatch(html, /<h4(?:\\s[^>]*)?>\\s*この記事の著者：/i, relativePath);\n    assert.match(html, /class="author-profile-title"[^>]*>この記事の著者：/i, relativePath);\n  }\n  assert.ok(profiles >= 60, `expected broad author coverage, got ${profiles}`);\n});\n\ntest('監査で見つかった4記事の表は横スクロール境界を持つ', () => {\n  for (const relativePath of ARTICLE_TABLE_OVERFLOW_PATHS) {\n    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');\n    assert.equal(wrapUnwrappedTables(html), html, relativePath);\n    assert.match(html, /class="table-wrap"/, relativePath);\n  }\n});\n`;
  write(file, content);
}

patchIntlGameGuideGenerator();
patchArticleDateContract();
patchJapaneseGameGuideAuthor();
writeAuthorSemanticsModule();
writeTableOverflowModule();
patchBuildPipeline();
patchSharedCss();
writeRegressionTest();

console.log('article quality repair patches applied');
