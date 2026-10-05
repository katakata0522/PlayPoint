'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { PHASE2_MEASUREMENT_BASELINE: baseline } = require('../scripts/measurement-baseline.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function inclusiveDays(start, end) {
  const day = 24 * 60 * 60 * 1000;
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / day) + 1;
}

test("保存済み計測baselineは有効な比較窓と利用者単位を区別する", () => {
  assert.equal(inclusiveDays(baseline.sourceWindow.start, baseline.sourceWindow.end), baseline.sourceWindow.days);
  assert.ok(baseline.sourceWindow.days > 0);
  assert.equal(baseline.decisionUnits.primaryUserUnit, 'activeUsers');
  assert.equal(baseline.decisionUnits.diagnosticCountUnit, 'eventCount');
  assert.equal(baseline.decisionUnits.unavailableValue, 'UNAVAILABLE');
});

test("legacy AdSense PAGE_URL breakdown is diagnostic-only and cannot become the scheduled page-revenue SSOT", () => {
  const { source } = loadP12Runtime();
  // 自動収集モジュールにAdSense PAGE_URL呼出を混在させないownership境界。
  assert.doesNotMatch(source, /AdSense[^\n]*PAGE_URL[^\n]*reports:generate/);
});

function loadGscCaptureRuntime() {
  const source = read('scripts/gsc-nonoverlap-28d.gs');
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'gsc-nonoverlap-28d.gs' });
  return { source, context };
}

test("GSC capture module keeps adjacent non-overlapping 28-day query × exact URL FINAL windows", () => {
  const { context } = loadGscCaptureRuntime();
  const windows = context.playPointGscBuildWindows_('2026-09-11');
  assert.deepEqual(JSON.parse(JSON.stringify(windows)), {
    current: { start: '2026-08-15', end: '2026-09-11', days: 28 },
    previous: { start: '2026-07-18', end: '2026-08-14', days: 28 }
  });
  const requests = [];
  context.PLAYPOINT_GSC_28D_CONFIG = { ...context.PLAYPOINT_GSC_28D_CONFIG, rowLimit: 2 };
  context.playPointGscQueryApi_ = (_site, body) => {
    requests.push(JSON.parse(JSON.stringify(body)));
    assert.ok(requests.length <= 3, 'ページ送りが進まない');
    return { responseAggregationType: body.aggregationType, rows: body.startRow === 0 ? [
      { keys: ['q', 'https://playpoint-sim.com/a#one'], clicks: 1, impressions: 2 },
      { keys: ['q', 'https://playpoint-sim.com/a#two'], clicks: 3, impressions: 4 }
    ] : [] };
  };
  const raw = context.playPointGscFetchQueryPageRows_('sc-domain:playpoint-sim.com', windows.current.start, windows.current.end);
  assert.equal(raw.rows.length, 2);
  assert.equal(raw.rows[0].exactUrl, 'https://playpoint-sim.com/a#one');
  assert.equal(raw.rows[0].baseUrl, 'https://playpoint-sim.com/a');
  assert.deepEqual(requests.map(r => r.startRow), [0, 2]);
  for (const request of requests) {
    assert.deepEqual(request.dimensions, ['query', 'page']);
    assert.equal(request.dataState, 'final');
    assert.equal(request.aggregationType, 'byPage');
    assert.equal(request.startDate, windows.current.start);
    assert.equal(request.endDate, windows.current.end);
  }
  context.playPointGscFetchPropertyTotal_('sc-domain:playpoint-sim.com', windows.current.start, windows.current.end);
  assert.deepEqual(requests.at(-1).dimensions, []);
  assert.equal(requests.at(-1).aggregationType, 'byProperty');
  assert.equal(requests.at(-1).dataState, 'final');
  context.playPointGscQueryApi_ = () => ({ responseAggregationType: 'byProperty', rows: [] });
  assert.throws(() => context.playPointGscFetchQueryPageRows_('site', '2026-08-15', '2026-09-11'), /aggregation/i);
});
test('GSC normalization strips fragments only and aggregates position by impressions', () => {
  const { context } = loadGscCaptureRuntime();
  const rows = context.playPointGscNormalizeRows_([
    {
      query: 'diamond cost',
      exactUrl: 'https://playpoint-sim.com/status/diamond/#result',
      clicks: 2,
      impressions: 10,
      ctr: 0.2,
      position: 4
    },
    {
      query: 'diamond cost',
      exactUrl: 'https://playpoint-sim.com/status/diamond/#details',
      clicks: 1,
      impressions: 30,
      ctr: 1 / 30,
      position: 8
    }
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].baseUrl, 'https://playpoint-sim.com/status/diamond/');
  assert.equal(rows[0].clicks, 3);
  assert.equal(rows[0].impressions, 40);
  assert.equal(rows[0].ctr, 3 / 40);
  assert.equal(rows[0].position, 7);
});

