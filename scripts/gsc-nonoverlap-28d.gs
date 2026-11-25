'use strict';

/**
 * PlayPoint Analytics: Search Console の非重複28日比較を履歴保存する。
 *
 * P0 capture contract:
 * - Raw: query × exact URL, fragmentを保持
 * - Normalized: query × base URL, fragmentのみ除去してRawから派生
 * - Property Total: dimensionなし / byProperty
 * - current_28d と previous_28d は隣接した非重複28日
 * - Search ConsoleのFINALデータだけを比較に使う
 *
 * 既存の「🔎検索語×ページ」は触らない。
 */

var PLAYPOINT_GSC_28D_CONFIG = Object.freeze({
  historySheet: '🗃GSC 28日履歴',
  indexSheet: '🗂GSC履歴索引',
  indexVersion: 'GSC_HISTORY_INDEX_V1',
  indexScanChunk: 20000,
  indexAuditMs: 28 * 24 * 60 * 60 * 1000,
  // 運用上の早期警告であってGoogle Sheetsのプラットフォーム上限ではない。
  historyPlanningCells: 8000000,
  comparisonSheet: '🔍GSC 28日比較',
  normalizedComparisonSheet: '🧹GSC 28日正規化',
  rowLimit: 25000,
  finalProbeDays: 14,
  searchType: 'web',
  apiTimezone: 'America/Los_Angeles',
  triggerTimezone: 'Asia/Tokyo',
  sourceLabel: 'Search Console Search Analytics API',
  layers: Object.freeze({
    raw: 'raw',
    normalized: 'normalized',
    propertyTotal: 'property_total'
  }),
  headers: [
    'pair_id',
    'window_role',
    'layer',
    'period_start',
    'period_end',
    'record_type',
    'search_query',
    'exact_url',
    'base_url',
    'clicks',
    'impressions',
    'ctr',
    'avg_position',
    'data_state',
    'search_type',
    'dimensions',
    'request_aggregation_type',
    'response_aggregation_type',
    'site_property',
    'api_timezone',
    'fetched_at',
    'source',
    'derivation'
  ]
});

function captureGscNonOverlapping28d(input) {
  var capture = function() {
    if (typeof recordHealthAttempt_ === 'function') recordHealthAttempt_('GSC_28D');
    try {
      var result = playPointGscCaptureUnlocked_(input);
      if (result.status !== 'SKIPPED_STALE_TRIGGER' && typeof recordHealthSuccess_ === 'function') {
        recordHealthSuccess_('GSC_28D', {
          dataThrough: result.current.end,
          dataState: 'FINAL',
          detail: result.status + ' / ' + result.pairId + ' / query rows are API-visible rows, not all searches'
        });
        updateHealthSheet_(playPointGscGetSpreadsheet_());
      }
      return result;
    } catch (error) {
      if (typeof recordHealthFailure_ === 'function') {
        recordHealthFailure_('GSC_28D', error);
        updateHealthSheet_(playPointGscGetSpreadsheet_());
      }
      throw error;
    }
  };
  return typeof withScriptLock_ === 'function' ? withScriptLock_(capture) : capture();
}

function playPointGscCaptureUnlocked_(input) {
  var event = input && typeof input === 'object' ? input : null;
  var finalEndDateText = typeof input === 'string' ? input : '';

  if (typeof playPointAutomationTriggerAllowed_ === 'function' &&
      !playPointAutomationTriggerAllowed_('captureGscNonOverlapping28d', event)) {
    return { status: 'SKIPPED_STALE_TRIGGER' };
  }

  var spreadsheet = playPointGscGetSpreadsheet_();
  var siteUrl = playPointGscGetSiteUrl_();
  var finalEnd = finalEndDateText || playPointGscFindLatestFinalDate_(siteUrl);
  var windows = playPointGscBuildWindows_(finalEnd);
  var pairId = windows.current.start + '__' + windows.current.end;
  var history = playPointGscEnsureHistorySheet_(spreadsheet);
  var existingRows = playPointGscRowsForPair_(history, pairId);
  var existingKeys = playPointGscExistingRecordKeys_(existingRows);
  if (Object.keys(existingKeys).length !== existingRows.length) throw new Error('GSC履歴に同一レコードの重複があります。正本を保持し、比較を保留します。');

  var receiptRows = existingRows.filter(function(row){return row[5]==='PAIR_RECEIPT';});
  // 旧版の6層だけの履歴は保存完了の証明ではない。再取得と照合するまでは完了扱いにしない。
  if (receiptRows.length) {
    if (!playPointGscVerifiedPair_(existingRows,pairId,windows,siteUrl)) throw new Error('GSC完了記録と保存データが不一致。正本を保持し、比較を保留。');
    playPointGscRebuildComparisonViews_(spreadsheet, existingRows, pairId);
    return {
      status: 'SKIPPED_ALREADY_COMPLETE',
      pairId: pairId,
      current: windows.current,
      previous: windows.previous
    };
  }

  var fetchedAt = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || 'Asia/Tokyo',
    'yyyy-MM-dd HH:mm:ss'
  );

  var currentBundle = playPointGscFetchWindowBundle_(siteUrl, windows.current);
  var previousBundle = playPointGscFetchWindowBundle_(siteUrl, windows.previous);

  var allValues = []
    .concat(playPointGscBundleHistoryValues_(
      pairId,
      'current_28d',
      windows.current,
      currentBundle,
      siteUrl,
      fetchedAt
    ))
    .concat(playPointGscBundleHistoryValues_(
      pairId,
      'previous_28d',
      windows.previous,
      previousBundle,
      siteUrl,
      fetchedAt
    ));

  var expected = playPointGscEvidence_(allValues,pairId,windows,siteUrl);
  // 中断後にAPIが変化していたら、異なるスナップショットを混ぜない。旧行を勝手に変更しない。
  existingRows.forEach(function(row) {
    var key=playPointGscRecordKey_(row);
    if (!Object.prototype.hasOwnProperty.call(expected.byKey,key) ||
        expected.byKey[key]!==playPointGscCanonicalRow_(row)) {
      throw new Error('GSC既存履歴と再取得の証拠が異なります。混在を防止し、既存履歴を保持。');
    }
  });
  var newValues = allValues.filter(function(row) {
    return !existingKeys[playPointGscRecordKey_(row)];
  });

  playPointGscAppendRows_(history, newValues);

  var finalRows = playPointGscRowsForPair_(history, pairId);
  // 今回APIが返した全レコードが保存されたことを確認する。6層の存在だけで今回の欠測を見逃さない。
  var actual=playPointGscEvidence_(finalRows,pairId,windows,siteUrl);
  if(actual.digest!==expected.digest || actual.count!==expected.count) {
    throw new Error('GSC 28-day capture is incomplete after write. Comparison remains blocked.');
  }
  // 完了記録を最後に追記。失敗した実行は次回APIとの厳密照合から再開する。
  playPointGscAppendRows_(history,[playPointGscReceiptRow_(pairId,windows,siteUrl,fetchedAt,expected)]);
  var verifiedRows=playPointGscRowsForPair_(history,pairId);
  if(!playPointGscVerifiedPair_(verifiedRows,pairId,windows,siteUrl)) throw new Error('GSC完了記録の書込後検証失敗');
  playPointGscRebuildComparisonViews_(spreadsheet, verifiedRows, pairId);

  return {
    status: existingRows.length ? 'REVERIFIED_PAIR' : 'CAPTURED',
    pairId: pairId,
    current: windows.current,
    previous: windows.previous,
    appendedRows: newValues.length,
    currentRawRows: currentBundle.raw.rows.length,
    previousRawRows: previousBundle.raw.rows.length,
    currentNormalizedRows: currentBundle.normalized.length,
    previousNormalizedRows: previousBundle.normalized.length
  };
}

