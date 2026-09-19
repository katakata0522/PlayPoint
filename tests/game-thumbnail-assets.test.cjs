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
      assert.equal(fs.existsSync(path.join(root, entry.localPath)), true, entry.localPath + ' should exist');
    }
  }
});

test('pending game icons fail safe to the current generic thumbnail', () => {
  for (const entry of Object.values(GAME_THUMBNAIL_ASSETS)) {
    const resolved = resolveGameThumbnail(entry.gameTitle);
    if (entry.status !== 'active') {
      assert.deepEqual(resolved, { thumbnail: '../ogp.png', thumbnailKind: 'generic' });
    }
  }
});

test('article list renderer supports local icons without allowing arbitrary remote thumbnails', () => {
  const script = fs.readFileSync(path.join(root, 'blog/script.js'), 'utf8');
  assert.match(script, /images\\\/game-icons/);
  assert.match(script, /thumbnailKind/);
  assert.match(script, /shouldRenderArticleThumbnail\(article\)/);
  assert.doesNotMatch(script, /https\?:\\\/\\\/[^\\n]*safeThumbnail/);
});
