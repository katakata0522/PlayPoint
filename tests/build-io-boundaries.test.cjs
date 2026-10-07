'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { prepareDiscoveryArticle, syncArticleDiscovery } = require('../scripts/article-discovery-sync.cjs');
const { syncPublicAssetVersions } = require('../scripts/article-asset-versioning.cjs');
const { syncGameSeoWave5RegionalRates } = require('../scripts/game-seo-wave5-regional-sync.cjs');
const { syncGameSeoSafety } = require('../scripts/game-seo-safety-sync.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-build-io-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function write(root, file, content) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
}
function ioCounts(t, root) {
  const reads = new Map(), writes = new Map();
  const read = fs.readFileSync, save = fs.writeFileSync;
  t.mock.method(fs, 'readFileSync', function (file, ...args) {
    const key = path.relative(root, String(file)).replace(/\\/g, '/');
    reads.set(key, (reads.get(key) || 0) + 1);
    return Reflect.apply(read, this, [file, ...args]);
  });
  t.mock.method(fs, 'writeFileSync', function (file, ...args) {
    const key = path.relative(root, String(file)).replace(/\\/g, '/');
    writes.set(key, (writes.get(key) || 0) + 1);
    return Reflect.apply(save, this, [file, ...args]);
  });
  return { reads, writes, reset() { reads.clear(); writes.clear(); } };
}
const articleHtml = '<!doctype html><html><head><meta name="description" content="Source description"></head><body><article><header><h1>Guide &amp; terms</h1></header><h2 id="article-section-1">First</h2><p>Existing facts</p><h2>Second</h2><p>More facts</p><nav>Navigation only</nav></article></body></html>';
const hubHtml = '<html><head></head><body><div id="article-grid" data-intl-guide-controls></div></body></html>';

function discoveryFixture(t) {
  const root = fixture(t);
  const articles = ['articles/2025-12-25-weekly-reward.html', 'games/fgo/pity-cost/index.html', ...['en', 'ko', 'tw'].map(l => `${l}/articles/google-play-points-weekly-reward.html`)];
  const hubs = ['blog/index.html', ...['en', 'ko', 'tw'].map(l => `${l}/articles/index.html`)];
  const assets = ['js/article-search.js', 'js/reading-library.js', 'js/reading-theme.js', 'js/reading-experience.js', 'articles/article-discovery.css', 'articles/reading-theme.css'];
  for (const file of articles) write(root, file, articleHtml);
  for (const file of hubs) write(root, file, hubHtml);
  for (const file of assets) write(root, file, 'fixture asset');
  write(root, 'games/index.html', '<a class="game-portal-card" href="./fgo/"><h2 class="game-card-title">Fate/Grand Order (FGO)</h2></a>');
  write(root, 'blog/articles.json', JSON.stringify(articles.slice(0, 2).map(file => ({ file: '../' + file, title: 'Guide' }))));
  return { root, articles, hubs, assets };
}