function installPlayPointGsc28dWeeklyTrigger() {
  var handler = 'captureGscNonOverlapping28d';
  var existing = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === handler;
  });

  if (typeof playPointAutomationRegisterTrigger_ === 'function') {
    var created = null;
    try {
      created = ScriptApp.newTrigger(handler)
        .timeBased()
        .onWeekDay(ScriptApp.WeekDay.FRIDAY)
        .atHour(8)
        .inTimezone(PLAYPOINT_GSC_28D_CONFIG.triggerTimezone)
        .create();

      playPointAutomationRegisterTrigger_(handler, created);
      existing.forEach(function(trigger) {
        try { ScriptApp.deleteTrigger(trigger); } catch (ignored) {}
      });
      return 'CREATED_ACTIVE_WEEKLY_FRIDAY_TRIGGER';
    } catch (error) {
      if (created) {
        try { ScriptApp.deleteTrigger(created); } catch (ignoredRollback) {}
      }
      throw error;
    }
  }

  if (existing.length) return 'EXISTING_TRIGGER';
  ScriptApp.newTrigger(handler)
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(8)
    .inTimezone(PLAYPOINT_GSC_28D_CONFIG.triggerTimezone)
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

  if (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.SEARCH_CONSOLE_SITE_URL) {
    return CONFIG.SEARCH_CONSOLE_SITE_URL;
  }
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
  var today = Utilities.formatDate(new Date(), PLAYPOINT_GSC_28D_CONFIG.apiTimezone, 'yyyy-MM-dd');
  var start = playPointGscShiftIsoDate_(today, -(PLAYPOINT_GSC_28D_CONFIG.finalProbeDays - 1));

  var probe = playPointGscQueryApi_(siteUrl, {
    startDate: start,
    endDate: today,
    dimensions: ['date'],
    type: PLAYPOINT_GSC_28D_CONFIG.searchType,
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
    type: PLAYPOINT_GSC_28D_CONFIG.searchType,
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

function playPointGscFetchWindowBundle_(siteUrl, window) {
  var raw = playPointGscFetchQueryPageRows_(siteUrl, window.start, window.end);
  var normalized = playPointGscNormalizeRows_(raw.rows);
  var propertyTotal = playPointGscFetchPropertyTotal_(siteUrl, window.start, window.end);

  return {
    raw: raw,
    normalized: normalized,
    propertyTotal: propertyTotal
  };
}

function playPointGscFetchQueryPageRows_(siteUrl, startDate, endDate) {
  var out = [];
  var startRow = 0;
  var responseAggregationType = '';
  var seenKeys=Object.create(null);

  while (true) {
    var payload = playPointGscQueryApi_(siteUrl, {
      startDate: startDate,
      endDate: endDate,
      dimensions: ['query', 'page'],
      type: PLAYPOINT_GSC_28D_CONFIG.searchType,
      dataState: 'final',
      aggregationType: 'byPage',
      rowLimit: PLAYPOINT_GSC_28D_CONFIG.rowLimit,
      startRow: startRow
    });

    playPointGscAssertAggregation_(payload.responseAggregationType, 'byPage', 'Raw query × page');
    responseAggregationType = payload.responseAggregationType;

    var rows = payload.rows || [];
    rows.forEach(function(row) {
      var exactUrl = row.keys && row.keys[1] ? row.keys[1] : '';
      if(!Array.isArray(row.keys)||row.keys.length!==2||typeof row.keys[0]!=='string'||!row.keys[0]||
          !/^https?:\/\//.test(exactUrl)||!Number.isSafeInteger(row.clicks)||!Number.isSafeInteger(row.impressions)||
          row.clicks<0||row.impressions<row.clicks||!Number.isFinite(row.ctr)||row.ctr<0||row.ctr>1||
          !Number.isFinite(row.position)||row.position<0) throw new Error('GSC Raw APIの行が不正');
      var key=JSON.stringify(row.keys);
      if(seenKeys[key]) throw new Error('GSC Raw APIのページングで重複行');
      seenKeys[key]=true;
      out.push({
        query: row.keys && row.keys[0] ? row.keys[0] : '',
        exactUrl: exactUrl,
        baseUrl: playPointGscBaseUrl_(exactUrl),
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0),
        ctr: Number(row.ctr || 0),
        position: Number(row.position || 0)
      });
    });

    if (rows.length < PLAYPOINT_GSC_28D_CONFIG.rowLimit) break;
    startRow += rows.length;
    if(startRow>=100000) throw new Error('GSC Raw取得安全上限。切り捨てた履歴を完全扱いしない。');
  }

  return {
    rows: out,
    requestAggregationType: 'byPage',
    responseAggregationType: responseAggregationType
  };
}

function playPointGscFetchPropertyTotal_(siteUrl, startDate, endDate) {
  var payload = playPointGscQueryApi_(siteUrl, {
    startDate: startDate,
    endDate: endDate,
    dimensions: [],
    type: PLAYPOINT_GSC_28D_CONFIG.searchType,
    dataState: 'final',
    aggregationType: 'byProperty',
    rowLimit: 1,
    startRow: 0
  });

  playPointGscAssertAggregation_(payload.responseAggregationType, 'byProperty', 'Property Total');

  if(!Array.isArray(payload.rows)||payload.rows.length!==1) throw new Error('GSC Property Totalが未取得。ゼロとして保存しない。');
  var row=payload.rows[0];
  if(!Number.isSafeInteger(row.clicks)||!Number.isSafeInteger(row.impressions)||row.clicks<0||row.impressions<row.clicks||
      !Number.isFinite(row.ctr)||row.ctr<0||row.ctr>1||!Number.isFinite(row.position)||row.position<0) throw new Error('GSC Property Totalが不正');
  return {
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
    requestAggregationType: 'byProperty',
    responseAggregationType: payload.responseAggregationType
  };
}

function playPointGscNormalizeRows_(rawRows) {
  var map = {};

  (rawRows || []).forEach(function(row) {
    var baseUrl = playPointGscBaseUrl_(row.exactUrl);
    var key = String(row.query || '') + '\u0000' + baseUrl;
    if (!map[key]) {
      map[key] = {
        query: String(row.query || ''),
        baseUrl: baseUrl,
        clicks: 0,
        impressions: 0,
        weightedPosition: 0
      };
    }

    var impressions = Number(row.impressions || 0);
    map[key].clicks += Number(row.clicks || 0);
    map[key].impressions += impressions;
    map[key].weightedPosition += Number(row.position || 0) * impressions;
  });

  return Object.keys(map).map(function(key) {
    var item = map[key];
    return {
      query: item.query,
      baseUrl: item.baseUrl,
      clicks: item.clicks,
      impressions: item.impressions,
      ctr: item.impressions > 0 ? item.clicks / item.impressions : 0,
      position: item.impressions > 0 ? item.weightedPosition / item.impressions : 0
    };
  });
}

function playPointGscBaseUrl_(exactUrl) {
  return String(exactUrl || '').split('#')[0];
}

function playPointGscAssertAggregation_(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(label + ' aggregation mismatch: expected ' + expected + ', got ' + (actual || 'MISSING'));
  }
}

