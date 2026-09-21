'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { APP_MODULE_FILES } = require('../scripts/asset-sync.cjs');
const { runEsmProbe, ORIGIN } = require('./helpers/runtime-esm.cjs');
const { createRuntime: createServiceWorkerRuntime } = require('./helpers/service-worker-runtime.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function createClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    contains(name) { return values.has(name); },
    toggle(name) {
      if (values.has(name)) {
        values.delete(name);
        return false;
      }
      values.add(name);
      return true;
    }
  };
}

function loadFirstView({ search = '', language = 'en-US', region = 'JP' } = {}) {
  const elements = new Map();
  const queryMap = new Map();
  const listeners = new Map();
  const mediaListeners = new Map();
  const document = {
    documentElement: { lang: 'en', dataset: {} },
    getElementById(id) { return elements.get(id) || null; },
    addEventListener(type, handler) { listeners.set(type, handler); },
    querySelector(selector) { return queryMap.get(selector) || null; },
    querySelectorAll(selector) {
      if (selector === '.region-switch [data-region-recommended="true"]') {
        return [...queryMap.values()].filter(element => element?.dataset?.regionRecommended === 'true');
      }
      return [];
    }
  };
  const window = {
    location: { search },
    matchMedia() {
      return {
        matches: true,
        addEventListener(type, handler) { mediaListeners.set(type, handler); }
      };
    }
  };
  const sessionValues = new Map();
  const localValues = new Map();
  const sessionStorage = {
    getItem(key) { return sessionValues.get(key) ?? null; },
    setItem(key, value) { sessionValues.set(key, String(value)); }
  };
  const localStorage = {
    getItem(key) { return localValues.get(key) ?? null; },
    setItem(key, value) { localValues.set(key, String(value)); }
  };
  const STATE = {
    currentRegion: region,
    dom: {
      languageSuggestionBanner: { classList: createClassList() },
      closeLangBannerBtn: null
    }
  };
  const CONSTANTS = {
    CLASS_HIDDEN: 'hidden',
    STORAGE_REGION_KEY: 'playpointRegion'
  };
  const context = {
    document,
    window,
    sessionStorage,
    localStorage,
    navigator: { language, userLanguage: '' },
    STATE,
    CONSTANTS,
    URLSearchParams,
    console: { error() {} }
  };
  const source = read('js/first-view.js')
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+/gm, '')
    .concat('\n;globalThis.__firstView = { shouldAutoOpenAdvancedSettings, enhanceCalculatorAdvancedSettings, getSuggestedRegionForBrowserLanguage, checkLanguageSuggestion, getLastMainCalculationForRegion, saveLastMainCalculationForRegion, sameCalculationContext, formatLastCalculationText };');
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'first-view.js' });

  return {
    api: context.__firstView,
    document,
    window,
    elements,
    queryMap,
    listeners,
    mediaListeners,
    STATE,
    sessionStorage,
    localStorage,
    navigator: context.navigator
  };
}

function installAdvancedSettings(fixture) {
  const toggleListeners = [];
  const toggle = {
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = String(value); },
    addEventListener(type, handler) { if (type === 'click') toggleListeners.push(handler); }
  };
  const body = {
    inert: false,
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = String(value); }
  };
  const container = {
    dataset: {},
    classList: createClassList(),
    querySelector(selector) {
      return selector === '.calculator-advanced-settings__toggle' ? toggle : null;
    }
  };
  fixture.elements.set('calculator-advanced-settings', container);
  fixture.elements.set('calculator-advanced-settings-body', body);
  return { container, body, toggle, toggleListeners };
}


