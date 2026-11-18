'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getRegionRule } = require('../js/region-rules.js');

function calculationFields(region) {
  const { currencyCode, tiers } = getRegionRule(region);
  return { currencyCode, rates: tiers.map(tier => tier.rate), tiers: tiers.map(tier => tier.label) };
}

const GAME_SLUGS = Object.freeze(['prospi-a', 'pokemon-go', 'efootball']);

const REGION = Object.freeze({
  en: {
    amountLabel: 'Planned Google Play spend ($ USD)',
    base: '$1',
    ...calculationFields('US'),
    baseCopy: 'Standard',
    specialCopy: 'Special earn rate',
    siteName: 'PlayPoint Calculator',
    authorName: 'Katakata',
    authorUrl: 'https://playpoint-sim.com/en/author/katakata.html'
  },
  ko: {
    amountLabel: 'Google Play 결제 예정 총액 (원)',
    base: '1,000원',
    ...calculationFields('KR'),
    baseCopy: '기본 기준',
    specialCopy: '특별 적립률',
    siteName: 'Google Play Points 계산기',
    authorName: 'Katakata',
    authorUrl: 'https://playpoint-sim.com/ko/author/katakata.html'
  },
  tw: {
    amountLabel: '預計 Google Play 課金總額（新台幣）',
    base: 'NT$30',
    ...calculationFields('TW'),
    baseCopy: '基本參考',
    specialCopy: '特殊積點率',
    siteName: 'Google Play Points 計算器',
    authorName: 'Katakata',
    authorUrl: 'https://playpoint-sim.com/tw/author/katakata.html'
  }
});

function replaceSelect(html, id, options, file) {
  const pattern = new RegExp(`(<select id="${id}">)[\\s\\S]*?(<\\/select>)`);
  if (!pattern.test(html)) throw new Error(`[game-seo-wave5-regional] ${file}: #${id} not found`);
  // A replacement function is required here. Locale copy such as "$1" must stay
  // literal text and must never be interpreted as a RegExp capture reference.
  return html.replace(pattern, (_match, open, close) => `${open}${options}${close}`);
}

function rateOptions(cfg) {
  return [1, 2, 3, 4, 5, 7]
    .map(rate => `<option value="${rate}">${rate === 1 ? cfg.baseCopy : cfg.specialCopy}: ${cfg.base} ${rate}pt</option>`)
    .join('');
}

function tierOptions(cfg) {
  return cfg.rates
    .map((rate, index) => `<option value="${rate}">${cfg.tiers[index]} (${cfg.base} = ${rate}pt)</option>`)
    .join('');
}

function syncLocaleNavigation(html) {
  return html
    .replace('<a class="site-logo" href="../../../">', '<a class="site-logo" href="../../">')
    .replace('<a class="nav-item" href="../../../"><span>', '<a class="nav-item" href="../../"><span>')
    .replace(/(<div class="breadcrumbs-wrapper"><nav[^>]*><a) href="\.\.\/\.\.\/\.\.\/"/, '$1 href="../../"');
}

function syncLocaleMetadata(html, locale, cfg) {
  let next = html
    .replace('<meta name="author" content="かたかた" />', `<meta name="author" content="${cfg.authorName}" />`)
    .replace(/<meta property="og:site_name" content="[^"]*" \/>/, `<meta property="og:site_name" content="${cfg.siteName}" />`)
    .replaceAll('"name":"かたかた"', `"name":"${cfg.authorName}"`)
    .replace('"url":"https://playpoint-sim.com/author/katakata.html"', `"url":"${cfg.authorUrl}"`);
  if (locale === 'tw') {
    next = next
      .replace('<html lang="zh-Hant">', '<html lang="zh-TW">')
      .replace('"inLanguage":"zh-Hant"', '"inLanguage":"zh-TW"');
  }
  return next;
}

function syncGameSeoWave5RegionalRates(rootDir) {
  const changedFiles = [];
  let checked = 0;

  for (const [locale, cfg] of Object.entries(REGION)) {
    for (const slug of GAME_SLUGS) {
      checked += 1;
      const file = `${locale}/games/${slug}/index.html`;
      const full = path.join(rootDir, file);
      if (!fs.existsSync(full)) throw new Error(`[game-seo-wave5-regional] missing ${file}`);
      let html = fs.readFileSync(full, 'utf8');
      const before = html;
      html = html.replace(
        /(<label for="sim-custom-amount">)[^<]*(<\/label>)/,
        (_match, open, close) => `${open}${cfg.amountLabel}:${close}`
      );
      html = replaceSelect(html, 'sim-multiplier', rateOptions(cfg), file);
      html = replaceSelect(html, 'sim-status', tierOptions(cfg), file);
      html = html.replace('"priceCurrency":"JPY"', `"priceCurrency":"${cfg.currencyCode}"`);
      html = syncLocaleNavigation(html);
      html = syncLocaleMetadata(html, locale, cfg);
      if (html !== before) {
        fs.writeFileSync(full, html, 'utf8');
        changedFiles.push(file);
      }
    }
  }

  return { checked, changedFiles };
}

module.exports = {
  GAME_SLUGS,
  REGION,
  syncGameSeoWave5RegionalRates
};
