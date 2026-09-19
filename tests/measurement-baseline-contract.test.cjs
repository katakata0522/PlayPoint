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

test('Phase 2 baseline fixes one comparable pre-change window and user-count semantics', () => {
  assert.equal(baseline.id, 'phase2-pre-change-2026-09-15');
  assert.equal(baseline.recordedAt, '2026-09-15');
  assert.equal(inclusiveDays(baseline.sourceWindow.start, baseline.sourceWindow.end), baseline.sourceWindow.days);
  assert.equal(baseline.sourceWindow.days, 7);
  assert.equal(baseline.decisionUnits.primaryUserUnit, 'activeUsers');
  assert.equal(baseline.decisionUnits.diagnosticCountUnit, 'eventCount');
  assert.equal(baseline.decisionUnits.unavailableValue, 'UNAVAILABLE');
  assert.match(baseline.decisionUnits.rule, /Never coerce unavailable measurement to zero/);
});

test('GA4 baseline distinguishes API-confirmed state from manual-only DebugView evidence', () => {
  assert.equal(baseline.ga4.keyEvents.calculation_completed, 'confirmed');
  assert.equal(baseline.ga4.keyEvents.reverse_calculation_completed, 'optional_unregistered');
  assert.equal(baseline.ga4.customDimensions.entry_source_path, 'confirmed');
  assert.equal(baseline.ga4.customDimensions.entry_link_context, 'confirmed');
  assert.equal(baseline.ga4.customDimensions.calculator_preset, 'confirmed');
  assert.equal(baseline.ga4.customDimensions.app_display_mode, 'unregistered_as_of_2026-09-10');
  assert.equal(baseline.ga4.debugView, 'manual_verification_required');
  assert.deepEqual(baseline.ga4.eventCounts, {
    calculator_form_started: 36,
    calculation_completed: 70,
    reverse_calculation_completed: 7,
    calculator_funnel_completed: 28
  });
});

test('measurement contract forbids raw calculator and diary values and respects consent', () => {
  const contract = baseline.ga4.privacyContract;
  assert.equal(contract.rawSpendingAmount, 'forbidden');
  assert.equal(contract.rawNeededPoints, 'forbidden');
  assert.equal(contract.rawEarnedPoints, 'forbidden');
  assert.equal(contract.rawDiaryContent, 'forbidden');
  assert.equal(contract.beforeConsent, 'do_not_send');
  assert.equal(contract.afterDenial, 'do_not_send');
});

test('Search Console baseline keeps Raw, Normalized and Property Total as separate evidence layers', () => {
  assert.deepEqual(baseline.searchConsole.layers.map(layer => layer.id), ['raw', 'normalized', 'property_total']);
  const raw = baseline.searchConsole.layers[0];
  const normalized = baseline.searchConsole.layers[1];
  const total = baseline.searchConsole.layers[2];
  assert.deepEqual(raw.dimensions, ['query', 'exact_url']);
  assert.equal(raw.preserveFragment, true);
  assert.equal(raw.aggregationType, 'byPage');
  assert.deepEqual(normalized.dimensions, ['query', 'base_url']);
  assert.equal(normalized.preserveFragment, false);
  assert.equal(normalized.aggregationType, 'derived_from_raw');
  assert.equal(normalized.derivedFrom, 'raw');
  assert.deepEqual(total.dimensions, []);
  assert.equal(total.aggregationType, 'byProperty');
  assert.equal(baseline.searchConsole.ga4Comparison, 'organic_search_split_by_search_engine');
  assert.equal(baseline.searchConsole.beforeAfterComparison.seoWindowDays, 28);
  assert.equal(baseline.searchConsole.beforeAfterComparison.overlap, 'forbidden');
  assert.equal(baseline.searchConsole.beforeAfterComparison.compareSameIntent, true);
  assert.equal(baseline.searchConsole.beforeAfterComparison.compareSameMetricDefinitions, true);
  const capture = baseline.searchConsole.captureContract;
  assert.equal(capture.historySheet, '🗃GSC 28日履歴');
  assert.equal(capture.comparisonSheet, '🔍GSC 28日比較');
  assert.equal(capture.normalizedComparisonSheet, '🧹GSC 28日正規化');
  assert.equal(capture.searchType, 'web');
  assert.equal(capture.apiTimezone, 'America/Los_Angeles');
  assert.deepEqual(capture.windowRoles, ['current_28d', 'previous_28d']);
  assert.deepEqual(capture.requiredLayers, ['raw', 'normalized', 'property_total']);
  assert.equal(capture.finalDataOnly, true);
  assert.equal(capture.failClosedWhenPairMissing, true);
  assert.equal(capture.failClosedWhenLayerMissing, true);
  assert.equal(capture.verifyResponseAggregationType, true);
  assert.deepEqual(capture.idempotencyKey, ['pair_id', 'window_role', 'layer', 'record_type', 'search_query', 'exact_url', 'base_url']);
  assert.match(capture.rule, /rolling 30-day snapshot/);
  for (const required of [
    'layer',
    'search_query',
    'exact_url',
    'base_url',
    'period_start',
    'period_end',
    'clicks',
    'impressions',
    'ctr',
    'avg_position',
    'search_type',
    'dimensions',
    'request_aggregation_type',
    'response_aggregation_type',
    'site_property',
    'api_timezone'
  ]) {
    assert.ok(capture.requiredColumns.includes(required), `missing GSC capture column: ${required}`);
  }
});

