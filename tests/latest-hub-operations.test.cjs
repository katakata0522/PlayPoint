'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { CONTENT_DATE_OVERRIDES } = require('../scripts/html-sync.cjs');
const {
  extractVerificationDate,
  validateLatestHub
} = require('../scripts/latest-hub-audit.cjs');

const root = path.resolve(__dirname, '..');
const latestPath = path.join(root, 'latest', 'index.html');
// 実ページそのものの契約確認と、日付ロジックの境界値テストを分離する。
// 境界値テストは最小の合成HTMLを使い、公開ページの本文や更新日へ結合させない。
const latestHtml = fs.readFileSync(latestPath, 'utf8');
const verificationDate = extractVerificationDate(latestHtml);

function buildLatestHubFixture({ verified = '2026-08-24', nextCheck = '2026-08-28' } = {}) {
  return `
    <time data-latest-verified datetime="${verified}">${verified}</time>
    <span>公開公式情報で確認</span>
    <span>アカウント内で確認</span>
    <span>未確認情報</span>
    <section data-source-scope="public"></section>
    <section data-source-scope="account"></section>
    <a href="https://support.google.com/googleplay/answer/9077312">公式</a>
    <a href="https://support.google.com/googleplay/answer/9077192">公式</a>
    <a href="https://support.google.com/googleplay/answer/9080348">公式</a>
    <a href="https://support.google.com/googleplay/answer/9077247">公式</a>
    <span>次回確認目安: ${nextCheck}頃</span>
  `;
}

test('最新情報ハブは確認範囲・公式参照・確認日・次回確認目安を明示する', () => {
  const result = validateLatestHub(latestHtml);

  assert.equal(result.verificationDate, verificationDate);
  assert.ok(result.nextCheckDates.length > 0, '次回確認目安が抽出できません');
  assert.ok(result.nextCheckDates.every(date => /^\d{4}-\d{2}-\d{2}$/.test(date)));
  assert.ok(latestHtml.includes(`<meta name="last-modified" content="${verificationDate}">`));
  assert.match(latestHtml, new RegExp(`"dateModified"\\s*:\\s*"${verificationDate}"`));
  assert.ok(latestHtml.includes(`最終更新: <time datetime="${verificationDate}">${verificationDate}</time>`));
  assert.match(latestHtml, /<header class="site-header guide-header"/);
  assert.match(latestHtml, /<nav class="global-nav ja-global-nav" aria-label="目的から探す"/);
});

test('最新情報ハブは週次3制度とクエストを別項目として扱う', () => {
  assert.ok(latestHtml.includes('通常週次｜公開公式情報で確認'));
  assert.ok(latestHtml.includes('スーパー週次｜公開公式情報で確認'));
  assert.ok(latestHtml.includes('Play Pass週次｜公開公式情報で確認'));
  assert.ok(latestHtml.includes('クエスト｜対象者はアカウント内で確認'));
  assert.ok(latestHtml.includes('../articles/2026-07-31-super-weekly-reward.html'));
  assert.ok(latestHtml.includes('../articles/2026-07-31-google-play-quests.html'));
});

test('生成処理は公開ページの公式確認日を内容日SSOTとして使う', () => {
  assert.equal(CONTENT_DATE_OVERRIDES['latest/index.html'], verificationDate);
});

test('鮮度検査は確認日から14日を超えた状態を検出する', () => {
  const html = buildLatestHubFixture({ verified: '2026-08-01', nextCheck: '2026-08-31' });

  assert.throws(
    () => validateLatestHub(html, {
      enforceFreshness: true,
      maxAgeDays: 14,
      now: new Date('2026-08-16T12:00:00+09:00')
    }),
    /公式確認から15日経過/
  );
});

test('次回確認目安の期限超過は明示的な監視時だけ失敗させる', () => {
  const html = buildLatestHubFixture({ verified: '2026-08-01', nextCheck: '2026-08-10' });
  const overdueNow = new Date('2026-08-11T12:00:00+09:00');

  assert.doesNotThrow(() => validateLatestHub(html, {
    enforceFreshness: true,
    maxAgeDays: 365,
    now: overdueNow
  }));

  assert.throws(
    () => validateLatestHub(html, {
      enforceFreshness: true,
      enforceNextCheckDates: true,
      maxAgeDays: 365,
      now: overdueNow
    }),
    /次回確認目安を1日超過/
  );
});

test('次回確認目安は公式確認日より前に設定できない', () => {
  const invalidHtml = buildLatestHubFixture({ verified: '2026-08-24', nextCheck: '2026-08-23' });

  assert.throws(
    () => validateLatestHub(invalidHtml),
    /次回確認目安が最終確認日より前/
  );
});

