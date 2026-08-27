'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const abs = rel => path.join(root, rel);
const read = rel => fs.readFileSync(abs(rel), 'utf8');
function write(rel, content) {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), content.replace(/\r\n/g, '\n'), 'utf8');
}
function replaceRequired(rel, from, to) {
  const current = read(rel);
  if (!current.includes(from)) throw new Error(rel + ': required text not found: ' + from);
  write(rel, current.replace(from, to));
}
function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, visit);
    else visit(file);
  }
}

replaceRequired(
  'scripts/intl-manual-content-sync.cjs',
  'Google Play 퀘스트가 표시되거나 완료되지 않을 때',
  'Google Play 퀘스트가 표시되지 않거나 완료되지 않을 때'
);

const excluded = new Set([
  'scripts/region-page-sync.cjs',
  'js/region-expansion-config.js',
  'scripts/inspect-intl-fix-targets-temp.cjs',
  'scripts/apply-intl-quality-fixes-temp.cjs',
  'scripts/apply-intl-quality-fixes-v2-temp.cjs'
]);
for (const sourceRoot of ['scripts', 'js', 'games']) {
  const dir = abs(sourceRoot);
  if (!fs.existsSync(dir)) continue;
  walk(dir, file => {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    if (excluded.has(rel) || !/\.(?:js|cjs)$/.test(rel)) return;
    const current = fs.readFileSync(file, 'utf8');
    const next = current
      .replace(/(?<![白黃])金級/g, '黃金級')
      .replace(/累積率/g, '積點率')
      .replace(/累積條件/g, '積點條件');
    if (next !== current) fs.writeFileSync(file, next, 'utf8');
  });
}

replaceRequired(
  'scripts/region-page-sync.cjs',
  "  html = html.replace(/白金級/g, '鉑金級');",
  "  html = html.replace(/黃金級/g, '金級');\n  html = html.replace(/白金級/g, '鉑金級');"
);

write('scripts/tw-terminology-sync.cjs', String.raw`'use strict';

const fs = require('node:fs');
const path = require('node:path');

function normalizeTaiwanText(text) {
  return text
    .replace(/(?<![白黃])金級/g, '黃金級')
    .replace(/累積率/g, '積點率')
    .replace(/累積條件/g, '積點條件');
}

function syncTaiwanTerminology(rootDir) {
  const twRoot = path.join(rootDir, 'tw');
  let checked = 0;
  let changed = 0;
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith('.html')) {
        checked += 1;
        const current = fs.readFileSync(file, 'utf8');
        const next = normalizeTaiwanText(current);
        if (next !== current) {
          fs.writeFileSync(file, next, 'utf8');
          changed += 1;
        }
      }
    }
  }
  if (fs.existsSync(twRoot)) visit(twRoot);
  return { checked, changed };
}

module.exports = { normalizeTaiwanText, syncTaiwanTerminology };
`);

