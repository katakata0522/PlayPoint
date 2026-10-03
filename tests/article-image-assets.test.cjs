'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const blogUtils = require('../blog/utils.js');
const {
  DEDICATED_OGP_IDS,
  GENERIC_ARTICLE_IDS,
  GAME_THUMBNAILS,
  expectedThumbnail,
  publicUrlForManifestPath,
  syncArticleImageRoles
} = require('../scripts/article-image-assets.cjs');

test('画像役割台帳は27ゲーム記事・60一般記事・17共有OGP解消対象を持つ', () => {
  assert.equal(Object.keys(GAME_THUMBNAILS).length, 27);
  assert.equal(GENERIC_ARTICLE_IDS.size, 60);
  assert.equal(DEDICATED_OGP_IDS.size, 17);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8'));
  const mappedIds = new Set([...Object.keys(GAME_THUMBNAILS), ...GENERIC_ARTICLE_IDS]);
  assert.equal(mappedIds.size, 87);
  assert.ok([...mappedIds].every(id => manifest.some(article => article.id === id)), '画像役割台帳の全記事が実manifestに存在する');
  assert.ok([...DEDICATED_OGP_IDS].every(id => manifest.some(article => article.id === id)), '専用OGP対象の全記事が実manifestに存在する');
  assert.ok([...Object.values(GAME_THUMBNAILS)].every(value => /^\.\.\/images\/game-icons\/[a-z0-9-]+\.webp$/.test(value)));
  assert.ok([...GENERIC_ARTICLE_IDS].every(id => /^[-a-z0-9]+$/.test(id)));
  assert.ok([...DEDICATED_OGP_IDS].every(id => /^[-a-z0-9]+$/.test(id)));
  assert.deepEqual(expectedThumbnail({ id: 'monst-in-app-packs-guide-2026' }), {
    thumbnail: '../images/game-icons/monst.webp',
    thumbnailKind: 'app-icon'
  });
  assert.deepEqual(expectedThumbnail({ id: 'super-weekly-reward-prize-history' }), {
    thumbnail: '../articles/thumbnails/super-weekly-reward-prize-history-square-v1.webp',
    thumbnailKind: 'generic'
  });
});