test('存在しない公式確認日をカレンダー上の日付へ丸めて受理しない', () => {
  const invalidHtml = buildLatestHubFixture({ verified: '2026-02-31', nextCheck: '2026-03-05' });

  assert.throws(
    () => validateLatestHub(invalidHtml),
    /日付として解析できません: 2026-02-31/
  );
});

test('存在しない次回確認目安をカレンダー上の日付へ丸めて受理しない', () => {
  const invalidHtml = buildLatestHubFixture({ verified: '2026-04-24', nextCheck: '2026-04-31' });

  assert.throws(
    () => validateLatestHub(invalidHtml),
    /日付として解析できません: 2026-04-31/
  );
});

test('うるう年の実在する2月29日は有効な日付として扱う', () => {
  const html = buildLatestHubFixture({ verified: '2028-02-29', nextCheck: '2028-03-05' });

  assert.doesNotThrow(() => validateLatestHub(html));
});

test('鮮度検査は日本時間の日付をUTC前日の未来日と誤判定しない', () => {
  const html = buildLatestHubFixture({ verified: '2026-08-24', nextCheck: '2026-08-28' });

  assert.doesNotThrow(() => validateLatestHub(html, {
    enforceFreshness: true,
    maxAgeDays: 14,
    now: new Date('2026-08-24T00:30:00+09:00')
  }));
});

test('運用手順は日付だけの更新と個別オファーの一般化を禁止する', () => {
  const guide = fs.readFileSync(path.join(root, 'docs', 'LATEST_HUB_MAINTENANCE.md'), 'utf8');

  assert.ok(guide.includes('確認せずに日付だけを更新しない'));
  assert.ok(guide.includes('個別オファーを全利用者向けの情報として掲載しない'));
  assert.ok(guide.includes('latest/index.html'));
  assert.ok(guide.includes('CONTENT_DATE_OVERRIDES'));
});

test('最新情報ハブはLP共通の同意付き計測runtimeを直接読み込む', () => {
  assert.match(latestHtml, /<script\s+src=["']\/js\/analytics-core\.js\?v=[^"']+["']/);
  assert.match(latestHtml, /<script\s+src=["']\/js\/intent-tracking\.js\?v=[^"']+["']/);
  assert.match(latestHtml, /<script\s+src=["']\/js\/third-party\.js\?v=[^"']+["']/);

  const analyticsIndex = latestHtml.indexOf('/js/analytics-core.js');
  const thirdPartyIndex = latestHtml.indexOf('/js/third-party.js');
  const componentsIndex = latestHtml.indexOf('../blog/components.js');
  assert.ok(analyticsIndex >= 0 && thirdPartyIndex > analyticsIndex);
  assert.ok(componentsIndex > thirdPartyIndex, 'latest: LP analytics/consent runtime must initialize before common components');
});

test('最新情報ハブの共通componentはlatest階層からサイトルートの同意管理を要求する', () => {
  assert.match(latestHtml, /<script\s+src=["']\.\.\/blog\/components\.js\?v=[^"']+["']/);

  const appended = [];
  let domReady = null;
  const makeElement = tagName => ({
    tagName: String(tagName).toUpperCase(),
    dataset: {},
    className: '',
    innerHTML: '',
    rel: '',
    href: '',
    src: '',
    async: false,
    crossOrigin: '',
    addEventListener() {},
    setAttribute() {},
    append() {},
    appendChild() {},
    insertAdjacentElement() {}
  });
  const document = {
    head: { appendChild(node) { appended.push(node); } },
    body: {
      firstChild: null,
      insertBefore() {},
      appendChild() {}
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement: makeElement,
    addEventListener(type, handler) {
      if (type === 'DOMContentLoaded') domReady = handler;
    }
  };
  const window = {
    location: { pathname: '/latest/' },
    navigator: {},
    PlayPointAnalytics: {
      installGtagBridge() {},
      markAnalyticsReady() {}
    },
    requestIdleCallback(callback) { callback(); },
    setTimeout(callback) { callback(); },
    matchMedia() { return { matches: false }; },
    gtag() {}
  };
  const context = {
    window,
    document,
    console: { error() {}, warn() {} },
    localStorage: { getItem() { return null; } },
    Date,
    Promise,
    setTimeout: window.setTimeout
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'blog', 'components.js'), 'utf8'), context, { filename: 'components.js' });
  assert.equal(typeof domReady, 'function');
  domReady();

  const consentRequest = appended.find(node => String(node.src || '').includes('/js/consent.js'));
  assert.ok(consentRequest, 'latest page did not request the shared consent manager');
  assert.match(consentRequest.src, /^\.\.\/js\/consent\.js\?v=/);
});


