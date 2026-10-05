'use strict';

/**
 * PlayPoint revenue anomaly diagnostics.
 *
 * Goals:
 * - Treat AdSense_GA4日次データ as the daily site-level source of truth.
 * - Detect unusual revenue/rate changes without auto-correcting or excluding evidence.
 * - Drill into AdSense only when the latest reconciled day is unusual.
 * - Keep this diagnostic independent from Drive archive writes so DriveApp failures cannot
 *   hide otherwise valid revenue evidence.
 *
 * AdSense PAGE_URL is intentionally not used here.
 */

var PLAYPOINT_REVENUE_DIAG_CONFIG = Object.freeze({
  sourceSheet: 'AdSense_GA4日次データ',
  outputSheet: '💰収益異常分析',
  healthSheet: '🩺データ鮮度・システム状態',
  healthComponent: '収益異常診断',
  logSheet: '実行ログ',
  timezone: 'Asia/Tokyo',
  baselineDays: 28,
  minimumBaselineDays: 14,
  watchZ: 2.5,
  alertZ: 3.5,
  maxBreakdownRows: 20,
  domain: 'playpoint-sim.com',
  productFilter: 'PRODUCT_CODE==AFC',
  accountProperty: 'ADSENSE_ACCOUNT_NAME',
  metrics: Object.freeze([
    'ESTIMATED_EARNINGS',
    'CLICKS',
    'IMPRESSIONS',
    'PAGE_VIEWS',
    'IMPRESSIONS_CTR',
    'IMPRESSIONS_RPM',
    'COST_PER_CLICK'
  ]),
  breakdowns: Object.freeze([
    Object.freeze({ id: 'COUNTRY', label: '国別', dimensions: Object.freeze(['COUNTRY_CODE']) }),
    Object.freeze({ id: 'PLATFORM', label: '端末別', dimensions: Object.freeze(['PLATFORM_TYPE_CODE']) }),
    Object.freeze({ id: 'BID_TYPE', label: '入札方式別', dimensions: Object.freeze(['BID_TYPE_CODE']) })
  ]),
  anomalyBreakdowns: Object.freeze([
    Object.freeze({
      id: 'COUNTRY_PLATFORM',
      label: '国 × 端末',
      dimensions: Object.freeze(['COUNTRY_CODE', 'PLATFORM_TYPE_CODE'])
    }),
    Object.freeze({
      id: 'COUNTRY_BID',
      label: '国 × 入札方式',
      dimensions: Object.freeze(['COUNTRY_CODE', 'BID_TYPE_CODE'])
    }),
    Object.freeze({
      id: 'PLATFORM_BID',
      label: '端末 × 入札方式',
      dimensions: Object.freeze(['PLATFORM_TYPE_CODE', 'BID_TYPE_CODE'])
    })
  ])
});

function capturePlayPointRevenueDiagnostics(input) {
  return typeof withScriptLock_ === 'function'
    ? withScriptLock_(function() { return playPointRevenueCaptureUnlocked_(input); })
    : playPointRevenueCaptureUnlocked_(input);
}