test('記事変換はI/Oなしで本文・既存アンカー・入力レコードを保つ', t => {
  const entry = Object.freeze({ path: 'en/articles/google-play-points-weekly-reward.html', locale: 'en', tags: Object.freeze(['reward']) });
  t.mock.method(fs, 'readFileSync', () => { throw new Error('変換だけでファイルを読み込んではいけません'); });
  t.mock.method(fs, 'writeFileSync', () => { throw new Error('変換だけでファイルを書いてはいけません'); });
  const first = prepareDiscoveryArticle(articleHtml, entry);
  assert.equal(first.record.role, 'retention');
  assert.equal(first.record.title, 'Guide & terms');
  assert.match(first.html, /id="article-section-1"/);
  assert.match(first.html, /id="article-section-2"/);
  assert.match(first.html, /Existing facts/);
  assert.equal(first.record.sections.some(s => /Navigation only|Open this week/.test(s.text)), false);
  assert.deepEqual(prepareDiscoveryArticle(articleHtml, entry), first);
  assert.deepEqual(prepareDiscoveryArticle(first.html, entry).record, first.record);
  assert.match(first.html, /Language: English · US reference/, '通常の海外記事は詳細な地域注意を維持する');
  const compactScope = prepareDiscoveryArticle(articleHtml, Object.freeze({ path: 'en/articles/google-play-points-cash-conversion.html', locale: 'en' }));
  assert.match(compactScope.html, /article-region-scope" aria-label="United States reference[^"]*">United States<\/p>/, '冒頭を整理した現金化記事は地域表示を短くする');
  assert.deepEqual(prepareDiscoveryArticle(compactScope.html, Object.freeze({ path: 'en/articles/google-play-points-cash-conversion.html', locale: 'en' })), compactScope, '注釈付きの短い地域表示も再生成で重複しない');
  const withOptionalToc = articleHtml.replace('</header>', '</header><details class="reader-toc reader-toc--intl"><summary>On this page</summary><nav><a href="#article-section-1">First</a></nav></details>');
  const preparedToc = prepareDiscoveryArticle(withOptionalToc, entry);
  assert.equal(preparedToc.record.sections.some(section => section.text.includes('On this page')), false, '折りたたみ目次のラベルを検索本文へ混ぜない');
  const withLegacyToc = articleHtml.replace('</header>', '</header><details class="inpage-toc"><summary>目次を開く</summary><ol><li><a href="#article-section-1">First</a></li></ol></details>');
  const preparedLegacyToc = prepareDiscoveryArticle(withLegacyToc, entry);
  assert.equal(preparedLegacyToc.record.sections.some(section => section.text.includes('目次を開く')), false, '既存の日本語目次ラベルも検索本文へ混ぜない');
  const optionalToc = articleHtml.replace('<article>', '<article><div class="intro">Direct answer</div><details class="reader-toc reader-toc--intl"><summary>On this page</summary><nav><h2>Contents</h2></nav></details>');
  const tocPrepared = prepareDiscoveryArticle(optionalToc, entry);
  assert.equal(tocPrepared.record.sections[0].text, 'Direct answer', '折りたたみ目次のラベルを検索用の冒頭文へ混ぜない');
  assert.deepEqual(entry.tags, ['reward']);
  const heroHtml = articleHtml.replace('<article>', '<div class="hero"><h1>Guide</h1><p class="hero-meta">Verified date</p>\n  </div><article>');
  const preparedHero = prepareDiscoveryArticle(heroHtml, entry);
  assert.deepEqual(prepareDiscoveryArticle(preparedHero.html, entry), preparedHero, '静的な保存欄を日付情報の後に置いても再生成で空白を増減しない');
});

test('記事とハブは対象内だけを更新し、再実行で不要な再書き込みを増やさない', t => {
  const { root, articles, hubs, assets } = discoveryFixture(t);
  write(root,'docs/unrelated.txt','untouched');
  const io = ioCounts(t, root);
  assert.equal(syncArticleDiscovery(root), articles.length);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'blog/game-calculators.json'), 'utf8')),
    [{ id: 'fgo', title: 'Fate/Grand Order (FGO)', href: '/games/fgo/' }]);
  const allowed = new Set([...articles,...hubs,'blog/game-calculators.json',
    ...['blog','en/articles','ko/articles','tw/articles'].map(dir=>dir+'/article-search-index.json')]);
  assert.ok([...io.writes.keys()].every(file=>allowed.has(file)),'対象外へ書き込まない');
  assert.equal(fs.readFileSync(path.join(root,'docs/unrelated.txt'),'utf8'),'untouched');

  for (const file of [...articles, ...hubs]) {
    assert.ok((io.reads.get(file) || 0) >= 1, file + ': target must be read');
    assert.ok((io.writes.get(file) || 0) <= 1, file + ': target must not be rewritten repeatedly in one sync');
  }
  for (const file of assets) assert.ok((io.reads.get(file) || 0) >= 1, file + ': shared asset must participate in hashing');
  io.reset();
  assert.equal(syncArticleDiscovery(root), articles.length);
  for (const file of [...articles, ...hubs]) {
    assert.ok((io.reads.get(file) || 0) >= 1, file + ': target must remain auditable on repeat sync');
    assert.ok((io.writes.get(file) || 0) <= 1, file + ': repeat sync must not churn writes');
  }
  for (const file of ['blog', 'en/articles', 'ko/articles', 'tw/articles']) {
    assert.equal(io.writes.has(`${file}/article-search-index.json`), false);
  }
  assert.equal(io.writes.has('blog/game-calculators.json'), false);
  for (const file of assets) assert.ok((io.reads.get(file) || 0) >= 1, file + ': shared asset must be re-evaluated between sync runs');
});

test('検索用アセットは一覧だけで参照し、編集後の同期でハッシュを更新する', t => {
  const { root, articles, hubs } = discoveryFixture(t);
  syncArticleDiscovery(root);
  write(root, 'js/article-search.js', 'new asset');
  const expected = crypto.createHash('sha256').update('new asset').digest('hex').slice(0, 10);
  syncArticleDiscovery(root);
  for (const file of hubs) {
    assert.ok(fs.readFileSync(path.join(root, file), 'utf8').includes(`/js/article-search.js?v=${expected}`), file);
    assert.ok(!fs.readFileSync(path.join(root, file), 'utf8').includes('/js/reading-experience.js'), file);
  }
  for (const file of articles) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(!html.includes('/js/article-search.js'), file);
    assert.ok(html.includes('/js/reading-experience.js'), file);
  }
});

