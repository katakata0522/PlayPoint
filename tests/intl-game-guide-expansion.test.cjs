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

test('多言語ゲーム特集はSSOTの全ガイドを全ロケールへ一意に展開する', () => {
  const locales = Object.keys(LOCALES);
  assert.ok(ALL_GUIDES.length > 0, 'localized game guide catalog must not be empty');
  assert.deepEqual(locales.sort(), ['en', 'ko', 'tw']);
  assert.equal(new Set(ALL_GUIDES.map(guide => guide.slug)).size, ALL_GUIDES.length);
  const hrefs = locales.flatMap(locale => ALL_GUIDES.map(guide => hrefFor(locale, guide.slug)));
  assert.equal(hrefs.length, ALL_GUIDES.length * locales.length);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.equal(Object.keys(getLocalizedGameGuideJapaneseAlternates()).length, ALL_GUIDES.length);
});

test('SSOTの全多言語ゲーム記事がgame_decisionで公式Googleソースと相互hreflangを持つ', () => {
  for (const locale of Object.keys(LOCALES)) {
    assert.equal(getLocalizedGameGuideLinks(locale).length, ALL_GUIDES.length);
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

test('英語ゲーム特集のmeta descriptionは固定文字数で切らず、記事固有の説明を完結文で保持する', () => {
  const descriptions = [];
  for (const guide of ALL_GUIDES) {
    const html = renderGuide('en', guide);
    const description = (html.match(/<meta name="description" content="([^"]*)">/) || [])[1] || '';
    const expected = String(guide.content.en.market || '').replace(/\\s+/g, ' ').trim()
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    assert.ok(description.length > 0, guide.slug + ': description is required');
    assert.equal(description, expected, guide.slug + ': description must preserve the authored market summary without truncation');
    assert.match(description, /[.!?]$/, guide.slug + ': description must end as a complete sentence');
    assert.doesNotMatch(description, /^Region-aware game purchase guide\./, guide.slug + ': generic prefix wastes the snippet');
    descriptions.push(description);
  }
  assert.equal(new Set(descriptions).size, ALL_GUIDES.length, 'each English game guide must keep a distinct description');
});

test('多言語ゲーム特集のmeta descriptionは180文字を超えても固定上限で切らない', () => {
  const base = ALL_GUIDES[0];
  const longMarket = ('This intentionally long authored summary stays complete and is not cut by a fixed character limit. ').repeat(3).trim();
  const prefixes = {
    en: '',
    ko: '지역별 공식 조건을 확인하는 게임 결제 가이드. ',
    tw: '依地區官方條件整理的遊戲消費指南。'
  };

  for (const locale of Object.keys(LOCALES)) {
    const guide = {
      ...base,
      content: {
        ...base.content,
        [locale]: { ...base.content[locale], market: longMarket }
      }
    };
    const html = renderGuide(locale, guide);
    const description = (html.match(/<meta name="description" content="([^"]*)">/) || [])[1] || '';
    const expected = (prefixes[locale] + longMarket)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    assert.ok(description.length > 180, locale + ': regression fixture must exceed the old cap');
    assert.equal(description, expected, locale + ': description must preserve the complete authored summary');
  }
});

test('地域固有の価格・公式用語を日本語版から機械換算しない', () => {
  const bySlug = slug => ALL_GUIDES.find(guide => guide.slug === slug);

  const padEn = renderGuide('en', bySlug('puzzle-and-dragons-pass'));
  assert.match(padEn, /US\$8\.99/);
  assert.match(padEn, /not a converted Japanese ¥980 figure/);
  assert.doesNotMatch(padEn, /¥980\s*\/\s*month|monthly price[^<]{0,40}¥980/i);

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

test('生成入口は一時ディレクトリへSSOT全記事を再現できる', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-intl-games-'));
  try {
    const summary = writeLocalizedGameGuides(root);
    assert.equal(summary.checked, ALL_GUIDES.length * Object.keys(LOCALES).length);
    assert.equal(summary.changed, ALL_GUIDES.length * Object.keys(LOCALES).length);
    for (const locale of Object.keys(LOCALES)) {
      const files = fs.readdirSync(path.join(root, locale, 'articles')).filter(file => file.endsWith('.html'));
      assert.equal(files.length, ALL_GUIDES.length, locale);
    }
    const second = writeLocalizedGameGuides(root);
    assert.equal(second.changed, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
