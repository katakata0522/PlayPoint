'use strict';

/**
 * PlayPoint Analytics P1/P2 collector.
 *
 * P1:
 * - Search -> organic landing -> article CTA -> calculator start -> first success
 * - page-level publisher revenue from GA4 publisher metrics
 * - GA4 Organic Search source/medium split
 * - GSC query × country / device non-overlapping 28-day comparison
 *
 * P2:
 * - URL Inspection for a small priority set (fixed critical URLs + top GSC pages)
 * - structured logs with stage + actual error text (never "#ERROR!" only)
 *
 * This module intentionally does not use AdSense PAGE_URL breakdown because the current
 * workbook repeatedly receives "The combination of requested dimensions is unavailable".
 */

var PLAYPOINT_P12_CONFIG = Object.freeze({
  pageValueSheet: '📊ページ価値ファネル',
  searchCrossSheet: '🔎検索クロス分析',
  urlInspectionSheet: '🧭URL検査',
  logSheet: '実行ログ',
  healthSheet: '🩺データ鮮度・システム状態',
  healthComponents: Object.freeze({
    PAGE_VALUE: 'P1 ページ価値ファネル',
    SEARCH_CROSS: 'P1 検索クロス分析',
    URL_INSPECTION: 'P2 URL Inspection'
  }),
  ga4PropertyIdDefault: '489079798',
  ga4Timezone: 'Asia/Tokyo',
  ga4WindowDays: 30,
  ga4LagDays: 3,
  gscTimezone: 'America/Los_Angeles',
  gscSearchType: 'web',
  gscRowLimit: 25000,
  crossSheetMaxRows: 5000,
  urlInspectionMaxUrls: 30,
  urlInspectionLanguage: 'ja-JP',
  fixedInspectionUrls: Object.freeze([
    'https://playpoint-sim.com/',
    'https://playpoint-sim.com/latest/',
    'https://playpoint-sim.com/blog/',
    'https://playpoint-sim.com/games/',
    'https://playpoint-sim.com/about-playpoints.html',
    'https://playpoint-sim.com/info.html',
    'https://playpoint-sim.com/status/diamond/',
    'https://playpoint-sim.com/maintenance/diamond/',
    'https://playpoint-sim.com/maintenance/platinum/',
    'https://playpoint-sim.com/campaign/2x/'
  ])
});

function capturePlayPointAnalyticsP1P2() {
  if (!playPointP12AutomationOwnerAllowsCurrentExecution_()) {
    return [{ stage: 'OWNER_GUARD', status: 'SKIPPED_NON_OWNER_TRIGGER' }];
  }
  var spreadsheet = playPointP12GetSpreadsheet_();
  var summary = [];

  summary.push(playPointP12RunStage_('PAGE_VALUE', function() {
    return playPointP12CapturePageValueFunnel_(spreadsheet);
  }));

  summary.push(playPointP12RunStage_('SEARCH_CROSS', function() {
    return playPointP12CaptureSearchCross_(spreadsheet);
  }));

  summary.push(playPointP12RunStage_('URL_INSPECTION', function() {
    return playPointP12CaptureUrlInspection_(spreadsheet);
  }));

  var failed = summary.filter(function(item) { return item.status === 'ERROR'; });
  if (failed.length) {
    throw new Error(
      'PlayPoint P1/P2 capture finished with ' + failed.length +
      ' failed stage(s): ' +
      failed.map(function(item) { return item.stage + '=' + item.error; }).join(' | ')
    );
  }

  return summary;
}

function installPlayPointAnalyticsP1P2WeeklyTrigger() {
  if (!playPointP12AutomationOwnerAllowsCurrentExecution_()) {
    throw new Error('P1/P2トリガーはPlayPoint Analyticsの自動実行ownerから設定してください。');
  }
  var handler = 'capturePlayPointAnalyticsP1P2';
  var existing = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === handler;
  });
  if (existing) return 'EXISTING_TRIGGER';

  ScriptApp.newTrigger(handler)
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(9)
    .create();

  return 'CREATED_WEEKLY_FRIDAY_TRIGGER';
}

function playPointP12RunStage_(stage, fn) {
  var started = new Date();
  playPointP12Log_('INFO', stage, 'started');
  playPointP12TryHealth_(function() {
    playPointP12HealthStart_(stage, started);
  });

  try {
    var result = fn();
    var finished = new Date();
    var resultState = playPointP12ResultState_(stage, result);
    playPointP12Log_(
      resultState === 'PARTIAL' ? 'WARN' : 'INFO',
      stage,
      'success state=' + resultState + ' ' + playPointP12CompactJson_(result)
    );
    playPointP12TryHealth_(function() {
      playPointP12HealthSuccess_(stage, finished, resultState, result);
    });
    return {
      stage: stage,
      status: resultState,
      startedAt: started,
      finishedAt: finished,
      result: result
    };
  } catch (error) {
    var finished = new Date();
    var message = playPointP12ErrorText_(error);
    playPointP12Log_('ERROR', stage, message);
    playPointP12TryHealth_(function() {
      playPointP12HealthError_(stage, finished, message);
    });
    return {
      stage: stage,
      status: 'ERROR',
      startedAt: started,
      finishedAt: finished,
      error: message
    };
  }
}