function playPointRevenueCaptureUnlocked_(input) {
  var triggerEvent = input && typeof input === 'object' ? input : null;
  var requestedDate = typeof input === 'string' ? input : '';

  if (triggerEvent &&
      typeof playPointAutomationTriggerAllowed_ === 'function' &&
      !playPointAutomationTriggerAllowed_('capturePlayPointRevenueDiagnostics', triggerEvent)) {
    return { status: 'SKIPPED_STALE_TRIGGER' };
  }

  var spreadsheet = playPointRevenueGetSpreadsheet_();
  var history = playPointRevenueReadDailyHistory_(spreadsheet);
  var targetDate = requestedDate || playPointRevenueLatestReconciledDate_(history);

  if (!targetDate) {
    throw new Error('No reconciled AdSense/GA4 daily row is available.');
  }

  playPointRevenueHealthStart_(spreadsheet);

  try {
    var analysis = playPointRevenueAnalyze_(history, targetDate, PLAYPOINT_REVENUE_DIAG_CONFIG);
    var breakdowns = playPointRevenueFetchBreakdowns_(targetDate, analysis.severity);
    var sourceHealth = playPointRevenueAssessSourceHealth_(spreadsheet, targetDate);

    playPointRevenueWriteSheet_(spreadsheet, analysis, breakdowns, sourceHealth);
    playPointRevenueHealthSuccess_(spreadsheet, analysis, breakdowns, sourceHealth);
    playPointRevenueLog_(
      spreadsheet,
      analysis.severity === 'NORMAL' ? 'INFO' : 'WARN',
      'target=' + targetDate +
        ' severity=' + analysis.severity +
        ' cause=' + analysis.cause +
        ' revenue=' + analysis.target.revenue +
        ' pageRPM=' + analysis.target.pageRpm +
        ' impRPM=' + analysis.target.impRpm +
        ' breakdowns=' + breakdowns.filter(function(item) { return item.ok; }).length +
        '/' + breakdowns.length
    );

    return {
      targetDate: targetDate,
      severity: analysis.severity,
      cause: analysis.cause,
      analysis: analysis,
      breakdowns: breakdowns,
      sourceHealth: sourceHealth
    };
  } catch (error) {
    var message = playPointRevenueErrorText_(error);
    playPointRevenueHealthError_(spreadsheet, message);
    playPointRevenueLog_(spreadsheet, 'ERROR', message);
    throw error;
  }
}

function installPlayPointRevenueDiagnosticsDailyTrigger() {
  var handler = 'capturePlayPointRevenueDiagnostics';
  var existing = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === handler;
  });

  var created = null;
  try {
    created = ScriptApp.newTrigger(handler)
      .timeBased()
      .everyDays(1)
      .atHour(7)
      .inTimezone(PLAYPOINT_REVENUE_DIAG_CONFIG.timezone)
      .create();

    if (typeof playPointAutomationRegisterTrigger_ === 'function') {
      playPointAutomationRegisterTrigger_(handler, created);
    }

    existing.forEach(function(trigger) {
      try { ScriptApp.deleteTrigger(trigger); } catch (ignored) {}
    });

    return 'CREATED_ACTIVE_DAILY_7_TRIGGER';
  } catch (error) {
    if (created) {
      try { ScriptApp.deleteTrigger(created); } catch (ignoredRollback) {}
    }
    throw error;
  }
}

function playPointRevenueReadDailyHistory_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(PLAYPOINT_REVENUE_DIAG_CONFIG.sourceSheet);
  if (!sheet || sheet.getLastRow() < 2) {
    throw new Error(PLAYPOINT_REVENUE_DIAG_CONFIG.sourceSheet + ' is empty.');
  }

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(value) { return String(value || '').trim(); });
  var required = [
    '日付',
    'PV数（GA4）',
    '推定収益（円）',
    'AdSenseページビュー',
    '広告インプレッション数',
    '広告クリック数',
    'AdSenseページCTR',
    'AdSenseページRPM（円）',
    '広告インプレッションCTR',
    '広告インプレッションRPM（円）',
    'データ状態'
  ];
  var index = {};

  required.forEach(function(name) {
    var found = headers.indexOf(name);
    if (found < 0) throw new Error('Missing required daily column: ' + name);
    index[name] = found;
  });

  return values.slice(1).map(function(row) {
    return {
      date: playPointRevenueIsoDate_(row[index['日付']]),
      ga4Pv: playPointRevenueNumber_(row[index['PV数（GA4）']]),
      revenue: playPointRevenueNumber_(row[index['推定収益（円）']]),
      adsensePv: playPointRevenueNumber_(row[index['AdSenseページビュー']]),
      impressions: playPointRevenueNumber_(row[index['広告インプレッション数']]),
      clicks: playPointRevenueNumber_(row[index['広告クリック数']]),
      pageCtr: playPointRevenueNumber_(row[index['AdSenseページCTR']]),
      pageRpm: playPointRevenueNumber_(row[index['AdSenseページRPM（円）']]),
      impCtr: playPointRevenueNumber_(row[index['広告インプレッションCTR']]),
      impRpm: playPointRevenueNumber_(row[index['広告インプレッションRPM（円）']]),
      dataState: String(row[index['データ状態']] || '').trim()
    };
  }).filter(function(row) {
    return row.date;
  });
}

