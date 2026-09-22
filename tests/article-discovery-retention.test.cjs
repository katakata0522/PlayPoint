'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const search = require('../js/article-search.js');
const { KEY, makeStore, safePath } = require('../js/reading-library.js');
const { extractSections, text } = require('../scripts/article-discovery-sync.cjs');
const outcomes = require('../scripts/article-outcome-report.cjs');
const root = path.resolve(__dirname, '..');
test('自然な未反映の質問では一般的な確認手順を先頭にし、個別条件は維持する', () => {
  const articles = JSON.parse(fs.readFileSync(path.join(root, 'blog/article-search-index.json'), 'utf8')).articles;
  for (const query of ['ポイントがつかない', 'ポイントが付かない', '反映されない', '反映']) {
    const hits = articles.filter(a => search.matches(a, query, 'ja')).sort((a,b) => search.score(b,query,'ja') - search.score(a,query,'ja'));
    assert.match(hits[0]?.path || '', /reflection-timing/, query);
    assert.ok(!/この記事の著者|スポンサーリンク/.test(search.excerpt(hits[0],query,'ja').text));
  }
  const query = 'インストール 付かない';
  const hits = articles.filter(a => search.matches(a,query,'ja')).sort((a,b) => search.score(b,query,'ja')-search.score(a,query,'ja'));
  assert.match(hits[0]?.path || '', /install-offer/);
  const pixel = articles.find(a => /pixel-discount/.test(a.path));
  assert.equal(search.excerpt(pixel,'Pixel','ja').heading, '');
});

test('関連記事と著者情報を検索の回答候補にしない', () => {
  const html = '<article><header><h1>タイトル</h1></header><h2 id="answer">答え</h2><p>役立つ説明</p><h2 id="related">状況に合わせて次に読む記事</h2><p>他の情報</p><div class="author-profile-box"><p>この記事の著者</p></div></article>';
  assert.deepEqual(extractSections(html), [{id:'answer',heading:'答え',text:'役立つ説明'}]);
});
function publishedPaths(locale) {
  if (locale === 'ja') return JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8'))
    .filter(article => article.listed !== false).map(article => '/' + article.file.slice(3));
  return fs.readdirSync(path.join(root, locale, 'articles'))
    .filter(file => file.endsWith('.html') && file !== 'index.html')
    .map(file => '/' + locale + '/articles/' + file);
}
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
    assert.deepEqual(index.articles.map(article => article.path).sort(), publishedPaths(locale).sort());
    assert.equal(new Set(index.articles.map(article => article.path)).size, index.articles.length);
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
 const beforePause = store.read().recent; store.history(false); store.visit({path:"/articles/not-recorded.html",title:"Not recorded"});
 assert.deepEqual(store.read().recent,beforePause); store.clear("recent"); assert.equal(store.read().recent.length,0);
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
 const template=outcomes.createTemplate(root);
 assert.deepEqual(template.rows.map(row => row.path).sort(), ['ja','en','ko','tw'].flatMap(publishedPaths).sort());
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

test('本文抽出は空白付き終了タグと除去境界を安全なテキストとして扱う', () => {
 assert.equal(text('<p>Before</p><script>hidden()</script ><style>hidden{}</style ><p>After</p>'),'Before After');
 assert.equal(text('<scr<script>hidden()</script>ipt>'),'');
 const section=extractSections('<article><h2 id="one">One</h2><p>Useful</p><!-- reading-tools:start --><div>Saved controls</div><!-- reading-tools:end --></article>');
 assert.equal(section[0].text,'Useful');
});


test('ゲーム記事の正規URLとindex.htmlを保存・履歴で重複させない', () => {
  const storage = memoryStorage();
  const store = makeStore(storage);
  const canonical = { path: '/games/fgo/pity-cost/', title: 'FGO' };
  const alias = { ...canonical, path: canonical.path + 'index.html' };
  store.toggle(alias); store.visit(alias); store.visit(canonical);
  assert.deepEqual(store.read().saved, [canonical]);
  assert.deepEqual(store.read().recent, [canonical]);
  store.toggle(canonical); assert.equal(store.read().saved.length, 0);
  store.toggle(canonical); store.remove('saved', alias.path);
  assert.equal(store.read().saved.length, 0);
  storage.setItem(KEY, JSON.stringify({ saved: [alias, canonical], recent: [canonical, alias] }));
  assert.deepEqual(store.read().saved, [canonical]);
  assert.deepEqual(store.read().recent, [canonical]);
  for (const candidate of ['/games/', '/games/fgo/', '/games/fgo/../', '/games/fgo/%2e%2e/', '/games/fgo/pity-cost/?x=1', '//evil.example/games/fgo/pity-cost/', 'javascript:alert(1)', '/games/fgo/pity-cost/extra.html']) {
    assert.equal(safePath(candidate), false, candidate);
    assert.throws(() => store.toggle({ path: candidate, title: '不正' }), /Invalid article/);
  }
});

test('compact metadata keeps typed source dates and author links without fabricating freshness', () => {
  const {compactReadingMetadata}=require('../scripts/article-discovery-sync.cjs');
  const original='<h1>Title unchanged</h1><p class="hero-meta">公開 <time data-article-date="published" datetime="2025-12-25">2025/12/25</time> ・ 更新 <time data-article-date="modified" datetime="2026-09-08">2026/09/08</time> ・ 公式確認 <time data-article-date="official-verified" datetime="2026-08-01">2026/08/01</time> ・ <a href="/author/katakata.html">著者</a></p>';
  const next=compactReadingMetadata(original,'ja');
  assert.ok(next.includes('<summary>更新 2026-09-08'));
  assert.ok(next.includes(original.slice(original.indexOf('<p'))));
  assert.equal((next.match(/data-article-date=/g)||[]).length,3);
  assert.equal(compactReadingMetadata(next,'ja'),next);
});


test('static reading fallback is readable without scripts and preserves page language and content', () => {
  const {applyDiscoveryAssets}=require('../scripts/article-discovery-sync.cjs');
  const assets='\n<!-- discovery-assets:start -->\n<link rel="stylesheet" href="/articles/reading-theme.css">\n<!-- discovery-assets:end -->\n';
  for(const lang of ['ja','en','ko','zh-TW']) {
    const original=`<!doctype html><html lang="${lang}"><head><title>Original title</title></head><body><h1>Original content</h1></body></html>`;
    const next=applyDiscoveryAssets(original,assets);
    assert.match(next, /<html[^>]*data-reading-theme="light"/);
    assert.ok(next.includes(`lang="${lang}"`));
    assert.ok(next.endsWith('<body><h1>Original content</h1></body></html>'));
    assert.equal(applyDiscoveryAssets(next,assets),next);
    assert.equal(applyDiscoveryAssets(next.replace('data-reading-theme="light"', 'data-reading-theme="dark"'),assets),next);
  }
  for(const locale of ['ja','en','ko','tw']) {
    for(const articlePath of publishedPaths(locale)) {
      assert.match(fs.readFileSync(path.join(root,articlePath.slice(1)),'utf8'), /<html[^>]*data-reading-theme="light"/, articlePath);
    }
  }
});
