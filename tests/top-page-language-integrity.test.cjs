'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const { createLocales } = require('../scripts/locale-config.cjs');
const { hasExplicitTargetMarker } = require('../scripts/navigation-source-map.cjs');
const { buildLocalizedHtml } = require('../scripts/language-page-builder.cjs');

const generatedLocaleCases = {
  en: {
    expectedWidget: 'Free widget',
    expectedFeedName: 'Google Play Points Calculator',
    expectedChartAria: 'Compare monthly recorded points only on this device.',
    forbiddenScripts: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Han}]/u
  },
  ko: {
    expectedWidget: '무료 위젯',
    expectedFeedName: 'Google Play Points 계산기',
    expectedChartAria: '월별 기록 포인트를 이 기기 안에서만 비교합니다.',
    forbiddenScripts: /[\p{Script=Hiragana}\p{Script=Katakana}]/u
  },
  tw: {
    expectedWidget: '免費小工具',
    expectedFeedName: 'Google Play Points 計算器',
    expectedChartAria: '只在此裝置上比較每月記錄的點數。',
    forbiddenScripts: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
  }
};

const trackedLocaleCases = {
  ...generatedLocaleCases,
  hk: {
    expectedWidget: '免費小工具',
    expectedFeedName: 'Google Play Points 計算器',
    expectedChartAria: '只在此裝置上比較每月記錄的點數。',
    forbiddenScripts: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
  },
  in: {
    expectedWidget: 'Free widget',
    expectedFeedName: 'Google Play Points Calculator',
    expectedChartAria: 'Compare monthly recorded points only on this device.',
    forbiddenScripts: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Han}]/u
  }
};

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getUserFacingSurface(html) {
  const withoutNonContent = html
    .replace(/<div\b(?=[^>]*\bclass=["'][^"']*\bregion-switch\b[^"']*["'])[^>]*>[\s\S]*?<\/div>/i, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ');

  const accessibilityText = Array.from(
    withoutNonContent.matchAll(/\b(?:alt|aria-label|placeholder|title)="([^"]*)"/gi),
    match => match[1]
  );
  const visibleText = withoutNonContent.replace(/<[^>]+>/g, ' ');
  return `${visibleText}\n${accessibilityText.join('\n')}`;
}

test('地域セレクタだけを属性追加に依存せず多言語混入監査から除外する', () => {
  const selector = '<div data-test="region" class="top region-switch compact" aria-label="Play country or region"><button>🇯🇵 日本</button><button>🇰🇷 대한민국</button><button>🇹🇼 台灣</button></div>';
  assert.equal(getUserFacingSurface(`${selector}<main>English only</main>`).match(trackedLocaleCases.en.forbiddenScripts), null);
  assert.notEqual(getUserFacingSurface('<main>English text 日本</main>').match(trackedLocaleCases.en.forbiddenScripts), null);
});

test('静的生成辞書は多言語フッターの全リンク文言を持つ', () => {
  const locales = createLocales('2026-08-06');
  const requiredFooterKeys = [
    'linkLatest',
    'linkQA',
    'linkAuthor',
    'linkWidget',
    'linkPrivacy',
    'linkTerms',
    'linkFeedback'
  ];

  for (const [langDir, config] of Object.entries(locales)) {
    for (const key of requiredFooterKeys) {
      assert.equal(typeof config.staticText[key], 'string', `${langDir}: missing staticText.${key}`);
      assert.ok(config.staticText[key].trim(), `${langDir}: empty staticText.${key}`);
    }
  }
});

test('多言語トップはJavaScript実行前からウィジェット名が翻訳されている', () => {
  const source = read('index.html');
  const locales = createLocales('2026-08-06');

  for (const [langDir, localeCase] of Object.entries(generatedLocaleCases)) {
    const generated = buildLocalizedHtml(source, langDir, locales[langDir]);
    const tracked = read(`${langDir}/index.html`);
    for (const [kind, html] of [['generated', generated], ['tracked', tracked]]) {
      assert.doesNotMatch(html, /guide-navigation\.(?:js|css)|guide-calculator-header/, `${langDir}: ${kind} excludes the Japanese-only menu`);
      const links = [...html.matchAll(/<a\b[^>]*data-lang-key="linkWidget"[^>]*>([^<]+)<\/a>/g)];
      assert.equal(links.length, 1, `${langDir}: ${kind} keeps one widget entry`);
      assert.ok(links[0][1].startsWith(localeCase.expectedWidget), `${langDir}: ${kind} widget name is localized`);
      assert.ok(hasExplicitTargetMarker(links[0][1], 'ja'), `${langDir}: ${kind} identifies the Japanese guide`);
    }
    assert.doesNotMatch(tracked, /data-lang-key="linkWidget">無料ウィジェット<\/a>/);
  }

  for (const langDir of ['hk', 'in']) {
    const localeCase = trackedLocaleCases[langDir];
    const tracked = read(`${langDir}/index.html`);
    const links = [...tracked.matchAll(/<a\b[^>]*data-lang-key="linkWidget"[^>]*>([^<]+)<\/a>/g)];
    assert.equal(links.length, 1, `${langDir}: tracked keeps one widget entry`);
    assert.ok(links[0][1].startsWith(localeCase.expectedWidget), `${langDir}: tracked widget name is localized`);
    assert.ok(hasExplicitTargetMarker(links[0][1], 'ja'), `${langDir}: tracked identifies the Japanese guide`);
  }
});

test('フィード名と年次グラフの読み上げ文言を各言語で静的生成する', () => {
  const source = read('index.html');
  const locales = createLocales('2026-08-06');

  for (const [langDir, localeCase] of Object.entries(generatedLocaleCases)) {
    const outputs = [
      ['generated', buildLocalizedHtml(source, langDir, locales[langDir])],
      ['tracked', read(`${langDir}/index.html`)]
    ];

    for (const [kind, html] of outputs) {
      assert.match(
        html,
        new RegExp(`type="application/rss\\+xml" title="${escapeRegex(localeCase.expectedFeedName)} RSS"`),
        `${langDir}: ${kind} RSS title is not localized`
      );
      assert.match(
        html,
        new RegExp(`type="application/atom\\+xml" title="${escapeRegex(localeCase.expectedFeedName)} Atom"`),
        `${langDir}: ${kind} Atom title is not localized`
      );
      assert.match(
        html,
        new RegExp(`<div id="diary-year-chart"[^>]*aria-label="${escapeRegex(localeCase.expectedChartAria)}"[^>]*data-lang-aria="yearlyChartDescription"`),
        `${langDir}: ${kind} year-chart aria label is not localized`
      );
    }
  }

  for (const langDir of ['hk', 'in']) {
    const localeCase = trackedLocaleCases[langDir];
    const html = read(`${langDir}/index.html`);
    assert.match(html, new RegExp(`type="application/rss\\+xml" title="${escapeRegex(localeCase.expectedFeedName)} RSS"`), `${langDir}: tracked RSS title`);
    assert.match(html, new RegExp(`type="application/atom\\+xml" title="${escapeRegex(localeCase.expectedFeedName)} Atom"`), `${langDir}: tracked Atom title`);
    assert.match(
      html,
      new RegExp(`<div id="diary-year-chart"[^>]*aria-label="${escapeRegex(localeCase.expectedChartAria)}"[^>]*data-lang-aria="yearlyChartDescription"`),
      `${langDir}: tracked year-chart aria label`
    );
  }
});

test('多言語トップの利用者向け静的文言へ別言語の文字が混入しない', () => {
  for (const [langDir, localeCase] of Object.entries(trackedLocaleCases)) {
    const surface = getUserFacingSurface(read(`${langDir}/index.html`));
    const match = surface.match(localeCase.forbiddenScripts);
    assert.equal(match, null, `${langDir}: foreign-script character remains: ${match && match[0]}`);
  }

  const japaneseSurface = getUserFacingSurface(read('index.html'));
  const hangul = japaneseSurface.match(/[\p{Script=Hangul}]/u);
  assert.equal(hangul, null, `ja: Hangul remains: ${hangul && hangul[0]}`);
});
