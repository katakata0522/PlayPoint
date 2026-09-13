'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const {
  GAME_GUIDE_ARTICLES,
  isGameGuideArticlePath
} = require('../scripts/game-guide-article-catalog.cjs');
const { classifyArticleRole } = require('../scripts/article-role-registry.cjs');
const { articleCorpus } = require('../scripts/article-role-next-action-audit.cjs');
const blogUtils = require('../blog/utils.js');

const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function repoPath(article) {
  return article.file.replace(/^\.\.\//, '');
}

test('game guide catalog contains exactly 17 unique deep guides', () => {
  assert.equal(GAME_GUIDE_ARTICLES.length, 17);
  assert.equal(new Set(GAME_GUIDE_ARTICLES.map(article => article.id)).size, 17);
  assert.equal(new Set(GAME_GUIDE_ARTICLES.map(article => article.file)).size, 17);
  for (const article of GAME_GUIDE_ARTICLES) {
    assert.match(article.file, /^\.\.\/games\/[a-z0-9-]+\/[a-z0-9-]+\/index\.html$/);
    assert.equal(article.category, '使い方');
    assert.ok(article.gameTitle);
    assert.ok(article.tags.includes('Play Points'));
    assert.equal(classifyArticleRole(repoPath(article)), 'game_decision');
  }
});

test('all game guides are registered in the article manifest and filters', () => {
  const manifest = JSON.parse(read('blog/articles.json'));
  const byFile = new Map(manifest.map(article => [article.file, article]));
  for (const article of GAME_GUIDE_ARTICLES) {
    const registered = byFile.get(article.file);
    assert.ok(registered, `${article.file} missing from blog/articles.json`);
    assert.equal(registered.source, 'game-guide');
    assert.equal(registered.listed, true);
    assert.ok(blogUtils.GAME_TITLE_FILTERS.includes(article.gameTitle), `${article.gameTitle} missing from game filter`);
  }
});

test('game guides use the full article-site reading shell', () => {
  for (const article of GAME_GUIDE_ARTICLES) {
    const file = repoPath(article);
    const html = read(file);
    assert.match(html, /data-game-guide-article=["']true["']/);
    assert.match(html, /<article\b[^>]*class=["'][^"']*\bcontent\b[^"']*\bmain-content-column\b/);
    assert.match(html, /class=["'][^"']*\bhero\b/);
    assert.match(html, /class=["'][^"']*\bintro\b/);
    assert.match(html, /data-reading-tools/);
    assert.match(html, /href=["']\/blog\/#reading-library["']/);
    assert.match(html, /class=["'][^"']*\bgame-guide-next-action\b/);
    assert.match(html, /class=["'][^"']*\brelated-links-section\b/);
    assert.match(html, /class=["'][^"']*\bauthor-profile-box\b/);
    assert.match(html, /<aside\b[^>]*class=["'][^"']*\bja-article-sidebar\b/);
    assert.match(html, /class=["'][^"']*\barticle-ad-container\b/);
    assert.match(html, /"datePublished"\s*:/);
    assert.match(html, /"dateModified"\s*:/);
    assert.doesNotMatch(html, /game-giftcard-cta-btn\s+rakuten-primary-btn/);
    assert.doesNotMatch(html, /class=["']game-ad-slot["']/);
  }
});

test('article corpus and search index include every game guide', () => {
  const corpus = new Set(articleCorpus(root).map(record => record.relativePath));
  const searchIndex = JSON.parse(read('blog/article-search-index.json'));
  const indexed = new Set(searchIndex.articles.map(item => item.path.replace(/^\//, '')));
  for (const article of GAME_GUIDE_ARTICLES) {
    const file = repoPath(article);
    assert.ok(corpus.has(file), `${file} missing from article corpus`);
    assert.ok(indexed.has(file), `${file} missing from body-search index`);
  }
});

test('blog runtime explicitly accepts deep game guides without opening arbitrary paths', () => {
  const script = read('blog/script.js');
  assert.match(script, /gameGuideArticle/);
  assert.match(script, /\^\\\.\\\.\\\/games/);
  assert.match(script, /index\\\.html/);
  assert.doesNotMatch(script, /value\.startsWith\('\.\.\/games\/'\)/);
});

test('official verification registry covers all game guide articles', () => {
  const registry = JSON.parse(read('scripts/article-official-verification-dates.json'));
  for (const article of GAME_GUIDE_ARTICLES) {
    assert.equal(registry[repoPath(article)], '2026-09-13');
  }
});

test('game guide paths are the only game deep pages treated as article records', () => {
  for (const article of GAME_GUIDE_ARTICLES) assert.equal(isGameGuideArticlePath(repoPath(article)), true);
  assert.equal(isGameGuideArticlePath('games/genshin/index.html'), false);
  assert.equal(isGameGuideArticlePath('games/genshin/random/index.html'), false);
  assert.equal(isGameGuideArticlePath('games/index.html'), false);
});


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
    const source = read(file).match(/    function sanitizeArticleFile\(value\) \{[\s\S]*?\n    \}/)?.[0];
    assert.ok(source, file);
    const sanitize = vm.runInNewContext('(' + source.trim() + ')');
    assert.equal(sanitize('../articles/example.html'), '../articles/example.html');
    for (const article of GAME_GUIDE_ARTICLES) assert.equal(sanitize(article.file), article.file);
    for (const candidate of [null, '../games/fgo/index.html', '../games/../private/index.html', '../games/fgo/%2e%2e/index.html', 'https://evil.example/a.html', '../articles/a.html<script>', '../games/fgo/pity-cost/index.html?x=1']) {
      assert.equal(sanitize(candidate), '#', file + ': ' + candidate);
    }
  }
});


test('公開URL・正規URL・リポジトリパスを同じ登録ゲーム記事として扱う', () => {
  const { articleForPath } = require('../scripts/game-guide-article-catalog.cjs');
  for (const article of GAME_GUIDE_ARTICLES) {
    const file = repoPath(article);
    for (const candidate of [file, article.file, '/' + file, '/' + file.replace(/index\.html$/, '')]) {
      assert.equal(isGameGuideArticlePath(candidate), true, candidate);
      assert.equal(articleForPath(candidate)?.id, article.id, candidate);
      assert.equal(classifyArticleRole(candidate), 'game_decision', candidate);
    }
  }
  for (const candidate of ['//games/fgo/pity-cost/', '/games/fgo/../', '/games/fgo/random/', '/games/fgo/pity-cost/?x=1', 'https://evil.example/games/fgo/pity-cost/']) {
    assert.equal(isGameGuideArticlePath(candidate), false, candidate);
  }
});

test('統合済み記事の欠損画像も本文を変えずに修復し再実行で差分を増やさない', () => {
  const os = require('node:os');
  const { transformGameGuide } = require('../scripts/game-guide-article-hub-sync.cjs');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-guide-metadata-'));
  try {
    for (const article of GAME_GUIDE_ARTICLES) {
      const file = repoPath(article);
      const target = path.join(temporary, file);
      const original = read(file).replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (full, body) => {
        const data = JSON.parse(body);
        if (data['@type'] !== 'Article') return full;
        delete data.image;
        return '<script type="application/ld+json">' + JSON.stringify(data) + '</script>';
      });
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, original);
      assert.equal(transformGameGuide(temporary, article), true);
      const repaired = fs.readFileSync(target, 'utf8');
      const schemas = [...repaired.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
      assert.equal(schemas.find(node => node['@type'] === 'Article').image, 'https://playpoint-sim.com/ogp.png');
      assert.equal(repaired.slice(repaired.indexOf('<body')), original.slice(original.indexOf('<body')), file + ': 本文を保持する');
      assert.equal(transformGameGuide(temporary, article), false, file + ': 冪等性');
      assert.equal(fs.readFileSync(target, 'utf8'), repaired);
    }
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
