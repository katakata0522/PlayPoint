'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { GAME_SEO_WAVE5, SOURCES, VERIFIED_AT } = require('../scripts/game-seo-wave5-data.cjs');
const { GAME_ORDER, GUIDE_PATHS, LOCALES } = require('../scripts/game-seo-wave5-sync.cjs');
const { REGION } = require('../scripts/game-seo-wave5-regional-sync.cjs');
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
    assert.ok(config.sources.length >= 4, `${slug} needs substantial official sourcing`);
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

test('all three Wave 5 parent calculators exist in every canonical game locale', () => {
  for (const locale of LOCALES) {
    for (const slug of GAME_ORDER) {
      const file = parentFile(locale, slug);
      assert.ok(exists(file), `${file} should exist`);
      const html = read(file);
      assert.match(html, /id="game-sim-form"/);
      assert.match(html, /id="sim-custom-amount"/);
      const packSelect = selectInner(html, 'sim-pack-select');
      assert.match(packSelect, /<option value="custom" selected>/);
      assert.doesNotMatch(packSelect, /<option value="\d/, `${file} must not expose a hard-coded current product price`);
      assert.match(html, new RegExp(`<meta name="last-modified" content="${VERIFIED_AT}"`));
      assert.equal(getGeneratedGamePageContentDate(file), VERIFIED_AT);
      assert.ok(html.length > 7000, `${file} should be a substantive calculator page`);
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

test('Prospi guide separates Google Play from KONAMI Games Store and its own rewards', () => {
  const file = `games/prospi-a/${GUIDE_PATHS['prospi-a']}/index.html`;
  const html = read(file);
  assert.match(html, /KONAMI Gamesストア/);
  assert.match(html, /ゲーム内のご購入よりお得/);
  assert.match(html, /税込100円[^<]*パワスピ・ゴールド1G/);
  assert.match(html, /税込200円[^<]*dポイント1pt/);
  assert.match(html, /Google Playとは別のWEB決済/);
  assert.match(html, /Google Play Pointsとしては数えず/);
  assert.match(html, /Google Play上の決済ではないため/);
  assert.ok((html.match(/<h2\b[^>]*>/g) || []).length >= 5, 'Prospi guide should have multiple decision sections');
  assert.ok(html.length > 5000);
});

test('Pokémon GO guide distinguishes Google Play, Galaxy Store, Web Store and Reward Road', () => {
  const file = `games/pokemon-go/${GUIDE_PATHS['pokemon-go']}/index.html`;
  const html = read(file);
  assert.match(html, /Google PlayまたはGalaxy Store/);
  assert.match(html, /ボーナスポケコイン/);
  assert.match(html, /Reward Road/);
  assert.match(html, /Reward RoadポイントはGoogle Play Pointsではありません/);
  assert.match(html, /無料ポケコイン/);
  assert.ok((html.match(/<h2\b[^>]*>/g) || []).length >= 5, 'Pokémon GO guide should have multiple decision sections');
  assert.ok(html.length > 5000);
});

test('eFootball guide explicitly separates Google Play Points from KONAMI eFootball Points', () => {
  const file = `games/efootball/${GUIDE_PATHS.efootball}/index.html`;
  const html = read(file);
  assert.match(html, /Google Play Points/);
  assert.match(html, /eFootball™ポイント/);
  assert.match(html, /完全に別のポイント/);
  assert.match(html, /受け取り後6か月後の月末/);
  assert.match(html, /eFootball™コイン、GP、eFootball™ポイント/);
  assert.ok((html.match(/<h2\b[^>]*>/g) || []).length >= 5, 'eFootball guide should have multiple decision sections');
  assert.ok(html.length > 5000);
});

test('all locale game portals discover every Wave 5 parent page exactly once', () => {
  for (const locale of LOCALES) {
    const portal = read(`${localePrefix(locale)}games/index.html`);
    for (const slug of GAME_ORDER) {
      const matches = portal.match(new RegExp(`href="\\./${slug}/"`, 'g')) || [];
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
    assert.equal(getGeneratedGamePageContentDate(file), VERIFIED_AT);
  }
});

test('canonical build runs Wave 5 after Wave 4 and regional normalization after Wave 5 generation', () => {
  const build = read('scripts/build-html.js');
  const wave4 = build.indexOf('syncGameSeoWave4(rootDir)');
  const wave5 = build.indexOf('syncGameSeoWave5(rootDir)');
  const regional = build.indexOf('syncGameSeoWave5RegionalRates(rootDir)');
  assert.ok(wave4 >= 0 && wave5 > wave4, 'Wave 5 must run after Wave 4');
  assert.ok(regional > wave5, 'regional normalization must run after Wave 5 page generation');
});
