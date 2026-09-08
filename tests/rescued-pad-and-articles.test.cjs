'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { getGamePageHtmlFiles } = require('../scripts/game-page-targets.cjs');
const { GAME_LOCALE_DIRECTORIES } = require('../scripts/locale-ids.cjs');

const root = path.resolve(__dirname, '..');

const RESCUED_ARTICLES = Object.freeze([
  {
    id: 'umamusume-half-anniversary-points',
    file: 'articles/2026-08-24-umamusume-half-anniversary-points.html',
    titleHint: 'ウマ娘'
  },
  {
    id: 'dokkan-battle-dragon-ball-play-points',
    file: 'articles/2026-08-25-dokkan-battle-dragon-ball-play-points.html',
    titleHint: 'ドッカン'
  },
  {
    id: 'pad-puzzle-and-dragons-play-points',
    file: 'articles/2026-08-25-pad-puzzle-and-dragons-play-points.html',
    titleHint: 'パズドラ'
  }
]);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function padPagePath(localeDirectory) {
  const prefix = localeDirectory ? `${localeDirectory}/` : '';
  return `${prefix}games/pad/index.html`;
}

test('PAD is published for every generated game locale and linked from each portal', () => {
  const generatedPages = new Set(getGamePageHtmlFiles(root));

  for (const localeDirectory of GAME_LOCALE_DIRECTORIES) {
    const page = padPagePath(localeDirectory);
    assert.equal(generatedPages.has(page), true, `${page} should be a discovered generated output`);

    const html = read(page);
    assert.match(html, /last-modified" content="\d{4}-\d{2}-\d{2}"/, `${page} should publish last-modified`);
    assert.match(html, /パズドラパス|Puzzle & Dragons|퍼즐앤드래곤|龍族拼圖/, `${page} should name PAD`);

    const prefix = localeDirectory ? `${localeDirectory}/` : '';
    const portal = read(`${prefix}games/index.html`);
    assert.match(portal, /href="\.\/pad\/"/, `${prefix}games/index.html should link to PAD`);
  }

  // Protect the user-visible preset rather than the generator's internal array syntax.
  const japanesePage = read('games/pad/index.html');
  assert.match(japanesePage, /data-amount="980"/);
  assert.match(japanesePage, /パズドラパス \(980円\)/);
});

test('the three rescued Japanese articles are listed and published without bulk #168 design classes', () => {
  const registry = JSON.parse(read('blog/articles.json'));
  assert.ok(Array.isArray(registry) && registry.length > 0, 'article registry should exist');

  for (const article of RESCUED_ARTICLES) {
    const entry = registry.find(item => item.id === article.id);
    assert.ok(entry, `blog/articles.json should list ${article.id}`);
    assert.equal(String(entry.file).replace(/^\.\.\//, ''), article.file);
    assert.match(String(entry.title), new RegExp(article.titleHint));

    assert.equal(fs.existsSync(path.join(root, article.file)), true, `${article.file} should exist`);
    const html = read(article.file);
    assert.match(html, /rel="author"/, `${article.file}: visible author link`);
    assert.match(
      html,
      /support\.google\.com\/googleplay|play\.google\.com\/store\/apps\/editorial/,
      `${article.file}: Google official source`
    );
    assert.match(
      html,
      /related-links-section|class="article-nav"/,
      `${article.file}: related links or previous/next nav`
    );
    assert.doesNotMatch(html, /btn-clean-shimmer|clean-accordion|pro-con-grid/, `${article.file}: #168 bulk design classes must not ship`);
  }
});

const DEDICATED_OGP_ARTICLES = Object.freeze([
  {
    id: 'umamusume-half-anniversary-points',
    file: 'articles/2026-08-24-umamusume-half-anniversary-points.html',
    ogp: 'articles/ogp/2026-08-24-umamusume-half-anniversary-points.png'
  },
  {
    id: 'dokkan-battle-dragon-ball-play-points',
    file: 'articles/2026-08-25-dokkan-battle-dragon-ball-play-points.html',
    ogp: 'articles/ogp/2026-08-25-dokkan-battle-dragon-ball-play-points.png'
  },
  {
    id: 'pad-puzzle-and-dragons-play-points',
    file: 'articles/2026-08-25-pad-puzzle-and-dragons-play-points.html',
    ogp: 'articles/ogp/2026-08-25-pad-puzzle-and-dragons-play-points.png'
  },
  {
    id: 'play-points-locked',
    file: 'articles/2026-08-19-play-points-locked.html',
    ogp: 'articles/ogp/2026-08-19-play-points-locked.png'
  },
  {
    id: 'install-offer-points-not-received',
    file: 'articles/2026-08-19-install-offer-points-not-received.html',
    ogp: 'articles/ogp/2026-08-19-install-offer-points-not-received.png'
  },
  {
    id: 'redeemed-item-not-received',
    file: 'articles/2026-08-19-redeemed-item-not-received.html',
    ogp: 'articles/ogp/2026-08-19-redeemed-item-not-received.png'
  },
  {
    id: 'web-store-external-billing-points',
    file: 'articles/2026-08-19-web-store-external-billing-points.html',
    ogp: 'articles/ogp/2026-08-19-web-store-external-billing-points.png'
  },
  {
    id: 'play-points-google-store',
    file: 'articles/2026-08-19-play-points-google-store.html',
    ogp: 'articles/ogp/2026-08-19-play-points-google-store.png'
  }
]);

test('救出記事と8月19日記事は専用JPEG実体のOGPを持ち、内容が重複しない', () => {
  const registry = JSON.parse(read('blog/articles.json'));
  const hashes = new Map();

  for (const article of DEDICATED_OGP_ARTICLES) {
    const absolute = path.join(root, article.ogp);
    assert.equal(fs.existsSync(absolute), true, `${article.ogp} should exist`);
    const buffer = fs.readFileSync(absolute);
    assert.ok(
      buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
      `${article.ogp} must be JPEG-backed for articles/ogp ForceType`
    );
    const digest = crypto.createHash('sha256').update(buffer).digest('hex');
    assert.equal(
      hashes.has(digest),
      false,
      `${article.ogp} duplicates ${hashes.get(digest) || ''}`
    );
    hashes.set(digest, article.ogp);

    const html = read(article.file);
    const publicUrl = `https://playpoint-sim.com/${article.ogp}`;
    assert.match(html, new RegExp(publicUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const entry = registry.find(item => item.id === article.id);
    assert.ok(entry, `${article.id} should be listed`);
    assert.equal(entry.thumbnail, `../${article.ogp}`);
  }
});
