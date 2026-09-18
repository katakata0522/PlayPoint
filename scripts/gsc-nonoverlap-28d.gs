'use strict';

/**
 * PlayPoint Analytics: Search Console の非重複28日比較を履歴保存する。
 *
 * 前提:
 * - Google Sheets に紐づく Apps Script で実行する、または
 *   PLAYPOINT_ANALYTICS_SPREADSHEET_ID を Script Properties に設定する。
 * - SEARCH_CONSOLE_SITE_URL を Script Properties に設定する。
 *   既存コードに同名グローバル定数がある場合はそれも利用できる。
 * - Search Console readonly scope を許可する。
 *
 * 既存の「🔎検索語×ページ」は触らない。
 * このモジュールは「🗃GSC 28日履歴」へ追記し、「🔍GSC 28日比較」を再構築する。
 */

var PLAYPOINT_GSC_28D_CONFIG = Object.freeze({
  historySheet: '🗃GSC 28日履歴',
  comparisonSheet: '🔍GSC 28日比較',
  rowLimit: 25000,
  finalProbeDays: 14,
  sourceLabel: 'Search Console API final query×page',
  headers: [
    'pair_id',
    'window_role',
    'period_start',
    'period_end',
    'record_type',
    'search_query',
    'exact_url',
    'clicks',
    'impressions',
    'ctr',
    'avg_position',
    'data_state',
    'fetched_at',
    'source'
  ]
});

function captureGscNonOverlapping28d(finalEndDateText) {
  var spreadsheet = playPointGscGetSpreadsheet_();
  var siteUrl = playPointGscGetSiteUrl_();
  var finalEnd = finalEndDateText || playPointGscFindLatestFinalDate_(siteUrl);
  var windows = playPointGscBuildWindows_(finalEnd);
  var pairId = windows.current.start + '__' + windows.current.end;
  var history = playPointGscEnsureHistorySheet_(spreadsheet);

  if (playPointGscPairExists_(history, pairId)) {
    playPointGscRebuildComparisonView_(spreadsheet, history, pairId);
    return {
      status: 'SKIPPED_ALREADY_CAPTURED',
      pairId: pairId,
      current: windows.current,
      previous: windows.previous
    };
  }

  var currentRows = playPointGscFetchQueryPageRows_(siteUrl, windows.current.start, windows.current.end);
  var previousRows = playPointGscFetchQueryPageRows_(siteUrl, windows.previous.start, windows.previous.end);
  var fetchedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  var values = []
    .concat(playPointGscHistoryValues_(pairId, 'current_28d', windows.current, currentRows, fetchedAt))
    .concat(playPointGscHistoryValues_(pairId, 'previous_28d', windows.previous, previousRows, fetchedAt));

  playPointGscAppendRows_(history, values);
  playPointGscRebuildComparisonView_(spreadsheet, history, pairId);

  return {
    status: 'CAPTURED',
    pairId: pairId,
    current: windows.current,
    previous: windows.previous,
    currentRows: currentRows.length,
    previousRows: previousRows.length
  };
}

function installPlayPointGsc28dWeeklyTrigger() {
  var handler = 'captureGscNonOverlapping28d';
  var existing = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === handler;
  });
  if (existing) return 'EXISTING_TRIGGER';

  ScriptApp.newTrigger(handler)
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(8)
    .create();

  return 'CREATED_WEEKLY_FRIDAY_TRIGGER';
}

function playPointGscGetSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('PLAYPOINT_ANALYTICS_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);

  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('PlayPoint Analytics spreadsheet is not available. Set PLAYPOINT_ANALYTICS_SPREADSHEET_ID.');
  }
  return active;
}

function playPointGscGetSiteUrl_() {
  var fromProperty = PropertiesService.getScriptProperties().getProperty('SEARCH_CONSOLE_SITE_URL');
  if (fromProperty) return fromProperty;

  if (typeof SEARCH_CONSOLE_SITE_URL !== 'undefined' && SEARCH_CONSOLE_SITE_URL) {
    return SEARCH_CONSOLE_SITE_URL;
  }

  throw new Error('SEARCH_CONSOLE_SITE_URL is missing. Reuse the exact Search Console property already used by the existing collector.');
}

function playPointGscBuildWindows_(finalEndDateText) {
  playPointGscAssertIsoDate_(finalEndDateText);

  var currentEnd = finalEndDateText;
  var currentStart = playPointGscShiftIsoDate_(currentEnd, -27);
  var previousEnd = playPointGscShiftIsoDate_(currentStart, -1);
  var previousStart = playPointGscShiftIsoDate_(previousEnd, -27);

  if (playPointGscShiftIsoDate_(previousEnd, 1) !== currentStart) {
    throw new Error('GSC 28-day windows must be adjacent and non-overlapping.');
  }

  return {
    current: { start: currentStart, end: currentEnd, days: 28 },
    previous: { start: previousStart, end: previousEnd, days: 28 }
  };
}