function playPointGscQueryApi_(siteUrl, body) {
  var endpoint =
    'https://searchconsole.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(siteUrl) +
    '/searchAnalytics/query';

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  };
  if (typeof fetchJsonWithRetry_ === 'function') return fetchJsonWithRetry_(endpoint, options, 3);
  var response;
  for (var attempt = 0; attempt < 3; attempt += 1) {
    response = UrlFetchApp.fetch(endpoint, options);
    var status = response.getResponseCode();
    if ((status !== 429 && status < 500) || attempt === 2) break;
    Utilities.sleep(Math.pow(2, attempt) * 1000);
  }

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
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }

  var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var differs = headers.some(function(header, index) { return current[index] !== header; });

  if (differs) {
    if (sheet.getLastRow() > 1) {
      throw new Error('GSC history header differs from the P0 contract and data rows already exist. Refusing destructive migration.');
    }
    sheet.getRange(1, 1, 1, headers.length).clearContent();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  // 既存の履歴全列を週次で書式更新しない。新規追記範囲だけを設定する。
  return sheet;
}

// 索引は再生成可能な派生データ。履歴正本は追記専用で変更・削除しない。
function playPointGscIndexPairValid_(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  try {
    var parts = value.split('__');
    playPointGscAssertIsoDate_(parts[0]); playPointGscAssertIsoDate_(parts[1]);
    return playPointGscShiftIsoDate_(parts[0], 27) === parts[1];
  } catch (error) { return false; }
}

