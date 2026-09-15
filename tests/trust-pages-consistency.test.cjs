'use strict';

// Phase 1 regression guard: trust pages must stay aligned with shipped behavior.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  getIntlAmountHumanSitemapLabels
} = require('../scripts/intl-seo-pages.cjs');
const {
  syncHumanSitemapRegionalAmountLabels
} = require('../scripts/sitemap-sync.cjs');

const ROOT = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('privacy page describes the affiliate programs that are actually shipped', () => {
  const html = read('privacy.html');
  assert.ok(html.includes('Google AdSense'));
  assert.ok(html.includes('楽天アフィリエイト'));
  assert.ok(html.includes('アフィリエイトリンク'));
  assert.ok(!html.includes('各種アフィリエイトプログラム'));
  assert.ok(!html.includes('各携帯電話会社等'));
});

test('terms page does not assume user registration or stored account contact details', () => {
  const html = read('terms.html');
  assert.ok(html.includes('当サイトは、利用登録をせずにご利用いただけます。'));
  assert.ok(!html.includes('登録された情報への通知'));
  assert.ok(!html.includes('連絡先の変更を届け出ない限り'));
  assert.ok(html.includes('お問い合わせ時に提供された連絡先'));
});

test('human sitemap exposes regional calculator hubs instead of duplicating every amount shortcut', () => {
  const html = read('sitemap.html');
  const labels = getIntlAmountHumanSitemapLabels();
  for (const [locale, label] of Object.entries(labels)) {
    assert.ok(
      html.includes(`<a href="${locale}/">`),
      `${locale} calculator hub must remain discoverable; generated amount label remains ${label}`
    );
  }
  assert.ok(!html.includes('English: 10,000 yen points estimate'));
  assert.ok(!html.includes('한국어: 10,000엔 포인트 계산'));
  assert.ok(!html.includes('繁體中文: 10,000 日圓點數'));
});

test('human sitemap regional amount sync is deterministic', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-trust-'));
  try {
    fs.writeFileSync(path.join(dir, 'sitemap.html'), [
      '<ul>',
      '  <li><a href="en/amount/10000/">stale</a></li>',
      '  <li><a href="ko/amount/10000/">stale</a></li>',
      '  <li><a href="tw/amount/10000/">stale</a></li>',
      '</ul>',
      ''
    ].join('\n'));

    assert.equal(syncHumanSitemapRegionalAmountLabels(dir), 3);
    assert.equal(syncHumanSitemapRegionalAmountLabels(dir), 0);

    const html = fs.readFileSync(path.join(dir, 'sitemap.html'), 'utf8');
    for (const [locale, label] of Object.entries(getIntlAmountHumanSitemapLabels())) {
      assert.ok(html.includes(`<a href="${locale}/amount/10000/">${label}</a>`));
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