function playPointRevenueLatestReconciledDate_(history) {
  return history.filter(function(row) {
    return row.dataState === 'RECONCILED';
  }).map(function(row) {
    return row.date;
  }).sort().slice(-1)[0] || '';
}

function playPointRevenueAnalyze_(history, targetDate, config) {
  config = config || PLAYPOINT_REVENUE_DIAG_CONFIG;

  var target = history.filter(function(row) {
    return row.date === targetDate;
  })[0];

  if (!target) throw new Error('Target date is missing from daily history: ' + targetDate);
  if (target.dataState !== 'RECONCILED') {
    throw new Error('Target date is not reconciled: ' + targetDate + ' (' + target.dataState + ')');
  }

  var baselineStartDate = new Date(targetDate + 'T00:00:00Z');
  baselineStartDate.setUTCDate(baselineStartDate.getUTCDate() - config.baselineDays);
  var baselineStartIso = baselineStartDate.toISOString().slice(0, 10);
  var baseline = history.filter(function(row) {
    return row.dataState === 'RECONCILED' && row.date >= baselineStartIso && row.date < targetDate;
  }).sort(function(a, b) {
    return a.date < b.date ? 1 : -1;
  }).slice(0, config.baselineDays);

  if (baseline.length < config.minimumBaselineDays) {
    return {
      targetDate: targetDate,
      target: target,
      baselineCount: baseline.length,
      baselineStart: baseline.length ? baseline[baseline.length - 1].date : '',
      baselineEnd: baseline.length ? baseline[0].date : '',
      severity: 'INSUFFICIENT_HISTORY',
      cause: 'UNDETERMINED',
      metrics: {},
      expectedRevenueAtMedianImpRpm: null,
      excessRevenueVsMedianImpRpm: null,
      excessRevenueShare: null
    };
  }

  var definitions = [
    ['revenue', '推定収益'],
    ['ga4Pv', 'GA4 PV'],
    ['adsensePv', 'AdSense PV'],
    ['impressions', '広告インプレッション'],
    ['clicks', '広告クリック'],
    ['pageCtr', 'ページCTR'],
    ['pageRpm', 'ページRPM'],
    ['impCtr', 'インプレッションCTR'],
    ['impRpm', 'インプレッションRPM']
  ];
  var metrics = {};

  definitions.forEach(function(pair) {
    var key = pair[0];
    var values = baseline.map(function(row) { return playPointRevenueNumber_(row[key]); });
    metrics[key] = playPointRevenueDistribution_(values, playPointRevenueNumber_(target[key]));
    metrics[key].label = pair[1];
  });

  var monetaryZ = Math.max(
    playPointRevenueAbsZ_(metrics.revenue),
    playPointRevenueAbsZ_(metrics.pageRpm),
    playPointRevenueAbsZ_(metrics.impRpm)
  );
  var trafficZ = Math.max(
    playPointRevenueAbsZ_(metrics.ga4Pv),
    playPointRevenueAbsZ_(metrics.adsensePv),
    playPointRevenueAbsZ_(metrics.impressions)
  );
  var clickZ = Math.max(
    playPointRevenueAbsZ_(metrics.clicks),
    playPointRevenueAbsZ_(metrics.pageCtr),
    playPointRevenueAbsZ_(metrics.impCtr)
  );

  var severity = monetaryZ >= config.alertZ
    ? 'HIGH'
    : (monetaryZ >= config.watchZ ? 'WATCH' : 'NORMAL');

  var cause = playPointRevenueClassifyCause_(severity, trafficZ, clickZ, monetaryZ, config);

  var medianImpRpm = metrics.impRpm.median;
  var expected = target.impressions > 0 && medianImpRpm !== null
    ? target.impressions * medianImpRpm / 1000
    : null;
  var excess = expected === null ? null : target.revenue - expected;
  var excessShare = excess !== null && target.revenue > 0 ? excess / target.revenue : null;

  return {
    targetDate: targetDate,
    target: target,
    baselineCount: baseline.length,
    baselineStart: baseline[baseline.length - 1].date,
    baselineEnd: baseline[0].date,
    severity: severity,
    cause: cause,
    trafficZ: trafficZ,
    clickZ: clickZ,
    monetaryZ: monetaryZ,
    metrics: metrics,
    expectedRevenueAtMedianImpRpm: expected,
    excessRevenueVsMedianImpRpm: excess,
    excessRevenueShare: excessShare
  };
}