test('first-view runtimeは既存の計算入力DOMを再生成せず詳細設定だけを拡張する', () => {
  const fixture = loadFirstView({ search: '?mode=main&multiplier=3' });
  const existingInputs = new Map([
    ['currentStatus', { id: 'currentStatus' }],
    ['targetStatus', { id: 'targetStatus' }],
    ['neededPoints', { id: 'neededPoints' }],
    ['baseRate', { id: 'baseRate' }],
    ['multiplier', { id: 'multiplier' }]
  ]);
  for (const [id, element] of existingInputs) fixture.elements.set(id, element);
  installAdvancedSettings(fixture);

  fixture.api.enhanceCalculatorAdvancedSettings();

  for (const [id, element] of existingInputs) {
    assert.strictEqual(fixture.document.getElementById(id), element, `${id}: first-view runtime replaced the existing input node`);
  }
});

test('キャンペーン条件付きURLは詳細設定を実際に開き、モバイル折りたたみ状態を同期する', () => {
  const fixture = loadFirstView({ search: '?mode=main&multiplier=3' });
  const { container, body, toggle, toggleListeners } = installAdvancedSettings(fixture);

  const result = fixture.api.enhanceCalculatorAdvancedSettings();

  assert.equal(result, container);
  assert.equal(container.classList.contains('is-open'), true);
  assert.equal(container.dataset.playpointBound, 'true');
  assert.equal(toggle.attributes['aria-expanded'], 'true');
  assert.equal(body.attributes['aria-hidden'], 'false');
  assert.equal(body.inert, false);
  assert.equal(toggleListeners.length, 1);

  toggleListeners[0]();
  assert.equal(container.classList.contains('is-open'), false);
  assert.equal(toggle.attributes['aria-expanded'], 'false');
  assert.equal(body.attributes['aria-hidden'], 'true');
  assert.equal(body.inert, true);

  fixture.api.enhanceCalculatorAdvancedSettings();
  assert.equal(toggleListeners.length, 1, 'binding must stay idempotent');
});

test('詳細設定の自動展開判定はmainかつ倍率1超だけを許可する', () => {
  const { api } = loadFirstView();
  assert.equal(api.shouldAutoOpenAdvancedSettings('?mode=main&multiplier=2'), true);
  assert.equal(api.shouldAutoOpenAdvancedSettings('?mode=main&multiplier=1'), false);
  assert.equal(api.shouldAutoOpenAdvancedSettings('?mode=reverse&multiplier=3'), false);
  assert.equal(api.shouldAutoOpenAdvancedSettings('?mode=main&multiplier=bad'), false);
});

test('地域提案は国まで明示されたブラウザlocaleだけを既存ボタンへ反映する', () => {
  const fixture = loadFirstView({ language: 'en-US', region: 'JP' });
  const usButton = {
    dataset: {},
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; }
  };
  fixture.queryMap.set('.region-switch > button[data-region="US"]', usButton);

  fixture.api.checkLanguageSuggestion();

  assert.equal(fixture.STATE.dom.languageSuggestionBanner.classList.contains('hidden'), true);
  assert.equal(usButton.dataset.regionRecommended, 'true');
  assert.ok(usButton.attributes['aria-description']);

  const mappings = {
    'en-US': 'US',
    'en-IN': 'IN',
    'ko-KR': 'KR',
    'zh-TW': 'TW',
    'zh-HK': 'HK'
  };
  for (const [locale, expected] of Object.entries(mappings)) {
    assert.equal(fixture.api.getSuggestedRegionForBrowserLanguage(locale), expected);
  }
  for (const ambiguous of ['en', 'ko', 'zh', 'fr-FR']) {
    assert.equal(fixture.api.getSuggestedRegionForBrowserLanguage(ambiguous), null);
  }
});


