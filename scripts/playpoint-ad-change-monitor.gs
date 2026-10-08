'use strict';

// 2026-10-09の変更を固定した前後比較。広告設定の自動復元は行わない。
var PLAYPOINT_AD_CHANGE = Object.freeze({
  sheet: '⚖広告変更比較', cohortSheet: '↩7日目再訪',
  beforeStart: '2026-09-25', beforeEnd: '2026-10-08',
  changeDate: '2026-10-09', afterStart: '2026-10-10', afterEnd: '2026-11-06', lagDays: 3
});

function playPointAdChangeDays_(start, end) {
  var days = [];
  for (var day = start; day <= end; day = playPointP12ShiftIsoDate_(day, 1)) days.push(day);
  return days;
}

function playPointAdChangePeriod_(start, end, stableEnd, history, sources) {
  var days = playPointAdChangeDays_(start, end), rows = [], notes = [];
  days.forEach(function(day) {
    var found = history.filter(function(row) { return row.date === day; });
    if (found.length > 1) throw new Error('比較元の日次重複: ' + day);
    if (day <= stableEnd && found.length === 1 && found[0].dataState === 'RECONCILED') rows.push(found[0]);
  });
  var complete = rows.length === days.length;
  var out = { state: complete ? '比較可能（因果未確定）' : '集計待ち', days: rows.length };
  if (!complete) return out;
  function sum(name) { return rows.reduce(function(total, row) { return total + row[name]; }, 0); }
  var revenue = sum('revenue'), pv = sum('ga4Pv'), adPv = sum('adsensePv');
  out.revenueDaily = revenue / days.length; out.pvDaily = pv / days.length;
  out.ga4Rpm = pv > 0 ? 1000 * revenue / pv : '';
  out.adRpm = adPv > 0 ? 1000 * revenue / adPv : '';
  out.adsPerPv = pv > 0 ? sum('impressions') / pv : '';
  var sorted = rows.map(function(row) { return row.revenue; }).sort(function(a, b) { return a - b; });
  var middle = Math.floor(sorted.length / 2);
  out.median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  rows.forEach(function(row) {
    if (row.ga4Pv > 0 && row.adsensePv / row.ga4Pv > 3) notes.push(row.date + ': AdSense/GA4 PV乖離');
    if (out.median > 0 && row.revenue > 3 * out.median) notes.push(row.date + ': 収益上振れ');
  });
  function subset(source) { return source.rows.filter(function(row) {
    var date = String(row.date || '').replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
    return date >= start && date <= end;
  }); }
  if (sources.DAILY.state === 'OK' && sources.RETURNING.state === 'OK') {
    var daily = subset(sources.DAILY);
    var consistent = rows.every(function(row) {
      var match = daily.filter(function(item) { return String(item.date).replace(/-/g, '') === row.date.replace(/-/g, ''); });
      return match.length === 1 && match[0].screenPageViews === row.ga4Pv;
    });
    if (!consistent) notes.push('GA4日次PVの欠測・再照合差異。再訪率を保留');
    out.sessions = consistent ? daily.reduce(function(total, row) { return total + row.sessions; }, 0) : '';
    var returning = subset(sources.RETURNING).reduce(function(total, row) { return total + row.sessions; }, 0);
    out.returningShare = out.sessions > 0 ? returning / out.sessions : '';
    if (consistent && returning > out.sessions) { out.returningShare = ''; notes.push('再訪セッションが総数超過'); }
  } else notes.push('再訪: ' + sources.DAILY.state + '/' + sources.RETURNING.state);
  if (sources.EVENTS.state === 'OK') {
    var events = subset(sources.EVENTS);
    function count(name) { return events.filter(function(row) { return row.eventName === name; })
      .reduce(function(total, row) { return total + row.eventCount; }, 0); }
    out.articleCta = pv > 0 ? count('article_to_calculator_clicked') * 1000 / pv : '';
    out.success = pv > 0 ? count('calculator_funnel_completed') * 1000 / pv : '';
  } else notes.push('導線: ' + sources.EVENTS.state);
  out.note = notes.join(' / ') || '異常指摘なし。日次人数は合算しない';
  return out;
}

