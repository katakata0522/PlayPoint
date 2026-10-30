'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { GAME_SEO_WAVE5, SOURCES, VERIFIED_AT } = require('../scripts/game-seo-wave5-data.cjs');
const { GAME_ORDER, GUIDE_PATHS, LOCALES } = require('../scripts/game-seo-wave5-sync.cjs');
const { REGION } = require('../scripts/game-seo-wave5-regional-sync.cjs');
const { isReference } = require('../scripts/intl-game-evidence.cjs');
const { getGeneratedGamePageContentDate } = require('../scripts/content-dates.cjs');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const japaneseLeakPattern = /[\u3040-\u30fa\u30fc-\u30ff\u3001\u3002\u300c\u300d\u300e\u300f\u3010\u3011\uff08\uff09]/u;

function localePrefix(locale) {
  return locale === 'ja' ? '' : `${locale}/`;
}

function parentFile(locale, slug) {
  return `${localePrefix(locale)}games/${slug}/index.html`;
}

function sourceHost(url) {
  return new URL(url).hostname;
}

function selectInner(html, id) {
  const match = html.match(new RegExp(`<select id="${id}">([\\s\\S]*?)<\\/select>`));
  assert.ok(match, `#${id} should exist`);
  return match[1];
}

test('Wave 5 SSOT separates verified purchase routes from unverified current prices', () => {
  assert.deepEqual(Object.keys(GAME_SEO_WAVE5).sort(), [...GAME_ORDER].sort());
  for (const [slug, config] of Object.entries(GAME_SEO_WAVE5)) {
    assert.equal(config.verifiedAt, VERIFIED_AT, `${slug} verification date`);
    assert.equal(config.publishGooglePlayPrices, false, `${slug} must not publish unverified Google Play prices`);
    assert.ok(Array.isArray(config.sources) && config.sources.length > 0, `${slug} needs official sources`);
    assert.ok(config.sources.includes(SOURCES.googlePlayEarn), `${slug} must include the Google Play Points earning source`);
    for (const source of config.sources) assert.equal(new URL(source).protocol, 'https:', `${slug} source must use HTTPS`);
  }
  assert.equal(GAME_SEO_WAVE5['prospi-a'].webStore.outsideGooglePlay, true);
  assert.equal(GAME_SEO_WAVE5['prospi-a'].webStore.officialSaysBetterThanInApp, true);
  assert.equal(GAME_SEO_WAVE5['pokemon-go'].webStore.rewardRoad, true);
  assert.deepEqual(GAME_SEO_WAVE5['pokemon-go'].googlePlay.androidPurchaseRoutes, ['Google Play', 'Galaxy Store']);
  assert.equal(GAME_SEO_WAVE5.efootball.efootballPoints.sameAsGooglePlayPoints, false);
});

test('Wave 5 official sources stay on the intended first-party domains', () => {
  assert.equal(sourceHost(SOURCES.googlePlayEarn), 'support.google.com');
  assert.equal(sourceHost(SOURCES.prospiOfficial), 'www.konami.com');
  assert.equal(sourceHost(SOURCES.prospiPurchaseHelp), 'ja-support1.konami.com');
  assert.equal(sourceHost(SOURCES.prospiKonamiStore), 'pawaspi-point.konami.net');
  assert.equal(sourceHost(SOURCES.pokemonGoPurchaseHelp), 'niantic.helpshift.com');
  assert.equal(sourceHost(SOURCES.pokemonGoWebStoreJapan), 'niantic.helpshift.com');
  assert.equal(sourceHost(SOURCES.pokemonGoRewardRoad), 'niantic.helpshift.com');
  assert.equal(sourceHost(SOURCES.efootballGooglePlay), 'www.konami.com');
  assert.equal(sourceHost(SOURCES.efootballOverview), 'www.konami.com');
  assert.equal(sourceHost(SOURCES.efootballPoints), 'www.konami.com');
});

test('every Wave 5 parent calculator exists in every canonical game locale', () => {
  for (const locale of LOCALES) {
    for (const slug of GAME_ORDER) {
      const file = parentFile(locale, slug);
      assert.ok(exists(file), `${file} should exist`);
      const html = read(file);
      assert.match(html, /id="game-sim-form"/);
      assert.match(html, /id="sim-custom-amount"/);
      assert.match(html, /data-input-mode="amount"/);
      assert.doesNotMatch(html, /id="sim-pack-select"|data-amount=/, `${file} must not expose a hard-coded current product price`);
      assert.match(html, new RegExp(`<meta name="last-modified" content="${getGeneratedGamePageContentDate(file)}"`));
      assert.doesNotMatch(html, /hb\.afl\.rakuten\.co\.jp/, `${file} should not introduce rights-risk affiliate routing`);
    }
  }
});