test('キャンペーン初期状態bootstrapはbody前で実行され、mainかつ倍率1超だけを開く', () => {
  const scenarios = [
    ['?mode=main&multiplier=3', 'open'],
    ['?mode=main&multiplier=1', undefined],
    ['?mode=reverse&multiplier=3', undefined],
    ['?mode=main&multiplier=bad', undefined]
  ];

  for (const indexPath of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html']) {
    const html = read(indexPath);
    const match = html.match(/<script id="playpoint-first-view-state">([\s\S]*?)<\/script>/);
    const body = html.indexOf('<body');
    assert.ok(match, `${indexPath}: first-view state script missing`);
    assert.ok(match.index < body, `${indexPath}: first-view state must run before body`);

    for (const [search, expected] of scenarios) {
      const context = {
        URLSearchParams,
        location: { search },
        document: { documentElement: { dataset: {} } }
      };
      vm.createContext(context);
      vm.runInContext(match[1], context, { filename: `${indexPath}:first-view-state` });
      assert.equal(context.document.documentElement.dataset.playpointAdvancedSettings, expected, `${indexPath}: ${search}`);
    }
  }
});


test('first-viewは実ESM依存・cache改訂・Service Worker先読みに含まれる', async () => {
  const graph = runEsmProbe({ kind: 'graph' });
  const firstViewUrl = `${ORIGIN}/js/first-view.js`;
  assert.ok(graph.some(item => item.url === firstViewUrl), 'first-view.js is not reachable from the active ESM graph');
  assert.ok(APP_MODULE_FILES.includes('js/first-view.js'), 'first-view.js is missing from app module revision inputs');

  const worker = createServiceWorkerRuntime();
  await worker.fireInstall();
  const precache = new Set(worker.addAllCalls.flat().map(item => new URL(item.url, `${ORIGIN}/`).href));
  assert.ok(precache.has(firstViewUrl), 'first-view.js is missing from the actual Service Worker install precache');
});

test('前回の通常計算は地域別に端末内へ1件だけ保持し、別地域を上書きしない', () => {
  const fixture = loadFirstView({ region: 'JP' });
  const jp = { region: 'JP', currentStatus: '1.5', currentStatusLabel: 'ゴールド', targetStatus: '4000', targetStatusLabel: 'プラチナ', neededPoints: '1728' };
  const us = { region: 'US', currentStatus: '1.2', currentStatusLabel: 'Gold', targetStatus: '4000', targetStatusLabel: 'Platinum', neededPoints: '900' };

  assert.equal(fixture.api.saveLastMainCalculationForRegion('JP', jp, fixture.localStorage), true);
  assert.equal(fixture.api.saveLastMainCalculationForRegion('US', us, fixture.localStorage), true);
  assert.equal(fixture.api.getLastMainCalculationForRegion('JP', fixture.localStorage).neededPoints, '1728');
  assert.equal(fixture.api.getLastMainCalculationForRegion('US', fixture.localStorage).neededPoints, '900');
});

test('同じランク条件の再計算だけ前回との差を表示する', () => {
  const fixture = loadFirstView({ region: 'JP' });
  const previous = { region: 'JP', currentStatus: '1.5', currentStatusLabel: 'ゴールド', targetStatus: '4000', targetStatusLabel: 'プラチナ', neededPoints: '1728' };
  const current = { ...previous, neededPoints: '1200' };
  const changedTarget = { ...current, targetStatus: '15000', targetStatusLabel: 'ダイヤモンド' };

  assert.equal(fixture.api.sameCalculationContext(previous, current), true);
  assert.match(fixture.api.formatLastCalculationText('JP', current, previous), /528pt減/);
  assert.match(fixture.api.formatLastCalculationText('JP', changedTarget, previous), /前回：1,200pt/);
});

