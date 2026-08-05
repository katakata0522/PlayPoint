'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { MANUAL_INTL_ARTICLE_FILES } = require('../scripts/manual-intl-articles.cjs');

const ROOT = path.resolve(__dirname, '..');
const UPDATED_AT = '2026-08-05';

const JP_P1 = [
  'articles/2026-07-31-super-weekly-reward.html',
  'articles/2026-07-24-earn-play-points-free.html',
  'articles/2026-06-20-discount-gift-cards.html',
  'articles/2025-12-25-new-year-campaign.html',
  'articles/2025-12-25-diamond-vip.html',
];

const INTL_TOPICS = [
  'google-play-points-earn-free.html',
  'google-play-points-super-weekly-reward.html',
  'google-play-points-platinum-diamond-cost.html',
  'google-play-points-country-differences.html',
  '2026-06-20-discount-gift-cards.html',
];
const INTL_P1 = ['en', 'ko', 'tw'].flatMap(locale =>
  INTL_TOPICS.map(file => `${locale}/articles/${file}`)
);
const ALL_P1 = [...JP_P1, ...INTL_P1];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assertIncludesAll(html, fragments, label) {
  for (const fragment of fragments) {
    assert.ok(html.includes(fragment), `${label}: missing ${fragment}`);
  }
}

function assertExcludesAll(html, fragments, label) {
  for (const fragment of fragments) {
    assert.ok(!html.includes(fragment), `${label}: must not contain ${fragment}`);
  }
}

function assertMatchesAll(html, patterns, label) {
  for (const pattern of patterns) {
    assert.match(html, pattern, `${label}: missing required meaning ${pattern}`);
  }
}

test('all quality-audit P1 article files exist', () => {
  for (const relativePath of ALL_P1) {
    assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `missing P1 article: ${relativePath}`);
  }
  assert.equal(ALL_P1.length, 20);
});

test('all international P1 articles are protected as canonical manual content', () => {
  const protectedFiles = new Set(MANUAL_INTL_ARTICLE_FILES);
  for (const relativePath of INTL_P1) {
    assert.ok(protectedFiles.has(relativePath), `manual article protection missing: ${relativePath}`);
  }
});

test('international P1 articles share a validated audit update date', () => {
  for (const relativePath of INTL_P1) {
    const html = read(relativePath);
    assert.match(
      html,
      new RegExp(`<meta name="last-modified" content="${UPDATED_AT}"\\s*/?>`),
      `${relativePath}: last-modified is not ${UPDATED_AT}`
    );
    assert.equal(
      (html.match(new RegExp(`"dateModified"\\s*:\\s*"${UPDATED_AT}"`, 'g')) || []).length,
      1,
      `${relativePath}: expected exactly one dateModified ${UPDATED_AT}`
    );
    const published = html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
    assert.ok(published, `${relativePath}: datePublished is missing`);
    assert.ok(published[1] <= UPDATED_AT, `${relativePath}: published date is later than modified date`);
  }
});

test('Super Weekly Prize pages retain the verified ticket and eligibility boundaries', () => {
  const expectations = new Map([
    [
      'articles/2026-07-31-super-weekly-reward.html',
      [/30日/, /90日/, /保持できない|保持されない|残りません/, /アカウント/],
    ],
    [
      'en/articles/google-play-points-super-weekly-reward.html',
      [/30 days/i, /90 days/i, /do not keep|did not keep|not kept|does not keep/i, /account/i],
    ],
    [
      'ko/articles/google-play-points-super-weekly-reward.html',
      [/30일/, /90일/, /유지되지|유지할 수 없|포기/, /계정/],
    ],
    [
      'tw/articles/google-play-points-super-weekly-reward.html',
      [/30 天/, /90 天/, /不會保留|不能保留|放棄原本/, /帳號/],
    ],
  ]);

  for (const [relativePath, patterns] of expectations) {
    assertMatchesAll(read(relativePath), patterns, relativePath);
  }
});