function playPointRevenueDistribution_(values, target) {
  var clean = values.filter(function(value) {
    return typeof value === 'number' && isFinite(value);
  }).sort(function(a, b) { return a - b; });

  if (!clean.length) {
    return {
      value: target,
      mean: null,
      median: null,
      standardDeviation: null,
      mad: null,
      z: null,
      zMethod: 'NONE',
      min: null,
      max: null
    };
  }

  var mean = clean.reduce(function(sum, value) { return sum + value; }, 0) / clean.length;
  var median = playPointRevenueMedian_(clean);
  var variance = clean.reduce(function(sum, value) {
    return sum + Math.pow(value - mean, 2);
  }, 0) / clean.length;
  var standardDeviation = Math.sqrt(variance);
  var deviations = clean.map(function(value) {
    return Math.abs(value - median);
  }).sort(function(a, b) { return a - b; });
  var mad = playPointRevenueMedian_(deviations);

  var z = null;
  var zMethod = 'NONE';

  if (mad > 0) {
    z = 0.6745 * (target - median) / mad;
    zMethod = 'ROBUST_MAD';
  } else if (standardDeviation > 0) {
    z = (target - mean) / standardDeviation;
    zMethod = 'STANDARD_FALLBACK';
  } else if (target !== median) {
    z = target > median ? Infinity : -Infinity;
    zMethod = 'CONSTANT_BASELINE';
  } else {
    z = 0;
    zMethod = 'CONSTANT_BASELINE';
  }

  return {
    value: target,
    mean: mean,
    median: median,
    standardDeviation: standardDeviation,
    mad: mad,
    z: z,
    zMethod: zMethod,
    min: clean[0],
    max: clean[clean.length - 1]
  };
}

function playPointRevenueMedian_(sortedValues) {
  if (!sortedValues.length) return null;
  var middle = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2) return sortedValues[middle];
  return (sortedValues[middle - 1] + sortedValues[middle]) / 2;
}

function playPointRevenueAbsZ_(metric) {
  var value = metric && metric.z;
  if (value === null || value === undefined || isNaN(value)) return 0;
  return Math.abs(value);
}

function playPointRevenueClassifyCause_(severity, trafficZ, clickZ, monetaryZ, config) {
  if (severity === 'NORMAL') return 'NORMAL_RANGE';
  if (severity === 'INSUFFICIENT_HISTORY') return 'UNDETERMINED';

  var trafficHigh = trafficZ >= config.watchZ;
  var clickHigh = clickZ >= config.watchZ;
  var valueHigh = monetaryZ >= config.watchZ;

  if (valueHigh && !trafficHigh && !clickHigh) return 'UNIT_VALUE_SPIKE';
  if (trafficHigh && !valueHigh && !clickHigh) return 'TRAFFIC_SPIKE';
  if (clickHigh && !valueHigh && !trafficHigh) return 'CLICK_SPIKE';
  return 'MIXED_SPIKE';
}

function playPointRevenueFetchBreakdowns_(targetDate, severity) {
  if (severity === 'INSUFFICIENT_HISTORY') return [];

  var account = playPointRevenueGetAdSenseAccountName_();
  var specs = PLAYPOINT_REVENUE_DIAG_CONFIG.breakdowns.slice();

  if (severity === 'HIGH' || severity === 'WATCH') {
    specs = specs.concat(PLAYPOINT_REVENUE_DIAG_CONFIG.anomalyBreakdowns);
  }

  return specs.map(function(spec) {
    try {
      var result = playPointRevenueGenerateAdSenseReport_(account, targetDate, spec.dimensions);
      return {
        id: spec.id,
        label: spec.label,
        dimensions: spec.dimensions.slice(),
        ok: true,
        rows: result.rows.slice(0, PLAYPOINT_REVENUE_DIAG_CONFIG.maxBreakdownRows),
        totalRows: result.rows.length,
        currency: result.currency || ''
      };
    } catch (error) {
      return {
        id: spec.id,
        label: spec.label,
        dimensions: spec.dimensions.slice(),
        ok: false,
        rows: [],
        totalRows: 0,
        currency: '',
        error: playPointRevenueErrorText_(error)
      };
    }
  });
}