test('P1/P2 analytics sheet sync contract uses user-based funnel, GA4 publisher revenue, GSC cross analysis and bounded URL inspection', () => {
  const sync = baseline.analyticsSheetSync;
  assert.equal(sync.pageValue.sheet, '📊ページ価値ファネル');
  assert.equal(sync.pageValue.primaryUnit, 'activeUsers');
  assert.equal(sync.pageValue.attributionDimension, 'entry_source_path');
  assert.equal(sync.pageValue.events.articleToCalculator, 'article_to_calculator_clicked');
  assert.equal(sync.pageValue.events.calculatorStart, 'calculator_form_started');
  assert.equal(sync.pageValue.events.firstSuccess, 'calculator_funnel_completed');
  assert.equal(sync.pageValue.pageRevenueSource, 'ga4_publisher_metrics');
  assert.deepEqual(sync.pageValue.pageRevenueMetrics, [
    'totalAdRevenue',
    'publisherAdImpressions',
    'publisherAdClicks',
    'screenPageViews'
  ]);
  assert.equal(sync.pageValue.adsensePageUrlBreakdownIsPrimary, false);
  assert.equal(sync.pageValue.unavailableValue, 'blank_not_zero');

  assert.equal(sync.searchCross.sheet, '🔎検索クロス分析');
  assert.equal(sync.searchCross.ga4OrganicDimension, 'sessionSourceMedium');
  assert.deepEqual(sync.searchCross.gscDimensions, [
    ['query', 'country'],
    ['query', 'device']
  ]);
  assert.equal(sync.searchCross.gscWindowDays, 28);
  assert.equal(sync.searchCross.overlap, 'forbidden');
  assert.equal(sync.searchCross.finalDataOnly, true);
  assert.equal(sync.searchCross.aggregationType, 'byProperty');

  assert.equal(sync.urlInspection.sheet, '🧭URL検査');
  assert.equal(sync.urlInspection.maxUrlsPerRun, 30);
  assert.deepEqual(sync.urlInspection.selection, ['fixed_critical', 'top_gsc_impressions']);
  assert.equal(sync.logging.sheet, '実行ログ');
  assert.equal(sync.logging.forbidOpaqueErrorOnly, true);
  assert.equal(sync.logging.preserveLegacyLogs, true);
});

test('AdSense anomaly remains reviewable evidence instead of being silently corrected or removed', () => {
  const anomaly = baseline.adsense.anomalies.find(item => item.date === '2026-08-27');
  assert.ok(anomaly);
  assert.equal(anomaly.ga4PageViews, 42);
  assert.equal(anomaly.adsensePageViews, 630);
  assert.equal(anomaly.status, 'ANOMALY_REVIEW');
  assert.equal(anomaly.autoCorrect, false);
  assert.equal(anomaly.autoExclude, false);
});

