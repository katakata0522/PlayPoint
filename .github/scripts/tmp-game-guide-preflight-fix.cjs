'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
function replace(file, before, after) {
  const absolute = path.join(root, file);
  const source = fs.readFileSync(absolute, 'utf8');
  if (!source.includes(before)) throw new Error(file + ': 修正対象が見つかりません');
  fs.writeFileSync(absolute, source.replace(before, after));
}
function append(file, content) { fs.appendFileSync(path.join(root, file), content); }

// 記事一覧に依存しない既存の単体処理も保ち、未登録の通常記事を監査から落とさない。
replace('scripts/game-guide-article-catalog.cjs', `function getJapaneseArticleRepoPaths(rootDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'blog', 'articles.json'), 'utf8'));
  return [...new Set(manifest
    .map(article => article && article.file)
    .filter(isSupportedJapaneseArticleManifestFile)
    .map(file => file.replace(/^\\.\\.\\//, '')))];
}`, `function getJapaneseArticleRepoPaths(rootDir) {
  const directory = path.join(rootDir, 'articles');
  const standard = fs.existsSync(directory)
    ? fs.readdirSync(directory, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html')
      .map(entry => 'articles/' + entry.name)
    : [];
  const manifestPath = path.join(rootDir, 'blog', 'articles.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
  if (!Array.isArray(manifest)) throw new TypeError('記事一覧は配列である必要があります');
  const registered = manifest.map(article => article && article.file)
    .filter(isSupportedJapaneseArticleManifestFile)
    .map(file => file.slice(3));
  return [...new Set([...standard, ...registered])].sort();
}`);

// 既存の正規URL関数へ集約し、/index.html の二重登録を除く。
replace('scripts/sitemap-sync.cjs', "const { getGamePageHtmlFiles } = require('./game-page-targets.cjs');", "const { getGamePageHtmlFiles } = require('./game-page-targets.cjs');\nconst { GAME_GUIDE_ARTICLES, isSupportedJapaneseArticleManifestFile } = require('./game-guide-article-catalog.cjs');");
replace('scripts/sitemap-sync.cjs', "url: `${SITE_ORIGIN}/${String(article.file).replace(/^\\.\\.\\//, '')}`", "url: toPublicUrl(String(article.file).replace(/^\\.\\.\\//, ''))");
replace('scripts/sitemap-sync.cjs', ".filter(article => /^\\.\\.\\/articles\\/[^/]+\\.html$/.test(article.file))", ".filter(article => isSupportedJapaneseArticleManifestFile(article.file))");
replace('scripts/sitemap-sync.cjs', "href: String(article.file).replace(/^\\.\\.\\//, ''),", "href: toPublicUrl(String(article.file).slice(3)).slice(SITE_ORIGIN.length + 1),");
replace('scripts/sitemap-sync.cjs', '    ...NON_PLAYPOINT_URLS,', '    ...GAME_GUIDE_ARTICLES.map(article => SITE_ORIGIN + "/" + article.file.slice(3)),\n    ...NON_PLAYPOINT_URLS,');
replace('tests/all-article-quality-audit.test.cjs', '`https://playpoint-sim.com/${file}`', '`https://playpoint-sim.com/${file.replace(/\\/index\\.html$/, "/")}`');

// アンカー属性を付けても、複数の判断材料があるという検査の意味を維持する。
{
  const file = path.join(root, 'tests/game-seo-wave5.test.cjs');
  const source = fs.readFileSync(file, 'utf8');
  if ((source.match(/html\.match\(\/<h2>\/g\)/g) || []).length !== 3) throw new Error('見出し監査の対象数が変わっています');
  fs.writeFileSync(file, source.replaceAll('html.match(/<h2>/g)', 'html.match(/<h2\\b[^>]*>/g)'));
}

// 固定記事数ではなく実際の公開記事集合との一致を検査する。
replace('tests/article-discovery-retention.test.cjs', "const root = path.resolve(__dirname, '..');", `const root = path.resolve(__dirname, '..');
function publishedPaths(locale) {
  if (locale === 'ja') return JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8'))
    .filter(article => article.listed !== false).map(article => '/' + article.file.slice(3));
  return fs.readdirSync(path.join(root, locale, 'articles'))
    .filter(file => file.endsWith('.html') && file !== 'index.html')
    .map(file => '/' + locale + '/articles/' + file);
}`);
replace('tests/article-discovery-retention.test.cjs', "    assert.equal(index.articles.length,locale==='ja'?57:34);", "    assert.deepEqual(index.articles.map(article => article.path).sort(), publishedPaths(locale).sort());\n    assert.equal(new Set(index.articles.map(article => article.path)).size, index.articles.length);");
replace('tests/article-discovery-retention.test.cjs', ' const template=outcomes.createTemplate(root);assert.equal(template.rows.length,159);', " const template=outcomes.createTemplate(root);\n assert.deepEqual(template.rows.map(row => row.path).sort(), ['ja','en','ko','tw'].flatMap(publishedPaths).sort());");
replace('tests/article-role-next-action-audit.test.cjs', "const path = require('node:path');", "const path = require('node:path');\nconst fs = require('node:fs');");
replace('tests/article-role-next-action-audit.test.cjs', "  assert.equal(result.articleCount, 161, '2026-09-10の監査対象161記事をすべて通す');", `  const japanese = JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8')).map(article => article.file.slice(3));
  const international = ['en', 'ko', 'tw'].flatMap(locale => fs.readdirSync(path.join(root, locale, 'articles'))
    .filter(file => file.endsWith('.html') && file !== 'index.html').map(file => locale + '/articles/' + file));
  assert.equal(result.articleCount, new Set([...japanese, ...international]).size, '登録記事を全件監査する');`);