function playPointRevenueGenerateAdSenseReport_(accountName, targetDate, dimensions) {
  if (typeof AdSense === 'undefined' ||
      !AdSense.Accounts ||
      !AdSense.Accounts.Reports ||
      typeof AdSense.Accounts.Reports.generate !== 'function') {
    throw new Error('AdSense advanced service is unavailable.');
  }

  var date = playPointRevenueDateObject_(targetDate);
  var filters = [
    PLAYPOINT_REVENUE_DIAG_CONFIG.productFilter,
    'OWNED_SITE_DOMAIN_NAME==' + PLAYPOINT_REVENUE_DIAG_CONFIG.domain
  ];

  var report = AdSense.Accounts.Reports.generate(accountName, {
    'startDate.year': date.year,
    'startDate.month': date.month,
    'startDate.day': date.day,
    'endDate.year': date.year,
    'endDate.month': date.month,
    'endDate.day': date.day,
    dimensions: dimensions,
    metrics: PLAYPOINT_REVENUE_DIAG_CONFIG.metrics,
    filters: filters,
    orderBy: ['-ESTIMATED_EARNINGS']
  });

  return playPointRevenueParseAdSenseReport_(report, dimensions);
}

function playPointRevenueParseAdSenseReport_(report, dimensions) {
  var headers = report && report.headers ? report.headers : [];
  var headerIndex = {};
  var currency = '';

  headers.forEach(function(header, index) {
    headerIndex[String(header.name || '')] = index;
    if (!currency && header.currency) currency = String(header.currency);
  });

  dimensions.concat(PLAYPOINT_REVENUE_DIAG_CONFIG.metrics).forEach(function(name) {
    if (!Object.prototype.hasOwnProperty.call(headerIndex, name)) {
      throw new Error('AdSense report missing header: ' + name);
    }
  });

  var rows = (report.rows || []).map(function(row) {
    var cells = row.cells || [];
    var result = {};

    dimensions.forEach(function(name) {
      result[name] = playPointRevenueCell_(cells, headerIndex[name]);
    });
    PLAYPOINT_REVENUE_DIAG_CONFIG.metrics.forEach(function(name) {
      result[name] = playPointRevenueNumber_(playPointRevenueCell_(cells, headerIndex[name]));
    });

    return result;
  });

  return { rows: rows, currency: currency };
}

function playPointRevenueGetAdSenseAccountName_() {
  var properties = PropertiesService.getScriptProperties();
  var configured = properties.getProperty(PLAYPOINT_REVENUE_DIAG_CONFIG.accountProperty);
  if (configured) return configured;
  if (typeof resolveAdSenseAccountName_ === 'function') return resolveAdSenseAccountName_();

  if (typeof AdSense === 'undefined' ||
      !AdSense.Accounts ||
      typeof AdSense.Accounts.list !== 'function') {
    throw new Error('AdSense advanced service is unavailable.');
  }

  var response = AdSense.Accounts.list({ pageSize: 100 });
  var accounts = response.accounts || [];

  if (accounts.length === 1 && accounts[0].name) {
    return accounts[0].name;
  }
  if (!accounts.length) {
    throw new Error('No accessible AdSense account.');
  }

  throw new Error(
    'Multiple AdSense accounts are accessible. Set ' +
    PLAYPOINT_REVENUE_DIAG_CONFIG.accountProperty +
    ' to the intended resource name (accounts/pub-...).'
  );
}