function playPointAdChangeCohorts_(propertyId, days, stableEnd) {
  var eligible = days.filter(function(day) { return playPointP12ShiftIsoDate_(day, 7) <= stableEnd; });
  if (!eligible.length) return { state: '集計待ち', rows: [], detail: '7日目と反映待ち期間が未経過' };
  return playPointReaderSource_(function() {
    var report = playPointP12Ga4Report_(propertyId, {
      dimensions: [{ name: 'cohort' }, { name: 'cohortNthDay' }],
      metrics: [{ name: 'cohortActiveUsers' }, { name: 'cohortTotalUsers' }],
      cohortSpec: { cohorts: eligible.map(function(day) { return {
        name: 'acquired_' + day.replace(/-/g, ''), dimension: 'firstSessionDate',
        dateRange: { startDate: day, endDate: day }
      }; }), cohortsRange: { granularity: 'DAILY', startOffset: 0, endOffset: 7 } },
      keepEmptyRows: true, limit: '1000'
    });
    var meta = report.metadata || {};
    return { rows: playPointP12ParseGa4Rows_(report, ['cohort', 'cohortNthDay'], ['cohortActiveUsers', 'cohortTotalUsers']),
      restricted: !!(meta.subjectToThresholding || meta.dataLossFromOtherRow ||
        (meta.samplingMetadatas && meta.samplingMetadatas.length)) };
  }, [], {});
}

function playPointAdChangeCohortGrid_(stableEnd, groups, timestamp) {
  var grid = [ ['7日目再訪（サイト全体）', timestamp],
    ['定義', '初回来訪からちょうど7日目に活動した人数÷初回来訪人数。7日以内の任意再訪率・記事別再訪率ではない'],
    ['比較', '変更前9/25～10/1獲得→10/2～8再訪、変更後10/10～16獲得→10/17～23再訪'],
    ['集計', '3日間の反映待ちを置く。未経過・取得制限・欠測は0%にしない。合計は獲得日ごとの人数で加重'],
    ['区分', '初回来訪日', '7日目', '母数', '7日目再訪人数', '7日目再訪率', '状態'] ];
  groups.forEach(function(group) {
    group.days.forEach(function(day) {
      var due = playPointP12ShiftIsoDate_(day, 7), source = group.source;
      var name = 'acquired_' + day.replace(/-/g, '');
      var first = source.rows.filter(function(row) { return row.cohort === name && Number(row.cohortNthDay) === 0; });
      var seventh = source.rows.filter(function(row) { return row.cohort === name && Number(row.cohortNthDay) === 7; });
      var mature = due <= stableEnd && source.state === 'OK' && first.length === 1;
      // 実APIはkeepEmptyRowsでも活動0日の行を省く。完全取得・成熟・D0母数確認時だけ0人と解釈する。
      var noActivity = mature && seventh.length === 0 && first[0].cohortTotalUsers > 0 &&
        first[0].cohortActiveUsers === first[0].cohortTotalUsers;
      var ready = mature && (seventh.length === 1 || noActivity);
      var total = ready ? first[0].cohortTotalUsers : '';
      var active = ready ? noActivity ? 0 : seventh[0].cohortActiveUsers : '';
      if (ready && ((!noActivity && seventh[0].cohortTotalUsers !== total) || active > total || active < 0)) ready = false;
      grid.push([group.label, day, due, ready ? total : '', ready ? active : '',
        ready && total > 0 ? active / total : '', due > stableEnd ? '集計待ち' : ready ?
          (total > 0 ? noActivity ? 'OK（7日目の活動行なし）' : 'OK' : '母数なし') : source.state === 'OK' ? '欠測・不整合' : source.state]);
    });
  });
  ['変更前', '変更後'].forEach(function(label) {
    var rows = grid.slice(5).filter(function(row) { return row[0] === label; });
    var ready = rows.length === 7 && rows.every(function(row) { return /^OK(?:$|（)/.test(row[6]) || row[6] === '母数なし'; });
    var total = ready ? rows.reduce(function(sum, row) { return sum + row[3]; }, 0) : '';
    var active = ready ? rows.reduce(function(sum, row) { return sum + row[4]; }, 0) : '';
    grid.push([label + '合計', '', '', total, active, ready && total > 0 ? active / total : '', ready ? 'OK' : '集計待ち']);
  });
  grid[3][1] += '。95%参考区間は少人数の不確かさを示すWilson区間。変更の因果・改善の有意差は示さない';
  grid[4].push('95%参考下限', '95%参考上限', '補足');
  return grid.map(function(row, index) {
    while (row.length < 7) row.push('');
    if (index > 4) {
      var interval = typeof row[3] === 'number' && row[3] > 0 && typeof row[4] === 'number' ?
        playPointChangeQualityWilson_(row[4], row[3]) : ['', ''];
      row.push(interval[0], interval[1], typeof row[3] === 'number' && row[3] > 0 ?
        '計測された集団内の参考区間。全来訪者・記事別の効果ではない' : '');
    }
    while (row.length < 10) row.push('');
    return playPointP12LiteralRow_(row);
  });
}