test('GSC P0 capture requires Raw, Normalized and Property Total for both windows', () => {
  const { source, context } = loadGscCaptureRuntime();

  const makeRow = (role, layer) => {
    const row = Array(23).fill('');
    row[0] = 'pair';
    row[1] = role;
    row[2] = layer;
    return row;
  };

  const complete = [
    makeRow('current_28d', 'raw'),
    makeRow('current_28d', 'normalized'),
    makeRow('current_28d', 'property_total'),
    makeRow('previous_28d', 'raw'),
    makeRow('previous_28d', 'normalized'),
    makeRow('previous_28d', 'property_total')
  ];

  assert.equal(context.playPointGscPairComplete_(complete), true);
  for (let index = 0; index < complete.length; index += 1) {
    assert.equal(context.playPointGscPairComplete_(complete.filter((_, i) => i !== index)), false);
  }
  assert.equal(context.playPointGscPairComplete_([]), false);
  assert.match(source, /QUERY_PAGE_RAW/);
  assert.match(source, /QUERY_BASE_URL_NORMALIZED/);
  assert.match(source, /PROPERTY_TOTAL/);
  assert.match(source, /site_property/);
  assert.match(source, /request_aggregation_type/);
  assert.match(source, /response_aggregation_type/);
});

test("GSC scheduled capture separates trigger event objects from manual final-end-date strings", () => {
  const { context } = loadGscCaptureRuntime();
  const gateCalls = [];
  context.playPointAutomationTriggerAllowed_ = (handler, event) => { gateCalls.push({handler, event}); return false; };
  const event = { triggerUid: 'stale' };
  assert.equal(context.captureGscNonOverlapping28d(event).status, 'SKIPPED_STALE_TRIGGER');
  assert.equal(gateCalls[0].event, event);
  context.captureGscNonOverlapping28d('2026-09-11');
  assert.equal(gateCalls[1].event, null);
  context.playPointAutomationTriggerAllowed_ = () => true;
  context.playPointGscGetSpreadsheet_ = () => ({});
  context.playPointGscGetSiteUrl_ = () => 'site';
  context.playPointGscFindLatestFinalDate_ = () => '2026-09-10';
  context.playPointGscEnsureHistorySheet_ = () => ({});
  context.playPointGscRowsForPair_ = () => ['complete'];
  context.playPointGscPairComplete_ = () => true;
  context.playPointGscRebuildComparisonViews_ = () => {};
  assert.equal(context.captureGscNonOverlapping28d('2026-09-11').current.end, '2026-09-11');
  assert.equal(context.captureGscNonOverlapping28d(event).current.end, '2026-09-10');
});
test("GSC capture module exposes one idempotent weekly installer and dedicated history/comparison sheets", () => {
  const { context } = loadGscCaptureRuntime();
  const handler = 'captureGscNonOverlapping28d';
  const fixture = stubTriggers(context, handler);
  context.installPlayPointGsc28dWeeklyTrigger();
  context.ScriptApp.getProjectTriggers = () => [fixture.created];
  assert.equal(context.installPlayPointGsc28dWeeklyTrigger(), 'EXISTING_TRIGGER');
  assert.equal(fixture.calls.filter(c => c[0] === 'create').length, 1);
  for (const name of ['historySheet', 'comparisonSheet', 'normalizedComparisonSheet']) assert.ok(context.PLAYPOINT_GSC_28D_CONFIG[name]);
});

function loadP12Runtime() {
  const source = read('scripts/playpoint-analytics-p1p2.gs');
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'playpoint-analytics-p1p2.gs' });
  return { source, context };
}

test("P1/P2 and GSC installers roll back a newly-created trigger if registry activation fails", () => {
  for (const [context, installer, handler] of installerRuntimes()) {
    const old = { getHandlerFunction: () => handler };
    const fixture = stubTriggers(context, handler, [old]);
    context.playPointAutomationRegisterTrigger_ = () => { throw new Error('activation failed'); };
    assert.throws(() => context[installer](), /activation failed/);
    assert.deepEqual(fixture.calls.filter(c => c[0] === 'delete').map(c => c[1]), [fixture.created]);
  }
});
test("P1/P2 and GSC installers can register an active trigger UID when the v11.6 core is present", () => {
  for (const [context, installer, handler] of installerRuntimes()) {
    const old = { getHandlerFunction: () => handler };
    const unrelated = { getHandlerFunction: () => 'other' };
    const fixture = stubTriggers(context, handler, [old, unrelated]);
    context.playPointAutomationRegisterTrigger_ = (name, trigger) => { fixture.calls.push(['register', name, trigger]); };
    context[installer]();
    const register = fixture.calls.findIndex(c => c[0] === 'register');
    const deletion = fixture.calls.findIndex(c => c[0] === 'delete');
    assert.ok(register >= 0 && register < deletion);
    assert.equal(fixture.calls[register][1], handler);
    assert.equal(fixture.calls[register][2], fixture.created);
    assert.deepEqual(fixture.calls.filter(c => c[0] === 'delete').map(c => c[1]), [old]);
    context.playPointAutomationTriggerAllowed_ = () => false;
    const result = context[handler]({ triggerUid: 'old' });
    assert.equal(Array.isArray(result) ? result[0].status : result.status, 'SKIPPED_STALE_TRIGGER');
  }
});
test("P1/P2 and GSC weekly triggers pin Asia/Tokyo explicitly", () => {
  for (const [context, installer, handler] of installerRuntimes()) {
    const fixture = stubTriggers(context, handler);
    context[installer]();
    assert.deepEqual(fixture.calls.filter(c => c[0] === 'inTimezone'), [['inTimezone', 'Asia/Tokyo']]);
    assert.deepEqual(fixture.calls.filter(c => c[0] === 'onWeekDay'), [['onWeekDay', 'FRIDAY']]);
  }
});
test("P1/P2 and GSC can reuse the core CONFIG instead of depending on hidden script properties", () => {
  for (const [context] of installerRuntimes()) {
    let properties = {};
    context.PropertiesService = { getScriptProperties: () => ({ getProperty: key => properties[key] || null }) };
    context.CONFIG = { SEARCH_CONSOLE_SITE_URL: 'sc-domain:core.example', GA4_PROPERTY_ID: 'core-id' };
    const site = context.playPointP12GetSiteUrl_ || context.playPointGscGetSiteUrl_;
    assert.equal(site(), 'sc-domain:core.example');
    properties.SEARCH_CONSOLE_SITE_URL = 'sc-domain:property.example';
    assert.equal(site(), 'sc-domain:property.example');
    if (context.playPointP12GetGa4PropertyId_) {
      assert.equal(context.playPointP12GetGa4PropertyId_(), 'core-id');
      properties.GA4_PROPERTY_ID = 'property-id';
      assert.equal(context.playPointP12GetGa4PropertyId_(), 'property-id');
    }
  }
});

