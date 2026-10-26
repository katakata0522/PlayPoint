const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const links=require('../tools/wordpress/article-batch-links.js');
const repo=path.resolve(__dirname,'..');

test('HTML文字参照は一層だけ復号し、復号後に現れた文字参照を再処理しない',async()=>{
 const {decodeHtmlReferences}=await import('../tools/wordpress/article-batch-build.mjs');
 assert.equal(decodeHtmlReferences('&amp; &quot; &#39;'),'& " \'');
 assert.equal(decodeHtmlReferences('&amp;quot; &amp;#39; &amp;amp;'),'&quot; &#39; &amp;');
 assert.equal(decodeHtmlReferences('A&amp;amp;quot; B&amp;quot; C&amp;#39;'),'A&amp;quot; B&quot; C&#39;');
 assert.equal(decodeHtmlReferences('&lt; &#34; &AMP; &quot'), '&lt; &#34; &AMP; &quot');
});

test('stg記事のURL接続は保存先・元URL・画像asset入口を保持し、外部URLを変えない',async()=>{
 const config={path:'/articles/test.html',paths:['/articles/test.html'],assets:{'/images/test.webp':'/cms/index.php?pp_batch_asset=123/images/test.webp'}};
 assert.equal(links.asset('../images/test.webp',config),'/cms/index.php?pp_batch_asset=123/images/test.webp');
 assert.equal(links.asset('https://elsewhere.example/images/test.webp',config),'https://elsewhere.example/images/test.webp');
 assert.equal(links.link('/cms/index.php?pp_batch_asset=123/images/test.webp',config),'/cms/index.php?pp_batch_asset=123/images/test.webp');
 assert.equal(links.link('./test.html#section-2',config),'https://stg.playpoint-sim.com/articles/test.html#section-2');
 assert.equal(links.link('./other.html#section-1',config),'https://playpoint-sim.com/articles/other.html#section-1');
 assert.equal(links.link('#reading-library',config),'#reading-library');
 assert.equal(links.link('/blog/#reading-library',config),'https://stg.playpoint-sim.com/blog/?pp_flow=normal&pp_catalog=live#reading-library');
 assert.equal(links.link('/',config),'https://stg.playpoint-sim.com/points-cost/?pp_flow=normal');
 assert.equal(links.link('../',config),'https://stg.playpoint-sim.com/points-cost/?pp_flow=normal');
 assert.equal(links.link('https://playpoint-sim.com//',config),'https://stg.playpoint-sim.com/points-cost/?pp_flow=normal');
 assert.equal(links.link('https://stg.playpoint-sim.com/points-cost/?pp_flow=normal',config),'https://stg.playpoint-sim.com/points-cost/?pp_flow=normal');
 assert.equal(links.link('/points-cost/?target=500&pp_flow=normal#result',config),'https://stg.playpoint-sim.com/points-cost/?target=500&pp_flow=normal#result');
 const calculator=links.link('../',config);assert.equal(links.link(calculator,config),calculator,'initial PHP calculator destination must remain stable after the dynamic pass');
 assert.equal(links.link('https://support.google.com/example',config),'https://support.google.com/example');
 const listeners=new Map(),source={value:'<img src=x onerror=alert(1)> & FGO'},input={value:'前回の検索'};
 Object.defineProperty(input,'innerHTML',{set(){assert.fail('query must be assigned as an input value');}});
 const fallback={action:'https://stg.playpoint-sim.com/blog/',method:'get',hidden:[['pp_flow','normal'],['pp_catalog','live']]};
 const form={...fallback,matches:selector=>selector==='.sidebar-search-form',querySelector:selector=>selector==='input[name="q"]'?source:null};
 let dialog=null,trigger=null,clicked=0,renderedValue;
 const document={addEventListener:(name,listener)=>listeners.set(name,listener),getElementById:id=>id==='ppab-config'?{textContent:JSON.stringify(config)}:id==='guide-search'?dialog:null,querySelector:selector=>selector==='[aria-controls="guide-search"]'?trigger:null};
 vm.runInNewContext(await fs.readFile(repo+'/tools/wordpress/article-batch-links.js','utf8'),{window:{document},URL});
 const submit=target=>{const event={target:target||form,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};listeners.get('submit')(event);return event;};
 assert.equal(submit().defaultPrevented,false,'before controller initialization the original GET fallback remains available');
 dialog={open:false,querySelector:selector=>selector==='#guide-search-input'?input:null};
 trigger={disabled:false,click(){clicked++;dialog.open=true;renderedValue=input.value;}};
 assert.equal(submit().defaultPrevented,true,'late controller initialization is picked up without rebinding the form');
 assert.equal(clicked,1);assert.equal(renderedValue,source.value,'the existing search trigger receives the exact query through input.value');
 source.value='別の検索';assert.equal(submit().defaultPrevented,true);assert.equal(renderedValue,'別の検索');assert.equal(clicked,2);
 assert.deepEqual({action:form.action,method:form.method,hidden:form.hidden},fallback,'the normal GET target and hidden parameters remain untouched');
 dialog.open=false;trigger.click=()=>{};input.value='保持する検索';
 assert.equal(submit().defaultPrevented,false,'a controller that cannot open the dialog keeps the GET fallback');assert.equal(input.value,'保持する検索');
 trigger.click=()=>{throw Error('controller unavailable');};
 assert.equal(submit().defaultPrevented,false);assert.equal(input.value,'保持する検索');
 trigger.disabled=true;assert.equal(submit().defaultPrevented,false);
 dialog=null;assert.equal(submit().defaultPrevented,false);
 assert.equal(submit({matches:()=>false}).defaultPrevented,false,'other forms are not intercepted');
});

