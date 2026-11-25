'use strict';

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
  // 30日内の行内ユーザーに対する極端なPV集中を調査候補にする。真の無効流入判定ではない。
  trafficConcentrationMinPv: 100,
  trafficConcentrationPvPerUser: 50,
  trafficConcentrationShare: 0.05,
  historyMaxRows: 10000,
  searchMaxRows: 20000
});

function playPointGrowthAssertPeriodFresh_(ss,title,end) {
  var sheet=ss.getSheetByName(title);
  if(!sheet || !sheet.getLastRow()) return;
  var match=/^\d{4}-\d{2}-\d{2} ～ (\d{4}-\d{2}-\d{2})$/.exec(String(sheet.getRange('B2').getValue()||''));
  if(match && match[1]>end) throw new Error('より新しい集計を旧期間で置換しない: '+title);
}

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

function playPointGrowthTrafficConcentration_(pv,users,totalPv){
  var cfg=PLAYPOINT_GROWTH_A;
  var share=totalPv>0?pv/totalPv:null;
  var perUser=users>0?pv/users:null;
  if(pv<cfg.trafficConcentrationMinPv)return null;
  if(users===0)return {state:'CHECK_ZERO_USERS',perUser:null,share:share};
  if(perUser>=cfg.trafficConcentrationPvPerUser&&share!==null&&share>=cfg.trafficConcentrationShare)
    return {state:'CHECK_PV_CONCENTRATION',perUser:perUser,share:share};
  return null;
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
  var total = 0, matched = 0, unknown = 0, totalPv = 0, unknownSource = 0;
  // PVは加算可能な指標。ユーザーは各セグメントの値だけを使い、人数は合算しない。
  var segmentPv=Object.keys(base).reduce(function(sum,key){return sum+base[key].pv;},0);
  var concentrationAlerts=[];
  Object.keys(base).sort(function(a,b) { return base[b].n-base[a].n; }).forEach(function(key) {
    var b = base[key], l = landings[key], source = JSON.parse(key);
    var entryKnown = good('ENTRY') && ((l && l.total === b.n) || (!l && b.n === 0));
    if (!entryKnown && good('ENTRY')) partial = true;
    var unknownCount = entryKnown ? (l ? l.unknown : 0) : '';
    var success = Object.prototype.hasOwnProperty.call(successes,key) ? successes[key] : '';
    var money = Object.prototype.hasOwnProperty.call(revenue,key) ? revenue[key] : '';
    var state = !entryKnown ? (good('ENTRY') ? 'ENTRY_MISMATCH' : 'ENTRY_UNAVAILABLE') :
      b.n < 30 ? 'SMALL_SAMPLE' : unknownCount > 0 && unknownCount / b.n >= 0.05 ? 'CHECK_ENTRY' : 'OBSERVED';
    var concentration=playPointGrowthTrafficConcentration_(b.pv,b.users,segmentPv);
    if(concentration)concentrationAlerts.push([source[0],source[1],b,concentration]);
    if (entryKnown) { matched += b.n; unknown += unknownCount; }
    total += b.n; totalPv += b.pv;
    if (playPointReaderParameterMissing_(source[0]) || /\(not set\)/i.test(source[0])) unknownSource += b.n;
    grid.push(['流入元別',source[0],source[1],'',b.n,b.users,b.pv,playPointGrowthRatio_(b.engaged,b.n),money,success,
      success === '' ? '' : b.n > 0 ? success / b.n * 100 : '',unknownCount,
      unknownCount === '' ? '' : playPointGrowthRatio_(unknownCount,b.n),state,
      '成功/100セッションはイベント頻度。広告収益はGA4の観測値。未返却の成果/収益は空欄。']);
    if (l) l.rows.filter(function(x) { return playPointReaderParameterMissing_(x.path) || x.n >= 5; })
      .sort(function(a,b) {
        return Number(playPointReaderParameterMissing_(b.path))-Number(playPointReaderParameterMissing_(a.path)) || b.n-a.n;
      }).slice(0,20).forEach(function(x) {
        grid.push(['入口明細',source[0],source[1],x.path,x.n,'',x.pv,'','','','','','',
          playPointReaderParameterMissing_(x.path) ? 'UNKNOWN_ENTRY' : entryKnown ? 'OBSERVED' : 'ENTRY_MISMATCH',
          '主な入口（5セッション以上、未設定は必ず表示）。上段と重複するので合算しない。']);
      });
  });
  concentrationAlerts.sort(function(a,b){return b[2].pv-a[2].pv;}).forEach(function(alert){
    var b=alert[2],c=alert[3];
    grid.push(['流入偏り調査',alert[0],alert[1],'',b.n,b.users,b.pv,'','','','','','',c.state,
      'セグメントPV/activeUsers '+(c.perUser===null?'算出不可':c.perUser.toFixed(1))+' / 内訳PV構成比 '+(c.share===null?'不明':(c.share*100).toFixed(1)+'%')+
      '。少数人数の大量PV等の観測。自己アクセス、無効流入、計測誤差のいずれとも断定せず、参照元・ホスト・期間を確認。元データは除外しない。']);
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
  var totalMatches = false;
  if (good('TOTAL') && sources.TOTAL.rows.length === 1) {
    var totals = sources.TOTAL.rows[0];
    totalMatches = playPointGrowthCount_(totals.sessions,'total sessions') === total &&
      playPointGrowthCount_(totals.screenPageViews,'total PV') === totalPv;
  }
  if (!totalMatches) {
    partial = true;
    grid.push(['照合警告','','','','','','','','','','','','','TOTAL_MISMATCH','独立取得した全体セッション/PVと内訳が一致しない、または未取得。全体の入口不明率は保留。']);
  }
  var state = partial ? 'PARTIAL' : concentrationAlerts.length?'CHECK':'OK';
  grid[4][2] = '偏り調査 '+concentrationAlerts.length+'件 / 全体照合 ' + (totalMatches ? 'OK' : '未確認') + ' / 不明参照元 ' + unknownSource + 'セッション / 入口照合 ' + matched + '/' + total + 'セッション / 照合済みの入口不明 ' + unknown + '。全体率は全セグメント一致時のみ。';
  grid[4][3] = totalMatches && total > 0 && matched === total && !orphan ? unknown / total : '';
  return { state:state, grid:grid, total:total, matched:matched, unknown:unknown, concentrationAlerts:concentrationAlerts.length };
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

function capturePlayPointTrafficQualityReview(deadlineMs) {
  var timestamp = playPointP12NowText_();
  try {
    var period = playPointP12BuildGa4Period_(), property = playPointP12GetGa4PropertyId_(), ss = resolveAndRememberSpreadsheet_();
    var dims = ['sessionSourceMedium','deviceCategory'], sources = {};
    // Apps Scriptの直接手動実行は引数なし。共通の実行時間予算を任意で渡せる。
    var deadline = typeof deadlineMs === 'number' && isFinite(deadlineMs) ? deadlineMs : Date.now()+300000;
    function report(dimensions,metrics,filter,currency) {
      if(Date.now() >= deadline-15000) return {state:'SKIPPED_BUDGET',rows:[],detail:'時間予算のため新規取得を開始しない'};
      return playPointGrowthTrafficSource_(property,period,dimensions,metrics,filter,currency);
    }
    sources.TRAFFIC = report(dims,['sessions','activeUsers','screenPageViews','engagedSessions']);
    if (sources.TRAFFIC.state !== 'OK') throw new Error(sources.TRAFFIC.detail);
    sources.TOTAL = report([],['sessions','screenPageViews']);
    sources.ENTRY = report(dims.concat(['landingPage']),['sessions','screenPageViews']);
    sources.SUCCESS = report(dims,['eventCount'],playPointReaderFilter_('eventName',['calculator_funnel_completed']));
    sources.REVENUE = report(dims,['totalAdRevenue'],null,'JPY');
    sources.HOST = report(['hostName'],['screenPageViews'],playPointReaderFilter_('eventName',['page_view']));
    var view = playPointGrowthTrafficGrid_(period,sources,timestamp);
    return withScriptLock_(function() {
      playPointGrowthAssertPeriodFresh_(ss,PLAYPOINT_GROWTH_A.trafficSheet,period.end);
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


function playPointGrowthPageLabels_(path) {
  var locale = (path.match(/^\/(en|ko|tw|hk|in)(?:\/|$)/) || [])[1];
  var language = locale ? locale.toUpperCase() : 'JP/その他';
  var local = locale ? path.replace(new RegExp('^/'+locale+'(?=/|$)'),'') : path;
  var type = !local || local === '/' ? '計算機トップ' :
    /^\/articles\//.test(local) ? '記事' :
    /^\/games(?:\/|$)/.test(local) ? 'ゲーム' :
    /^\/latest(?:\/|$)/.test(local) ? '最新情報' :
    /^\/blog(?:\/|$)/.test(local) ? '記事一覧' :
    /^\/(status|maintenance|campaign|amount|points-cost)(?:\/|$)/.test(local) ? '検索意図別ツール' : 'その他';
  return {language:language,type:type};
}

function playPointGrowthPageChange_(rows, daily, end) {
  var prevStart=playPointP12ShiftIsoDate_(end,-13), currStart=playPointP12ShiftIsoDate_(end,-6);
  var dayTotals=Object.create(null), pages=Object.create(null), seen=Object.create(null);
  rows.forEach(function(row) {
    var date=playPointGrowthDateCell_(row[0]);
    if (date < prevStart || date > end) return;
    if (!playPointMaintenanceIsoDate_(date) || row[5] !== 'RECONCILED') throw new Error('ページ日次履歴の未照合行: '+date);
    var path=String(row[1] || '');
    if (!path || path.charAt(0)!=='/' || /[?#]/.test(path)) throw new Error('ページ履歴の未正規化パス');
    var key=JSON.stringify([date,path]);
    if (seen[key]) throw new Error('ページ日次履歴に重複');
    seen[key]=true;
    var pv=playPointGrowthCount_(row[2],'page daily PV');
    dayTotals[date]=(dayTotals[date]||0)+pv;
    var values=pages[path]||(pages[path]=[0,0]);
    values[date<currStart?0:1]+=pv;
  });
  for(var day=prevStart;day<=end;day=playPointP12ShiftIsoDate_(day,1)) {
    if (!daily.days[day] || !(daily.days[day].page_view>0) ||
        dayTotals[day]!==daily.days[day].page_view) {
      return {state:'PAGE_TOTAL_MISMATCH',rows:[],detail:'GA4日次とページ別PVが一致しない日 '+day+'。増減の帰属を保留。'};
    }
  }
  var languages=Object.create(null), features=Object.create(null), ranked=[];
  function add(map,key,values){var v=map[key]||(map[key]=[0,0]);v[0]+=values[0];v[1]+=values[1];}
  Object.keys(pages).forEach(function(path){
    var labels=playPointGrowthPageLabels_(path), values=pages[path];
    add(languages,labels.language,values);add(features,labels.type,values);
    ranked.push({path:path,labels:labels,values:values,delta:values[1]-values[0]});
  });
  return {state:'OK',languages:languages,features:features,ranked:ranked,detail:prevStart+' ～ '+end+'（前後7日、全14日のPV照合済み）'};
}

function playPointGrowthSearchCandidates_(grid,today) {
  var cfg=PLAYPOINT_GROWTH_A;
  if (!grid[0] || grid[0].slice(0,9).join('|')!==['順位','検索キーワード','ページ','クリック数','表示回数','CTR','平均掲載順位','対象期間','データ状態'].join('|')) {
    throw new Error('検索語×ページのヘッダー不一致');
  }
  var periods=Object.create(null), byQuery=Object.create(null), seen=Object.create(null);
  var anchors=0, queryVariants=0;
  grid.slice(1).forEach(function(row) {
    if (!row[1] && !row[2]) return;
    var query=String(row[1]||''), url=String(row[2]||''), period=String(row[7]||'');
    if (!query || !/^https:\/\/playpoint-sim\.com\//.test(url) || row[8]!=='FINAL') throw new Error('検索語×ページに未確定・不正な行');
    var match=/^(\d{4}-\d{2}-\d{2}) ～ (\d{4}-\d{2}-\d{2})$/.exec(period);
    if (!match || !playPointMaintenanceIsoDate_(match[1]) || !playPointMaintenanceIsoDate_(match[2]) ||
        match[1]>match[2] || match[2]>=today) throw new Error('検索語×ページの期間が不正');
    periods[period]=true;
    if (url.indexOf('#')>=0) { anchors++;return; }
    if (url.indexOf('?')>=0) { queryVariants++;return; }
    var key=JSON.stringify([query,url]);
    if (seen[key]) throw new Error('検索語×ページに重複行');
    seen[key]=true;
    var clicks=playPointGrowthCount_(row[3],'GSC clicks'), imp=playPointGrowthCount_(row[4],'GSC impressions');
    var pos=Number(row[6]);
    if (!imp || clicks>imp || row[6]==='' || !Number.isFinite(pos) || pos<=0) throw new Error('検索語×ページの数値が不正');
    (byQuery[query]||(byQuery[query]=[])).push({query:query,url:url,clicks:clicks,imp:imp,ctr:clicks/imp,pos:pos});
  });
  var dates=Object.keys(periods);
  if (dates.length!==1) throw new Error('検索語×ページの期間が混在・未取得');
  var end=dates[0].slice(-10);
  var stale=Date.parse(today)-Date.parse(end)>10*86400000;
  var candidates=[];
  Object.keys(byQuery).forEach(function(query){
    var options=byQuery[query].sort(function(a,b){return b.imp-a.imp||b.clicks-a.clicks||a.url.localeCompare(b.url);});
    var top=options[0];
    if(top.imp<cfg.candidateMinImpressions || top.pos<cfg.candidateMinPosition || top.pos>cfg.candidateMaxPosition ||
       top.ctr>=cfg.scenarioCtr[0]) return;
    var overlap=options.slice(1).some(function(row){return row.imp>=top.imp*0.5||row.clicks>top.clicks;});
    top.otherUrls=options.length-1;
    top.state=stale?'STALE':overlap?'INTENT_OVERLAP':'REVIEW';
    // クリック単位の感度試算でありPV予測ではない。競合URL間の表示回数を合算しない。
    top.scenarios=top.state==='REVIEW'?cfg.scenarioCtr.map(function(target){
      return Math.max(0,Math.round(top.imp*target-top.clicks));
    }):['',''];
    candidates.push(top);
  });
  candidates.sort(function(a,b){return Number(a.state!=='REVIEW')-Number(b.state!=='REVIEW')||
    (Number(b.scenarios[1]||0)-Number(a.scenarios[1]||0))||b.imp-a.imp;});
  return {state:stale?'STALE':'OK',period:dates[0],candidates:candidates,excludedAnchors:anchors,
    detail:'API可視範囲の候補のみ。アンカー除外 '+anchors+'行・クエリ付きURL除外 '+queryVariants+'行。検索語ごとに主候補1URL、競合候補は試算保留。'};
}

function playPointGrowthOpportunityGrid_(daily,end,pages,search,timestamp) {
  var target=PLAYPOINT_GROWTH_A.targetPv;
  var week={start:playPointP12ShiftIsoDate_(end,-6),end:end};
  var month={start:playPointP12ShiftIsoDate_(end,-29),end:end};
  var seven=playPointGrowthWindowTotals_(daily.days,week,end,['page_view'],true);
  var thirty=playPointGrowthWindowTotals_(daily.days,month,end,['page_view'],true);
  var current=seven.values?seven.values.page_view:'', actual=thirty.values?thirty.values.page_view:'';
  var pace=current===''?'':Math.round(current*30/7);
  var gap=pace===''?'':Math.max(0,target-pace);
  var grid=[
    ['月間1万PV成長分析',timestamp],
    ['目標（30日換算）',target,'PV','GA4のPVのみ。検索クリックとは別指標'],
    ['直近確定7日',week.start+' ～ '+week.end,current,'PV',current===''?'':current/7,'日平均',seven.state],
    ['直近確定30日',month.start+' ～ '+month.end,actual,'PV','','',thirty.state],
    ['30日換算ペース',pace,'PV','目標までの差',gap,'PV','必要な日平均増分',gap===''?'':gap/30],
    ['ページ別の増減',pages.state,pages.detail,'言語別と種類別、ページ明細は重複するため合算しない'],
    ['検索改善機会',search.state,search.period||'',search.detail,'CTR 2%/4%固定の感度試算。検索クリックをPVに換算せず、順位改善も約束しない'],
    ['区分','対象','言語／種類','検索語','前週PV','今週PV','増減PV','検索表示','検索クリック','CTR','平均順位','追加クリック@2%','追加クリック@4%','状態','補足']
  ];
  if (pages.state==='OK') {
    [['言語別',pages.languages],['種類別',pages.features]].forEach(function(section){
      Object.keys(section[1]).sort(function(a,b){return section[1][b][1]-section[1][a][1];}).forEach(function(key){
        var v=section[1][key];
        grid.push([section[0],key,'','',v[0],v[1],v[1]-v[0],'','','','','','','OBSERVED','同曜日構成の確定7日比較']);
      });
    });
    var ranked=pages.ranked;
    var winners=ranked.filter(function(row){return row.delta>0;}).sort(function(a,b){return b.delta-a.delta;}).slice(0,20);
    var losers=ranked.filter(function(row){return row.delta<0;}).sort(function(a,b){return a.delta-b.delta;}).slice(0,10);
    winners.concat(losers).forEach(function(row){
      grid.push([row.delta>0?'伸長ページ':'減少ページ',row.path,row.labels.language+' / '+row.labels.type,'',
        row.values[0],row.values[1],row.delta,'','','','','','','OBSERVED','変化の観測。改修が原因とは断定しない']);
    });
  }
  (search.candidates||[]).slice(0,100).forEach(function(row){
    var path=row.url.replace(/^https:\/\/playpoint-sim\.com/,'');
    var label=playPointGrowthPageLabels_(path);
    grid.push(['検索改善候補',path,label.language+' / '+label.type,row.query,'','','',row.imp,row.clicks,row.ctr,row.pos,
      row.scenarios[0],row.scenarios[1],row.state,'他の非アンカーURL '+row.otherUrls+'件。検索意図・競合・更新直後の状況を要確認']);
  });
  var state=seven.state==='OBSERVED'&&thirty.state==='OBSERVED'&&pages.state==='OK'&&search.state==='OK'?'OK':'PARTIAL';
  return {state:state,grid:grid,pace:pace,gap:gap,candidates:(search.candidates||[]).length};
}

function capturePlayPointGrowthOpportunityReview() {
  var timestamp=playPointP12NowText_(), today=timestamp.slice(0,10), cfg=PLAYPOINT_GROWTH_A;
  try {
    var ss=resolveAndRememberSpreadsheet_(), end=playPointP12ShiftIsoDate_(today,-3);
    var snapshot=withScriptLock_(function(){
      var daily=ss.getSheetByName(PLAYPOINT_EVENT_DAILY.sheet), history=ss.getSheetByName('📚ページ日次履歴');
      var search=ss.getSheetByName('🔎検索語×ページ');
      if (!daily || daily.getLastRow()<7) throw new Error('GA4イベント日次が未取得');
      var source=daily.getRange(1,1,daily.getLastRow(),8).getValues(), pageRows=[], queryRows=null;
      if (history && history.getLastRow()>1) {
        var last=history.getLastRow(), start=Math.max(2,last-cfg.historyMaxRows+1);
        pageRows=history.getRange(start,1,last-start+1,6).getValues();
      }
      if (search && search.getLastRow()>1 && search.getLastRow()<=cfg.searchMaxRows+1) {
        queryRows=search.getRange(1,1,search.getLastRow(),9).getValues();
      }
      return {daily:source,pages:pageRows,search:queryRows};
    });
    var daily=playPointGrowthDailyMap_(snapshot.daily), pages, search;
    try { pages=playPointGrowthPageChange_(snapshot.pages,daily,end); }
    catch (error) { pages={state:'ERROR',detail:playPointP12ErrorText_(error),rows:[]}; }
    try { search=playPointGrowthSearchCandidates_(snapshot.search||[],today); }
    catch (error) { search={state:'ERROR',detail:playPointP12ErrorText_(error),candidates:[]}; }
    var view=playPointGrowthOpportunityGrid_(daily,end,pages,search,timestamp);
    return withScriptLock_(function(){
      playPointGrowthPublishGrid_(ss,cfg.opportunitySheet,view.grid,8,10);
      var sheet=ss.getSheetByName(cfg.opportunitySheet);
      if(view.grid.length>8) sheet.getRange(9,11,view.grid.length-8,1).setNumberFormat('0.00');
      sheet.getRange(3,5).setNumberFormat('0.0');
      sheet.getRange(5,8).setNumberFormat('0.0');
      playPointP12UpsertHealth_('GROWTH_OPPORTUNITY',{lastAttempt:timestamp,lastSuccess:playPointP12NowText_(),dataLatest:end,
        state:view.state,consecutiveFailures:0,error:'',note:'GA4確定ペース '+view.pace+' / 目標差 '+view.gap+' / 候補 '+view.candidates+'。'+pages.state+' / '+search.state});
      return {state:view.state,rows:view.grid.length,pace:view.pace,gap:view.gap,candidates:view.candidates};
    });
  } catch(error) {
    withScriptLock_(function(){playPointP12HealthError_('GROWTH_OPPORTUNITY',timestamp,playPointP12ErrorText_(error));});
    throw error;
  }
}


// 運営者は詳細シートを毎日巡回しない。既存表・監視状態だけを読み、要確認を先頭にする。
function playPointOperationsDashboardGrid_(timestamp,overview,checks){
  var grid=[
    ['PlayPoint 運営ダッシュボード',timestamp],
    ['30日換算PVペース',overview.pace,'目標',10000,'差',overview.gap],
    ['確定7日PV',overview.seven,'確定30日PV',overview.thirty,'集計窓',overview.period],
    ['データの見方','PVは既存成長分析の実測・換算値。新規取得は行わない。欠測・古い元データは空欄または要確認として扱う。'],
    ['次に確認','エラー・未取得・期限超過・容量警告を上から。詳細シートは必要な時だけ開く。'],
    ['分析','状態','最終完了','データ最新／対象期間','次の確認','詳細シート','リンク']
  ];
  var sorted=checks.slice().sort(function(a,b){return a.priority-b.priority||a.order-b.order;});
  sorted.forEach(function(check){grid.push([check.label,check.state,check.completed,check.latest,check.note,check.sheet,check.url]);});
  return grid;
}
function playPointOperationsHealthDate_(value){
  if(value instanceof Date)return Utilities.formatDate(value,'Asia/Tokyo','yyyy-MM-dd');
  var date=String(value||'').slice(0,10).replace(/\//g,'-');
  return playPointMaintenanceIsoDate_(date)?date:'';
}

function capturePlayPointOperationsDashboard(){
  var timestamp=playPointP12NowText_(),today=timestamp.slice(0,10),ss=resolveAndRememberSpreadsheet_();
  return withScriptLock_(function(){
    var healthSheet=ss.getSheetByName(PLAYPOINT_P12_CONFIG.healthSheet), health=Object.create(null);
    if(healthSheet&&healthSheet.getLastRow()>1)healthSheet.getRange(2,1,healthSheet.getLastRow()-1,8).getValues().forEach(function(row){
      health[String(row[0])]=row;
    });
    var queue=typeof playPointAnalyticsQueueRead_==='function'?playPointAnalyticsQueueRead_():{};
    var specs=[
      ['日次イベント','EVENT_DAILY','📈GA4イベント日次',2],
      ['読者行動','READER_OUTCOMES','🧑読者行動・再訪',3],
      ['記事の役割別成果','ROLE_OUTCOMES','📊記事の役割別成果',3],
      ['公開変更効果','RELEASE_EFFECT','📈公開変更効果',3],
      ['流入品質','TRAFFIC_QUALITY','🚪流入品質・入口診断',9],
      ['月間PVの成長','GROWTH_OPPORTUNITY','🎯月間1万PV成長分析',3],
      ['実利用性能','VITALS_ANALYSIS','⚡実利用性能',3],
      ['機能別利用','FEATURE_USAGE','🧩機能別利用分析',9],
      ['ページ価値','PAGE_VALUE','📊ページ価値ファネル',9],
      ['記事Portfolio','ARTICLE_PORTFOLIO','📚記事Portfolio',9],
      ['URL検査','URL_INSPECTION','🧭URL検査',9]
    ];
    function url(sheet){return sheet?ss.getUrl()+'#gid='+sheet.getSheetId():'';}
    var checks=specs.map(function(spec,index){
      var component=spec[1]==='ARTICLE_PORTFOLIO'?'記事Portfolio（計測＋判断）':PLAYPOINT_P12_CONFIG.healthComponents[spec[1]]||'P1P2 '+spec[1],h=health[component]||[];
      var sheet=ss.getSheetByName(spec[2]), completed=playPointOperationsHealthDate_(h[2]),latest=playPointOperationsHealthDate_(h[3]);
      var state=String(h[4]||'NOT_CAPTURED'),entry=queue[spec[1]]||{},priority=3,note=String(h[6]||h[7]||'');
      var overdue=entry.nextDue&&entry.nextDue<today;
      // Portfolioの実表がP1より古い場合は、健康状態の表記だけに依存せず調査候補にする。
      if(spec[1]==='ARTICLE_PORTFOLIO'){
        var freshness=playPointPortfolioFreshness_(ss,today);
        if(freshness.state==='DUE'||freshness.state==='STALE_SOURCE'||freshness.state==='WAITING_SOURCE'){
          state=freshness.state==='DUE'?'STALE / '+state:freshness.state;
          priority=1;note=freshness.note+' / '+note;
        }
      }
      if(!sheet||!completed){state=state==='ERROR'?'ERROR':'NOT_CAPTURED';priority=1;}
      else if(state==='ERROR'){priority=0;}
      else if(completed<playPointP12ShiftIsoDate_(today,-spec[3])){state='STALE / '+state;priority=1;}
      else if(state!=='OK'){priority=Math.min(priority,2);}
      if(overdue){priority=Math.min(priority,1);note='次回予定 '+entry.nextDue+' を超過。 '+note;}
      return {label:spec[0],state:state,completed:completed,latest:latest,note:note.slice(0,350),
        sheet:spec[2],url:url(sheet),priority:priority,order:index};
    });
    var index=ss.getSheetByName('🗂GSC履歴索引'), capacity=index&&index.getLastRow()>=3?index.getRange(1,1,3,8).getValues():null;
    var capState=capacity&&capacity[0][0]==='GSC_HISTORY_INDEX_V1'?String(capacity[1][6]||'NOT_CAPTURED'):'NOT_CAPTURED';
    checks.push({label:'GSC履歴容量',state:capState,completed:'',latest:'',
      note:capacity?'割当セル '+capacity[1][4]+' / 運用目安 '+capacity[1][5]+' / 余裕週 '+capacity[2][7]+'（概算）':'索引・容量の未取得',
      sheet:'🗂GSC履歴索引',url:url(index),priority:capState==='PLAN_ARCHIVE'?0:capState==='OK'?3:1,order:99});
    var overview={pace:'',gap:'',seven:'',thirty:'',period:''},growth=ss.getSheetByName(PLAYPOINT_GROWTH_A.opportunitySheet);
    if(growth&&growth.getLastRow()>=8){
      var g=growth.getRange(1,1,5,8).getValues(), match=/ ～ (\d{4}-\d{2}-\d{2})$/.exec(String(g[2][1]||''));
      overview.period=String(g[2][1]||'');
      if(g[0][0]==='月間1万PV成長分析'&&match&&match[1]>=playPointP12ShiftIsoDate_(today,-5)&&match[1]<today){
        if(g[2][6]==='OBSERVED'){overview.seven=g[2][2];overview.pace=g[4][1];overview.gap=g[4][4];}
        if(g[3][6]==='OBSERVED')overview.thirty=g[3][2];
      }
    }
    var grid=playPointOperationsDashboardGrid_(timestamp,overview,checks);
    playPointGrowthPublishGrid_(ss,'📋運営ダッシュボード',grid,6,0);
    var sheet=ss.getSheetByName('📋運営ダッシュボード');
    sheet.setColumnWidth(1,220);sheet.setColumnWidth(2,190);sheet.setColumnWidth(3,150);
    sheet.setColumnWidth(4,200);sheet.setColumnWidth(5,500);sheet.setColumnWidth(6,260);sheet.setColumnWidth(7,330);
    sheet.getRange(7,5,checks.length,1).setWrap(true);
    return {state:checks.some(function(c){return c.priority<3;})?'CHECK':'OK',rows:grid.length};
  });
}