function playPointP12CapturePageValueFunnel_(spreadsheet) {
  var propertyId = playPointP12GetGa4PropertyId_();
  var siteUrl = playPointP12GetSiteUrl_();
  var period = playPointP12BuildGa4Period_();

  var gsc = playPointP12SafeSource_(function() {
    return playPointP12FetchGscPage_(siteUrl, period.start, period.end);
  });
  var organic = playPointP12SafeSource_(function() {
    return playPointP12FetchOrganicLandings_(propertyId, period);
  });
  var articleClicks = playPointP12SafeSource_(function() {
    return playPointP12FetchArticleClicks_(propertyId, period);
  });
  var attributed = playPointP12SafeSource_(function() {
    return playPointP12FetchAttributedFunnel_(propertyId, period);
  });
  var revenue = playPointP12SafeSource_(function() {
    return playPointP12FetchPageRevenue_(propertyId, period);
  });

  var rows = playPointP12BuildPageValueRows_({
    gscRows: gsc.rows,
    organicRows: organic.rows,
    articleClickRows: articleClicks.rows,
    attributedRows: attributed.rows,
    revenueRows: revenue.rows,
    availability: {
      gsc: gsc.ok,
      organic: organic.ok,
      articleClicks: articleClicks.ok,
      attributed: attributed.ok,
      revenue: revenue.ok
    }
  });
  var joinIntegrity = playPointP12AssessPageValueJoin_(rows);

  var sheet = playPointP12EnsureSheet_(spreadsheet, PLAYPOINT_P12_CONFIG.pageValueSheet, 14);
  sheet.clearContents();

  sheet.getRange('A1').setValue('📊 PlayPoint ページ価値ファネル｜検索 → 計算 → 収益');
  sheet.getRange('A2:N4').setValues([
    [
      '対象期間', period.start + ' ～ ' + period.end,
      'GA4 property', propertyId,
      'GSC property', siteUrl,
      '主単位', 'activeUsers',
      '収益source', 'GA4 publisher metrics',
      '状態', playPointP12PageValueStateLabel_(
        [gsc, organic, articleClicks, attributed, revenue],
        joinIntegrity
      ),
      '', ''
    ],
    [
      'GSC', playPointP12SourceLabel_(gsc),
      'Organic LP', playPointP12SourceLabel_(organic),
      '記事→計算', playPointP12SourceLabel_(articleClicks),
      '計算帰属', playPointP12SourceLabel_(attributed),
      'ページ収益', playPointP12SourceLabel_(revenue),
      '取得日時', playPointP12NowText_(),
      '', ''
    ],
    [
      '方針',
      'Search/GA4/収益を同じ期間で再構築。AdSense PAGE_URLの失敗をページ別収益のSSOTにしない。',
      '未取得値', '空欄（0にしない）',
      '計算開始/成功', 'entry_source_pathで元ページへ帰属',
      '収益', 'totalAdRevenue / publisherAdImpressions / publisherAdClicks',
      'SEO変更', '母数と検索意図を別途確認',
      '', '', '', ''
    ]
  ]);

  var headers = [
    'ページ',
    '検索クリック',
    '検索表示',
    '検索CTR',
    'Organic LPセッション',
    'Organic LPユーザー',
    'GA4 PV',
    '記事→計算ユーザー',
    '計算開始ユーザー',
    '初回計算成功ユーザー',
    'Start→Success',
    'ページ広告収益',
    '収益 / Organic LPユーザー',
    '状態'
  ];
  sheet.getRange(5, 1, 1, headers.length).setValues([headers]);

  if (rows.length) {
    playPointP12EnsureRows_(sheet, rows.length + 5);
    sheet.getRange(6, 1, rows.length, headers.length).setValues(rows.map(function(row) {
      return [
        row.page,
        row.searchClicks,
        row.searchImpressions,
        row.searchCtr,
        row.organicSessions,
        row.organicUsers,
        row.pageViews,
        row.articleToCalculatorUsers,
        row.calculatorStartUsers,
        row.firstSuccessUsers,
        row.userCompletionRate,
        row.pageAdRevenue,
        row.revenuePerOrganicUser,
        row.state
      ];
    }));
  }

  playPointP12StylePageValueSheet_(sheet, rows.length);

  return {
    period: period,
    rows: rows.length,
    availability: {
      gsc: gsc.ok,
      organic: organic.ok,
      articleClicks: articleClicks.ok,
      attributed: attributed.ok,
      revenue: revenue.ok
    },
    joinIntegrity: joinIntegrity
  };
}

function playPointP12CaptureSearchCross_(spreadsheet) {
  var propertyId = playPointP12GetGa4PropertyId_();
  var siteUrl = playPointP12GetSiteUrl_();
  var ga4Period = playPointP12BuildGa4Period_();
  var finalEnd = playPointP12FindLatestGscFinalDate_(siteUrl);
  var gscPeriods = playPointP12BuildNonOverlapping28d_(finalEnd);

  var engines = playPointP12SafeSource_(function() {
    return playPointP12FetchOrganicEngines_(propertyId, ga4Period);
  });
  var queryCountry = playPointP12SafeSource_(function() {
    return playPointP12FetchGscCrossPair_(siteUrl, gscPeriods, ['query', 'country']);
  });
  var queryDevice = playPointP12SafeSource_(function() {
    return playPointP12FetchGscCrossPair_(siteUrl, gscPeriods, ['query', 'device']);
  });

  var sheet = playPointP12EnsureSheet_(spreadsheet, PLAYPOINT_P12_CONFIG.searchCrossSheet, 16);
  sheet.clearContents();

  sheet.getRange('A1').setValue('🔎 検索クロス分析｜GA4検索エンジン + GSC国・端末');
  sheet.getRange('A2:F3').setValues([
    [
      'GA4期間', ga4Period.start + ' ～ ' + ga4Period.end,
      'GSC current', gscPeriods.current.start + ' ～ ' + gscPeriods.current.end,
      '状態', playPointP12AvailabilityLabel_([engines, queryCountry, queryDevice])
    ],
    [
      'GSC previous', gscPeriods.previous.start + ' ～ ' + gscPeriods.previous.end,
      'GSC property', siteUrl,
      '取得日時', playPointP12NowText_()
    ]
  ]);

  var engineHeaderRow = 5;
  sheet.getRange(engineHeaderRow, 1, 1, 5).setValues([[
    'GA4 Organic source / medium',
    'セッション',
    'アクティブユーザー',
    'エンゲージメント率',
    '対象期間'
  ]]);

  var engineRows = engines.rows || [];
  if (engineRows.length) {
    playPointP12EnsureRows_(sheet, engineHeaderRow + engineRows.length + 3);
    sheet.getRange(engineHeaderRow + 1, 1, engineRows.length, 5).setValues(engineRows.map(function(row) {
      return [
        row.sourceMedium,
        row.sessions,
        row.activeUsers,
        row.engagementRate,
        ga4Period.start + ' ～ ' + ga4Period.end
      ];
    }));
  }

  var crossHeaderRow = Math.max(10, engineHeaderRow + engineRows.length + 3);
  var crossHeaders = [
    '種別',
    '検索クエリ',
    '値',
    '現Click',
    '前Click',
    '現Imp.',
    '前Imp.',
    '現CTR',
    '前CTR',
    '現Pos',
    '前Pos',
    'ΔImp.',
    'ΔCTR',
    '現期間',
    '前期間',
    'response aggregation'
  ];
  sheet.getRange(crossHeaderRow, 1, 1, crossHeaders.length).setValues([crossHeaders]);

  var crossRows = []
    .concat(playPointP12CrossOutputRows_('COUNTRY', queryCountry, gscPeriods))
    .concat(playPointP12CrossOutputRows_('DEVICE', queryDevice, gscPeriods));

  crossRows.sort(function(a, b) {
    return Math.max(Number(b[5] || 0), Number(b[6] || 0)) -
      Math.max(Number(a[5] || 0), Number(a[6] || 0));
  });

  if (crossRows.length > PLAYPOINT_P12_CONFIG.crossSheetMaxRows) {
    crossRows = crossRows.slice(0, PLAYPOINT_P12_CONFIG.crossSheetMaxRows);
  }

  if (crossRows.length) {
    playPointP12EnsureRows_(sheet, crossHeaderRow + crossRows.length);
    sheet.getRange(crossHeaderRow + 1, 1, crossRows.length, crossHeaders.length).setValues(crossRows);
  }

  playPointP12StyleSearchCrossSheet_(sheet, engineHeaderRow, engineRows.length, crossHeaderRow, crossRows.length);

  return {
    ga4Period: ga4Period,
    gscPeriods: gscPeriods,
    organicEngineRows: engineRows.length,
    crossRows: crossRows.length,
    availability: {
      engines: engines.ok,
      queryCountry: queryCountry.ok,
      queryDevice: queryDevice.ok
    }
  };
}