test('3記事の移行パッケージは原文を再構成でき、表・画像・検索と保存コードを保持する',async()=>{
 const {buildArticleBatch}=await import('../tools/wordpress/article-batch-build.mjs');
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'playpoint-article-batch-'));
 try{
  const {data,manifest}=await buildArticleBatch(temporary);
  assert.equal(data.articles.length,3);assert.equal(manifest.productionWrites,0);
  assert.deepEqual(data.articles.map(a=>[a.counts.tables,a.counts.images]),[[0,0],[2,0],[2,8]]);
  for(const entry of data.articles){
   const original=await fs.readFile(repo+entry.path,'utf8');
   assert.equal(entry.before+entry.hero+entry.content+entry.after,original);
   assert.equal(createHash('sha256').update(entry.content).digest('hex'),entry.contentSha256);
   assert.ok(entry.content.includes('id="article-section-1"'));
  }
  for(const name of ['/js/article-search.js','/js/reading-library.js'])assert.equal(data.assets[data.generation+name].text,await fs.readFile(repo+name,'utf8'));
  for(const row of Object.values(data.assets))if(row.path.endsWith('.js'))assert.doesNotThrow(()=>new vm.Script(row.text,{filename:row.path}));
  const navigation=data.assets[data.generation+'/js/guide-navigation.js'].text;
  assert.ok(navigation.includes("JSON.parse(doc.getElementById('ppab-search-snapshot').textContent)"));
  assert.ok(!navigation.includes("fetch(hub + 'article-search-index.json')"));
  assert.ok(data.assets[data.generation+'/blog/article.js'].text.includes('data-pp-stg-batch'));
  const listeners=new Map(),appended=[],created=[],scheduled=[];
  const document={documentElement:{dataset:{readingTheme:'light'},hasAttribute:()=>true},body:{dataset:{}},head:{appendChild:node=>appended.push(node)},addEventListener:(event,listener)=>listeners.set(event,listener),querySelector:selector=>selector==='link[data-common-components-style]'||selector==='header'||selector==='footer'?{}:null,createElement:tag=>{const node={tag,addEventListener(){},setAttribute(){}};created.push(node);return node;}};
  const window={location:{pathname:'/articles/test.html'},setTimeout:()=>scheduled.push('timer'),requestAnimationFrame:()=>scheduled.push('frame')};
  vm.runInNewContext(data.assets[data.generation+'/blog/components.js'].text,{document,window,console,URL});
  listeners.get('DOMContentLoaded')();
  assert.equal(created.filter(node=>node.tag==='script').length,0,'batch components must not preload a duplicate analytics/consent script');
  assert.equal(appended.length,0);assert.equal(scheduled.length,0,'batch must not schedule advertising or analytics initializers');
  const articleCode=data.assets[data.generation+'/blog/article.js'].text;
  const init=articleCode.match(/async function init\(\) \{[\s\S]*?\n    }\n\n    document\.addEventListener/)[0].replace(/\n\n    document\.addEventListener$/,'');
  let adInitializers=0;
  const context={document:{documentElement:{hasAttribute:()=>true},getElementById:()=>null},window:{},getLocale:()=> 'ja'};
  for(const name of new Set([...init.matchAll(/\b(setup[A-Za-z]+)\(\);/g)].map(m=>m[1])))context[name]=()=>{if(name==='setupArticleAdsense')adInitializers++;};
  await vm.runInNewContext('('+init+')()',context);
  assert.equal(adInitializers,0,'batch article must not initialize an advertisement');
 }finally{
  const resolved=await fs.realpath(temporary),tempRoot=await fs.realpath(os.tmpdir());
  assert.ok(resolved.startsWith(tempRoot+path.sep)&&path.basename(resolved).startsWith('playpoint-article-batch-'));
  await fs.rm(resolved,{recursive:true});
 }
});
