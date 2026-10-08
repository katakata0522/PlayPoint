'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../scripts/playpoint-analytics-maintenance.gs'), 'utf8');
function runtime(overrides = {}) { const c = vm.createContext({ console, ...overrides }); vm.runInContext(source, c); return c; }
const item = {path:'/articles/a.html',locale:'JP',role:'calculator_bridge',listed:true,modified:'2026-10-04'};
function p1(metric = 4) { const rows=Array.from({length:5},()=>[]);rows[1]=['','2026-09-03 ～ 2026-10-02'];rows[1][11]='OK';rows.push([item.path,40,300,40/300,30,20,50,7,5,metric,0.8,1.2,0.06,'OK']);return rows; }
function old() { const rows=Array.from({length:11},()=>[]);rows[0]=['','2026-09-25 08:26 JST'];rows.push(['JP',item.path,'GROWTH','calculator_bridge','view_to_first_calculation_success','measurable_now','OK',1,2,0.5,1,1,1,1,1,'owner memo','→2026-10-03','keep next action']);return rows; }
test('全記事の計測を更新し、手動判断とその元日時を保持する',()=>{const r=runtime().playPointMaintenanceBuildPortfolio_([item,{...item,path:'/articles/new.html'}],old(),p1(),'2026-10-05 14:00 JST');const a=r.grid[11];assert.equal(r.rows,2);assert.equal(a[2],'GROWTH');assert.equal(a[7],40);assert.equal(a[18],'CORE');assert.equal(a[15],'owner memo');assert.equal(a[16],'→2026-10-03');assert.equal(a[17],'keep next action');assert.equal(a[20],'2026-09-25 08:26 JST');assert.equal(r.grid[12][7],'');assert.equal(r.grid[12][6],'NO_MATCH');});
test('自動更新を繰り返しても編集判断日時を現在へ書き換えない',()=>{const c=runtime(),a=c.playPointMaintenanceBuildPortfolio_([item],old(),p1(),'2026-10-05 14:00 JST');const b=c.playPointMaintenanceBuildPortfolio_([item],a.grid,p1(),'2026-10-06 14:00 JST');assert.equal(b.grid[11][20],'2026-09-25 08:26 JST');});
test('古いP1・PARTIALなP1は前回Portfolioの置換前に拒否する',()=>{const c=runtime(),a=p1();a[1][11]='PARTIAL';assert.throws(()=>c.playPointMaintenanceBuildPortfolio_([item],old(),a,'2026-10-05 14:00 JST'),/正常/);assert.throws(()=>c.playPointMaintenanceBuildPortfolio_([item],old(),p1(),'2026-10-20 14:00 JST'),/古すぎ/);});
test('ページ別未取得と正当な0を区別する',()=>{const c=runtime(),a=p1(0);a[5]=[item.path,0,0,0,0,0,0,0,0,0,0,0,0,'OK'];const r=c.playPointMaintenanceBuildPortfolio_([item],old(),a,'2026-10-05 14:00 JST');assert.equal(r.grid[11][7],0);assert.equal(r.grid[11][18],'PROVE');assert.equal(c.playPointMaintenanceRecommendation_(item,{13:'PARTIAL'})[0],'');});
test('retentionとholdを補助PVで昇格しない',()=>{const c=runtime(),m=p1()[5];assert.equal(c.playPointMaintenanceRecommendation_({...item,role:'retention'},m)[0],'RETENTION');assert.equal(c.playPointMaintenanceRecommendation_({...item,listed:false},m)[0],'HOLD');});
test('台帳から消えた既存判断を保持して要確認とする',()=>{const r=runtime().playPointMaintenanceBuildPortfolio_([],old(),p1(),'2026-10-05 14:00 JST');assert.equal(r.rows,1);assert.equal(r.grid[11][2],'GROWTH');assert.equal(r.grid[11][21],'台帳外・要確認');});
test('同一URLのindex別名を計測合算せず拒否する',()=>{const a=p1();a[5][0]='/games/a/';a.push(['/games/a/index.html']);assert.throws(()=>runtime().playPointMaintenanceBuildPortfolio_([item],old(),a,'2026-10-05 14:00 JST'),/重複/);});
function indexes() {return Object.fromEntries(['ja','en','ko','tw'].map(l=>[l,{locale:l,articles:[{path:l==='ja'?item.path:'/'+l+'/articles/a.html',role:'calculator_bridge'}]}]));}
test('公開フィードの最新commitを固定し、不正なrevisionは拒否する',()=>{const c=runtime(),sha='a'.repeat(40);assert.equal(c.playPointMaintenanceCommitFromFeed_('<id>tag:github.com,2008:Grit::Commit/'+sha+'</id>'),sha);assert.throws(()=>c.playPointMaintenanceCommitFromFeed_('<html>login</html>'),/revision/);});
test('日本語非掲載をHOLDとして含め、4言語の現行台帳を生成する',()=>{const r=runtime().playPointMaintenanceInventory_([{file:'../articles/a.html',listed:true},{file:'../articles/hold.html',listed:false}],indexes());assert.equal(r.length,5);assert.equal(r.find(x=>x.path.includes('hold')).role,'hold');});
test('公開台帳と検索索引の欠落・未知role・重複を拒否する',()=>{const c=runtime(),a=indexes();a.en.articles=[];assert.throws(()=>c.playPointMaintenanceInventory_([{file:'../articles/a.html'}],a),/不完全/);const b=indexes();b.ko.articles[0].role='unknown';assert.throws(()=>c.playPointMaintenanceInventory_([{file:'../articles/a.html'}],b),/役割/);assert.throws(()=>c.playPointMaintenanceInventory_([{file:'../articles/missing.html'}],indexes()),/ありません/);});
test('Portfolioの取得失敗を独立した監視状態へ記録する',()=>{let failed='';const c=runtime({withScriptLock_:fn=>fn(),recordHealthAttempt_:()=>{},recordHealthFailure_:(component,error)=>{failed=component+':'+error.message;},resolveAndRememberSpreadsheet_:()=>({}),updateHealthSheet_:()=>{}});c.playPointRefreshPortfolioUnlocked_=()=>{throw Error('source failed');};assert.throws(()=>c.refreshPlayPointArticlePortfolio(),/source failed/);assert.equal(failed,'ARTICLE_PORTFOLIO:source failed');});
function auditRuntime(fail = false) {
  const props = new Map(); let stored = [['日付']], writes=0;
  const coverage = {getLastRow:()=>stored.length,getDataRange:()=>({getValues:()=>stored.map(row=>row.slice())}),getRange:()=>({setNumberFormat:()=>{}})};
  const c=runtime({SpreadsheetApp:{flush:()=>{}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>{props.set(k,v);},deleteProperty:k=>props.delete(k)})},resolveAndRememberSpreadsheet_:()=>({getSheetByName:()=>coverage}),formatDateSafe_:v=>v instanceof Date?v.toISOString().slice(0,10):String(v||''),relativeDateString_:n=>new Date(Date.UTC(2026,9,5+n)).toISOString().slice(0,10),shiftDateString_:(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10),dateArrayInRange_:(a,b)=>{const r=[];for(let x=a;x<=b;x=new Date(Date.parse(x+'T00:00:00Z')+86400000).toISOString().slice(0,10))r.push(x);return r;},recordHealthAttempt_:()=>{},recordHealthSuccess_:()=>{},recordHealthFailure_:()=>{},updateHealthSheet_:()=>{},fetchGa4PageDailyRows_:()=>[],upsertPageDailyHistory_:()=>{writes++;if(fail)throw Error('write failed');},getOrCreateSheet_:()=>coverage,setColumnWidths_:()=>{},replaceSheet_:(_s,h,rows)=>{c.coverageRows=rows;stored=[h,...rows.map(row=>[new Date(row[0]+'T00:00:00Z'),...row.slice(1)])];},invalidateArchivedMonthsForRange_:()=>{},currentTimestamp_:()=> '2026-10-05 14:00:00',COLORS:{BLUE:'#123'},DATA_STATE:{RECONCILED:'RECONCILED'},SCRIPT_KEYS:{PAGE_HISTORY_BACKFILL_NEXT_END_DATE:'oldCursor',PAGE_HISTORY_BACKFILL_COMPLETED_AT:'oldComplete'}});
  return {c,props,writes:()=>writes,setCoverage:rows=>{stored=rows;}};
}
test('空のAPI応答も取得範囲として記録するがPV=0と断定しない',()=>{const {c,props}=auditRuntime();const r=c.playPointPageHistoryAuditChunk_();assert.equal(r.coveredDays,14);assert.equal(c.coverageRows.length,14);assert.equal(c.coverageRows[0][2],'API_NO_ROWS');assert.equal(JSON.parse(props.get(c.PLAYPOINT_MAINTENANCE.checkpoint)).nextEnd,'2026-09-20');});
test('書込失敗時は履歴カーソルを進めない',()=>{const {c,props}=auditRuntime(true);assert.throws(()=>c.playPointPageHistoryAuditChunk_(),/write failed/);assert.equal(JSON.parse(props.get(c.PLAYPOINT_MAINTENANCE.checkpoint)).nextEnd,'2026-10-04');assert.equal(props.has('oldComplete'),false);});
test('365日分を27チャンクで覆い、完了後の重複API取得をしない',()=>{const {c,props,writes}=auditRuntime();let r;for(let i=0;i<27;i++)r=c.playPointPageHistoryAuditChunk_();assert.equal(r.coveredDays,365);assert.equal(r.complete,true);assert.equal(props.get('oldCursor'),'2025-10-04');assert.equal(writes(),27);assert.equal(c.coverageRows.length,365);c.playPointPageHistoryAuditChunk_();assert.equal(writes(),27);});
test('月別アーカイブを既存の上限で追随し、正規のログ取得を使う',()=>{
 let calls=0;const ss={getSheetByName:name=>{assert.equal(typeof name,'string');return {};}},log={};
 const c=runtime({withScriptLock_:fn=>fn(),resolveAndRememberSpreadsheet_:()=>ss,
  CONFIG:{SHEETS:{LOGS:'実行ログ'},ARCHIVE_MAX_MONTHS_PER_RUN:2},
  getOrCreateLogSheet_:book=>{assert.equal(book,ss);return log;},
  recordHealthAttempt_:()=>{},recordHealthSuccess_:()=>{},updateHealthSheet_:()=>{},relativeDateString_:()=> '2026-10-04',
  DATA_STATE:{RECONCILED:'RECONCILED'},maybeArchiveCompletedMonths_:(_ss,receivedLog)=>{
   assert.equal(receivedLog,log);calls++;return calls===1?['a','b']:['c'];
  }});
 assert.equal(c.syncPlayPointPageHistoryArchives().count,3);assert.equal(calls,2);
});
test('既存週次P1からPortfolioを更新し、失敗も実行エラーとして伝える',()=>{
  const c=runtime();vm.runInContext(fs.readFileSync(path.join(__dirname,'../scripts/playpoint-analytics-p1p2.gs'),'utf8'),c);
  c.playPointP12GetSpreadsheet_=()=>({});c.playPointP12RunStage_=stage=>({stage,status:'OK'});c.playPointP12Log_=()=>{};
  c.capturePlayPointReaderOutcomes=()=>({state:'OK'});
  c.capturePlayPointEventDailyReview=()=>({state:'OK'});
  let calls=0;c.refreshPlayPointArticlePortfolio=()=>{calls++;return {rows:241};};assert.equal(c.capturePlayPointAnalyticsP1P2().at(-1).stage,'PORTFOLIO');assert.equal(calls,1);
  c.refreshPlayPointArticlePortfolio=()=>{throw Error('inventory unavailable');};assert.throws(()=>c.capturePlayPointAnalyticsP1P2(),/PORTFOLIO=.*inventory unavailable/);
  c.refreshPlayPointArticlePortfolio=()=>({rows:241});c.capturePlayPointReaderOutcomes=()=>{throw Error('reader source unavailable');};
  assert.throws(()=>c.capturePlayPointAnalyticsP1P2(),/READER_OUTCOMES=.*reader source unavailable/);
});

