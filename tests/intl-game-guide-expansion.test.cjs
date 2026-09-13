'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  ALL_GUIDES,
  LOCALES,
  getLocalizedGameGuideLinks,
  getLocalizedGameGuideJapaneseAlternates,
  hrefFor,
  isLocalizedGameGuideArticlePath,
  renderGuide,
  writeLocalizedGameGuides
} = require('../scripts/intl-game-guide-expansion.cjs');
const { classifyArticleRole } = require('../scripts/article-role-registry.cjs');

test('多言語ゲーム特集は17本×3言語を一意に持つ', () => {
  assert.equal(ALL_GUIDES.length, 17);
  assert.deepEqual(Object.keys(LOCALES).sort(), ['en', 'ko', 'tw']);
  assert.equal(new Set(ALL_GUIDES.map(guide => guide.slug)).size, 17);
  const hrefs = Object.keys(LOCALES).flatMap(locale => ALL_GUIDES.map(guide => hrefFor(locale, guide.slug)));
  assert.equal(hrefs.length, 51);
  assert.equal(new Set(hrefs).size, 51);
  assert.equal(Object.keys(getLocalizedGameGuideJapaneseAlternates()).length, 17);
});

test('51記事すべてがgame_decisionで公式Googleソースと相互hreflangを持つ', () => {
  for (const locale of Object.keys(LOCALES)) {
    assert.equal(getLocalizedGameGuideLinks(locale).length, 17);
    for (const guide of ALL_GUIDES) {
      const relative = `${locale}/articles/${guide.slug}.html`;
      const html = renderGuide(locale, guide);
      assert.equal(isLocalizedGameGuideArticlePath(relative), true, relative);
      assert.equal(classifyArticleRole(relative), 'game_decision', relative);
      assert.match(html, /<main id="main-content" class="main-card">/);
      assert.match(html, /support\.google\.com\/googleplay\/answer\/9077192/);
      assert.match(html, /support\.google\.com\/googleplay\/answer\/9080348/);
      assert.ok(html.includes(guide.source[1]), `${relative}: game official source`);
      assert.ok(html.includes(`hreflang="ja" href="https://playpoint-sim.com${guide.jaPath}"`), `${relative}: ja hreflang`);
      assert.ok(html.includes(`hreflang="en" href="https://playpoint-sim.com${hrefFor('en', guide.slug)}"`), `${relative}: en hreflang`);
      assert.ok(html.includes(`hreflang="ko" href="https://playpoint-sim.com${hrefFor('ko', guide.slug)}"`), `${relative}: ko hreflang`);
      assert.ok(html.includes(`hreflang="zh-TW" href="https://playpoint-sim.com${hrefFor('tw', guide.slug)}"`), `${relative}: tw hreflang`);
    }
  }
});

test('地域固有の価格・公式用語を日本語版から機械換算しない', () => {
  const bySlug = slug => ALL_GUIDES.find(guide => guide.slug === slug);

  const padEn = renderGuide('en', bySlug('puzzle-and-dragons-pass'));
  assert.match(padEn, /US\$8\.99/);
  assert.doesNotMatch(padEn, /¥980/);

  const monstTw = renderGuide('tw', bySlug('monster-strike-google-play-vs-web-shop'));
  assert.match(monstTw, /NT\$620/);
  assert.match(monstTw, /怪彈點數/);

  const hbrTw = renderGuide('tw', bySlug('heaven-burns-red-google-play-vs-web-shop'));
  assert.match(hbrTw, /台灣、香港、澳門/);
  assert.match(hbrTw, /5% OFF/);

  const genshinKo = renderGuide('ko', bySlug('genshin-welkin-moon-play-points'));
  assert.match(genshinKo, /공월 축복/);
  assert.match(genshinKo, /창세의 결정/);

  const genshinTw = renderGuide('tw', bySlug('genshin-welkin-moon-play-points'));
  assert.match(genshinTw, /空月祝福/);
  assert.match(genshinTw, /創世結晶/);

  const umaEn = renderGuide('en', bySlug('umamusume-umasuku-google-play-vs-webstore'));
  assert.match(umaEn, /Japan-version/);
  assert.doesNotMatch(umaEn, /US\$9\.80|US\$6\./);
});

test('生成入口は一時ディレクトリへ51記事を再現できる', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-intl-games-'));
  try {
    const summary = writeLocalizedGameGuides(root);
    assert.equal(summary.checked, 51);
    assert.equal(summary.changed, 51);
    for (const locale of Object.keys(LOCALES)) {
      const files = fs.readdirSync(path.join(root, locale, 'articles')).filter(file => file.endsWith('.html'));
      assert.equal(files.length, 17, locale);
    }
    const second = writeLocalizedGameGuides(root);
    assert.equal(second.changed, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
