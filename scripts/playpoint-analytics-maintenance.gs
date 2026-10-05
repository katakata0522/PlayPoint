'use strict';

// GA4の同一期間・実メタデータを使う。追加トリガーや追加権限は不要。
var PLAYPOINT_READER_OUTCOMES = Object.freeze({
  sheet: '🧑読者行動・再訪',
  events: Object.freeze(['page_view', 'article_navigation_click', 'article_to_calculator_clicked',
    'reader_question_clicked', 'search', 'calculator_form_started', 'calculator_funnel_completed',
    'calculator_validation_error', 'diary_tab_opened', 'diary_entry_saved'])
});

function playPointReaderFilter_(name, values) {
  return { filter: { fieldName: name, inListFilter: { values: values, caseSensitive: true } } };
}

function playPointReaderReport_(propertyId, period, dimensions, metrics, filter) {
  var body = { dateRanges: [{ startDate: period.start, endDate: period.end }],
    dimensions: dimensions.map(function(name) { return { name: name }; }),
    metrics: metrics.map(function(name) { return { name: name }; }), limit: '10000' };
  if (filter) body.dimensionFilter = filter;
  var report = playPointP12Ga4Report_(propertyId, body);
  var metadata = report.metadata || {};
  var rows = playPointP12ParseGa4Rows_(report, dimensions, metrics);
  var parameterMissing = rows.some(function(row) {
    return dimensions.some(function(name) { return name.indexOf('customEvent:') === 0 && (!row[name] || row[name] === '(not set)'); });
  });
  return { rows: rows, parameterMissing: parameterMissing,
    restricted: !!(metadata.subjectToThresholding || metadata.dataLossFromOtherRow ||
      (metadata.samplingMetadatas && metadata.samplingMetadatas.length)) };
}

function playPointReaderSource_(fn, required, definitions) {
  var missing = (required || []).filter(function(name) { return !definitions[name]; });
  if (missing.length) return { state: 'WAITING_DEFINITION', rows: [], detail: '未登録・反映待ち: ' + missing.join(', ') };
  try {
    var result = fn();
    return { state: result.restricted ? 'RESTRICTED' : result.parameterMissing ? 'PARAMETER_PARTIAL' : 'OK', rows: result.rows,
      detail: result.restricted ? 'しきい値・サンプリング・other集約あり。厳密な全数として扱わない' :
        result.parameterMissing ? 'パラメータ未設定の行あり。登録前期間・計測の欠落を確認し、関心がないとは判断しない' : '取得成功（0行も実測）' };
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
      }).filter(function(value) { return value !== undefined && value !== null && value !== ''; }).map(Number);
      if (!values.length || values.some(function(value) { return !isFinite(value) || value !== values[0]; })) {
        throw new Error('順序付きファネルの指標が欠落・競合しています: ' + name);
      }
      return { value: String(values[0]) };
    }) };
  });
  return { rows: playPointP12ParseGa4Rows_({ rows: normalizedRows }, dimensions, uniqueMetrics),
    restricted: !!(table.metadata && (table.metadata.subjectToThresholding || table.metadata.dataLossFromOtherRow)) };
}