function playPointGscIndexAppendIds_(blocks, ids, firstRow) {
  ids.forEach(function(row, i) {
    var id = row[0], n = firstRow + i;
    if (!playPointGscIndexPairValid_(id)) throw new Error('GSC履歴に空欄・不正pair_idがあります: row ' + n);
    var last = blocks[blocks.length - 1];
    if (last && last[2] + 1 !== n) throw new Error('GSC履歴索引の行位置が連続していません');
    if (last && last[0] === id) { last[2] = n; last[3]++; }
    else blocks.push([id, n, n, 1]);
  });
  return blocks;
}

function playPointGscIndexRead_(grid, sourceId, lastRow, nowMs) {
  var cfg = PLAYPOINT_GSC_28D_CONFIG;
  if (!grid.length) return null;
  if (grid[0][0] !== cfg.indexVersion) throw new Error('GSC履歴索引と同名の別シートです。上書きしません');
  var m = grid[1] || [], cursor = Number(m[1]), audited = Number(m[2]);
  if (String(m[0]) !== String(sourceId) || !Number.isSafeInteger(cursor) || cursor < 1 || cursor > lastRow ||
      !Number.isFinite(audited) || audited <= 0 || audited > nowMs || nowMs-audited >= cfg.indexAuditMs ||
      !grid[2] || grid[2].slice(0,4).join('|') !== 'pair_id|start_row|end_row|row_count') return null;
  var blocks = [], expected = 2;
  for (var i=3;i<grid.length;i++) {
    var row=grid[i], id=row[0], a=Number(row[1]), b=Number(row[2]), count=Number(row[3]);
    if (!playPointGscIndexPairValid_(id) || !Number.isSafeInteger(a) || !Number.isSafeInteger(b) ||
        a!==expected || b<a || b>cursor || count!==b-a+1 ||
        (blocks.length && blocks[blocks.length-1][0]===id)) return null;
    blocks.push([id,a,b,count]); expected=b+1;
  }
  if (expected!==cursor+1 || String(m[3]||'')!==(blocks.length?blocks[blocks.length-1][0]:'')) return null;
  return {cursor:cursor,audited:audited,blocks:blocks};
}

function playPointGscIndexCapacity_(spreadsheet, history, blocks, lastRow) {
  var cfg=PLAYPOINT_GSC_28D_CONFIG;
  var cells=spreadsheet.getSheets().reduce(function(sum,sheet) {
    return sum+sheet.getMaxRows()*sheet.getMaxColumns();
  },0);
  // 直近4つのpairの行数。非連続の補完ブロックもpairごとに足す。
  var counts=Object.create(null);
  blocks.forEach(function(block){counts[block[0]]=(counts[block[0]]||0)+block[3];});
  var recent=Object.keys(counts).sort().slice(-4);
  var estimate=recent.length?Math.ceil(recent.reduce(function(sum,id){return sum+counts[id];},0)/recent.length):0;
  var expectedCells=estimate*history.getMaxColumns();
  var headroom=Math.max(0,cfg.historyPlanningCells-cells);
  return {cells:cells,nextRows:estimate,nextCells:expectedCells,
    weeks:expectedCells?Math.floor(headroom/expectedCells):'',
    state:cells+expectedCells>=cfg.historyPlanningCells?'PLAN_ARCHIVE':expectedCells&&headroom/expectedCells<=8?'PLAN_SOON':'OK',
    historyRows:Math.max(0,lastRow-1),pairs:Object.keys(counts).length};
}

function playPointGscIndexWrite_(index, sourceId, state, capacity) {
  var cfg=PLAYPOINT_GSC_28D_CONFIG, width=8;
  var grid=[
    [cfg.indexVersion,'scan_cursor','last_full_scan_ms','last_pair_id','allocated_cells','planning_budget_cells','state','weekly_estimate_rows'],
    [String(sourceId),state.cursor,state.audited,state.blocks.length?state.blocks[state.blocks.length-1][0]:'',
      capacity.cells,cfg.historyPlanningCells,capacity.state,capacity.nextRows],
    ['pair_id','start_row','end_row','row_count','履歴行数',capacity.historyRows,'計画余裕（週）',capacity.weeks]
  ];
  state.blocks.forEach(function(block){grid.push(block.concat(['','','','']));});
  var previous=index.getLastRow();
  if(index.getMaxColumns()<width) index.insertColumnsAfter(index.getMaxColumns(),width-index.getMaxColumns());
  if(index.getMaxRows()<grid.length) index.insertRowsAfter(index.getMaxRows(),grid.length-index.getMaxRows());
  index.getRange(1,1,grid.length,width).setValues(grid);
  if(previous>grid.length) index.getRange(grid.length+1,1,previous-grid.length,width).clearContent();
  index.setFrozenRows(3);
  index.getRange(1,1,1,width).setFontWeight('bold');
  index.getRange(3,1,1,4).setFontWeight('bold');
  index.setColumnWidth(1,270);
  index.setColumnWidths(2,width-1,165);
}

