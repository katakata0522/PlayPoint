/**
 * 優先計測修正の読取専用診断。既存maintenanceモジュールと同じApps Scriptで使う。
 * Google側の定義・フィルタ・広告・トリガーは変更しない。出力は専用の2シートだけ。
 * GitHubの変更とbound Apps Scriptへの導入は別工程。未導入を稼働済みと扱わない。
 */
var PLAYPOINT_MEASUREMENT_REVIEW = Object.freeze({
  property: '489079798', spreadsheet: '1s1ag_hgFobpglhC2EkrvkNngdeDLCFcLbf8fV3Oc0U0',
  timeZone: 'Asia/Tokyo', currency: 'JPY', lagDays: 3, maxRows: 50000, pageSize: 5000,
  dimensions: ['deviceCategory', 'country', 'pagePath'],
  metrics: ['screenPageViews', 'publisherAdImpressions', 'totalAdRevenue'],
  parameters: [
    ['calculator_validation_error', 'error_type', 'eligible_amount'],
    ['calculator_validation_error', 'calculation_mode', 'reverse'],
    ['result_decision_link_clicked', 'link_position', 'purchase-check'],
    ['article_navigation_click', 'component', ''],
    ['article_navigation_click', 'destination_type', ''],
    ['search', 'intent_id', ''], ['search', 'results_count', '']
  ]
});