function playPointP12CaptureUrlInspection_(spreadsheet) {
  var siteUrl = playPointP12GetSiteUrl_();
  var priority = playPointP12BuildInspectionPriority_(spreadsheet);
  var rows = [];

  priority.forEach(function(item) {
    try {
      var payload = playPointP12InspectUrl_(siteUrl, item.url);
      var result = payload.inspectionResult || {};
      var index = result.indexStatusResult || {};
      var mobile = result.mobileUsabilityResult || {};

      rows.push([
        item.url,
        item.source,
        index.verdict || '',
        index.coverageState || '',
        index.indexingState || '',
        index.pageFetchState || '',
        index.robotsTxtState || '',
        index.googleCanonical || '',
        index.userCanonical || '',
        index.lastCrawlTime || '',
        mobile.verdict || '',
        playPointP12NowText_(),
        'OK',
        ''
      ]);
    } catch (error) {
      rows.push([
        item.url,
        item.source,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        playPointP12NowText_(),
        'ERROR',
        playPointP12ErrorText_(error)
      ]);
    }
  });

  var sheet = playPointP12EnsureSheet_(spreadsheet, PLAYPOINT_P12_CONFIG.urlInspectionSheet, 14);
  sheet.clearContents();

  sheet.getRange('A1').setValue('🧭 URL Inspection｜重要URLだけを軽量監視');
  sheet.getRange('A2:F4').setValues([
    [
      '状態', rows.some(function(row) { return row[12] === 'ERROR'; }) ? 'PARTIAL' : 'OK',
      '件数', rows.length,
      '上限', PLAYPOINT_P12_CONFIG.urlInspectionMaxUrls
    ],
    [
      'property', siteUrl,
      '対象', '固定重要URL + Search Console表示上位URL',
      '取得日時', playPointP12NowText_()
    ],
    [
      '方針', '全URLを毎回検査しない。0表示や重要ページの切り分け用。',
      '履歴', 'このタブは最新状態。詳細変更履歴は実行ログへ残す。',
      '', ''
    ]
  ]);

  var headers = [
    'URL',
    '優先理由',
    'Verdict',
    'Coverage',
    'Indexing',
    'Page fetch',
    'Robots',
    'Google canonical',
    'User canonical',
    'Last crawl',
    'Mobile verdict',
    '検査日時',
    '状態',
    'エラー'
  ];
  sheet.getRange(6, 1, 1, headers.length).setValues([headers]);

  if (rows.length) {
    playPointP12EnsureRows_(sheet, rows.length + 6);
    sheet.getRange(7, 1, rows.length, headers.length).setValues(rows);
  }

  playPointP12StyleUrlInspectionSheet_(sheet, rows.length);

  return {
    inspected: rows.length,
    errors: rows.filter(function(row) { return row[12] === 'ERROR'; }).length
  };
}