test("P1/P2 collector is valid JavaScript and exposes one capture plus one idempotent weekly installer", () => {
  const { context } = loadP12Runtime();
  assert.equal(typeof context.capturePlayPointAnalyticsP1P2, 'function');
  const fixture = stubTriggers(context, 'capturePlayPointAnalyticsP1P2');
  context.installPlayPointAnalyticsP1P2WeeklyTrigger();
  context.ScriptApp.getProjectTriggers = () => [fixture.created];
  context.installPlayPointAnalyticsP1P2WeeklyTrigger();
  assert.equal(fixture.calls.filter(c => c[0] === 'create').length, 1);
});
test("P1 Organic landing uses query-free landingPage so activeUsers are not re-summed across query variants", () => {
  const { context } = loadP12Runtime();
  let request;
  context.playPointP12Ga4Report_ = (_id, body) => { request = body; return { rows: [{ dimensionValues: [{ value: '/article' }], metricValues: [{ value: '7' }, { value: '4' }] }] }; };
  const rows = context.playPointP12FetchOrganicLandings_('id', {start:'2026-08-01',end:'2026-08-30'});
  assert.deepEqual(JSON.parse(JSON.stringify(request.dimensions)), [{name:'landingPage'}]);
  assert.deepEqual(JSON.parse(JSON.stringify(request.metrics)), [{name:'sessions'},{name:'activeUsers'}]);
  assert.equal(request.dimensionFilter.filter.stringFilter.value, 'Organic Search');
  assert.equal(rows[0].page, '/article');
  assert.equal(rows[0].activeUsers, 4);
});
test('P1 page-value aggregation keeps unavailable GSC and Organic metrics blank instead of false zeroes', () => {
  const { context } = loadP12Runtime();
  const rows = context.playPointP12BuildPageValueRows_({
    gscRows: [],
    organicRows: [],
    articleClickRows: [],
    attributedRows: [],
    revenueRows: [{
      page: '/article',
      totalAdRevenue: 3,
      publisherAdImpressions: 10,
      publisherAdClicks: 1,
      screenPageViews: 20
    }],
    availability: {
      gsc: false,
      organic: false,
      articleClicks: false,
      attributed: false,
      revenue: true
    }
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].searchClicks, null);
  assert.equal(rows[0].searchImpressions, null);
  assert.equal(rows[0].searchCtr, null);
  assert.equal(rows[0].organicSessions, null);
  assert.equal(rows[0].organicUsers, null);
  assert.equal(rows[0].pageAdRevenue, 3);
  assert.equal(rows[0].revenuePerOrganicUser, null);
  assert.match(rows[0].state, /GSC/);
  assert.match(rows[0].state, /Organic/);
});

test('P1 page-value aggregation keeps unavailable funnel/revenue blank instead of coercing them to zero', () => {
  const { context } = loadP12Runtime();
  const rows = context.playPointP12BuildPageValueRows_({
    gscRows: [{ page: '/article', clicks: 2, impressions: 100 }],
    organicRows: [{ page: '/article', sessions: 10, activeUsers: 8 }],
    articleClickRows: [],
    attributedRows: [],
    revenueRows: [],
    availability: {
      gsc: true,
      organic: true,
      articleClicks: false,
      attributed: false,
      revenue: false
    }
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].searchCtr, 0.02);
  assert.equal(rows[0].organicUsers, 8);
  assert.equal(rows[0].articleToCalculatorUsers, null);
  assert.equal(rows[0].calculatorStartUsers, null);
  assert.equal(rows[0].firstSuccessUsers, null);
  assert.equal(rows[0].userCompletionRate, null);
  assert.equal(rows[0].pageAdRevenue, null);
  assert.equal(rows[0].revenuePerOrganicUser, null);
  assert.match(rows[0].state, /CTA/);
  assert.match(rows[0].state, /Funnel/);
  assert.match(rows[0].state, /Revenue/);
});

