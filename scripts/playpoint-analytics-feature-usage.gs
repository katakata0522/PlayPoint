'use strict';

// B優先: 既存イベントを機能別の利用成果へ。追加タグ・管理設定・入力値収集は行わない。
var PLAYPOINT_FEATURE_USAGE = Object.freeze({
  sheet:'🧩機能別利用分析',
  events:Object.freeze({
    game_form_started:['ゲーム別計算機','入力開始（ページ内初回）'],
    game_calculation_completed:['ゲーム別計算機','計算成功（再計算を含む）'],
    purchase_comparison_opened:['購入先比較','比較を開く（ページ内初回）'],
    purchase_comparison_completed:['購入先比較','比較成功（ページ内初回）'],
    diary_tab_opened:['日記','日記を開く（ページ内初回）'],
    diary_entry_saved:['日記','有効な記録の保存（更新を含む）'],
    calendar_reminder_added:['再訪支援','カレンダーを開く・iCal作成（予定登録の保証なし）'],
    pwa_install_accepted:['再訪支援','インストール案内の承諾（継続利用の保証なし）'],
    share_url_copied:['共有','計算結果URLのコピー成功'],
    share_x_clicked:['共有','X共有操作（投稿の保証なし）'],
    widget_code_copied:['ウィジェット','埋め込みコードのコピー成功（設置の保証なし）'],
    widget_referral_landed:['ウィジェット','埋め込み経由の到着（コピーした人との同一性なし）']
  }),
  gameIds:Object.freeze(['genshin','starrail','zzz','bluearchive','pokepoke','fgo','umamusume','monst','gakumas','proseka','nikke',
    'wutheringwaves','dokkan','pad','arknights','hbr','mementomori','phantomparade','reverse1999','honkai3rd','shadowversewb','prospi-a','pokemon-go','efootball']),
  regions:Object.freeze(['JP','US','KR','TW','HK','IN']),
  modes:Object.freeze(['rank_up','spend_to_points']),
  funnels:Object.freeze([
    {key:'DIARY_FUNNEL',feature:'日記',startEvent:'diary_tab_opened',finishEvent:'diary_entry_saved',startLabel:'日記を開く',finishLabel:'24時間以内に保存'},
    {key:'PURCHASE_FUNNEL',feature:'購入先比較',startEvent:'purchase_comparison_opened',finishEvent:'purchase_comparison_completed',startLabel:'比較を開く',finishLabel:'24時間以内に比較成功'}
  ])
});

function playPointFeatureEventMap_(source) {
  var map=Object.create(null), cfg=PLAYPOINT_FEATURE_USAGE;
  if (!source || source.state!=='OK') return map;
  source.rows.forEach(function(row) {
    if (!Object.prototype.hasOwnProperty.call(cfg.events,row.eventName) || map[row.eventName]) throw new Error('機能イベントの不明・重複行');
    var events=playPointGrowthCount_(row.eventCount,'feature eventCount'), users=playPointGrowthCount_(row.totalUsers,'feature totalUsers');
    if(users>events) throw new Error('機能イベントの利用者数がイベント回数を超過');
    map[row.eventName]={events:events,users:users};
  });
  return map;
}

function playPointFeatureFunnelResult_(source,spec,events) {
  if(!source || source.state!=='OK') return {state:source?source.state:'UNAVAILABLE',start:'',finish:'',rate:''};
  var values=[null,null], invalid=false;
  source.rows.forEach(function(row) {
    var step=String(row.funnelStepName||''), index=-1;
    if(step===spec.startLabel || step==='1. '+spec.startLabel) index=0;
    if(step===spec.finishLabel || step==='2. '+spec.finishLabel) index=1;
    if(index<0 || values[index]!==null || !Number.isSafeInteger(row.activeUsers) || row.activeUsers<0) {invalid=true;return;}
    values[index]=row.activeUsers;
  });
  if(invalid || (values[0]!==null && values[1]!==null && values[1]>values[0])) return {state:'FUNNEL_MISMATCH',start:'',finish:'',rate:''};
  if(values[0]===null || values[0]===0) {
    return {state:events[spec.startEvent] && events[spec.startEvent].users>0?'UNEXPECTED_ZERO':'NO_OBSERVATIONS',start:values[0]===null?'':values[0],finish:'',rate:''};
  }
  if(values[1]===null) return {state:'MISSING_STEP',start:values[0],finish:'',rate:''};
  return {state:values[0]<30?'SMALL_SAMPLE':'OBSERVED',start:values[0],finish:values[1],rate:values[1]/values[0]};
}

