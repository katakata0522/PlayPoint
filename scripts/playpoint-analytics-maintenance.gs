'use strict';

// GA4の同一期間・実メタデータを使う。追加トリガーや追加権限は不要。
var PLAYPOINT_GROWTH_EVENTS = Object.freeze([
  'calculation_completed', 'reverse_calculation_completed', 'calculator_mode_changed',
  'purchase_comparison_opened', 'purchase_comparison_completed',
  'lp_to_calculator_clicked', 'lp_related_link_clicked',
  'share_url_copied', 'share_x_clicked', 'calendar_reminder_added',
  'pwa_install_accepted', 'widget_code_copied', 'widget_referral_landed', 'web_vital',
  'article_decision_action', 'article_resolution_action', 'article_reference_action'
]);
var PLAYPOINT_ROLE_ACTION_EVENTS = Object.freeze({
  decision_support: 'article_decision_action',
  troubleshooting: 'article_resolution_action',
  reference: 'article_reference_action'
});
var PLAYPOINT_VITALS_DIMENSIONS = Object.freeze([
  'customEvent:metric_name', 'customEvent:metric_rating', 'customEvent:page_group',
  'customEvent:release_version', 'deviceCategory'
]);
var PLAYPOINT_READER_OUTCOMES = Object.freeze({
  sheet: '🧑読者行動・再訪',
  events: Object.freeze(['page_view', 'article_navigation_click', 'article_to_calculator_clicked',
    'reader_question_clicked', 'search', 'calculator_form_started', 'calculator_funnel_completed',
    'calculator_validation_error', 'diary_tab_opened', 'diary_entry_saved',
    'game_form_started', 'game_calculation_completed', 'result_related_article_clicked', 'result_decision_link_clicked'].concat(PLAYPOINT_GROWTH_EVENTS))
});

function playPointReaderFilter_(name, values) {
  return { filter: { fieldName: name, inListFilter: { values: values, caseSensitive: true } } };
}

function playPointReaderParameterMissing_(value) {
  // 検索結果0件は有効値。数値0を欠落と取り違えない。
  return value === undefined || value === null || String(value).trim() === '' || value === '(not set)';
}

function playPointReaderMissingParameters_(row, parameters) {
  return parameters.filter(function(name) { return playPointReaderParameterMissing_(row[name]); });
}

function playPointReaderReport_(propertyId, period, dimensions, metrics, filter) {
  var body = { dateRanges: [{ startDate: period.start, endDate: period.end }],
    dimensions: dimensions.map(function(name) { return { name: name }; }),
    metrics: metrics.map(function(name) { return { name: name }; }), limit: '10000' };
  if (filter) body.dimensionFilter = filter;
  var report = playPointP12Ga4Report_(propertyId, body);
  var metadata = report.metadata || {};
  var rows = playPointP12ParseGa4Rows_(report, dimensions, metrics);
  var parameters = dimensions.filter(function(name) { return name.indexOf('customEvent:') === 0; });
  function missing(row) { return playPointReaderMissingParameters_(row, parameters).length > 0; }
  var parameterMissing = rows.some(missing), coverage = null;
  if (parameters.length && metrics.indexOf('eventCount') >= 0) {
    var total = 0, unset = 0;
    rows.forEach(function(row) { total += row.eventCount; if (missing(row)) unset += row.eventCount; });
    var byParameter = {};
    parameters.forEach(function(name) {
      var count = 0;
      rows.forEach(function(row) { if (playPointReaderParameterMissing_(row[name])) count += row.eventCount; });
      byParameter[name] = { total: total, missing: count, available: total - count };
    });
    coverage = { total: total, missing: unset, available: total - unset, byParameter: byParameter };
  }
  return { rows: rows, parameters: parameters, parameterMissing: parameterMissing, coverage: coverage,
    restricted: !!(metadata.subjectToThresholding || metadata.dataLossFromOtherRow ||
      (metadata.samplingMetadatas && metadata.samplingMetadatas.length)) };
}

function playPointReaderSource_(fn, required, definitions) {
  var missing = (required || []).filter(function(name) { return !definitions[name]; });
  if (missing.length) return { state: 'WAITING_DEFINITION', rows: [], detail: '未登録・反映待ち: ' + missing.join(', ') };
  try {
    var result = fn();
    var detail = result.restricted ? 'しきい値・サンプリング・other集約あり。厳密な全数として扱わない' :
        result.parameterMissing ? 'パラメータ未設定の行あり。登録前期間・計測の欠落を確認し、関心がないとは判断しない' : '取得成功（0行も実測）';
    if (result.coverage) {
      var c = result.coverage;
      detail += '。パラメータ取得 ' + c.available + '/' + c.total + '回' +
        (c.total > 0 ? '（' + (c.available / c.total * 100).toFixed(1) + '%）' : '（母数なし）') +
        ' / 未設定 ' + c.missing + '回。API返却行内のイベント回数。人数の割合ではない';
      Object.keys(c.byParameter || {}).forEach(function(name) {
        var parameter = c.byParameter[name];
        detail += '。' + name.replace('customEvent:', '') + ': 取得 ' + parameter.available +
          '/' + parameter.total + '回、未設定 ' + parameter.missing + '回';
      });
    }
    return { state: result.restricted ? 'RESTRICTED' : result.parameterMissing ? 'PARAMETER_PARTIAL' : 'OK',
      rows: result.rows, parameters: result.parameters || [], detail: detail, coverage: result.coverage || null };
  } catch (error) {
    return { state: 'ERROR', rows: [], detail: playPointP12ErrorText_(error) };
  }
}

function playPointReaderCohorts_(propertyId, period) {
  // 28日目まで確定した7つの獲得日を追跡。記事別コホートとは呼ばない。
  var cohorts = [];
  for (var i = 0; i < 7; i++) {
    var day = playPointP12ShiftIsoDate_(period.end, -34 + i);
    cohorts.push({ name: 'acquired_' + day.replace(/-/g, ''), dimension: 'firstSessionDate',
      dateRange: { startDate: day, endDate: day } });
  }
  var report = playPointP12Ga4Report_(propertyId, {
    cohortSpec: { cohorts: cohorts, cohortsRange: { granularity: 'DAILY', startOffset: 0, endOffset: 28 } },
    dimensions: [{ name: 'cohort' }, { name: 'cohortNthDay' }],
    metrics: [{ name: 'cohortActiveUsers' }, { name: 'cohortTotalUsers' }], limit: '10000', keepEmptyRows: true
  });
  var metadata = report.metadata || {};
  return { rows: playPointP12ParseGa4Rows_(report, ['cohort', 'cohortNthDay'], ['cohortActiveUsers', 'cohortTotalUsers'])
    .filter(function(row) { return [0, 7, 28].indexOf(Number(row.cohortNthDay)) !== -1; }),
    restricted: !!(metadata.subjectToThresholding || metadata.dataLossFromOtherRow ||
      (metadata.samplingMetadatas && metadata.samplingMetadatas.length)) };
}

function playPointReaderOrderedFunnel_(propertyId, period) {
  // 独立したイベント人数の割り算ではなく、GA4が同一利用者の順序を評価する。
  var report = playPointP12GoogleJson_('https://analyticsdata.googleapis.com/v1alpha/properties/' +
    encodeURIComponent(propertyId) + ':runFunnelReport', { method: 'post', payload: {
      dateRanges: [{ startDate: period.start, endDate: period.end }],
      funnel: { isOpenFunnel: false, steps: [
        { name: '計算開始', filterExpression: { funnelFieldFilter: { fieldName: 'eventName',
          stringFilter: { matchType: 'EXACT', value: 'calculator_form_started', caseSensitive: true } } } },
        { name: '開始後24時間以内の成功', withinDurationFromPriorStep: '86400s',
          filterExpression: { funnelFieldFilter: { fieldName: 'eventName',
            stringFilter: { matchType: 'EXACT', value: 'calculator_funnel_completed', caseSensitive: true } } } }
      ] }, returnPropertyQuota: true
    } });
  var table = report.funnelTable;
  if (!table || !Array.isArray(table.dimensionHeaders) || !Array.isArray(table.metricHeaders)) {
    throw new Error('順序付きファネルの応答形式を確認できません。');
  }
  var dimensions = table.dimensionHeaders.map(function(header) { return header.name; });
  var metrics = table.metricHeaders.map(function(header) { return header.name; });
  if (dimensions.indexOf('funnelStepName') < 0 || metrics.indexOf('activeUsers') < 0) {
    throw new Error('順序付きファネルの利用者指標がありません。');
  }
  // alpha APIが同名ヘッダーを重複返却する場合も、空の後続列で実測値を上書きしない。
  var uniqueMetrics = metrics.filter(function(name, index) { return metrics.indexOf(name) === index; });
  var normalizedRows = (table.rows || []).map(function(row) {
    return { dimensionValues: row.dimensionValues, metricValues: uniqueMetrics.map(function(name) {
      var values = metrics.map(function(metric, index) {
        return metric === name && row.metricValues && row.metricValues[index] ? row.metricValues[index].value : undefined;
      }).filter(function(value) { return value !== undefined && value !== null && String(value).trim() !== ''; }).map(Number);
      if (!values.length || values.some(function(value) { return !isFinite(value) || value !== values[0]; })) {
        throw new Error('順序付きファネルの指標が欠落・競合しています: ' + name);
      }
      return { value: String(values[0]) };
    }) };
  });
  return { rows: playPointP12ParseGa4Rows_({ rows: normalizedRows }, dimensions, uniqueMetrics),
    restricted: !!(table.metadata && (table.metadata.subjectToThresholding || table.metadata.dataLossFromOtherRow ||
      (table.metadata.samplingMetadatas && table.metadata.samplingMetadatas.length))) };
}

function playPointReaderBuildGrid_(period, inventory, sources, timestamp) {
  var roles = {}, grid = [], width = 12;
  inventory.forEach(function(article) { roles[playPointP12NormalizePage_(article.path)] = article; });
  function add(row) {
    while (row.length < width) row.push('');
    grid.push(playPointP12LiteralRow_(row));
  }
  add(['読者行動・再訪', timestamp]);
  add(['対象期間', period.start + ' ～ ' + period.end]);
  add(['目的', '記事の役割・導線・検索結果0件・入力エラー・再訪を同じ期間で確認。人数は各行内で重複除去。行を足して全体人数にしない']);
  add(['再訪の定義', 'ページ別は期間内の再訪者の閲覧。最初に読んだ記事別の7日/28日再訪率ではない']);
  add(['コホート', 'サイト全体の初回獲得日別。7日目・28日目のアクティブ率。期間内の任意再訪率ではない']);
  add(['解決', 'クリック・計算成功は行動。疑問解決の主KPIを代用しない。記事別入口コホートは未取得']);
  add(['計測開始', '新しいカスタム定義は登録後の利用可能期間のみ。過去未登録値の復元を保証しない']);
  add(['種別', '状態', 'イベント／日数', '回数／PV', '利用者', 'コホート母数', 'ページ／コホート', '言語', '記事の役割', '導線／端末', '遷移先／意図', '補足']);
  Object.keys(sources).forEach(function(type) {
    var source = sources[type];
    add([type, source.state, '', '', '', '', '', '', '', '', '', source.detail]);
    source.rows.forEach(function(row) {
      var page = row.pagePath ? playPointP12NormalizePage_(row.pagePath) : '';
      var article = roles[page], locale = article ? article.locale : /^\/(en|ko|tw)(\/|$)/.test(page) ? page.split('/')[1].toUpperCase() : page ? 'JP' : '';
      var missing = playPointReaderMissingParameters_(row, source.parameters || []);
      var rowState = source.state === 'PARAMETER_PARTIAL' && source.parameters && source.parameters.length ?
        (missing.length ? 'PARAMETER_PARTIAL' : 'OK') : source.state;
      var comment = type === 'VITALS' ? '匿名の観測回数。p75や全利用者の実測率ではない。' :
        type === 'ROLE_ACTIONS' ? '記事の閲覧・役割別行動の利用者数。記事別成果シートで比較する。' :
        type === 'READING' ? '再訪の閲覧人数。初回記事への帰属ではない' :
        type === 'ARTICLE_ACTIONS' ? 'ページ別・イベント別の回数と人数。NAVIGATIONと重複するので足さない。クリックは遷移先での閲覧・疑問解決を保証しない' :
        type === 'SEARCH' ? (playPointReaderParameterMissing_(row['customEvent:results_count']) ? '検索結果件数は未取得（0件ではない）' :
          String(row['customEvent:results_count']) === '0' ? '検索結果0件' : '検索結果件数: ' + row['customEvent:results_count']) :
        type === 'COHORT' ? (row.cohortTotalUsers > 0 ? '日次アクティブ率: ' + (row.cohortActiveUsers / row.cohortTotalUsers * 100).toFixed(2) + '%' : '母数なし') :
        type === 'FUNNEL' ? '閉じたファネル・成功は開始後24時間以内。同じ計算内容・記事帰属までは保証しない' :
        type === 'ERRORS' ? '入力値は収集せず原因の分類だけを表示' : '';
      if (missing.length) comment += (comment ? '。' : '') + '未設定: ' + missing.map(function(name) { return name.replace('customEvent:', ''); }).join(', ');
      add([type, rowState,
        row.eventName || row['customEvent:error_type'] || row['customEvent:metric_name'] || row.funnelStepName || row.cohortNthDay || '',
        row.eventCount !== undefined ? row.eventCount : row.screenPageViews !== undefined ? row.screenPageViews : '',
        row.totalUsers !== undefined ? row.totalUsers : row.activeUsers !== undefined ? row.activeUsers : row.cohortActiveUsers !== undefined ? row.cohortActiveUsers : '',
        row.cohortTotalUsers !== undefined ? row.cohortTotalUsers : '',
        page || row.cohort || row['customEvent:page_group'] || '', locale, article ? article.role : (row['customEvent:release_version'] || ''),
        row['customEvent:component'] || row.deviceCategory || row.newVsReturning || '',
        row['customEvent:destination_type'] || row['customEvent:intent_id'] || row['customEvent:candidate_id'] || row['customEvent:calculation_mode'] || row['customEvent:metric_rating'] || '', comment]);
    });
    if (type === 'EVENTS' && source.state === 'OK') {
      PLAYPOINT_GROWTH_EVENTS.forEach(function(name) {
        if (!source.rows.some(function(row) { return row.eventName === name; })) {
          add(['EVENTS', 'NO_EVENT_ROW', name, '', '', '', '', '', '', '', '', '正常応答に行なし。計測開始・受信の確認前は利用ゼロと断定しない']);
        }
      });
    }
  });
  return grid;
}

