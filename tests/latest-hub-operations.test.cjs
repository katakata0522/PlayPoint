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

test('Play Pass週次は対象家族とGoogle公式の確認場所を明示し、通常週次と混同しない', () => {
  const card = latestHtml.match(/<article[^>]*data-benefit-id="play-pass"[^>]*>[\s\S]*?<\/article>/)?.[0];
  assert.ok(card, 'Play Pass card is required');
  assert.match(card, /ファミリーグループメンバー/, '対象家族を除外しない');
  assert.match(card, /Google Playストア下部の「Play Pass」/, '確認先はPlay Passタブ');
  assert.match(card, /個別の適用可否はアカウント内の表示が優先/, '全員への提供を断定しない');
  assert.match(card, /answer\/16507543/, 'Play Pass公式情報への参照を維持する');

  const ordinaryCard = latestHtml.match(/<article[^>]*data-benefit-id="weekly-points"[^>]*>[\s\S]*?<\/article>/)?.[0];
  assert.ok(ordinaryCard, 'ordinary weekly card is required');
  assert.match(ordinaryCard, /「Play Points」→「特典」/, '通常週次の確認先はPlay Pointsの特典');
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


const { classifyBenefit, matchesAudience, matchesFilter } = require('../latest/hub.js');

test('特典の絞り込みは既知の対象条件だけ除外し、未指定や個別オファーを隠さない', () => {
  assert.equal(matchesAudience({ minRank: 'silver' }, 'bronze'), false);
  assert.equal(matchesAudience({ minRank: 'silver' }, 'silver'), true);
  assert.equal(matchesAudience({ minRank: 'platinum' }, 'gold'), false);
  assert.equal(matchesAudience({ minRank: 'platinum' }, 'diamond'), true);
  assert.equal(matchesAudience({ requiresPass: 'true' }, 'gold', 'no'), false);
  assert.equal(matchesAudience({ requiresPass: 'true' }, 'bronze', 'yes'), true);
  assert.equal(matchesAudience({ minRank: 'platinum', requiresPass: 'true' }), true);
  assert.equal(matchesAudience({ kind: 'account' }, 'bronze', 'no'), true);
});

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

test('製品割引も期間を独立して判定し、終了後は終了扱いにする', () => {
  const offer = { category: 'other', end: '2027-03-31T23:46:00+09:00' };
  assert.equal(classifyBenefit(offer, Date.parse('2027-03-30T12:00:00+09:00')), 'soon');
  assert.equal(classifyBenefit(offer, Date.parse(offer.end)), 'ended');
});

test('期限不明の配布報告と、継続中の週次・個別特典を区別する', () => {
  assert.equal(classifyBenefit({ category: 'other', kind: 'report' }), 'unknown');
  assert.equal(classifyBenefit({ category: 'points', kind: 'weekly' }), 'active');
  assert.equal(classifyBenefit({ category: 'points', kind: 'account' }), 'active');
  assert.equal(classifyBenefit({ category: 'points', end: 'invalid-date' }), 'unknown');
});

test('時期別の4タブは終了間近を開催中に含め、日時不明と終了を混同しない', () => {
  for (const state of ['active', 'soon', 'upcoming', 'ended', 'unknown']) {
    assert.equal(matchesFilter(state, 'all'), true, state);
    assert.equal(matchesFilter(state, 'active'), ['active', 'soon'].includes(state), state);
    assert.equal(matchesFilter(state, 'upcoming'), state === 'upcoming', state);
    assert.equal(matchesFilter(state, 'ended'), state === 'ended', state);
  }
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
  const tabs = ['all', 'active', 'upcoming', 'ended'].map(filter => { const tab = node(); tab.dataset.filter = filter; return tab; });
  const grid = node(), count = node(), badge = node(), message = node(), empty = node();
  empty.querySelector = () => message;
  const card = node(); card.dataset = { category: 'points', kind: 'dated', start: '2026-09-02T00:00:00Z', end: '2026-09-15T00:00:00Z' };
  card.querySelector = () => badge; card.parentElement = grid;
  // 後から追加された広告などを、タブ操作のたびに末尾へ押し出さない。
  grid.children = [node(), card];
  const nodes = { '#benefit-panel .benefit-grid': grid, '#benefit-panel': node(),
    '.benefit-count': count, '.benefit-empty': empty, '[data-filter-note]': node(), '[role="tablist"]': node() };
  const board = { querySelector: key => nodes[key], querySelectorAll: key => key === '[role="tab"]' ? tabs : [card] };
  const boot = search => vm.runInNewContext(fs.readFileSync(path.join(root, 'latest/hub.js'), 'utf8'), {
    Date: { now: () => now, parse: Date.parse }, window: { location: { search }, setInterval(callback) { timer = callback; } },
    document: { hidden: false, querySelector: () => board, addEventListener() {} }
  });
  boot('?filter=upcoming');
  assert.equal(tabs[2].attributes['aria-selected'], 'true', '以前の開始予定リンクで開始予定のタブを開く');
  assert.equal(card.hidden, false, '直接リンクの初回描画で開始前の企画を表示する');
  assert.equal(badge.textContent, '開始予定');
  writes = 0; timer(); timer(); assert.equal(writes, 0, '変化のない確認で読み上げ領域を更新しない');
  now = Date.parse(card.dataset.start); timer(); assert.equal(card.hidden, true);
  tabs[1].handlers.click(); assert.equal(card.hidden, false); assert.equal(badge.textContent, '開催中');
  now = Date.parse('2026-09-10T00:00:00Z'); timer(); assert.equal(badge.textContent, 'まもなく終了');
  assert.equal(card.hidden, false, '終了間近も開催中に含む');
  tabs[0].handlers.keydown({ key: 'Home', preventDefault() {} }); assert.equal(focused, tabs[0]);
  tabs[1].handlers.click();
  now = Date.parse(card.dataset.end); timer(); assert.equal(card.hidden, true);
  assert.equal(count.textContent, '0件の情報'); assert.equal(badge.textContent, '終了');
  tabs[3].handlers.click(); assert.equal(card.hidden, false); assert.equal(count.textContent, '1件の情報');
  tabs[0].handlers.click(); assert.equal(card.hidden, false, 'すべてには終了済みも残す');
  for (const [legacy, expected] of [['points',0], ['gift',0], ['other',0], ['soon',1], ['ended',3]]) {
    boot('?filter=' + legacy);
    assert.equal(tabs[expected].attributes['aria-selected'], 'true', legacy + ' のリンクを引き継ぐ');
  }
});