function playPointP12BuildPageValueRows_(input) {
  input = input || {};
  var map = {};

  function ensure(page) {
    var key = playPointP12NormalizePage_(page);
    if (!key || key === '(not set)') return null;
    if (!map[key]) {
      map[key] = {
        page: key,
        searchClicks: 0,
        searchImpressions: 0,
        searchCtr: 0,
        organicSessions: 0,
        organicUsers: 0,
        pageViews: null,
        articleToCalculatorUsers: null,
        calculatorStartUsers: null,
        firstSuccessUsers: null,
        userCompletionRate: null,
        pageAdRevenue: null,
        revenuePerOrganicUser: null
      };
    }
    return map[key];
  }

  (input.gscRows || []).forEach(function(row) {
    var item = ensure(row.page);
    if (!item) return;
    item.searchClicks += Number(row.clicks || 0);
    item.searchImpressions += Number(row.impressions || 0);
  });

  (input.organicRows || []).forEach(function(row) {
    var item = ensure(row.page);
    if (!item) return;
    item.organicSessions += Number(row.sessions || 0);
    item.organicUsers += Number(row.activeUsers || 0);
  });

  if (input.availability && input.availability.articleClicks) {
    (input.articleClickRows || []).forEach(function(row) {
      var item = ensure(row.page);
      if (!item) return;
      if (item.articleToCalculatorUsers === null) item.articleToCalculatorUsers = 0;
      item.articleToCalculatorUsers += Number(row.activeUsers || 0);
    });
  }

  if (input.availability && input.availability.attributed) {
    (input.attributedRows || []).forEach(function(row) {
      var item = ensure(row.page);
      if (!item) return;
      if (item.calculatorStartUsers === null) item.calculatorStartUsers = 0;
      if (item.firstSuccessUsers === null) item.firstSuccessUsers = 0;
      if (row.eventName === 'calculator_form_started') {
        item.calculatorStartUsers += Number(row.activeUsers || 0);
      } else if (row.eventName === 'calculator_funnel_completed') {
        item.firstSuccessUsers += Number(row.activeUsers || 0);
      }
    });
  }

  if (input.availability && input.availability.revenue) {
    (input.revenueRows || []).forEach(function(row) {
      var item = ensure(row.page);
      if (!item) return;
      if (item.pageViews === null) item.pageViews = 0;
      if (item.pageAdRevenue === null) item.pageAdRevenue = 0;
      item.pageViews += Number(row.screenPageViews || 0);
      item.pageAdRevenue += Number(row.totalAdRevenue || 0);
    });
  }

  Object.keys(map).forEach(function(key) {
    var item = map[key];
    item.searchCtr = item.searchImpressions > 0 ? item.searchClicks / item.searchImpressions : 0;

    if (item.calculatorStartUsers !== null && item.firstSuccessUsers !== null) {
      item.userCompletionRate = item.calculatorStartUsers > 0
        ? item.firstSuccessUsers / item.calculatorStartUsers
        : null;
    }

    if (item.pageAdRevenue !== null) {
      item.revenuePerOrganicUser = item.organicUsers > 0
        ? item.pageAdRevenue / item.organicUsers
        : null;
    }

    var missing = [];
    if (!input.availability || !input.availability.gsc) missing.push('GSC');
    if (!input.availability || !input.availability.organic) missing.push('Organic');
    if (!input.availability || !input.availability.articleClicks) missing.push('CTA');
    if (!input.availability || !input.availability.attributed) missing.push('Funnel');
    if (!input.availability || !input.availability.revenue) missing.push('Revenue');
    item.state = missing.length ? 'PARTIAL: ' + missing.join(',') : 'OK';
  });

  return Object.keys(map).map(function(key) { return map[key]; }).sort(function(a, b) {
    return Number(b.firstSuccessUsers || 0) - Number(a.firstSuccessUsers || 0) ||
      Number(b.organicUsers || 0) - Number(a.organicUsers || 0) ||
      Number(b.pageAdRevenue || 0) - Number(a.pageAdRevenue || 0) ||
      Number(b.searchImpressions || 0) - Number(a.searchImpressions || 0);
  });
}

function playPointP12AssessPageValueJoin_(rows) {
  var totalGscClicks = 0;
  var joinedGscClicks = 0;
  var gscClickRows = 0;
  var joinedGscClickRows = 0;
  var absoluteUrlKeys = 0;

  (rows || []).forEach(function(row) {
    var page = String(row.page || '');
    if (/^https?:\/\//i.test(page)) absoluteUrlKeys += 1;

    var clicks = Number(row.searchClicks || 0);
    if (clicks <= 0) return;

    gscClickRows += 1;
    totalGscClicks += clicks;

    if (Number(row.organicSessions || 0) > 0 || Number(row.organicUsers || 0) > 0) {
      joinedGscClickRows += 1;
      joinedGscClicks += clicks;
    }
  });

  var joinRate = totalGscClicks > 0 ? joinedGscClicks / totalGscClicks : null;
  var status = 'OK';
  var reason = '';

  if (absoluteUrlKeys > 0) {
    status = 'PARTIAL';
    reason = 'unnormalized_absolute_url_keys';
  } else if (totalGscClicks >= 20 && joinRate < 0.5) {
    status = 'PARTIAL';
    reason = 'low_gsc_ga4_join_rate';
  } else if (totalGscClicks < 20) {
    status = 'LOW_SAMPLE';
    reason = 'gsc_click_sample_below_20';
  }

  return {
    status: status,
    reason: reason,
    totalGscClicks: totalGscClicks,
    joinedGscClicks: joinedGscClicks,
    joinRate: joinRate,
    gscClickRows: gscClickRows,
    joinedGscClickRows: joinedGscClickRows,
    absoluteUrlKeys: absoluteUrlKeys,
    minimumClicks: 20,
    minimumJoinRate: 0.5
  };
}

function playPointP12JoinIntegrityText_(joinIntegrity) {
  if (!joinIntegrity) return 'join=unknown';
  var rate = joinIntegrity.joinRate === null
    ? 'n/a'
    : (joinIntegrity.joinRate * 100).toFixed(1) + '%';
  return 'join=' + rate +
    ', GSC clicks=' + Number(joinIntegrity.totalGscClicks || 0) +
    ', joined clicks=' + Number(joinIntegrity.joinedGscClicks || 0) +
    ', absolute URL keys=' + Number(joinIntegrity.absoluteUrlKeys || 0) +
    (joinIntegrity.reason ? ', reason=' + joinIntegrity.reason : '');
}

function playPointP12PageValueStateLabel_(sources, joinIntegrity) {
  var sourceLabel = playPointP12AvailabilityLabel_(sources);
  if (sourceLabel !== 'OK') return sourceLabel;
  if (!joinIntegrity) return 'PARTIAL (join integrity unavailable)';
  if (joinIntegrity.status === 'PARTIAL') {
    return 'PARTIAL (' + playPointP12JoinIntegrityText_(joinIntegrity) + ')';
  }
  if (joinIntegrity.status === 'LOW_SAMPLE') {
    return 'OK (join sample small: ' + playPointP12JoinIntegrityText_(joinIntegrity) + ')';
  }
  return 'OK (' + playPointP12JoinIntegrityText_(joinIntegrity) + ')';
}

function playPointP12CrossOutputRows_(type, result, periods) {
  if (!result.ok) return [];
  return (result.rows || []).map(function(row) {
    return [
      type,
      row.query,
      row.value,
      row.current ? row.current.clicks : null,
      row.previous ? row.previous.clicks : null,
      row.current ? row.current.impressions : null,
      row.previous ? row.previous.impressions : null,
      row.current ? row.current.ctr : null,
      row.previous ? row.previous.ctr : null,
      row.current ? row.current.position : null,
      row.previous ? row.previous.position : null,
      row.current && row.previous ? row.current.impressions - row.previous.impressions : null,
      row.current && row.previous ? row.current.ctr - row.previous.ctr : null,
      periods.current.start + ' ～ ' + periods.current.end,
      periods.previous.start + ' ～ ' + periods.previous.end,
      result.responseAggregationType || ''
    ];
  });
}

function playPointP12FetchGscCrossPair_(siteUrl, periods, dimensions) {
  var current = playPointP12FetchGscRows_(
    siteUrl,
    periods.current.start,
    periods.current.end,
    dimensions,
    'byProperty'
  );
  var previous = playPointP12FetchGscRows_(
    siteUrl,
    periods.previous.start,
    periods.previous.end,
    dimensions,
    'byProperty'
  );

  var map = {};

  function ingest(rows, role) {
    (rows.rows || []).forEach(function(row) {
      var query = row.keys && row.keys[0] ? row.keys[0] : '';
      var value = row.keys && row.keys[1] ? row.keys[1] : '';
      var key = query + '\u0000' + value;
      if (!map[key]) map[key] = { query: query, value: value, current: null, previous: null };
      map[key][role] = {
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0),
        ctr: Number(row.ctr || 0),
        position: Number(row.position || 0)
      };
    });
  }

  ingest(current, 'current');
  ingest(previous, 'previous');

  return {
    rows: Object.keys(map).map(function(key) { return map[key]; }),
    responseAggregationType: current.responseAggregationType || previous.responseAggregationType || ''
  };
}

