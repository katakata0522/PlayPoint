'use strict';

// 公開確認済みの変更だけを登録する。mainのマージ日・未検証のdeployを公開日と扱わない。
var PLAYPOINT_RELEASE_REVIEW = Object.freeze({
  registry: '🚀公開変更履歴', report: '📈公開変更効果',
  receiptUrl: 'https://playpoint-sim.com/status/deploy-status.json',
  revisionUrl: 'https://playpoint-sim.com/status/deploy-revision.txt',
  headers: ['commit', 'deployedAt', 'verifiedAt', 'runId', 'evidence', 'observedAt', 'evidence_kind', 'scope', 'candidate_kpi'],
  workflowCursorProperty: 'PLAYPOINT_DEPLOY_WORKFLOW_REVIEW_V1',
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
    String(workflow.runId), 'https://github.com/katakata0522/PlayPoint/actions/runs/' + workflow.runId, observedAt,'PUBLIC_MARKER','未分類','未設定'];
}

function playPointGrowthFetchRelease_(timestamp) {
  if(typeof playPointAnalyticsCheckBudget_==='function')playPointAnalyticsCheckBudget_();
  var responses = UrlFetchApp.fetchAll([PLAYPOINT_RELEASE_REVIEW.receiptUrl, PLAYPOINT_RELEASE_REVIEW.revisionUrl].map(function(url) {
    return { url: url, method: 'get', muteHttpExceptions: true, followRedirects: false };
  }));
  if (responses.length !== 2 || responses.some(function(response) { return response.getResponseCode() !== 200; })) {
    throw new Error('公開status/revisionの取得失敗: ' + responses.map(function(response) { return response.getResponseCode(); }).join('/'));
  }
  return playPointGrowthVerifiedRelease_(JSON.parse(responses[0].getContentText()), responses[1].getContentText(), timestamp);
}

function playPointGrowthReleaseKey_(row) { return String(row[0]) + '\u0000' + String(row[3]); }

function playPointGrowthReleaseLedger_(ss, additions) {
  var cfg = PLAYPOINT_RELEASE_REVIEW, sheet = playPointP12EnsureSheet_(ss, cfg.registry, cfg.headers.length);
  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, cfg.headers.length, 230);
  }
  var existing = sheet.getRange(1, 1, sheet.getLastRow(), cfg.headers.length).getDisplayValues();
  // 6列の旧履歴は残し、証拠種別・変更範囲の列だけを追加する。
  if(existing[0].slice(0,6).join('|')===cfg.headers.slice(0,6).join('|')&&existing[0].slice(6).every(function(v){return !v;})){
    sheet.getRange(1,7,1,3).setValues([cfg.headers.slice(6)]);existing[0]=cfg.headers.slice();
  }
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



