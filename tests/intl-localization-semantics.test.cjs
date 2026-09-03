'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { PAGE_TYPES } = require('../scripts/intl-seo-content.cjs');
const {
  STATUS_PAGE_QUERIES
} = require('../scripts/intl-localization-normalize.cjs');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function collectHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(absolutePath);
    return entry.isFile() && entry.name.endsWith('.html') ? [absolutePath] : [];
  });
}

// 同じ検索意図でも、現在等級と不足ポイントは各地域の公式進行条件に合わせて固定する。
test('国際ランク・キャンペーンLPは地域別の現在等級と不足ポイントを引き継ぐ', () => {
  for (const [pageKey, localeQueries] of Object.entries(STATUS_PAGE_QUERIES)) {
    const page = PAGE_TYPES[pageKey];
    assert.ok(page, `missing PAGE_TYPES.${pageKey}`);
    for (const [localeKey, query] of Object.entries(localeQueries)) {
      const html = read(`${localeKey}/${page.slug}/index.html`);
      assert.ok(
        html.includes(`href="/${localeKey}/?mode=main&${query}"`),
        `${localeKey}/${page.slug}: localized calculator preset is stale`
      );
    }
  }
});

test('2x・3xページは倍率ではなく最終特別獲得率を比較する意味をタイトルにも残す', () => {
  const expectations = {
    en: /Final earn rate/,
    ko: /최종 적립률/,
    tw: /最終獲點率/
  };
  for (const slug of ['campaign/2x', 'campaign/3x']) {
    for (const [localeKey, pattern] of Object.entries(expectations)) {
      const html = read(`${localeKey}/${slug}/index.html`);
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
      assert.match(title, pattern, `${localeKey}/${slug}: title must clarify final earn rate semantics`);
    }
  }
});

test('韓国・台湾の生成SEO LPは補助ラベルまで現地語にする', () => {
  for (const page of Object.values(PAGE_TYPES)) {
    const ko = read(`ko/${page.slug}/index.html`);
    assert.ok(ko.includes('aria-label="사이트 링크"'), `ko/${page.slug}: localized site-links aria missing`);
    assert.ok(ko.includes('aria-label="페이지 요약"'), `ko/${page.slug}: localized summary aria missing`);
    assert.ok(!ko.includes('aria-label="Site links"'), `ko/${page.slug}: English aria leaked`);
    assert.ok(!ko.includes('aria-label="Page summary"'), `ko/${page.slug}: English aria leaked`);

    const tw = read(`tw/${page.slug}/index.html`);
    assert.ok(tw.includes('aria-label="網站連結"'), `tw/${page.slug}: localized site-links aria missing`);
    assert.ok(tw.includes('aria-label="頁面摘要"'), `tw/${page.slug}: localized summary aria missing`);
    assert.ok(!tw.includes('aria-label="Site links"'), `tw/${page.slug}: English aria leaked`);
    assert.ok(!tw.includes('aria-label="Page summary"'), `tw/${page.slug}: English aria leaked`);
  }
});

test('韓国トップと台湾トップは自然な地域表現を静的HTMLと実行時の両方で維持する', () => {
  const ko = read('ko/index.html');
  assert.match(ko, /다음 등급까지 얼마가 필요할까\?/);
  assert.doesNotMatch(ko, /등급 업까지 얼마 남았지/);
  assert.match(ko, /js\/intl-copy-overrides\.js/);

  const tw = read('tw/index.html');
  assert.match(tw, /反推模式/);
  assert.doesNotMatch(tw, /逆算模式/);
  assert.match(tw, /js\/intl-copy-overrides\.js/);

  const runtime = read('js/intl-copy-overrides.js');
  assert.match(runtime, /다음 등급까지 얼마가 필요할까\?/);
  assert.match(runtime, /反推模式/);
});

test('台湾公開HTMLでは問題解決カテゴリを「問題排解」に統一する', () => {
  const files = collectHtmlFiles(path.join(root, 'tw'));
  assert.ok(files.length > 0, 'Taiwan HTML corpus is empty');
  for (const absolutePath of files) {
    const relativePath = path.relative(root, absolutePath).replaceAll('\\', '/');
    const html = fs.readFileSync(absolutePath, 'utf8');
    assert.ok(!html.includes('問題排查'), `${relativePath}: mainland-oriented troubleshooting label remains`);
  }
});

test('現金化記事の小さな語感ずれを各言語で戻さない', () => {
  const ko = read('ko/articles/google-play-points-cash-conversion.html');
  assert.match(ko, /현금 전환/);
  assert.match(ko, /은행 계좌·전자지갑 출금/);
  assert.doesNotMatch(ko, /현금 환전/);
  assert.doesNotMatch(ko, /은행·간편결제 출금/);

  const en = read('en/articles/google-play-points-cash-conversion.html');
  assert.match(en, /the practical value of 100 Play Points/);
  assert.doesNotMatch(en, /what 100 Play Points can be worth to use/);
});