function capturePlayPointReaderOutcomes() {
  withScriptLock_(function() { playPointP12HealthStart_('READER_OUTCOMES', playPointP12NowText_()); });
  try { return playPointCaptureReaderOutcomes_(); }
  catch (error) {
    withScriptLock_(function() { playPointP12HealthError_('READER_OUTCOMES', playPointP12NowText_(), playPointP12ErrorText_(error)); });
    throw error;
  }
}

function playPointReaderParameterAuditGrid_(period, sources, timestamp) {
  var grid = [], width = 8;
  function add(row) {
    while (row.length < width) row.push('');
    grid.push(playPointP12LiteralRow_(row));
  }
  add(['読者パラメータ診断', timestamp]);
  add(['対象期間', period.start + ' ～ ' + period.end]);
  add(['用途', '標準pagePathと各カスタム定義を別々に照合。項目ごとのイベント回数であり、行を横断して足さない']);
  add(['原因判定', '初取得日は定義の登録日ではない。登録前・旧コード・送信欠落の確定にはGA4設定と送信実測が必要']);
  add(['プライバシー', '既存イベントのみ再集計。検索語・利用者ID・Cookie・権限・トリガーは追加しない']);
  add(['種別', '日付', 'ページ', 'パラメータ／イベント', '取得値', 'イベント回数', '状態', '補足']);
  Object.keys(sources).forEach(function(type) {
    var source = sources[type], parameter = source.parameters && source.parameters[0];
    var availableDates = [], missingDates = [];
    source.rows.forEach(function(row) {
      var date = playPointEventDailyIso_(row.date);
      if (date < period.start || date > period.end || !isFinite(row.eventCount) || row.eventCount < 0) {
        throw new Error('パラメータ診断の結果が期間外・不正値です。');
      }
      if (!parameter || row.eventCount <= 0) return;
      (playPointReaderParameterMissing_(row[parameter]) ? missingDates : availableDates).push(date);
    });
    availableDates.sort(); missingDates.sort();
    var detail = source.detail;
    if (parameter) detail += '。初取得観測日: ' + (availableDates[0] || '観測なし') +
      ' / 最終未設定観測日: ' + (missingDates[missingDates.length - 1] || '観測なし');
    add([type, '', '', parameter || '', '', '', source.state, detail]);
    source.rows.forEach(function(row) {
      var missing = parameter && playPointReaderParameterMissing_(row[parameter]);
      var state = source.state === 'PARAMETER_PARTIAL' ? (missing ? 'PARAMETER_PARTIAL' : 'OK') : source.state;
      add([type, playPointEventDailyIso_(row.date), playPointP12NormalizePage_(row.pagePath),
        parameter || row.eventName, parameter ? (missing ? '(not set)' : row[parameter]) : '',
        row.eventCount, state, missing ? '未取得。0や関心なしへ置換しない' : '既存イベントの観測値']);
    });
  });
  return grid;
}

function capturePlayPointReaderParameterAudit() {
  // 原因調査用の手動処理。新しいタイマー・カスタム定義を作らない。
  var timestamp = playPointP12NowText_(), period = playPointP12BuildGa4Period_();
  if (!playPointMaintenanceIsoDate_(period.start) || !playPointMaintenanceIsoDate_(period.end) ||
      Date.parse(period.end) - Date.parse(period.start) !== 29 * 86400000 || period.end >= timestamp.slice(0, 10)) {
    throw new Error('パラメータ診断の共通期間は実在する過去30日である必要があります。');
  }
  var propertyId = playPointP12GetGa4PropertyId_(), definitions = {}, sources = {};
  var metadata = playPointP12GoogleJson_('https://analyticsdata.googleapis.com/v1beta/properties/' +
    encodeURIComponent(propertyId) + '/metadata', { method: 'get' });
  (metadata.dimensions || []).forEach(function(dimension) { definitions[dimension.apiName] = true; });
  function report(type, dimensions, events) {
    sources[type] = playPointReaderSource_(function() {
      return playPointReaderReport_(propertyId, period, dimensions, ['eventCount'], playPointReaderFilter_('eventName', events));
    }, dimensions.filter(function(name) { return name.indexOf('customEvent:') === 0; }), definitions);
  }
  report('PAGE_EVENTS', ['date', 'pagePath', 'eventName'], ['article_navigation_click', 'search']);
  [ ['NAV_COMPONENT', 'component', 'article_navigation_click'],
    ['NAV_DESTINATION', 'destination_type', 'article_navigation_click'],
    ['SEARCH_INTENT', 'intent_id', 'search'], ['SEARCH_RESULTS', 'results_count', 'search'] ].forEach(function(spec) {
      report(spec[0], ['date', 'pagePath', 'customEvent:' + spec[1]], [spec[2]]);
    });
  if (sources.PAGE_EVENTS.state !== 'OK') throw new Error('診断の標準ページ集計を取得できません: ' + sources.PAGE_EVENTS.detail);
  var grid = playPointReaderParameterAuditGrid_(period, sources, timestamp);
  return withScriptLock_(function() {
    var ss = resolveAndRememberSpreadsheet_(), sheet = playPointP12EnsureSheet_(ss, '🔬読者パラメータ診断', 8);
    var previous = String(sheet.getRange('B2').getValue() || '').match(/^\d{4}-\d{2}-\d{2} ～ (\d{4}-\d{2}-\d{2})$/);
    if (previous && previous[1] > period.end) throw new Error('より新しいパラメータ診断を旧期間で置換しません。');
    var oldRows = sheet.getLastRow();
    playPointP12EnsureRows_(sheet, grid.length);
    sheet.getRange(1, 1, 5, 8).breakApart().setNumberFormat('@');
    sheet.getRange(1, 1, grid.length, 8).setValues(grid);
    if (oldRows > grid.length) sheet.getRange(grid.length + 1, 1, oldRows - grid.length, 8).clearContent();
    sheet.setFrozenRows(6); sheet.setFrozenColumns(1);
    sheet.getRange(1, 2, 5, 7).mergeAcross().setWrap(true);
    sheet.getRange(6, 1, 1, 8).setFontWeight('bold');
    sheet.setColumnWidths(1, 2, 160); sheet.setColumnWidth(3, 390);
    sheet.setColumnWidths(4, 2, 200); sheet.setColumnWidth(6, 110);
    sheet.setColumnWidth(7, 180); sheet.setColumnWidth(8, 480);
    sheet.getRange(1, 1, grid.length, 8).setWrap(true); sheet.autoResizeRows(1, 6);
    return { period: period, rows: grid.length, states: Object.keys(sources).map(function(type) { return type + '=' + sources[type].state; }).join(' / ') };
  });
}