function playPointMeasurementDate_(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('日付形式が不正');
  var date = new Date(iso + 'T00:00:00Z');
  if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) throw new Error('実在しない日付');
  return date;
}
function playPointMeasurementShift_(iso, days) {
  var date = playPointMeasurementDate_(iso); date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function playPointMeasurementPeriods_(today, days, end) {
  playPointMeasurementDate_(today);
  if ([7, 14, 28].indexOf(days) < 0) throw new Error('同じ曜日構成の7・14・28日を指定');
  var cutoff = playPointMeasurementShift_(today, -PLAYPOINT_MEASUREMENT_REVIEW.lagDays);
  end = end || cutoff; playPointMeasurementDate_(end);
  if (end > cutoff) throw new Error('未経過・反映待ちの期間は比較しない');
  return {
    current: { start: playPointMeasurementShift_(end, 1 - days), end: end },
    previous: { start: playPointMeasurementShift_(end, 1 - 2 * days), end: playPointMeasurementShift_(end, -days) }
  };
}
function playPointMeasurementRatio_(n, d) { return d > 0 ? n / d : null; }
function playPointMeasurementMissing_(value) {
  return value === '' || value === '(not set)' || value === '(other)' || value == null;
}
function playPointMeasurementGuard_() {
  if (typeof resolveAndRememberSpreadsheet_ !== 'function' || typeof playPointP12GetGa4PropertyId_ !== 'function' || typeof playPointP12GoogleJson_ !== 'function') {
    throw new Error('既存maintenanceモジュールが必要');
  }
  var ss = resolveAndRememberSpreadsheet_();
  if (String(ss.getId()) !== PLAYPOINT_MEASUREMENT_REVIEW.spreadsheet || String(playPointP12GetGa4PropertyId_()).replace(/^properties\//, '') !== PLAYPOINT_MEASUREMENT_REVIEW.property) {
    throw new Error('PlayPoint以外の接続先には実行しない');
  }
  return ss;
}
function playPointMeasurementRequest_(suffix, body, admin) {
  var host = admin ? 'https://analyticsadmin.googleapis.com/v1beta/' : 'https://analyticsdata.googleapis.com/v1beta/';
  var options = body ? { method: 'post', contentType: 'application/json', payload: body } : { method: 'get' };
  return playPointP12GoogleJson_(host + 'properties/' + PLAYPOINT_MEASUREMENT_REVIEW.property + suffix, options);
}

// 1行不足でも取得完了とみなさない。再取得中に行数が変われば結果を採用しない。
function playPointMeasurementReport_(period, dimensions, metrics, filter, request) {
  var cfg = PLAYPOINT_MEASUREMENT_REVIEW, offset = 0, total = null, rows = [], keys = Object.create(null), flags = [], metadata = null;
  request = request || playPointMeasurementRequest_;
  while (true) {
    var body = { dateRanges: [{ startDate: period.start, endDate: period.end }],
      dimensions: dimensions.map(function(name) { return { name: name }; }),
      metrics: metrics.map(function(name) { return { name: name }; }),
      orderBys: dimensions.map(function(name) { return { dimension: { dimensionName: name } }; }),
      offset: String(offset), limit: String(cfg.pageSize), currencyCode: cfg.currency, returnPropertyQuota: true };
    if (filter) body.dimensionFilter = filter;
    var response = request(':runReport', body, false);
    if (!response || response.error || !Number.isInteger(response.rowCount) || response.rowCount < 0) throw new Error('レポート件数が未取得');
    if (response.rowCount > cfg.maxRows) throw new Error('レポート上限超過。範囲を分割して再取得');
    if (total !== null && response.rowCount !== total) throw new Error('取得中に件数変化。再取得が必要');
    total = response.rowCount;
    if (JSON.stringify((response.dimensionHeaders || []).map(function(h) { return h.name; })) !== JSON.stringify(dimensions) ||
        JSON.stringify((response.metricHeaders || []).map(function(h) { return h.name; })) !== JSON.stringify(metrics)) throw new Error('要求と応答の列が不一致');
    var meta = response.metadata || {};
    if (!metadata) metadata = meta;
    if (!meta.timeZone || meta.timeZone !== cfg.timeZone || (metadata.timeZone && meta.timeZone !== metadata.timeZone)) throw new Error('タイムゾーン不一致または未取得');
    if (metrics.indexOf('totalAdRevenue') >= 0 && (meta.currencyCode !== cfg.currency || meta.currencyCode !== metadata.currencyCode)) throw new Error('通貨不一致または未取得');
    if (meta.dataLossFromOtherRow) flags.push('OTHER_ROW');
    if (meta.subjectToThresholding) flags.push('THRESHOLDING');
    if ((meta.samplingMetadatas || []).length) flags.push('SAMPLING');
    if (((meta.schemaRestrictionResponse || {}).activeMetricRestrictions || []).length) flags.push('METRIC_RESTRICTED');
    var page = response.rows || [];
    if (!page.length && offset < total) throw new Error('レポート途中欠落');
    page.forEach(function(row) {
      if ((row.dimensionValues || []).length !== dimensions.length || (row.metricValues || []).length !== metrics.length) throw new Error('行の列数不一致');
      var values = row.dimensionValues.map(function(v) { return String(v.value == null ? '' : v.value); });
      var key = JSON.stringify(values);
      if (keys[key]) throw new Error('重複したレポート行');
      keys[key] = true;
      var parsed = {};
      dimensions.forEach(function(name, i) { parsed[name] = values[i]; });
      metrics.forEach(function(name, i) {
        var raw = row.metricValues[i].value;
        if ((typeof raw !== 'string' && typeof raw !== 'number') || String(raw).trim() === '' || !isFinite(Number(raw)) || Number(raw) < 0) throw new Error('数値が未取得・不正');
        parsed[name] = Number(raw);
        if (name !== 'totalAdRevenue' && !Number.isSafeInteger(parsed[name])) throw new Error('回数が整数ではない');
      });
      rows.push(parsed);
    });
    offset += page.length;
    if (offset > total) throw new Error('返却件数が予定件数を超過');
    if (offset === total) break;
  }
  return { period: period, rows: rows, metadata: metadata, rowCount: total,
    state: flags.length ? 'RESTRICTED' : 'OK', flags: flags.filter(function(v, i, a) { return a.indexOf(v) === i; }) };
}
function playPointMeasurementTotals_(rows) {
  var result = { pv: 0, impressions: 0, revenue: 0 };
  rows.forEach(function(row) { result.pv += row.screenPageViews; result.impressions += row.publisherAdImpressions; result.revenue += row.totalAdRevenue; });
  result.revenuePer1000PV = playPointMeasurementRatio_(result.revenue * 1000, result.pv);
  result.impressionRPM = playPointMeasurementRatio_(result.revenue * 1000, result.impressions);
  result.impressionsPerPV = playPointMeasurementRatio_(result.impressions, result.pv);
  return result;
}
function playPointMeasurementCompare_(previous, current, device) {
  if (previous.state !== 'OK' || current.state !== 'OK') return { state: 'RESTRICTED', reason: '欠落・しきい値・サンプリングを含むため構成補正しない' };
  var bDays = (playPointMeasurementDate_(previous.period.end) - playPointMeasurementDate_(previous.period.start)) / 86400000 + 1;
  var aDays = (playPointMeasurementDate_(current.period.end) - playPointMeasurementDate_(current.period.start)) / 86400000 + 1;
  if (bDays !== aDays || [7, 14, 28].indexOf(bDays) < 0 || previous.period.end >= current.period.start) throw new Error('比較期間が重複・日数不一致');
  if (previous.metadata.timeZone !== current.metadata.timeZone || previous.metadata.currencyCode !== current.metadata.currencyCode) throw new Error('同条件ではない');
  var before = previous.rows.filter(function(r) { return !device || r.deviceCategory === device; });
  var after = current.rows.filter(function(r) { return !device || r.deviceCategory === device; });
  var b = Object.create(null), a = Object.create(null);
  function index(rows, map) { rows.forEach(function(row) {
    if (row.screenPageViews <= 0 || PLAYPOINT_MEASUREMENT_REVIEW.dimensions.some(function(d) { return playPointMeasurementMissing_(row[d]); })) return;
    map[JSON.stringify(PLAYPOINT_MEASUREMENT_REVIEW.dimensions.map(function(d) { return row[d]; }))] = row;
  }); }
  index(before, b); index(after, a);
  var common = Object.keys(b).filter(function(key) { return a[key]; });
  var bCommon = playPointMeasurementTotals_(common.map(function(key) { return b[key]; }));
  var aCommon = playPointMeasurementTotals_(common.map(function(key) { return a[key]; }));
  var allBefore = playPointMeasurementTotals_(before), allAfter = playPointMeasurementTotals_(after);
  var standardized = common.length ? common.reduce(function(sum, key) {
    return sum + b[key].screenPageViews / bCommon.pv * a[key].totalAdRevenue / a[key].screenPageViews * 1000;
  }, 0) : null;
  return { state: common.length ? 'OBSERVED_NOT_CAUSAL' : 'NO_COMMON_STRATA', device: device || 'all',
    previous: allBefore, current: allAfter, commonStrata: common.length,
    beforeCoverage: playPointMeasurementRatio_(bCommon.pv, allBefore.pv), afterCoverage: playPointMeasurementRatio_(aCommon.pv, allAfter.pv),
    newStrata: Object.keys(a).filter(function(k) { return !b[k]; }).length, lostStrata: Object.keys(b).filter(function(k) { return !a[k]; }).length,
    commonBeforeRPM: bCommon.revenuePer1000PV, commonCurrentRPM: aCommon.revenuePer1000PV,
    standardizedCurrentRPM: standardized,
    withinDifference: standardized === null ? null : standardized - bCommon.revenuePer1000PV,
    mixDifference: standardized === null ? null : aCommon.revenuePer1000PV - standardized };
}

function playPointMeasurementWrite_(ss, title, rows) {
  return withScriptLock_(function() {
  var width = 8, sheet = ss.getSheetByName(title) || ss.insertSheet(title);
  var values = rows.map(function(row) { return Array.from({ length: width }, function(_, i) {
    var value = row[i]; if (value == null) return '';
    return typeof value === 'string' && /^[=+@-]/.test(value) ? "'" + value : value;
  }); });
  var old = sheet.getLastRow();
  if (old > 0 && String(sheet.getRange('A1').getValue()) !== String(rows[0][0])) throw new Error('同名の別用途シートは上書きしない');
  var existing = old > 1 ? Date.parse(sheet.getRange('B2').getValue()) : NaN;
  if (isFinite(existing) && existing > Date.parse(rows[1][1])) throw new Error('新しい診断を古い取得結果で上書きしない');
  if (sheet.getMaxRows() < values.length) sheet.insertRowsAfter(sheet.getMaxRows(), values.length - sheet.getMaxRows());
  if (sheet.getMaxColumns() < width) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
  sheet.getRange(1, 1, values.length, width).setValues(values);
  if (old > values.length) sheet.getRange(values.length + 1, 1, old - values.length, width).clearContent();
  sheet.setFrozenRows(1); sheet.getRange(1, 1, 1, width).setFontWeight('bold');
  sheet.setColumnWidths(1, width, 150); sheet.setColumnWidth(1, 260); sheet.setColumnWidth(8, 480);
  sheet.getRange(1, 1, values.length, width).setWrap(true);
  });
}

function capturePlayPointRevenueLikeForLike() {
  var ss = playPointMeasurementGuard_(), now = new Date(), cfg = PLAYPOINT_MEASUREMENT_REVIEW;
  var today = Utilities.formatDate(now, cfg.timeZone, 'yyyy-MM-dd');
  var periods = playPointMeasurementPeriods_(today, 7);
  var previous = playPointMeasurementReport_(periods.previous, cfg.dimensions, cfg.metrics);
  var current = playPointMeasurementReport_(periods.current, cfg.dimensions, cfg.metrics);
  var rows = [['同条件収益比較', '前期間', '現期間', '前値', '現値', '差', '状態', '定義・制約']];
  rows.push(['取得日時', now.toISOString(), 'GA4 ' + cfg.property, '', '', '', '読取のみ', 'GA4 publisher metrics。同期間のAdSense RPMとは別指標']);
  rows.push(['比較期間', periods.previous.start + ' ～ ' + periods.previous.end, periods.current.start + ' ～ ' + periods.current.end, '', '', '', '3日反映待ち', '同じ曜日構成。9/19計測復旧・10/2～8旧広告実験・10/9移行などの交絡は残る']);
  rows.push(['取得制限', previous.flags.join(', '), current.flags.join(', '), previous.rowCount, current.rowCount, '', previous.state + '/' + current.state, '制限があれば補正値を作らない。欠測は空欄']);
  ['desktop', 'mobile', 'tablet', ''].forEach(function(device) {
    var comparison = playPointMeasurementCompare_(previous, current, device), label = device || '全体';
    if (!comparison.previous) { rows.push([label, '', '', '', '', '', comparison.state, comparison.reason]); return; }
    ['pv', 'impressions', 'revenue', 'revenuePer1000PV', 'impressionRPM', 'impressionsPerPV'].forEach(function(metric) {
      var b = comparison.previous[metric], a = comparison.current[metric];
      rows.push([label + ' / ' + metric, '', '', b, a, b === null || a === null ? null : a - b, comparison.state, '人数・セッションを行合計していない']);
    });
    rows.push([label + ' / 共通構成の閲覧カバー率', '', '', comparison.beforeCoverage, comparison.afterCoverage, '', comparison.state, '両期間でPVが正の同一端末×国×ページ。未設定・新規・消失は補正対象外']);
    rows.push([label + ' / 同じ構成のRPM', '', '', comparison.commonBeforeRPM, comparison.standardizedCurrentRPM, comparison.withinDifference, comparison.state, '前期間の共通層PV構成比を固定。国別とページ別の周辺集計を掛け合わせない']);
    rows.push([label + ' / 共通層内の構成差', '', '', comparison.standardizedCurrentRPM, comparison.commonCurrentRPM, comparison.mixDifference, comparison.state, '上行との差の和は共通層RPM変化に一致。広告変更の因果効果ではない']);
    rows.push([label + ' / 新規・消失層', '', '', comparison.lostStrata, comparison.newStrata, '', comparison.state, '新規・消失層は全体実績に含むが同条件補正には含めない']);
  });
  // 取得失敗時はここに到達せず、直前の正常結果を上書きしない。
  playPointMeasurementWrite_(ss, '⚖同条件収益比較', rows);
  return { periods: periods, previousState: previous.state, currentState: current.state, rows: rows.length };
}

function capturePlayPointMeasurementSettingsAudit() {
  var ss = playPointMeasurementGuard_(), cfg = PLAYPOINT_MEASUREMENT_REVIEW, now = new Date();
  var today = Utilities.formatDate(now, cfg.timeZone, 'yyyy-MM-dd'), period = playPointMeasurementPeriods_(today, 7).current;
  var metadata = playPointMeasurementRequest_('/metadata'), definitions = Object.create(null), adminState = 'OK', admin = Object.create(null);
  (metadata.dimensions || []).forEach(function(d) { definitions[d.apiName] = true; });
  try {
    var token = '', seen = Object.create(null), pages = 0;
    do {
      if (seen[token] || ++pages > 10) throw new Error('カスタム定義のページ取得が完了しない');
      seen[token] = true;
      var response = playPointMeasurementRequest_('/customDimensions?pageSize=200' + (token ? '&pageToken=' + encodeURIComponent(token) : ''), null, true);
      (response.customDimensions || []).forEach(function(d) { if (d.scope === 'EVENT') admin[d.parameterName] = true; });
      token = response.nextPageToken || '';
    } while (token);
  } catch (error) { adminState = 'UNAVAILABLE'; }
  var rows = [['イベント / パラメータ', 'Admin登録', 'Data API列', '観測回数', '未設定回数', '期待値の観測', '状態', '説明']];
  rows.push(['取得日時', now.toISOString(), cfg.property, '', '', '', '読取のみ', period.start + ' ～ ' + period.end + '。登録日・反映日・実受信日を同一視しない']);
  cfg.parameters.forEach(function(plan) {
    var name = 'customEvent:' + plan[1], registered = adminState === 'OK' ? (admin[plan[1]] ? 'REGISTERED' : 'NOT_REGISTERED') : 'UNAVAILABLE';
    if (!definitions[name]) { rows.push([plan[0] + ' / ' + plan[1], registered, 'UNAVAILABLE', '', '', '', 'NOT_REPORTABLE', '自動登録・再作成はしない。他のパラメータの診断は継続']); return; }
    try {
      var report = playPointMeasurementReport_(period, ['date', name], ['eventCount'], { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: plan[0] } } });
      var total = 0, missing = 0, expected = 0;
      report.rows.forEach(function(row) { total += row.eventCount; if (playPointMeasurementMissing_(row[name])) missing += row.eventCount; if (plan[2] && row[name] === plan[2]) expected += row.eventCount; });
      rows.push([plan[0] + ' / ' + plan[1], registered, 'AVAILABLE', total, missing, plan[2] ? expected : '',
        report.state !== 'OK' ? report.state : (total === 0 ? 'NO_OBSERVATIONS' : (missing ? 'PARAMETER_PARTIAL' : 'OBSERVED')),
        '期待値=' + (plan[2] || '分類済み値') + '。0件は未使用・反映待ちもあり、送信故障と断定しない。異なるパラメータの回数は合算しない']);
    } catch (error) { rows.push([plan[0] + ' / ' + plan[1], registered, 'AVAILABLE', '', '', '', 'REPORT_FAILED', 'この照会だけ失敗。他項目は継続。入力値・トークン・API応答本文は保存しない']); }
  });
  rows.push(['内部アクセス除外', '', '', '', '', '', 'MANUAL_CONFIRM_REQUIRED', '内部トラフィック定義とデータフィルタの状態は管理画面で別々に確認。ACTIVE化・権限変更は行わない']);
  rows.push(['本番実送信', '', '', '', '', '', 'MANUAL_CONFIRM_REQUIRED', '本番ネットワーク/DebugViewで同意あり1回・拒否0回を照合。CIは通信遮断を含み、実受信成功の証拠にしない']);
  rows.push(['既存の欠落診断', '', '', '', '', '', 'EXISTING_TOOL', 'capturePlayPointReaderParameterAudit()で日別の初取得・未設定最終日を確認。初取得日は登録日ではない']);
  playPointMeasurementWrite_(ss, '🔬計測設定・受信監査', rows);
  return { period: period, adminState: adminState, rows: rows.length };
}

if (typeof module !== 'undefined' && module.exports) module.exports = {
  config: PLAYPOINT_MEASUREMENT_REVIEW, periods: playPointMeasurementPeriods_, report: playPointMeasurementReport_,
  compare: playPointMeasurementCompare_, totals: playPointMeasurementTotals_, guard: playPointMeasurementGuard_
};