function playPointP12FetchGscPage_(siteUrl, startDate, endDate) {
  // Page-value funnel needs page totals, not query × page rows.
  // Query dimensions can omit anonymized/long-tail rows and are owned by the
  // dedicated Search Console intent-analysis sheets instead.
  var result = playPointP12FetchGscRows_(
    siteUrl,
    startDate,
    endDate,
    ['page'],
    'byPage'
  );

  return result.rows.map(function(row) {
    return {
      page: playPointP12NormalizePage_(row.keys && row.keys[0] ? row.keys[0] : ''),
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0)
    };
  });
}

function playPointP12FetchGscRows_(siteUrl, startDate, endDate, dimensions, aggregationType) {
  var rows = [];
  var startRow = 0;
  var responseAggregationType = '';

  while (true) {
    var payload = playPointP12GoogleJson_(
      'https://searchconsole.googleapis.com/webmasters/v3/sites/' +
      encodeURIComponent(siteUrl) +
      '/searchAnalytics/query',
      {
        method: 'post',
        payload: {
          startDate: startDate,
          endDate: endDate,
          dimensions: dimensions,
          type: PLAYPOINT_P12_CONFIG.gscSearchType,
          dataState: 'final',
          aggregationType: aggregationType,
          rowLimit: PLAYPOINT_P12_CONFIG.gscRowLimit,
          startRow: startRow
        }
      }
    );

    if (payload.responseAggregationType && payload.responseAggregationType !== aggregationType) {
      throw new Error(
        'GSC aggregation mismatch for ' + dimensions.join(',') +
        ': expected ' + aggregationType +
        ', got ' + payload.responseAggregationType
      );
    }

    responseAggregationType = payload.responseAggregationType || responseAggregationType;
    var batch = payload.rows || [];
    rows = rows.concat(batch);

    if (batch.length < PLAYPOINT_P12_CONFIG.gscRowLimit) break;
    startRow += batch.length;
  }

  return {
    rows: rows,
    responseAggregationType: responseAggregationType
  };
}

function playPointP12FetchOrganicLandings_(propertyId, period) {
  var payload = playPointP12Ga4Report_(propertyId, {
    dateRanges: [{ startDate: period.start, endDate: period.end }],
    dimensions: [{ name: 'landingPagePlusQueryString' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    dimensionFilter: {
      filter: {
        fieldName: 'sessionDefaultChannelGroup',
        stringFilter: { matchType: 'EXACT', value: 'Organic Search', caseSensitive: false }
      }
    },
    limit: '10000'
  });

  return playPointP12ParseGa4Rows_(payload, ['page'], ['sessions', 'activeUsers']).map(function(row) {
    row.page = playPointP12NormalizePage_(row.page);
    return row;
  });
}

function playPointP12FetchArticleClicks_(propertyId, period) {
  var payload = playPointP12Ga4Report_(propertyId, {
    dateRanges: [{ startDate: period.start, endDate: period.end }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'activeUsers' }, { name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: {
          matchType: 'EXACT',
          value: 'article_to_calculator_clicked',
          caseSensitive: true
        }
      }
    },
    limit: '10000'
  });

  return playPointP12ParseGa4Rows_(payload, ['page'], ['activeUsers', 'eventCount']).map(function(row) {
    row.page = playPointP12NormalizePage_(row.page);
    return row;
  });
}

function playPointP12FetchAttributedFunnel_(propertyId, period) {
  var payload = playPointP12Ga4Report_(propertyId, {
    dateRanges: [{ startDate: period.start, endDate: period.end }],
    dimensions: [
      { name: 'customEvent:entry_source_path' },
      { name: 'eventName' }
    ],
    metrics: [{ name: 'activeUsers' }, { name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: {
          values: ['calculator_form_started', 'calculator_funnel_completed'],
          caseSensitive: true
        }
      }
    },
    limit: '10000'
  });

  return playPointP12ParseGa4Rows_(
    payload,
    ['page', 'eventName'],
    ['activeUsers', 'eventCount']
  ).map(function(row) {
    row.page = playPointP12NormalizePage_(row.page);
    return row;
  }).filter(function(row) {
    return row.page && row.page !== '(not set)';
  });
}

function playPointP12FetchPageRevenue_(propertyId, period) {
  var payload = playPointP12Ga4Report_(propertyId, {
    dateRanges: [{ startDate: period.start, endDate: period.end }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'totalAdRevenue' },
      { name: 'publisherAdImpressions' },
      { name: 'publisherAdClicks' },
      { name: 'screenPageViews' }
    ],
    limit: '10000'
  });

  return playPointP12ParseGa4Rows_(
    payload,
    ['page'],
    ['totalAdRevenue', 'publisherAdImpressions', 'publisherAdClicks', 'screenPageViews']
  ).map(function(row) {
    row.page = playPointP12NormalizePage_(row.page);
    return row;
  });
}

function playPointP12FetchOrganicEngines_(propertyId, period) {
  var payload = playPointP12Ga4Report_(propertyId, {
    dateRanges: [{ startDate: period.start, endDate: period.end }],
    dimensions: [{ name: 'sessionSourceMedium' }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'engagementRate' }
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'sessionDefaultChannelGroup',
        stringFilter: { matchType: 'EXACT', value: 'Organic Search', caseSensitive: false }
      }
    },
    orderBys: [{
      metric: { metricName: 'sessions' },
      desc: true
    }],
    limit: '100'
  });

  return playPointP12ParseGa4Rows_(
    payload,
    ['sourceMedium'],
    ['sessions', 'activeUsers', 'engagementRate']
  );
}

