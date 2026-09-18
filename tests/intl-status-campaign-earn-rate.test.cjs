'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { PAGE_TYPES } = require('../scripts/intl-seo-content.cjs');
const { INTERNATIONAL_LOCALES } = require('../scripts/locale-ids.cjs');

const root = path.resolve(__dirname, '..');
const statusAndCampaignPages = Object.values(PAGE_TYPES).filter(page => /^(?:status|campaign)\//.test(page.slug));

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function calculatorLinks(html) {
  return [...html.matchAll(/href="([^"]+)"/g)]
    .map(match => match[1])
    .filter(href => {
      const url = new URL(href, 'https://playpoint-sim.com/');
      return url.pathname === '/en/' && url.searchParams.get('mode') === 'main';
    });
}

test('international status pages describe final special earn rates instead of multiplying tier rates', () => {
  const diamondKo = read('ko/status/diamond/index.html');
  assert.match(diamondKo, /현재 등급의 기본 적립률/);
  assert.match(diamondKo, /Google Play에 표시된 최종 특별 적립률/);
  assert.doesNotMatch(diamondKo, /먼저 1배로 기준/);

  const platinumEn = read('en/status/platinum/index.html');
  assert.match(platinumEn, /normal tier earn rate/);
  assert.match(platinumEn, /final special earn rate shown in Google Play/);
  assert.doesNotMatch(platinumEn, /Run the estimate at 1x first/);

  const platinumKo = read('ko/status/platinum/index.html');
  assert.match(platinumKo, /현재 등급의 기본 적립률/);
  assert.match(platinumKo, /최종 특별 적립률/);
  assert.doesNotMatch(platinumKo, /확인: 남은 포인트, 배율, 지역 조건/);

  const platinumTw = read('tw/status/platinum/index.html');
  assert.match(platinumTw, /目前等級基本獲點率/);
  assert.match(platinumTw, /Google Play 顯示的最終特別獲點率/);
  assert.doesNotMatch(platinumTw, /確認: 剩餘點數、倍率、地區條件/);

  const goldEn = read('en/status/gold/index.html');
  assert.match(goldEn, /normal tier earn rate/);
  assert.match(goldEn, /final special earn rate shown in Google Play/);
  assert.doesNotMatch(goldEn, /Run a 1x estimate first/);

  const goldKo = read('ko/status/gold/index.html');
  assert.match(goldKo, /현재 등급의 기본 적립률/);
  assert.match(goldKo, /최종 특별 적립률/);

  const goldTw = read('tw/status/gold/index.html');
  assert.match(goldTw, /目前等級基本獲點率/);
  assert.match(goldTw, /最終特別獲點率/);
});

test('campaign wait pages compare confirmed rates without treating 2x or 3x as a multiplier input', () => {
  const en = read('en/campaign/wait/index.html');
  assert.match(en, /Start with your normal tier earn rate/);
  assert.match(en, /final special earn rate shown in Google Play/);
  assert.doesNotMatch(en, /A multiplier should be entered/);
  assert.doesNotMatch(en, /Compare 1x, then 2x, then 3x/);

  const ko = read('ko/campaign/wait/index.html');
  assert.match(ko, /현재 등급의 기본 적립률/);
  assert.match(ko, /Google Play에 표시된 최종 특별 적립률/);
  assert.doesNotMatch(ko, /대상 결제일 때만 배율 사용/);

  const tw = read('tw/campaign/wait/index.html');
  assert.match(tw, /目前等級基本獲點率/);
  assert.match(tw, /Google Play 顯示的最終特別獲點率/);
  assert.doesNotMatch(tw, /只有符合資格才輸入倍率/);
});

test('published international status and campaign pages expose editorial dates without pinning rollout history', () => {
  assert.ok(statusAndCampaignPages.length > 0, 'status/campaign page registry must not be empty');

  for (const page of statusAndCampaignPages) {
    for (const locale of INTERNATIONAL_LOCALES) {
      const file = `${locale}/${page.slug}/index.html`;
      const html = read(file);
      const meta = html.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})">/)?.[1];
      const schema = html.match(/"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/)?.[1];
      assert.ok(meta, `${file}: last-modified`);
      assert.equal(schema, meta, `${file}: structured date should match metadata`);
    }
  }
});

test('legacy multiplier query parameters remain for backward-compatible calculator links', () => {
  for (const key of ['gold', 'campaign2x', 'campaign3x', 'campaignWait']) {
    const page = PAGE_TYPES[key];
    assert.ok(page, `PAGE_TYPES.${key} is missing`);
    const expectedMultiplier = new URLSearchParams(page.query).get('multiplier');
    assert.ok(expectedMultiplier, `${key}: canonical multiplier compatibility value is missing`);

    const html = read(`en/${page.slug}/index.html`);
    const links = calculatorLinks(html);
    assert.ok(links.length > 0, `${page.slug}: calculator link is missing`);
    assert.ok(
      links.some(href => new URL(href, 'https://playpoint-sim.com/').searchParams.get('multiplier') === expectedMultiplier),
      `${page.slug}: generated calculator link must preserve canonical legacy multiplier`
    );
  }
});