function playPointGscFindLatestFinalDate_(siteUrl) {
  var today = Utilities.formatDate(new Date(), 'GMT', 'yyyy-MM-dd');
  var start = playPointGscShiftIsoDate_(today, -(PLAYPOINT_GSC_28D_CONFIG.finalProbeDays - 1));
  var probe = playPointGscQueryApi_(siteUrl, {
    startDate: start,
    endDate: today,
    dimensions: ['date'],
    dataState: 'all',
    rowLimit: PLAYPOINT_GSC_28D_CONFIG.finalProbeDays,
    startRow: 0
  });

  var metadata = probe.metadata || {};
  if (metadata.first_incomplete_date) {
    return playPointGscShiftIsoDate_(metadata.first_incomplete_date, -1);
  }

  var finalProbe = playPointGscQueryApi_(siteUrl, {
    startDate: start,
    endDate: today,
    dimensions: ['date'],
    dataState: 'final',
    rowLimit: PLAYPOINT_GSC_28D_CONFIG.finalProbeDays,
    startRow: 0
  });

  var dates = (finalProbe.rows || [])
    .map(function(row) { return row.keys && row.keys[0]; })
    .filter(Boolean)
    .sort();

  if (!dates.length) {
    throw new Error('Could not determine the latest final Search Console date. Pass finalEndDateText explicitly.');
  }
  return dates[dates.length - 1];
}

function playPointGscFetchQueryPageRows_(siteUrl, startDate, endDate) {
  var out = [];
  var startRow = 0;

  while (true) {
    var payload = playPointGscQueryApi_(siteUrl, {
      startDate: startDate,
      endDate: endDate,
      dimensions: ['query', 'page'],
      type: 'web',
      dataState: 'final',
      aggregationType: 'byPage',
      rowLimit: PLAYPOINT_GSC_28D_CONFIG.rowLimit,
      startRow: startRow
    });

    var rows = payload.rows || [];
    rows.forEach(function(row) {
      out.push({
        query: row.keys && row.keys[0] ? row.keys[0] : '',
        exactUrl: row.keys && row.keys[1] ? row.keys[1] : '',
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0),
        ctr: Number(row.ctr || 0),
        position: Number(row.position || 0)
      });
    });

    if (rows.length < PLAYPOINT_GSC_28D_CONFIG.rowLimit) break;
    startRow += rows.length;
  }

  return out;
}

function playPointGscQueryApi_(siteUrl, body) {
  var endpoint =
    'https://searchconsole.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(siteUrl) +
    '/searchAnalytics/query';

  var response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var text = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Search Console API failed (' + code + '): ' + text.slice(0, 1000));
  }

  return text ? JSON.parse(text) : {};
}

function playPointGscEnsureHistorySheet_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(PLAYPOINT_GSC_28D_CONFIG.historySheet);
  if (!sheet) sheet = spreadsheet.insertSheet(PLAYPOINT_GSC_28D_CONFIG.historySheet);

  var headers = PLAYPOINT_GSC_28D_CONFIG.headers;
  var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var differs = headers.some(function(header, index) { return current[index] !== header; });

  if (differs) {
    var nonEmpty = current.some(function(value) { return value !== ''; });
    if (nonEmpty) {
      throw new Error('GSC history header differs from the contract. Refusing to overwrite existing data.');
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange('J:J').setNumberFormat('0.00%');
  sheet.getRange('K:K').setNumberFormat('0.00');
  return sheet;
}

function playPointGscPairExists_(sheet, pairId) {
  if (sheet.getLastRow() < 2) return false;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  return values.some(function(row) { return row[0] === pairId; });
}

function playPointGscHistoryValues_(pairId, role, window, rows, fetchedAt) {
  if (!rows.length) {
    return [[
      pairId,
      role,
      window.start,
      window.end,
      'WINDOW_STATUS',
      '',
      '',
      0,
      0,
      0,
      0,
      'NO_ROWS',
      fetchedAt,
      PLAYPOINT_GSC_28D_CONFIG.sourceLabel
    ]];
  }

  return rows.map(function(row) {
    return [
      pairId,
      role,
      window.start,
      window.end,
      'QUERY_PAGE',
      row.query,
      row.exactUrl,
      row.clicks,
      row.impressions,
      row.ctr,
      row.position,
      'FINAL',
      fetchedAt,
      PLAYPOINT_GSC_28D_CONFIG.sourceLabel
    ];
  });
}

function playPointGscAppendRows_(sheet, values) {
  if (!values.length) return;
  var startRow = sheet.getLastRow() + 1;
  var requiredLastRow = startRow + values.length - 1;

  if (requiredLastRow > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), requiredLastRow - sheet.getMaxRows());
  }

  sheet.getRange(startRow, 1, values.length, PLAYPOINT_GSC_28D_CONFIG.headers.length).setValues(values);
}