// GA4の任意文字列をそのまま分類欄へ書かない。既存の有限分類だけ利用し、未知の値は未分類として表示する。
function playPointFeatureClassify_(type,row) {
  var cfg=PLAYPOINT_FEATURE_USAGE;
  function enumValue(value,allowed) {
    if(playPointReaderParameterMissing_(value)) return '(not set)';
    return allowed.indexOf(value)>=0?value:'UNCLASSIFIED';
  }
  var region=enumValue(row['customEvent:region'],cfg.regions);
  if(type==='GAME') return [enumValue(row['customEvent:game_id'],cfg.gameIds),region,''];
  if(type==='GAME_PAGE') {
    var path=String(row.pagePath||''), match=/^\/(?:(en|ko|tw)\/)?games\/([a-z0-9-]+)\/(?:index\.html)?$/.exec(path);
    return match && cfg.gameIds.indexOf(match[2])>=0?
      [match[2],match[1]||'ja',path]:['UNCLASSIFIED','UNCLASSIFIED',''];
  }
  if(type==='SHARE') return [region,enumValue(row['customEvent:calculation_mode'],cfg.modes),''];
  return [region,'',''];
}

function playPointFeatureUsageGrid_(period,previous,sources,timestamp) {
  var cfg=PLAYPOINT_FEATURE_USAGE, cur=playPointFeatureEventMap_(sources.CURRENT), prev=playPointFeatureEventMap_(sources.PREVIOUS);
  var grid=[
    ['機能別利用分析',timestamp],
    ['対象期間',period.start+' ～ '+period.end],
    ['比較期間',previous.start+' ～ '+previous.end,'隣接した非重複30日間。GA4確定待ちを除外'],
    ['読み方','イベント回数・イベント別のユニーク利用者を別に表示。未観測は空欄。分類行の人数は足さない。前後期間で同じ人を追跡していない。'],
    ['順序付きファネル','日記・購入先比較だけ、同一利用者の24時間以内の順序をGA4で評価。地域別・ゲーム別の成功率や翌週再訪率とは異なる。'],
    ['取得状態',Object.keys(sources).map(function(key){return key+'='+sources[key].state;}).join(' / ')],
    ['区分','機能','イベント／指標','分類1','分類2','分類3','前回数','今回数','回数差','前利用者','今利用者','順序開始人数','順序成功人数','24h順序率','状態','補足']
  ];
  Object.keys(cfg.events).forEach(function(name){
    var a=prev[name],b=cur[name], state=a&&b?'OBSERVED':a||b?'PARTIAL_OBSERVATION':
      sources.CURRENT&&sources.CURRENT.state!=='OK'?sources.CURRENT.state:
      sources.PREVIOUS&&sources.PREVIOUS.state!=='OK'?sources.PREVIOUS.state:'NO_EVENT_ROW';
    grid.push(['30日全体',cfg.events[name][0],name,'','','',a?a.events:'',b?b.events:'',
      a&&b?b.events-a.events:'',a?a.users:'',b?b.users:'','','','',state,cfg.events[name][1]+'。未返却行を利用ゼロと断定しない。']);
  });
  var partial=!sources.CURRENT || sources.CURRENT.state!=='OK'||!sources.PREVIOUS||sources.PREVIOUS.state!=='OK';
  ['GAME','GAME_PAGE','RETENTION','SHARE','WIDGET_ARRIVAL'].forEach(function(type){
    var source=sources[type];
    if(!source) return;
    if(source.state!=='OK') partial=true;
    if(['OK','PARAMETER_PARTIAL'].indexOf(source.state)<0 || !source.rows.length) {
      grid.push(['分類明細',type,'','','','','','','','','','','','',source.state==='OK'?'NO_EVENT_ROW':source.state,source.detail||'取得なし']);
      return;
    }
    var seen=Object.create(null), classified=Object.create(null);
    source.rows.forEach(function(row){
      if(!Object.prototype.hasOwnProperty.call(cfg.events,row.eventName)) throw new Error('機能分類の不明イベント');
      var events=playPointGrowthCount_(row.eventCount,'feature breakdown events'), users=playPointGrowthCount_(row.totalUsers,'feature breakdown users');
      if(users>events) throw new Error('分類利用者数がイベント回数を超過');
      var key=JSON.stringify([row.eventName,row.pagePath,row['customEvent:game_id'],row['customEvent:region'],row['customEvent:calculation_mode']]);
      if(seen[key]) throw new Error('機能分類の重複行');seen[key]=true;
      var labels=playPointFeatureClassify_(type,row);
      var missing=labels.some(function(value){return value==='(not set)'||value==='UNCLASSIFIED';});
      if(missing) partial=true;
      // 不明分類を同じラベルに丸めて人数を加算しない。該当行はカウントだけを集約し、人数は空欄。
      if(missing) {
        var group=classified[row.eventName]||(classified[row.eventName]={events:0,rows:0});
        group.events+=events;group.rows++;return;
      }
      grid.push(['分類明細',cfg.events[row.eventName][0],row.eventName,labels[0],labels[1],labels[2],
        '',events,'','',users,'','','',source.state==='PARAMETER_PARTIAL'?'OBSERVED_PARTIAL':users<30?'SMALL_SAMPLE':'OBSERVED',
        type==='GAME_PAGE'?'標準pagePathによる代替分類。ゲーム・言語のみURLから識別し、購入地域とは扱わない。別URLの人数は足さない。':'当該分類内の人数。全体行と重複するので足さない。']);
    });
    Object.keys(classified).forEach(function(name){
      grid.push(['分類明細',cfg.events[name][0],name,'未分類','','','',classified[name].events,'','','','','','','PARAMETER_PARTIAL',
        '分類不可 '+classified[name].rows+'行。イベント回数のみ集約し、ユニーク利用者は合算しない。']);
    });
  });
  cfg.funnels.forEach(function(spec){
    var result=playPointFeatureFunnelResult_(sources[spec.key],spec,cur);
    if(['OBSERVED','SMALL_SAMPLE','NO_OBSERVATIONS'].indexOf(result.state)<0) partial=true;
    grid.push(['順序付き',spec.feature,spec.startLabel+' → '+spec.finishLabel,'','','','','','','','',result.start,result.finish,result.rate,result.state,
      result.finish===''?'順序成功人数は未取得':'activeUsersの24時間以内の順序評価。地域別・同じ訪問内の成功率とは異なる。']);
  });
  return {state:partial?'PARTIAL':!Object.keys(cur).length&&!Object.keys(prev).length?'NO_OBSERVATIONS':'OK',grid:grid};
}

