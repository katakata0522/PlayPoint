'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const {
  INTL_POPULAR_GUIDES,
  POPULAR_GUIDES_SNAPSHOT,
  getPopularGuides
} = require('../scripts/intl-popular-guides.cjs');
const { INTERNATIONAL_LOCALES } = require('../scripts/locale-ids.cjs');

const locales = INTERNATIONAL_LOCALES;

test('popular guide SSOT uses a dated recent-readership snapshot', () => {
  assert.match(POPULAR_GUIDES_SNAPSHOT, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Number.isFinite(Date.parse(`${POPULAR_GUIDES_SNAPSHOT}T00:00:00Z`)), 'snapshot date must be parseable');
  for (const locale of locales) {
    const entries = INTL_POPULAR_GUIDES[locale];
    assert.ok(entries.length > 0, locale + ': popular guide list must not be empty');
    assert.equal(new Set(entries.map(([href]) => href)).size, entries.length, locale + ': popular guides must be unique');
    for (const [href, label] of entries) {
      const prefix = `/${locale}/articles/`;
      assert.ok(href.startsWith(prefix), locale + ': popular guide must stay in locale');
      assert.ok(label.trim().length > 0, locale + ': popular label required');
      assert.ok(fs.existsSync(path.join(root, href.slice(1))), locale + ': popular target must exist: ' + href);
    }
  }
});

test('popular guide helper preserves ranking while marking the current page', () => {
  const currentHref = INTL_POPULAR_GUIDES.en[0][0];
  const items = getPopularGuides('en', currentHref, INTL_POPULAR_GUIDES.en.length);
  assert.deepEqual(items.map(item => item.rank), items.map((_, index) => index + 1));
  assert.equal(items[0].isCurrent, true);
  assert.equal(items.filter(item => item.isCurrent).length, 1);
});