function playPointP12Ga4Report_(propertyId, body) {
  return playPointP12GoogleJson_(
    'https://analyticsdata.googleapis.com/v1beta/properties/' +
    encodeURIComponent(propertyId) +
    ':runReport',
    { method: 'post', payload: body }
  );
}

function playPointP12ParseGa4Rows_(body, dimensionNames, metricNames) {
  return (body.rows || []).map(function(row) {
    var result = {};

    dimensionNames.forEach(function(name, index) {
      result[name] = row.dimensionValues && row.dimensionValues[index]
        ? row.dimensionValues[index].value || ''
        : '';
    });

    metricNames.forEach(function(name, index) {
      result[name] = row.metricValues && row.metricValues[index]
        ? Number(row.metricValues[index].value || 0)
        : 0;
    });

    return result;
  });
}

function playPointP12FindLatestGscFinalDate_(siteUrl) {
  var today = Utilities.formatDate(new Date(), PLAYPOINT_P12_CONFIG.gscTimezone, 'yyyy-MM-dd');
  var start = playPointP12ShiftIsoDate_(today, -13);

  var probe = playPointP12GoogleJson_(
    'https://searchconsole.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(siteUrl) +
    '/searchAnalytics/query',
    {
      method: 'post',
      payload: {
        startDate: start,
        endDate: today,
        dimensions: ['date'],
        type: PLAYPOINT_P12_CONFIG.gscSearchType,
        dataState: 'all',
        rowLimit: 14,
        startRow: 0
      }
    }
  );

  if (probe.metadata && probe.metadata.first_incomplete_date) {
    return playPointP12ShiftIsoDate_(probe.metadata.first_incomplete_date, -1);
  }

  var finalProbe = playPointP12GoogleJson_(
    'https://searchconsole.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(siteUrl) +
    '/searchAnalytics/query',
    {
      method: 'post',
      payload: {
        startDate: start,
        endDate: today,
        dimensions: ['date'],
        type: PLAYPOINT_P12_CONFIG.gscSearchType,
        dataState: 'final',
        rowLimit: 14,
        startRow: 0
      }
    }
  );

  var dates = (finalProbe.rows || []).map(function(row) {
    return row.keys && row.keys[0] ? row.keys[0] : '';
  }).filter(Boolean).sort();

  if (!dates.length) throw new Error('Could not determine latest FINAL Search Console date.');
  return dates[dates.length - 1];
}

function playPointP12BuildGa4Period_() {
  var today = Utilities.formatDate(new Date(), PLAYPOINT_P12_CONFIG.ga4Timezone, 'yyyy-MM-dd');
  var end = playPointP12ShiftIsoDate_(today, -PLAYPOINT_P12_CONFIG.ga4LagDays);
  var start = playPointP12ShiftIsoDate_(end, -(PLAYPOINT_P12_CONFIG.ga4WindowDays - 1));
  return {
    start: start,
    end: end,
    days: PLAYPOINT_P12_CONFIG.ga4WindowDays,
    lagDays: PLAYPOINT_P12_CONFIG.ga4LagDays
  };
}

function playPointP12BuildNonOverlapping28d_(finalEnd) {
  var currentStart = playPointP12ShiftIsoDate_(finalEnd, -27);
  var previousEnd = playPointP12ShiftIsoDate_(currentStart, -1);
  var previousStart = playPointP12ShiftIsoDate_(previousEnd, -27);
  return {
    current: { start: currentStart, end: finalEnd, days: 28 },
    previous: { start: previousStart, end: previousEnd, days: 28 }
  };
}

function playPointP12BuildInspectionPriority_(spreadsheet) {
  var seen = {};
  var rows = [];

  function add(url, source) {
    url = String(url || '').trim();
    if (!/^https:\/\/playpoint-sim\.com(?:\/|$)/.test(url)) return;
    url = url.split('#')[0];
    if (seen[url]) return;
    seen[url] = true;
    rows.push({ url: url, source: source });
  }

  PLAYPOINT_P12_CONFIG.fixedInspectionUrls.forEach(function(url) {
    add(url, 'FIXED_CRITICAL');
  });

  var gscSheet = spreadsheet.getSheetByName('🔎検索語×ページ');
  if (gscSheet && gscSheet.getLastRow() >= 2) {
    var values = gscSheet.getRange(2, 1, gscSheet.getLastRow() - 1, Math.min(9, gscSheet.getLastColumn())).getValues();
    var byUrl = {};

    values.forEach(function(row) {
      var url = String(row[2] || '');
      var impressions = Number(row[4] || 0);
      if (!url) return;
      if (!byUrl[url]) byUrl[url] = 0;
      byUrl[url] += impressions;
    });

    Object.keys(byUrl).sort(function(a, b) {
      return byUrl[b] - byUrl[a];
    }).forEach(function(url) {
      add(url, 'TOP_GSC_IMPRESSIONS');
    });
  }

  return rows.slice(0, PLAYPOINT_P12_CONFIG.urlInspectionMaxUrls);
}

function playPointP12InspectUrl_(siteUrl, inspectionUrl) {
  return playPointP12GoogleJson_(
    'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
    {
      method: 'post',
      payload: {
        inspectionUrl: inspectionUrl,
        siteUrl: siteUrl,
        languageCode: PLAYPOINT_P12_CONFIG.urlInspectionLanguage
      }
    }
  );
}

function playPointP12GoogleJson_(url, options) {
  options = options || {};
  var response = UrlFetchApp.fetch(url, {
    method: options.method || 'get',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
    },
    payload: options.payload === undefined ? undefined : JSON.stringify(options.payload),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var text = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('Google API ' + code + ' ' + text.slice(0, 1200));
  }

  return text ? JSON.parse(text) : {};
}

function playPointP12AutomationOwnerAllowsCurrentExecution_() {
  var properties = PropertiesService.getScriptProperties();
  var owner = String(
    properties.getProperty('PLAYPOINT_ANALYTICS_AUTOMATION_OWNER_EMAIL') || ''
  ).trim().toLowerCase();
  var current = '';
  try {
    current = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  } catch (ignored) {
    current = '';
  }

  return !owner || !current || owner === current;
}