// Public read-only GitHub API. Never forward Google OAuth credentials to GitHub.
function playPointGrowthGithubJson_(path){
  if(typeof playPointAnalyticsCheckBudget_==='function')playPointAnalyticsCheckBudget_();
  if(!/^\/repos\/katakata0522\/PlayPoint\/(actions\/|compare\/)/.test(path))throw new Error('GitHub証拠のパスが範囲外');
  var response=UrlFetchApp.fetch('https://api.github.com'+path,{method:'get',muteHttpExceptions:true,followRedirects:false,
    headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
  if(response.getResponseCode()!==200)throw new Error('GitHub公開証拠取得 HTTP '+response.getResponseCode());
  return JSON.parse(response.getContentText());
}

function playPointGrowthWorkflowReceipt_(run,jobs,timestamp){
  if(!run||run.status!=='completed'||run.conclusion!=='success'||run.head_branch!=='main'||
     run.path!=='.github/workflows/deploy.yml'||!/^[a-f0-9]{40}$/.test(String(run.head_sha||''))||
     !/^[1-9]\d*$/.test(String(run.id||''))||!Array.isArray(jobs))throw new Error('公開workflowの属性不一致');
  var matches=[];
  jobs.forEach(function(job){
    if(job.conclusion!=='success'||!Array.isArray(job.steps))return;
    var publish=job.steps.filter(function(step){return step.name==='Publish verified deployment status'&&step.conclusion==='success';});
    var mirror=job.steps.filter(function(step){return step.name==='Deploy strict public mirror via rsync'&&step.conclusion==='success';});
    if(publish.length===1&&mirror.length===1)matches.push([mirror[0].started_at,publish[0].completed_at]);
  });
  if(!matches.length)return null; // CI成功でも配信スキップなら公開ではない。
  if(matches.length!==1)throw new Error('公開工程が複数あり一意に確定できない');
  var a=Date.parse(matches[0][0]),b=Date.parse(matches[0][1]);
  if(!Number.isFinite(a)||!Number.isFinite(b)||a>b||b>Date.now())throw new Error('公開workflow工程日時が不正');
  return [run.head_sha,new Date(a).toISOString(),new Date(b).toISOString(),String(run.id),
    'https://github.com/katakata0522/PlayPoint/actions/runs/'+run.id,timestamp,'WORKFLOW_STEPS','未分類','未設定'];
}

function playPointGrowthReleaseScope_(files){
  if(!Array.isArray(files))return {scope:'変更範囲未取得',kpi:'未設定'};
  var categories=Object.create(null),paths=[];
  files.forEach(function(file){
    var path=String(file.filename||'');
    if(!/^[a-zA-Z0-9_.\/-]+$/.test(path)||path.indexOf('..')>=0)return;
    var label=/^(?:(en|ko|tw)\/)?articles\//.test(path)?'記事':
      /^(?:(en|ko|tw)\/)?games\//.test(path)?'ゲーム':
      /^(?:(en|ko|tw)\/)?(?:index\.html|status\/|maintenance\/|amount\/|campaign\/)/.test(path)?'計算機・入口':
      /^js\/|\.css$|^sw\.js$/.test(path)?'共通UI・性能':null;
    if(label){categories[label]=(categories[label]||0)+1;if(paths.length<5)paths.push(path);}
  });
  var names=Object.keys(categories);
  return {scope:(names.length?names.map(function(k){return k+' '+categories[k]+'ファイル';}).join(' / ')+' ｜ '+paths.join(', '):'公開範囲未分類')+
    (files.length>=300?'（差分上限の可能性）':''),
    kpi:names.map(function(k){return k==='記事'?'検索クリック・記事の役割別成果':k==='ゲーム'?'ゲーム利用':k==='計算機・入口'?'開始・成功・エラー':'実利用性能';}).join(' / ')||'未設定'};
}

function playPointGrowthWorkflowReview_(releases,timestamp){
  var cfg=PLAYPOINT_RELEASE_REVIEW,props=PropertiesService.getScriptProperties();
  var raw=props.getProperty(cfg.workflowCursorProperty),checked=raw?JSON.parse(raw):[];
  if(!Array.isArray(checked)||checked.some(function(id){return !/^[1-9]\d*$/.test(String(id));}))throw new Error('workflow照合カーソル不正');
  var done=Object.create(null);checked.forEach(function(id){done[String(id)]=true;});
  releases.forEach(function(row){done[String(row[3])]=true;});
  var payload=playPointGrowthGithubJson_('/repos/katakata0522/PlayPoint/actions/workflows/deploy.yml/runs?branch=main&status=success&per_page=30');
  if(!Array.isArray(payload.workflow_runs)||!Number.isSafeInteger(payload.total_count))throw new Error('workflow一覧応答不正');
  var runs=payload.workflow_runs.filter(function(run){return !done[String(run.id)];}).sort(function(a,b){return Date.parse(a.created_at)-Date.parse(b.created_at);});
  var additions=[],errors=[],attempted=0;
  runs.slice(0,4).forEach(function(run){
    try{
      if(!/^[1-9]\d*$/.test(String(run.id)))throw new Error('workflow ID不正');
      var result=playPointGrowthGithubJson_('/repos/katakata0522/PlayPoint/actions/runs/'+run.id+'/jobs?filter=latest&per_page=100');
      if(!Array.isArray(result.jobs)||result.total_count!==result.jobs.length)throw new Error('workflow jobsの取得が不完全');
      var row=playPointGrowthWorkflowReceipt_(run,result.jobs,timestamp);
      if(row){
        // 前回観測した公開版からの差分。観測間に別公開があれば真のdeploy差分ではない。
        var before=releases.concat(additions).filter(function(candidate){return candidate[2]<row[1]&&candidate[0]!==row[0];})
          .sort(function(a,b){return b[2].localeCompare(a[2]);})[0];
        if(before){
          try{
            var diff=playPointGrowthGithubJson_('/repos/katakata0522/PlayPoint/compare/'+before[0]+'...'+row[0]+'?per_page=1');
            var scope=playPointGrowthReleaseScope_(diff.files);
            row[7]='前回観測版から: '+scope.scope;row[8]=scope.kpi;
          }catch(error){row[7]='差分未取得';}
        }
        additions.push(row);
      }
      checked.push(String(run.id));attempted++;
    }catch(error){errors.push(playPointP12ErrorText_(error));}
  });
  // APIの最新30成功runだけ。古い公開、再実行・rollback、非公開リポジトリは保証外。
  return {rows:additions,checked:checked.slice(-120),pending:runs.length-attempted,
    recentCount:payload.workflow_runs.length,limited:payload.total_count>payload.workflow_runs.length,errors:errors};
}

// 最新の取得範囲での未処理と、取得対象外の古い履歴を別管理する。
function playPointGrowthWorkflowCoverage_(review){
  var errors=review.errors||[],pending=review.pending||0;
  return {recentState:pending||errors.length?'PARTIAL':'OK',
    recentNote:'最新'+review.recentCount+'成功run / 未処理 '+pending+' / エラー '+errors.length,
    historicalState:review.limited?'HISTORICAL_LIMITED':'IN_RANGE',
    historicalNote:review.limited?'最新30成功runより古い履歴は網羅未確認':'API一覧の取得範囲内（rollback等は別）'};
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

function playPointGrowthReleaseGrid_(releases, ga4, gsc, today, timestamp, evidenceState, prior, coverage) {
  coverage=coverage||{};
  function windowTotals(days,period,stableEnd,fields,requirePv,sourceStart){
    if(period.end<=stableEnd&&sourceStart&&period.start<sourceStart)return {state:'OUTSIDE_HISTORY',values:null};
    return playPointGrowthWindowTotals_(days,period,stableEnd,fields,requirePv);
  }
  var cfg = PLAYPOINT_RELEASE_REVIEW, grid = [
    ['公開変更効果', timestamp],
    ['証拠', evidenceState, '観測したverified公開だけ。未観測の公開・同時変更・需要変化は残る。'],
    ['比較', '公開開始日〜検証完了日を除き、前後7/14/28日の同曜日構成を比較。GA4はJST、GSCはPT。'],
    ['解釈', '確定待ち・欠測は空欄。回数の比は利用者の完了率ではない。前後比較は因果推定ではない。'],
    ['公開検証日時', 'commit', '日数', '指標', '前期間', '後期間', '前値', '後値', '差（後−前）', '状態', '他の観測公開', '補足', '証拠種別', '変更範囲（参考）', '評価候補']
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
      var jpPrev = windowTotals(ga4.days, jp.previous, jstStable, gaFields, true,coverage.ga4Start);
      var jpCurr = windowTotals(ga4.days, jp.current, jstStable, gaFields, true,coverage.ga4Start);
      var scPrev = windowTotals(gsc || {}, pt.previous, ptStable, ['clicks','impressions'], false,coverage.gscStart);
      var scCurr = windowTotals(gsc || {}, pt.current, ptStable, ['clicks','impressions'], false,coverage.gscStart);
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
          prev.state === 'PENDING_FINAL' || curr.state === 'PENDING_FINAL' ? 'PENDING_FINAL' :
          prev.state === 'OUTSIDE_HISTORY' || curr.state === 'OUTSIDE_HISTORY' ? 'OUTSIDE_HISTORY' : 'MISSING_DAYS';
        var row = [release[2],release[0],days,name,label(window.previous),label(window.current),
          a,b,a === '' || b === '' ? '' : b-a,state,other,note];
        var key = row.slice(0,6).join('|'), previous = old[key];
        if (['MISSING_DAYS','OUTSIDE_HISTORY'].indexOf(state)>=0 && previous && Number.isFinite(previous[6]) && Number.isFinite(previous[7])) {
          row[6] = previous[6]; row[7] = previous[7]; row[8] = previous[8]; row[9] = 'HISTORICAL';
          row[11] += '。前回の完全取得値を保持（現在の再取得は不可）';
        }
        if(row[9]==='OUTSIDE_HISTORY')row[11]+='。現在の取得期間外。障害や実測0とは区別';
        row.push(release[6]||'PUBLIC_MARKER',release[7]||'未分類',release[8]||'未設定');
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
    // 最新markerだけでは複数公開を取りこぼす。公開GitHub Actionsの成功した検証工程を限定数ずつ照合する。
    var workflowReview=null, workflowCoverage=null, existingReleases=withScriptLock_(function(){return playPointGrowthReleaseLedger_(ss,additions);});
    try {
      workflowReview=playPointGrowthWorkflowReview_(existingReleases,timestamp);
      additions=workflowReview.rows;
      workflowCoverage=playPointGrowthWorkflowCoverage_(workflowReview);
      if(workflowCoverage.recentState!=='OK')evidenceErrors.push('workflow照合: '+workflowCoverage.recentNote+' / '+workflowReview.errors.join(' | '));
    }catch(error){evidenceErrors.push('workflow照合: '+playPointP12ErrorText_(error));}
    var releases=withScriptLock_(function(){
      var saved=playPointGrowthReleaseLedger_(ss,workflowReview?workflowReview.rows:[]);
      // 照合カーソルは履歴が保存された後にのみ進める。
      if(workflowReview)PropertiesService.getScriptProperties().setProperty(cfg.workflowCursorProperty,JSON.stringify(workflowReview.checked));
      return saved;
    });
    var ga4 = { days: {}, start: today, end: today }, gsc = null, dataErrors = [], coverage={};
    if (releases.length) {
      try {
        var daily = ss.getSheetByName(PLAYPOINT_EVENT_DAILY.sheet);
        if (!daily) throw new Error('GA4イベント日次が未取得');
        ga4 = playPointGrowthDailyMap_(daily.getRange(1,1,daily.getLastRow(),8).getValues());
        coverage.ga4Start=ga4.start;
        if (ga4.end < playPointP12ShiftIsoDate_(today,-3)) dataErrors.push('GA4イベント日次が古い');
      } catch (error) { dataErrors.push(playPointP12ErrorText_(error)); }
      try {
        var end = playPointP12ShiftIsoDate_(today,-4);
        var start = playPointP12ShiftIsoDate_(today,-PLAYPOINT_EVENT_DAILY.historyDays);
        gsc = playPointGrowthGscMap_(playPointP12FetchGscRows_(playPointP12GetSiteUrl_(),start,end,['date'],'byProperty'));
        coverage.gscStart=start;
      } catch (error) { dataErrors.push(playPointP12ErrorText_(error)); }
    }
    var state = !releases.length ? 'WAITING_EVIDENCE' : evidenceErrors.length || dataErrors.length ? 'PARTIAL' : 'OK';
    return withScriptLock_(function() {
      var existing = ss.getSheetByName(cfg.report), prior = [];
      if (existing && existing.getLastRow() > 5) prior = existing.getRange(6,1,existing.getLastRow()-5,12).getValues();
      var evidenceState = releases.length + '件のverified公開記録 / ' + state +
        (evidenceErrors.length || dataErrors.length ? ' / ' + evidenceErrors.concat(dataErrors).join(' | ') : '')+
        (workflowCoverage?' / 最新照合 '+workflowCoverage.recentState+' ('+workflowCoverage.recentNote+') / 履歴範囲 '+workflowCoverage.historicalState+' ('+workflowCoverage.historicalNote+')':' / workflow照合未取得');
      var grid = playPointGrowthReleaseGrid_(releases,ga4,gsc,today,timestamp,evidenceState,prior,coverage);
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
