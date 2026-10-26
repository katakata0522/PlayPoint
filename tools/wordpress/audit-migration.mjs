// 移行前の台帳・本文・機能を記録するだけ。HTML・WordPress・DBは変更しない。
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export function scriptBlocks(source) {
 return [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)];
}
export async function auditMigration(output) {
assert.ok(output,'Usage: node audit-migration.mjs <report.json>');
const catalog=JSON.parse(await fs.readFile(path.join(repo,'blog/articles.json'),'utf8'));
const records=[],known=new Set();
for(const row of catalog.filter(row=>row.listed!==false)) {
 const url=new URL(row.file,'https://playpoint-sim.com/blog/'),file=path.resolve(repo,'.'+url.pathname);
 assert.ok(file.startsWith(repo+path.sep),'source path boundary');assert.ok(!known.has(url.pathname),'duplicate source URL');known.add(url.pathname);
 const source=await fs.readFile(file,'utf8'),article=source.match(/<article\b[^>]*>([\s\S]*?)<\/article\b[^>]*>/i)?.[1];
 const scripts=scriptBlocks(source);
 const customScripts=scripts.filter(m=>!m[1].includes('application/ld+json')&&(/calculator|calculate|multiplier|Math\./i.test(m[2])||/src="[^"]*(?:calc|game)[^"]*"/.test(m[1]))).length;
 const forms=(article?.match(/<(?:form|input|select)\b/gi)||[]).length;
 const images=[...(article||'').matchAll(/<img\b[^>]*src="([^"]+)"/gi)].map(m=>m[1]);
 const missing=[];
 for(const image of images){if(/^(?:data:|https?:|\/\/)/.test(image))continue;const name=new URL(image,url).pathname;try{await fs.stat(path.join(repo,name));}catch{missing.push(name);}}
 records.push({path:url.pathname,title:row.title,sha256:createHash('sha256').update(source).digest('hex'),articleFound:!!article,
  headings:(article?.match(/<h[23]\b/gi)||[]).length,tables:(article?.match(/<table\b/gi)||[]).length,images:images.length,
  disclosures:(article?.match(/<details\b/gi)||[]).length,formControls:forms,customCalculatorScripts:customScripts,missingLocalImages:missing,
  linkedScripts:scripts.map(m=>m[1].match(/\bsrc="([^"]+)"/)?.[1]).filter(Boolean),
  inlineExecutableScripts:scripts.filter(m=>!m[1].includes('application/ld+json')&&!m[1].includes('src=')).length,
  inlineStyleBlocks:(source.match(/<style\b/gi)||[]).length,
  verificationGroup:!article?'inspect-template':forms||customScripts?'interactive-controls':'article-layout'});
}
const counts=Object.fromEntries(['article-layout','interactive-controls','inspect-template'].map(name=>[name,records.filter(r=>r.verificationGroup===name).length]));
const result={checkedAtUtc:new Date().toISOString(),sourceReadOnly:true,wordpressWrites:0,databaseWrites:0,listedArticles:records.length,counts,
  missingLocalImages:records.reduce((n,r)=>n+r.missingLocalImages.length,0),records,
  limits:['This records preservation requirements, not a completed import or rendered parity.','Groups are a first pass based on controls/scripts; layout articles still require per-template CSS, JS and link verification.','Keep each URL, text, headings, tables, disclosures, media and calculator behavior; do not bulk-publish before template-level verification.']};
await fs.mkdir(path.dirname(path.resolve(output)),{recursive:true});await fs.writeFile(output,JSON.stringify(result,null,2));
console.log(JSON.stringify({listedArticles:result.listedArticles,counts,missingLocalImages:result.missingLocalImages,wordpressWrites:0,databaseWrites:0}));
return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await auditMigration(process.argv[2]);