test('完了カーソルでも実確認表が欠けた場合は再検証する',()=>{const {c,props}=auditRuntime();props.set(c.PLAYPOINT_MAINTENANCE.checkpoint,JSON.stringify({start:'2025-10-05',end:'2026-10-04',nextEnd:'2025-10-04',coveredDays:365}));const r=c.playPointPageHistoryAuditChunk_();assert.equal(r.complete,false);assert.equal(r.coveredDays,14);});

test('検索索引にだけ残る日本語記事と継承プロパティのroleを拒否する', () => {
  const c = runtime(), a = indexes();
  a.ja.articles.push({path:'/articles/orphan.html',role:'reference'});
  assert.throws(() => c.playPointMaintenanceInventory_([{file:'../articles/a.html'}],a), /一致/);
  const b = indexes(); b.en.articles[0].role = 'constructor';
  assert.throws(() => c.playPointMaintenanceInventory_([{file:'../articles/a.html'}],b), /役割/);
});

test('未来・逆転・存在しない日付・30日以外のP1窓を拒否する', () => {
  const c = runtime();
  for (const period of ['2026-09-03 ～ 2026-10-20','2026-10-02 ～ 2026-09-03','2026-02-31 ～ 2026-03-29','2026-09-04 ～ 2026-10-02']) {
    const data = p1(); data[1][1] = period;
    assert.throws(() => c.playPointMaintenanceBuildPortfolio_([item],old(),data,'2026-10-05 14:00 JST'), /対象期間/);
  }
});