function capturePlayPointAdChangeMonitor(e) {
  if (e && typeof playPointAutomationTriggerAllowed_ === 'function' &&
      !playPointAutomationTriggerAllowed_('capturePlayPointAdChangeMonitor', e)) return { state: 'SKIPPED_STALE_TRIGGER' };
  try {
    var result = playPointCaptureAdChangeMonitor_();
    // 通常同期の内側では呼ばれない更新を既存9時トリガーへ接続。補助障害は収益比較を巻き戻さない。
    result.maintenance = [];
    try { result.quality = playPointCaptureChangeQuality_(); }
    catch (qualityError) {
      result.quality = { state: 'ERROR', detail: playPointP12ErrorText_(qualityError) };
      withScriptLock_(function() { playPointP12HealthError_('CHANGE_QUALITY', playPointP12NowText_(), result.quality.detail); });
    }
    ['capturePlayPointEventDailyReview', 'capturePlayPointReaderOutcomes'].forEach(function(name) {
      var fn = name === 'capturePlayPointEventDailyReview' ?
        typeof capturePlayPointEventDailyReview === 'function' && capturePlayPointEventDailyReview :
        typeof capturePlayPointReaderOutcomes === 'function' && capturePlayPointReaderOutcomes;
      if (!fn) return;
      try { result.maintenance.push({ name: name, state: fn().state }); }
      catch (error) {
        result.maintenance.push({ name: name, state: 'ERROR', detail: playPointP12ErrorText_(error) });
      }
    });
    return result;
  }
  catch (error) {
    withScriptLock_(function() { playPointP12HealthError_('AD_CHANGE_MONITOR', playPointP12NowText_(), playPointP12ErrorText_(error)); });
    throw error;
  }
}