// 保存リストではディレクトリURLと index.html を同じ記事として扱う。
replace('js/reading-library.js', "  function safePath(value) { return typeof value === 'string' && /^\\/(?:en\\/|ko\\/|tw\\/)?articles\\/[a-z0-9-]+\\.html$/.test(value) && !value.endsWith('/index.html'); }", `  function normalizeArticlePath(value) {
    if (typeof value !== 'string') return null;
    if (/^\\/(?:en\\/|ko\\/|tw\\/)?articles\\/[a-z0-9-]+\\.html$/.test(value) && !value.endsWith('/index.html')) return value;
    if (/^\\/games\\/[a-z0-9-]+\\/[a-z0-9-]+\\/(?:index\\.html)?$/.test(value)) return value.replace(/index\\.html$/, '');
    return null;
  }
  function safePath(value) { return normalizeArticlePath(value) !== null; }`);
replace('js/reading-library.js', "    return (Array.isArray(items) ? items : []).filter(item => item && safePath(item.path) && typeof item.title === 'string' && !seen.has(item.path) && seen.add(item.path))", "    return (Array.isArray(items) ? items : []).map(item => item && ({ ...item, path: normalizeArticlePath(item.path) }))\n      .filter(item => item && safePath(item.path) && typeof item.title === 'string' && !seen.has(item.path) && seen.add(item.path))");
replace('js/reading-library.js', "toggle(item) { if (!safePath(item.path)) throw Error('Invalid article'); return change", "toggle(item) { if (!safePath(item?.path)) throw Error('Invalid article'); item = { ...item, path: normalizeArticlePath(item.path) }; return change");
replace('js/reading-library.js', "visit(item) { if (!safePath(item.path)) return read(); return change", "visit(item) { if (!safePath(item?.path)) return read(); item = { ...item, path: normalizeArticlePath(item.path) }; return change");
replace('js/reading-library.js', "s[type].filter(x => x.path !== articlePath)", "s[type].filter(x => x.path !== normalizeArticlePath(articlePath))");
replace('js/reading-library.js', 'const api = { KEY, safePath, cleanItems, makeStore, COPY };', 'const api = { KEY, safePath, normalizeArticlePath, cleanItems, makeStore, COPY };');
replace('js/reading-library.js', 'const document = root.document, pathname = root.location.pathname;', 'const document = root.document, pathname = normalizeArticlePath(root.location.pathname) || root.location.pathname;');
append('tests/article-discovery-retention.test.cjs', `

test('ゲーム記事の正規URLとindex.htmlを保存・履歴で重複させない', () => {
  const storage = memoryStorage();
  const store = makeStore(storage);
  const canonical = { path: '/games/fgo/pity-cost/', title: 'FGO' };
  const alias = { ...canonical, path: canonical.path + 'index.html' };
  store.toggle(alias); store.visit(alias); store.visit(canonical);
  assert.deepEqual(store.read().saved, [canonical]);
  assert.deepEqual(store.read().recent, [canonical]);
  store.toggle(canonical); assert.equal(store.read().saved.length, 0);
  store.toggle(canonical); store.remove('saved', alias.path);
  assert.equal(store.read().saved.length, 0);
  storage.setItem(KEY, JSON.stringify({ saved: [alias, canonical], recent: [canonical, alias] }));
  assert.deepEqual(store.read().saved, [canonical]);
  assert.deepEqual(store.read().recent, [canonical]);
  for (const candidate of ['/games/', '/games/fgo/', '/games/fgo/../', '/games/fgo/%2e%2e/', '/games/fgo/pity-cost/?x=1', '//evil.example/games/fgo/pity-cost/', 'javascript:alert(1)', '/games/fgo/pity-cost/extra.html']) {
    assert.equal(safePath(candidate), false, candidate);
    assert.throws(() => store.toggle({ path: candidate, title: '不正' }), /Invalid article/);
  }
});
`);
append('tests/game-guide-article-hub.test.cjs', `

test('ゲーム記事のURLはサイトマップとcanonicalで同じ正規形に揃う', () => {
  const { getBlogSitemapEntries, toPublicUrl } = require('../scripts/sitemap-sync.cjs');
  const urls = new Set(getBlogSitemapEntries(root).map(entry => entry.url));
  for (const article of GAME_GUIDE_ARTICLES) {
    const canonical = toPublicUrl(repoPath(article));
    assert.ok(urls.has(canonical), canonical);
    assert.ok(!urls.has(canonical + 'index.html'));
    assert.ok(read('sitemap.xml').includes('<loc>' + canonical + '</loc>'));
    assert.ok(!read('sitemap.xml').includes('<loc>' + canonical + 'index.html</loc>'));
  }
});

test('一覧ファイルがなくても通常記事を監査し、未登録のゲームページは混ぜない', () => {
  const os = require('node:os');
  const { getJapaneseArticleRepoPaths } = require('../scripts/game-guide-article-catalog.cjs');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-guide-corpus-'));
  try {
    fs.mkdirSync(path.join(temporary, 'articles'));
    fs.writeFileSync(path.join(temporary, 'articles', 'a.html'), '<article></article>');
    fs.writeFileSync(path.join(temporary, 'articles', 'index.html'), 'hub');
    assert.deepEqual(getJapaneseArticleRepoPaths(temporary), ['articles/a.html']);
    fs.mkdirSync(path.join(temporary, 'blog'));
    fs.writeFileSync(path.join(temporary, 'blog', 'articles.json'), JSON.stringify([
      { file: GAME_GUIDE_ARTICLES[0].file }, { file: GAME_GUIDE_ARTICLES[0].file },
      { file: '../games/fgo/index.html' }, { file: '../games/fgo/unregistered/index.html' }
    ]));
    assert.deepEqual(getJapaneseArticleRepoPaths(temporary), ['articles/a.html', repoPath(GAME_GUIDE_ARTICLES[0])].sort());
    fs.writeFileSync(path.join(temporary, 'blog', 'articles.json'), '{broken');
    assert.throws(() => getJapaneseArticleRepoPaths(temporary), SyntaxError);
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});

test('ブログの実際の入力境界は既存記事・ゲーム記事だけを受理する', () => {
  const vm = require('node:vm');
  for (const file of ['blog/script.js', 'blog/article.js']) {
    const source = read(file).match(/    function sanitizeArticleFile\\(value\\) \\{[\\s\\S]*?\\n    \\}/)?.[0];
    assert.ok(source, file);
    const sanitize = vm.runInNewContext('(' + source.trim() + ')');
    assert.equal(sanitize('../articles/example.html'), '../articles/example.html');
    for (const article of GAME_GUIDE_ARTICLES) assert.equal(sanitize(article.file), article.file);
    for (const candidate of [null, '../games/fgo/index.html', '../games/../private/index.html', '../games/fgo/%2e%2e/index.html', 'https://evil.example/a.html', '../articles/a.html<script>', '../games/fgo/pity-cost/index.html?x=1']) {
      assert.equal(sanitize(candidate), '#', file + ': ' + candidate);
    }
  }
});
`);