test('未計測の新規・未レビュー行はUNASSESSEDとし、旧編集判断を保持する', () => {
  const c = runtime(), absent = {...item,path:'/articles/absent.html'};
  const first = c.playPointMaintenanceBuildPortfolio_([item,absent],old(),p1(),'2026-10-05 14:00 JST');
  assert.equal(first.grid[12][2], 'UNASSESSED');
  first.grid[12][2] = 'PROVE';
  const second = c.playPointMaintenanceBuildPortfolio_([item,absent],first.grid,p1(),'2026-10-05 15:00 JST');
  assert.equal(second.grid[12][2], 'UNASSESSED');
  assert.equal(second.grid[11][2], 'GROWTH');
  assert.match(second.grid[4][2], /記録あり 1件/);
  assert.match(second.grid[9][1], /NO_MATCH 1/);
});

test('壊れた履歴カーソルはAPI取得前に監視へ失敗を残す', () => {
  for (const raw of ['{broken', JSON.stringify({start:'2025-10-05',end:'2026-10-04',nextEnd:'2026-02-31',coveredDays:14}), JSON.stringify({start:'2025-10-05',end:'2026-10-04',nextEnd:'2026-10-04',coveredDays:'0'})]) {
    const {c,props,writes} = auditRuntime(); let failures = 0;
    props.set(c.PLAYPOINT_MAINTENANCE.checkpoint,raw); c.recordHealthFailure_ = () => failures++;
    assert.throws(() => c.playPointPageHistoryAuditChunk_());
    assert.equal(failures,1); assert.equal(writes(),0);
  }
});