function playPointRevenueAssessSourceHealth_(spreadsheet, targetDate) {
  var sheet = spreadsheet.getSheetByName(PLAYPOINT_REVENUE_DIAG_CONFIG.healthSheet);
  var result = {
    targetDate: targetDate,
    dailyReconcileState: '',
    dailyReconcileError: '',
    archiveErrorOnly: false,
    driveState: '',
    note: ''
  };

  if (!sheet || sheet.getLastRow() < 2) return result;

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getDisplayValues();
  values.forEach(function(row) {
    if (String(row[0] || '') === 'Drive保存') {
      result.driveState = String(row[4] || '');
      if (result.driveState === 'ERROR') {
        result.archiveErrorOnly = true;
        result.note = 'Drive補助保存は保留。日次再照合・収益診断とは独立。';
      }
    }
    if (String(row[0] || '') !== '日次再照合') return;
    result.dailyReconcileState = String(row[4] || '');
    result.dailyReconcileError = String(row[6] || '');
  });

  if (result.dailyReconcileState === 'ERROR' &&
      /DriveApp/i.test(result.dailyReconcileError)) {
    result.archiveErrorOnly = true;
    result.note =
      '日次再照合の健康状態はDriveAppでERROR。ただし収益異常診断は既存の日次データを読み取り、' +
      'Driveアーカイブ処理には依存しない。';
  }

  return result;
}