function playPointCaptureReaderOutcomes_() {
  // 検索の確定待ち・週次P1障害から独立した、GA4の直近確定待ち30日を使う。
  var ss = resolveAndRememberSpreadsheet_(), period = playPointP12BuildGa4Period_();
  var timestamp = playPointP12NowText_(), inventory = [];
  if (!playPointMaintenanceIsoDate_(period.start) || !playPointMaintenanceIsoDate_(period.end) ||
      Date.parse(period.end) - Date.parse(period.start) !== 29 * 86400000 || period.end >= timestamp.slice(0, 10) ||
      Date.parse(timestamp.slice(0, 10)) - Date.parse(period.end) > 9 * 86400000) {
    throw new Error('読者行動の共通期間は実在する過去30日である必要があります。');
  }
  var propertyId = playPointP12GetGa4PropertyId_(), definitions = {}, sources = {};
  try { inventory = playPointMaintenanceLoadInventory_(); }
  catch (inventoryError) {
    // 記事の役割ラベル取得の障害で、独立したGA4の実測まで停止しない。
    sources.INVENTORY = { state: 'ERROR', rows: [], detail: '記事の役割ラベルは未取得: ' + playPointP12ErrorText_(inventoryError) };
  }
  try {
    var metadata = playPointP12GoogleJson_('https://analyticsdata.googleapis.com/v1beta/properties/' + encodeURIComponent(propertyId) + '/metadata', { method: 'get' });
    (metadata.dimensions || []).forEach(function(dimension) { definitions[dimension.apiName] = true; });
  } catch (metadataError) {
    sources.METADATA = { state: 'ERROR', rows: [], detail: playPointP12ErrorText_(metadataError) };
  }
  function report(type, dimensions, metrics, filter) {
    sources[type] = playPointReaderSource_(function() { return playPointReaderReport_(propertyId, period, dimensions, metrics, filter); },
      dimensions.filter(function(name) { return name.indexOf('customEvent:') === 0; }), definitions);
  }
  // 通信中に共通ロックを保持しない。本体の日次・リアルタイム更新を待たせない。
  report('EVENTS', ['eventName'], ['eventCount', 'totalUsers'], playPointReaderFilter_('eventName', PLAYPOINT_READER_OUTCOMES.events));
  report('READING', ['pagePath', 'newVsReturning'], ['screenPageViews', 'activeUsers'], playPointReaderFilter_('eventName', ['page_view']));
  var verifiedFrom = typeof PropertiesService !== 'undefined' ?
    PropertiesService.getScriptProperties().getProperty('PLAYPOINT_ROLE_ACTIONS_VERIFIED_FROM') : '';
  var rolePeriod = playPointGrowthRolePeriod_(period, verifiedFrom, timestamp.slice(0,10));
  sources.ROLE_ACTIONS = playPointReaderSource_(function() {
    return playPointReaderReport_(propertyId, rolePeriod, ['pagePath', 'eventName'], ['eventCount', 'totalUsers'],
      playPointReaderFilter_('eventName', ['page_view'].concat(Object.keys(PLAYPOINT_ROLE_ACTION_EVENTS).map(function(role) {
        return PLAYPOINT_ROLE_ACTION_EVENTS[role];
      }))));
  }, [], definitions);
  sources.ROLE_ACTIONS.detail += '。役割別の期間: ' + rolePeriod.start + ' ～ ' + rolePeriod.end;
  report('VITALS', PLAYPOINT_VITALS_DIMENSIONS, ['eventCount'], playPointReaderFilter_('eventName', ['web_vital']));
  // 分類パラメータが欠けても、標準pagePathで取得できる記事別成果を独立に保持する。
  report('ARTICLE_ACTIONS', ['pagePath', 'eventName'], ['eventCount', 'totalUsers'],
    playPointReaderFilter_('eventName', ['article_navigation_click', 'article_to_calculator_clicked']));
  report('ERRORS', ['customEvent:error_type', 'deviceCategory', 'customEvent:calculation_mode'], ['eventCount', 'totalUsers'], playPointReaderFilter_('eventName', ['calculator_validation_error']));
  report('NAVIGATION', ['pagePath', 'customEvent:component', 'customEvent:destination_type'], ['eventCount', 'totalUsers'], playPointReaderFilter_('eventName', ['article_navigation_click']));
  report('QUESTIONS', ['pagePath', 'customEvent:candidate_id'], ['eventCount', 'totalUsers'], playPointReaderFilter_('eventName', ['reader_question_clicked']));
  report('SEARCH', ['pagePath', 'customEvent:intent_id', 'customEvent:results_count'], ['eventCount', 'totalUsers'], playPointReaderFilter_('eventName', ['search']));
  sources.COHORT = playPointReaderSource_(function() { return playPointReaderCohorts_(propertyId, period); }, [], definitions);
  sources.FUNNEL = playPointReaderSource_(function() { return playPointReaderOrderedFunnel_(propertyId, period); }, [], definitions);
  var starts = sources.EVENTS.rows.find(function(row) { return row.eventName === 'calculator_form_started'; });
  if (sources.FUNNEL.state === 'OK' && starts && starts.totalUsers > 0 &&
      !sources.FUNNEL.rows.some(function(row) { return row.activeUsers > 0; })) {
    sources.FUNNEL.state = 'UNEXPECTED_ZERO';
    sources.FUNNEL.detail = '開始イベントに利用者があるのに順序APIが全0。転換率として使用せずGA4探索・API条件を確認';
    sources.FUNNEL.rows.forEach(function(row) { row.activeUsers = ''; });
  }
  if (Object.keys(sources).every(function(type) { return sources[type].state !== 'OK' && sources[type].state !== 'RESTRICTED'; })) {
    throw new Error('読者行動の全sourceが未取得です。前回のシートを保持します。');
  }
  var grid = playPointReaderBuildGrid_(period, inventory, sources, timestamp);
  var partial = Object.keys(sources).some(function(type) { return sources[type].state !== 'OK'; });
  return withScriptLock_(function() {
    var sheet = playPointP12EnsureSheet_(ss, PLAYPOINT_READER_OUTCOMES.sheet, 12);
    var previous = String(sheet.getRange('B2').getValue() || '');
    var previousPeriod = previous.match(/^\d{4}-\d{2}-\d{2} ～ (\d{4}-\d{2}-\d{2})(?:$|。)/);
    if (previousPeriod && previousPeriod[1] > period.end) throw new Error('より新しい読者集計を旧期間で置換しません。');
    var oldRows = sheet.getLastRow();
    playPointP12EnsureRows_(sheet, grid.length);
    // 再実行時は結合を解除してから書き、説明文・取得日時を失わない。
    sheet.getRange(1, 1, 7, 12).breakApart().setNumberFormat('@');
    sheet.getRange(1, 1, grid.length, 12).setValues(grid);
    if (oldRows > grid.length) sheet.getRange(grid.length + 1, 1, oldRows - grid.length, 12).clearContent();
    sheet.setFrozenRows(8);
    // 説明欄B:Lが固定境界をまたがないよう、種別列だけを固定する。
    sheet.setFrozenColumns(1);
    sheet.getRange(1, 2, 7, 11).mergeAcross().setWrap(true);
    sheet.getRange(8, 1, 1, 12).setFontWeight('bold');
    sheet.setColumnWidth(1, 110); sheet.setColumnWidth(2, 170);
    sheet.setColumnWidth(3, 290); sheet.setColumnWidth(7, 390); sheet.setColumnWidth(12, 440);
    sheet.setColumnWidths(4, 3, 110);
    sheet.autoResizeRows(1, 8);
    sheet.getRange(9, 1, Math.max(1, grid.length - 8), 12).setWrap(true);
    var states = Object.keys(sources).map(function(type) { return type + '=' + sources[type].state; }).join(' / ');
    playPointP12UpsertHealth_('READER_OUTCOMES', { lastAttempt: timestamp, lastSuccess: playPointP12NowText_(), dataLatest: period.end,
      state: partial ? 'PARTIAL' : 'OK', consecutiveFailures: 0, error: '', note: states + '。記事別入口コホート・疑問解決率は未取得。' });
    Object.keys(sources).filter(function(type) { return sources[type].state !== 'OK'; }).forEach(function(type) {
      playPointP12Log_('WARN', 'READER_' + type, sources[type].state + ': ' + sources[type].detail);
    });
    // 新しい専用ビューは独立した監視行を持つ。失敗時も元の読者集計は保持。
    try {
      if (!inventory.length || sources.ROLE_ACTIONS.state !== 'OK') throw new Error('記事台帳または役割別行動の完全な取得が必要');
      var sameWindow = rolePeriod.start === period.start && rolePeriod.end === period.end;
      var outcome = playPointGrowthRoleGrid_(rolePeriod, inventory, sources.ROLE_ACTIONS, sameWindow ? sources.READING : null, timestamp, verifiedFrom);
      playPointGrowthPublishGrid_(ss, '📊記事の役割別成果', outcome.grid, 6, 7);
      playPointP12UpsertHealth_('ROLE_OUTCOMES', { lastAttempt: timestamp, lastSuccess: playPointP12NowText_(), dataLatest: period.end,
        state: outcome.covered ? 'OK' : 'PARTIAL', consecutiveFailures: 0, error: '', note: '同期間の記事閲覧者数・役割別行動。計測開始日が未確認の期間は未発生を0にしない。' });
    } catch (roleError) {
      partial = true;
      playPointP12Log_('WARN', 'ROLE_OUTCOMES', playPointP12ErrorText_(roleError));
      playPointP12HealthError_('ROLE_OUTCOMES', playPointP12NowText_(), playPointP12ErrorText_(roleError));
    }
    try {
      var vitalView = playPointGrowthVitalsGrid_(period, sources.VITALS, timestamp);
      // 制限・未登録の状態を明示し、過去の有効な観測を欠測で消さない。
      if (vitalView.state === 'OK' || vitalView.state === 'PARTIAL' || !ss.getSheetByName(PLAYPOINT_GROWTH_A.vitalsSheet)) {
        playPointGrowthPublishGrid_(ss, PLAYPOINT_GROWTH_A.vitalsSheet, vitalView.grid, 6, 10);
        var vitalSheet = ss.getSheetByName(PLAYPOINT_GROWTH_A.vitalsSheet);
        if (vitalView.grid.length > 6) vitalSheet.getRange(7, 11, vitalView.grid.length - 6, 1).setNumberFormat('0.00%');
      }
      if (vitalView.state === 'OK' || vitalView.state === 'PARTIAL') {
        playPointP12UpsertHealth_('VITALS_ANALYSIS', { lastAttempt: timestamp, lastSuccess: playPointP12NowText_(),
          dataLatest: period.end, state: vitalView.state, consecutiveFailures: 0, error: '', note: vitalView.detail });
      } else {
        partial = true;
        playPointP12UpsertHealth_('VITALS_ANALYSIS', { lastAttempt: timestamp, state: vitalView.state, note: vitalView.detail });
      }
    } catch (vitalError) {
      partial = true;
      playPointP12HealthError_('VITALS_ANALYSIS', playPointP12NowText_(), playPointP12ErrorText_(vitalError));
    }
    return { period: period, rows: grid.length, state: partial ? 'PARTIAL' : 'OK', sources: states };
  });
}

// GSCの確定待ちから切り離し、既存GA4イベントだけを日付別に記録する。
var PLAYPOINT_EVENT_DAILY = Object.freeze({
  sheet: '📈GA4イベント日次',
  historyDays: 63, // 最大28日×2＋公開日の除外＋確定待ち
  detailDays: 35, // 記事明細・帰属は従来の取得量を維持
  events: Object.freeze(['page_view', 'article_navigation_click', 'article_to_calculator_clicked',
    'calculator_form_started', 'calculator_funnel_completed', 'calculator_validation_error',
    'reader_question_clicked', 'search', 'game_form_started', 'game_calculation_completed',
    'diary_tab_opened', 'diary_entry_saved',
    'result_related_article_clicked', 'result_decision_link_clicked'].concat(PLAYPOINT_GROWTH_EVENTS))
});

function playPointEventDailyIso_(raw) {
  var text = String(raw || '');
  if (!/^\d{8}$/.test(text)) throw new Error('GA4日付が不正です: ' + text);
  var iso = text.slice(0, 4) + '-' + text.slice(4, 6) + '-' + text.slice(6);
  var parsed = new Date(iso + 'T00:00:00Z');
  if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
    throw new Error('GA4日付が実在しません: ' + text);
  }
  return iso;
}

function playPointEventDailyWeeks_(lastDate) {
  // 水曜～火曜に揃える。10/8実行時は9/23～29と9/30～10/6を比較する。
  var dow = new Date(lastDate + 'T00:00:00Z').getUTCDay();
  var currentEnd = playPointP12ShiftIsoDate_(lastDate, -(dow - 2 + 7) % 7);
  return [
    { label: '前週', start: playPointP12ShiftIsoDate_(currentEnd, -13), end: playPointP12ShiftIsoDate_(currentEnd, -7) },
    { label: '直近完了週', start: playPointP12ShiftIsoDate_(currentEnd, -6), end: currentEnd }
  ];
}

function playPointEventDailySource_(propertyId, period, dimensions, eventNames, definitions) {
  return playPointReaderSource_(function() {
    var result = playPointReaderReport_(propertyId, period, dimensions,
      ['eventCount', 'totalUsers'], playPointReaderFilter_('eventName', eventNames));
    result.rows.forEach(function(row) {
      row.isoDate = playPointEventDailyIso_(row.date);
      if (row.isoDate < period.start || row.isoDate > period.end ||
          !isFinite(row.eventCount) || !isFinite(row.totalUsers)) {
        throw new Error('GA4日次結果が期間外・不正値です。');
      }
    });
    return result;
  }, dimensions.filter(function(dim) { return dim.indexOf('customEvent:') === 0; }), definitions);
}

function playPointEventDailyGrid_(period, timestamp, sources) {
  var width = 8, grid = [], primary = sources.EVENTS;
  function add(row) {
    while (row.length < width) row.push('');
    grid.push(playPointP12LiteralRow_(row));
  }
  add(['📈GA4イベント日次', timestamp]);
  add(['対象期間', period.start + ' ～ ' + period.end]);
  add(['注意', 'GA4の日別イベント回数を比較。日内ユーザー数は週合計・同一人物の経路転換率にしない。直近数日は後日再集計で変動する。']);
  add(['判定', 'GSCの確定期間とは独立。記事・帰属の明細は直近35日。記事別帰属は同一人物の順序付きファネルではない。']);
  add(['取得状態', Object.keys(sources).map(function(name) { return name + '=' + sources[name].state; }).join(' / ')]);
  add(['種別', '日付／期間', 'イベント', 'イベント回数', '日内ユーザー', '記事／帰属元', '状態', '補足']);
  playPointEventDailyWeeks_(period.end).forEach(function(week) {
    PLAYPOINT_EVENT_DAILY.events.forEach(function(eventName) {
      var covered = week.start >= period.start && week.end <= period.end;
      var ok = covered && primary.state === 'OK';
      var observed = ok ? primary.rows.filter(function(row) {
        return row.eventName === eventName && row.isoDate >= week.start && row.isoDate <= week.end;
      }) : [];
      var noRow = ok && !observed.length && PLAYPOINT_GROWTH_EVENTS.indexOf(eventName) >= 0;
      var total = ok && !noRow ? observed.reduce(function(sum, row) { return sum + row.eventCount; }, 0) : '';
      add([week.label, week.start + ' ～ ' + week.end, eventName, total, '', '',
        noRow ? 'NO_EVENT_ROW' : ok ? 'OBSERVED' : (!covered ? 'NOT_COVERED' : primary.state),
        noRow ? '正常応答に行なし。計測開始・受信は別途確認' : 'イベント回数の合計。週のユニーク利用者数ではない']);
    });
  });
  // 取得できた期間のみ0件を実測0として表示。欠損したAPI結果は0で埋めない。
  var date = period.start;
  while (date <= period.end) {
    PLAYPOINT_EVENT_DAILY.events.forEach(function(eventName) {
      var ok = primary.state === 'OK';
      var found = ok ? primary.rows.filter(function(row) {
        return row.isoDate === date && row.eventName === eventName;
      }) : [];
      if (found.length > 1) throw new Error('GA4日別イベントの重複行: ' + date + ' ' + eventName);
      var noRow = ok && !found.length && PLAYPOINT_GROWTH_EVENTS.indexOf(eventName) >= 0;
      add(['EVENTS', date, eventName,
        ok && !noRow ? (found.length ? found[0].eventCount : 0) : '',
        ok && !noRow ? (found.length ? found[0].totalUsers : 0) : '', '',
        noRow ? 'NO_EVENT_ROW' : ok ? 'OBSERVED' : primary.state,
        noRow ? '正常応答に行なし。利用ゼロと断定しない' : ok ? '日内ユーザー。直近日は変動あり' : primary.detail]);
    });
    date = playPointP12ShiftIsoDate_(date, 1);
  }
  [['ARTICLE', '記事から計算機へ', 'pagePath'], ['ATTRIBUTION', '計算開始／初回成功', 'customEvent:entry_source_path']].forEach(function(section) {
    var source = sources[section[0]];
    add([section[0], '', '', '', '', '', source.state, source.detail]);
    source.rows.forEach(function(row) {
      add([section[0], row.isoDate, row.eventName || section[1],
        row.eventCount, row.totalUsers, row[section[2]] || '(not set)', source.state,
        section[0] === 'ATTRIBUTION' ? '帰属元が未設定の行は未帰属。経路転換率とはしない' : 'クリック発生元のページ']);
    });
  });
  return grid;
}

