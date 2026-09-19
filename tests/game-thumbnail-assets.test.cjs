'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const { GAME_THUMBNAIL_ASSETS, resolveGameThumbnail } = require('../scripts/game-thumbnail-assets.cjs');
const { GAME_GUIDE_ARTICLES } = require('../scripts/game-guide-article-catalog.cjs');

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

test('article list renderer supports local icons without allowing arbitrary remote thumbnails', () => {
  const script = fs.readFileSync(path.join(root, 'blog/script.js'), 'utf8');
  assert.match(script, /images\\\/game-icons/);
  assert.match(script, /thumbnailKind/);
  assert.match(script, /shouldRenderArticleThumbnail\(article\)/);
  assert.doesNotMatch(script, /https\?:\\\/\\\/[^\\n]*safeThumbnail/);
});

test('game guides expose the official app listing without turning the app icon into the article hero or OGP', () => {
  for (const article of GAME_GUIDE_ARTICLES) {
    const entry = GAME_THUMBNAIL_ASSETS[article.gameTitle];
    const relativePath = article.file.replace(/^\.\.\//, '');
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');

    assert.ok(html.includes(entry.sourcePageUrl.replaceAll('&', '&amp;')), article.id + ': official app listing source should be visible');
    assert.match(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']https:\/\/playpoint-sim\.com\/ogp\.png["']/i, article.id + ': OGP should stay separate from the list icon');
    assert.match(html, /"image"\s*:\s*"https:\/\/playpoint-sim\.com\/ogp\.png"/, article.id + ': structured-data image should stay on the article OGP');
    assert.doesNotMatch(html, /<body[\s\S]*<img\b[^>]+images\/game-icons\//i, article.id + ': article body should not gain a large app-icon hero');
  }
});
