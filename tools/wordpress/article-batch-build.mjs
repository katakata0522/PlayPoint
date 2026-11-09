// 少数記事の原文・元アセットを記録し、stg専用パッケージへまとめる。
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../..');
export const selectedPaths=[
 '/articles/2026-10-14-play-credit-subscription.html',
 '/articles/2026-10-13-play-points-stamp-cards.html',
 '/articles/2026-10-10-diamond-play-pass-value.html'
];
const sha=value=>createHash('sha256').update(value).digest('hex');
export const decodeHtmlReferences=value=>value.replace(/&(?:amp|quot|#39);/g,reference=>({'&amp;':'&','&quot;':'"','&#39;':"'"}[reference]));
function local(value,base){
 if(!value||/^(?:#|data:|mailto:|tel:|javascript:)/i.test(value))return null;
 const url=new URL(decodeHtmlReferences(value),'https://playpoint-sim.com'+base);
 if(url.origin!=='https://playpoint-sim.com')return null;
 return decodeURIComponent(url.pathname);
}
export function splitArticle(source){
 const matches=[...source.matchAll(/<article\b[^>]*\bclass=(["'])([^"']*)\1[^>]*>([\s\S]*?)<\/article\b[^>]*>/gi)].filter(m=>m[2].split(/\s+/).some(name=>name==='content'||name==='article-content'));
 assert.equal(matches.length,1,'one source article');
 const found=matches[0],inner=found[3];
 let cursor=0;
 for(;;){
  while(cursor<inner.length&&/\s/.test(inner[cursor]))cursor++;
  if(!inner.startsWith('<!--',cursor))break;
  const end=inner.indexOf('-->',cursor+4);assert.ok(end!==-1,'source article header');
  cursor=end+3;
 }
 let header=inner.slice(cursor).match(/^<header\b[^>]*>[\s\S]*?<\/header\s*>/i)?.[0];
 if(!header&&found[2].split(/\s+/).includes('article-content')){
  // Diamond Valleyの旧外枠。本文を推測して飛ばさず、既知の3要素だけを保持する。
  let end=cursor;
  for(const [tag,className] of [['nav','breadcrumb-nav'],['h1',null],['p','article-meta']]){
   while(end<inner.length&&/\s/.test(inner[end]))end++;
   const element=inner.slice(end).match(new RegExp('^<'+tag+'\\b[^>]*>[\\s\\S]*?</'+tag+'\\s*>','i'))?.[0];
   assert.ok(element,'source article header');
   const open=element.slice(0,element.indexOf('>')+1),classes=open.match(/\bclass=(["'])([^"']*)\1/i)?.[2].split(/\s+/)||[];
   assert.ok(!className||classes.includes(className),'source article header');
   if(tag==='p')for(const date of ['published','modified'])assert.ok(element.includes('data-article-date="'+date+'"'),'source article header');
   end+=element.length;
  }
  header=inner.slice(cursor,end);
 }
 const hero=header?inner.slice(0,cursor+header.length):null;
 assert.ok(hero&&/<h1\b/.test(hero),'source article header');
 const open=found[0].slice(0,found[0].indexOf('>')+1),start=found.index+open.length;
 return {before:source.slice(0,start),hero,content:inner.slice(hero.length),after:source.slice(start+inner.length)};
}
function literal(source,from,to){assert.equal(source.split(from).length,2,'single integration point: '+from.slice(0,65));return source.replace(from,()=>to);}
export async function buildArticleBatch(output,options={}){
 assert.ok(Object.keys(options).every(key=>key==='previewPaths'),'unknown batch option');
 const previewOnly=Object.hasOwn(options,'previewPaths'),paths=previewOnly?options.previewPaths:selectedPaths;
 assert.ok(Array.isArray(paths)&&paths.length>0&&new Set(paths).size===paths.length,'unique source paths');
 for(const pathname of paths)assert.ok(typeof pathname==='string'&&/^\/(?:articles\/[a-z0-9-]+\.html|games\/[a-z0-9-]+\/(?:[a-z0-9-]+\/)*index\.html)$/.test(pathname),'source path boundary');
 const catalog=JSON.parse(await fs.readFile(repo+'/blog/articles.json','utf8'));
 const articles=[],assets=new Map();
 async function asset(value,base){
  const name=local(value,base);if(!name)return;
  if(!/\.(?:css|js|svg|png|jpe?g|webp|gif|avif|woff2?|ttf|otf)$/i.test(name))return;
  if(assets.has(name))return;
  const file=path.resolve(repo,'.'+name);assert.ok(file.startsWith(repo+path.sep),'public asset boundary');
  const bytes=await fs.readFile(file),extension=path.extname(name).toLowerCase();
  const row={path:name,sourceSha256:sha(bytes),bytes:bytes.length};
  if(extension==='.css'||extension==='.js')row.text=bytes.toString('utf8');
  assets.set(name,row);
  if(extension==='.css')for(const m of row.text.matchAll(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/gi))await asset(m[1].trim(),name);
 }
 for(const pathname of paths){
  const source=await fs.readFile(repo+pathname,'utf8'),parts=splitArticle(source),row=catalog.find(r=>new URL(r.file,'https://playpoint-sim.com/blog/').pathname===pathname);
  assert.ok(row,'catalog row');
  assert.ok(previewOnly||!/<(?:form|input|select)\b/i.test(parts.content),'exclude interactive articles');
  const title=decodeHtmlReferences(source.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'');
  const description=decodeHtmlReferences(source.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]||'');
  const counts={headings:(parts.content.match(/<h[23]\b/gi)||[]).length,tables:(parts.content.match(/<table\b/gi)||[]).length,images:(parts.content.match(/<img\b/gi)||[]).length};
  articles.push({path:pathname,slug:path.basename(pathname,'.html'),sourceSha256:sha(source),contentSha256:sha(parts.content),title,description,published:row.date,modified:row.modified||row.date,category:row.browseCategory||row.category,tags:row.tags||[],listTitle:row.listTitle||title,counts,...parts});
  for(const match of source.matchAll(/<(?:script|img|source|link)\b[^>]*>/gi)){
   const tag=match[0];for(const attr of tag.matchAll(/\b(?:src|href|data-search-module)="([^"]+)"/gi))await asset(attr[1],pathname);
   for(const attr of tag.matchAll(/\bsrcset="([^"]+)"/gi))for(const src of attr[1].split(','))await asset(src.trim().split(/\s+/)[0],pathname);
  }
 }
 for(const name of ['/blog/common-components.css','/articles/source-notice.css','/js/article-search.js','/images/article-placeholder.svg'])await asset(name,'/');
 for(const row of catalog)await asset(row.thumbnail,'/blog/');
 const linkScript=await fs.readFile(here+'/article-batch-links.js','utf8');assert.ok(!/<\/script\b/i.test(linkScript),'inline script boundary');
 const generation=sha(JSON.stringify({version:1,builderSha256:sha(await fs.readFile(fileURLToPath(import.meta.url))),linksSha256:sha(linkScript),articles:articles.map(a=>[a.path,a.sourceSha256]),assets:[...assets.values()].map(a=>[a.path,a.sourceSha256])})).slice(0,16);
 const assetUrl=name=>'/cms/index.php?pp_batch_asset='+generation+name;
 for(const row of assets.values()){
  if(row.path.endsWith('.css'))row.text=row.text.replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi,(all,quote,value)=>{const p=local(value.trim(),row.path);return p&&assets.has(p)?'url("'+assetUrl(p)+'")':all;});
  if(row.path==='/js/guide-navigation.js'){
   row.text=literal(row.text,"fetch(hub + 'article-search-index.json').then(response => { if (!response.ok) throw Error('Unavailable'); return response.json(); })","Promise.resolve(JSON.parse(doc.getElementById('ppab-search-snapshot').textContent))");
   row.text=literal(row.text,"const hub = locale === 'ja' ? '/blog/' : `/${locale}/articles/`;","const hub = locale === 'ja' ? '/blog/?pp_flow=normal&pp_catalog=live' : `/${locale}/articles/`;");
   row.text=literal(row.text,"all.href = hub + (query ? '?q=' + encodeURIComponent(query) : '');","all.href = hub + (query ? '&q=' + encodeURIComponent(query) : '');");
   row.text=literal(row.text,"link.href = article.path.replace(/index\\.html$/, '');","link.href = window.PlayPointArticleBatch.link(article.path.replace(/index\\.html$/, ''));");
  }
  if(row.path==='/blog/components.js'){
   row.text=literal(row.text,'        scheduleCommonAnalytics();\n        setupBlogAdsense();',"        if (!document.documentElement.hasAttribute('data-pp-stg-batch')) { scheduleCommonAnalytics(); setupBlogAdsense(); }");
   row.text=literal(row.text,"    void ensureAnalyticsCore().catch((error) => console.warn('Analytics core preload failed:', error));","    if (!document.documentElement.hasAttribute('data-pp-stg-batch')) void ensureAnalyticsCore().catch((error) => console.warn('Analytics core preload failed:', error));");
  }
  if(row.path==='/blog/article.js'){
   row.text=literal(row.text,'        setupArticleAdsense();',"        if (!document.documentElement.hasAttribute('data-pp-stg-batch')) setupArticleAdsense();");
   row.text=literal(row.text,'const response = await fetch(CONFIG.articlesUrl);',"const response = {ok:true,json:async()=>JSON.parse(document.getElementById('ppab-catalog-snapshot').textContent)};");
   row.text=literal(row.text,'<img src="${article.thumbnail}"','<img src="${window.PlayPointArticleBatch.asset(article.thumbnail)}"');
   row.text=literal(row.text,'img.src = CONFIG.placeholderImage;','img.src = window.PlayPointArticleBatch.asset(CONFIG.placeholderImage);');
  }
  if(row.text!==undefined)row.servedSha256=sha(row.text);
 }
 const packagedAssets=Object.fromEntries([...assets.values()].map(a=>[generation+a.path,a]));
 const data={version:1,generation,articles,assets:packagedAssets,linkScript,previewOnly};
 const template=await fs.readFile(here+'/article-batch-staging.php','utf8');
 assert.equal(template.split('__PLAYPOINT_ARTICLE_BATCH__').length,2);
 const php=template.replace('__PLAYPOINT_ARTICLE_BATCH__',()=>gzipSync(Buffer.from(JSON.stringify(data))).toString('base64'));
 await fs.mkdir(output,{recursive:true});await fs.writeFile(output+'/playpoint-article-batch-staging.php',php);
 const manifest={generation,productionWrites:0,sourceFilesUnchanged:true,previewOnly,wordpressHooksEnabled:!previewOnly,importAllowed:!previewOnly,articles:articles.map(({path,sourceSha256,contentSha256,title,counts})=>({path,sourceSha256,contentSha256,title,counts})),assets:assets.size,phpBytes:Buffer.byteLength(php),phpSha256:sha(php),deploymentPath:previewOnly?null:'/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms/wp-content/mu-plugins/playpoint-article-batch-staging.php'};
 await fs.writeFile(output+'/article-batch-build.json',JSON.stringify(manifest,null,2));
 return {data,manifest};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [output,flag,...paths]=process.argv.slice(2);
 assert.ok(output&&(!flag||flag==='--preview-only'),'Usage: article-batch-build.mjs <output> [--preview-only <source paths...>]');
 const {manifest}=await buildArticleBatch(path.resolve(output),flag?{previewPaths:paths}:{});console.log(JSON.stringify(manifest,null,2));
}
