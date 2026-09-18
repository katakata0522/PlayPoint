'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const { createLocales } = require('../scripts/locale-config.cjs');

const CALCULATOR_TOP_PAGES = Object.freeze([
  'index.html',
  'en/index.html',
  'ko/index.html',
  'tw/index.html',
  'hk/index.html',
  'in/index.html'
]);

const JAPANESE_ONLY_DESTINATION_MARKERS = Object.freeze({
  'en/index.html': { latest: '🆕 Latest Hub (Japanese)', lab: '🧪 KatakataLab (Japanese)' },
  'ko/index.html': { latest: '🆕 최신 정보 허브 (일본어)', lab: '🧪 KatakataLab (일본어)' },
  'tw/index.html': { latest: '🆕 最新資訊中心 (日文)', lab: '🧪 KatakataLab (日文)' },
  'hk/index.html': { latest: '🆕 最新資訊中心 (日文)', lab: '🧪 KatakataLab (日文)' },
  'in/index.html': { latest: '🆕 Latest Hub (Japanese)', lab: '🧪 KatakataLab (Japanese)' }
});

test('international calculator top pages mark Japanese-only destinations in their own language', () => {
  for (const [file, expected] of Object.entries(JAPANESE_ONLY_DESTINATION_MARKERS)) {
    const html = read(file);
    assert.ok(html.includes(`>${expected.latest}</a>`), `${file}: latest Japanese-only marker`);
    assert.ok(html.includes(`>${expected.lab}</a>`), `${file}: KatakataLab Japanese-only marker`);
  }
});

test('localized top-page source copy is natural before post-generation normalization', () => {
  const locales = createLocales();

  assert.equal(locales.en.staticText.tabDiary, '🎁 Log weekly');
  assert.equal(locales.en.staticText.sectionTitleDiary, 'Weekly Rewards Diary');
  assert.ok(!read('en/index.html').includes('Weekly Awards Diary'));

  assert.equal(locales.ko.title, 'Google Play Points 계산기 | 다음 등급까지 얼마가 필요할까?');
  assert.equal(locales.ko.staticText.linkLatest, '🆕 최신 정보 허브 (일본어)');
  assert.equal(locales.ko.staticText.linkKatakata, '🧪 KatakataLab (일본어)');
  assert.ok(!read('ko/index.html').includes('등급 업까지 얼마 남았지?'));

  assert.equal(locales.tw.staticText.tabReverse, '這筆消費有幾點？');
  assert.equal(locales.tw.staticText.sectionTitleReverse, '反推模式');
  assert.equal(locales.tw.staticText.linkLatest, '🆕 最新資訊中心 (日文)');
  assert.equal(locales.tw.staticText.linkKatakata, '🧪 KatakataLab (日文)');
  assert.ok(!read('tw/index.html').includes('逆算模式'));
  assert.equal(locales.en.staticText.lastCalculationReuse, 'Use last values');
  assert.equal(locales.ko.staticText.lastCalculationReuse, '지난번 조건 사용');
  assert.equal(locales.tw.staticText.lastCalculationReuse, '使用上次條件');
});

test('Taiwan copy sources do not reintroduce mainland-oriented troubleshooting wording', () => {
  for (const file of [
    'scripts/intl-guide-taxonomy.cjs',
    'scripts/intl-article-layout.cjs',
    'scripts/intl-seo-pages.cjs',
    'scripts/intl-author-pages.cjs'
  ]) {
    assert.ok(!read(file).includes('問題排查'), `${file}: 問題排查 remains in the canonical source`);
  }
});

test('Japanese changelog names the Taiwan locale as Traditional Chinese', () => {
  const html = read('changelog.html');
  assert.ok(!html.includes('台湾語（/tw/）'));
  assert.ok(html.includes('繁体字中国語（/tw/）'));
  assert.ok(!html.includes('UI言語（日・英・韓・台）'));
  assert.ok(html.includes('UI言語（日本語・英語・韓国語・繁体字中国語）'));
});

test('obsolete English language suggestion banner markup is not shipped on calculator top pages', () => {
  for (const file of CALCULATOR_TOP_PAGES) {
    const html = read(file);
    assert.ok(!html.includes('language-suggestion-banner'), `${file}: legacy language banner container remains`);
    assert.ok(!html.includes('English version is available!'), `${file}: legacy English banner copy remains`);
    assert.ok(!html.includes('Switch to English'), `${file}: legacy English banner action remains`);
  }
});