function playPointGscEnsureIndex_(sheet, force) {
  var cfg=PLAYPOINT_GSC_28D_CONFIG, ss=sheet.getParent(), sourceId=sheet.getSheetId();
  var lastRow=sheet.getLastRow(), nowMs=Date.now();
  var index=ss.getSheetByName(cfg.indexSheet);
  if(!index) index=ss.insertSheet(cfg.indexSheet);
  var grid=index.getLastRow()?index.getRange(1,1,index.getLastRow(),8).getValues():[];
  var state=playPointGscIndexRead_(grid,sourceId,lastRow,nowMs);
  var rebuild=!!force || !state;
  // 外部の行挿入・削除などを境界で検出。内部の任意編集はappend-only契約外なので定期全監査も行う。
  if(state && state.blocks.length) {
    var first=state.blocks[0], last=state.blocks[state.blocks.length-1];
    if(sheet.getRange(first[1],1).getValue()!==first[0] || sheet.getRange(last[2],1).getValue()!==last[0]) {state=null;rebuild=true;}
  }
  if(rebuild) state={cursor:1,audited:nowMs,blocks:[]};
  var previousCursor=state.cursor;
  while(state.cursor<lastRow) {
    var count=Math.min(cfg.indexScanChunk,lastRow-state.cursor);
    var ids=sheet.getRange(state.cursor+1,1,count,1).getValues();
    if(ids.length!==count) throw new Error('GSC履歴索引の読み取りが不完全');
    playPointGscIndexAppendIds_(state.blocks,ids,state.cursor+1);
    state.cursor+=count;
  }
  // 通常実行では差分がなければ書き込まない。容量予告も追記時または定期全監査時だけ更新。
  if(rebuild || previousCursor!==state.cursor) {
    playPointGscIndexWrite_(index,sourceId,state,playPointGscIndexCapacity_(ss,sheet,state.blocks,lastRow));
  }
  return state;
}

function playPointGscRowsForPair_(sheet, pairId) {
  if (sheet.getLastRow() < 2) return [];
  function read(state) {
    var rows=[];
    state.blocks.filter(function(block){return block[0]===pairId;}).forEach(function(block){
      var values=sheet.getRange(block[1],1,block[3],PLAYPOINT_GSC_28D_CONFIG.headers.length).getValues();
      if(values.length!==block[3] || values.some(function(row){return row[0]!==pairId;})) throw new Error('GSC履歴索引の参照先が不一致');
      rows=rows.concat(values);
    });
    return rows;
  }
  var state=playPointGscEnsureIndex_(sheet,false);
  try{return read(state);}
  catch(error){return read(playPointGscEnsureIndex_(sheet,true));}
}

// シートの移動/編集・旧版での追加後は管理者が手動で再索引できる。履歴の値を変更しない。
function rebuildPlayPointGscHistoryIndex() {
  var run=function(){
    var ss=playPointGscGetSpreadsheet_(), history=ss.getSheetByName(PLAYPOINT_GSC_28D_CONFIG.historySheet);
    if(!history || history.getLastRow()<1) throw new Error('GSC履歴が未取得');
    var state=playPointGscEnsureIndex_(history,true);
    return {status:'OK',rows:state.cursor-1,blocks:state.blocks.length};
  };
  return typeof withScriptLock_==='function'?withScriptLock_(run):run();
}

function playPointGscPairComplete_(rows) {
  var required = [
    'current_28d\u0000raw',
    'current_28d\u0000normalized',
    'current_28d\u0000property_total',
    'previous_28d\u0000raw',
    'previous_28d\u0000normalized',
    'previous_28d\u0000property_total'
  ];
  var seen = {};

  (rows || []).forEach(function(row) {
    seen[String(row[1] || '') + '\u0000' + String(row[2] || '')] = true;
  });

  return required.every(function(key) { return seen[key] === true; });
}



// 取得済みのAPI可視行の完全性を証明する（検索全体の網羅性は保証しない）。
function playPointGscCanonicalRow_(row) {
  if(!Array.isArray(row)||row.length!==23) throw new Error('GSC履歴行の列数が不正');
  return JSON.stringify(row.map(function(value,i){
    if(i===20) return ''; // 再試行の取得日時は証拠内容と別。
    if(i>=9&&i<=12) {
      if(value===''||value===null||!Number.isFinite(Number(value))||Number(value)<0) throw new Error('GSC履歴の指標欠落・不正');
      var n=Number(value);
      if(i<=10&&!Number.isSafeInteger(n)) throw new Error('GSC履歴の件数が不正');
      return i<=10?n:Number(n.toPrecision(12)); // Sheetsの数値精度・API浮動小数差を許容。
    }
    if(value instanceof Date&&(i===3||i===4)) return Utilities.formatDate(value,Session.getScriptTimeZone()||'Asia/Tokyo','yyyy-MM-dd');
    return String(value===null||value===undefined?'':value);
  }));
}