test('公開トップは役割が分かる既存タブ名と、入力を邪魔しない前回値表示領域を持つ', () => {
  const expected = {
    'index.html': ['通常計算', '逆算モード', 'ウィークリーリワード記録'],
    'en/index.html': ['Standard', 'Reverse', 'Weekly Rewards Diary'],
    'ko/index.html': ['일반 계산', '역산 모드', '주간 리워드 일기'],
    'tw/index.html': ['一般計算', '逆算模式', '每週獎勵日記'],
    'hk/index.html': ['一般計算', '逆算模式', '每週獎勵日記'],
    'in/index.html': ['Standard', 'Reverse', 'Weekly Rewards Diary']
  };

  for (const [indexPath, labels] of Object.entries(expected)) {
    const html = read(indexPath);
    labels.forEach(label => assert.ok(html.includes(label), indexPath + ': missing ' + label));
    assert.ok(html.includes('id="calculator-last-value"'), indexPath + ': memory UI missing');
    const needed = html.indexOf('id="neededPoints"');
    const calculate = html.indexOf('id="calculateButton"');
    const advanced = html.indexOf('id="calculator-advanced-settings"');
    assert.ok(needed >= 0 && needed < calculate && calculate < advanced, indexPath + ': mobile primary action order');
  }

  const firstView = read('js/first-view.js');
  assert.doesNotMatch(firstView, /ANALYTICS|gtag|dataLayer/, 'raw previous values must not enter analytics code');
  assert.match(read('privacy.html'), /直近の通常計算で入力した現在・目標ステータスと必要ポイント/);
});