const { classifyBenefit } = require('../latest/hub.js');

test('期限付き企画は日本時間の開始・7日前・終了の境界で分類が切り替わる', () => {
  const offer = { category: 'points', start: '2026-09-10T10:00:00+09:00', end: '2026-10-16T10:00:00+09:00' };
  const at = value => classifyBenefit(offer, Date.parse(value));
  assert.equal(at('2026-09-10T09:59:59+09:00'), 'upcoming');
  assert.equal(at(offer.start), 'active');
  assert.equal(at('2026-10-09T09:59:59+09:00'), 'active');
  assert.equal(at('2026-10-09T10:00:00+09:00'), 'soon');
  assert.equal(at('2026-10-16T09:59:59+09:00'), 'soon');
  assert.equal(at(offer.end), 'ended');
});

test('その他の製品特典は期限間近でもポイント企画に混ぜず、終了後は終了扱いにする', () => {
  const offer = { category: 'other', end: '2027-03-31T23:46:00+09:00' };
  assert.equal(classifyBenefit(offer, Date.parse('2027-03-30T12:00:00+09:00')), 'other');
  assert.equal(classifyBenefit(offer, Date.parse(offer.end)), 'ended');
});

test('期限不明の個別報告・週次特典をまもなく終了や開始予定にしない', () => {
  assert.equal(classifyBenefit({ category: 'other', kind: 'report' }), 'other');
  assert.equal(classifyBenefit({ category: 'points', kind: 'weekly' }), 'active');
  assert.equal(classifyBenefit({ category: 'points', end: 'invalid-date' }), 'unknown');
});

test('同じ状態の定期確認はDOMを書き換えず、開始・終了時刻では表示を更新する', () => {
  const vm = require('node:vm');
  let now = Date.parse('2026-09-01T00:00:00Z'), writes = 0, timer, focused;
  function node() {
    const value = { dataset: {}, handlers: {}, attributes: {},
      setAttribute(key, text) { writes++; this.attributes[key] = text; },
      addEventListener(key, callback) { this.handlers[key] = callback; },
      focus() { focused = this; }, append(child) { writes++; child.parentElement = this; } };
    for (const key of ['hidden', 'textContent', 'tabIndex']) {
      let stored;
      Object.defineProperty(value, key, { get: () => stored, set: next => { writes++; stored = next; } });
    }
    return value;
  }
  const tabs = ['active', 'soon', 'upcoming', 'other'].map(filter => { const tab = node(); tab.dataset.filter = filter; return tab; });
  const grid = node(), endedList = node(), ended = node(), count = node(), badge = node(), message = node(), empty = node();
  empty.querySelector = () => message;
  const card = node(); card.dataset = { category: 'points', kind: 'dated', start: '2026-09-02T00:00:00Z', end: '2026-09-15T00:00:00Z' };
  card.querySelector = () => badge; card.parentElement = grid;
  const nodes = { '#benefit-panel .benefit-grid': grid, '#benefit-panel': node(), '.benefit-ended': ended,
    '[data-ended-list]': endedList, '.benefit-count': count, '.benefit-empty': empty, '[data-filter-note]': node(), '[role="tablist"]': node() };
  const board = { querySelector: key => nodes[key], querySelectorAll: key => key === '[role="tab"]' ? tabs : [card] };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'latest/hub.js'), 'utf8'), {
    Date: { now: () => now, parse: Date.parse }, window: { setInterval(callback) { timer = callback; } },
    document: { hidden: false, querySelector: () => board, addEventListener() {} }
  });
  tabs[2].handlers.click(); assert.equal(card.hidden, false); assert.equal(count.textContent, '1件の情報');
  writes = 0; timer(); timer(); assert.equal(writes, 0, '変化のない確認で読み上げ領域を更新しない');
  now = Date.parse(card.dataset.start); timer(); assert.equal(card.hidden, true);
  tabs[0].handlers.click(); assert.equal(card.hidden, false); assert.equal(badge.textContent, '開催期間中');
  now = Date.parse('2026-09-10T00:00:00Z'); timer(); assert.equal(badge.textContent, 'まもなく終了');
  assert.equal(card.hidden, false, '終了間近も開催中に含む');
  tabs[0].handlers.keydown({ key: 'Home', preventDefault() {} }); assert.equal(focused, tabs[0]);
  now = Date.parse(card.dataset.end); timer(); assert.equal(card.parentElement, endedList);
  assert.equal(ended.hidden, false); assert.equal(count.textContent, '0件の情報'); assert.equal(badge.textContent, '終了');
});
