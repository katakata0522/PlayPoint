'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  CATEGORY_KEYS,
  getIntlGuideCategory,
  getStartHereHrefs
} = require('../scripts/intl-guide-taxonomy.cjs');
const {
  extractHubLinks,
  renderHubBody
} = require('../scripts/intl-hub-discovery.cjs');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function getArticleContent(html) {
  const match = html.match(/<article class="content">([\s\S]*?)<\/article>/);
  assert.ok(match, 'international hub article content is missing');
  return match[1];
}

test('international guide taxonomy keeps known ambiguous guides in one SSOT category', () => {
  assert.equal(getIntlGuideCategory('/en/articles/google-play-points-use-coupons.html'), 'earn');
  assert.equal(getIntlGuideCategory('/en/articles/google-play-quests.html'), 'earn');
  assert.equal(getIntlGuideCategory('/en/articles/google-play-points-device-change.html'), 'account');
  assert.equal(getIntlGuideCategory('/en/articles/google-play-balance-combine-payment.html'), 'earn');
  assert.equal(getIntlGuideCategory('/en/articles/google-play-games-vs-play-points.html'), 'account');
  assert.equal(getIntlGuideCategory('/en/articles/google-play-points-levels.html'), 'levels');
  assert.equal(getIntlGuideCategory('/en/articles/google-play-points-not-showing.html'), 'troubleshooting');
  assert.equal(getIntlGuideCategory('/en/articles/google-play-points-coupon-not-applied.html'), 'troubleshooting');
});

test('hub title extraction decodes entities once and rejects embedded markup', () => {
  const source = [
    '<ul>',
    '<li><a href="/en/articles/google-play-points-use-coupons.html">Safe &amp;lt;script&gt; title</a></li>',
    '<li><a href="/en/articles/google-play-quests.html"><script>alert(1)</script>Quest guide</a></li>',
    '</ul>'
  ].join('');

  const links = extractHubLinks(source);
  assert.equal(links.length, 1);
  assert.equal(links[0].title, 'Safe &lt;script> title');

  const rendered = renderHubBody('en', links);
  assert.doesNotMatch(rendered, /<script>/i);
  assert.match(rendered, /&amp;lt;script&gt;/);
});

test('EN/KO/TW hubs provide five curated starts plus searchable category cards', () => {
  for (const locale of ['en', 'ko', 'tw']) {
    const html = read(`${locale}/articles/index.html`);
    const content = getArticleContent(html);

    assert.match(html, /\/articles\/intl-hub\.css\?v=[a-z0-9_-]+/i);
    assert.match(html, /\/js\/intl-guide-hub\.js\?v=[a-z0-9_-]+/i);
    assert.match(content, /data-guide-search/);
    assert.match(content, /data-guide-filter="all"/);
    assert.doesNotMatch(content, /class="section related-links-section"/);

    const startMatch = content.match(/<div class="intl-guide-start-grid">([\s\S]*?)<\/div>\s*<\/section>/);
    assert.ok(startMatch, `${locale}: curated start grid is missing`);
    const featuredCount = (startMatch[1].match(/intl-guide-card--featured/g) || []).length;
    assert.equal(featuredCount, 5, `${locale}: Start here must stay at five guides`);

    const allCards = [...content.matchAll(/data-guide-card data-category="([^"]+)"/g)].map(match => match[1]);
    assert.ok(allCards.length >= 20, `${locale}: searchable catalog is unexpectedly small`);
    for (const category of allCards) assert.ok(CATEGORY_KEYS.includes(category), `${locale}: unknown category ${category}`);

    for (const category of CATEGORY_KEYS) {
      assert.match(content, new RegExp(`data-guide-filter="${category}"`), `${locale}: missing ${category} filter`);
    }

    for (const href of getStartHereHrefs(locale)) {
      assert.ok(content.includes(`href="${href}"`), `${locale}: curated start link missing ${href}`);
    }
  }
});

test('hub anchors and article active navigation share the taxonomy categories', () => {
  const enHub = read('en/articles/index.html');
  assert.match(enHub, /id="intl-hub-account"[^>]*data-guide-filter="account"/);
  assert.match(enHub, /id="intl-hub-earn"[^>]*data-guide-filter="earn"/);
  assert.match(enHub, /id="intl-hub-levels"[^>]*data-guide-filter="levels"/);
  assert.match(enHub, /id="intl-hub-trouble"[^>]*data-guide-filter="troubleshooting"/);

  const coupons = read('en/articles/google-play-points-use-coupons.html');
  assert.match(coupons, /class="nav-item active" href="\/en\/articles\/#intl-hub-earn"/);
  const missing = read('en/articles/google-play-points-not-showing.html');
  assert.match(missing, /class="nav-item active" href="\/en\/articles\/#intl-hub-trouble"/);
});