write('scripts/intl-article-hreflang-sync.cjs', String.raw`'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const INTL_LOCALES = Object.freeze([
  ['en', 'en'],
  ['ko', 'ko'],
  ['tw', 'zh-TW']
]);
const ARTICLE_JA_ALTERNATES = Object.freeze({
  'index.html': '/blog/',
  'google-play-games-vs-play-points.html': '/articles/2025-12-25-play-games.html',
  'google-play-points-apps-books-purchases.html': '/articles/2025-12-25-movies-books.html',
  'google-play-points-balance-history-progress.html': '/articles/2025-12-25-check-balance.html',
  'google-play-points-device-change.html': '/articles/2026-08-03-play-points-device-change.html',
  'google-play-points-earn-free.html': '/articles/2026-07-24-earn-play-points-free.html'
});

function getJapaneseAlternateForSlug(slug) {
  return ARTICLE_JA_ALTERNATES[slug] || null;
}
function sitePathToFile(rootDir, sitePath) {
  const relative = sitePath.replace(/^\//, '');
  return path.join(rootDir, relative.endsWith('/') ? relative + 'index.html' : relative);
}
function intlUrl(locale, slug) {
  return slug === 'index.html'
    ? SITE_ORIGIN + '/' + locale + '/articles/'
    : SITE_ORIGIN + '/' + locale + '/articles/' + slug;
}
function upsertIntlJa(html, jaPath) {
  const tag = '    <link rel="alternate" hreflang="ja" href="' + SITE_ORIGIN + jaPath + '">';
  let next = html.replace(/\s*<link rel="alternate" hreflang="ja"[^>]*>\s*/g, '\n');
  const anchor = /\s*(<link rel="alternate" hreflang="en"[^>]*>)/;
  if (!anchor.test(next)) throw new Error('International article is missing en hreflang anchor.');
  return next.replace(anchor, '\n' + tag + '\n    $1');
}
function upsertJapaneseIntlSet(html, slug) {
  let next = html.replace(/\s*<link rel="alternate" hreflang="(?:en|ko|zh-TW|x-default)"[^>]*>\s*/g, '\n');
  const tags = [
    '    <link rel="alternate" hreflang="en" href="' + intlUrl('en', slug) + '">',
    '    <link rel="alternate" hreflang="ko" href="' + intlUrl('ko', slug) + '">',
    '    <link rel="alternate" hreflang="zh-TW" href="' + intlUrl('tw', slug) + '">',
    '    <link rel="alternate" hreflang="x-default" href="' + intlUrl('en', slug) + '">'
  ].join('\n');
  const canonical = /(<link rel="canonical"[^>]*>)/;
  if (!canonical.test(next)) throw new Error('Japanese counterpart is missing canonical link.');
  return next.replace(canonical, '$1\n' + tags);
}
function writeIfChanged(file, content) {
  const current = fs.readFileSync(file, 'utf8');
  if (current === content) return false;
  fs.writeFileSync(file, content, 'utf8');
  return true;
}
function syncIntlArticleJapaneseHreflang(rootDir) {
  let checked = 0;
  let changed = 0;
  for (const [slug, jaPath] of Object.entries(ARTICLE_JA_ALTERNATES)) {
    const jaFile = sitePathToFile(rootDir, jaPath);
    if (!fs.existsSync(jaFile)) throw new Error('Japanese hreflang target is missing: ' + jaPath);
    for (const [locale] of INTL_LOCALES) {
      const intlFile = path.join(rootDir, locale, 'articles', slug);
      if (!fs.existsSync(intlFile)) throw new Error('International hreflang source is missing: ' + path.relative(rootDir, intlFile));
      checked += 1;
      const current = fs.readFileSync(intlFile, 'utf8');
      if (writeIfChanged(intlFile, upsertIntlJa(current, jaPath))) changed += 1;
    }
    checked += 1;
    const jaCurrent = fs.readFileSync(jaFile, 'utf8');
    if (writeIfChanged(jaFile, upsertJapaneseIntlSet(jaCurrent, slug))) changed += 1;
  }
  return { checked, changed };
}

module.exports = {
  ARTICLE_JA_ALTERNATES,
  INTL_LOCALES,
  SITE_ORIGIN,
  getJapaneseAlternateForSlug,
  intlUrl,
  syncIntlArticleJapaneseHreflang
};
`);