function capturePlayPointEventDailyReview() {
  var timestamp = playPointP12NowText_();
  try {
    var end = playPointP12ShiftIsoDate_(timestamp.slice(0, 10), -1);
    var period = { start: playPointP12ShiftIsoDate_(end, 1 - PLAYPOINT_EVENT_DAILY.historyDays), end: end };
    var propertyId = playPointP12GetGa4PropertyId_();
    var definitions = {}, sources = {};
    sources.EVENTS = playPointEventDailySource_(propertyId, period, ['date', 'eventName'], PLAYPOINT_EVENT_DAILY.events, definitions);
    if (sources.EVENTS.state !== 'OK') throw new Error('GA4の日別イベント総量が未取得: ' + sources.EVENTS.detail);
    var detailPeriod = { start: playPointP12ShiftIsoDate_(end, 1 - PLAYPOINT_EVENT_DAILY.detailDays), end: end };
    sources.ARTICLE = playPointEventDailySource_(propertyId, detailPeriod, ['date', 'pagePath'], ['article_to_calculator_clicked'], definitions);
    // 計算開始・成功の入口帰属は登録済みカスタム定義がある時だけ取得する。
    try {
      var metadata = playPointP12GoogleJson_('https://analyticsdata.googleapis.com/v1beta/properties/' +
        encodeURIComponent(propertyId) + '/metadata', { method: 'get' });
      (metadata.dimensions || []).forEach(function(dim) { definitions[dim.apiName] = true; });
      sources.ATTRIBUTION = playPointEventDailySource_(propertyId, detailPeriod,
        ['date', 'eventName', 'customEvent:entry_source_path'],
        ['calculator_form_started', 'calculator_funnel_completed'], definitions);
    } catch (error) {
      sources.ATTRIBUTION = { state: 'ERROR', rows: [], detail: playPointP12ErrorText_(error) };
    }
    var grid = playPointEventDailyGrid_(period, timestamp, sources);
    var partial = sources.ARTICLE.state !== 'OK' || sources.ATTRIBUTION.state !== 'OK';
    return withScriptLock_(function() {
      var ss = resolveAndRememberSpreadsheet_();
      var sheet = playPointP12EnsureSheet_(ss, PLAYPOINT_EVENT_DAILY.sheet, 8);
      var old = String(sheet.getRange('B2').getValue() || '');
      var match = old.match(/^\d{4}-\d{2}-\d{2} ～ (\d{4}-\d{2}-\d{2})$/);
      if (match && match[1] > period.end) throw new Error('より新しい日次イベントを上書きしません。');
      var previousRows = sheet.getLastRow();
      playPointP12EnsureRows_(sheet, grid.length);
      sheet.getRange(1, 1, grid.length, 8).setValues(grid);
      if (previousRows > grid.length) sheet.getRange(grid.length + 1, 1, previousRows - grid.length, 8).clearContent();
      sheet.setFrozenRows(6); sheet.setFrozenColumns(2);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
      sheet.getRange(6, 1, 1, 8).setFontWeight('bold');
      sheet.setColumnWidths(1, 2, 190); sheet.setColumnWidth(3, 250);
      sheet.setColumnWidths(4, 2, 120); sheet.setColumnWidth(6, 470);
      sheet.setColumnWidth(7, 170); sheet.setColumnWidth(8, 370);
      playPointP12UpsertHealth_('EVENT_DAILY', {
        lastAttempt: timestamp, lastSuccess: playPointP12NowText_(), dataLatest: period.end,
        state: partial ? 'PARTIAL' : 'OK', consecutiveFailures: 0, error: '',
        note: 'GA4日別イベントのみ。' + Object.keys(sources).map(function(key) {
          return key + '=' + sources[key].state;
        }).join(' / ')
      });
      return { period: period, rows: grid.length, state: partial ? 'PARTIAL' : 'OK' };
    });
  } catch (error) {
    withScriptLock_(function() {
      playPointP12HealthError_('EVENT_DAILY', timestamp, playPointP12ErrorText_(error));
    });
    throw error;
  }
}

// 既存P1週次処理から呼び出す。追加トリガー・追加権限は作らない。
var PLAYPOINT_MAINTENANCE = Object.freeze({
  portfolio: '📚記事Portfolio', coverage: '📅ページ履歴取得範囲',
  checkpoint: 'PLAYPOINT_PAGE_HISTORY_AUDIT_JOB',
  roleKpis: Object.freeze({
    calculator_bridge: 'view_to_first_calculation_success',
    decision_support: 'contextual_next_action_rate', troubleshooting: 'resolution_next_action_rate',
    retention: 'returning_user_rate', game_decision: 'game_article_to_calculator_success',
    reference: 'assisted_navigation_rate', hold: 'verified_before_indexing'
  })
});

function refreshPlayPointArticlePortfolio() {
  return withScriptLock_(function() {
    recordHealthAttempt_('ARTICLE_PORTFOLIO');
    try {
      var result = playPointRefreshPortfolioUnlocked_();
      recordHealthSuccess_('ARTICLE_PORTFOLIO', { dataThrough: result.period.slice(-10), dataState: 'MEASUREMENT_PARTIAL', detail: '全台帳 ' + result.inventoryCount + '記事 / 既存行保持 ' + result.preserved + '件 / 判断日時あり ' + result.datedDecisions + '件。主KPI未計測はpartial。' });
      updateHealthSheet_(resolveAndRememberSpreadsheet_());
      return result;
    } catch (error) {
      recordHealthFailure_('ARTICLE_PORTFOLIO', error); updateHealthSheet_(resolveAndRememberSpreadsheet_()); throw error;
    }
  });
}

