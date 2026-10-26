import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../..');
const out=process.argv[2];assert.ok(out,'Usage: node build-blog-staging.mjs <output folder>');
const sha=value=>createHash('sha256').update(value).digest('hex');
const read=async name=>(await fs.readFile(path.join(repo,name),'utf8')).replaceAll('\r\n','\n');
const sources={},images={},imageKeys={};
const resolveFile=(url,base)=>{
  const parsed=new URL(url,'https://playpoint-sim.com/'+base);
  assert.equal(parsed.origin,'https://playpoint-sim.com');
  const name=decodeURIComponent(parsed.pathname.slice(1));
  assert.ok(path.resolve(repo,name).startsWith(repo+path.sep),'repository boundary');return name;
};
async function image(url,base='blog/index.html') {
  if(!url||/^(?:data:|#|https?:|\/\/)/i.test(url))return url;
  const name=resolveFile(url,base);if(imageKeys[name])return '/cms/index.php?pp_blog_image='+imageKeys[name];
  const ext=path.extname(name).slice(1).toLowerCase(),types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',avif:'image/avif',gif:'image/gif',svg:'image/svg+xml',ico:'image/x-icon',woff:'font/woff',woff2:'font/woff2'};
  assert.ok(types[ext],'fixed public media types: '+name);const bytes=await fs.readFile(path.join(repo,name));
  const key=sha(name).slice(0,20)+'.'+ext;assert.ok(!images[key]||images[key].path===name,'asset key collision');
  images[key]={path:name,mime:bytes[0]===255&&bytes[1]===216?'image/jpeg':types[ext]};imageKeys[name]=key;
  return '/cms/index.php?pp_blog_image='+key;
}
async function css(name) {
  const original=await read(name);sources[name]=sha(original);let source=original;
  for(const match of [...original.matchAll(/url\(\s*(['"]?)([^)'"\n]+)\1\s*\)/g)]) {
    const value=match[2].trim();if(/^(?:data:|#|https?:|\/\/)/i.test(value))continue;
    const replacement=await image(value,name);source=source.replace(match[0],'url("'+replacement+'")');
  }
  return source;
}
function once(source,from,to,name) {assert.equal(source.split(from).length,2,name);return source.replace(from,to);}
async function script(name) {
  let s=await read(name);sources[name]=sha(s);
  if(name==='blog/script.js') {
    s=once(s,"            const response = await fetch(CONFIG.articlesUrl);\n            if (!response.ok) throw new Error('Failed to load articles');\n            const articles = await response.json();","            const articles = JSON.parse(document.getElementById('pp-blog-catalog').textContent);",'catalog input');
    s=once(s,"fetch('/blog/article-search-index.json', { signal: controller.signal }).then(response => {\n            if (!response.ok) throw new Error('Search index unavailable');\n            return response.json();\n        })","Promise.resolve().then(() => JSON.parse(document.getElementById('pp-blog-search').textContent))",'body search input');
    s=once(s,"fetch('/blog/game-calculators.json').then(response => {\n            if (!response.ok) throw new Error('Game links unavailable');\n            return response.json();\n        })","Promise.resolve().then(() => JSON.parse(document.getElementById('pp-blog-games').textContent))",'calculator links input');
    s=once(s,"            if (url.href !== window.location.href)","            url.pathname = '/blog/'; url.searchParams.set('pp_flow','normal'); url.searchParams.set('pp_catalog','live');\n            if (Number(state.page)>1) url.searchParams.set('page',state.page); else url.searchParams.delete('page');\n            if (url.href !== window.location.href)",'history route');
    s=once(s,'            return url.pathname + url.search;','            return window.PlayPointStagingLink(url.pathname + url.search);','pagination route');
    const category=s.match(/    const BROWSE_CATEGORIES = \[[\s\S]*?\n    \];/);assert.ok(category);
    s=s.replace(category[0],category[0].replace('const BROWSE_CATEGORIES','const ORIGINAL_BROWSE_CATEGORIES')+"\n    const currentTopics=Object.keys(JSON.parse(document.getElementById('pp-blog-config').textContent).categories);\n    const BROWSE_CATEGORIES=[...ORIGINAL_BROWSE_CATEGORIES,...currentTopics.filter(name=>!ORIGINAL_BROWSE_CATEGORIES.includes(name))];");
  }
  if(name==='js/guide-navigation.js') {
    s=once(s,'    for (const link of links) {',"    for (const link of links) {\n      const oldHref=link.getAttribute('href'),nextHref=window.PlayPointStagingLink(oldHref);\n      if(oldHref!==nextHref)link.setAttribute('href',nextHref);",'owned links');
    s=once(s,'for (const record of records) for (const node of record.addedNodes) protectLinks(node);',"for (const record of records) { if(record.type==='attributes')protectLinks(record.target);else for(const node of record.addedNodes)protectLinks(node); }",'dynamic links');
    s=once(s,'{ childList: true, subtree: true }','{ childList: true, subtree: true, attributes:true, attributeFilter:[\'href\'] }','link-only observer');
    s=once(s,"new URL(link.getAttribute('href'), doc.baseURI).origin === location.origin","[location.origin,'https://playpoint-sim.com'].includes(new URL(link.getAttribute('href'), doc.baseURI).origin)",'public navigation consent');
    s=once(s,"const hub = locale === 'ja' ? '/blog/' : `/${locale}/articles/`;","const hub = locale === 'ja' ? '/blog/?pp_flow=normal&pp_catalog=live' : `/${locale}/articles/`;",'search hub');
    s=once(s,"all.href = hub + (query ? '?q=' + encodeURIComponent(query) : '');","all.href = hub + (query ? '&q=' + encodeURIComponent(query) : '');",'search query');
    s=once(s,"fetch(hub + 'article-search-index.json').then(response => { if (!response.ok) throw Error('Unavailable'); return response.json(); })","Promise.resolve().then(() => JSON.parse(document.getElementById('pp-blog-search').textContent))",'dialog search input');
  }
  if(name==='blog/utils.js') {
    s=once(s,"const PLACEHOLDER_IMAGE = '/images/article-placeholder.svg';","const PLACEHOLDER_IMAGE = window.PlayPointStagingImage('/images/article-placeholder.svg');",'placeholder');
    s=once(s,'BlogUtils.escapeHtml(article.thumbnail);','BlogUtils.escapeHtml(window.PlayPointStagingImage(article.thumbnail));','card thumbnail');
    s=once(s,'BlogUtils.escapeHtml(article.thumbnail2x)','BlogUtils.escapeHtml(window.PlayPointStagingImage(article.thumbnail2x))','high-density thumbnail');
  }
  if(name==='blog/components.js') {
    s=once(s,'    function requestBlogAds(container = document) {',"    function requestBlogAds(container = document) {\n        if(document.documentElement.dataset.ppStagingBlog==='1')return;",'stg listing ad isolation');
    s=once(s,'    function ensureCommonStyles() {',"    function ensureCommonStyles() {\n        if(document.getElementById('pp-stage-common-style'))return;",'inlined common style');
    s=once(s,'    ensureCommonStyles();',"    ensureCommonStyles();\n    // このstg一覧は既存の計測・広告対象外の保護を維持する。公開コードは変更しない。\n    if(document.documentElement.dataset.ppStagingBlog==='1')return;",'stg measurement isolation');
  }
  return s;
}
const escapeScript=s=>s.replace(/<\/script/gi,'<\\/script');
let html=await read('blog/index.html');sources['blog/index.html']=sha(html);
html=html.replace(/<script type="speculationrules">[\s\S]*?<\/script>/,'<!-- stgでは既存の配信対象外ページを先読みしない。 -->');
const scripts=[],headScripts=[];
for(const match of [...html.matchAll(/<script\b([^>]*\bsrc="([^"]+)"[^>]*)>\s*<\/script>/g)]) {
  const name=resolveFile(match[2],'blog/index.html'),body='<script data-stage-source="'+name+'">'+escapeScript(await script(name))+'</script>';
  if(/\bdefer\b/.test(match[1])){scripts.push(body);html=html.replace(match[0],'');}else {const key='__PP_STAGE_SCRIPT_'+headScripts.length+'__';headScripts.push([key,body]);html=html.replace(match[0],key);}
}
for(const match of [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
  const name=resolveFile(match[1],'blog/index.html');html=html.replace(match[0],'<style data-stage-source="'+name+'">'+await css(name)+'</style>');
}
html=html.replace('</head>','<style id="pp-stage-common-style">'+await css('blog/common-components.css')+'</style></head>');
for(const match of [...html.matchAll(/<(?:img|source|link)\b[^>]*>/g)]) {
  if(match[0].startsWith('<link')&&!/rel="icon"/.test(match[0]))continue;let tag=match[0];
  for(const attr of [...tag.matchAll(/\b(src|data-src|href|srcset|data-srcset)="([^"]*)"/g)]) {
    let value=attr[2];
    if(attr[1].includes('srcset')){
      const parts=[];for(const candidate of value.split(',')){const [url,...size]=candidate.trim().split(/\s+/);parts.push([await image(url),...size].join(' '));}value=parts.join(', ');
    }else value=await image(value);
    tag=tag.replace(attr[0],attr[1]+'="'+value+'"');
  }
  html=html.replace(match[0],tag);
}
html=html.replace(/<a\b[^>]*href="([^"]+)"[^>]*>/g,(tag,href)=>{
  if(/^(?:#|mailto:|tel:|javascript:)/i.test(href))return tag;
  return tag.replace('href="'+href+'"','href="'+new URL(href.replaceAll('&amp;','&'),'https://playpoint-sim.com/blog/').href.replaceAll('&','&amp;')+'"');
});
const catalog=JSON.parse(await read('blog/articles.json'));
for(const row of catalog)for(const key of ['thumbnail','thumbnail2x','ogp'])if(row[key])await image(row[key]);
await image('/images/article-placeholder.svg');
html=html.replace('<html lang="ja"','<html lang="ja" data-pp-staging-blog="1"');
const bootstrap="<meta name=\"robots\" content=\"noindex,nofollow,noarchive\"><script>window['ga-disable-G-HED6D0FR4L']=true;window['ga-disable-G-V9EZD7RBM3']=true;</script><script>"+escapeScript(await fs.readFile(here+'/blog-links.js','utf8'))+'</script>';
html=html.replace('<head>','<head>'+bootstrap);
for(const [key,body] of headScripts)html=html.replace(key,body);
html=html.replace('</body>',['catalog','search','games','config'].map(name=>'<script type="application/json" id="pp-blog-'+name+'">__PP_BLOG_'+name.toUpperCase()+'__</script>').join('\n')+'\n'+scripts.join('\n')+'\n</body>');
assert.ok(!/<script\b[^>]*\bsrc=/.test(html),'scripts are same-origin inline for the existing stg CSP');
const payload={html,images,imageKeys,games:JSON.parse(await read('blog/game-calculators.json'))};
const packed=gzipSync(Buffer.from(JSON.stringify(payload)),{level:9}).toString('base64');
const php=(await fs.readFile(here+'/blog-staging.php','utf8')).replace('__PLAYPOINT_BLOG_PAYLOAD__',packed);
assert.ok(!php.includes('__PLAYPOINT_BLOG_PAYLOAD__'));
await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'playpoint-catalog-blog.php'),php);
const report={sources,publicImageAllowlist:Object.keys(images).length,blogBytes:Buffer.byteLength(html),phpBytes:Buffer.byteLength(php),sha256:sha(php),productionWrites:0,securityHeadersChanged:false,measurement:'Existing stg blog isolation maintained; no production analytics/ad loader'};
await fs.writeFile(path.join(out,'blog-build.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
