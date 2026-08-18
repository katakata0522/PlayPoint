'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const SLOT = '8250492620';

test('記事・LP・ゲームの管理広告は有効な広告ユニットIDを持つ', () => {
  const targets = [
    ['articles/2025-12-25-campaign.html', 'article-ad-container'],
    ['status/gold/index.html', 'lp-ad-container'],
    ['games/fgo/index.html', 'game-ad-container'],
    ['en/games/fgo/index.html', 'game-ad-container']
  ];
  for (const [targetFile, klass] of targets) {
    const html = read(targetFile);
    const marker = 'class="' + klass + '"';
    const index = html.indexOf(marker);
    assert.ok(index >= 0, targetFile + ': 管理広告枠がありません');
    const block = html.slice(index, index + 900);
    assert.ok(block.includes('data-ad-slot="' + SLOT + '"'), targetFile + ': data-ad-slot がありません');
  }
});

test('記事・LP・ゲームの広告初期化経路が共通ローダーと同意管理に接続される', () => {
  const article = read('blog/article.js');
  const thirdParty = read('js/third-party.js');
  const game = read('games/fgo/index.html');
  assert.ok(article.includes('.article-ad-container ins.adsbygoogle'));
  assert.ok(article.includes('PlayPointConsent.whenGranted(loadArticleAdsense)'));
  assert.ok(thirdParty.includes('.lp-ad-container ins.adsbygoogle, .game-ad-container ins.adsbygoogle'));
  assert.ok(thirdParty.includes('runAfterConsent(initializeManagedAds)'));
  assert.ok(game.includes('js/third-party.js'));
  assert.ok(read('games/index.html').includes('js/third-party.js'));
});

test('記事・ブログGA4はconfig後にreadinessを立てる', () => {
  const source = read('blog/components.js');
  const configIndex = source.indexOf("window.gtag('config', GA_MEASUREMENT_ID)");
  const readyIndex = source.indexOf('window.PlayPointAnalytics.markAnalyticsReady()');
  assert.ok(configIndex >= 0);
  assert.ok(readyIndex > configIndex);
  assert.ok(!source.includes('window.PlayPointAnalytics.flushPending()'));
});

test('未確認の未来イベント記事は検索品質保留としてnoindex・サイトマップ除外する', () => {
  const files = [
    'articles/2026-08-17-diamond-valley-festival-guide.html',
    'articles/2026-08-17-tgs-google-play-vip.html'
  ];
  const mainSitemap = read('sitemap.xml');
  const blogSitemap = read('blog/sitemap.xml');
  for (const file of files) {
    const html = read(file);
    const name = path.basename(file);
    assert.match(html, /name=\"robots\" content=\"noindex, follow, max-image-preview:large\"/);
    assert.match(html, /公式発表待ち|未確認/);
    assert.ok(!mainSitemap.includes(name), name + ': main sitemapに残っています');
    assert.ok(!blogSitemap.includes(name), name + ': blog sitemapに残っています');
  }
});

test('広告生成スクリプト自体もdata-ad-slotを保持する', () => {
  for (const file of [
    'scripts/insert-article-ads.cjs',
    'scripts/insert-lp-monetization.cjs',
    'scripts/generate-game-simulators.cjs'
  ]) {
    assert.ok(read(file).includes('data-ad-slot=\"' + SLOT + '\"'), file);
  }
});