function capturePlayPointFeatureUsageReview(deadlineMs) {
  var timestamp=playPointP12NowText_(), cfg=PLAYPOINT_FEATURE_USAGE;
  try {
    var period=playPointP12BuildGa4Period_(), property=playPointP12GetGa4PropertyId_(), ss=resolveAndRememberSpreadsheet_();
    var previous={start:playPointP12ShiftIsoDate_(period.start,-30),end:playPointP12ShiftIsoDate_(period.start,-1)};
    var deadline=typeof deadlineMs==='number'&&isFinite(deadlineMs)?deadlineMs:Date.now()+300000;
    var definitions={}, sources={}, names=Object.keys(cfg.events);
    function budget() {return Date.now()<deadline-15000;}
    function skipped(){return {state:'SKIPPED_BUDGET',rows:[],detail:'時間予算不足。未取得は空欄'};}
    function report(window,dimensions,events) {
      if(!budget()) return skipped();
      return playPointReaderSource_(function(){
        return playPointReaderReport_(property,window,dimensions,['eventCount','totalUsers'],playPointReaderFilter_('eventName',events));
      },dimensions.filter(function(name){return name.indexOf('customEvent:')===0;}),definitions);
    }
    // 全体の比較と分類を独立取得。登録済み定義だけを使い、カスタム定義は作成しない。
    sources.CURRENT=report(period,['eventName'],names);
    if(sources.CURRENT.state!=='OK') throw new Error('機能全体の取得失敗: '+sources.CURRENT.detail);
    sources.PREVIOUS=report(previous,['eventName'],names);
    if(budget()) {
      try{
        var metadata=playPointP12GoogleJson_('https://analyticsdata.googleapis.com/v1beta/properties/'+encodeURIComponent(property)+'/metadata',{method:'get'});
        (metadata.dimensions||[]).forEach(function(dim){definitions[dim.apiName]=true;});
      }catch(error){sources.METADATA={state:'ERROR',rows:[],detail:playPointP12ErrorText_(error)};}
    }
    var gameNames=['game_form_started','game_calculation_completed','purchase_comparison_opened','purchase_comparison_completed'];
    sources.GAME=report(period,['eventName','customEvent:game_id','customEvent:region'],gameNames);
    if(sources.GAME.state!=='OK') sources.GAME_PAGE=report(period,['eventName','pagePath'],gameNames);
    sources.RETENTION=report(period,['eventName','customEvent:region'],['diary_tab_opened','diary_entry_saved','calendar_reminder_added','pwa_install_accepted']);
    sources.SHARE=report(period,['eventName','customEvent:region','customEvent:calculation_mode'],['share_url_copied','share_x_clicked']);
    sources.WIDGET_ARRIVAL=report(period,['eventName','customEvent:region'],['widget_referral_landed']);
    cfg.funnels.forEach(function(spec){
      sources[spec.key]=budget()?playPointReaderSource_(function(){return playPointReaderOrderedFunnel_(property,period,spec);},[],definitions):skipped();
    });
    var view=playPointFeatureUsageGrid_(period,previous,sources,timestamp);
    return withScriptLock_(function(){
      playPointGrowthAssertPeriodFresh_(ss,cfg.sheet,period.end);
      playPointGrowthPublishGrid_(ss,cfg.sheet,view.grid,7,14);
      playPointP12UpsertHealth_('FEATURE_USAGE',{lastAttempt:timestamp,lastSuccess:playPointP12NowText_(),dataLatest:period.end,
        state:view.state,consecutiveFailures:0,error:'',note:Object.keys(sources).map(function(key){return key+'='+sources[key].state;}).join(' / ')+'。独立イベント人数は転換率にしない。'});
      return {state:view.state,rows:view.grid.length};
    });
  }catch(error){
    withScriptLock_(function(){playPointP12HealthError_('FEATURE_USAGE',timestamp,playPointP12ErrorText_(error));});
    throw error;
  }
}