function playPointP12GetSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('PLAYPOINT_ANALYTICS_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);

  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('PlayPoint Analytics spreadsheet is unavailable.');
  return active;
}

function playPointP12GetGa4PropertyId_() {
  return PropertiesService.getScriptProperties().getProperty('GA4_PROPERTY_ID') ||
    PLAYPOINT_P12_CONFIG.ga4PropertyIdDefault;
}

function playPointP12GetSiteUrl_() {
  var fromProperty = PropertiesService.getScriptProperties().getProperty('SEARCH_CONSOLE_SITE_URL');
  if (fromProperty) return fromProperty;

  if (typeof SEARCH_CONSOLE_SITE_URL !== 'undefined' && SEARCH_CONSOLE_SITE_URL) {
    return SEARCH_CONSOLE_SITE_URL;
  }

  throw new Error('SEARCH_CONSOLE_SITE_URL is missing.');
}

function playPointP12SafeSource_(fn) {
  try {
    var value = fn();

    if (Array.isArray(value)) {
      return { ok: true, rows: value, error: '' };
    }

    if (value && typeof value === 'object' && Array.isArray(value.rows)) {
      var structured = {
        ok: true,
        rows: value.rows,
        error: ''
      };

      Object.keys(value).forEach(function(key) {
        if (key === 'rows') return;
        structured[key] = value[key];
      });

      return structured;
    }

    return {
      ok: true,
      rows: [],
      value: value,
      error: ''
    };
  } catch (error) {
    return { ok: false, rows: [], error: playPointP12ErrorText_(error) };
  }
}

function playPointP12SourceLabel_(source) {
  return source.ok ? 'OK' : 'UNAVAILABLE: ' + source.error;
}

function playPointP12AvailabilityLabel_(sources) {
  var failed = (sources || []).filter(function(source) { return !source.ok; });
  return failed.length ? 'PARTIAL (' + failed.length + ' source errors)' : 'OK';
}

function playPointP12EnsureSheet_(spreadsheet, title, columns) {
  var sheet = spreadsheet.getSheetByName(title);
  if (!sheet) sheet = spreadsheet.insertSheet(title);
  if (sheet.getMaxColumns() < columns) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), columns - sheet.getMaxColumns());
  }
  return sheet;
}

function playPointP12EnsureRows_(sheet, requiredRows) {
  if (sheet.getMaxRows() < requiredRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows());
  }
}

function playPointP12StylePageValueSheet_(sheet, dataRows) {
  sheet.setFrozenRows(5);
  sheet.getRange('A1').setFontWeight('bold').setFontSize(14);
  sheet.getRange(5, 1, 1, 14).setFontWeight('bold');
  if (dataRows) {
    sheet.getRange(6, 4, dataRows, 1).setNumberFormat('0.00%');
    sheet.getRange(6, 11, dataRows, 1).setNumberFormat('0.00%');
    sheet.getRange(6, 12, dataRows, 2).setNumberFormat('¥#,##0.00');
  }
  sheet.setColumnWidth(1, 360);
  sheet.setColumnWidth(14, 180);
}

function playPointP12StyleSearchCrossSheet_(sheet, engineHeaderRow, engineRows, crossHeaderRow, crossRows) {
  sheet.setFrozenRows(crossHeaderRow);
  sheet.getRange('A1').setFontWeight('bold').setFontSize(14);
  sheet.getRange(engineHeaderRow, 1, 1, 5).setFontWeight('bold');
  sheet.getRange(crossHeaderRow, 1, 1, 16).setFontWeight('bold');

  if (engineRows) {
    sheet.getRange(engineHeaderRow + 1, 4, engineRows, 1).setNumberFormat('0.00%');
  }
  if (crossRows) {
    sheet.getRange(crossHeaderRow + 1, 8, crossRows, 2).setNumberFormat('0.00%');
    sheet.getRange(crossHeaderRow + 1, 10, crossRows, 2).setNumberFormat('0.00');
    sheet.getRange(crossHeaderRow + 1, 13, crossRows, 1).setNumberFormat('0.00%');
  }
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 320);
  sheet.setColumnWidth(3, 160);
}

function playPointP12StyleUrlInspectionSheet_(sheet, dataRows) {
  sheet.setFrozenRows(6);
  sheet.getRange('A1').setFontWeight('bold').setFontSize(14);
  sheet.getRange(6, 1, 1, 14).setFontWeight('bold');
  sheet.setColumnWidth(1, 420);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(8, 420);
  sheet.setColumnWidth(9, 420);
  sheet.setColumnWidth(14, 360);
}

function playPointP12Log_(level, stage, message) {
  try {
    var spreadsheet = playPointP12GetSpreadsheet_();
    var sheet = spreadsheet.getSheetByName(PLAYPOINT_P12_CONFIG.logSheet);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(PLAYPOINT_P12_CONFIG.logSheet);
      sheet.getRange('A1:C1').setValues([['日時', '種別', 'ログ詳細メッセージ']]);
    }

    sheet.appendRow([
      new Date(),
      level,
      '[P1P2:' + stage + '] ' + playPointP12OneLine_(message).slice(0, 1800)
    ]);
  } catch (ignored) {
    // Logging must never hide the original data-collection result.
  }
}

function playPointP12TryHealth_(fn) {
  try {
    fn();
  } catch (ignored) {
    // Health reporting is secondary and must never hide collection results.
  }
}

function playPointP12ResultState_(stage, result) {
  if (stage === 'PAGE_VALUE') {
    var availability = result && result.availability ? result.availability : {};
    var sourcePartial = Object.keys(availability).some(function(key) {
      return availability[key] === false;
    });
    var joinPartial = result && result.joinIntegrity &&
      result.joinIntegrity.status === 'PARTIAL';
    return sourcePartial || joinPartial ? 'PARTIAL' : 'OK';
  }

  if (stage === 'SEARCH_CROSS') {
    var cross = result && result.availability ? result.availability : {};
    return Object.keys(cross).some(function(key) { return cross[key] === false; })
      ? 'PARTIAL'
      : 'OK';
  }

  if (stage === 'URL_INSPECTION') {
    return result && Number(result.errors || 0) > 0 ? 'PARTIAL' : 'OK';
  }

  return 'OK';
}