function playPointCaptureAdChangeMonitor_() {
  var timestamp = playPointP12NowText_(), today = timestamp.slice(0, 10);
  var stableEnd = playPointP12ShiftIsoDate_(today, -PLAYPOINT_AD_CHANGE.lagDays);
  var end = playPointP12ShiftIsoDate_(today, -1);
  if (end > PLAYPOINT_AD_CHANGE.afterEnd) end = PLAYPOINT_AD_CHANGE.afterEnd;
  var propertyId = playPointP12GetGa4PropertyId_(), period = { start: PLAYPOINT_AD_CHANGE.beforeStart, end: end };
  function source(dimensions, metrics, filter) { return playPointReaderSource_(function() {
    return playPointReaderReport_(propertyId, period, dimensions, metrics, filter);
  }, [], {}); }
  var sources = {
    DAILY: source(['date'], ['sessions', 'screenPageViews']),
    RETURNING: source(['date'], ['sessions'], playPointReaderFilter_('newVsReturning', ['returning'])),
    EVENTS: source(['date', 'eventName'], ['eventCount'], playPointReaderFilter_('eventName',
      ['article_to_calculator_clicked', 'calculator_funnel_completed']))
  };
  if (Object.keys(sources).every(function(key) { return sources[key].state === 'ERROR'; })) {
    throw new Error('比較用GA4集計が全て失敗。前回結果を保持します。');
  }
  var groups = [{ label: '変更前', days: playPointAdChangeDays_('2026-09-25', '2026-10-01') },
    { label: '変更後', days: playPointAdChangeDays_('2026-10-10', '2026-10-16') }];
  groups.forEach(function(group) { group.source = playPointAdChangeCohorts_(propertyId, group.days, stableEnd); });
  var ss = resolveAndRememberSpreadsheet_(), history = playPointRevenueReadDailyHistory_(ss);
  var revenueLatest = playPointRevenueLatestReconciledDate_(history);
  var grid = [ ['広告変更の比較', timestamp],
    ['変更日', '2026-10-09：記事公開・広告除外追加・全画面広告の追加トリガー停止'],
    ['変更前', '2026-09-25～10-08（10/2～8は旧広告実験50%配信を含む）'],
    ['変更後', '2026-10-10～11-06。10/9は移行日として別記し比較に入れない'],
    ['反映待ち', '本日は' + stableEnd + '以前のRECONCILEDだけを比較。取得失敗・未経過は空欄'],
    ['判断日', '10/19：7日速報、10/26：14日判断、11/9：28日最終確認（各3日反映待ち）'],
    ['復元の目安（提案）', '14日で収益/GA4 PVが20%以上低下→単価・構成・利用品質を確認して戻す相談。小標本の再訪は判定不能。自動復元なし'],
    ['緊急確認の目安', '完了7日で収益/GA4 PVが30%以上低下→欠測・単価・曜日・国/端末構成を確認。3日だけで結論を出さない'],
    ['限界', '前後比較は因果を確定しない。流入量はPVで補正し、流入構成は別途確認。旧実験・9/29上振れ・9/30 PV乖離も残す'],
    ['再訪の見方', '再訪セッション比率は構成比。↩7日目再訪は同じ初回来訪集団を追跡。記事入口への帰属は未取得'],
    ['導線の見方', '🧪変更効果・利用品質で記事PV分母の導線と同一利用者の順序付き計算完了を確認。クリックは解決率ではない'],
    ['期間', '開始', '終了', '状態', '照合日数', '収益/日(円)', 'GA4 PV/日', '収益/1000 GA4 PV', 'AdSenseページRPM',
      '広告表示/GA4 PV', '日次収益中央値', '再訪セッション比率', '総セッション', '記事→計算機/1000 PV', '計算成功/1000 PV', '品質メモ'] ];
  var windows = [['変更前14日', '2026-09-25', '2026-10-08'], ['変更後7日', '2026-10-10', '2026-10-16'],
    ['変更後14日', '2026-10-10', '2026-10-23'], ['後半14日', '2026-10-24', '2026-11-06'],
    ['変更後28日', '2026-10-10', '2026-11-06']];
  var results = [];
  windows.forEach(function(window) {
    var r = playPointAdChangePeriod_(window[1], window[2], stableEnd, history, sources);
    results.push(r);
    grid.push([window[0], window[1], window[2], r.state, r.days, r.revenueDaily, r.pvDaily, r.ga4Rpm,
      r.adRpm, r.adsPerPv, r.median, r.returningShare, r.sessions, r.articleCta, r.success, r.note]);
  });
  [2, 4].forEach(function(index) {
    var baseline = results[0], after = results[index];
    var ready = baseline.revenueDaily !== undefined && after.revenueDaily !== undefined;
    function change(key) {
      return ready && typeof baseline[key] === 'number' && baseline[key] > 0 && typeof after[key] === 'number'
        ? after[key] / baseline[key] - 1 : '';
    }
    grid.push([index === 2 ? '14日変化' : '28日変化', '', '', ready ? '前後比較' : '集計待ち', '',
      change('revenueDaily'), change('pvDaily'), change('ga4Rpm'), change('adRpm'), change('adsPerPv'), change('median'),
      ready && typeof baseline.returningShare === 'number' && typeof after.returningShare === 'number'
        ? after.returningShare - baseline.returningShare : '', '', change('articleCta'), change('success'),
      '再訪比率はポイント差。他は増減率。旧実験・異常日を含む観測比較']);
  });
  grid.push(['日次記録（元表連動）', '元の実測は除外・修正しない。未来日は未取得、直近日は暫定']);
  grid.push(['日付', '区分', '照合状態', '収益(円)', 'GA4 PV', 'AdSense PV', '広告表示', '収益/1000 GA4 PV', 'メモ']);
  playPointAdChangeDays_('2026-09-25', '2026-11-06').forEach(function(day) {
    var found = history.filter(function(row) { return row.date === day; });
    if (found.length > 1) throw new Error('日次重複: ' + day);
    var r = found[0], ready = r && r.dataState === 'RECONCILED';
    grid.push([day, day < '2026-10-09' ? '変更前' : day === '2026-10-09' ? '移行日' : '変更後',
      ready ? day <= stableEnd ? 'RECONCILED' : '暫定' : '未取得', ready ? r.revenue : '',
      ready ? r.ga4Pv : '', ready ? r.adsensePv : '', ready ? r.impressions : '',
      ready && r.ga4Pv > 0 ? r.revenue * 1000 / r.ga4Pv : '', day >= '2026-10-02' && day <= '2026-10-08' ? '旧実験50%配信' : '']);
  });
  grid = grid.map(function(row) {
    while (row.length < 16) row.push('');
    return playPointP12LiteralRow_(row.map(function(value) { return value === undefined ? '' : value; }));
  });
  var cohortGrid = playPointAdChangeCohortGrid_(stableEnd, groups, timestamp);
  return withScriptLock_(function() {
    var sheet = playPointP12EnsureSheet_(ss, PLAYPOINT_AD_CHANGE.sheet, 16);
    playPointP12EnsureRows_(sheet, grid.length);
    sheet.getRange(1, 1, 11, 16).breakApart();
    sheet.getRange(1, 1, grid.length, 16).setValues(grid);
    sheet.getRange(1, 2, 11, 7).mergeAcross().setWrap(true);
    sheet.setFrozenRows(12); sheet.setFrozenColumns(1);
    sheet.setColumnWidth(1, 170); sheet.setColumnWidths(2, 2, 115); sheet.setColumnWidth(4, 190);
    sheet.setColumnWidths(5, 11, 125); sheet.setColumnWidth(16, 330);
    sheet.getRange(12, 1, 8, 16).setWrap(true);
    sheet.getRange(12, 1, 1, 16).setFontWeight('bold').setBackground('#eeeeee');
    sheet.getRange(13, 6, 5, 6).setNumberFormat('0.00');
    sheet.getRange(13, 12, 5, 1).setNumberFormat('0.00%');
    sheet.getRange(13, 14, 5, 2).setNumberFormat('0.00');
    sheet.getRange(18, 6, 2, 10).setNumberFormat('0.00%');
    sheet.autoResizeRows(1, 19);
    var cohortSheet = playPointP12EnsureSheet_(ss, PLAYPOINT_AD_CHANGE.cohortSheet, 10);
    cohortSheet.getRange(1, 1, 4, 7).breakApart();
    cohortSheet.getRange(1, 1, cohortGrid.length, 10).setValues(cohortGrid);
    cohortSheet.getRange(1, 2, 4, 6).mergeAcross().setWrap(true);
    cohortSheet.getRange(5, 1, 1, 7).setFontWeight('bold').setBackground('#eeeeee');
    cohortSheet.getRange(6, 6, cohortGrid.length - 5, 1).setNumberFormat('0.00%');
    cohortSheet.getRange(6, 8, cohortGrid.length - 5, 2).setNumberFormat('0.00%');
    cohortSheet.setColumnWidths(8, 2, 150); cohortSheet.setColumnWidth(10, 400);
    cohortSheet.setFrozenRows(5); cohortSheet.setColumnWidths(1, 7, 150); cohortSheet.autoResizeRows(1, 4);
    var state = Object.keys(sources).some(function(key) { return sources[key].state !== 'OK'; }) ||
      revenueLatest < stableEnd ||
      groups.some(function(group) { return ['ERROR', 'RESTRICTED'].indexOf(group.source.state) >= 0; }) ? 'PARTIAL' : 'OK';
    playPointP12UpsertHealth_('AD_CHANGE_MONITOR', { lastAttempt: timestamp, lastSuccess: timestamp,
      dataLatest: revenueLatest < end ? revenueLatest : end, state: state, consecutiveFailures: 0, error: '',
      note: '固定期間の前後比較。比較可能日=' + stableEnd + '。収益元の最新=' + revenueLatest });
    return { state: state, stableEnd: stableEnd, sources: Object.keys(sources).map(function(key) { return key + '=' + sources[key].state; }).join(' / ') };
  });
}