test('Wave 5 international calculators use each region Play Points rate, currency metadata and local home', () => {
  for (const [locale, cfg] of Object.entries(REGION)) {
    for (const slug of GAME_ORDER) {
      const html = read(parentFile(locale, slug));
      assert.match(html, new RegExp(cfg.base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      for (const rate of cfg.rates) {
        assert.match(selectInner(html, 'sim-status'), new RegExp(`value="${rate}"`));
      }
      assert.match(html, new RegExp(`"priceCurrency":"${cfg.currencyCode}"`));
      assert.doesNotMatch(html, /100円あたり|100円=|100円 =/, `${locale}/${slug} must not inherit Japan earn-rate wording`);
      assert.doesNotMatch(selectInner(html, 'sim-multiplier'), /<select/, `${locale}/${slug} earn-rate options must remain valid HTML text`);
      assert.doesNotMatch(selectInner(html, 'sim-status'), /<select/, `${locale}/${slug} tier options must remain valid HTML text`);
      assert.match(html, /class="site-logo" href="\.\.\/\.\.\/"/);
      assert.doesNotMatch(html, /class="site-logo" href="\.\.\/\.\.\/\.\.\/"/);
      assert.match(html, /<div class="breadcrumbs-wrapper"><nav[^>]*><a href="\.\.\/\.\.\/"/);
    }
  }
  const en = read(parentFile('en', 'pokemon-go'));
  assert.match(en, /\$1 = 1pt/);
  const ko = read(parentFile('ko', 'pokemon-go'));
  assert.match(ko, /1,000원 = 1pt/);
  const tw = read(parentFile('tw', 'pokemon-go'));
  assert.match(tw, /NT\$30 = 1pt/);
});

test('Wave 5 English parent pages contain no accidental Japanese-script metadata or UI', () => {
  for (const slug of GAME_ORDER) {
    const html = read(parentFile('en', slug));
    const leakingLines = html.split(/\r?\n/).filter(line => japaneseLeakPattern.test(line));
    assert.deepEqual(leakingLines, [], `${slug} English page leaked Japanese text:\n${leakingLines.join('\n')}`);
    assert.match(html, /<meta name="author" content="Katakata"/);
    assert.match(html, /<meta property="og:site_name" content="PlayPoint Calculator"/);
  }
});

test('Prospi guide reflects SSOT boundaries between Google Play and KONAMI Games Store rewards', () => {
  const file = `games/prospi-a/${GUIDE_PATHS['prospi-a']}/index.html`;
  const html = read(file);
  const webStore = GAME_SEO_WAVE5['prospi-a'].webStore;
  assert.match(html, /KONAMI Gamesストア/);
  assert.match(html, /ゲーム内のご購入よりお得/);
  assert.ok(html.includes('税込' + Math.round(1 / webStore.pawaspiGoldPerTaxIncludedYen) + '円'));
  assert.ok(html.includes('税込' + Math.round(1 / webStore.dPointPerTaxIncludedYenWhenLinked) + '円'));
  assert.match(html, /Google Playとは別のWEB決済/);
  assert.match(html, /Google Play Pointsとしては数えず/);
  assert.match(html, /Google Play上の決済ではないため/);
  assert.match(html, /<h2\b[^>]*>/);
});

test('Pokémon GO guide reflects the verified purchase-route and Reward Road boundaries', () => {
  const file = `games/pokemon-go/${GUIDE_PATHS['pokemon-go']}/index.html`;
  const html = read(file);
  const config = GAME_SEO_WAVE5['pokemon-go'];
  for (const route of config.googlePlay.androidPurchaseRoutes) assert.ok(html.includes(route));
  assert.match(html, /ボーナスポケコイン/);
  assert.match(html, /Reward Road/);
  assert.match(html, /Reward RoadポイントはGoogle Play Pointsではありません/);
  assert.match(html, /無料ポケコイン/);
  assert.match(html, /<h2\b[^>]*>/);
});

test('eFootball guide explicitly separates Google Play Points from KONAMI eFootball Points', () => {
  const file = `games/efootball/${GUIDE_PATHS.efootball}/index.html`;
  const html = read(file);
  const points = GAME_SEO_WAVE5.efootball.efootballPoints;
  assert.match(html, /Google Play Points/);
  assert.match(html, /eFootball™ポイント/);
  assert.match(html, /残高も使い道も管理先も別/);
  assert.ok(html.includes(String(points.expiryMonthsAfterClaim) + 'か月後'));
  for (const name of ['eFootballコイン', 'GP', 'eFootball™ポイント', 'Google Play Points']) {
    assert.ok(html.includes(`<th scope="row">${name}</th>`), `comparison row missing: ${name}`);
  }
  assert.match(html, /<h2\b[^>]*>/);
});

test('eFootballの再生成は重要条件とFAQを保ち、編集済み記事を上書きしない', () => {
  const os = require('node:os');
  const { syncGameSeoWave5 } = require('../scripts/game-seo-wave5-sync.cjs');
  const { articleForPath } = require('../scripts/game-guide-article-catalog.cjs');
  const officialDates = require('../scripts/article-official-verification-dates.json');
  const file = 'games/efootball/google-play-points-vs-efootball-points/index.html';
  const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-efootball-fallback-'));
  try {
    for (const locale of ['', 'en', 'ko', 'tw']) {
      const games = path.join(temporaryRoot, locale, 'games');
      fs.mkdirSync(games, { recursive: true });
      fs.writeFileSync(path.join(games, 'index.html'), '<div data-game-seo-wave5="true"></div>');
    }
    assert.ok(syncGameSeoWave5(temporaryRoot).changedFiles.includes(file));
    const fullPath = path.join(temporaryRoot, file);
    const html = fs.readFileSync(fullPath, 'utf8');
    for (const text of ['Play Pointsへの参加が前提', '税金は計算対象に含まれない', 'ゲームアカウントとKONAMI IDの連携は原則解除できません', '同意済みのKONAMI IDと連携したゲームアカウントは解除できない', '国・地域によって異なる', 'UTC（協定世界時）', '月末23時59分59秒', 'https://www.konami.com/wepes/efootball_point/ja/']) assert.ok(html.includes(text), text);
    assert.ok(html.indexOf('<h2 id="article-section-4">') < html.indexOf('<h2 id="article-section-3">'), '4種類の比較を交換・期限の詳細より先に置く');
    const objects = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x => JSON.parse(x[1]));
    const faq = objects.find(x => x['@type'] === 'FAQPage');
    assert.equal(faq.mainEntity.length, 2);
    for (const item of faq.mainEntity) assert.ok(html.includes('Q. ' + escapeHtml(item.name) + '</h3><p>A. ' + escapeHtml(item.acceptedAnswer.text) + '</p>'));
    assert.equal(objects.find(x => x['@type'] === 'Article').dateModified, articleForPath(file).modified);
    assert.ok(html.includes('最終確認：' + officialDates[file]));
    assert.ok(html.includes('<meta name="last-modified" content="' + articleForPath(file).modified + '"'));
    assert.equal(syncGameSeoWave5(temporaryRoot).changedFiles.length, 0);
    const edited = '<!doctype html><body data-editorial-flow="2026-10">保護対象の本文</body>';
    fs.writeFileSync(fullPath, edited);
    assert.ok(!syncGameSeoWave5(temporaryRoot).changedFiles.includes(file));
    assert.equal(fs.readFileSync(fullPath, 'utf8'), edited);
  } finally {
    const tempBase = fs.realpathSync(os.tmpdir());
    const target = fs.realpathSync(temporaryRoot);
    if (!target.startsWith(tempBase + path.sep) || !path.basename(target).startsWith('pp-efootball-fallback-')) throw new Error('unexpected test cleanup path');
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('all locale game portals discover every Wave 5 parent page exactly once', () => {
  for (const locale of LOCALES) {
    const portal = read(`${localePrefix(locale)}games/index.html`);
    for (const slug of GAME_ORDER) {
      const href = locale === 'ja' ? `./${slug}/` : isReference(locale, slug) ? `/games/${slug}/` : `/${locale}/games/${slug}/`;
      const matches = portal.match(new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g')) || [];
      assert.equal(matches.length, 1, `${locale} portal should link ${slug} once`);
    }
    assert.equal((portal.match(/data-game-seo-wave5="true"/g) || []).length, 1, `${locale} Wave 5 portal marker must stay idempotent`);
  }
});

test('Wave 5 deep guides are discoverable in sitemap with verified editorial dates', () => {
  const sitemap = read('sitemap.xml');
  const guideFiles = [
    `games/prospi-a/${GUIDE_PATHS['prospi-a']}/index.html`,
    `games/pokemon-go/${GUIDE_PATHS['pokemon-go']}/index.html`,
    `games/efootball/${GUIDE_PATHS.efootball}/index.html`
  ];
  for (const file of guideFiles) {
    const url = `https://playpoint-sim.com/${file.replace(/index\.html$/, '')}`;
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${url} should be in sitemap`);
    const modified = read(file).match(/<meta name="last-modified" content="([^"]+)"/)[1];
    assert.equal(getGeneratedGamePageContentDate(file), modified);
    assert.ok(sitemap.match(/<url>[\s\S]*?<\/url>/g).find(entry => entry.includes(`<loc>${url}</loc>`)).includes(`<lastmod>${modified}</lastmod>`));
  }
});