function playPointGscRebuildComparisonView_(spreadsheet, history, pairId) {
  var sheet = spreadsheet.getSheetByName(PLAYPOINT_GSC_28D_CONFIG.comparisonSheet);
  if (!sheet) sheet = spreadsheet.insertSheet(PLAYPOINT_GSC_28D_CONFIG.comparisonSheet);
  sheet.clearContents();

  var historyRows = [];
  if (history.getLastRow() >= 2) {
    historyRows = history
      .getRange(2, 1, history.getLastRow() - 1, PLAYPOINT_GSC_28D_CONFIG.headers.length)
      .getValues()
      .filter(function(row) { return row[0] === pairId; });
  }

  var currentRows = historyRows.filter(function(row) { return row[1] === 'current_28d'; });
  var previousRows = historyRows.filter(function(row) { return row[1] === 'previous_28d'; });
  var currentPeriod = currentRows.length ? currentRows[0][2] + ' ～ ' + currentRows[0][3] : 'MISSING';
  var previousPeriod = previousRows.length ? previousRows[0][2] + ' ～ ' + previousRows[0][3] : 'MISSING';
  var ready = currentRows.length > 0 && previousRows.length > 0;

  sheet.getRange('A1').setValue('GSC 非重複28日比較');
  sheet.getRange('A2:B7').setValues([
    ['pair_id', pairId],
    ['current_28d', currentPeriod],
    ['previous_28d', previousPeriod],
    ['比較状態', ready ? 'READY' : 'BLOCKED'],
    ['判断', ready ? '同じ query × exact URL で比較可能' : 'SEO変更に進まない'],
    ['正本', PLAYPOINT_GSC_28D_CONFIG.historySheet]
  ]);

  var headers = [
    '検索クエリ',
    'exact URL',
    '現28日 Click',
    '前28日 Click',
    '現28日 Imp.',
    '前28日 Imp.',
    '現28日 CTR',
    '前28日 CTR',
    '現28日 Pos',
    '前28日 Pos',
    'ΔClick',
    'ΔImp.',
    'ΔCTR',
    'ΔPos'
  ];
  sheet.getRange(9, 1, 1, headers.length).setValues([headers]);

  var map = {};
  historyRows.forEach(function(row) {
    if (row[4] !== 'QUERY_PAGE') return;
    var key = row[5] + '\u0000' + row[6];
    if (!map[key]) {
      map[key] = {
        query: row[5],
        url: row[6],
        current: null,
        previous: null
      };
    }
    var metrics = {
      clicks: Number(row[7] || 0),
      impressions: Number(row[8] || 0),
      ctr: Number(row[9] || 0),
      position: Number(row[10] || 0)
    };
    if (row[1] === 'current_28d') map[key].current = metrics;
    if (row[1] === 'previous_28d') map[key].previous = metrics;
  });

  var output = Object.keys(map).map(function(key) {
    var item = map[key];
    var c = item.current || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    var p = item.previous || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    return [
      item.query,
      item.url,
      c.clicks,
      p.clicks,
      c.impressions,
      p.impressions,
      c.ctr,
      p.ctr,
      c.position,
      p.position,
      c.clicks - p.clicks,
      c.impressions - p.impressions,
      c.ctr - p.ctr,
      c.position - p.position
    ];
  });

  output.sort(function(a, b) {
    return Math.max(b[4], b[5]) - Math.max(a[4], a[5]);
  });

  if (output.length) {
    var requiredLastRow = 9 + output.length;
    if (requiredLastRow > sheet.getMaxRows()) {
      sheet.insertRowsAfter(sheet.getMaxRows(), requiredLastRow - sheet.getMaxRows());
    }
    sheet.getRange(10, 1, output.length, headers.length).setValues(output);
  }

  sheet.setFrozenRows(9);
  sheet.getRange('A1').setFontWeight('bold').setFontSize(14);
  sheet.getRange(9, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange('G:H').setNumberFormat('0.00%');
  sheet.getRange('M:M').setNumberFormat('0.00%');
  sheet.getRange('I:J').setNumberFormat('0.00');
  sheet.getRange('N:N').setNumberFormat('0.00');
  sheet.autoResizeColumns(1, headers.length);
}

function playPointGscAssertIsoDate_(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    throw new Error('Expected YYYY-MM-DD date, got: ' + value);
  }
}

function playPointGscShiftIsoDate_(iso, days) {
  playPointGscAssertIsoDate_(iso);
  var parts = iso.split('-').map(Number);
  var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}
