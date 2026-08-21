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