// JavaScript有効の実ブラウザでも保存・別URL・一覧への復帰を検証する。
replace('.github/scripts/article-design-smoke.cjs', 'async function main() {', `async function inspectGameReading(browser, baseUrl) {
  const origin = new URL(baseUrl).origin;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.fulfill({ status: 204, body: '' }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const articlePath = '/games/fgo/pity-cost/';
    let response = await page.goto(new URL(articlePath, baseUrl).href, { waitUntil: 'load' });
    assert(response?.ok(), 'ゲーム記事の正規URLを開けません');
    const button = page.locator('[data-reading-tools] button');
    await button.waitFor({ state: 'visible' });
    assert(await button.isEnabled(), 'ゲーム記事の保存ボタンが無効です');
    await button.click();
    assert(await button.getAttribute('aria-pressed') === 'true', 'ゲーム記事を保存できません');
    response = await page.goto(new URL(articlePath + 'index.html', baseUrl).href, { waitUntil: 'load' });
    assert(response?.ok(), 'ゲーム記事の別名URLを開けません');
    assert(await button.getAttribute('aria-pressed') === 'true', '別名URLで保存状態が失われました');
    const state = await page.evaluate(() => window.PlayPointReading.makeStore(localStorage).read());
    assert(state.saved.length === 1 && state.saved[0].path === articlePath, '保存先が正規URLに統一されていません');
    assert(state.recent.length === 1 && state.recent[0].path === articlePath, '閲覧履歴が重複しました');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'article-game-reading-mobile.png'), fullPage: true });
    response = await page.goto(new URL('/blog/#reading-library', baseUrl).href, { waitUntil: 'load' });
    assert(response?.ok(), '記事一覧を開けません');
    const links = page.locator('#reading-library a').filter({ hasText: 'FGO' });
    assert(await links.count() >= 1, '保存一覧からゲーム記事へ戻れません');
    assert(errors.length === 0, 'ゲーム記事の実行時エラー: ' + errors.join('; '));
    console.log('[article-design-smoke] game reading save/alias/history/hub: OK');
  } finally { await context.close(); }
}

async function main() {`);
replace('.github/scripts/article-design-smoke.cjs', '    for (const article of CASES) for (const viewport of VIEWPORTS) await inspect(browser, baseUrl, article, viewport);', '    for (const article of CASES) for (const viewport of VIEWPORTS) await inspect(browser, baseUrl, article, viewport);\n    await inspectGameReading(browser, baseUrl);');
console.log('[game-guide-preflight-fix] URL・保存機能・監査契約の修正を適用しました');
