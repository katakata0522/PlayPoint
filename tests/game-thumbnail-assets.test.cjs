'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { openingTags } = require('./helpers/markup-contract.cjs');

const root = path.resolve(__dirname, '..');
const { GAME_THUMBNAIL_ASSETS, resolveGameThumbnail } = require('../scripts/game-thumbnail-assets.cjs');
const { GAME_GUIDE_ARTICLES } = require('../scripts/game-guide-article-catalog.cjs');

function webpDimensions(buffer) {
  assert.equal(buffer.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(buffer.subarray(8, 12).toString('ascii'), 'WEBP');
  const format = buffer.subarray(12, 16).toString('ascii');
  if (format === 'VP8 ') return { width: buffer.readUInt16LE(26) & 16383, height: buffer.readUInt16LE(28) & 16383 };
  if (format === 'VP8L') { const bits = buffer.readUInt32LE(21); return { width: (bits & 16383) + 1, height: ((bits >>> 14) & 16383) + 1 }; }
  assert.equal(format, 'VP8X');
  return {
    width: 1 + buffer.readUIntLE(24, 3),
    height: 1 + buffer.readUIntLE(27, 3)
  };
}

test('game thumbnail registry covers every listed Japanese game guide exactly once', () => {
  const titles = GAME_GUIDE_ARTICLES.map(article => article.gameTitle);
  assert.equal(new Set(titles).size, titles.length, 'game guide titles should be unique for thumbnail lookup');
  for (const title of titles) {
    assert.ok(GAME_THUMBNAIL_ASSETS[title], 'missing thumbnail registry: ' + title);
  }
});

test('thumbnail registry keeps provenance and never activates a missing local asset', () => {
  const ids = new Set();
  for (const entry of Object.values(GAME_THUMBNAIL_ASSETS)) {
    assert.match(entry.gameId, /^[a-z0-9-]+$/);
    assert.equal(ids.has(entry.gameId), false, 'duplicate gameId: ' + entry.gameId);
    ids.add(entry.gameId);
    assert.match(entry.sourcePageUrl, /^https:\/\/play\.google\.com\/store\/apps\/details\?/);
    assert.ok(entry.rightsHolder);
    assert.equal(entry.usage, 'article-list-thumbnail');
    assert.ok(['pending', 'active', 'disabled', 'legacy-unverified'].includes(entry.status));

    if (entry.status === 'active') {
      assert.ok(entry.localPath, entry.gameTitle + ': active asset needs localPath');
      assert.ok(entry.sourceImageUrl, entry.gameTitle + ': active asset needs sourceImageUrl');
      assert.ok(entry.acquiredAt, entry.gameTitle + ': active asset needs acquiredAt');
      assert.match(entry.localPath, /^images\/game-icons\/[a-z0-9-]+\.(?:png|jpe?g|webp)$/);
      const absolute = path.join(root, entry.localPath);
      assert.equal(fs.existsSync(absolute), true, entry.localPath + ' should exist');
      assert.ok(fs.statSync(absolute).size <= 50 * 1024, entry.localPath + ' should stay within the 50KB mobile list-image budget');
      assert.deepEqual(webpDimensions(fs.readFileSync(absolute)), { width: 128, height: 128 });
      const highDensity = path.join(root, entry.highDensityLocalPath);
      assert.ok(fs.statSync(highDensity).size <= 112 * 1024, entry.gameId + ': high-density icon budget');
      assert.deepEqual(webpDimensions(fs.readFileSync(highDensity)), { width: 240, height: 240 }, '120px at 2x density must not upscale the source');
    }
  }
});

test('active game icons resolve to local app-icon thumbnails and unknown games fail safe', () => {
  for (const entry of Object.values(GAME_THUMBNAIL_ASSETS)) {
    assert.equal(entry.status, 'active');
    assert.deepEqual(resolveGameThumbnail(entry.gameTitle), {
      thumbnail: '../' + entry.localPath,
      thumbnailKind: 'app-icon'
    });
  }
  assert.deepEqual(resolveGameThumbnail('未登録ゲーム'), {
    thumbnail: '../ogp.png',
    thumbnailKind: 'generic'
  });
});

test('game-guide manifest entries use the registry thumbnail contract', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8'));
  for (const article of GAME_GUIDE_ARTICLES) {
    const entry = manifest.find(item => item.id === article.id);
    assert.ok(entry, article.id + ': manifest entry should exist');
    assert.deepEqual(
      { thumbnail: entry.thumbnail, thumbnailKind: entry.thumbnailKind },
      resolveGameThumbnail(article.gameTitle),
      article.id + ': manifest thumbnail should follow registry'
    );
  }
});


test('game guides expose the official app listing without turning the app icon into the article hero or OGP', () => {
  for (const article of GAME_GUIDE_ARTICLES) {
    const entry = GAME_THUMBNAIL_ASSETS[article.gameTitle];
    const relativePath = article.file.replace(/^\.\.\//, '');
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');

    const tags = openingTags(html);
    assert.ok(tags.some(tag=>tag.tag==='a' && tag.attrs.href?.replaceAll('&amp;','&')===entry.sourcePageUrl),article.id+': 公式アプリへの実リンクが必要');
    const metas = openingTags(html).filter(tag=>tag.tag==='meta');
    const ogp = metas.find(tag=>tag.attrs.property==='og:image')?.attrs.content;
    assert.ok(ogp && ogp.startsWith('https://playpoint-sim.com/'), article.id+': 同一サイトのOGPが必要');
    assert.ok(!ogp.includes('/images/game-icons/'),article.id+': 一覧アイコンをOGPへ流用しない');
    assert.ok(fs.existsSync(path.join(root,new URL(ogp).pathname)),article.id+': OGP資産が実在する');
    const graphs = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(match=>{
      const value=JSON.parse(match[1]);return value['@graph'] || (Array.isArray(value)?value:[value]);
    });
    const articleData = graphs.find(item=>item['@type']==='Article');
    assert.ok(articleData);
    assert.equal(articleData.image,ogp,article.id+': 公開メタとArticleの画像を一致させる');
    assert.ok(!tags.some(tag=>tag.tag==='img' && /images\/game-icons\//.test(tag.attrs.src||'')),article.id+': 記事を一覧アイコンのheroへ置換しない');
  }
});
