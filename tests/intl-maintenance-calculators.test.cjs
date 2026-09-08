'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

const pages = [
  { file: 'en/maintenance/platinum/index.html', lang: 'en', tier: 'platinum', target: 3000, rate: 1.4, unit: 1, currency: 'USD', full: 2143, country: 'US', helpLang: 'en' },
  { file: 'en/maintenance/diamond/index.html', lang: 'en', tier: 'diamond', target: 10000, rate: 1.6, unit: 1, currency: 'USD', full: 6250, country: 'US', helpLang: 'en' },
  { file: 'ko/maintenance/platinum/index.html', lang: 'ko', tier: 'platinum', target: 2400, rate: 1.6, unit: 1000, currency: 'KRW', full: 1500000, country: 'KR', helpLang: 'ko' },
  { file: 'ko/maintenance/diamond/index.html', lang: 'ko', tier: 'diamond', target: 15000, rate: 2, unit: 1000, currency: 'KRW', full: 7500000, country: 'KR', helpLang: 'ko' },
  { file: 'tw/maintenance/platinum/index.html', lang: 'tw', tier: 'platinum', target: 4000, rate: 1.75, unit: 30, currency: 'TWD', full: 68572, country: 'TW', helpLang: 'zh-Hant' },
  { file: 'tw/maintenance/diamond/index.html', lang: 'tw', tier: 'diamond', target: 15000, rate: 2, unit: 30, currency: 'TWD', full: 225000, country: 'TW', helpLang: 'zh-Hant' }
];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
}

function localPath(href) {
  const clean = href.replace(/^\//, '').split(/[?#]/, 1)[0];
  return clean === '' || clean.endsWith('/') ? clean + 'index.html' : clean;
}

function lastModified(file) {
  const match = read(file).match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})"/);
  assert.ok(match, `${file}: last-modified`);
  return match[1];
}

function executeMaintenanceCalculator({ progress = '200', target = 1000, rate = 1.5, spendUnit = 1 } = {}) {
  const outputs = new Map(
    ['year', 'target', 'remaining', 'base', 'double', 'triple', 'monthly', 'weekly', 'daily', 'days']
      .map(name => [name, [{ textContent: '' }]])
  );
  const listeners = {};
  const input = {
    value: String(progress),
    addEventListener(type, handler) { listeners[type] = handler; }
  };
  const form = {
    addEventListener(type, handler) { listeners[type] = handler; }
  };
  const error = { hidden: true, textContent: '' };
  const complete = { hidden: true, textContent: '' };
  const results = { scrollIntoView() {} };
  const calculatorRoot = {
    dataset: {
      target: String(target),
      rate: String(rate),
      spendUnit: String(spendUnit),
      locale: 'en-US',
      currency: 'USD',
      completionText: 'Complete',
      invalidText: 'Invalid'
    },
    querySelector(selector) {
      const nodes = {
        '[data-maintenance-form]': form,
        '[data-progress-input]': input,
        '[data-input-error]': error,
        '[data-complete-state]': complete,
        '[data-results]': results
      };
      return nodes[selector] || null;
    },
    querySelectorAll(selector) {
      const match = selector.match(/^\[data-output="([^"]+)"\]$/);
      return match ? outputs.get(match[1]) || [] : [];
    }
  };
  const document = {
    querySelector(selector) {
      return selector === '[data-maintenance-calculator]' ? calculatorRoot : null;
    }
  };

  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(2026, 11, 1, 0, 0, 0, 0);
      else super(...args);
    }
  }

  class PlainNumberFormat {
    format(value) { return String(value); }
  }

  const context = {
    document,
    Date: FakeDate,
    Intl: { NumberFormat: PlainNumberFormat },
    Math,
    Number
  };
  vm.createContext(context);
  vm.runInContext(read('maintenance/intl-maintenance.js'), context, { filename: 'intl-maintenance.js' });

  const value = name => outputs.get(name)[0].textContent;
  return { input, listeners, error, complete, value };
}