function playPointMaintenancePath_(value) {
  var path = String(value || '').replace(/^https:\/\/playpoint-sim\.com/, '').split(/[?#]/)[0];
  if (path.indexOf('../') === 0) path = '/' + path.substring(3);
  if (path.charAt(0) !== '/' || path.indexOf('//') === 0 || path.indexOf('..') >= 0 || /[\s\\]/.test(path)) {
    throw new Error('台帳のパスが不正です。');
  }
  return path.replace(/\/index\.html$/, '/');
}

function playPointMaintenanceInventory_(manifest, indexes) {
  if (!Array.isArray(manifest) || !manifest.length) throw new Error('日本語記事台帳が空です。');
  var registry = {}, result = {}, locales = ['ja', 'en', 'ko', 'tw'];
  locales.forEach(function(locale) {
    var index = indexes[locale];
    if (!index || !Array.isArray(index.articles) || !index.articles.length || index.locale !== locale) {
      throw new Error('検索インデックスが不完全です: ' + locale);
    }
    index.articles.forEach(function(article) {
      var path = playPointMaintenancePath_(article.path);
      var expected = locale === 'ja' ? !/^\/(en|ko|tw)\//.test(path) : path.indexOf('/' + locale + '/') === 0;
      if (!expected || !Object.prototype.hasOwnProperty.call(PLAYPOINT_MAINTENANCE.roleKpis, article.role)) throw new Error('記事の言語・役割を確認してください: ' + path);
      if (registry[path]) throw new Error('記事台帳に重複があります: ' + path);
      registry[path] = article.role;
      if (locale !== 'ja') result[path] = { path: path, locale: locale.toUpperCase(), role: article.role, listed: true, modified: '' };
    });
  });
  manifest.forEach(function(article) {
    if (!article || !article.file) throw new Error('記事台帳のfileがありません。');
    var path = playPointMaintenancePath_(article.file), listed = article.listed !== false;
    if (/^\/(en|ko|tw)\//.test(path) || result[path]) throw new Error('日本語台帳の重複・言語不一致: ' + path);
    var role = listed ? registry[path] : 'hold';
    if (!role) throw new Error('公開記事が検索インデックスにありません: ' + path);
    result[path] = { path: path, locale: 'JP', role: role, listed: listed, modified: String(article.modified || '') };
  });
  Object.keys(registry).forEach(function(path) {
    if (!/^\/(en|ko|tw)\//.test(path) && (!result[path] || !result[path].listed)) {
      throw new Error('日本語検索インデックスと記事台帳が一致しません: ' + path);
    }
  });
  return Object.keys(result).sort().map(function(key) { return result[key]; });
}

function playPointMaintenanceLoadInventory_() {
  // XserverはApps Script発の台帳取得に501を返す。公開正本の同じcommitへ固定して読む。
  var options = { muteHttpExceptions: true };
  var response = UrlFetchApp.fetch('https://github.com/katakata0522/PlayPoint/commits/main.atom', options);
  if (response.getResponseCode() !== 200) throw new Error('正本のコミットフィードを取得できません。HTTP ' + response.getResponseCode());
  var revision = playPointMaintenanceCommitFromFeed_(response.getContentText());
  var base = 'https://raw.githubusercontent.com/katakata0522/PlayPoint/' + revision + '/';
  var manifest = fetchJsonWithRetry_(base + 'blog/articles.json', options, 3), indexes = {};
  ['ja', 'en', 'ko', 'tw'].forEach(function(locale) {
    indexes[locale] = fetchJsonWithRetry_(base + (locale === 'ja' ? 'blog' : locale + '/articles') + '/article-search-index.json', options, 3);
  });
  var inventory = playPointMaintenanceInventory_(manifest, indexes);
  inventory.source = 'GitHub正本main / ' + revision;
  return inventory;
}

function playPointMaintenanceCommitFromFeed_(text) {
  var match = /Grit::Commit\/([a-f0-9]{40})/.exec(String(text || ''));
  if (!match) throw new Error('正本の台帳revisionを確認できません。');
  return match[1];
}

function playPointMaintenanceRecommendation_(article, metrics) {
  if (!article.listed || article.role === 'hold') return ['HOLD', '非掲載・公式確認を優先'];
  if (article.role === 'retention') return ['RETENTION', '再訪が主目的。単発PVで判定しない'];
  if (!metrics || metrics[13] !== 'OK') return ['', '計測未取得・部分取得。昇降格を判定しない'];
  if (Number(metrics[1]) >= 30 || Number(metrics[5]) >= 100 || Number(metrics[9]) >= 3) return ['CORE', '保護候補: 検索クリック30以上 / Organicユーザー100以上 / 計算成功3以上のいずれか'];
  if (Number(metrics[2]) >= 100 || Number(metrics[5]) >= 10 || Number(metrics[9]) > 0) return ['GROWTH', '改善候補: 検索表示100以上 / Organicユーザー10以上 / 計算成功ありのいずれか'];
  if (article.role === 'reference' || article.role === 'troubleshooting') return ['SUPPORT', '参照・解決の補助資産。役割固有KPIは未評価'];
  return ['PROVE', '追加投資前に需要を検証。削除判断ではない'];
}

function playPointMaintenanceIsoDate_(value) {
  var text = typeof value === 'string' ? value : formatDateSafe_(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text || '')) return '';
  var epoch = Date.parse(text + 'T00:00:00Z');
  return Number.isFinite(epoch) && new Date(epoch).toISOString().slice(0, 10) === text ? text : '';
}

function playPointMaintenanceBuildPortfolio_(inventory, oldGrid, p1, now) {
  if (!p1[1] || !/^\d{4}-\d{2}-\d{2} ～ \d{4}-\d{2}-\d{2}$/.test(String(p1[1][1] || '')) ||
      !/^OK/.test(String(p1[1][11] || ''))) throw new Error('P1の正常な同一期間データを確認してください。');
  var period = p1[1][1], start = period.slice(0, 10), end = period.slice(-10);
  if (!playPointMaintenanceIsoDate_(start) || !playPointMaintenanceIsoDate_(end) ||
      Date.parse(end) - Date.parse(start) !== 29 * 86400000 || end >= now.slice(0, 10)) {
    throw new Error('P1の対象期間は実在する過去30日間である必要があります。');
  }
  if (Date.parse(now.slice(0, 10) + 'T00:00:00Z') - Date.parse(end + 'T00:00:00Z') > 9 * 86400000) throw new Error('P1の対象期間が古すぎます。');
  var old = {}, metrics = {}, stamp = oldGrid[0] ? String(oldGrid[0][1] || '') : '';
  oldGrid.slice(11).forEach(function(row) {
    if (typeof row[1] !== 'string' || row[1].charAt(0) !== '/') return;
    var key = playPointMaintenancePath_(row[1]);
    if (old[key]) throw new Error('旧Portfolioに記事の重複があります: ' + key);
    old[key] = row;
  });
  p1.slice(5).forEach(function(row) {
    if (!row[0]) return;
    var key = playPointMaintenancePath_(row[0]);
    if (metrics[key]) throw new Error('P1のURL別名が重複しています: ' + key);
    metrics[key] = row;
  });
  var items = inventory.slice(), present = {};
  items.forEach(function(item) { present[item.path] = true; });
  Object.keys(old).forEach(function(path) {
    if (!present[path]) items.push({ path: path, locale: old[path][0], role: old[path][3], listed: false, modified: '', missing: true });
  });
  var counts = {}, preserved = 0, datedDecisions = 0, measured = 0, partial = 0, unmatched = 0, rows = items.map(function(article) {
    var previous = old[article.path], m = metrics[article.path], recommendation = playPointMaintenanceRecommendation_(article, m);
    var row = Array(24).fill('');
    if (previous) { previous.slice(0, 18).forEach(function(value, i) { row[i] = value; }); preserved++; }
    else {
      row[0] = article.locale; row[1] = article.path; row[2] = recommendation[0] || 'UNASSESSED';
      row[3] = article.role; row[4] = PLAYPOINT_MAINTENANCE.roleKpis[article.role] || '';
      row[5] = article.role === 'hold' ? 'operational' : article.role === 'calculator_bridge' ? 'measurable_now' : 'partial';
      row[17] = '新規台帳行。再評価候補を参照し、編集判断を確認する';
    }
    row[6] = m ? m[13] : 'NO_MATCH';
    [1, 2, 3, 5, 7, 8, 9, 11].forEach(function(source, i) { row[7 + i] = m && m[source] !== undefined ? m[source] : ''; });
    row[18] = recommendation[0]; row[19] = recommendation[1];
    row[20] = previous ? (previous[20] || stamp) : '未レビュー（新規・暫定）';
    if (previous && previous[20] === '未レビュー（新規・暫定）' && row[2] === 'PROVE' && (!m || m[13] !== 'OK')) row[2] = 'UNASSESSED';
    if (row[20] !== '未レビュー（新規・暫定）') datedDecisions++;
    if (!m) unmatched++; else if (m[13] !== 'OK') partial++; else measured++;
    row[21] = article.missing ? '台帳外・要確認' : article.listed ? '台帳掲載' : '非掲載';
    row[22] = article.modified;
    var notes = [];
    if (previous && previous[3] !== article.role) notes.push('役割台帳差分: ' + article.role);
    if (article.missing) notes.push('移動・非公開・台帳漏れを確認');
    if (!m) notes.push('P1に対応行なし。ゼロとは扱わない');
    if (article.role !== 'calculator_bridge' && article.role !== 'hold') notes.push('主KPIは未評価。補助指標での候補');
    if (previous && /\d{4}-\d{2}-\d{2}/.test(String(previous[16] || ''))) notes.push('過去cooldownを最新編集履歴と再照合');
    row[23] = notes.join(' / ');
    counts[row[2]] = (counts[row[2]] || 0) + 1;
    return row;
  });
  var grid = Array.from({length: 11}, function() { return Array(24).fill(''); });
  grid[0][0] = '記事Portfolio 自動計測'; grid[0][1] = now;
  grid[0][2] = '計測を更新。既存の編集判断日時はU列に保存';
  grid[1][0] = 'P1共通計測期間'; grid[1][1] = period; grid[1][2] = 'GSC FINAL / GA4同一日付窓。人数比はコホート遷移率ではない';
  grid[2][0] = '台帳'; grid[2][1] = inventory.length; grid[2][2] = inventory.source || '正本記事台帳＋EN/KO/TW検索インデックス';
  grid[3][0] = '表示記事'; grid[3][1] = rows.length; grid[3][2] = '台帳外の旧判断も保持';
  grid[4][0] = '保持した既存行'; grid[4][1] = preserved; grid[4][2] = '判断日時の記録あり ' + datedDecisions + '件 / 未レビュー行を確認済み判断に数えない';
  grid[5][0] = '分類（暫定含む）'; grid[5][1] = Object.keys(counts).sort().map(function(k) { return k + ' ' + counts[k]; }).join(' / ');
  grid[6][0] = '再評価候補'; grid[6][1] = 'S:T列'; grid[6][2] = 'しきい値は編集判断の入口。既存Bucketを自動昇降格しない';
  grid[7][0] = '未計測'; grid[7][1] = '再訪・解決・文脈別次行動など'; grid[7][2] = 'partialを維持し、PVや計算クリックで主KPIを代用しない';
  grid[8][0] = '公開SEO編集'; grid[8][1] = '今回なし'; grid[8][2] = '記事内容・intent owner・広告設定は変更しない';
  grid[9][0] = '計測対応'; grid[9][1] = 'OK ' + measured + ' / PARTIAL ' + partial + ' / NO_MATCH ' + unmatched;
  grid[9][2] = '空欄は未取得・該当なし。未計測の暫定分類はUNASSESSED、編集判断日時はU列。';
  grid[10] = ['Locale', 'Path', 'Bucket', 'Article Role', 'Primary KPI', 'measurement status', 'data status', 'Search Click', 'Search Imp.', 'CTR', 'Organic users', 'Article→Calculator', 'Start', 'First Success', 'Revenue', 'intent warning', 'cooldown', 'next action', '再評価候補', '候補の根拠', '既存判断の日時', '台帳・公開状態', '内容更新日（JP）', '今回の確認事項'];
  return { grid: grid.concat(rows), inventoryCount: inventory.length, rows: rows.length, preserved: preserved, datedDecisions: datedDecisions, period: period };
}

function playPointRefreshPortfolioUnlocked_() {
  var ss = resolveAndRememberSpreadsheet_(), sheet = ss.getSheetByName(PLAYPOINT_MAINTENANCE.portfolio);
  var p1 = ss.getSheetByName('📊ページ価値ファネル');
  if (!sheet || !p1) throw new Error('Portfolio/P1シートがありません。');
  var old = sheet.getDataRange().getValues();
  // Dateセルを表示用日時へ戻し、過去の判断日時を失わない。
  if (old[0]) old[0][1] = sheet.getRange('B1').getDisplayValue();
  var result = playPointMaintenanceBuildPortfolio_(playPointMaintenanceLoadInventory_(), old, p1.getDataRange().getValues(), currentTimestamp_().slice(0, 16) + ' JST');
  var backup = ss.getSheetByName('🗄Portfolio編集判断退避');
  if (!backup) { backup = sheet.copyTo(ss).setName('🗄Portfolio編集判断退避'); backup.hideSheet(); }
  if (sheet.getMaxRows() < result.grid.length) sheet.insertRowsAfter(sheet.getMaxRows(), result.grid.length - sheet.getMaxRows());
  var previousRows = sheet.getLastRow();
  // 生成する概要領域だけ整え、記事分類列の幅に説明文を押し込めない。
  sheet.getRange(1, 1, 10, 10).breakApart();
  sheet.getRange(1, 1, result.grid.length, 24).setValues(result.grid.map(function(row) { return row.map(function(value) { return typeof value === 'string' && value.charAt(0) === '=' ? "'" + value : value; }); }));
  if (previousRows > result.grid.length) sheet.getRange(result.grid.length + 1, 1, previousRows - result.grid.length, 24).clearContent();
  if (result.rows) { sheet.getRange(12, 10, result.rows, 1).setNumberFormat('0.00%'); sheet.getRange(12, 15, result.rows, 1).setNumberFormat('¥#,##0.00'); }
  sheet.getRange(11, 1, 1, 24).setFontWeight('bold');
  [1, 2, 3, 4, 5, 7, 8, 9, 10].forEach(function(row) { sheet.getRange(row, 3, 1, 8).merge(); });
  sheet.getRange(6, 2, 1, 9).merge();
  sheet.getRange(1, 1, 10, 10).setWrap(true).setVerticalAlignment('middle');
  sheet.setColumnWidth(1, 130);
  sheet.autoResizeRows(1, 10);
  sheet.setFrozenRows(11);
  console.log('Portfolio更新: 台帳=' + result.inventoryCount + ' / 表示=' + result.rows + ' / 既存行保持=' + result.preserved + ' / 判断日時あり=' + result.datedDecisions + ' / 期間=' + result.period);
  return { rows: result.rows, inventoryCount: result.inventoryCount, preserved: result.preserved, datedDecisions: result.datedDecisions, period: result.period };
}

// 手動メンテナンス専用。各チャンクでロックを解放し、成功後だけ再開位置を保存する。
function resumePlayPointPageHistoryAudit() {
  var started = Date.now(), chunks = 0, result;
  do {
    result = withScriptLock_(playPointPageHistoryAuditChunk_);
    chunks++;
  } while (!result.complete && chunks < 8 && Date.now() - started < 120000);
  console.log('365日履歴確認: 今回=' + chunks + '区間 / 確認済み=' + result.coveredDays + '日 / 完了=' + result.complete);
  return result;
}

function playPointCoverageStyle_(sheet) {
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).setNumberFormat('@');
    sheet.getRange(2, 5, sheet.getLastRow() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }
  setColumnWidths_(sheet, { 1: 115, 2: 120, 3: 130, 4: 255, 5: 185 });
}

function playPointCoverageMap_(values) {
  var byDate = {};
  values.slice(1).forEach(function(row) {
    var day = playPointMaintenanceIsoDate_(row[0]), count = Number(row[1]);
    var request = /^(\d{4}-\d{2}-\d{2}) ～ (\d{4}-\d{2}-\d{2})$/.exec(String(row[3] || ''));
    if (!day || !request || !playPointMaintenanceIsoDate_(request[1]) || !playPointMaintenanceIsoDate_(request[2]) ||
        day < request[1] || day > request[2] || row[1] === '' || row[1] === null || !Number.isInteger(count) ||
        !(row[2] === 'API_ROWS' && count > 0 || row[2] === 'API_NO_ROWS' && count === 0) || !row[4]) return;
    row[0] = day; byDate[day] = row;
  });
  return byDate;
}

function playPointPageHistoryAuditChunk_() {
  var ss = resolveAndRememberSpreadsheet_(), props = PropertiesService.getScriptProperties();
  recordHealthAttempt_('PAGE_HISTORY_BACKFILL');
  try {
    var raw = props.getProperty(PLAYPOINT_MAINTENANCE.checkpoint), job = raw ? JSON.parse(raw) : null;
    if (!job) {
      job = { start: relativeDateString_(-365), end: relativeDateString_(-1), nextEnd: relativeDateString_(-1), coveredDays: 0 };
      props.setProperty(PLAYPOINT_MAINTENANCE.checkpoint, JSON.stringify(job));
    }
    if (!playPointMaintenanceIsoDate_(job.start) || !playPointMaintenanceIsoDate_(job.end) || !playPointMaintenanceIsoDate_(job.nextEnd) ||
        Date.parse(job.end) - Date.parse(job.start) !== 364 * 86400000 || job.end >= relativeDateString_(0) || !Number.isInteger(job.coveredDays) || job.coveredDays < 0 || job.coveredDays > 365 ||
        job.nextEnd !== shiftDateString_(job.end, -job.coveredDays)) throw new Error('履歴確認の再開位置が不正です。');
    var coverage = getOrCreateSheet_(ss, PLAYPOINT_MAINTENANCE.coverage);
    var byDate = playPointCoverageMap_(coverage.getDataRange().getValues());
    var savedDays = job.coveredDays ? dateArrayInRange_(shiftDateString_(job.nextEnd, 1), job.end) : [];
    if (savedDays.some(function(day) { return !byDate[day]; })) {
      // 中断中も保存済み区間を確認する。日付だけでAPI取得成功と判定しない。
      job.nextEnd = job.end; job.coveredDays = 0;
      props.setProperty(PLAYPOINT_MAINTENANCE.checkpoint, JSON.stringify(job));
      props.setProperty(SCRIPT_KEYS.PAGE_HISTORY_BACKFILL_NEXT_END_DATE, job.end);
      props.deleteProperty(SCRIPT_KEYS.PAGE_HISTORY_BACKFILL_COMPLETED_AT);
    }
    if (job.nextEnd < job.start) {
      playPointCoverageStyle_(coverage);
      recordHealthSuccess_('PAGE_HISTORY_BACKFILL', { dataThrough: job.start + ' ～ ' + job.end, dataState: DATA_STATE.RECONCILED, detail: '保存済み365日のAPI応答・対象期間を再確認。APIの重複取得なし。' });
      updateHealthSheet_(ss);
      return { complete: true, coveredDays: job.coveredDays, start: job.start, end: job.end };
    }
    var end = job.nextEnd, start = shiftDateString_(end, -13);
    if (start < job.start) start = job.start;
    var rows = fetchGa4PageDailyRows_(start, end), days = dateArrayInRange_(start, end), counts = {};
    rows.forEach(function(row) {
      if (!playPointMaintenanceIsoDate_(row.date) || row.date < start || row.date > end) throw new Error('取得履歴の日付が要求範囲外です。');
      counts[row.date] = (counts[row.date] || 0) + 1;
    });
    upsertPageDailyHistory_(ss, rows);
    days.forEach(function(day) { byDate[day] = [day, counts[day] || 0, counts[day] ? 'API_ROWS' : 'API_NO_ROWS', start + ' ～ ' + end, currentTimestamp_()]; });
    replaceSheet_(coverage, ['日付', '取得ページ行数', 'API応答', '要求期間', '確認日時'], Object.keys(byDate).sort().map(function(day) { return byDate[day]; }), COLORS.BLUE);
    playPointCoverageStyle_(coverage);
    SpreadsheetApp.flush();
    invalidateArchivedMonthsForRange_(start, end);
    job.coveredDays += days.length; job.nextEnd = shiftDateString_(start, -1);
    props.setProperty(PLAYPOINT_MAINTENANCE.checkpoint, JSON.stringify(job));
    var complete = job.nextEnd < job.start;
    if (complete) {
      props.setProperty(SCRIPT_KEYS.PAGE_HISTORY_BACKFILL_NEXT_END_DATE, job.nextEnd);
      props.setProperty(SCRIPT_KEYS.PAGE_HISTORY_BACKFILL_COMPLETED_AT, currentTimestamp_());
    }
    recordHealthSuccess_('PAGE_HISTORY_BACKFILL', { dataThrough: complete ? job.start + ' ～ ' + job.end : start + ' ～ ' + end, dataState: DATA_STATE.RECONCILED, detail: 'API取得範囲確認 ' + job.coveredDays + '/365日。API_NO_ROWSは実PV=0の断定ではない。' });
    updateHealthSheet_(ss);
    return { complete: complete, coveredDays: job.coveredDays, start: job.start, end: job.end };
  } catch (error) {
    recordHealthFailure_('PAGE_HISTORY_BACKFILL', error); updateHealthSheet_(ss); throw error;
  }
}

// 履歴の再取得で無効化したDrive月別アーカイブを、通常日次の全再実行なしで追随させる。
function syncPlayPointPageHistoryArchives() {
  var started = Date.now(), count = 0, paths;
  do {
    paths = withScriptLock_(function() {
      var ss = resolveAndRememberSpreadsheet_();
      recordHealthAttempt_('DRIVE_MAINTENANCE');
      try {
        var result = maybeArchiveCompletedMonths_(ss, getOrCreateLogSheet_(ss));
        recordHealthSuccess_('DRIVE_MAINTENANCE', { dataThrough: relativeDateString_(-1), dataState: DATA_STATE.RECONCILED, detail: '履歴再取得後の月次アーカイブ追随: 今回' + result.length + '件。確定待ちの月は通常処理へ保留。' });
        updateHealthSheet_(ss); return result;
      } catch (error) { recordHealthFailure_('DRIVE_MAINTENANCE', error); updateHealthSheet_(ss); throw error; }
    });
    count += paths.length;
  } while (paths.length >= Math.max(1, CONFIG.ARCHIVE_MAX_MONTHS_PER_RUN) && count < 12 && Date.now() - started < 120000);
  console.log('Drive月次アーカイブ追随: 今回=' + count + '件');
  return { count: count };
}


// 独立した記事別成果ビュー。記事間・別名URL間の人数を加算しない。
function playPointGrowthRolePeriod_(period, verifiedFrom, today) {
  // 未確認・未来・不正な設定は通常の読者集計を止めず、成果ビューでエラー／未計測として扱う。
  if (playPointMaintenanceIsoDate_(verifiedFrom) && verifiedFrom <= today && verifiedFrom > period.start && verifiedFrom <= period.end) {
    return { start: verifiedFrom, end: period.end };
  }
  return period;
}

function playPointGrowthRoleGrid_(period, inventory, source, reading, timestamp, verifiedFrom) {
  if (source.state !== 'OK') throw new Error('役割別行動が完全取得されていません');
  if (verifiedFrom && (!playPointMaintenanceIsoDate_(verifiedFrom) || verifiedFrom > timestamp.slice(0, 10))) {
    throw new Error('PLAYPOINT_ROLE_ACTIONS_VERIFIED_FROM は実在する確認済み開始日を指定');
  }
  var covered = !!verifiedFrom && period.start >= verifiedFrom;
  var data = Object.create(null), returning = Object.create(null);
  var events = ['page_view'].concat(Object.keys(PLAYPOINT_ROLE_ACTION_EVENTS).map(function(role) { return PLAYPOINT_ROLE_ACTION_EVENTS[role]; }));
  source.rows.forEach(function(row) {
    if (events.indexOf(row.eventName) < 0 || !Number.isSafeInteger(row.totalUsers) || row.totalUsers < 0) throw new Error('役割別イベント応答が不正');
    var key = row.pagePath + '\u0000' + row.eventName;
    if (Object.prototype.hasOwnProperty.call(data, key)) throw new Error('役割別イベントの重複。利用者数は合算しない');
    data[key] = row.totalUsers;
  });
  if (reading && reading.state === 'OK') reading.rows.forEach(function(row) {
    if (row.newVsReturning !== 'returning') return;
    if (!Number.isSafeInteger(row.activeUsers) || row.activeUsers < 0 || Object.prototype.hasOwnProperty.call(returning, row.pagePath)) {
      throw new Error('ページ再訪の応答が重複・不正');
    }
    returning[row.pagePath] = row.activeUsers;
  });
  var grid = [
    ['記事の役割別成果', timestamp],
    ['対象期間', period.start + ' ～ ' + period.end],
    ['確認済み計測開始日', verifiedFrom || '未確認（正の実測件数のみ表示。率と未発生の0は保留）'],
    ['判定', '記事別の閲覧者と同期間の行動者。順序付きファネルではない。再訪の入口帰属・解決完了・ゲーム計算の帰属は未測定。'],
    ['保護', '記事管理台帳の編集判断は変更しない。30人未満は小標本。異なる役割の率を順位付けしない。'],
    ['言語', '記事パス', '役割', '主指標／観測イベント', '閲覧者', '行動者', '参考割合', '状態', '再訪閲覧者（参考）', '補足']
  ];
  inventory.forEach(function(article) {
    var path = article.path, role = article.role, action = PLAYPOINT_ROLE_ACTION_EVENTS[role];
    var denominator = data[path + '\u0000page_view'];
    var numerator = action ? data[path + '\u0000' + action] : undefined;
    var ratio = '', state = 'NOT_MEASURED', note = '既存のページ価値ファネルなどで補助観測。主指標は代用しない。';
    if (role === 'hold' || article.listed === false) {
      state = 'HOLD'; numerator = undefined; note = '非掲載・公式確認待ち';
    } else if (action) {
      note = '行動は解決・購入の完了を保証しない';
      if (denominator === undefined || denominator === 0) state = 'NO_DENOMINATOR';
      else if (numerator !== undefined && numerator > denominator) state = 'COHORT_MISMATCH';
      else if (!covered) state = 'COVERAGE_UNVERIFIED';
      else {
        numerator = numerator === undefined ? 0 : numerator;
        ratio = numerator / denominator;
        state = denominator < 30 ? 'SMALL_SAMPLE' : 'OBSERVED';
      }
    } else if (role === 'retention') note = '再訪閲覧者は当該ページの期間内の再訪者。初回入口別の再訪率ではない。';
    grid.push([article.locale, path, role, action || PLAYPOINT_MAINTENANCE.roleKpis[role] || '',
      denominator === undefined ? '' : denominator, numerator === undefined ? '' : numerator,
      ratio, state, returning[path] === undefined ? '' : returning[path], note]);
  });
  return { covered: covered, grid: grid };
}

function playPointGrowthPublishGrid_(ss, title, grid, headerRow, ratioCol) {
  var width = grid[headerRow - 1].length;
  var rows = grid.map(function(row) {
    var values = row.slice();
    while (values.length < width) values.push('');
    return playPointP12LiteralRow_(values);
  });
  var sheet = playPointP12EnsureSheet_(ss, title, width), previousRows = sheet.getLastRow();
  playPointP12EnsureRows_(sheet, rows.length);
  if (rows.length > headerRow) sheet.getRange(headerRow + 1, 1, rows.length - headerRow, 2).setNumberFormat('@');
  sheet.getRange(1, 1, rows.length, width).setValues(rows);
  if (previousRows > rows.length) sheet.getRange(rows.length + 1, 1, previousRows - rows.length, width).clearContent();
  sheet.setFrozenRows(headerRow);
  sheet.getRange(headerRow, 1, 1, width).setFontWeight('bold');
  sheet.setColumnWidth(1, 160); sheet.setColumnWidth(2, 430);
  sheet.setColumnWidths(3, width - 2, 150);
  sheet.setColumnWidth(width, 420);
  if (ratioCol && rows.length > headerRow) sheet.getRange(headerRow + 1, ratioCol, rows.length - headerRow, 1).setNumberFormat('0.00%');
}


// 公開確認済みの変更だけを登録する。mainのマージ日・未検証のdeployを公開日と扱わない。
var PLAYPOINT_RELEASE_REVIEW = Object.freeze({
  registry: '🚀公開変更履歴', report: '📈公開変更効果',
  receiptUrl: 'https://playpoint-sim.com/status/deploy-status.json',
  revisionUrl: 'https://playpoint-sim.com/status/deploy-revision.txt',
  headers: ['commit', 'deployedAt', 'verifiedAt', 'runId', 'evidence', 'observedAt'],
  windows: [7, 14, 28],
  receiptProperty: 'PLAYPOINT_VERIFIED_RELEASE_RECEIPTS_JSON'
});

function playPointGrowthVerifiedRelease_(payload, revisionText, observedAt) {
  var sha = String(payload && payload.commit || '');
  var checks = payload && payload.checks || {}, workflow = payload && payload.workflow || {};
  function iso(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
      Number.isFinite(Date.parse(value));
  }
  if (!payload || payload.schemaVersion !== 1 || payload.status !== 'verified' || payload.environment !== 'production' ||
      payload.branch !== 'main' || !/^[a-f0-9]{40}$/.test(sha) || String(revisionText || '').trim() !== sha ||
      checks.preflight !== 'passed' || checks.smokeTest !== 'passed' || checks.seoHealth !== 'passed' ||
      workflow.repository !== 'katakata0522/PlayPoint' || !/^[1-9]\d*$/.test(String(workflow.runId || '')) ||
      !iso(payload.deployedAt) || !iso(payload.verifiedAt) || Date.parse(payload.deployedAt) > Date.parse(payload.verifiedAt) ||
      Date.parse(payload.verifiedAt) > Date.now()) {
    throw new Error('公開検証の証拠が不完全・不一致。GitHubマージ日の代用は禁止');
  }
  return [sha, new Date(payload.deployedAt).toISOString(), new Date(payload.verifiedAt).toISOString(),
    String(workflow.runId), 'https://github.com/katakata0522/PlayPoint/actions/runs/' + workflow.runId, observedAt];
}

function playPointGrowthFetchRelease_(timestamp) {
  var responses = UrlFetchApp.fetchAll([PLAYPOINT_RELEASE_REVIEW.receiptUrl, PLAYPOINT_RELEASE_REVIEW.revisionUrl].map(function(url) {
    return { url: url, method: 'get', muteHttpExceptions: true, followRedirects: false };
  }));
  if (responses.length !== 2 || responses.some(function(response) { return response.getResponseCode() !== 200; })) {
    throw new Error('公開status/revisionの取得失敗: ' + responses.map(function(response) { return response.getResponseCode(); }).join('/'));
  }
  return playPointGrowthVerifiedRelease_(JSON.parse(responses[0].getContentText()), responses[1].getContentText(), timestamp);
}

function playPointGrowthReleaseKey_(row) { return String(row[0]) + '\u0000' + String(row[2]); }

function playPointGrowthReleaseLedger_(ss, additions) {
  var cfg = PLAYPOINT_RELEASE_REVIEW, sheet = playPointP12EnsureSheet_(ss, cfg.registry, cfg.headers.length);
  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, cfg.headers.length, 230);
  }
  var existing = sheet.getRange(1, 1, sheet.getLastRow(), cfg.headers.length).getDisplayValues();
  if (existing[0].join('|') !== cfg.headers.join('|')) throw new Error('公開変更履歴のヘッダー不一致。既存データを保持');
  var rows = existing.slice(1).filter(function(row) { return row.some(function(value) { return value !== ''; }); });
  var seen = Object.create(null);
  rows.forEach(function(row) {
    var expectedEvidence = 'https://github.com/katakata0522/PlayPoint/actions/runs/' + row[3];
    if (!/^[a-f0-9]{40}$/.test(row[0]) || !Number.isFinite(Date.parse(row[1])) ||
        !Number.isFinite(Date.parse(row[2])) || Date.parse(row[1]) > Date.parse(row[2]) ||
        Date.parse(row[2]) > Date.now() || !/^[1-9]\d*$/.test(row[3]) || row[4] !== expectedEvidence ||
        seen[playPointGrowthReleaseKey_(row)]) throw new Error('公開変更履歴の証拠または重複を確認');
    seen[playPointGrowthReleaseKey_(row)] = true;
  });
  var newRows = [];
  additions.forEach(function(row) {
    var key = playPointGrowthReleaseKey_(row);
    if (seen[key]) return;
    seen[key] = true; newRows.push(row);
  });
  if (newRows.length) {
    var start = sheet.getLastRow() + 1;
    playPointP12EnsureRows_(sheet, start + newRows.length - 1);
    sheet.getRange(start, 1, newRows.length, cfg.headers.length).setNumberFormat('@')
      .setValues(newRows.map(playPointP12LiteralRow_));
  }
  return rows.concat(newRows);
}