test('再生成してもmanifest・head・JSON-LDの画像役割が一致し、二回目は冪等になる', t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-article-image-roles-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  fs.mkdirSync(path.join(fixture, 'blog'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'games/fgo/pity-cost'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'articles/ogp'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'articles/thumbnails'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'images/game-icons'), { recursive: true });
  for (const file of [
    'articles/ogp/fgo-pity-cost-2026.png',
    'articles/ogp/example.png',
    'articles/thumbnails/super-weekly-reward-prize-history-square-v1.webp',
    'images/game-icons/fgo.webp'
  ]) fs.writeFileSync(path.join(fixture, file), 'asset');

  const gameHtml = '<!doctype html><html><head>' +
    '<meta property="og:image" content="https://playpoint-sim.com/ogp.png">' +
    '<meta property="og:image:type" content="image/png">' +
    '<meta name="twitter:image" content="https://playpoint-sim.com/ogp.png">' +
    '<script type="application/ld+json">{"@type":"Article","image":"https://playpoint-sim.com/ogp.png"}</script>' +
    '</head><body><article>本文</article></body></html>';
  const genericHtml = '<!doctype html><html><head>' +
    '<meta property="og:image" content="https://playpoint-sim.com/articles/ogp/example.png">' +
    '<meta name="twitter:image" content="https://playpoint-sim.com/articles/ogp/example.png">' +
    '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","image":{"@type":"ImageObject","url":"https://playpoint-sim.com/organization.png"}},{"@type":"Article","image":"https://playpoint-sim.com/articles/ogp/old.png"}]}</script>' +
    '</head><body><article>本文</article></body></html>';
  fs.writeFileSync(path.join(fixture, 'games/fgo/pity-cost/index.html'), gameHtml);
  fs.writeFileSync(path.join(fixture, 'articles/example.html'), genericHtml);
  fs.writeFileSync(path.join(fixture, 'blog/articles.json'), JSON.stringify([
    { id: 'fgo-pity-cost-2026', file: '../games/fgo/pity-cost/index.html', ogp: '../ogp.png', thumbnail: '../ogp.png' },
    { id: 'super-weekly-reward-prize-history', file: '../articles/example.html', ogp: '../articles/ogp/campaign.png', thumbnail: '../articles/ogp/example.png' }
  ], null, 2) + '\n');

  const first = syncArticleImageRoles(fixture);
  assert.equal(first.checked, 2);
  assert.equal(first.gameThumbnails, 1);
  assert.equal(first.genericThumbnails, 1);
  assert.equal(first.dedicatedOgp, 1);
  assert.equal(first.changedHtml, 2);

  const manifest = JSON.parse(fs.readFileSync(path.join(fixture, 'blog/articles.json'), 'utf8'));
  assert.equal(manifest[0].thumbnail, '../images/game-icons/fgo.webp');
  assert.equal(manifest[0].thumbnailKind, 'app-icon');
  assert.equal(manifest[0].ogp, '../articles/ogp/fgo-pity-cost-2026.png');
  assert.equal(manifest[1].thumbnail, '../articles/thumbnails/super-weekly-reward-prize-history-square-v1.webp');
  assert.equal(manifest[1].thumbnailKind, 'generic');
  assert.equal(manifest[1].ogp, '../articles/ogp/example.png');
  const gameAfter = fs.readFileSync(path.join(fixture, 'games/fgo/pity-cost/index.html'), 'utf8');
  assert.match(gameAfter, /property="og:image" content="https:\/\/playpoint-sim\.com\/articles\/ogp\/fgo-pity-cost-2026\.png"/);
  assert.match(gameAfter, /property="og:image:type" content="image\/jpeg"/);
  assert.match(gameAfter, /name="twitter:image" content="https:\/\/playpoint-sim\.com\/articles\/ogp\/fgo-pity-cost-2026\.png"/);
  assert.match(gameAfter, /"image":"https:\/\/playpoint-sim\.com\/articles\/ogp\/fgo-pity-cost-2026\.png"/);
  const genericAfter = fs.readFileSync(path.join(fixture, 'articles/example.html'), 'utf8');
  const genericSchema = JSON.parse(genericAfter.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const genericArticle = genericSchema['@graph'].find(node => node['@type'] === 'Article');
  const genericOrganization = genericSchema['@graph'].find(node => node['@type'] === 'Organization');
  assert.equal(genericArticle.image, 'https://playpoint-sim.com/articles/ogp/example.png');
  assert.equal(genericOrganization.image.url, 'https://playpoint-sim.com/organization.png');
  assert.equal(publicUrlForManifestPath(manifest[0].ogp), 'https://playpoint-sim.com/articles/ogp/fgo-pity-cost-2026.png');

  const second = syncArticleImageRoles(fixture);
  assert.equal(second.changedManifest, false);
  assert.equal(second.changedHtml, 0);
});

test('正方形一般サムネイルはカードの実寸属性も256四方になる', () => {
  const normalized = blogUtils.normalizeArticle({
    id: 'generic', title: '一般記事', file: '../articles/generic.html',
    thumbnail: '../articles/thumbnails/generic-square-v1.webp', thumbnailKind: 'generic', tags: []
  });
  const markup = blogUtils.articleCardMarkup(normalized, { first: true });
  assert.match(markup, /width="256" height="256"/);
  const icon = blogUtils.normalizeArticle({
    id: 'game', title: 'ゲーム記事', file: '../articles/game.html',
    thumbnail: '../images/game-icons/fgo.webp', thumbnailKind: 'app-icon', tags: []
  });
  assert.match(blogUtils.articleCardMarkup(icon, { first: true }), /width="96" height="96"/);
});