function installPlayPointAdChangeMonitorDailyTrigger() {
  var handler = 'capturePlayPointAdChangeMonitor';
  var existing = ScriptApp.getProjectTriggers().filter(function(trigger) { return trigger.getHandlerFunction() === handler; });
  if (existing.length) return 'EXISTING_DAILY_TRIGGER';
  var created = ScriptApp.newTrigger(handler).timeBased().everyDays(1).atHour(9).inTimezone('Asia/Tokyo').create();
  try {
    if (typeof playPointAutomationRegisterTrigger_ === 'function') playPointAutomationRegisterTrigger_(handler, created);
  } catch (error) { ScriptApp.deleteTrigger(created); throw error; }
  return 'CREATED_DAILY_9_TRIGGER';
}

// 収益の変化と利用品質を区別する。新しい閲覧イベント・個人ID・入力値は収集しない。
var PLAYPOINT_CHANGE_QUALITY = Object.freeze({
  sheet: '🧪変更効果・利用品質',
  events: Object.freeze(['article_to_calculator_clicked', 'calculator_form_started',
    'calculator_funnel_completed', 'calculator_validation_error', 'article_navigation_click', 'reader_question_clicked'])
});

function playPointChangeQualityWilson_(k, n) {
  if (!isFinite(n) || !isFinite(k) || n <= 0 || k < 0 || k > n) return ['', ''];
  var z = 1.959963984540054, p = k / n, zz = z * z, d = 1 + zz / n;
  var center = (p + zz / (2 * n)) / d;
  var radius = z * Math.sqrt(p * (1 - p) / n + zz / (4 * n * n)) / d;
  return [Math.max(0, center - radius), Math.min(1, center + radius)];
}