function playPointReaderBuildGrid_(period, inventory, sources, timestamp) {
  var roles = {}, grid = [], width = 12;
  inventory.forEach(function(article) { roles[playPointP12NormalizePage_(article.path)] = article; });
  function add(row) {
    while (row.length < width) row.push('');
    grid.push(playPointP12LiteralRow_(row));
  }
  add(['読者行動・再訪', timestamp]);
  add(['対象期間', period.start + ' ～ ' + period.end, '人数は各行内で重複除去。行を足して全体人数にしない']);
  add(['目的', '記事の役割・導線・検索結果0件・入力エラー・再訪を同じ期間で確認']);
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
      var comment = type === 'READING' ? '再訪の閲覧人数。初回記事への帰属ではない' :
        type === 'SEARCH' ? (String(row['customEvent:results_count']) === '0' ? '検索結果0件' : '検索結果件数: ' + row['customEvent:results_count']) :
        type === 'COHORT' ? (row.cohortTotalUsers > 0 ? '日次アクティブ率: ' + (row.cohortActiveUsers / row.cohortTotalUsers * 100).toFixed(2) + '%' : '母数なし') :
        type === 'FUNNEL' ? '閉じたファネル・成功は開始後24時間以内。同じ計算内容・記事帰属までは保証しない' :
        type === 'ERRORS' ? '入力値は収集せず原因の分類だけを表示' : '';
      add([type, source.state,
        row.eventName || row['customEvent:error_type'] || row.funnelStepName || row.cohortNthDay || '',
        row.eventCount !== undefined ? row.eventCount : row.screenPageViews !== undefined ? row.screenPageViews : '',
        row.totalUsers !== undefined ? row.totalUsers : row.activeUsers !== undefined ? row.activeUsers : row.cohortActiveUsers !== undefined ? row.cohortActiveUsers : '',
        row.cohortTotalUsers !== undefined ? row.cohortTotalUsers : '',
        page || row.cohort || '', locale, article ? article.role : '',
        row['customEvent:component'] || row.deviceCategory || row.newVsReturning || '',
        row['customEvent:destination_type'] || row['customEvent:intent_id'] || row['customEvent:candidate_id'] || row['customEvent:calculation_mode'] || '', comment]);
    });
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

function playPointCaptureReaderOutcomes_() {
  var ss = resolveAndRememberSpreadsheet_(), p1 = ss.getSheetByName('📊ページ価値ファネル');
  if (!p1) throw new Error('P1の共通期間がありません。');
  var label = String(p1.getRange('B2').getValue() || '');
  if (!/^\d{4}-\d{2}-\d{2} ～ \d{4}-\d{2}-\d{2}$/.test(label)) throw new Error('P1の共通期間が不正です。');
  var period = { start: label.slice(0, 10), end: label.slice(-10) };
  var timestamp = playPointP12NowText_(), inventory = playPointMaintenanceLoadInventory_();
  if (!playPointMaintenanceIsoDate_(period.start) || !playPointMaintenanceIsoDate_(period.end) ||
      Date.parse(period.end) - Date.parse(period.start) !== 29 * 86400000 || period.end >= timestamp.slice(0, 10) ||
      Date.parse(timestamp.slice(0, 10)) - Date.parse(period.end) > 9 * 86400000) {
    throw new Error('読者行動の共通期間は実在する過去30日である必要があります。');
  }
  var propertyId = playPointP12GetGa4PropertyId_(), definitions = {}, sources = {};
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
    if (previous.slice(-10) > period.end && /^\d{4}-\d{2}-\d{2} ～/.test(previous)) throw new Error('より新しい読者集計を旧期間で置換しません。');
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
    return { period: period, rows: grid.length, state: partial ? 'PARTIAL' : 'OK', sources: states };
  });
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
        var result = maybeArchiveCompletedMonths_(ss, ss.getSheetByName(CONFIG.SHEETS.LOG));
        recordHealthSuccess_('DRIVE_MAINTENANCE', { dataThrough: relativeDateString_(-1), dataState: DATA_STATE.RECONCILED, detail: '履歴再取得後の月次アーカイブ追随: 今回' + result.length + '件。確定待ちの月は通常処理へ保留。' });
        updateHealthSheet_(ss); return result;
      } catch (error) { recordHealthFailure_('DRIVE_MAINTENANCE', error); updateHealthSheet_(ss); throw error; }
    });
    count += paths.length;
  } while (paths.length >= Math.max(1, CONFIG.ARCHIVE_MAX_MONTHS_PER_RUN) && count < 12 && Date.now() - started < 120000);
  console.log('Drive月次アーカイブ追随: 今回=' + count + '件');
  return { count: count };
}