function playPointRevenueWriteSheet_(spreadsheet, analysis, breakdowns, sourceHealth) {
  var sheet = spreadsheet.getSheetByName(PLAYPOINT_REVENUE_DIAG_CONFIG.outputSheet);
  if (!sheet) sheet = spreadsheet.insertSheet(PLAYPOINT_REVENUE_DIAG_CONFIG.outputSheet);
  sheet.clearContents();
  sheet.clearFormats();

  var target = analysis.target;
  var summary = [
    ['💰 PlayPoint 収益異常分析', '', '', '', '', '', '', ''],
    ['対象日', analysis.targetDate, '判定', analysis.severity, '主因', analysis.cause, 'データ状態', target.dataState],
    [
      '基準期間',
      analysis.baselineStart && analysis.baselineEnd
        ? analysis.baselineStart + ' ～ ' + analysis.baselineEnd
        : '',
      '基準日数',
      analysis.baselineCount,
      '期待収益（中央値impRPM基準）',
      analysis.expectedRevenueAtMedianImpRpm,
      '上振れ寄与率',
      analysis.excessRevenueShare
    ],
    [
      '日次再照合',
      sourceHealth.dailyReconcileState || 'UNKNOWN',
      'Drive保存との分離',
      sourceHealth.archiveErrorOnly ? 'ARCHIVE_ERROR_SEPARATED' : (sourceHealth.driveState || 'NO_DRIVEAPP_ERROR'),
      '補足',
      sourceHealth.note || '',
      '取得日時',
      new Date()
    ]
  ];
  sheet.getRange(1, 1, summary.length, 8).setValues(summary);

  var metricHeaders = ['指標', '対象値', '基準平均', '基準中央値', 'MAD', 'Z', 'Z方式', '判定'];
  sheet.getRange(6, 1, 1, metricHeaders.length).setValues([metricHeaders]);

  var metricOrder = [
    'revenue', 'ga4Pv', 'adsensePv', 'impressions', 'clicks',
    'pageCtr', 'pageRpm', 'impCtr', 'impRpm'
  ];
  var metricRows = metricOrder.map(function(key) {
    var metric = analysis.metrics[key] || {};
    var z = metric.z;
    var status = z === null || z === undefined
      ? ''
      : (Math.abs(z) >= PLAYPOINT_REVENUE_DIAG_CONFIG.alertZ
        ? 'HIGH'
        : (Math.abs(z) >= PLAYPOINT_REVENUE_DIAG_CONFIG.watchZ ? 'WATCH' : 'NORMAL'));
    return [
      metric.label || key,
      metric.value === undefined ? '' : metric.value,
      metric.mean === null || metric.mean === undefined ? '' : metric.mean,
      metric.median === null || metric.median === undefined ? '' : metric.median,
      metric.mad === null || metric.mad === undefined ? '' : metric.mad,
      z === null || z === undefined || !isFinite(z) ? String(z === Infinity ? '∞' : (z === -Infinity ? '-∞' : '')) : z,
      metric.zMethod || '',
      status
    ];
  });

  if (metricRows.length) {
    sheet.getRange(7, 1, metricRows.length, metricHeaders.length).setValues(metricRows);
  }

  var startRow = 18;
  breakdowns.forEach(function(block) {
    sheet.getRange(startRow, 1).setValue('AdSense ' + block.label);
    sheet.getRange(startRow, 2).setValue(block.ok ? 'OK' : 'UNAVAILABLE');
    sheet.getRange(startRow, 3).setValue(block.currency || '');
    if (!block.ok) {
      sheet.getRange(startRow + 1, 1).setValue(block.error || 'Unknown error');
      startRow += 4;
      return;
    }

    var headers = block.dimensions.concat([
      'ESTIMATED_EARNINGS',
      'CLICKS',
      'IMPRESSIONS',
      'PAGE_VIEWS',
      'IMPRESSIONS_CTR',
      'IMPRESSIONS_RPM',
      'COST_PER_CLICK'
    ]);
    sheet.getRange(startRow + 1, 1, 1, headers.length).setValues([headers]);

    var rows = block.rows.map(function(row) {
      return block.dimensions.map(function(name) {
        return row[name];
      }).concat([
        row.ESTIMATED_EARNINGS,
        row.CLICKS,
        row.IMPRESSIONS,
        row.PAGE_VIEWS,
        row.IMPRESSIONS_CTR,
        row.IMPRESSIONS_RPM,
        row.COST_PER_CLICK
      ]);
    });

    if (rows.length) {
      sheet.getRange(startRow + 2, 1, rows.length, headers.length).setValues(rows);
      var earningsColumn = block.dimensions.length + 1;
      var ctrColumn = block.dimensions.length + 5;
      var rpmColumn = block.dimensions.length + 6;
      var cpcColumn = block.dimensions.length + 7;
      sheet.getRange(startRow + 2, earningsColumn, rows.length, 1).setNumberFormat('0.00');
      sheet.getRange(startRow + 2, ctrColumn, rows.length, 1).setNumberFormat('0.00%');
      sheet.getRange(startRow + 2, rpmColumn, rows.length, 1).setNumberFormat('0.00');
      sheet.getRange(startRow + 2, cpcColumn, rows.length, 1).setNumberFormat('0.00');
    }
    startRow += Math.max(5, rows.length + 4);
  });

  sheet.setFrozenRows(6);
  sheet.getRange('A1').setFontWeight('bold').setFontSize(14);
  sheet.getRange(6, 1, 1, 8).setFontWeight('bold');
  sheet.getRange(7, 6, metricRows.length, 1).setNumberFormat('0.00');
  sheet.getRange(3, 6).setNumberFormat('0.00');
  sheet.getRange(3, 8).setNumberFormat('0.0%');
  sheet.getRange(4, 8).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 170);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 170);
  sheet.setColumnWidth(6, 140);
  sheet.setColumnWidth(7, 170);
  sheet.setColumnWidth(8, 220);
}

function playPointRevenueGetSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('PLAYPOINT_ANALYTICS_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);

  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('PlayPoint Analytics spreadsheet is unavailable.');
  return active;
}

function playPointRevenueHealthStart_(spreadsheet) {
  playPointRevenueUpsertHealth_(spreadsheet, {
    lastAttempt: new Date(),
    state: 'RUNNING'
  });
}

function playPointRevenueHealthSuccess_(spreadsheet, analysis, breakdowns, sourceHealth) {
  var failed = breakdowns.filter(function(item) { return !item.ok; }).length;
  var note =
    'cause=' + analysis.cause +
    ' / breakdown=' + (breakdowns.length - failed) + '/' + breakdowns.length;

  if (sourceHealth.archiveErrorOnly) {
    note += ' / 日次再照合のDriveAppエラーとは分離';
  }

  playPointRevenueUpsertHealth_(spreadsheet, {
    lastSuccess: new Date(),
    dataLatest: analysis.targetDate,
    state: failed ? 'PARTIAL' : analysis.severity,
    consecutiveFailures: 0,
    error: failed ? failed + ' breakdown(s) unavailable' : '',
    note: note
  });
}