function playPointChangeQualityGroup_(path) {
  path = playPointP12NormalizePage_(path);
  if (/^\/(?:en\/|ko\/|tw\/)?articles\//.test(path)) return '記事';
  if (/^\/(?:en\/|ko\/|tw\/)?$/.test(path)) return 'Play Points計算機';
  return 'その他（ゲーム計算機等を含む）';
}

function playPointChangeQualityRows_(source, window) {
  return source.rows.filter(function(row) {
    var day = playPointEventDailyIso_(row.date);
    return day >= window[1] && day <= window[2];
  });
}

function playPointChangeQualitySegments_(window, stableEnd, pages, events) {
  if (window[2] > stableEnd) return [[window[0], '', '', '集計待ち', '', '', '', '', '', '', '', '']];
  if (pages.state !== 'OK' || events.state !== 'OK') return [[window[0], '', '', pages.state + '/' + events.state, '', '', '', '', '', '', '', '']];
  var map = {};
  function entry(group, device) {
    var key = JSON.stringify([group, device]);
    if (!map[key]) map[key] = { group: group, device: device, pv: 0, seconds: 0, counts: {} };
    return map[key];
  }
  playPointChangeQualityRows_(pages, window).forEach(function(row) {
    var group = playPointChangeQualityGroup_(row.pagePath), device = row.deviceCategory || '(not set)';
    [[group, device], [group, '全端末']].forEach(function(pair) {
      var item = entry(pair[0], pair[1]); item.pv += row.screenPageViews; item.seconds += row.userEngagementDuration;
    });
  });
  playPointChangeQualityRows_(events, window).forEach(function(row) {
    var group = playPointChangeQualityGroup_(row.pagePath), device = row.deviceCategory || '(not set)';
    [[group, device], [group, '全端末']].forEach(function(pair) {
      var item = entry(pair[0], pair[1]); item.counts[row.eventName] = (item.counts[row.eventName] || 0) + row.eventCount;
    });
  });
  if (!Object.keys(map).length) return [[window[0], '', '', '全0行・要確認', '', '', '', '', '', '', '', '']];
  return Object.keys(map).sort().map(function(key) {
    var item = map[key], c = item.counts, article = item.group === '記事';
    var cta = c.article_to_calculator_clicked || 0;
    return [window[0], item.group, item.device, item.pv > 0 ? '観測値' : 'PV母数なし', item.pv,
      article ? cta : '', article && item.pv > 0 ? cta * 100 / item.pv : '',
      item.pv > 0 ? item.seconds / item.pv : '', c.calculator_form_started || 0,
      c.calculator_funnel_completed || 0, c.calculator_validation_error || 0,
      '回数は転換人数ではない。全端末行と端末行は足さない'];
  });
}

function playPointChangeQualityFunnel_(source) {
  if (source.state !== 'OK') return { state: source.state, starts: '', completes: '', rate: '', note: source.detail };
  function step(row) { return String(row.funnelStepName || '').replace(/^\d+\.\s*/, ''); }
  var start = source.rows.filter(function(row) { return step(row) === '計算開始'; });
  var complete = source.rows.filter(function(row) { return step(row) === '開始後24時間以内の成功'; });
  if (start.length !== 1 || complete.length !== 1 || start[0].activeUsers < complete[0].activeUsers ||
      start[0].activeUsers < 0 || complete[0].activeUsers < 0) {
    return { state: '欠測・順序不整合', starts: '', completes: '', rate: '', note: '独立したイベント人数で埋めない' };
  }
  var n = start[0].activeUsers, k = complete[0].activeUsers;
  return { state: n > 0 ? '観測値' : '母数なし', starts: n, completes: k, rate: n > 0 ? k / n : '',
    note: n < 100 ? '母数100人未満。小さな増減を改善と断定しない' : '同じ利用者の順序。記事帰属・同じ入力内容は未保証' };
}

function playPointCaptureChangeQuality_() {
  var timestamp = playPointP12NowText_(), today = timestamp.slice(0, 10);
  var stableEnd = playPointP12ShiftIsoDate_(today, -PLAYPOINT_AD_CHANGE.lagDays);
  var end = stableEnd < PLAYPOINT_AD_CHANGE.afterEnd ? stableEnd : PLAYPOINT_AD_CHANGE.afterEnd;
  var period = { start: PLAYPOINT_AD_CHANGE.beforeStart, end: end }, propertyId = playPointP12GetGa4PropertyId_();
  function source(dimensions, metrics, filter) {
    return playPointReaderSource_(function() { return playPointReaderReport_(propertyId, period, dimensions, metrics, filter); }, [], {});
  }
  var sources = {
    PAGES: source(['date', 'pagePath', 'deviceCategory'], ['screenPageViews', 'userEngagementDuration']),
    EVENTS: source(['date', 'pagePath', 'deviceCategory', 'eventName'], ['eventCount'],
      playPointReaderFilter_('eventName', PLAYPOINT_CHANGE_QUALITY.events)),
    DEVICE: source(['date', 'deviceCategory'], ['sessions', 'screenPageViews', 'engagedSessions', 'userEngagementDuration']),
    CHANNEL: source(['date', 'sessionDefaultChannelGroup'], ['sessions']),
    COUNTRY: source(['date', 'country'], ['sessions'])
  };
  if (Object.keys(sources).every(function(key) { return sources[key].state === 'ERROR'; })) throw new Error('利用品質の全取得失敗。前回値を保持');
  var windows = [['変更前14日', '2026-09-25', '2026-10-08'],
    ['変更後7日', '2026-10-10', '2026-10-16'], ['変更後14日', '2026-10-10', '2026-10-23'],
    ['変更後28日', '2026-10-10', '2026-11-06']];
  var grid = [ ['変更効果・利用品質', timestamp],
    ['判断の順序', '収益総額・収益/閲覧 → 記事からの導線・計算完了 → 再訪。再訪だけで広告復元を判断しない'],
    ['比較の条件', '10/9は移行日。3日反映待ち。10/2～8の旧実験50%・曜日・端末/流入/国の構成差を確認'],
    ['導線の定義', '記事→計算機のクリック回数÷記事PV×100。イベント頻度であり、同じ人物の転換率・疑問解決率ではない'],
    ['読書の限界', '前面表示時間÷PVは補助指標。長い時間が良いとは限らず、読了率ではない。全端末と端末別を足さない'],
    ['計算完了', '閉じた順序ファネルで計算開始→24時間以内の成功を追う。少人数の小さな差は判断不能。記事帰属は未保証'],
    ['計測の限界', 'Cookie同意・端末変更・計測拒否で全来訪者は追えない。欠測・制限は空欄。広告変更だけの因果は確定しない'],
    ['期間', '開始', '終了', '状態', '計算開始人数', '開始後成功人数', '順序付き完了率', '補足'] ];
  windows.forEach(function(window) {
    var r = { state: '集計待ち', starts: '', completes: '', rate: '', note: '' };
    if (window[2] <= stableEnd) {
      r = playPointChangeQualityFunnel_(playPointReaderSource_(function() {
        return playPointReaderOrderedFunnel_(propertyId, { start: window[1], end: window[2] });
      }, [], {}));
    }
    grid.push([window[0], window[1], window[2], r.state, r.starts, r.completes, r.rate, r.note]);
  });
  grid.push(['期間', '記事・計算機', '端末', '状態', 'PV', '記事CTA回数', '記事CTA/100記事PV', '前面秒/PV', '計算開始回数', '計算成功回数', '入力エラー回数', '補足']);
  windows.forEach(function(window) {
    grid = grid.concat(playPointChangeQualitySegments_(window, stableEnd, sources.PAGES, sources.EVENTS));
  });
  var compositionStart = grid.length + 1;
  grid.push(['構成と利用品質', '種別', '値', '状態', 'セッション', '構成比', 'PV', 'PV/セッション', '有効セッション率', '前面秒/セッション', '', '補足']);
  windows.forEach(function(window) {
    ['DEVICE', 'CHANNEL', 'COUNTRY'].forEach(function(type) {
      var source = sources[type], ready = window[2] <= stableEnd && source.state === 'OK';
      if (!ready) { grid.push([window[0], type, '', window[2] > stableEnd ? '集計待ち' : source.state]); return; }
      var rows = playPointChangeQualityRows_(source, window), map = {};
      var dimension = type === 'DEVICE' ? 'deviceCategory' : type === 'CHANNEL' ? 'sessionDefaultChannelGroup' : 'country';
      rows.forEach(function(row) {
        var key = row[dimension] || '(not set)';
        if (!map[key]) map[key] = { sessions: 0, pv: 0, engaged: 0, seconds: 0 };
        map[key].sessions += row.sessions;
        if (type === 'DEVICE') { map[key].pv += row.screenPageViews; map[key].engaged += row.engagedSessions; map[key].seconds += row.userEngagementDuration; }
      });
      var total = rows.reduce(function(sum, row) { return sum + row.sessions; }, 0);
      Object.keys(map).sort().forEach(function(key) {
        var item = map[key], n = item.sessions, device = type === 'DEVICE';
        grid.push([window[0], type, key, '観測値', n, total > 0 ? n / total : '', device ? item.pv : '',
          device && n > 0 ? item.pv / n : '', device && n > 0 ? item.engaged / n : '',
          device && n > 0 ? item.seconds / n : '', '', '有効セッションはGA4定義。時間は補助指標']);
      });
    });
  });
  var compositionRows = grid.length - compositionStart;
  grid.push(['日次記録', '区分', '端末', '状態', 'PV', '記事CTA回数', '記事CTA/100記事PV', '前面秒/PV', '計算開始回数', '計算成功回数', '入力エラー回数', '補足']);
  playPointAdChangeDays_(period.start, period.end).forEach(function(day) {
    playPointChangeQualitySegments_([day, day, day], stableEnd, sources.PAGES, sources.EVENTS).forEach(function(row) {
      grid.push(row);
    });
  });
  grid = grid.map(function(row) { while (row.length < 12) row.push(''); return playPointP12LiteralRow_(row); });
  var partial = Object.keys(sources).some(function(key) { return sources[key].state !== 'OK'; }) ||
    grid.some(function(row) { return ['欠測・順序不整合', 'ERROR', 'RESTRICTED'].indexOf(row[3]) >= 0; });
  return withScriptLock_(function() {
    var ss = resolveAndRememberSpreadsheet_(), sheet = playPointP12EnsureSheet_(ss, PLAYPOINT_CHANGE_QUALITY.sheet, 12);
    var previousRows = sheet.getLastRow();
    playPointP12EnsureRows_(sheet, grid.length);
    sheet.getRange(1, 1, 7, 12).breakApart().setNumberFormat('@');
    sheet.getRange(1, 1, grid.length, 12).setValues(grid);
    if (previousRows > grid.length) sheet.getRange(grid.length + 1, 1, previousRows - grid.length, 12).clearContent();
    sheet.getRange(1, 2, 7, 11).mergeAcross().setWrap(true);
    sheet.setFrozenRows(8); sheet.setFrozenColumns(1);
    sheet.setColumnWidth(1, 155); sheet.setColumnWidths(2, 2, 150); sheet.setColumnWidth(4, 155);
    sheet.setColumnWidths(5, 7, 120); sheet.setColumnWidth(12, 360);
    sheet.getRange(8, 1, Math.max(1, grid.length - 7), 12).setWrap(true);
    sheet.getRange(9, 7, 4, 1).setNumberFormat('0.00%');
    if (compositionRows > 0) {
      sheet.getRange(compositionStart + 1, 6, compositionRows, 1).setNumberFormat('0.00%');
      sheet.getRange(compositionStart + 1, 9, compositionRows, 1).setNumberFormat('0.00%');
    }
    [8, 13].forEach(function(row) { sheet.getRange(row, 1, 1, 12).setFontWeight('bold').setBackground('#eeeeee'); });
    sheet.autoResizeRows(1, 13);
    playPointP12UpsertHealth_('CHANGE_QUALITY', { lastAttempt: timestamp, lastSuccess: playPointP12NowText_(),
      dataLatest: end, state: partial ? 'PARTIAL' : 'OK', consecutiveFailures: 0, error: '',
      note: Object.keys(sources).map(function(key) { return key + '=' + sources[key].state; }).join(' / ') });
    return { state: partial ? 'PARTIAL' : 'OK', dataLatest: end, rows: grid.length };
  });
}