function playPointGrowthReleaseWindow_(release, days, timezone) {
  var deployed = Utilities.formatDate(new Date(release[1]), timezone, 'yyyy-MM-dd');
  var verified = Utilities.formatDate(new Date(release[2]), timezone, 'yyyy-MM-dd');
  return {
    previous: { start: playPointP12ShiftIsoDate_(deployed, -days), end: playPointP12ShiftIsoDate_(deployed, -1) },
    current: { start: playPointP12ShiftIsoDate_(verified, 1), end: playPointP12ShiftIsoDate_(verified, days) }
  };
}

function playPointGrowthDateCell_(value) {
  return value instanceof Date ? Utilities.formatDate(value, 'Asia/Tokyo', 'yyyy-MM-dd') : String(value || '');
}

function playPointGrowthDailyMap_(grid) {
  if (!grid[1] || grid[1][0] !== '対象期間') throw new Error('GA4イベント日次の対象期間が未取得');
  var match = /^(\d{4}-\d{2}-\d{2}) ～ (\d{4}-\d{2}-\d{2})$/.exec(String(grid[1][1] || ''));
  if (!match || !playPointMaintenanceIsoDate_(match[1]) || !playPointMaintenanceIsoDate_(match[2]) || match[1] > match[2]) {
    throw new Error('GA4イベント日次の対象期間が不正');
  }
  var byDay = Object.create(null), wanted = ['page_view', 'calculator_form_started', 'calculator_funnel_completed', 'calculator_validation_error'];
  grid.slice(6).forEach(function(row) {
    if (row[0] !== 'EVENTS' || wanted.indexOf(row[2]) < 0 || row[6] !== 'OBSERVED') return;
    var date = playPointGrowthDateCell_(row[1]), count = row[3];
    if (!playPointMaintenanceIsoDate_(date) || date < match[1] || date > match[2] ||
        count === '' || count === null || !Number.isSafeInteger(Number(count)) || Number(count) < 0) throw new Error('GA4日次値が不正');
    var events = byDay[date] || (byDay[date] = Object.create(null));
    if (Object.prototype.hasOwnProperty.call(events, row[2])) throw new Error('GA4日別イベント重複');
    events[row[2]] = Number(count);
  });
  return { start: match[1], end: match[2], days: byDay };
}

