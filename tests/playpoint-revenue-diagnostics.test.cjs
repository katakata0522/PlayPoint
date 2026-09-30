'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'scripts', 'playpoint-revenue-diagnostics.gs'),
  'utf8'
);

function load() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'playpoint-revenue-diagnostics.gs' });
  return context;
}

function daily(date, revenue, ga4Pv, adsensePv, impressions, clicks, pageCtr, pageRpm, impCtr, impRpm) {
  return {
    date,
    revenue,
    ga4Pv,
    adsensePv,
    impressions,
    clicks,
    pageCtr,
    pageRpm,
    impCtr,
    impRpm,
    dataState: 'RECONCILED'
  };
}

test('module is valid JS, exposes capture/installer, and never uses PAGE_URL', () => {
  const context = load();
  assert.equal(typeof context.capturePlayPointRevenueDiagnostics, 'function');
  assert.equal(typeof context.installPlayPointRevenueDiagnosticsDailyTrigger, 'function');
  assert.doesNotMatch(source, /dimensions:\s*\[[^\]]*PAGE_URL/);
  assert.match(source, /COUNTRY_CODE/);
  assert.match(source, /PLATFORM_TYPE_CODE/);
  assert.match(source, /BID_TYPE_CODE/);
  assert.match(source, /OWNED_SITE_DOMAIN_NAME==/);
  assert.match(source, /PRODUCT_CODE==AFC/);
});

test('2026-09-29-like rate spike is classified as unit-value spike, not traffic spike', () => {
  const context = load();
  const history = [];
  for (let i = 1; i <= 28; i += 1) {
    const date = '2026-09-' + String(i).padStart(2, '0');
    const revenue = 42 + (i % 7) * 2;
    const ga4Pv = 95 + (i % 6) * 4;
    const adsensePv = 105 + (i % 5) * 5;
    const impressions = 470 + (i % 7) * 12;
    const clicks = 3 + (i % 4);
    const pageCtr = clicks / adsensePv;
    const pageRpm = revenue / adsensePv * 1000;
    const impCtr = clicks / impressions;
    const impRpm = revenue / impressions * 1000;
    history.push(daily(
      date, revenue, ga4Pv, adsensePv, impressions, clicks,
      pageCtr, pageRpm, impCtr, impRpm
    ));
  }

  history.push(daily(
    '2026-09-29',
    194,
    112,
    122,
    486,
    6,
    0.0492,
    1594,
    0.0123,
    400
  ));

  const analysis = context.playPointRevenueAnalyze_(
    history,
    '2026-09-29',
    context.PLAYPOINT_REVENUE_DIAG_CONFIG
  );

  assert.equal(analysis.severity, 'HIGH');
  assert.equal(analysis.cause, 'UNIT_VALUE_SPIKE');
  assert.ok(analysis.monetaryZ >= context.PLAYPOINT_REVENUE_DIAG_CONFIG.alertZ);
  assert.ok(analysis.trafficZ < context.PLAYPOINT_REVENUE_DIAG_CONFIG.watchZ);
  assert.ok(analysis.clickZ < context.PLAYPOINT_REVENUE_DIAG_CONFIG.watchZ);
  assert.ok(analysis.excessRevenueVsMedianImpRpm > 100);
  assert.ok(analysis.excessRevenueShare > 0.5);
});

test('ordinary day remains normal', () => {
  const context = load();
  const history = [];
  for (let i = 1; i <= 29; i += 1) {
    const date = '2026-08-' + String(i).padStart(2, '0');
    history.push(daily(
      date,
      45 + (i % 4),
      100 + (i % 5),
      110 + (i % 4),
      500 + (i % 6) * 5,
      4 + (i % 2),
      0.04,
      420 + (i % 4) * 8,
      0.008,
      90 + (i % 4) * 3
    ));
  }

  const analysis = context.playPointRevenueAnalyze_(
    history,
    '2026-08-29',
    context.PLAYPOINT_REVENUE_DIAG_CONFIG
  );

  assert.equal(analysis.severity, 'NORMAL');
  assert.equal(analysis.cause, 'NORMAL_RANGE');
});

test('insufficient baseline fails closed without pretending anomaly certainty', () => {
  const context = load();
  const history = [
    daily('2026-09-27', 37, 100, 131, 449, 6, 0.0458, 280, 0.0134, 82),
    daily('2026-09-28', 42, 123, 134, 489, 2, 0.0149, 313, 0.0041, 86),
    daily('2026-09-29', 194, 112, 122, 486, 6, 0.0492, 1594, 0.0123, 400)
  ];

  const analysis = context.playPointRevenueAnalyze_(
    history,
    '2026-09-29',
    context.PLAYPOINT_REVENUE_DIAG_CONFIG
  );

  assert.equal(analysis.severity, 'INSUFFICIENT_HISTORY');
  assert.equal(analysis.cause, 'UNDETERMINED');
  assert.equal(analysis.expectedRevenueAtMedianImpRpm, null);
});

test('AdSense report parser binds cells by header names and preserves currency', () => {
  const context = load();
  const report = {
    headers: [
      { name: 'COUNTRY_CODE', type: 'DIMENSION' },
      { name: 'ESTIMATED_EARNINGS', type: 'METRIC_CURRENCY', currency: 'JPY' },
      { name: 'CLICKS', type: 'METRIC_TALLY' },
      { name: 'IMPRESSIONS', type: 'METRIC_TALLY' },
      { name: 'PAGE_VIEWS', type: 'METRIC_TALLY' },
      { name: 'IMPRESSIONS_CTR', type: 'METRIC_RATIO' },
      { name: 'IMPRESSIONS_RPM', type: 'METRIC_CURRENCY', currency: 'JPY' },
      { name: 'COST_PER_CLICK', type: 'METRIC_CURRENCY', currency: 'JPY' }
    ],
    rows: [{
      cells: [
        { value: 'US' },
        { value: '120.5' },
        { value: '2' },
        { value: '50' },
        { value: '12' },
        { value: '0.04' },
        { value: '2410' },
        { value: '60.25' }
      ]
    }]
  };

  const parsed = context.playPointRevenueParseAdSenseReport_(report, ['COUNTRY_CODE']);
  assert.equal(parsed.currency, 'JPY');
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].COUNTRY_CODE, 'US');
  assert.equal(parsed.rows[0].ESTIMATED_EARNINGS, 120.5);
  assert.equal(parsed.rows[0].CLICKS, 2);
  assert.equal(parsed.rows[0].IMPRESSIONS_RPM, 2410);
});

test('anomaly drilldown uses separate one/two-dimension reports instead of risky multi-dimension mega-report', () => {
  const context = load();
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.PLAYPOINT_REVENUE_DIAG_CONFIG.breakdowns.map(x => x.dimensions))),
    [['COUNTRY_CODE'], ['PLATFORM_TYPE_CODE'], ['BID_TYPE_CODE']]
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.PLAYPOINT_REVENUE_DIAG_CONFIG.anomalyBreakdowns.map(x => x.dimensions))),
    [
      ['COUNTRY_CODE', 'PLATFORM_TYPE_CODE'],
      ['COUNTRY_CODE', 'BID_TYPE_CODE'],
      ['PLATFORM_TYPE_CODE', 'BID_TYPE_CODE']
    ]
  );
});
