'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function visibleText(fragment) {
  return String(fragment)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function anchorTextForHref(html, href) {
  const match = html.match(new RegExp(`<a\\b[^>]*\\bhref="${escapeRegExp(href)}"[^>]*>([\\s\\S]*?)<\\/a>`, 'i'));
  return match ? visibleText(match[1]) : null;
}

function anchorTextForHrefSuffix(html, suffix) {
  const match = html.match(new RegExp(`<a\\b[^>]*\\bhref="[^"]*${escapeRegExp(suffix)}"[^>]*>([\\s\\S]*?)<\\/a>`, 'i'));
  return match ? visibleText(match[1]) : null;
}

test('海外記事JSは日本語CTA・公式注記・日本語パンくずを差し込まない', () => {
  const source = read('blog/article.js');
  // This is an architecture/runtime ownership guard: article chrome is injected by
  // JavaScript, so the source boundary itself matters in addition to published HTML.
  assert.match(source, /Check this guide against your own numbers/);
  assert.match(source, /href: '\/en\/'/);
  assert.match(source, /listUrl: 'https:\/\/playpoint-sim\.com\/en\/articles\/'/);
  assert.match(source, /if \(getLocale\(\) !== 'ja'\) return;/);
  assert.ok(source.includes("list: 'Guides'"));
  assert.ok(source.includes("site: 'Google Play Points Calculator'"));
});

test('海外LPのGuidesは公開HTMLで各言語の記事一覧を指す', () => {
  const cases = [
    ['en/status/gold/index.html', '/en/articles/', 'Guides'],
    ['ko/status/gold/index.html', '/ko/articles/', '가이드'],
    ['tw/status/gold/index.html', '/tw/articles/', '指南']
  ];

  for (const [file, href, label] of cases) {
    const html = read(file);
    assert.equal(anchorTextForHref(html, href), label, `${file}: localized Guides link`);
    assert.notEqual(anchorTextForHref(html, '/blog/'), label, `${file}: must not fall back to Japanese blog`);
  }
});

test('フッターの法務リンクは公開HTMLで言語別の意味と日本語ページ注記を保つ', () => {
  const cases = [
    {
      file: 'status/gold/index.html',
      privacy: /プライバシ/,
      terms: /利用規約/,
      marker: null
    },
    {
      file: 'en/status/gold/index.html',
      privacy: /Privacy/i,
      terms: /Terms/i,
      marker: /\(Japanese\)/
    },
    {
      file: 'ko/status/gold/index.html',
      privacy: /개인정보/,
      terms: /약관/,
      marker: /\(일본어\)/
    },
    {
      file: 'tw/status/gold/index.html',
      privacy: /隱私/,
      terms: /條款/,
      marker: /\(日文\)/
    },
    {
      file: 'games/genshin/index.html',
      privacy: /プライバシ/,
      terms: /利用規約/,
      marker: null
    },
    {
      file: 'en/games/genshin/index.html',
      privacy: /Privacy/i,
      terms: /Terms/i,
      marker: /\(Japanese\)/
    }
  ];

  for (const { file, privacy, terms, marker } of cases) {
    const html = read(file);
    const privacyText = anchorTextForHrefSuffix(html, 'privacy.html');
    const termsText = anchorTextForHrefSuffix(html, 'terms.html');
    assert.ok(privacyText, `${file}: privacy link`);
    assert.ok(termsText, `${file}: terms link`);
    assert.match(privacyText, privacy, `${file}: privacy semantics`);
    assert.match(termsText, terms, `${file}: terms semantics`);
    if (marker) {
      assert.match(privacyText, marker, `${file}: privacy Japanese-only marker`);
      assert.match(termsText, marker, `${file}: terms Japanese-only marker`);
    }
  }
});

test('ゲーム計算機のコピー完了表示は言語別設定を利用する', () => {
  const sim = read('games/game-sim.js');
  // The simulator is an IIFE without an exported locale helper. Keep a narrow
  // wiring guard instead of restructuring production solely for testability.
  assert.match(sim, /copiedAlert: '✅ Copied!'/);
  assert.match(sim, /cfg\.copiedAlert/);
  assert.ok(!sim.includes("btnCopyLink.innerHTML = '<span>✅ コピー完了！</span>'"));
});

test('海外points-costの計算機リンクは各言語トップを指す', () => {
  const cases = [
    ['en/points-cost/index.html', '/en/', 'Level-up calculator'],
    ['ko/points-cost/index.html', '/ko/', '등급 달성 계산기'],
    ['tw/points-cost/index.html', '/tw/', '升級金額計算器']
  ];

  for (const [file, href, label] of cases) {
    const html = read(file);
    assert.equal(anchorTextForHref(html, href), label, `${file}: localized calculator link`);
    assert.notEqual(anchorTextForHref(html, '/'), label, `${file}: must not fall back to Japanese root`);
  }
});