let build = read('scripts/build-html.js');
if (!build.includes("require('./intl-article-hreflang-sync.cjs')")) {
  build = build.replace(
    "const { syncIntlManualContent } = require('./intl-manual-content-sync.cjs');",
    "const { syncIntlManualContent } = require('./intl-manual-content-sync.cjs');\nconst { syncIntlArticleJapaneseHreflang } = require('./intl-article-hreflang-sync.cjs');\nconst { syncTaiwanTerminology } = require('./tw-terminology-sync.cjs');"
  );
}
if (!build.includes('syncIntlArticleJapaneseHreflang(rootDir)')) {
  build = build.replace(
    'applyIntlContentExpansion(rootDir);',
    "applyIntlContentExpansion(rootDir);\nconst intlJaHreflangSummary = syncIntlArticleJapaneseHreflang(rootDir);\nconsole.log(`[build-html] synchronized international/Japanese hreflang: ${intlJaHreflangSummary.changed}/${intlJaHreflangSummary.checked} updated`);"
  );
}
if (!build.includes('syncTaiwanTerminology(rootDir)')) {
  build = build.replace(
    "require('./generate-game-simulators.cjs');",
    "require('./generate-game-simulators.cjs');\n\nconst twTerminologySummary = syncTaiwanTerminology(rootDir);\nconsole.log(`[build-html] synchronized Taiwan terminology: ${twTerminologySummary.changed}/${twTerminologySummary.checked} updated`);"
  );
}
write('scripts/build-html.js', build);

let expansion = read('scripts/intl-content-expansion.cjs');
if (!expansion.includes("require('./intl-article-hreflang-sync.cjs')")) {
  expansion = expansion.replace(
    "} = require('./locale-ids.cjs');",
    "} = require('./locale-ids.cjs');\nconst { getJapaneseAlternateForSlug } = require('./intl-article-hreflang-sync.cjs');"
  );
}
const oldBlock = "      const alternates = LOCALES.map(candidate =>\n        `    <xhtml:link rel=\"alternate\" hreflang=\"${candidate.hreflang}\" href=\"https://playpoint-sim.com/${articlePath(candidate.key, topic.slug)}\" />`\n      ).join('\\n');\n      urls.push(`  <url>\\n    <loc>${loc}</loc>\\n    <lastmod>${topic.publishedAt || PUBLISHED_AT}</lastmod>\\n${alternates}\\n    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"https://playpoint-sim.com/${articlePath(DEFAULT_INTERNATIONAL_LOCALE, topic.slug)}\" />\\n  </url>`);";
const newBlock = "      const alternates = LOCALES.map(candidate =>\n        `    <xhtml:link rel=\"alternate\" hreflang=\"${candidate.hreflang}\" href=\"https://playpoint-sim.com/${articlePath(candidate.key, topic.slug)}\" />`\n      ).join('\\n');\n      const jaPath = getJapaneseAlternateForSlug(topic.slug);\n      const japaneseAlternate = jaPath\n        ? `    <xhtml:link rel=\"alternate\" hreflang=\"ja\" href=\"https://playpoint-sim.com${jaPath}\" />\\n`\n        : '';\n      urls.push(`  <url>\\n    <loc>${loc}</loc>\\n    <lastmod>${topic.publishedAt || PUBLISHED_AT}</lastmod>\\n${japaneseAlternate}${alternates}\\n    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"https://playpoint-sim.com/${articlePath(DEFAULT_INTERNATIONAL_LOCALE, topic.slug)}\" />\\n  </url>`);";
if (!expansion.includes('const jaPath = getJapaneseAlternateForSlug(topic.slug);')) {
  if (!expansion.includes(oldBlock)) throw new Error('intl-content-expansion.cjs: sitemap block not found');
  expansion = expansion.replace(oldBlock, newBlock);
}
write('scripts/intl-content-expansion.cjs', expansion);