function playPointP12ResultDataLatest_(stage, result) {
  if (stage === 'PAGE_VALUE' && result && result.period) {
    return result.period.end || '';
  }
  if (stage === 'SEARCH_CROSS' && result && result.gscPeriods && result.gscPeriods.current) {
    return result.gscPeriods.current.end || '';
  }
  if (stage === 'URL_INSPECTION') {
    return Utilities.formatDate(new Date(), PLAYPOINT_P12_CONFIG.ga4Timezone, 'yyyy-MM-dd');
  }
  return '';
}

function playPointP12HealthStart_(stage, started) {
  playPointP12UpsertHealth_(stage, {
    lastAttempt: started,
    state: 'RUNNING'
  });
}

function playPointP12HealthSuccess_(stage, finished, state, result) {
  var note = 'P1/P2 collector verified';
  if (state === 'PARTIAL') {
    if (stage === 'PAGE_VALUE' && result && result.joinIntegrity &&
        result.joinIntegrity.status === 'PARTIAL') {
      note = 'GSC/GA4 join integrity warning: ' +
        playPointP12JoinIntegrityText_(result.joinIntegrity) +
        '。実行ログの[P1P2:PAGE_VALUE]を確認';
    } else {
      note = '一部sourceが未取得。実行ログの[P1P2:' + stage + ']を確認';
    }
  }

  playPointP12UpsertHealth_(stage, {
    lastSuccess: finished,
    dataLatest: playPointP12ResultDataLatest_(stage, result),
    state: state,
    consecutiveFailures: 0,
    error: '',
    note: note
  });
}

function playPointP12HealthError_(stage, finished, message) {
  var current = playPointP12ReadHealthRow_(stage);
  playPointP12UpsertHealth_(stage, {
    state: 'ERROR',
    consecutiveFailures: Number(current.consecutiveFailures || 0) + 1,
    error: message,
    note: '実行ログの[P1P2:' + stage + ']に詳細あり'
  });
}

function playPointP12ReadHealthRow_(stage) {
  var spreadsheet = playPointP12GetSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(PLAYPOINT_P12_CONFIG.healthSheet);
  var component = PLAYPOINT_P12_CONFIG.healthComponents[stage] || ('P1P2 ' + stage);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      row: null,
      component: component,
      values: [component, '', '', '', '', 0, '', ''],
      consecutiveFailures: 0
    };
  }

  var names = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < names.length; i += 1) {
    if (String(names[i][0] || '') === component) {
      var rowNumber = i + 2;
      var values = sheet.getRange(rowNumber, 1, 1, 8).getValues()[0];
      return {
        row: rowNumber,
        component: component,
        values: values,
        consecutiveFailures: Number(values[5] || 0)
      };
    }
  }

  return {
    row: null,
    component: component,
    values: [component, '', '', '', '', 0, '', ''],
    consecutiveFailures: 0
  };
}

function playPointP12UpsertHealth_(stage, changes) {
  var spreadsheet = playPointP12GetSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(PLAYPOINT_P12_CONFIG.healthSheet);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(PLAYPOINT_P12_CONFIG.healthSheet);
    sheet.getRange('A1:H1').setValues([[
      'コンポーネント',
      '最終試行',
      '最終成功',
      'データ最新',
      '状態',
      '連続失敗',
      '最終エラー',
      '補足'
    ]]);
  }

  var current = playPointP12ReadHealthRow_(stage);
  var values = current.values.slice();
  values[0] = current.component;

  if (Object.prototype.hasOwnProperty.call(changes, 'lastAttempt')) values[1] = changes.lastAttempt;
  if (Object.prototype.hasOwnProperty.call(changes, 'lastSuccess')) values[2] = changes.lastSuccess;
  if (Object.prototype.hasOwnProperty.call(changes, 'dataLatest')) values[3] = changes.dataLatest;
  if (Object.prototype.hasOwnProperty.call(changes, 'state')) values[4] = changes.state;
  if (Object.prototype.hasOwnProperty.call(changes, 'consecutiveFailures')) values[5] = changes.consecutiveFailures;
  if (Object.prototype.hasOwnProperty.call(changes, 'error')) values[6] = changes.error;
  if (Object.prototype.hasOwnProperty.call(changes, 'note')) values[7] = changes.note;

  var targetRow = current.row || (sheet.getLastRow() + 1);
  sheet.getRange(targetRow, 1, 1, 8).setValues([values]);
  sheet.getRange(targetRow, 2, 1, 2).setNumberFormat('yyyy-mm-dd h:mm:ss');
}

function playPointP12NormalizePage_(value) {
  var text = String(value || '').trim();
  if (!text || text === '(not set)') return text;

  // Apps Script V8 does not provide the browser/Node URL global consistently.
  // Normalize with string operations so GSC absolute URLs and GA4 page paths
  // always join to the same site-relative key.
  var absolute = text.match(/^https?:\/\/([^\/?#]+)([^?#]*)/i);
  if (absolute) {
    var host = String(absolute[1] || '').toLowerCase();
    if (host !== 'playpoint-sim.com' && host !== 'www.playpoint-sim.com') {
      return '';
    }
    text = absolute[2] || '/';
  } else {
    text = text.split(/[?#]/, 1)[0] || '/';
  }

  text = text.split(/[?#]/, 1)[0] || '/';
  if (text.charAt(0) !== '/') text = '/' + text;
  if (text.length > 1 && text.charAt(text.length - 1) === '/') {
    text = text.slice(0, -1);
  }
  return text;
}

function playPointP12ShiftIsoDate_(iso, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) {
    throw new Error('Expected YYYY-MM-DD, got ' + iso);
  }
  var parts = iso.split('-').map(Number);
  var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

function playPointP12NowText_() {
  return Utilities.formatDate(new Date(), PLAYPOINT_P12_CONFIG.ga4Timezone, 'yyyy-MM-dd HH:mm:ss');
}

function playPointP12ErrorText_(error) {
  if (!error) return 'Unknown error';
  var value = error.stack || error.message || String(error);
  return playPointP12OneLine_(value).slice(0, 1800);
}

function playPointP12OneLine_(value) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function playPointP12CompactJson_(value) {
  try {
    return JSON.stringify(value);
  } catch (ignored) {
    return String(value);
  }
}