function playPointGrowthGscMap_(result) {
  if (!result || result.responseAggregationType !== 'byProperty') throw new Error('GSC property totalの日別取得条件が不一致');
  var days = Object.create(null);
  result.rows.forEach(function(row) {
    var date = row.keys && row.keys.length === 1 ? row.keys[0] : '';
    if (!playPointMaintenanceIsoDate_(date) || Object.prototype.hasOwnProperty.call(days, date) ||
        !Number.isSafeInteger(row.clicks) || row.clicks < 0 || !Number.isSafeInteger(row.impressions) ||
        row.impressions < row.clicks) throw new Error('GSC日別の値が不正・重複');
    days[date] = { clicks: row.clicks, impressions: row.impressions };
  });
  return days;
}

function playPointGrowthWindowTotals_(days, period, stableEnd, fields, requirePv) {
  if (period.end > stableEnd) return { state: 'PENDING_FINAL', values: null };
  var totals = Object.create(null);
  fields.forEach(function(field) { totals[field] = 0; });
  for (var day = period.start; day <= period.end; day = playPointP12ShiftIsoDate_(day, 1)) {
    var values = days[day];
    if (!values || (requirePv && !(values.page_view > 0)) || fields.some(function(field) { return !Number.isSafeInteger(values[field]) || values[field] < 0; })) {
      return { state: 'MISSING_DAYS', values: null };
    }
    fields.forEach(function(field) { totals[field] += values[field]; });
  }
  return { state: 'OBSERVED', values: totals };
}

function playPointGrowthReleaseGrid_(releases, ga4, gsc, today, timestamp, evidenceState, prior) {
  var cfg = PLAYPOINT_RELEASE_REVIEW, grid = [
    ['公開変更効果', timestamp],
    ['証拠', evidenceState, '観測したverified公開だけ。未観測の公開・同時変更・需要変化は残る。'],
    ['比較', '公開開始日〜検証完了日を除き、前後7/14/28日の同曜日構成を比較。GA4はJST、GSCはPT。'],
    ['解釈', '確定待ち・欠測は空欄。回数の比は利用者の完了率ではない。前後比較は因果推定ではない。'],
    ['公開検証日時', 'commit', '日数', '指標', '前期間', '後期間', '前値', '後値', '差（後−前）', '状態', '他の観測公開', '補足']
  ];
  var old = Object.create(null);
  (prior || []).forEach(function(row) {
    if (row[9] === 'OBSERVED' || row[9] === 'HISTORICAL') {
      old[[row[0],row[1],row[2],row[3],row[4],row[5]].join('|')] = row;
    }
  });
  var jstStable = playPointP12ShiftIsoDate_(today, -3), ptStable = playPointP12ShiftIsoDate_(today, -4);
  var gaFields = ['page_view', 'calculator_form_started', 'calculator_funnel_completed', 'calculator_validation_error'];
  function label(p) { return p.start + ' ～ ' + p.end; }
  function metricValue(result, calc) { return result.values ? calc(result.values) : ''; }
  function ratio(a, b) { return b > 0 ? a / b * 100 : ''; }
  releases.slice().sort(function(a,b) { return b[2].localeCompare(a[2]); }).forEach(function(release) {
    cfg.windows.forEach(function(days) {
      var jp = playPointGrowthReleaseWindow_(release, days, 'Asia/Tokyo');
      var pt = playPointGrowthReleaseWindow_(release, days, 'America/Los_Angeles');
      var jpPrev = playPointGrowthWindowTotals_(ga4.days, jp.previous, jstStable, gaFields, true);
      var jpCurr = playPointGrowthWindowTotals_(ga4.days, jp.current, jstStable, gaFields, true);
      var scPrev = playPointGrowthWindowTotals_(gsc || {}, pt.previous, ptStable, ['clicks','impressions'], false);
      var scCurr = playPointGrowthWindowTotals_(gsc || {}, pt.current, ptStable, ['clicks','impressions'], false);
      var other = releases.filter(function(candidate) {
        if (playPointGrowthReleaseKey_(candidate) === playPointGrowthReleaseKey_(release)) return false;
        var start = Utilities.formatDate(new Date(candidate[1]), 'Asia/Tokyo', 'yyyy-MM-dd');
        var end = Utilities.formatDate(new Date(candidate[2]), 'Asia/Tokyo', 'yyyy-MM-dd');
        return start <= jp.current.end && end >= jp.previous.start;
      }).length;
      function add(name, window, prev, curr, calculate, note) {
        var a = metricValue(prev, calculate), b = metricValue(curr, calculate);
        var state = prev.state === 'OBSERVED' && curr.state === 'OBSERVED' ?
          (a === '' || b === '' ? 'NO_DENOMINATOR' : 'OBSERVED') :
          prev.state === 'PENDING_FINAL' || curr.state === 'PENDING_FINAL' ? 'PENDING_FINAL' : 'MISSING_DAYS';
        var row = [release[2],release[0],days,name,label(window.previous),label(window.current),
          a,b,a === '' || b === '' ? '' : b-a,state,other,note];
        var key = row.slice(0,6).join('|'), previous = old[key];
        if (state === 'MISSING_DAYS' && previous && previous[6] !== '' && previous[7] !== '') {
          row[6] = previous[6]; row[7] = previous[7]; row[8] = previous[8]; row[9] = 'HISTORICAL';
          row[11] += '。前回の完全取得値を保持（現在の再取得は不可）';
        }
        grid.push(row);
      }
      [['GA4 PV','page_view'],['計算開始回数','calculator_form_started'],['初回計算成功回数','calculator_funnel_completed'],
        ['入力エラー回数','calculator_validation_error']].forEach(function(metric) {
        add(metric[0],jp,jpPrev,jpCurr,function(values) { return values[metric[1]]; },'GA4日別回数、JST');
      });
      add('計算成功回数/100PV',jp,jpPrev,jpCurr,function(values) { return ratio(values.calculator_funnel_completed,values.page_view); },'イベント頻度、利用者完了率ではない');
      add('入力エラー回数/100PV',jp,jpPrev,jpCurr,function(values) { return ratio(values.calculator_validation_error,values.page_view); },'イベント頻度、利用者エラー率ではない');
      add('Google検索クリック',pt,scPrev,scCurr,function(values) { return values.clicks; },'GSC property total、PT');
      add('Google検索表示',pt,scPrev,scCurr,function(values) { return values.impressions; },'GSC property total、PT');
      add('Google検索CTR (%)',pt,scPrev,scCurr,function(values) { return ratio(values.clicks,values.impressions); },'クリック÷表示×100、差はポイント');
    });
  });
  return grid;
}

function capturePlayPointReleaseEffectReview() {
  var cfg = PLAYPOINT_RELEASE_REVIEW, timestamp = playPointP12NowText_(), today = timestamp.slice(0,10);
  try {
    var ss = resolveAndRememberSpreadsheet_(), additions = [], evidenceErrors = [];
    try { additions.push(playPointGrowthFetchRelease_(timestamp)); }
    catch (error) { evidenceErrors.push(playPointP12ErrorText_(error)); }
    // 公開URLが実行環境から取得できない場合は、管理者が確認済みのstatusとrevisionを証拠として投入できる。
    var receiptJson = PropertiesService.getScriptProperties().getProperty(cfg.receiptProperty);
    if (receiptJson) {
      try {
        var receipts = JSON.parse(receiptJson);
        if (!Array.isArray(receipts) || receipts.length > 20) throw new Error('検証済みreceiptは20件以下の配列');
        receipts.forEach(function(receipt) {
          additions.push(playPointGrowthVerifiedRelease_(receipt.status, receipt.revision, timestamp));
        });
      } catch (error) { evidenceErrors.push(playPointP12ErrorText_(error)); }
    }
    var releases = withScriptLock_(function() { return playPointGrowthReleaseLedger_(ss, additions); });
    var ga4 = { days: {}, start: today, end: today }, gsc = null, dataErrors = [];
    if (releases.length) {
      try {
        var daily = ss.getSheetByName(PLAYPOINT_EVENT_DAILY.sheet);
        if (!daily) throw new Error('GA4イベント日次が未取得');
        ga4 = playPointGrowthDailyMap_(daily.getRange(1,1,daily.getLastRow(),8).getValues());
        if (ga4.end < playPointP12ShiftIsoDate_(today,-3)) dataErrors.push('GA4イベント日次が古い');
      } catch (error) { dataErrors.push(playPointP12ErrorText_(error)); }
      try {
        var end = playPointP12ShiftIsoDate_(today,-4);
        var start = playPointP12ShiftIsoDate_(today,-PLAYPOINT_EVENT_DAILY.historyDays);
        gsc = playPointGrowthGscMap_(playPointP12FetchGscRows_(playPointP12GetSiteUrl_(),start,end,['date'],'byProperty'));
      } catch (error) { dataErrors.push(playPointP12ErrorText_(error)); }
    }
    var state = !releases.length ? 'WAITING_EVIDENCE' : evidenceErrors.length || dataErrors.length ? 'PARTIAL' : 'OK';
    return withScriptLock_(function() {
      var existing = ss.getSheetByName(cfg.report), prior = [];
      if (existing && existing.getLastRow() > 5) prior = existing.getRange(6,1,existing.getLastRow()-5,12).getValues();
      var evidenceState = releases.length + '件のverified公開記録 / ' + state +
        (evidenceErrors.length || dataErrors.length ? ' / ' + evidenceErrors.concat(dataErrors).join(' | ') : '');
      var grid = playPointGrowthReleaseGrid_(releases,ga4,gsc,today,timestamp,evidenceState,prior);
      if (state === 'OK' && grid.slice(5).some(function(row) { return row[9] === 'MISSING_DAYS'; })) {
        state = 'PARTIAL'; evidenceState += ' / 一部比較窓に欠測あり'; grid[1][1] = evidenceState;
      }
      playPointGrowthPublishGrid_(ss,cfg.report,grid,5,0);
      var sheet = ss.getSheetByName(cfg.report);
      if (grid.length > 5) sheet.getRange(6,7,grid.length-5,3).setNumberFormat('0.##');
      playPointP12UpsertHealth_('RELEASE_EFFECT', { lastAttempt: timestamp, lastSuccess: playPointP12NowText_(),
        dataLatest: releases.length ? ga4.end : '', state: state, consecutiveFailures: 0, error: '', note: evidenceState });
      return { state: state, releases: releases.length, rows: grid.length };
    });
  } catch (error) {
    withScriptLock_(function() { playPointP12HealthError_('RELEASE_EFFECT', timestamp, playPointP12ErrorText_(error)); });
    throw error;
  }
}


// A優先: 取得済みのデータを再利用し、流入・成長機会・実測性能を別々の判断軸で表示する。
var PLAYPOINT_GROWTH_A = Object.freeze({
  trafficSheet: '🚪流入品質・入口診断',
  opportunitySheet: '🎯月間1万PV成長分析',
  vitalsSheet: '⚡実利用性能',
  targetPv: 10000,
  scenarioCtr: [0.02, 0.04],
  candidateMinImpressions: 100,
  candidateMinPosition: 4,
  candidateMaxPosition: 15,
  vitalMinObservations: 30,
  historyMaxRows: 10000,
  searchMaxRows: 20000
});

function playPointGrowthCount_(value, label) {
  if (value === '' || value === null || value === undefined || !Number.isSafeInteger(Number(value)) || Number(value) < 0) {
    throw new Error('不正な件数: ' + label);
  }
  return Number(value);
}

function playPointGrowthRatio_(numerator, denominator) {
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 ? numerator / denominator : '';
}