test('P1 page-value aggregation uses activeUsers attribution and derives user completion and revenue per organic user', () => {
  const { context } = loadP12Runtime();
  const rows = context.playPointP12BuildPageValueRows_({
    gscRows: [{ page: '/article', clicks: 3, impressions: 60 }],
    organicRows: [{ page: '/article', sessions: 12, activeUsers: 10 }],
    articleClickRows: [{ page: '/article', activeUsers: 4, eventCount: 7 }],
    attributedRows: [
      { page: '/article', eventName: 'calculator_form_started', activeUsers: 3, eventCount: 5 },
      { page: '/article', eventName: 'calculator_funnel_completed', activeUsers: 2, eventCount: 4 }
    ],
    revenueRows: [{
      page: '/article',
      totalAdRevenue: 5,
      publisherAdImpressions: 20,
      publisherAdClicks: 1,
      screenPageViews: 15
    }],
    availability: {
      gsc: true,
      organic: true,
      articleClicks: true,
      attributed: true,
      revenue: true
    }
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].articleToCalculatorUsers, 4);
  assert.equal(rows[0].calculatorStartUsers, 3);
  assert.equal(rows[0].firstSuccessUsers, 2);
  assert.equal(rows[0].userCompletionRate, 2 / 3);
  assert.equal(rows[0].pageAdRevenue, 5);
  assert.equal(rows[0].revenuePerOrganicUser, 0.5);
  assert.equal(rows[0].state, 'OK');
});

test('P1 page normalization joins Search Console absolute URLs with GA4 paths without URL global', () => {
  const { source, context } = loadP12Runtime();

  assert.doesNotMatch(source, /new URL\(/);
  assert.equal(
    context.playPointP12NormalizePage_('https://playpoint-sim.com/articles/example.html?utm=x#section'),
    '/articles/example.html'
  );
  assert.equal(
    context.playPointP12NormalizePage_('/articles/example.html/?utm=x#section'),
    '/articles/example.html'
  );
  assert.equal(
    context.playPointP12NormalizePage_('articles/example.html'),
    '/articles/example.html'
  );
  assert.equal(
    context.playPointP12NormalizePage_('https://example.com/articles/example.html'),
    ''
  );

  const rows = context.playPointP12BuildPageValueRows_({
    gscRows: [{
      page: 'https://playpoint-sim.com/articles/example.html',
      clicks: 12,
      impressions: 300
    }],
    organicRows: [{
      page: '/articles/example.html',
      sessions: 20,
      activeUsers: 18
    }],
    articleClickRows: [],
    attributedRows: [],
    revenueRows: [],
    availability: {
      gsc: true,
      organic: true,
      articleClicks: false,
      attributed: false,
      revenue: false
    }
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].page, '/articles/example.html');
  assert.equal(rows[0].searchClicks, 12);
  assert.equal(rows[0].organicSessions, 20);
});

test("P1 page-value GSC source uses page-only byPage FINAL evidence instead of query by page totals", () => {
  const { context } = loadP12Runtime();
  const requests = [];
  context.playPointP12GoogleJson_ = (url, options) => {
    requests.push({url, body: options.payload});
    return { rows: [{ keys: ['https://playpoint-sim.com/articles/example.html'], clicks: 9, impressions: 240 }], responseAggregationType: 'byPage' };
  };
  const rows = context.playPointP12FetchGscPage_('sc-domain:playpoint-sim.com', '2026-08-18', '2026-09-16');
  assert.equal(requests.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(requests[0].body.dimensions)), ['page']);
  assert.equal(requests[0].body.aggregationType, 'byPage');
  assert.equal(requests[0].body.dataState, 'final');
  assert.equal(requests[0].body.startDate, '2026-08-18');
  assert.equal(requests[0].body.endDate, '2026-09-16');
  assert.equal(rows[0].page, '/articles/example.html');
  assert.equal(rows[0].clicks, 9);
  context.playPointP12GoogleJson_ = () => ({ rows: [], responseAggregationType: 'byProperty' });
  assert.throws(() => context.playPointP12FetchGscPage_('site', '2026-08-18', '2026-09-16'), /aggregation/i);
});
test('P1 page-value join integrity fails closed to PARTIAL when GSC and GA4 keys split', () => {
  const { context } = loadP12Runtime();

  const broken = context.playPointP12AssessPageValueJoin_([
    {
      page: 'https://playpoint-sim.com/articles/example.html',
      searchClicks: 30,
      organicSessions: 0,
      organicUsers: 0
    },
    {
      page: '/articles/example.html',
      searchClicks: 0,
      organicSessions: 40,
      organicUsers: 35
    }
  ]);

  assert.equal(broken.status, 'PARTIAL');
  assert.equal(broken.absoluteUrlKeys, 1);
  assert.equal(broken.joinRate, 0);
  assert.equal(
    context.playPointP12ResultState_('PAGE_VALUE', {
      availability: {
        gsc: true,
        organic: true,
        articleClicks: true,
        attributed: true,
        revenue: true
      },
      joinIntegrity: broken
    }),
    'PARTIAL'
  );

  const healthy = context.playPointP12AssessPageValueJoin_([
    {
      page: '/articles/example.html',
      searchClicks: 30,
      organicSessions: 40,
      organicUsers: 35
    }
  ]);
  assert.equal(healthy.status, 'OK');
  assert.equal(healthy.joinRate, 1);
});