test('retention baseline preserves zero versus unavailable and freezes the next review boundary', () => {
  assert.equal(baseline.retention.activeUsers, 309);
  assert.equal(baseline.retention.returningUsers, 18);
  assert.equal(baseline.retention.diaryTabOpenedActiveUsers, 2);
  assert.equal(baseline.retention.diaryEntrySavedActiveUsers, 0);
  assert.equal(baseline.retention.appDisplayModeUsers, 'UNAVAILABLE');
  assert.equal(baseline.comparisonGuardrails.nextReviewDate, '2026-09-25');
  assert.equal(baseline.comparisonGuardrails.minimumObservationDaysAfterEarlySeptemberChanges, 14);
  assert.equal(baseline.comparisonGuardrails.preserveBaseline, true);
});

test('human measurement audit names the same Phase 2 baseline and never claims manual-only checks are complete', () => {
  const audit = read('docs/MEASUREMENT_AUDIT_2026-09-15.md');
  assert.match(audit, /phase2-pre-change-2026-09-15/);
  assert.match(audit, /2026-09-01〜2026-09-07/);
  assert.match(audit, /activeUsers/);
  assert.match(audit, /Raw \/ Normalized \/ Property Total/);
  assert.match(audit, /ANOMALY_REVIEW/);
  assert.match(audit, /DebugView.*未完了|未完了.*DebugView/s);
  assert.doesNotMatch(audit, /DebugView[^\n]{0,60}(完了済み|確認済み)/);
});

test('analytics plan records the confirmed key event without closing DebugView by implication', () => {
  const analytics = read('docs/ANALYTICS.md');
  assert.match(analytics, /2026-09-15 本番点検/);
  assert.match(analytics, /`calculation_completed`[^\n]*Key event[^\n]*確認済み/);
  assert.match(analytics, /DebugView[^\n]*未完了/);
  assert.match(analytics, /app_display_mode[^\n]*未登録/);
});


function loadGscCaptureRuntime() {
  const source = read('scripts/gsc-nonoverlap-28d.gs');
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'gsc-nonoverlap-28d.gs' });
  return { source, context };
}

test('GSC capture module keeps adjacent non-overlapping 28-day query × exact URL FINAL windows', () => {
  const { source, context } = loadGscCaptureRuntime();
  const windows = context.playPointGscBuildWindows_('2026-09-11');

  assert.deepEqual(
    JSON.parse(JSON.stringify(windows)),
    {
      current: { start: '2026-08-15', end: '2026-09-11', days: 28 },
      previous: { start: '2026-07-18', end: '2026-08-14', days: 28 }
    }
  );
  assert.equal(context.playPointGscShiftIsoDate_(windows.previous.end, 1), windows.current.start);

  assert.match(source, /dimensions:\s*\['query', 'page'\]/);
  assert.match(source, /dataState:\s*'final'/);
  assert.match(source, /aggregationType:\s*'byPage'/);
  assert.match(source, /aggregationType:\s*'byProperty'/);
  assert.match(source, /dimensions:\s*\[\]/);
  assert.match(source, /responseAggregationType/);
  assert.match(source, /America\/Los_Angeles/);
  assert.match(source, /rowLimit:\s*25000/);
  assert.match(source, /startRow\s*\+=\s*rows\.length/);
  assert.match(source, /current_28d/);
  assert.match(source, /previous_28d/);
  assert.match(source, /SKIPPED_ALREADY_COMPLETE/);
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
  assert.equal(context.playPointGscPairComplete_(complete.slice(0, 5)), false);
  assert.match(source, /QUERY_PAGE_RAW/);
  assert.match(source, /QUERY_BASE_URL_NORMALIZED/);
  assert.match(source, /PROPERTY_TOTAL/);
  assert.match(source, /site_property/);
  assert.match(source, /request_aggregation_type/);
  assert.match(source, /response_aggregation_type/);
});

test('GSC capture module exposes one idempotent weekly installer and dedicated history/comparison sheets', () => {
  const { source, context } = loadGscCaptureRuntime();
  assert.equal(typeof context.captureGscNonOverlapping28d, 'function');
  assert.equal(typeof context.installPlayPointGsc28dWeeklyTrigger, 'function');
  assert.match(source, /🗃GSC 28日履歴/);
  assert.match(source, /🔍GSC 28日比較/);
  assert.match(source, /🧹GSC 28日正規化/);
  assert.match(source, /getProjectTriggers\(\)/);
  assert.match(source, /getHandlerFunction\(\) === handler/);
  assert.match(source, /onWeekDay\(ScriptApp\.WeekDay\.FRIDAY\)/);
});


