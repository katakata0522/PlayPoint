'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('海外記事JSは日本語CTA・公式注記・日本語パンくずを差し込まない', () => {
  const source = read('blog/article.js');
  assert.match(source, /Check this guide against your own numbers/);
  assert.match(source, /href: '\/en\/'/);
  assert.match(source, /listUrl: 'https:\/\/playpoint-sim\.com\/en\/articles\/'/);
  assert.match(source, /if \(getLocale\(\) !== 'ja'\) return;/);
  assert.ok(source.includes("list: 'Guides'"));
  assert.ok(source.includes("site: 'Google Play Points Calculator'"));
});

test('海外LPのGuidesは各言語の記事一覧を指す', () => {
  const generator = read('scripts/intl-seo-pages.cjs');
  assert.match(generator, /href="\/\$\{localeKey\}\/articles\/"/);
  assert.ok(!generator.includes('href="/blog/">${escapeHtml(locale.blog)}</a>'));
  assert.ok(read('en/status/gold/index.html').includes('href="/en/articles/">Guides</a>'));
  assert.ok(read('ko/status/gold/index.html').includes('href="/ko/articles/">가이드</a>'));
  assert.ok(read('tw/status/gold/index.html').includes('href="/tw/articles/">指南</a>'));
  assert.ok(!read('en/status/gold/index.html').includes('href="/blog/">Guides</a>'));
});

test('フッターの法務ラベルは言語別に出し日本語ページだと分かる', () => {
  const generator = read('scripts/generate-game-simulators.cjs');
  assert.match(generator, /privacyLabel:/);
  assert.match(generator, /termsLabel:/);
  assert.match(generator, /\$\{loc\.privacyLabel\}/);
  assert.match(generator, /\$\{loc\.termsLabel\}/);
  assert.match(read('scripts/insert-lp-footers.cjs'), /\$\{d\.privacyLabel\}/);
  assert.match(read('scripts/intl-seo-pages.cjs'), /locale\.privacyLabel/);

  assert.ok(read('status/gold/index.html').includes('>プライバシーポリシー</a>'));
  assert.ok(read('en/status/gold/index.html').includes('>Privacy Policy (Japanese)</a>'));
  assert.ok(read('ko/status/gold/index.html').includes('>개인정보처리방침 (일본어)</a>'));
  assert.ok(read('tw/status/gold/index.html').includes('>隱私權政策 (日文)</a>'));
  assert.ok(read('en/games/genshin/index.html').includes('>Privacy Policy (Japanese)</a>'));
  assert.ok(read('games/genshin/index.html').includes('>プライバシーポリシー</a>'));
});

test('ゲーム計算機のコピー完了表示は言語別', () => {
  const sim = read('games/game-sim.js');
  assert.match(sim, /copiedAlert: '✅ Copied!'/);
  assert.match(sim, /cfg\.copiedAlert/);
  assert.ok(!sim.includes("btnCopyLink.innerHTML = '<span>✅ コピー完了！</span>'"));
});

test('海外points-costの計算機リンクは各言語トップを指す', () => {
  assert.ok(read('en/points-cost/index.html').includes('<a href="/en/">Level-up calculator</a>'));
  assert.ok(read('ko/points-cost/index.html').includes('<a href="/ko/">등급 달성 계산기</a>'));
  assert.ok(read('tw/points-cost/index.html').includes('<a href="/tw/">升級金額計算器</a>'));
  assert.ok(!read('en/points-cost/index.html').includes('<a href="/">Level-up calculator</a>'));
  assert.ok(!read('ko/points-cost/index.html').includes('<a href="/">등급 달성 계산기</a>'));
  assert.ok(!read('tw/points-cost/index.html').includes('<a href="/">升級金額計算器</a>'));
});

function calculatorRootLiteral(source) {
  const match = source.match(/\[\s*'\/'\s*,\s*'\/en\/'\s*,\s*'\/ko\/'\s*,\s*'\/tw\/'\s*\]/);
  assert.ok(match, 'locale calculator roots are missing');
  return match[0].replace(/\s+/g, '');
}

function usRuntimeLinkText(configSource, key) {
  const usBlock = configSource.split("'US':")[1];
  assert.ok(usBlock, 'js/config.js US block is missing');
  const match = usBlock.match(new RegExp(`${key}: \\{ text: "([^"]+)"`));
  assert.ok(match, `js/config.js US ${key} is missing`);
  return match[1];
}

test('記事から計算機への計測は各言語トップをJAトップと同じ扱いにする', () => {
  const article = read('blog/article.js');
  const intent = read('js/intent-tracking.js');
  assert.ok(!article.includes("url.pathname !== '/'"));
  assert.match(article, /!isCalculatorDestination\(url\)/);
  assert.equal(calculatorRootLiteral(article), calculatorRootLiteral(intent));
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