test('海外向け維持計算は地域別の公式門檻・積点率・通貨を分ける', () => {
  for (const page of pages) {
    const html = read(page.file);
    const canonical = 'https://playpoint-sim.com/' + page.file.replace(/index\.html$/, '');
    const expected = Math.ceil((page.target / page.rate) * page.unit);

    assert.equal(expected, page.full, page.file + ' の0進捗参考額が不正です');
    assert.ok((html.match(/<p\b/g) || []).length >= 1, page.file + ' に説明文がありません');
    assert.ok(html.includes('data-target="' + page.target + '"'));
    assert.ok(html.includes('data-rate="' + page.rate + '"'));
    assert.ok(html.includes('data-spend-unit="' + page.unit + '"'));
    assert.ok(html.includes('data-currency="' + page.currency + '"'));
    assert.ok(html.includes('<meta name="robots" content="index,follow">'));
    assert.ok(html.includes('<link rel="canonical" href="' + canonical + '">'));
    assert.ok(html.includes('<meta property="og:url" content="' + canonical + '">'));
    assert.ok(html.includes('/maintenance/intl-maintenance.css?v='));
    assert.ok(html.includes('/maintenance/intl-maintenance.js?v='));
    assert.ok(!html.includes('<style>'), page.file + ' にページ固有のインラインCSSがあります');
    assert.ok(html.includes('answer/9080348?co=GENIE.CountryCode%3D' + page.country + '&amp;hl=' + page.helpLang));
    assert.ok(html.includes('answer/9077192?co=GENIE.CountryCode%3D' + page.country + '&amp;hl=' + page.helpLang));

    const schemas = jsonLd(html);
    assert.ok(schemas.some(schema => schema['@type'] === 'WebApplication'));
    assert.ok(schemas.some(schema => schema['@type'] === 'BreadcrumbList'));
    assert.ok(schemas.some(schema => schema['@type'] === 'FAQPage'));
    assert.ok(schemas.every(schema => schema['@context'] === 'https://schema.org'));

    for (const hreflang of ['ja', 'en', 'ko', 'zh-TW', 'x-default']) {
      assert.ok(html.includes('hreflang="' + hreflang + '"'), page.file + ' に ' + hreflang + ' がありません');
    }

    const links = [...html.matchAll(/<a\b[^>]*href="(\/[^"#]*)(?:[?#][^"]*)?"/g)].map(match => match[1]);
    for (const href of links) {
      assert.ok(fs.existsSync(path.join(root, localPath(href))), page.file + ' のリンク先がありません: ' + href);
    }
  }
});

test('地域外の維持門檻や通貨を流用していない', () => {
  const en = read('en/maintenance/platinum/index.html') + read('en/maintenance/diamond/index.html');
  const ko = read('ko/maintenance/platinum/index.html') + read('ko/maintenance/diamond/index.html');
  const tw = read('tw/maintenance/platinum/index.html') + read('tw/maintenance/diamond/index.html');

  assert.ok(en.includes('data-target="3000"') && en.includes('data-target="10000"'));
  assert.ok(!en.includes('data-currency="KRW"') && !en.includes('data-currency="TWD"'));

  assert.ok(ko.includes('data-target="2400"') && ko.includes('data-target="15000"'));
  assert.ok(ko.includes('data-spend-unit="1000"'));
  assert.ok(!ko.includes('data-currency="USD"') && !ko.includes('data-currency="TWD"'));

  assert.ok(tw.includes('data-target="4000"') && tw.includes('data-target="15000"'));
  assert.ok(tw.includes('data-spend-unit="30"'));
  assert.ok(!tw.includes('data-currency="USD"') && !tw.includes('data-currency="KRW"'));
});

test('維持計算ロジックは不足点・通常時・倍率・年末ペースを実際の出力へ反映する', () => {
  const fixture = executeMaintenanceCalculator();

  assert.equal(fixture.value('year'), '2026');
  assert.equal(fixture.value('target'), '1000');
  assert.equal(fixture.value('remaining'), '800');
  assert.equal(fixture.value('base'), '534');
  assert.equal(fixture.value('double'), '400');
  assert.equal(fixture.value('triple'), '267');
  assert.equal(fixture.value('days'), '31');
  assert.equal(fixture.value('monthly'), '525');
  assert.equal(fixture.value('weekly'), '121');
  assert.equal(fixture.value('daily'), '18');
  assert.equal(fixture.complete.hidden, true);

  fixture.input.value = '1000';
  fixture.listeners.input();
  assert.equal(fixture.value('remaining'), '0');
  assert.equal(fixture.value('base'), '0');
  assert.equal(fixture.complete.hidden, false);
  assert.equal(fixture.complete.textContent, 'Complete');

  fixture.input.value = '-1';
  fixture.listeners.input();
  assert.equal(fixture.error.hidden, false);
  assert.equal(fixture.error.textContent, 'Invalid');
});

test('日本語既存ページと海外6ページは完全なhreflangで相互接続する', () => {
  for (const tier of ['platinum', 'diamond']) {
    const files = [
      'maintenance/' + tier + '/index.html',
      'en/maintenance/' + tier + '/index.html',
      'ko/maintenance/' + tier + '/index.html',
      'tw/maintenance/' + tier + '/index.html'
    ];
    const expected = [
      ['ja', 'https://playpoint-sim.com/maintenance/' + tier + '/'],
      ['en', 'https://playpoint-sim.com/en/maintenance/' + tier + '/'],
      ['ko', 'https://playpoint-sim.com/ko/maintenance/' + tier + '/'],
      ['zh-TW', 'https://playpoint-sim.com/tw/maintenance/' + tier + '/'],
      ['x-default', 'https://playpoint-sim.com/en/maintenance/' + tier + '/']
    ];

    for (const file of files) {
      const html = read(file);
      for (const [lang, url] of expected) {
        assert.ok(html.includes('hreflang="' + lang + '" href="' + url + '">'), file + ' のhreflangが不足: ' + lang);
      }
    }
  }
});

test('専用サイトマップ・robots・一覧から地域別維持計算を発見できる', () => {
  const sitemap = read('sitemap-intl-maintenance-calculators.xml');
  const mainSitemap = read('sitemap.xml');
  const robots = read('robots.txt');
  const humanSitemap = read('sitemap.html');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const tiers = ['platinum', 'diamond'];
  const localeCount = 4;

  assert.equal(locs.length, tiers.length * localeCount);
  assert.ok(robots.includes('Sitemap: https://playpoint-sim.com/sitemap-intl-maintenance-calculators.xml'));

  for (const tier of tiers) {
    const urls = [
      'https://playpoint-sim.com/maintenance/' + tier + '/',
      'https://playpoint-sim.com/en/maintenance/' + tier + '/',
      'https://playpoint-sim.com/ko/maintenance/' + tier + '/',
      'https://playpoint-sim.com/tw/maintenance/' + tier + '/'
    ];
    for (const url of urls) {
      assert.ok(locs.includes(url));
      assert.ok(sitemap.includes('href="' + url + '"'));
      assert.ok(!mainSitemap.includes('<loc>' + url + '</loc>'));
      if (!url.includes('playpoint-sim.com/maintenance/')) {
        assert.ok(humanSitemap.includes(url.replace('https://playpoint-sim.com/', '')));
      }
    }
  }

  for (const locale of ['en', 'ko', 'tw']) {
    const hub = read(locale + '/articles/index.html');
    assert.ok(hub.includes('/' + locale + '/maintenance/platinum/'));
    assert.ok(hub.includes('/' + locale + '/maintenance/diamond/'));
  }
});

test('生成設定は手書き維持計算を上書きせずサイトマップ対象に保つ', () => {
  const generator = require(path.join(root, 'scripts', 'intl-seo-pages.cjs'));
  const files = generator.getIntlSeoFiles();
  const entries = generator.getIntlSitemapEntries();

  for (const page of pages) {
    assert.ok(files.includes(page.file), page.file + ' が生成対象一覧にありません');
    const url = 'https://playpoint-sim.com/' + page.file.replace(/index\.html$/, '');
    const expectedDate = lastModified(page.file);
    assert.ok(entries.some(entry => entry.url === url && entry.lastmod === expectedDate), `${page.file}: sitemap content date`);
  }

  // Manual-page overwrite is a destructive boundary. Until the generator exposes
  // a dry-run plan API, this narrow static guard is intentionally retained.
  const contentSource = read('scripts/intl-seo-content.cjs');
  const generatorSource = read('scripts/intl-seo-pages.cjs');
  assert.ok(contentSource.includes('MANUAL_MAINTENANCE_PAGES'));
  assert.ok(!generatorSource.includes("writeFile(rootDir, page.file"));
});

test('維持解説・比較記事から同一地域の計算ページへ進める', () => {
  for (const locale of ['en', 'ko', 'tw']) {
    for (const article of [
      locale + '/articles/google-play-points-level-maintenance-reset.html',
      locale + '/articles/google-play-points-platinum-diamond-cost.html'
    ]) {
      const html = read(article);
      assert.ok(html.includes('/' + locale + '/maintenance/platinum/'), article + ' からプラチナ維持へ進めません');
      assert.ok(html.includes('/' + locale + '/maintenance/diamond/'), article + ' からダイヤモンド維持へ進めません');
    }
  }
});
