'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { prepareSnapshots } = require('../scripts/update-popular-guides.cjs');
const { PICKS, renderSpotlight } = require('../scripts/reader-spotlight.cjs');
const root = path.resolve(__dirname, '..');

test('人気順位は同一期間の全言語を検証してから更新し、公開物にPVを含めない', () => {
  const ja = require('../scripts/japanese-popular-guides.snapshot.json');
  const intl = require('../scripts/intl-popular-guides.snapshot.json');
  const guides = [...ja.guides, ...Object.values(intl.guides).flat()];
  const input = { source:'PlayPoint Analytics / 📄ページ別分析', status:'COMPLETE', complete:true, start:'2026-10-01', end:'2026-10-30', fetchedAt:'2026-10-31', rows:guides.map(([href],i)=>({path:href,pv:1000-i})) };
  const changes = prepareSnapshots(input, root, '2026-10-31');
  assert.equal(changes.length, 2);
  const result = changes.find(([file])=>file.includes('intl-'))[1];
  for (const locale of ['en','ko','tw']) {
    assert.equal(result.guides[locale].length, 5);
    assert.ok(result.guides[locale].every(([href])=>href.startsWith('/'+locale+'/articles/')));
  }
  assert.doesNotMatch(JSON.stringify(changes), /"pv"/);
  const unchanged = fs.readFileSync(path.join(root,'scripts/intl-popular-guides.snapshot.json'),'utf8');
  assert.throws(()=>prepareSnapshots({...input,rows:input.rows.filter(row=>!row.path.startsWith('/tw/'))},root,'2026-10-31'));
  assert.equal(fs.readFileSync(path.join(root,'scripts/intl-popular-guides.snapshot.json'),'utf8'),unchanged);
});

test('各国のフェス記事は本文で選んだPlay Pass記事へ続き、無関係なゲーム記事を推薦しない',()=>{
  for(const locale of ['en','ko','tw']) {
    const html=fs.readFileSync(path.join(root,locale,'articles/2026-10-12-google-play-fest-2026.html'),'utf8');
    const sidebar=html.match(/<section class="sidebar-widget sidebar-widget--related"[\s\S]*?<\/section>/)?.[0]||'';
    assert.match(sidebar,/2026-10-12-play-pass-double-points-6x\.html/);
    assert.doesNotMatch(sidebar,/arknights|bluearchive/);
    assert.equal((sidebar.match(/class="sidebar-related-link"/g)||[]).length,2);
  }
});

test('注目記事は国別の実在記事1件と期限だけを持ち、人気順位を装わない',()=>{
  for(const locale of ['ja','en','ko','tw']) {
    const [,href,,,expires]=PICKS[locale];
    assert.ok(fs.existsSync(path.join(root,href.slice(1))));
    assert.ok(Number.isFinite(Date.parse(expires)));
    const html=renderSpotlight(locale);
    assert.equal((html.match(/<a /g)||[]).length,1);
    assert.match(html,/ hidden>/);
    assert.doesNotMatch(html,/人気1位|most popular|1위|第一名/);
  }
});

test('注目記事は並び順に依存せず、期限を過ぎると開いたままでも消える',()=>{
  let now = Date.parse('2026-10-19T12:00:00-07:00');
  const timers=[];
  const pick={hidden:true,dataset:{expires:'2026-10-20T00:00:00-07:00'}};
  const document={readyState:'complete',documentElement:{lang:'en'},body:{dataset:{blogPage:'2'},classList:{add(){}}},querySelector:selector=>selector==='[data-reader-spotlight]'?pick:null,addEventListener(){}};
  const context={document,window:{},location:{search:'?sort=oldest'},URLSearchParams,Date:class extends Date {static now(){return now;}},queueMicrotask:fn=>fn(),setTimeout:fn=>timers.push(fn)};
  vm.runInNewContext(fs.readFileSync(path.join(root,'js/guide-navigation.js'),'utf8'),context);
  assert.equal(pick.hidden,false);
  assert.equal(timers.length,1);
  now=Date.parse(pick.dataset.expires)+1;
  timers[0]();
  assert.equal(pick.hidden,true);
});