function playPointRevenueHealthError_(spreadsheet, message) {
  var current = playPointRevenueReadHealth_(spreadsheet);
  playPointRevenueUpsertHealth_(spreadsheet, {
    state: 'ERROR',
    consecutiveFailures: Number(current.consecutiveFailures || 0) + 1,
    error: message,
    note: '実行ログの[REVENUE_DIAG]を確認'
  });
}

function playPointRevenueReadHealth_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(PLAYPOINT_REVENUE_DIAG_CONFIG.healthSheet);
  if (!sheet || sheet.getLastRow() < 2) {
    return {
      row: null,
      values: [PLAYPOINT_REVENUE_DIAG_CONFIG.healthComponent, '', '', '', '', 0, '', ''],
      consecutiveFailures: 0
    };
  }

  var names = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < names.length; i += 1) {
    if (String(names[i][0] || '') === PLAYPOINT_REVENUE_DIAG_CONFIG.healthComponent) {
      var rowNumber = i + 2;
      var values = sheet.getRange(rowNumber, 1, 1, 8).getValues()[0];
      return {
        row: rowNumber,
        values: values,
        consecutiveFailures: Number(values[5] || 0)
      };
    }
  }

  return {
    row: null,
    values: [PLAYPOINT_REVENUE_DIAG_CONFIG.healthComponent, '', '', '', '', 0, '', ''],
    consecutiveFailures: 0
  };
}

function playPointRevenueUpsertHealth_(spreadsheet, changes) {
  var sheet = spreadsheet.getSheetByName(PLAYPOINT_REVENUE_DIAG_CONFIG.healthSheet);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(PLAYPOINT_REVENUE_DIAG_CONFIG.healthSheet);
    sheet.getRange('A1:H1').setValues([[
      'コンポーネント', '最終試行', '最終成功', 'データ最新',
      '状態', '連続失敗', '最終エラー', '補足'
    ]]);
  }

  var current = playPointRevenueReadHealth_(spreadsheet);
  var values = current.values.slice();
  values[0] = PLAYPOINT_REVENUE_DIAG_CONFIG.healthComponent;

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

function playPointRevenueLog_(spreadsheet, level, message) {
  try {
    var sheet = spreadsheet.getSheetByName(PLAYPOINT_REVENUE_DIAG_CONFIG.logSheet);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(PLAYPOINT_REVENUE_DIAG_CONFIG.logSheet);
      sheet.getRange('A1:C1').setValues([['日時', '種別', 'ログ詳細メッセージ']]);
    }
    sheet.appendRow([
      new Date(),
      level,
      '[REVENUE_DIAG] ' + playPointRevenueOneLine_(message).slice(0, 1800)
    ]);
  } catch (ignored) {}
}

function playPointRevenueIsoDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, PLAYPOINT_REVENUE_DIAG_CONFIG.timezone, 'yyyy-MM-dd');
  }
  var text = String(value).trim();
  var match = text.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (!match) return '';
  return match[1] + '-' + String(Number(match[2])).padStart(2, '0') + '-' +
    String(Number(match[3])).padStart(2, '0');
}

function playPointRevenueDateObject_(iso) {
  var match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Expected YYYY-MM-DD, got ' + iso);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

function playPointRevenueNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  if (value === null || value === undefined || value === '') return 0;
  var text = String(value).replace(/[¥$,%\s,]/g, '');
  var number = Number(text);
  return isFinite(number) ? number : 0;
}

function playPointRevenueCell_(cells, index) {
  if (index === undefined || index === null || index < 0 || !cells[index]) return '';
  return cells[index].value === undefined || cells[index].value === null
    ? ''
    : cells[index].value;
}

function playPointRevenueErrorText_(error) {
  if (!error) return 'Unknown error';
  return playPointRevenueOneLine_(error.stack || error.message || String(error)).slice(0, 1800);
}

function playPointRevenueOneLine_(value) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}