test('公開ハッシュは実行間で古い値を再利用せず、変更時だけ参照を更新する', t => {
  const root = fixture(t);
  const files = ['index.html', 'articles/one.html', 'en/articles/two.html'];
  const assets = ['style.css', 'js/main.js', 'js/helper.js'];
  for (const file of assets) write(root, file, file + '\r\n');
  const html = '<html><head><link rel="stylesheet" href="/style.css"><link rel="modulepreload" href="/js/main.js"><link rel="modulepreload" href="/js/helper.js"><script src="/js/main.js"></script><script src="/js/helper.js"></script><script src="https://example.invalid/external.js"></script></head></html>';
  for (const file of files) write(root, file, html);
  const io = ioCounts(t, root);

  assert.equal(syncPublicAssetVersions(root), files.length);
  for (const file of assets) assert.ok((io.reads.get(file) || 0) >= 1, file);

  io.reset();
  assert.equal(syncPublicAssetVersions(root), 0);
  assert.equal(io.writes.size, 0);

  write(root, 'style.css', 'updated\r\n');
  io.reset();
  assert.equal(syncPublicAssetVersions(root), files.length);
  assert.ok((io.reads.get('style.css') || 0) >= 1);
  const expected = crypto.createHash('sha256').update('updated\n').digest('hex').slice(0, 10);
  for (const file of files) {
    const result = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(result.includes('/style.css?v=' + expected));
    assert.ok(result.includes('<link rel="modulepreload" href="/js/helper.js">'));
    assert.ok(result.includes('src="https://example.invalid/external.js"'));
  }
});

test('地域レート補正は記事ハブがない環境でも完了し、対象外ファイルを書かない', t => {
  const root = fixture(t);
  const parents = ['en', 'ko', 'tw'].flatMap(locale => ['prospi-a', 'pokemon-go', 'efootball'].map(slug => `${locale}/games/${slug}/index.html`));
  for (const file of parents) write(root, file, '<label for="sim-custom-amount">Old</label><select id="sim-multiplier"></select><select id="sim-status"></select><script type="application/ld+json">{"priceCurrency":"JPY"}</script>');
  write(root, 'articles/unrelated.html', 'untouched');
  const io = ioCounts(t, root);

  const result = syncGameSeoWave5RegionalRates(root);
  assert.equal(result.checked, parents.length);
  assert.deepEqual([...io.writes.keys()].sort(), parents.sort());
  assert.equal(fs.existsSync(path.join(root, 'blog')), false);
  assert.equal(fs.readFileSync(path.join(root, 'articles/unrelated.html'), 'utf8'), 'untouched');

  const en = fs.readFileSync(path.join(root, 'en/games/prospi-a/index.html'), 'utf8');
  assert.ok(en.includes('Standard: $1 1pt'));
  assert.ok(en.includes('"priceCurrency":"USD"'));
  const ko = fs.readFileSync(path.join(root, 'ko/games/prospi-a/index.html'), 'utf8');
  assert.ok(ko.includes('골드 (1,000원 = 1.3pt)'));

  io.reset();
  assert.deepEqual(syncGameSeoWave5RegionalRates(root).changedFiles, []);
  assert.equal(io.writes.size, 0);

  write(root, parents[0], '<html>missing select</html>');
  assert.throws(() => syncGameSeoWave5RegionalRates(root), /not found/);
});

test('価格安全補正は対象だけを変更し、再実行で冪等かつ欠損契約を失敗させる', t => {
  const root = fixture(t);
  const parents = ['fgo', 'bluearchive', 'nikke', 'gakumas', 'proseka'];
  for (const slug of parents) write(root, `games/${slug}/index.html`, '<html><input type="number" id="sim-custom-amount" value="1900" min="0" step="any" inputmode="decimal"></html>');
  write(root, 'games/fgo/guide/index.html', '<html>Read-only guide</html>');
  const io = ioCounts(t, root);

  syncGameSeoSafety(root);
  assert.equal(io.writes.has('games/fgo/guide/index.html'), false);
  assert.match(fs.readFileSync(path.join(root, 'games/fgo/index.html'), 'utf8'), /value="1920"/);

  io.reset();
  syncGameSeoSafety(root);
  assert.equal(io.writes.size, 0, 'second safety sync must be byte-idempotent');

  fs.rmSync(path.join(root, 'games/fgo/index.html'));
  assert.throws(() => syncGameSeoSafety(root), /ENOENT/);
});
