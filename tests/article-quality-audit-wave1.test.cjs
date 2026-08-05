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
    assert.ok(
      html.includes(`<meta name="last-modified" content="${UPDATED_AT}">`),
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
  const pages = [
    'articles/2026-07-31-super-weekly-reward.html',
    'en/articles/google-play-points-super-weekly-reward.html',
    'ko/articles/google-play-points-super-weekly-reward.html',
    'tw/articles/google-play-points-super-weekly-reward.html',
  ];
  const patterns = [
    /30日|30 days|30일|30 天/,
    /90日|90 days|90일|90 天/,
    /保持できない|do not keep|유지하지 못|不會保留/,
    /アカウント|account|계정|帳號/,
  ];
  for (const relativePath of pages) {
    const html = read(relativePath);
    for (const pattern of patterns) {
      assert.match(html, pattern, `${relativePath}: missing verified Super Ticket boundary ${pattern}`);
    }
  }
});

test('gift-card discount guides use authorized regional rules instead of a permanent seller ranking', () => {
  const pages = [
    'articles/2026-06-20-discount-gift-cards.html',
    'en/articles/2026-06-20-discount-gift-cards.html',
    'ko/articles/2026-06-20-discount-gift-cards.html',
    'tw/articles/2026-06-20-discount-gift-cards.html',
  ];
  for (const relativePath of pages) {
    const html = read(relativePath);
    assert.match(html, /正規|authorized|공인|授權|官方/, `${relativePath}: authorized source rule is missing`);
    assert.match(html, /国|country|국가|國家/, `${relativePath}: country rule is missing`);
    assert.match(html, /通貨|currency|통화|幣別/, `${relativePath}: currency rule is missing`);
  }
  const jp = read(pages[0]);
  const description = jp.match(/<meta name="description" content="([^"]+)">/);
  assert.ok(description, 'Japanese gift-card meta description is missing');
  assertExcludesAll(description[1], ['楽天市場', 'コンビニ'], 'Japanese gift-card metadata');
  assertIncludesAll(read(pages[3]), ['台湾', '未列出'], 'Taiwan gift-card availability warning');
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