write('tests/intl-localization-quality.test.cjs', String.raw`'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { ARTICLE_JA_ALTERNATES, INTL_LOCALES, SITE_ORIGIN, intlUrl } = require('../scripts/intl-article-hreflang-sync.cjs');

const root = path.resolve(__dirname, '..');
function sitePathToFile(sitePath) {
  const relative = sitePath.replace(/^\//, '');
  return path.join(root, relative.endsWith('/') ? relative + 'index.html' : relative);
}
function walkHtml(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkHtml(file));
    else if (entry.name.endsWith('.html')) files.push(file);
  }
  return files;
}

test('Korean article hub keeps the missing/not-completing negation', () => {
  const source = fs.readFileSync(path.join(root, 'scripts', 'intl-manual-content-sync.cjs'), 'utf8');
  const hub = fs.readFileSync(path.join(root, 'ko', 'articles', 'index.html'), 'utf8');
  assert.ok(!source.includes('퀘스트가 표시되거나 완료되지 않을 때'));
  assert.ok(!hub.includes('퀘스트가 표시되거나 완료되지 않을 때'));
  assert.ok(source.includes('퀘스트가 표시되지 않거나 완료되지 않을 때'));
  assert.ok(hub.includes('퀘스트가 표시되지 않거나 완료되지 않을 때'));
});

test('Taiwan pages use Taiwan official Gold and earning-rate terminology', () => {
  const files = walkHtml(path.join(root, 'tw'));
  assert.ok(files.length > 0);
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    assert.ok(!/(?<![白黃])金級/.test(html), path.relative(root, file) + ': bare Taiwan Gold tier');
    assert.ok(!html.includes('累積率'), path.relative(root, file) + ': old earning-rate term');
    assert.ok(!html.includes('累積條件'), path.relative(root, file) + ': old earning-condition term');
  }
  const runtime = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  assert.ok(runtime.includes('"黃金級": 1.5'));
  assert.ok(!runtime.includes('"金級": 1.5'));
  const seoSource = fs.readFileSync(path.join(root, 'scripts', 'intl-seo-content.cjs'), 'utf8');
  assert.ok(!/(?<![白黃])金級/.test(seoSource));
  assert.ok(!seoSource.includes('累積率'));
});

test('Hong Kong keeps its own official tier names', () => {
  const hk = fs.readFileSync(path.join(root, 'hk', 'index.html'), 'utf8');
  assert.ok(hk.includes('金級'));
  assert.ok(hk.includes('鉑金級'));
  assert.ok(!hk.includes('黃金級'));
  assert.ok(!hk.includes('白金級'));
});

test('verified Japanese counterparts have reciprocal hreflang sets', () => {
  for (const [slug, jaPath] of Object.entries(ARTICLE_JA_ALTERNATES)) {
    const jaFile = sitePathToFile(jaPath);
    assert.ok(fs.existsSync(jaFile), 'missing Japanese target: ' + jaPath);
    const jaHtml = fs.readFileSync(jaFile, 'utf8');
    for (const [locale, hreflang] of INTL_LOCALES) {
      const intlFile = path.join(root, locale, 'articles', slug);
      const intlHtml = fs.readFileSync(intlFile, 'utf8');
      assert.ok(intlHtml.includes('hreflang="ja" href="' + SITE_ORIGIN + jaPath + '"'));
      assert.ok(jaHtml.includes('hreflang="' + hreflang + '" href="' + intlUrl(locale, slug) + '"'));
    }
    assert.ok(jaHtml.includes('hreflang="x-default" href="' + intlUrl('en', slug) + '"'));
  }
});

test('international expansion sitemap adds ja only for verified equivalents', () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap-intl-content-expansion.xml'), 'utf8');
  for (const [slug, jaPath] of Object.entries(ARTICLE_JA_ALTERNATES)) {
    if (slug === 'index.html' || !xml.includes('/en/articles/' + slug)) continue;
    const start = xml.indexOf('<loc>https://playpoint-sim.com/en/articles/' + slug + '</loc>');
    assert.ok(start >= 0);
    const blockEnd = xml.indexOf('</url>', start);
    const block = xml.slice(start, blockEnd);
    assert.ok(block.includes('hreflang="ja" href="https://playpoint-sim.com' + jaPath + '"'));
  }
  const slug = 'google-play-points-500-1000-cost.html';
  const start = xml.indexOf('<loc>https://playpoint-sim.com/en/articles/' + slug + '</loc>');
  assert.ok(start >= 0);
  const block = xml.slice(start, xml.indexOf('</url>', start));
  assert.ok(!block.includes('hreflang="ja"'));
});
`);

console.log('International quality source patch applied.');