test('P1 safe-source wrapper preserves structured GSC cross rows and response aggregation', () => {
  const { context } = loadP12Runtime();

  const structured = context.playPointP12SafeSource_(() => ({
    rows: [{ query: 'diamond', value: 'jpn' }],
    responseAggregationType: 'byProperty'
  }));

  assert.equal(structured.ok, true);
  assert.equal(Array.isArray(structured.rows), true);
  assert.equal(structured.rows.length, 1);
  assert.equal(structured.rows[0].query, 'diamond');
  assert.equal(structured.responseAggregationType, 'byProperty');
  assert.equal(structured.error, '');

  const simple = context.playPointP12SafeSource_(() => [{ sourceMedium: 'google / organic' }]);
  assert.equal(simple.ok, true);
  assert.equal(Array.isArray(simple.rows), true);
  assert.equal(simple.rows.length, 1);
});

test("P1 GSC cross windows are adjacent non-overlapping 28 days and use query×country/device byProperty FINAL evidence", () => {
  const { context } = loadP12Runtime();
  const windows = context.playPointP12BuildNonOverlapping28d_('2026-09-11');
  assert.deepEqual(JSON.parse(JSON.stringify(windows)), {
    current: { start: '2026-08-15', end: '2026-09-11', days: 28 },
    previous: { start: '2026-07-18', end: '2026-08-14', days: 28 }
  });
  const requests = [];
  context.playPointP12GoogleJson_ = (_url, options) => {
    requests.push(JSON.parse(JSON.stringify(options.payload)));
    return { rows: [], responseAggregationType: 'byProperty' };
  };
  for (const dims of [['query','country'],['query','device']]) context.playPointP12FetchGscCrossPair_('site', windows, dims);
  assert.equal(requests.length, 4);
  for (const [index, request] of requests.entries()) {
    assert.deepEqual(request.dimensions, index < 2 ? ['query','country'] : ['query','device']);
    assert.equal(request.dataState, 'final');
    assert.equal(request.aggregationType, 'byProperty');
    assert.equal(request.startDate, index % 2 === 0 ? windows.current.start : windows.previous.start);
    assert.equal(request.endDate, index % 2 === 0 ? windows.current.end : windows.previous.end);
  }
  let organicRequest;
  context.playPointP12Ga4Report_ = (_id, body) => { organicRequest = body; return { rows: [] }; };
  context.playPointP12FetchOrganicEngines_('id', windows.current);
  assert.deepEqual(JSON.parse(JSON.stringify(organicRequest.dimensions)), [{name:'sessionSourceMedium'}]);
});
test("P2 URL Inspection stays bounded to critical and top-search URLs and records actual per-URL errors", () => {
  const { context } = loadP12Runtime();
  const writes = stubAnalyticsSheet(context);
  context.playPointP12StyleUrlInspectionSheet_ = () => {};
  const candidates = Array.from({length:40}, (_, i) => ['', '', 'https://playpoint-sim.com/article-' + i, '', 100-i]);
  candidates.push(['','','https://example.com/private','',1000]);
  const gsc = {getLastRow:()=>candidates.length+1,getLastColumn:()=>9,getRange:()=>({getValues:()=>candidates})};
  const spreadsheet = {getSheetByName:()=>gsc};
  const priority = context.playPointP12BuildInspectionPriority_(spreadsheet);
  assert.equal(priority.length, 30);
  assert.equal(priority[0].url, 'https://playpoint-sim.com/');
  assert.ok(priority.some(item => item.url === 'https://playpoint-sim.com/games/'));
  assert.ok(priority.every(item => item.url.startsWith('https://playpoint-sim.com/')));
  assert.equal(new Set(priority.map(item=>item.url)).size, priority.length);
  const requests = [];
  context.playPointP12GoogleJson_ = (url, options) => {
    requests.push({url,body:options.payload});
    if (options.payload.inspectionUrl === priority[1].url) throw new Error('fixture URL failure');
    return {inspectionResult:{indexStatusResult:{verdict:'PASS'}}};
  };
  const result = context.playPointP12CaptureUrlInspection_(spreadsheet);
  assert.equal(result.inspected, 30);
  assert.equal(result.errors, 1);
  assert.equal(requests.length, 30);
  assert.ok(requests.every(r=>r.url.endsWith('/urlInspection/index:inspect')));
  const data = writes.find(w=>w.args[0]===7).value;
  assert.equal(data[1][12], 'ERROR');
  assert.match(data[1][13], /fixture URL failure/);
  assert.equal(data.at(-1)[12], 'OK', '個別URL失敗で後続処理を止めない');
});
test("P1/P2 health reporting failures are logged instead of being silently swallowed", () => {
  const { context } = loadP12Runtime();
  const logs = [];
  context.playPointP12Log_ = (...args) => logs.push(args);
  assert.doesNotThrow(() => context.playPointP12TryHealth_('PAGE_VALUE', () => { throw new Error('fixture health failed'); }));
  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], 'WARN');
  assert.equal(logs[0][1], 'PAGE_VALUE');
  assert.match(logs[0][2], /fixture health failed/);
});
test("P1/P2 collector updates health rows from WAITING to RUNNING/OK/PARTIAL/ERROR semantics", () => {
  const { context } = loadP12Runtime();
  const transitions = [];
  context.playPointP12Log_ = () => {};
  context.playPointP12HealthStart_ = stage => transitions.push([stage, 'RUNNING']);
  context.playPointP12HealthSuccess_ = (stage, _at, state) => transitions.push([stage, state]);
  context.playPointP12HealthError_ = (stage, _at, message) => transitions.push([stage, 'ERROR', message]);
  const complete = { availability:{gsc:true,organic:true,articleClicks:true,attributed:true,revenue:true},joinIntegrity:{status:'OK'} };
  for (const [result, expected] of [[complete,'OK'],[{...complete,availability:{...complete.availability,attributed:false}},'PARTIAL']]) {
    assert.equal(context.playPointP12RunStage_('PAGE_VALUE',()=>result).status, expected);
    assert.deepEqual(transitions.splice(0), [['PAGE_VALUE','RUNNING'],['PAGE_VALUE',expected]]);
  }
  assert.equal(context.playPointP12RunStage_('URL_INSPECTION',()=>({errors:2})).status, 'PARTIAL');
  transitions.length=0;
  const failure = context.playPointP12RunStage_('PAGE_VALUE',()=>{throw new Error('fixture stage failed');});
  assert.equal(failure.status, 'ERROR');
  assert.match(failure.error, /fixture stage failed/);
  assert.equal(transitions[0][1], 'RUNNING');
  assert.equal(transitions[1][1], 'ERROR');
});