test('gift-card discount guides use authorized regional rules instead of a permanent seller ranking', () => {
  const expectations = new Map([
    ['articles/2026-06-20-discount-gift-cards.html', [/正規/, /国/, /通貨/]],
    ['en/articles/2026-06-20-discount-gift-cards.html', [/authori[sz]ed/i, /country/i, /currency/i]],
    ['ko/articles/2026-06-20-discount-gift-cards.html', [/공인|공식/, /국가/, /통화/]],
    ['tw/articles/2026-06-20-discount-gift-cards.html', [/官方|授權/, /國家/, /幣別|貨幣/]],
  ]);

  for (const [relativePath, patterns] of expectations) {
    assertMatchesAll(read(relativePath), patterns, relativePath);
  }

  const jp = read('articles/2026-06-20-discount-gift-cards.html');
  const description = jp.match(/<meta name="description" content="([^"]+)"\s*\/?>/);
  assert.ok(description, 'Japanese gift-card meta description is missing');
  assertExcludesAll(description[1], ['楽天市場', 'コンビニ'], 'Japanese gift-card metadata');
  assertIncludesAll(
    read('tw/articles/2026-06-20-discount-gift-cards.html'),
    ['台灣', '未列出'],
    'Taiwan gift-card availability warning'
  );
});

test('free-benefit guides separate no-new-purchase benefits from planned purchases', () => {
  const pages = [
    'articles/2026-07-24-earn-play-points-free.html',
    'en/articles/google-play-points-earn-free.html',
    'ko/articles/google-play-points-earn-free.html',
    'tw/articles/google-play-points-earn-free.html',
  ];
  for (const relativePath of pages) {
    const html = read(relativePath);
    assert.match(html, /予定購入|planned purchase|예정 결제|原定消費/, `${relativePath}: planned-purchase framing is missing`);
    assert.match(html, /週次|weekly|주간|每週/, `${relativePath}: weekly benefit route is missing`);
    assert.match(html, /クエスト|quest|퀘스트|任務/i, `${relativePath}: quest route is missing`);
  }
  const combined = pages.map(read).join('\n');
  assertExcludesAll(combined, ['無理な課金', '不要な購入', '無料という言葉のために支出', '무료라는 말 때문에 지출', '不要為了免費點數增加不必要消費'], 'free-benefit guides');
});

test('regional Platinum and Diamond pages expose official thresholds in the title and first screen', () => {
  const expectations = new Map([
    ['en/articles/google-play-points-platinum-diamond-cost.html', ['US', '3,000', '10,000']],
    ['ko/articles/google-play-points-platinum-diamond-cost.html', ['한국', '2,400', '15,000']],
    ['tw/articles/google-play-points-platinum-diamond-cost.html', ['台灣', '4,000', '15,000']],
  ]);
  for (const [relativePath, fragments] of expectations) {
    const html = read(relativePath);
    const titleAndHero = `${html.match(/<title>([^<]+)<\/title>/)?.[1] || ''}\n${html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] || ''}`;
    assertIncludesAll(titleAndHero, fragments, relativePath);
  }
});

test('country-difference pages are hubs for local level and country-change guides', () => {
  for (const locale of ['en', 'ko', 'tw']) {
    const relativePath = `${locale}/articles/google-play-points-country-differences.html`;
    const html = read(relativePath);
    assert.ok(html.includes(`/${locale}/articles/google-play-points-levels.html`), `${relativePath}: local levels link missing`);
    assert.ok(html.includes(`/${locale}/articles/google-play-points-country-change.html`), `${relativePath}: country-change link missing`);
    assert.ok(html.includes(`/${locale}/articles/google-play-points-platinum-diamond-cost.html`), `${relativePath}: upper-level guide link missing`);
  }
});

test('Japanese seasonal and Diamond guides preserve the new editorial framing', () => {
  const seasonal = read('articles/2025-12-25-new-year-campaign.html');
  assertIncludesAll(seasonal, ['予定購入', '期限', '倍率'], 'New Year campaign guide');
  assertExcludesAll(seasonal, ['無理な課金', '不要な購入', '使いすぎ'], 'New Year campaign guide');

  const diamond = read('articles/2025-12-25-diamond-vip.html');
  assertIncludesAll(diamond, ['ダイヤ固有', 'プラチナと共通', 'アカウント'], 'Diamond benefit guide');
  assertExcludesAll(diamond, ['反論シリーズ', '無理にダイヤ', '不要な購入'], 'Diamond benefit guide');
});