function playPointGscEvidence_(rows,pairId,windows,siteUrl) {
  var byKey=Object.create(null), counts=Object.create(null), cfg=PLAYPOINT_GSC_28D_CONFIG;
  if(!playPointGscPairComplete_(rows)) throw new Error('GSC証拠の6層が不完全');
  rows.forEach(function(row){
    var role=row[1],layer=row[2],window=role==='current_28d'?windows.current:role==='previous_28d'?windows.previous:null;
    var canonical=playPointGscCanonicalRow_(row), values=JSON.parse(canonical), key=playPointGscRecordKey_(row);
    var isTotal=layer==='property_total', empty=row[5]==='WINDOW_STATUS';
    var kind=isTotal?'PROPERTY_TOTAL':layer==='raw'?'QUERY_PAGE_RAW':layer==='normalized'?'QUERY_BASE_URL_NORMALIZED':'';
    if(!window||!kind||row[0]!==pairId||values[3]!==window.start||values[4]!==window.end||
      row[18]!==siteUrl||row[14]!==cfg.searchType||row[19]!==cfg.apiTimezone||
      (empty?(isTotal||row[13]!=='FINAL_NO_ROWS'):(row[5]!==kind||row[13]!=='FINAL'))||
      row[17]!== (isTotal?'byProperty':'byPage')||
      row[16]!== (isTotal?'byProperty':layer==='raw'?'byPage':'DERIVED_FROM_RAW')||
      values[9]>values[10]||values[11]>1||
      (!empty&&!isTotal&&(!row[6]||!row[8]||(layer==='raw'&&!row[7])))||
      Object.prototype.hasOwnProperty.call(byKey,key)) throw new Error('GSC証拠の期間・属性・指標・重複が不正');
    var group=role+'|'+layer, entry=counts[group]||(counts[group]={rows:0,empty:0});
    entry.rows++; if(empty)entry.empty++;
    byKey[key]=canonical;
  });
  Object.keys(counts).forEach(function(group){
    var c=counts[group];
    if((group.indexOf('|property_total')>=0&&c.rows!==1)||(c.empty&&c.rows!==1)) throw new Error('GSC証拠の空窓・合計行が競合');
  });
  var canonicalRows=Object.keys(byKey).sort().map(function(key){return byKey[key];});
  var digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(canonicalRows),Utilities.Charset.UTF_8)
    .map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');
  return {byKey:byKey,count:rows.length,digest:digest};
}

function playPointGscReceiptRow_(pairId,windows,siteUrl,fetchedAt,evidence) {
  return playPointGscHistoryRow_({pairId:pairId,role:'pair',layer:'capture_receipt',
    window:windows.current,recordType:'PAIR_RECEIPT',dataState:'FINAL',searchType:'web',
    siteUrl:siteUrl,fetchedAt:fetchedAt,derivation:'GSC_CAPTURE_V1:'+evidence.count+':'+evidence.digest});
}

function playPointGscVerifiedPair_(rows,pairId,windows,siteUrl) {
  var receipts=rows.filter(function(row){return row[5]==='PAIR_RECEIPT';});
  if(receipts.length!==1) return false;
  var r=receipts[0], m=/^GSC_CAPTURE_V1:(\d+):([a-f0-9]{64})$/.exec(String(r[22]||''));
  if(!m||r[0]!==pairId||r[1]!=='pair'||r[2]!=='capture_receipt'||r[13]!=='FINAL'||r[18]!==siteUrl) return false;
  try {
    var actual=playPointGscEvidence_(rows.filter(function(row){return row[5]!=='PAIR_RECEIPT';}),pairId,windows,siteUrl);
    return actual.count===Number(m[1])&&actual.digest===m[2];
  }catch(error){return false;}
}

function playPointGscExistingRecordKeys_(rows) {
  var keys = Object.create(null);
  (rows || []).forEach(function(row) {
    keys[playPointGscRecordKey_(row)] = true;
  });
  return keys;
}

function playPointGscRecordKey_(row) {
  return [
    row[0],
    row[1],
    row[2],
    row[5],
    row[6],
    row[7],
    row[8]
  ].join('\u0000');
}

function playPointGscBundleHistoryValues_(pairId, role, window, bundle, siteUrl, fetchedAt) {
  var values = [];

  values = values.concat(playPointGscRawHistoryValues_(
    pairId,
    role,
    window,
    bundle.raw,
    siteUrl,
    fetchedAt
  ));
  values = values.concat(playPointGscNormalizedHistoryValues_(
    pairId,
    role,
    window,
    bundle.normalized,
    bundle.raw.responseAggregationType,
    siteUrl,
    fetchedAt
  ));
  values.push(playPointGscPropertyTotalHistoryValue_(
    pairId,
    role,
    window,
    bundle.propertyTotal,
    siteUrl,
    fetchedAt
  ));

  return values;
}

function playPointGscRawHistoryValues_(pairId, role, window, raw, siteUrl, fetchedAt) {
  if (!raw.rows.length) {
    return [playPointGscHistoryRow_({
      pairId: pairId,
      role: role,
      layer: 'raw',
      window: window,
      recordType: 'WINDOW_STATUS',
      dataState: 'FINAL_NO_ROWS',
      searchType: PLAYPOINT_GSC_28D_CONFIG.searchType,
      dimensions: 'query,page',
      requestAggregationType: raw.requestAggregationType,
      responseAggregationType: raw.responseAggregationType,
      siteUrl: siteUrl,
      fetchedAt: fetchedAt,
      derivation: 'API'
    })];
  }

  return raw.rows.map(function(row) {
    return playPointGscHistoryRow_({
      pairId: pairId,
      role: role,
      layer: 'raw',
      window: window,
      recordType: 'QUERY_PAGE_RAW',
      query: row.query,
      exactUrl: row.exactUrl,
      baseUrl: row.baseUrl,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      dataState: 'FINAL',
      searchType: PLAYPOINT_GSC_28D_CONFIG.searchType,
      dimensions: 'query,page',
      requestAggregationType: raw.requestAggregationType,
      responseAggregationType: raw.responseAggregationType,
      siteUrl: siteUrl,
      fetchedAt: fetchedAt,
      derivation: 'API'
    });
  });
}