test('rendered popular sidebars match the helper output and never self-link the current page', () => {
  for (const locale of locales) {
    const currentHref = INTL_POPULAR_GUIDES[locale][0][0];
    const expected = getPopularGuides(locale, currentHref);
    const html = fs.readFileSync(path.join(root, currentHref.slice(1)), 'utf8');
    const block = html.match(/<section class="sidebar-widget sidebar-widget--popular"[\s\S]*?<\/section>/i)?.[0] || '';
    assert.ok(block, locale + ': popular widget missing');
    assert.equal((block.match(/sidebar-popular-item/g) || []).length, expected.length, locale + ': rendered ranking count');
    assert.match(block, /sidebar-popular-item is-current/, locale + ': current popular guide must be marked');
    assert.doesNotMatch(block, new RegExp(`<a[^>]*href="${currentHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), locale + ': current popular guide must not self-link');
  }
});

test('人気記事の文字参照を一度だけ復元しHTML出力をエスケープする', () => {
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),vm=require('node:vm');
const source=path.resolve(__dirname, '..');
const {prepareSnapshots}=require(path.join(source,'scripts/update-popular-guides.cjs'));
const locales=['en','ko','tw'];
const cases=[
 ['ordinary','Ordinary 日本語','Ordinary 日本語'],
 ['amp','A &amp; B','A & B'],
 ['quot','&quot;hello&quot;','"hello"'],
 ['apostrophe','a&#39;b',"a'b"],
 ['literal-quot','&amp;quot;','&quot;'],
 ['literal-apostrophe','&amp;#39;','&#39;'],
 ['literal-numeric','&amp;#26085;','&#26085;'],
 ['literal-hex','&amp;#x65e5;','&#x65e5;'],
 ['double-amp','&amp;amp;','&amp;'],
 ['brackets','&lt;word&gt;','<word>'],
 ['decimal','&#26085;&#26412;','日本'],
 ['hex','&#x65E5;&#X672C;','日本'],
 ['emoji','&#128512;','😀'],
 ['apos', '&apos;title&apos;',"'title'"],
 ['markup','<em>Hello</em> &amp; <b>世界</b>','Hello & 世界'],
 ['escaped-markup','&lt;img src=x onerror=alert(1)&gt;','<img src=x onerror=alert(1)>'],
 ['mixed','A &amp;quot; &quot; &#x1f600; &lt;b&gt;','A &quot; " 😀 <b>'],
 ['unknown','&unknown; &AMP; &nbsp;','&unknown; &AMP; &nbsp;'],
 ['invalid','&#0; &#55296; &#1114112; &#xZZ;','&#0; &#55296; &#1114112; &#xZZ;'],
 ['incomplete','&amp &#65 &quot','&amp &#65 &quot'],
 ['trim','   hello   ','hello'],
 ['decimal-double','&#38;quot;','&quot;'],
 ['hex-double','&#x26;#39;','&#39;'],
 ['less-numeric','&#60;script&#62;','<script>']
];
let pass=0,fail=0;const results=[];
function check(name,fn){try{fn();pass++;results.push({name,ok:true});}catch(e){fail++;results.push({name,ok:false,error:e.message});}}
const sinkText=fs.readFileSync(path.join(source,'scripts/intl-navigation-sidebar-v1.cjs'),'utf8');
const escapeSource=sinkText.match(/function escapeHtml\(value\) \{[\s\S]*?\n\}/)[0];
const escapeHtml=vm.runInNewContext('('+escapeSource+')');
function makeFixture(html){const root=fs.mkdtempSync(path.join(os.tmpdir(),'pp-title-'));fs.mkdirSync(path.join(root,'scripts'));fs.mkdirSync(path.join(root,'blog'));const rows=[];
const registry=Array.from({length:5},(_,i)=>({file:'../articles/a'+i+'.html',title:'日本語'+i}));fs.writeFileSync(path.join(root,'blog/articles.json'),JSON.stringify(registry));
const prev={snapshot:'2026-09-01',start:'2026-08-01',end:'2026-08-30',guides:[]};fs.writeFileSync(path.join(root,'scripts/japanese-popular-guides.snapshot.json'),JSON.stringify(prev));fs.writeFileSync(path.join(root,'scripts/intl-popular-guides.snapshot.json'),JSON.stringify({...prev,guides:{en:[],ko:[],tw:[]}}));
for(let i=0;i<5;i++)rows.push({path:'/articles/a'+i+'.html',pv:10-i});
for(const l of locales){fs.mkdirSync(path.join(root,l,'articles'),{recursive:true});for(let i=0;i<5;i++){fs.writeFileSync(path.join(root,l,'articles/a'+i+'.html'),i===0?html:'<h1>Title '+i+'</h1>');rows.push({path:'/'+l+'/articles/a'+i+'.html',pv:10-i});}}
return {root,input:{source:'PlayPoint Analytics / 📄ページ別分析',status:'COMPLETE',complete:true,start:'2026-09-20',end:'2026-10-19',fetchedAt:'2026-10-20',rows}};}
for(const [label,input,expected] of cases){const f=makeFixture('<h1>'+input+'</h1>');try{const changes=prepareSnapshots(f.input,f.root,'2026-10-20'),next=changes.find(x=>x[0].includes('intl-'))[1];for(const l of locales){check(label+'/'+l,()=>assert.equal(next.guides[l][0][1],expected));check('escape/'+label+'/'+l,()=>{const text=escapeHtml(next.guides[l][0][1]);assert(!/[<>"']/.test(text));assert(!/&(?!(amp|lt|gt|quot|#39);)/.test(text));});}check('metadata/'+label,()=>{assert.equal(next.start,f.input.start);assert.equal(next.end,f.input.end);assert.equal(next.snapshot,'2026-10-20');assert.deepEqual(Object.keys(next),['snapshot','start','end','guides']);for(const l of locales){assert.equal(next.guides[l].length,5);assert.equal(next.guides[l][0][0],'/'+l+'/articles/a0.html');assert.equal(next.guides[l][1][1],'Title 1');}});}finally{fs.rmSync(f.root,{recursive:true});}}
for(const [name,html] of [['missing','<p>No heading</p>'],['empty','<h1> </h1>']]){const f=makeFixture(html);try{check('reject-'+name,()=>assert.throws(()=>prepareSnapshots(f.input,f.root,'2026-10-20'),/記事タイトルがありません/));}finally{fs.rmSync(f.root,{recursive:true});}}
for(const heading of ['<script', '<<script>script>', '<img src=x', 'Title > broken']) {
  const fixture = makeFixture('<h1>' + heading + '</h1>');
  try {
    check('reject-malformed-' + heading, () => assert.throws(
      () => prepareSnapshots(fixture.input, fixture.root, '2026-10-20'),
      /記事タイトルに不正なHTMLがあります/
    ));
  } finally { fs.rmSync(fixture.root, {recursive: true}); }
}
const f=makeFixture('<h1>OK</h1>');try{check('unchanged',()=>{const changes=prepareSnapshots(f.input,f.root,'2026-10-20');for(const [p,v] of changes)fs.writeFileSync(path.join(f.root,p),JSON.stringify(v));assert.deepEqual(prepareSnapshots(f.input,f.root,'2026-10-20'),[]);});check('invalid-source-rejected',()=>assert.throws(()=>prepareSnapshots({...f.input,source:'BAD'},f.root,'2026-10-20')));check('stale-data-rejected',()=>assert.throws(()=>prepareSnapshots(f.input,f.root,'2026-11-20')));check('no-pv-export',()=>{const out=JSON.stringify(prepareSnapshots({...f.input,start:'2026-09-19',end:'2026-10-18'},f.root,'2026-10-20'));assert(!out.includes('"pv"'));});}finally{fs.rmSync(f.root,{recursive:true});}
assert.equal(fail, 0, JSON.stringify(results.filter(result => !result.ok)));

});