function usRuntimeLinkText(configSource, key) {
  const usBlock = configSource.split("'US':")[1];
  assert.ok(usBlock, 'js/config.js US block is missing');
  const match = usBlock.match(new RegExp(`${key}: \\{ text: "([^"]+)"`));
  assert.ok(match, `js/config.js US ${key} is missing`);
  return match[1];
}

test('記事・LPの計算機判定は共通analytics境界へ集約し6地域を扱う', () => {
  const analytics = read('js/analytics-core.js');
  const article = read('blog/article.js');
  const intent = read('js/intent-tracking.js');

  for (const calculatorPath of ['/', '/en/', '/ko/', '/tw/', '/hk/', '/in/']) {
    assert.ok(analytics.includes(`'${calculatorPath}'`), `analytics core missing: ${calculatorPath}`);
  }
  // Deliberately static: the contract is that both callers use the shared
  // architecture boundary rather than reimplementing destination logic locally.
  assert.match(article, /analytics\.isCalculatorDestination\(url\)/);
  assert.match(intent, /analytics\.isCalculatorDestination\(url\)/);
  assert.doesNotMatch(article, /function isCalculatorDestination/);
  assert.doesNotMatch(intent, /function isCalculatorDestination/);
});

test('モバイル下部CTAの閉じる操作名は言語別で日本語固定にしない', () => {
  const source = read('blog/article.js');
  assert.ok(!source.includes('aria-label="閉じる"'));
  assert.match(source, /aria-label="\$\{fallbackUtils\.escapeHtml\(t\.closeAria\)\}"/);
  assert.match(source, /closeAria: '閉じる'/);
  assert.match(source, /closeAria: 'Close'/);
  assert.match(source, /closeAria: '닫기'/);
  assert.match(source, /closeAria: '關閉'/);
});

test('海外記事は日本語記事一覧JSONを取らず空の前後ナビを外す', () => {
  const source = read('blog/article.js');
  const init = source.slice(source.indexOf('async function init()'));
  const fetchAt = init.indexOf('fetch(CONFIG.articlesUrl)');
  assert.ok(fetchAt !== -1, 'articles.json fetch is missing');
  const beforeFetch = init.slice(0, fetchAt);
  // This is a network-boundary ordering guard. Turning article.js into a test-only
  // module just to expose init would increase production coupling more than it removes.
  assert.match(
    beforeFetch,
    /if \(getLocale\(\) !== 'ja'\) \{\s*const navContainer = document\.getElementById\('article-nav'\);\s*if \(navContainer\) navContainer\.remove\(\);\s*return;/
  );
  assert.ok(init.indexOf("if (getLocale() !== 'ja')") < fetchAt);
});

test('英語トップの法務・情報ラベルは日本語ページだと分かるランタイム表記と一致する', () => {
  const { createLocales } = require('../scripts/locale-config.cjs');
  const runtime = read('js/config.js');
  const homepage = read('en/index.html');
  const generated = createLocales().en.staticText;
  const markedKeys = ['linkPrivacy', 'linkTerms', 'linkQA', 'linkLatest', 'linkAuthor', 'linkKatakata'];

  for (const key of markedKeys) {
    const expected = usRuntimeLinkText(runtime, key);
    assert.match(expected, /\(Japanese\)/, `${key} runtime label must mark the Japanese-only page`);
    assert.equal(generated[key], expected, `locale-config.cjs en.${key} lags js/config.js`);
    assert.ok(
      homepage.includes(`data-lang-key="${key}">${expected}<`),
      `en/index.html baked ${key} lags js/config.js`
    );
  }
});

test('日本語ブログ一覧と祭記事フッターは英語のPrivacy/Termsを使わない', () => {
  for (const file of [
    'blog/index.html',
    'articles/2026-08-17-tgs-google-play-vip.html',
    'articles/2026-08-17-diamond-valley-festival-guide.html'
  ]) {
    const html = read(file);
    assert.ok(!html.includes('>Privacy</a>'), `${file}: English Privacy remains`);
    assert.ok(!html.includes('>Terms</a>'), `${file}: English Terms remains`);
    assert.ok(html.includes('>プライバシーポリシー</a>'), `${file}: Japanese privacy label missing`);
    assert.ok(html.includes('>利用規約</a>'), `${file}: Japanese terms label missing`);
  }
});