function playPointGscNormalizedHistoryValues_(pairId, role, window, rows, rawResponseAggregationType, siteUrl, fetchedAt) {
  if (!rows.length) {
    return [playPointGscHistoryRow_({
      pairId: pairId,
      role: role,
      layer: 'normalized',
      window: window,
      recordType: 'WINDOW_STATUS',
      dataState: 'FINAL_NO_ROWS',
      searchType: PLAYPOINT_GSC_28D_CONFIG.searchType,
      dimensions: 'query,base_url',
      requestAggregationType: 'DERIVED_FROM_RAW',
      responseAggregationType: rawResponseAggregationType,
      siteUrl: siteUrl,
      fetchedAt: fetchedAt,
      derivation: 'fragment stripped from raw query×page; position impression-weighted'
    })];
  }

  return rows.map(function(row) {
    return playPointGscHistoryRow_({
      pairId: pairId,
      role: role,
      layer: 'normalized',
      window: window,
      recordType: 'QUERY_BASE_URL_NORMALIZED',
      query: row.query,
      baseUrl: row.baseUrl,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      dataState: 'FINAL',
      searchType: PLAYPOINT_GSC_28D_CONFIG.searchType,
      dimensions: 'query,base_url',
      requestAggregationType: 'DERIVED_FROM_RAW',
      responseAggregationType: rawResponseAggregationType,
      siteUrl: siteUrl,
      fetchedAt: fetchedAt,
      derivation: 'fragment stripped from raw query×page; position impression-weighted'
    });
  });
}

function playPointGscPropertyTotalHistoryValue_(pairId, role, window, total, siteUrl, fetchedAt) {
  return playPointGscHistoryRow_({
    pairId: pairId,
    role: role,
    layer: 'property_total',
    window: window,
    recordType: 'PROPERTY_TOTAL',
    clicks: total.clicks,
    impressions: total.impressions,
    ctr: total.ctr,
    position: total.position,
    dataState: 'FINAL',
    searchType: PLAYPOINT_GSC_28D_CONFIG.searchType,
    dimensions: '(none)',
    requestAggregationType: total.requestAggregationType,
    responseAggregationType: total.responseAggregationType,
    siteUrl: siteUrl,
    fetchedAt: fetchedAt,
    derivation: 'API'
  });
}

function playPointGscHistoryRow_(item) {
  return [
    item.pairId || '',
    item.role || '',
    item.layer || '',
    item.window ? item.window.start : '',
    item.window ? item.window.end : '',
    item.recordType || '',
    item.query || '',
    item.exactUrl || '',
    item.baseUrl || '',
    Number(item.clicks || 0),
    Number(item.impressions || 0),
    Number(item.ctr || 0),
    Number(item.position || 0),
    item.dataState || '',
    item.searchType || '',
    item.dimensions || '',
    item.requestAggregationType || '',
    item.responseAggregationType || '',
    item.siteUrl || '',
    PLAYPOINT_GSC_28D_CONFIG.apiTimezone,
    item.fetchedAt || '',
    PLAYPOINT_GSC_28D_CONFIG.sourceLabel,
    item.derivation || ''
  ];
}

function playPointGscAppendRows_(sheet, values) {
  if (!values.length) return;
  var startRow = sheet.getLastRow() + 1;
  var requiredLastRow = startRow + values.length - 1;

  if (requiredLastRow > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), requiredLastRow - sheet.getMaxRows());
  }

  // 数値に見える検索語やISO日付を自動変換しない。
  sheet.getRange(startRow,1,values.length,9).setNumberFormat('@');
  sheet.getRange(startRow,14,values.length,10).setNumberFormat('@');
  sheet.getRange(startRow,12,values.length,1).setNumberFormat('0.00%');
  sheet.getRange(startRow,13,values.length,1).setNumberFormat('0.00');
  sheet.getRange(startRow, 1, values.length, PLAYPOINT_GSC_28D_CONFIG.headers.length)
    .setValues(values.map(playPointGscLiteralRow_));
  if(typeof SpreadsheetApp!=='undefined' && typeof SpreadsheetApp.flush==='function') SpreadsheetApp.flush();
}

function playPointGscRebuildComparisonViews_(spreadsheet, historyRows, pairId) {
  playPointGscBuildLayerComparisonSheet_(
    spreadsheet,
    PLAYPOINT_GSC_28D_CONFIG.comparisonSheet,
    historyRows,
    pairId,
    'raw',
    'GSC 非重複28日比較（Raw）',
    'exact URL',
    7
  );

  playPointGscBuildLayerComparisonSheet_(
    spreadsheet,
    PLAYPOINT_GSC_28D_CONFIG.normalizedComparisonSheet,
    historyRows,
    pairId,
    'normalized',
    'GSC 非重複28日比較（Normalized）',
    'base URL',
    8
  );
}