test('モード別ガイドは初期表示に載せず、逆算・週次の操作時だけ遅延読込する', () => {
  const ui = read('js/ui.js');
  const experience = read('js/home-experience.js');
  const worker = read('sw.js');

  assert.match(ui, /import\('\/js\/home-experience\.js\?v=[^']+'\)/);
  assert.match(ui, /window\.scrollY < HOME_EXPERIENCE_SCROLL_THRESHOLD/);
  assert.match(ui, /window\.addEventListener\('scroll', loadAfterScroll/);
  assert.doesNotMatch(worker, /home-experience\.js/, 'home experience must not inflate initial Service Worker precache');
  assert.match(experience, /descriptions:[\s\S]*?reverse:[\s\S]*?diary:/);
});

test('週次モードは週次記事だけを見える2列カードで案内する', () => {
  const experience = read('js/home-experience.js');

  assert.match(experience, /ウィークリー関連ガイド/);
  assert.match(experience, /ボタンがない・受け取れない時/);
  assert.match(experience, /スーパーウィークリーの条件・賞品/);
  assert.match(experience, /mode-context-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(experience, /mainOnlySections/);
  assert.match(experience, /for \(const section of sections\) setVisible\(section, isMain\)/);
});

test('スマホ記事導線はカードを2列にし、極小幅だけ1列へ退避する', () => {
  const experience = read('js/home-experience.js');

  assert.match(experience, /@media\(max-width:640px\)[^\n]*article-link-list\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(experience, /@media\(max-width:340px\)\{\.mode-context-grid,\.article-link-list\{grid-template-columns:1fr\}/);
  assert.match(experience, /article-link-title\{font-size:\.93rem/);
});

test('計算フローはGoogleコア4色を段階と接続へ使う', () => {
  const svg = read('images/calculation-flow.svg');

  for (const hex of ['#4285F4', '#EA4335', '#FBBC04', '#34A853']) {
    assert.ok(svg.includes(hex), `missing Google core color: ${hex}`);
  }
  assert.match(svg, /id="link12"/);
  assert.match(svg, /id="link23"/);
  assert.doesNotMatch(svg, /#58a6ff|#3fb950/i);
});

test('トップ下部は機能説明とおすすめ利用場面を分け、ランクの表情・FAQを残す', () => {
  const html = read('index.html');
  const css = read('style.css');
  const experience = read('js/home-experience.js');
  const compactFlow = read('images/calculation-flow-compact.svg');
  const description = html.match(/<!-- DESCRIPTION_SECTION_START -->([\s\S]*?)<!-- DESCRIPTION_SECTION_END -->/)?.[1] || '';
  const articles = html.match(/<!-- ARTICLE_DRAWER_START -->([\s\S]*?)<!-- ARTICLE_DRAWER_END -->/)?.[1] || '';
  const faq = html.match(/<!-- FAQ_SECTION_START -->([\s\S]*?)<!-- FAQ_SECTION_END -->/)?.[1] || '';

  assert.ok(description.includes('class="home-description-lead"'));
  assert.match(description, /このサイトでは/);
  assert.match(description, /目標ステータスまでに必要な課金額/);
  assert.match(description, /○○円なら何ポイント？」といった逆算/);
  assert.match(description, /毎週お楽しみのウィークリーリワード記録/);
  assert.doesNotMatch(description, /<br>/);
  assert.match(description, /<strong>こんな人におすすめ<\/strong>/);
  assert.doesNotMatch(description, /<strong>目標ステータス|<strong>5,000円|<strong>毎週のウィークリー|ランクアップ<\/strong>|あと1,000pt。<\/strong>|1年分まとめて振り返りたい<\/strong>/);
  assert.ok(description.includes('class="home-use-cases"'));
  assert.equal((description.match(/<li>/g) || []).length, 4);
  assert.match(description, /ダイヤモンドへの[\s\S]*ランクアップ/);
  assert.match(description, /あと1,000pt/);
  assert.match(description, /5,000円課金したら何ポイント/);
  assert.match(description, /1年分まとめて振り返りたい/);
  assert.doesNotMatch(description, /を、/);
  assert.match(description, /images\/calculation-flow-compact\.svg/);
  assert.match(compactFlow, /1,728 pt/);
  assert.match(compactFlow, /2\.0 pt/);
  assert.match(compactFlow, /¥86,400/);
  assert.doesNotMatch(compactFlow, /POINTS|RATE|ESTIMATE|GOAL GAP|REWARD CONDITION|SPENDING GUIDE/);

  assert.equal((articles.match(/home-rank-card--/g) || []).length, 4);
  for (const rank of ['silver', 'gold', 'platinum', 'diamond']) {
    assert.ok(articles.includes(`home-rank-card--${rank}`), `missing rank card style: ${rank}`);
  }
  assert.equal((articles.match(/class="home-rank-hint"/g) || []).length, 4);
  assert.ok(articles.includes('class="home-guide-shortcuts"'));
  assert.doesNotMatch(articles, /2026-03-10-play-points-reflection-timing|2025-12-25-best-use|2026-06-20-discount-gift-cards/);

  assert.equal((faq.match(/<details class="faq-item">/g) || []).length, 3);
  assert.match(faq, /Q\. このサイトはGoogle公式ですか？/);
  assert.match(faq, /たびたび出てくる「1,728」って何ですか？/);
  assert.match(faq, /info\.html#about-section/);
  assert.match(faq, /入力した内容やウィークリー記録はどこに保存されますか/);
  assert.doesNotMatch(faq, /計算結果どおりのポイントが必ず付与されますか/);
  assert.ok(faq.indexOf('このサイトはGoogle公式ですか？') < faq.indexOf('たびたび出てくる「1,728」って何ですか？'));

  assert.match(css, /\.home-secondary-section\s*\{/);
  assert.match(css, /\.home-rank-links\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(experience, /\.home-use-cases\{/);
  assert.match(experience, /\.home-rank-card--silver\{/);
  assert.match(experience, /\.home-rank-card--gold\{/);
  assert.match(experience, /\.home-rank-card--platinum\{/);
  assert.match(experience, /\.home-rank-card--diamond\{/);
});

test('右下の先頭へ戻るボタンは十分なタップ領域とreduced-motion対応を持つ', () => {
  const experience = read('js/home-experience.js');
  const backToTop = read('js/home-back-to-top.js');

  assert.match(experience, /import \{ ensureBackToTop \} from '\.\/home-back-to-top\.js'/);
  assert.match(backToTop, /\.back-to-top\{[^\n]*width:48px;height:48px/);
  assert.match(backToTop, /backToTopButton\.id = 'back-to-top'/);
  assert.match(backToTop, /function warpToTop\(/);
  assert.match(backToTop, /back-to-top-warp-streak/);
  assert.match(backToTop, /requestAnimationFrame/);
  assert.match(backToTop, /window\.scrollTo\(0, 0\)/);
  assert.match(backToTop, /backToTopButton\.dataset\.visible/);
  assert.match(backToTop, /prefers-reduced-motion: reduce/);
});