test('v11.6.2 Drive safety patch separates reconciled analytics success from owner-sensitive archive maintenance', () => {
  const patch = read('docs/patches/playpoint-analytics-v11.6.2-drive-safe.patch');
  const added = patch.split('\n')
    .filter(line => line.startsWith('+') && !line.startsWith('+++'))
    .map(line => line.slice(1))
    .join('\n');

  assert.match(added, /VERSION:\s*'11\.6\.2'/);
  assert.match(added, /recordHealthSuccess_\('DAILY_RECONCILE'/);
  assert.match(added, /月初Driveバックアップを保留（分析本体は成功）/);
  assert.match(added, /完了月Driveアーカイブを保留（分析本体は成功）/);
  assert.ok(
    added.indexOf("recordHealthSuccess_('DAILY_RECONCILE'") <
      added.indexOf('maybeCreateMonthlyBackup_'),
    'daily reconciliation must be marked successful before optional Drive maintenance'
  );

  assert.match(added, /file\.setContent\(content\)/);
  assert.match(added, /uniqueArchiveFallbackName_/);
  assert.doesNotMatch(added, /existing\.next\(\)\.setTrashed\(true\)/);

  const runbook = read('docs/PLAYPOINT_ANALYTICS_DRIVE_SAFETY_2026-09-30.md');
  assert.match(runbook, /Drive補助保存だけ失敗.*日次再照合はRECONCILED/s);
  assert.match(runbook, /trash-first置換を廃止/);
  assert.match(runbook, /6\/6 success/);
});

function stubAnalyticsSheet(context) {
  const writes = [];
  const sheet = { clearContents() {}, getRange(...args) { return {
    setValue(value) { writes.push({ args, value }); },
    setValues(value) { writes.push({ args, value }); }
  }; } };
  context.PropertiesService = { getScriptProperties: () => ({ getProperty: key => key === 'SEARCH_CONSOLE_SITE_URL' ? 'sc-domain:playpoint-sim.com' : null }) };
  context.playPointP12EnsureSheet_ = () => sheet;
  context.playPointP12EnsureRows_ = () => {};
  context.playPointP12StylePageValueSheet_ = () => {};
  context.playPointP12StyleSearchCrossSheet_ = () => {};
  context.playPointP12NowText_ = () => '2026-09-30';
  context.playPointP12BuildGa4Period_ = () => ({ start: '2026-08-29', end: '2026-09-27', days: 30 });
  return writes;
}

test('P1 capture sends the same common window to every source and preserves GA4 when the FINAL probe fails', () => {
  for (const finalEnd of ['2026-09-25', '2026-09-29', null]) {
    const { context } = loadP12Runtime();
    stubAnalyticsSheet(context);
    const requests = [];
    context.playPointP12FindLatestGscFinalDate_ = () => {
      if (!finalEnd) throw new Error('GSC unavailable');
      return finalEnd;
    };
    context.playPointP12FetchGscPage_ = (_site, start, end) => {
      requests.push({ source: 'gsc', start, end }); return [];
    };
    for (const name of ['OrganicLandings', 'ArticleClicks', 'AttributedFunnel', 'PageRevenue']) {
      context[`playPointP12Fetch${name}_`] = (_id, period) => {
        requests.push({ source: name, start: period.start, end: period.end }); return [];
      };
    }
    const result = context.playPointP12CapturePageValueFunnel_({});
    const expectedEnd = finalEnd === '2026-09-25' ? finalEnd : '2026-09-27';
    assert.equal(result.period.end, expectedEnd);
    assert.equal(inclusiveDays(result.period.start, result.period.end), 30);
    assert.equal(requests.length, finalEnd ? 5 : 4);
    for (const request of requests) {
      assert.equal(request.start, result.period.start);
      assert.equal(request.end, result.period.end);
    }
    assert.equal(result.availability.gsc, Boolean(finalEnd));
    assert.equal(result.availability.organic, true);
    assert.equal(result.availability.revenue, true);
    assert.equal(context.playPointP12ResultState_('PAGE_VALUE', result), finalEnd ? 'OK' : 'PARTIAL');
  }
});

test('P1 search-cross caps sheet output while preserving totals and truthful health state', () => {
  for (const count of [0, 5000, 5001]) {
    const { context } = loadP12Runtime();
    const writes = stubAnalyticsSheet(context);
    context.playPointP12FindLatestGscFinalDate_ = () => '2026-09-25';
    context.playPointP12FetchOrganicEngines_ = () => [];
    context.playPointP12FetchGscCrossPair_ = () => ({ current: [], previous: [] });
    context.playPointP12CrossOutputRows_ = type => type === 'COUNTRY'
      ? Array.from({ length: count }, (_, i) => ['COUNTRY', `query-${i}`, 'jp', 1, 0, i, 0]) : [];
    const result = context.playPointP12CaptureSearchCross_({});
    assert.equal(result.crossRowsTotal, count);
    assert.equal(result.crossRows, Math.min(5000, count));
    assert.equal(result.truncated, count > 5000);
    assert.equal(context.playPointP12ResultState_('SEARCH_CROSS', result), count > 5000 ? 'PARTIAL' : 'OK');
    const status = writes.find(write => write.args[0] === 'F2').value;
    assert.equal(status, count > 5000 ? 'PARTIAL (TRUNCATED 5000 / 5001)' : 'OK');
    if (count > 0) {
      const data = writes.find(write => write.args.length === 4 && write.args[2] === Math.min(5000, count));
      assert.equal(data.value.length, Math.min(5000, count));
    }
  }
});

test('Drive safety patch is a valid unified diff for the existing saved core filename', () => {
  const { execFileSync } = require('node:child_process');
  const patch = read('docs/patches/playpoint-analytics-v11.6.2-drive-safe.patch');
  const stat = execFileSync('git', ['apply', '--numstat', '-'], { cwd: root, input: patch, encoding: 'utf8' });
  assert.match(stat, /^\d+\t\d+\tPlayPoint_Analytics_v11_6_1_UiSafe_Code\.gs\s*$/);
});

test('Drive safety patch preserves LF context on Windows checkouts', () => {
  const patchPath='docs/patches/playpoint-analytics-v11.6.2-drive-safe.patch';
  const {execFileSync}=require('node:child_process');
  assert.equal(read(patchPath).includes('\r'),false);
  assert.match(execFileSync('git',['check-attr','eol','--',patchPath],{cwd:root,encoding:'utf8'}), /: eol: lf\s*$/);
});

function installerRuntimes() {
  return [[loadP12Runtime().context, 'installPlayPointAnalyticsP1P2WeeklyTrigger', 'capturePlayPointAnalyticsP1P2'],
    [loadGscCaptureRuntime().context, 'installPlayPointGsc28dWeeklyTrigger', 'captureGscNonOverlapping28d']];
}

test('GA4 P1 fetch follows rowCount through offsets and refuses a missing page', () => {
  const { context } = loadP12Runtime();
  const requests = [];
  context.playPointP12GoogleJson_ = (_url, request) => {
    requests.push(JSON.parse(JSON.stringify(request.payload)));
    return { rowCount: 3, rows: request.payload.offset ? [{id:3}] : [{id:1},{id:2}] };
  };
  assert.equal(context.playPointP12Ga4Report_('id', {limit:'2'}).rows.length, 3);
  assert.deepEqual(requests.map(r=>r.offset || '0'), ['0','2']);
  context.playPointP12GoogleJson_ = (_url, request) => ({rowCount:3,rows:request.payload.offset?[]:[{id:1},{id:2}]});
  assert.throws(()=>context.playPointP12Ga4Report_('id',{limit:'2'}), /incomplete/);
});

test('Google transport retries 429 and server errors but stops on an authorization error', () => {
  const { context } = loadP12Runtime();
  let calls=0;
  context.ScriptApp={getOAuthToken:()=> 'test-token'};
  context.Utilities={sleep:()=>{}};
  context.UrlFetchApp={fetch:()=>{calls++;const code=calls===1?429:200;return {getResponseCode:()=>code,getContentText:()=> '{}'};}};
  context.playPointP12GoogleJson_('https://example.invalid',{});
  assert.equal(calls,2);
  calls=0;
  context.UrlFetchApp={fetch:()=>{calls++;return {getResponseCode:()=>403,getContentText:()=> '{}'};}};
  assert.throws(()=>context.playPointP12GoogleJson_('https://example.invalid',{}), /403/);
  assert.equal(calls,1);
});

test('Extension stages and history writes reuse the core lock and preserve monitoring failures', () => {
  const {context}=loadP12Runtime();
  const events=[];
  context.withScriptLock_=fn=>{events.push('lock');try{return fn();}finally{events.push('unlock');}};
  context.playPointP12Log_=()=>{};context.playPointP12TryHealth_=()=>{};
  context.playPointP12RunStage_('PAGE_VALUE',()=>{events.push('write');return {};});
  assert.deepEqual(events,['lock','write','unlock']);
  const gsc=loadGscCaptureRuntime().context;
  gsc.withScriptLock_=context.withScriptLock_;
  gsc.playPointGscCaptureUnlocked_=()=>({status:'SKIPPED_STALE_TRIGGER'});
  assert.equal(gsc.captureGscNonOverlapping28d().status,'SKIPPED_STALE_TRIGGER');
  assert.deepEqual(events.slice(-2),['lock','unlock']);
});

test('URL Inspection releases the common lock during network calls and locks only sheet access', () => {
  const {context} = loadP12Runtime(); const writes = stubAnalyticsSheet(context);
  let depth = 0, otherUpdated = false;
  context.withScriptLock_ = fn => { assert.equal(depth,0); depth++; try {return fn();} finally {depth--;} };
  context.playPointP12BuildInspectionPriority_ = () => {assert.equal(depth,1);return [{url:'https://playpoint-sim.com/',source:'fixed'}];};
  context.playPointP12InspectUrl_ = () => {
    assert.equal(depth,0);
    context.withScriptLock_(() => {otherUpdated = true;});
    return {inspectionResult:{indexStatusResult:{verdict:'PASS'}}};
  };
  context.playPointP12StyleUrlInspectionSheet_ = () => assert.equal(depth,1);
  assert.equal(context.playPointP12CaptureUrlInspection_({}).inspected,1);
  assert.equal(otherUpdated,true); assert.ok(writes.length > 0); assert.equal(depth,0);
});

test('URL Inspection lease rejects overlap, recovers expiry, and releases on failure', () => {
  const {context} = loadP12Runtime(); const props = new Map(); let depth = 0;
  context.PropertiesService = {getScriptProperties:()=>({getProperty:key=>props.get(key),setProperty:(key,value)=>props.set(key,value),deleteProperty:key=>props.delete(key)})};
  context.withScriptLock_ = fn => {assert.equal(depth,0);depth++;try{return fn();}finally{depth--;}};
  context.playPointP12Log_ = () => assert.equal(depth,1);
  context.playPointP12TryHealth_ = (_stage,fn) => fn();
  for (const name of ['playPointP12HealthStart_','playPointP12HealthSuccess_','playPointP12HealthError_']) context[name] = () => assert.equal(depth,1);
  const result = context.playPointP12RunStage_('URL_INSPECTION',()=>{
    assert.equal(depth,0);
    assert.throws(()=>context.playPointP12RunStage_('URL_INSPECTION',()=>({errors:0})), /別の実行/);
    return {errors:0};
  });
  assert.equal(result.status,'OK'); assert.equal(props.size,0);
  props.set('PLAYPOINT_P12_INSPECTION_LEASE',JSON.stringify({until:Date.now()-1}));
  const failed = context.playPointP12RunStage_('URL_INSPECTION',()=>{throw Error('inspection failed');});
  assert.equal(failed.status,'ERROR'); assert.equal(props.size,0); assert.equal(depth,0);
  props.set('PLAYPOINT_P12_INSPECTION_LEASE','{broken');
  assert.equal(context.playPointP12RunStage_('URL_INSPECTION',()=>({errors:0})).status,'OK');
  assert.equal(props.size,0);
});

test('All URL Inspection failures or empty responses preserve the previous inspection report', () => {
  for (const empty of [false,true]) {
    const {context} = loadP12Runtime();
    context.playPointP12NowText_ = () => '2026-10-05 14:00:00';
    context.playPointP12GetSiteUrl_ = () => 'sc-domain:playpoint-sim.com';
    context.playPointP12BuildInspectionPriority_ = () => [{url:'https://playpoint-sim.com/',source:'fixed'}];
    context.playPointP12InspectUrl_ = () => {if (empty) return {};throw Error('permission failed');};
    context.playPointP12EnsureSheet_ = () => {throw Error('must not replace the old report');};
    assert.throws(()=>context.playPointP12CaptureUrlInspection_({}), /全対象.*前回/);
  }
});

test('All-source failures preserve previous analytical reports before any sheet clear', () => {
  const {context}=loadP12Runtime();
  context.playPointP12GetGa4PropertyId_=()=> 'id';context.playPointP12GetSiteUrl_=()=> 'site';
  context.playPointP12BuildGa4Period_=()=>({start:'2026-09-01',end:'2026-09-30'});
  context.playPointP12FindLatestGscFinalDate_=()=> '2026-09-30';
  context.playPointP12SafeSource_=()=>({ok:false,rows:[],error:'unavailable'});
  context.playPointP12EnsureSheet_=()=>{throw Error('must not clear the old report');};
  assert.throws(()=>context.playPointP12CapturePageValueFunnel_({}), /previous report preserved/);
  assert.throws(()=>context.playPointP12CaptureSearchCross_({}), /previous report preserved/);
});

test('GSC manual periods reject nonexistent dates and query text cannot become a formula', () => {
  const {context}=loadGscCaptureRuntime();
  assert.throws(()=>context.playPointGscBuildWindows_('2026-02-31'), /date/);
  assert.equal(context.playPointGscBuildWindows_('2024-02-29').current.end,'2024-02-29');
  assert.deepEqual(JSON.parse(JSON.stringify(context.playPointGscLiteralRow_(['=IMPORTXML("x")',0]))), ["'=IMPORTXML(\"x\")",0]);
});
function stubTriggers(context, handler, existing = []) {
  const calls = [];
  const created = { getHandlerFunction: () => handler, getUniqueId: () => 'new-uid' };
  const chain = Object.fromEntries(['timeBased', 'onWeekDay', 'atHour', 'inTimezone'].map(method => [method, value => { calls.push([method, value]); return chain; }]));
  chain.create = () => { calls.push(['create']); return created; };
  context.ScriptApp = { WeekDay: { FRIDAY: 'FRIDAY' }, getProjectTriggers: () => existing,
    newTrigger(name) { calls.push(['new', name]); return chain; }, deleteTrigger(trigger) { calls.push(['delete', trigger]); } };
  return { calls, created };
}
