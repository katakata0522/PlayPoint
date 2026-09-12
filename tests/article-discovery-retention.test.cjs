'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const search = require('../js/article-search.js');
const { KEY, makeStore, safePath } = require('../js/reading-library.js');
const { extractSections } = require('../scripts/article-discovery-sync.cjs');
const outcomes = require('../scripts/article-outcome-report.cjs');
const root = path.resolve(__dirname, '..');
test('four-language synonym search finds body-only information and links to its section', () => {
  for (const [locale, query, text] of [
    ['ja', 'プレイポイント 失効', 'Play Pointsの有効期限を確認する'],
    ['en', 'playpoints expiry', 'Google Play Points expiration depends on activity'],
    ['ko', '플레이포인트 유효 기간', 'Google Play Points 만료 날짜 확인'],
    ['tw', 'play點數 過期', 'Google Play Points 有效期限']
  ]) {
    const article = {title:'Guide',sections:[{id:'details',heading:'Details',text}]};
    assert.equal(search.matches(article,query,locale),true,locale);
    assert.equal(search.excerpt(article,query,locale).id,'details');
    assert.equal(search.matches(article,query+' zzznothing',locale),false);
    assert.equal(search.suggest([article],query+' zzznothing',locale).length,1);
  }
  assert.equal(search.matches({title:'Play Points'},'ＰＬＡＹＰＯＩＮＴＳ','en'),true);
});
test('all indexed section anchors exist, are unique and contain body text', () => {
  for(const locale of ['ja','en','ko','tw']) {
    const relative = locale==='ja'?'blog/article-search-index.json':locale+'/articles/article-search-index.json';
    const index = JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
    assert.equal(index.articles.length,locale==='ja'?57:34);
    for(const article of index.articles) {
      const html=fs.readFileSync(path.join(root,article.path.slice(1)),'utf8');
      assert.ok(article.sections.length>0,article.path);
      for(const section of article.sections) {
        assert.ok(section.text,article.path);
        const escaped=section.id.replace(/[.*+?^{}$()|[\]\\]/g,'\\$&');
        assert.equal((html.match(new RegExp('id=["\\x27]'+escaped+'["\\x27]','g'))||[]).length,1,article.path+' #'+section.id);
      }
    }
  }
});
test('index excludes navigation, script and generated diary controls', () => {
 const html='<article><h2 id="one">One</h2><p>Useful</p><nav>Navigation</nav><aside>Saved data</aside><script>privateCode()</script></article>';
 assert.equal(extractSections(html)[0].text,'Useful');
});
function memoryStorage() {const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}}
test('reading list persists, deduplicates and removes only its own data', () => {
 const storage=memoryStorage();storage.setItem('playpointDiaryData','existing diary');
 const store=makeStore(storage),a={path:'/en/articles/google-play-quests.html',title:'Quest'};
 store.toggle(a);store.visit(a);store.visit(a);
 assert.equal(makeStore(storage).read().saved.length,1);
 assert.equal(store.read().recent.length,1);
 store.history(false);store.visit(a);assert.equal(store.read().recent.length,0);
 store.toggle(a);assert.equal(store.read().saved.length,0);
 store.toggle(a);store.clear('saved');assert.equal(storage.getItem('playpointDiaryData'),'existing diary');
 assert.equal(safePath('//evil.example/a.html'),false);
 assert.equal(safePath('/articles/../account.html'),false);
 storage.setItem(KEY,JSON.stringify({saved:[{path:'javascript:alert(1)',title:'X'},a,a]}));
 assert.deepEqual(store.read().saved,[a]);
});
test('reading storage errors do not report successful writes', () => {
 const store=makeStore({getItem:()=>null,setItem:()=>{throw Error('quota')}});
 assert.throws(()=>store.toggle({path:'/articles/a.html',title:'A'}),/quota/);
});
test('reading list caps storage and keeps latest visit first', () => {
 const store=makeStore(memoryStorage());
 for(let i=0;i<105;i++){const item={path:'/articles/article-'+i+'.html',title:'A'+i};if(i<100)store.toggle(item);else assert.throws(()=>store.toggle(item),/Saved list full/);store.visit(item)}
 assert.equal(store.read().saved.length,100);assert.equal(store.read().recent.length,20);
 assert.equal(store.read().recent[0].title,'A104');
});
test('current diary week follows Friday and crosses month and year correctly', () => {
 const source=fs.readFileSync(path.join(root,'js/diary.js'),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/^export\s+/gm,'');
 const context={};vm.createContext(context);vm.runInContext(source+'\nglobalThis.pure=DIARY_PURE;',context);
 for(const [date,expected] of [['2026-09-12T12:00:00',[2026,9,2]],['2026-10-01T12:00:00',[2026,9,4]],['2027-01-01T12:00:00',[2027,1,1]],['2026-01-01T12:00:00',[2025,12,4]]]) {
   const result=context.pure.currentWeek(new Date(date));
   assert.deepEqual([result.year,result.month,result.week],expected,date);
 }
});
test('role reporting uses each article purpose and refuses misleading totals', () => {
 const template=outcomes.createTemplate(root);assert.equal(template.rows.length,159);
 const period={start:'2026-09-01',end:'2026-09-07'};
 const rows=[
  {path:'/en/articles/google-play-points-weekly-reward.html',articleUsers:100,returningUsers:12,calculationUsers:99},
  {path:'/en/articles/google-play-points-coupon-not-applied.html',articleUsers:20,resolutionActionUsers:5},
  {path:'/en/articles/google-play-points-100-value.html',articleUsers:10,calculationUsers:0}
 ];
 const report=outcomes.evaluate({period,rows},root);
 assert.equal(report.find(r=>r.path===rows[0].path).rate,0.12);
 assert.equal(report.find(r=>r.path===rows[1].path).status,'small_sample');
 assert.equal(report.find(r=>r.path===rows[2].path).rate,0);
 assert.equal(report.find(r=>r.path==='/en/articles/google-play-quests.html').rate,null);
 assert.throws(()=>outcomes.evaluate({period,rows:[{...rows[0],returningUsers:101}]},root),/exceed/);
 assert.throws(()=>outcomes.evaluate({period,rows:[rows[0],rows[0]]},root),/duplicate/);
 assert.throws(()=>outcomes.evaluate({period:{start:'2026-02-30',end:'2026-03-02'},rows:[]},root),/valid/);
});

test('brand spacing variants match without requiring leftover Google tokens', () => {
 const article={title:'Google Play Points'};
 for(const [locale,variants] of [
   ['ja',['GooglePlayPoints','Google Playpoints','GooglePlay Points','Play ポイント','グーグルプレイポイント']],
   ['en',['googleplaypoints','google playpoints']],
   ['ko',['구글 플레이 포인트','구글 플레이포인트']],
   ['tw',['Google Play點數','GooglePlay點數']]
 ])for(const q of variants)assert.equal(search.matches(article,q,locale),true,locale+': '+q);
});