test('日付があっても失敗応答・空の行数・対象外期間を取得済みと数えない', () => {
  const c = runtime(), row = ['2026-10-04',0,'API_NO_ROWS','2026-09-21 ～ 2026-10-04','2026-10-05 14:00:00'];
  assert.equal(Object.keys(c.playPointCoverageMap_([[],row])).length,1);
  for (const invalid of [[...row.slice(0,2),'ERROR',...row.slice(3)], [row[0],'',...row.slice(2)], [row[0],0,'API_NO_ROWS','2026-09-01 ～ 2026-09-14',row[4]]]) {
    assert.equal(Object.keys(c.playPointCoverageMap_([[],invalid])).length,0);
  }
});

test('中断中の取得範囲が欠けても続きへ進めず同じ窓を再検証する', () => {
  const {c,props,setCoverage} = auditRuntime(); c.playPointPageHistoryAuditChunk_();
  setCoverage([['日付']]);
  const next = c.playPointPageHistoryAuditChunk_();
  assert.equal(next.coveredDays,14);
  assert.equal(JSON.parse(props.get(c.PLAYPOINT_MAINTENANCE.checkpoint)).nextEnd,'2026-09-20');
});

test('保存のflush失敗時も再開カーソルを進めない', () => {
  const {c,props} = auditRuntime(); c.SpreadsheetApp.flush = () => {throw Error('flush failed');};
  assert.throws(() => c.playPointPageHistoryAuditChunk_(), /flush failed/);
  assert.equal(JSON.parse(props.get(c.PLAYPOINT_MAINTENANCE.checkpoint)).coveredDays,0);
  assert.equal(props.has('oldComplete'),false);
});