function loadP12Runtime() {
  const source = read('scripts/playpoint-analytics-p1p2.gs');
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'playpoint-analytics-p1p2.gs' });
  return { source, context };
}

test('P1/P2 collector is valid JavaScript and exposes one capture plus one idempotent weekly installer', () => {
  const { source, context } = loadP12Runtime();
  assert.equal(typeof context.capturePlayPointAnalyticsP1P2, 'function');
  assert.equal(typeof context.installPlayPointAnalyticsP1P2WeeklyTrigger, 'function');
  assert.match(source, /getProjectTriggers\(\)/);
  assert.match(source, /getHandlerFunction\(\) === handler/);
  assert.match(source, /onWeekDay\(ScriptApp\.WeekDay\.FRIDAY\)/);
  assert.match(source, /\[P1P2:/);
  assert.doesNotMatch(source, /AdSense[^\n]*PAGE_URL[^\n]*reports:generate/);
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

test('P1 GSC cross windows are adjacent non-overlapping 28 days and use query×country/device byProperty FINAL evidence', () => {
  const { source, context } = loadP12Runtime();
  const windows = context.playPointP12BuildNonOverlapping28d_('2026-09-11');

  assert.deepEqual(JSON.parse(JSON.stringify(windows)), {
    current: { start: '2026-08-15', end: '2026-09-11', days: 28 },
    previous: { start: '2026-07-18', end: '2026-08-14', days: 28 }
  });
  assert.match(source, /\['query', 'country'\]/);
  assert.match(source, /\['query', 'device'\]/);
  assert.match(source, /dataState:\s*'final'/);
  assert.match(source, /'byProperty'/);
  assert.match(source, /sessionSourceMedium/);
});

test('P2 URL Inspection stays bounded to critical and top-search URLs and records actual per-URL errors', () => {
  const { source, context } = loadP12Runtime();
  assert.equal(context.PLAYPOINT_P12_CONFIG.urlInspectionMaxUrls, 30);
  assert.ok(context.PLAYPOINT_P12_CONFIG.fixedInspectionUrls.includes('https://playpoint-sim.com/'));
  assert.match(source, /urlInspection\/index:inspect/);
  assert.match(source, /FIXED_CRITICAL/);
  assert.match(source, /TOP_GSC_IMPRESSIONS/);
  assert.match(source, /playPointP12ErrorText_\(error\)/);
  assert.match(source, /\[P1P2:' \+ stage \+ '\]/);
});

test('P1/P2 collector updates health rows from WAITING to RUNNING/OK/PARTIAL/ERROR semantics', () => {
  const { source, context } = loadP12Runtime();

  assert.equal(context.PLAYPOINT_P12_CONFIG.healthSheet, '🩺データ鮮度・システム状態');
  assert.equal(context.PLAYPOINT_P12_CONFIG.healthComponents.PAGE_VALUE, 'P1 ページ価値ファネル');
  assert.equal(context.PLAYPOINT_P12_CONFIG.healthComponents.SEARCH_CROSS, 'P1 検索クロス分析');
  assert.equal(context.PLAYPOINT_P12_CONFIG.healthComponents.URL_INSPECTION, 'P2 URL Inspection');

  assert.equal(context.playPointP12ResultState_('PAGE_VALUE', {
    availability: { gsc: true, organic: true, articleClicks: true, attributed: true, revenue: true }
  }), 'OK');
  assert.equal(context.playPointP12ResultState_('PAGE_VALUE', {
    availability: { gsc: true, organic: true, articleClicks: true, attributed: false, revenue: true }
  }), 'PARTIAL');
  assert.equal(context.playPointP12ResultState_('URL_INSPECTION', { errors: 2 }), 'PARTIAL');

  assert.match(source, /playPointP12HealthStart_/);
  assert.match(source, /playPointP12HealthSuccess_/);
  assert.match(source, /playPointP12HealthError_/);
  assert.match(source, /consecutiveFailures/);
  assert.match(source, /実行ログの\[P1P2:/);
});