function playPointGscBuildLayerComparisonSheet_(spreadsheet, sheetName, historyRows, pairId, layer, title, urlLabel, urlIndex) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
  if (sheet.getMaxColumns() < 14) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 14 - sheet.getMaxColumns());
  }
  sheet.clearContents();

  var currentRows = historyRows.filter(function(row) {
    return row[1] === 'current_28d' && row[2] === layer;
  });
  var previousRows = historyRows.filter(function(row) {
    return row[1] === 'previous_28d' && row[2] === layer;
  });

  var currentPeriod = currentRows.length ? currentRows[0][3] + ' ～ ' + currentRows[0][4] : 'MISSING';
  var previousPeriod = previousRows.length ? previousRows[0][3] + ' ～ ' + previousRows[0][4] : 'MISSING';
  // 呼び出し側は保存後の完了記録まで検証済み。旧版の6層だけをREADYへ昇格しない。
  var ready = historyRows.some(function(row){return row[5]==='PAIR_RECEIPT';}) && playPointGscPairComplete_(historyRows);
  var propertyCurrent = playPointGscPropertyTotalForRole_(historyRows, 'current_28d');
  var propertyPrevious = playPointGscPropertyTotalForRole_(historyRows, 'previous_28d');
  var metadataRow = playPointGscFirstDataRow_(historyRows);

  sheet.getRange('A1').setValue(title);
  sheet.getRange('A2:B8').setValues([
    ['pair_id', pairId],
    ['current_28d', currentPeriod],
    ['previous_28d', previousPeriod],
    ['比較状態', ready ? 'READY' : 'BLOCKED'],
    ['site_property', metadataRow ? metadataRow[18] : 'MISSING'],
    ['search_type', metadataRow ? metadataRow[14] : PLAYPOINT_GSC_28D_CONFIG.searchType],
    ['API日付基準', metadataRow ? metadataRow[19] : PLAYPOINT_GSC_28D_CONFIG.apiTimezone]
  ]);

  sheet.getRange('A10:F13').setValues([
    ['Property Total', 'Click', 'Imp.', 'CTR', 'Pos', 'response aggregation'],
    ['current_28d'].concat(playPointGscTotalSummaryCells_(propertyCurrent)),
    ['previous_28d'].concat(playPointGscTotalSummaryCells_(propertyPrevious)),
    ['判断', ready ? '3層×2期間が揃っている' : '不足レイヤーあり。SEO変更に進まない', '', '', '', '']
  ]);
  sheet.getRange('G13').setValue('検索語明細はAPIで取得可能な上位行。匿名検索などを含む総量はProperty Totalを参照。');

  var headers = [
    '検索クエリ',
    urlLabel,
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
  sheet.getRange(15, 1, 1, headers.length).setValues([headers]);

  var rowsForLayer = historyRows.filter(function(row) {
    return row[2] === layer && row[5] !== 'WINDOW_STATUS';
  });
  var map = {};

  rowsForLayer.forEach(function(row) {
    var query = String(row[6] || '');
    var url = String(row[urlIndex] || '');
    var key = query + '\u0000' + url;
    if (!map[key]) {
      map[key] = { query: query, url: url, current: null, previous: null };
    }

    var metrics = {
      clicks: Number(row[9] || 0),
      impressions: Number(row[10] || 0),
      ctr: Number(row[11] || 0),
      position: Number(row[12] || 0)
    };

    if (row[1] === 'current_28d') map[key].current = metrics;
    if (row[1] === 'previous_28d') map[key].previous = metrics;
  });

  var output = Object.keys(map).map(function(key) {
    var item = map[key];
    var c = item.current;
    var p = item.previous;
    return [
      item.query,
      item.url,
      c ? c.clicks : null,
      p ? p.clicks : null,
      c ? c.impressions : null,
      p ? p.impressions : null,
      c ? c.ctr : null,
      p ? p.ctr : null,
      c ? c.position : null,
      p ? p.position : null,
      c && p ? c.clicks - p.clicks : null,
      c && p ? c.impressions - p.impressions : null,
      c && p ? c.ctr - p.ctr : null,
      c && p ? c.position - p.position : null
    ];
  });

  output.sort(function(a, b) {
    return Math.max(Number(b[4] || 0), Number(b[5] || 0)) -
      Math.max(Number(a[4] || 0), Number(a[5] || 0));
  });

  if (output.length) {
    var requiredLastRow = 15 + output.length;
    if (requiredLastRow > sheet.getMaxRows()) {
      sheet.insertRowsAfter(sheet.getMaxRows(), requiredLastRow - sheet.getMaxRows());
    }
    sheet.getRange(16, 1, output.length, headers.length).setValues(output.map(playPointGscLiteralRow_));
  }

  sheet.setFrozenRows(15);
  sheet.getRange('A1').setFontWeight('bold').setFontSize(14);
  sheet.getRange('A10:F10').setFontWeight('bold');
  sheet.getRange(15, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange('D:D').setNumberFormat('0');
  sheet.getRange('G:H').setNumberFormat('0.00%');
  sheet.getRange('M:M').setNumberFormat('0.00%');
  sheet.getRange('I:J').setNumberFormat('0.00');
  sheet.getRange('N:N').setNumberFormat('0.00');
  sheet.getRange('D11:D12').setNumberFormat('0.00%');
  sheet.getRange('E11:E12').setNumberFormat('0.00');
  sheet.autoResizeColumns(1, headers.length);
}

function playPointGscPropertyTotalForRole_(rows, role) {
  return (rows || []).find(function(row) {
    return row[1] === role && row[2] === 'property_total' && row[5] === 'PROPERTY_TOTAL';
  }) || null;
}

function playPointGscTotalSummaryCells_(row) {
  if (!row) return [null, null, null, null, 'MISSING'];
  return [
    Number(row[9] || 0),
    Number(row[10] || 0),
    Number(row[11] || 0),
    Number(row[12] || 0),
    row[17] || ''
  ];
}

function playPointGscFirstDataRow_(rows) {
  return (rows || []).find(function(row) { return row[5] !== 'WINDOW_STATUS'; }) || null;
}

function playPointGscAssertIsoDate_(value) {
  var text = String(value || '');
  var date = new Date(text + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new Error('Expected YYYY-MM-DD date, got: ' + value);
  }
}

function playPointGscLiteralRow_(row) {
  if (typeof analyticsLiteralRow_ === 'function') return analyticsLiteralRow_(row);
  return row.map(function(cell) { return typeof cell === 'string' && /^=/.test(cell) ? "'" + cell : cell; });
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