function playPointGrowthVitalsGrid_(period, source, timestamp) {
  var grid = [
    ['実利用性能（既存のweb_vitalイベント）', timestamp],
    ['対象期間', period.start + ' ～ ' + period.end],
    ['測定範囲', '既存の計算機ランタイム中心の簡易観測。INPは最大観測値、CLSは累積方式。公式CWVのp75・全サイトの合否ではない。'],
    ['集計単位', '観測イベント回数のみ。全利用者数・PV・ユニーク利用者数ではない。端末別の全体と版別の明細を合算しない。'],
    ['取得状態', source ? source.state : 'UNAVAILABLE', source ? source.detail : '元データなし'],
    ['集計レベル', '指標', '端末', 'ページ群', 'アセット版', '観測数', 'Good', 'Needs improvement', 'Poor', 'Good割合', 'Poor割合', '判定', '補足']
  ];
  if (!source || ['OK','PARAMETER_PARTIAL'].indexOf(source.state) < 0) {
    return { state: source ? source.state : 'UNAVAILABLE', detail: grid[4][2], grid: grid };
  }
  var metrics = ['LCP','INP','CLS'], ratings = ['good','needs_improvement','poor'], buckets = Object.create(null), seen = Object.create(null);
  var omitted = 0, total = 0, unknownVersion = 0;
  function group(level, metric, device, page, version, rating, count) {
    var key = JSON.stringify([level,metric,device,page,version]);
    var item = buckets[key] || (buckets[key] = {labels:[level,metric,device,page,version],counts:[0,0,0]});
    item.counts[ratings.indexOf(rating)] += count;
  }
  source.rows.forEach(function(row) {
    var count = playPointGrowthCount_(row.eventCount,'web_vital');
    var metric = row['customEvent:metric_name'], rating = row['customEvent:metric_rating'];
    var device = String(row.deviceCategory || '(not set)'), page = row['customEvent:page_group'];
    var version = String(row['customEvent:release_version'] || '(not set)');
    var key = JSON.stringify([metric,rating,device,page,version]);
    if (seen[key]) throw new Error('Web Vitals明細の重複');
    seen[key] = true; total += count;
    if (metrics.indexOf(metric) < 0 || ratings.indexOf(rating) < 0 || ['mobile','desktop','tablet'].indexOf(device) < 0) {
      omitted += count; return;
    }
    group('端末別',metric,device,'全観測ページ','全観測版',rating,count);
    // unknown版は実測の分類には使うが、公開版の比較根拠には使わない。
    if (playPointReaderParameterMissing_(page) || playPointReaderParameterMissing_(version) || version === 'unknown') {
      unknownVersion += count;
      group('版未特定',metric,device,playPointReaderParameterMissing_(page) ? '(not set)' : page,'unknown',rating,count);
    } else {
      group('版・ページ別',metric,device,page,version,rating,count);
    }
  });
  Object.keys(buckets).map(function(key) { return buckets[key]; }).sort(function(a,b) {
    return a.labels[0].localeCompare(b.labels[0]) ||
      a.labels[1].localeCompare(b.labels[1]) || a.labels[2].localeCompare(b.labels[2]) ||
      a.labels[3].localeCompare(b.labels[3]) || a.labels[4].localeCompare(b.labels[4]);
  }).forEach(function(item) {
    var counts = item.counts, n = counts.reduce(function(sum,v) { return sum+v; },0);
    var good = playPointGrowthRatio_(counts[0],n), poor = playPointGrowthRatio_(counts[2],n);
    var state = n === 0 ? 'NO_OBSERVATIONS' : n < PLAYPOINT_GROWTH_A.vitalMinObservations ? 'SMALL_SAMPLE' :
      poor >= 0.25 ? 'CHECK_POOR_SHARE' : 'OBSERVED';
    grid.push(item.labels.concat([n,counts[0],counts[1],counts[2],good,poor,state,
      item.labels[0] === '版未特定' ? '公開版との比較不可' : '観測分布のみ。CHECKは調査目安であり公式CWV合否ではない']));
  });
  var state = !total ? 'NO_OBSERVATIONS' : source.state !== 'OK' || omitted || unknownVersion ? 'PARTIAL' : 'OK';
  var detail = '観測 ' + total + '件 / 指標・評価・端末の分類不可 ' + omitted + '件 / 版・ページ未特定 ' + unknownVersion + '件。' + source.detail;
  grid[4] = ['取得状態',state,detail];
  return { state: state, detail: detail, grid: grid };
}

function playPointGrowthTrafficKey_(row) {
  return JSON.stringify([String(row.sessionSourceMedium || '(not set)'), String(row.deviceCategory || '(not set)')]);
}

function playPointGrowthTrafficGrid_(period, sources, timestamp) {
  var grid = [
    ['流入品質・入口診断',timestamp],
    ['対象期間',period.start + ' ～ ' + period.end],
    ['定義','GA4セッションのsource/medium × device。入口はクエリなしlandingPage。ユーザーは行内の人数。行をまたぐ人数は合算しない。'],
    ['安全','入口欠落・不明参照元・localhostなどは観測として示す。内部流入や不正アクセスと断定せず、GA4フィルタや設定を変更しない。'],
    ['取得状態',Object.keys(sources).map(function(k) { return k+'='+sources[k].state; }).join(' / ')],
    ['種別','セッションsource / medium','端末','入口／ホスト','セッション','アクティブユーザー','PV','エンゲージメント率','GA4広告収益（円）','計算初回成功回数','成功/100セッション','入口不明セッション','入口不明割合','状態','補足']
  ];
  var primary = sources.TRAFFIC;
  if (!primary || primary.state !== 'OK') throw new Error('流入元の完全な取得が必要。前回の表を保持');
  var base = Object.create(null), landings = Object.create(null), revenue = Object.create(null), successes = Object.create(null);
  var good = function(name) { return sources[name] && sources[name].state === 'OK'; };
  primary.rows.forEach(function(row) {
    var key = playPointGrowthTrafficKey_(row);
    if (base[key]) throw new Error('流入元×端末の重複');
    var n = playPointGrowthCount_(row.sessions,'sessions'), pv = playPointGrowthCount_(row.screenPageViews,'screenPageViews');
    var users = playPointGrowthCount_(row.activeUsers,'activeUsers'), engaged = playPointGrowthCount_(row.engagedSessions,'engagedSessions');
    if (engaged > n) throw new Error('engagedSessionsがsessionsを超過');
    base[key] = { row:row, n:n, pv:pv, users:users, engaged:engaged };
  });
  if (good('ENTRY')) {
    var exact = Object.create(null);
    sources.ENTRY.rows.forEach(function(row) {
      var key = playPointGrowthTrafficKey_(row), path = String(row.landingPage || '(not set)');
      // URL別のセッション内訳を集約。ページタイトル・query付きURLは取得しない。
      var full = JSON.stringify([key,path]);
      if (exact[full]) throw new Error('入口×流入元×端末の重複');
      exact[full] = true;
      var n = playPointGrowthCount_(row.sessions,'entry sessions'), pv = playPointGrowthCount_(row.screenPageViews,'entry PV');
      var item = landings[key] || (landings[key] = {total:0,unknown:0,rows:[]});
      item.total += n;
      if (playPointReaderParameterMissing_(path)) item.unknown += n;
      item.rows.push({path:path,n:n,pv:pv});
    });
  }
  if (good('REVENUE')) sources.REVENUE.rows.forEach(function(row) {
    var key = playPointGrowthTrafficKey_(row);
    if (Object.prototype.hasOwnProperty.call(revenue,key) || row.totalAdRevenue === '' || !Number.isFinite(row.totalAdRevenue)) {
      throw new Error('広告収益の不正・重複');
    }
    revenue[key] = row.totalAdRevenue;
  });
  if (good('SUCCESS')) sources.SUCCESS.rows.forEach(function(row) {
    var key = playPointGrowthTrafficKey_(row);
    if (Object.prototype.hasOwnProperty.call(successes,key)) throw new Error('計算成功イベントの流入元重複');
    successes[key] = playPointGrowthCount_(row.eventCount,'calculator success');
  });
  var partial = Object.keys(sources).some(function(key) { return sources[key].state !== 'OK'; }), orphan = 0;
  Object.keys(landings).forEach(function(key) { if (!base[key] && landings[key].total > 0) orphan += landings[key].total; });
  if (orphan) partial = true;
  var total = 0, matched = 0, unknown = 0;
  Object.keys(base).sort(function(a,b) { return base[b].n-base[a].n; }).forEach(function(key) {
    var b = base[key], l = landings[key], source = JSON.parse(key);
    var entryKnown = good('ENTRY') && ((l && l.total === b.n) || (!l && b.n === 0));
    if (!entryKnown && good('ENTRY')) partial = true;
    var unknownCount = entryKnown ? (l ? l.unknown : 0) : '';
    var success = Object.prototype.hasOwnProperty.call(successes,key) ? successes[key] : '';
    var money = Object.prototype.hasOwnProperty.call(revenue,key) ? revenue[key] : '';
    var state = !entryKnown ? (good('ENTRY') ? 'ENTRY_MISMATCH' : 'ENTRY_UNAVAILABLE') :
      b.n < 30 ? 'SMALL_SAMPLE' : unknownCount > 0 && unknownCount / b.n >= 0.05 ? 'CHECK_ENTRY' : 'OBSERVED';
    if (entryKnown) { matched += b.n; unknown += unknownCount; }
    total += b.n;
    grid.push(['流入元別',source[0],source[1],'',b.n,b.users,b.pv,playPointGrowthRatio_(b.engaged,b.n),money,success,
      success === '' ? '' : b.n > 0 ? success / b.n * 100 : '',unknownCount,
      unknownCount === '' ? '' : playPointGrowthRatio_(unknownCount,b.n),state,
      '成功/100セッションはイベント頻度。広告収益はGA4の観測値。未返却の成果/収益は空欄。']);
    if (l) l.rows.filter(function(x) { return playPointReaderParameterMissing_(x.path) || x.n >= 5; })
      .sort(function(a,b) { return b.n-a.n; }).slice(0,20).forEach(function(x) {
        grid.push(['入口明細',source[0],source[1],x.path,x.n,'',x.pv,'','','','','','',
          playPointReaderParameterMissing_(x.path) ? 'UNKNOWN_ENTRY' : entryKnown ? 'OBSERVED' : 'ENTRY_MISMATCH',
          '主な入口（5セッション以上、未設定は必ず表示）。上段と重複するので合算しない。']);
      });
  });
  if (good('HOST')) {
    var hosts = Object.create(null);
    sources.HOST.rows.forEach(function(row) {
      var host = String(row.hostName || '(not set)');
      if (Object.prototype.hasOwnProperty.call(hosts,host)) throw new Error('ホスト別PVの重複');
      hosts[host] = playPointGrowthCount_(row.screenPageViews,'host PV');
    });
    Object.keys(hosts).sort(function(a,b) { return hosts[b]-hosts[a]; }).forEach(function(host) {
      grid.push(['ホスト確認','','',host,'','',hosts[host],'','','','','','',
        /^(www\.)?playpoint-sim\.com$/i.test(host) ? 'OBSERVED' : 'CHECK_HOST',
        'GA4ページビューのみ。計測除外・内部アクセス・無効トラフィックとは断定しない。']);
    });
  }
  if (orphan) grid.push(['照合警告','','','','','','','','','','','','','ENTRY_MISMATCH','流入元の集計に対応しない入口セッション: '+orphan]);
  var state = partial ? 'PARTIAL' : 'OK';
  grid[4][2] = '入口照合 ' + matched + '/' + total + 'セッション / 照合済みの入口不明 ' + unknown + '。全体率は全セグメント一致時のみ。';
  grid[4][3] = total > 0 && matched === total && !orphan ? unknown / total : '';
  return { state:state, grid:grid, total:total, matched:matched, unknown:unknown };
}

function playPointGrowthTrafficSource_(propertyId,period,dimensions,metrics,filter,currency) {
  return playPointReaderSource_(function() {
    var body = {dateRanges:[{startDate:period.start,endDate:period.end}],
      dimensions:dimensions.map(function(name){return {name:name};}),
      metrics:metrics.map(function(name){return {name:name};}),limit:'10000'};
    if (filter) body.dimensionFilter = filter;
    if (currency) body.currencyCode = currency;
    var response = playPointP12Ga4Report_(propertyId,body);
    playPointP12AssertDecisionQuality_(response);
    if (currency && response.metadata && response.metadata.currencyCode && response.metadata.currencyCode !== currency) {
      throw new Error('GA4広告収益の通貨不一致');
    }
    return {rows:playPointP12ParseGa4Rows_(response,dimensions,metrics)};
  },[],{});
}

function capturePlayPointTrafficQualityReview() {
  var timestamp = playPointP12NowText_();
  try {
    var period = playPointP12BuildGa4Period_(), property = playPointP12GetGa4PropertyId_(), ss = resolveAndRememberSpreadsheet_();
    var dims = ['sessionSourceMedium','deviceCategory'], sources = {};
    sources.TRAFFIC = playPointGrowthTrafficSource_(property,period,dims,['sessions','activeUsers','screenPageViews','engagedSessions']);
    if (sources.TRAFFIC.state !== 'OK') throw new Error(sources.TRAFFIC.detail);
    sources.ENTRY = playPointGrowthTrafficSource_(property,period,dims.concat(['landingPage']),['sessions','screenPageViews']);
    sources.SUCCESS = playPointGrowthTrafficSource_(property,period,dims,['eventCount'],playPointReaderFilter_('eventName',['calculator_funnel_completed']));
    sources.REVENUE = playPointGrowthTrafficSource_(property,period,dims,['totalAdRevenue'],null,'JPY');
    sources.HOST = playPointGrowthTrafficSource_(property,period,['hostName'],['screenPageViews'],playPointReaderFilter_('eventName',['page_view']));
    var view = playPointGrowthTrafficGrid_(period,sources,timestamp);
    return withScriptLock_(function() {
      playPointGrowthPublishGrid_(ss,PLAYPOINT_GROWTH_A.trafficSheet,view.grid,6,13);
      var sheet = ss.getSheetByName(PLAYPOINT_GROWTH_A.trafficSheet), count = view.grid.length-6;
      if (count > 0) {
        sheet.getRange(7,8,count,1).setNumberFormat('0.00%');
        sheet.getRange(7,9,count,1).setNumberFormat('¥#,##0.00');
        sheet.getRange(7,11,count,1).setNumberFormat('0.00');
      }
      sheet.getRange(5,4).setNumberFormat('0.00%');
      playPointP12UpsertHealth_('TRAFFIC_QUALITY',{lastAttempt:timestamp,lastSuccess:playPointP12NowText_(),dataLatest:period.end,
        state:view.state,consecutiveFailures:0,error:'',note:'入口照合 '+view.matched+'/'+view.total+' / 照合済み不明 '+view.unknown+'。設定は変更しない。'});
      return {state:view.state,rows:view.grid.length};
    });
  } catch (error) {
    withScriptLock_(function() { playPointP12HealthError_('TRAFFIC_QUALITY',timestamp,playPointP12ErrorText_(error)); });
    throw error;
  }
}
