'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { syncGameGuideArticleHub } = require('./game-guide-article-hub-sync.cjs');

const GAME_SLUGS = Object.freeze(['prospi-a', 'pokemon-go', 'efootball']);

const REGION = Object.freeze({
  en: {
    amountLabel: 'Planned Google Play spend ($ USD)',
    base: '$1',
    currencyCode: 'USD',
    rates: [1, 1.1, 1.2, 1.4, 1.6],
    tiers: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    baseCopy: 'Standard',
    specialCopy: 'Special earn rate'
  },
  ko: {
    amountLabel: 'Google Play 결제 예정 총액 (원)',
    base: '1,000원',
    currencyCode: 'KRW',
    rates: [1, 1.1, 1.3, 1.6, 2],
    tiers: ['브론즈', '실버', '골드', '플래티넘', '다이아몬드'],
    baseCopy: '기본 기준',
    specialCopy: '특별 적립률'
  },
  tw: {
    amountLabel: '預計 Google Play 課金總額（新台幣）',
    base: 'NT$30',
    currencyCode: 'TWD',
    rates: [1, 1.25, 1.5, 1.75, 2],
    tiers: ['銅級', '銀級', '黃金級', '白金級', '鑽石級'],
    baseCopy: '基本參考',
    specialCopy: '特殊積點率'
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

function syncEnglishMetadata(html) {
  return html
    .replace('<meta name="author" content="かたかた" />', '<meta name="author" content="Katakata" />')
    .replace('<meta property="og:site_name" content="Playポイント計算機" />', '<meta property="og:site_name" content="PlayPoint Calculator" />')
    .replaceAll('"name":"かたかた"', '"name":"Katakata"');
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
      if (locale === 'en') html = syncEnglishMetadata(html);
      if (html !== before) {
        fs.writeFileSync(full, html, 'utf8');
        changedFiles.push(file);
      }
    }
  }

  // This is the final game-SEO generation phase in build-html.js. Promote the
  // already-generated Japanese deep guides into the /blog/ article system only
  // after every wave has finished, so later game generators cannot overwrite
  // the article shell or manifest registration.
  const articleHub = syncGameGuideArticleHub(rootDir);

  return { checked, changedFiles, articleHub };
}

module.exports = {
  GAME_SLUGS,
  REGION,
  syncGameSeoWave5RegionalRates
};
