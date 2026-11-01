// 取得済みファイルの三者比較だけを行う。PHP実行・通信・DB操作・ファイル更新は行わない。
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const sha=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new Error(message);};
const requireValue=(condition,message)=>{if(!condition)fail(message);};
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const sourcePath=value=>typeof value==='string'&&/^\/(?:articles\/[a-z0-9-]+\.html|games\/[a-z0-9-]+\/(?:[a-z0-9-]+\/)*index\.html)$/.test(value);
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function day(value){
 requireValue(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value),'invalid date');
 requireValue(Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value,'invalid date');
 return value;
}
function localDate(value){
 requireValue(typeof value==='string'&&/^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value),'invalid WordPress local timestamp');
 return day(value.slice(0,10));
}
function strings(record,names,label){for(const name of names)requireValue(typeof record[name]==='string',label+' missing '+name);}
function tags(value){requireValue(Array.isArray(value)&&value.every(v=>typeof v==='string'),'invalid tags');return [...value].sort();}
function packageEntries(data){
 requireValue(isObject(data)&&data.version===1&&Array.isArray(data.articles),'invalid article package');
 const map=new Map();
 for(const entry of data.articles){
  requireValue(isObject(entry)&&sourcePath(entry.path)&&!map.has(entry.path),'invalid or duplicate package path');
  strings(entry,['before','hero','content','after','title','description','published','modified','listTitle','category'],'package');
  requireValue(digest(entry.sourceSha256)&&sha(entry.before+entry.hero+entry.content+entry.after)===entry.sourceSha256,'package source hash mismatch');
  requireValue(digest(entry.contentSha256)&&sha(entry.content)===entry.contentSha256,'package content hash mismatch');
  day(entry.published);day(entry.modified);tags(entry.tags);map.set(entry.path,entry);
 }
 requireValue(map.size>0,'empty article package');return map;
}
function currentPosts(data){
 if(data===null)return null;
 requireValue(isObject(data)&&data.version===1&&data.source==='wordpress-readback'&&data.site==='https://stg.playpoint-sim.com'&&Array.isArray(data.posts),'invalid WordPress readback');
 requireValue(typeof data.capturedAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(data.capturedAt)&&Number.isFinite(Date.parse(data.capturedAt)),'missing readback timestamp');
 const map=new Map(),ids=new Set();
 for(const post of data.posts){
  requireValue(isObject(post)&&Number.isSafeInteger(post.ID)&&post.ID>0&&!ids.has(post.ID)&&isObject(post.meta),'invalid or duplicate WordPress post');
  strings(post,['post_status','post_title','post_content','post_excerpt','post_date','post_modified','category'],'WordPress');
  requireValue(typeof post.post_password_present==='boolean','missing password presence');
  strings(post.meta,['playpoint_batch_path','playpoint_batch_source_sha256','the_page_meta_description','playpoint_list_title','playpoint_batch_auto_list_title','playpoint_batch_auto_post_title'],'WordPress meta');
  const key=post.meta.playpoint_batch_path;
  requireValue(sourcePath(key)&&!map.has(key),'invalid or duplicate WordPress path');
  requireValue(post.meta.playpoint_batch_source_sha256===''||digest(post.meta.playpoint_batch_source_sha256),'invalid source meta hash');
  localDate(post.post_date);localDate(post.post_modified);tags(post.tags);ids.add(post.ID);map.set(key,post);
 }
 return map;
}
export const fieldOwnership={
 content:'WordPress post_content',title:'WordPress post_title',description:'WordPress meta.the_page_meta_description (empty remains empty)',
 excerpt:'WordPress post_excerpt (catalog list description; falls back to description when empty)',
 published:'WordPress post_date local calendar day',modified:'WordPress post_modified local calendar day; timestamp is maintained by WordPress',
 listTitle:'WordPress meta.playpoint_list_title; custom edits must be preserved',category:'WordPress first non-default category used by catalog',tags:'WordPress post_tag names',
 shell:'Candidate before/hero/after; title, description and displayed dates are overridden from WordPress, other metadata remains packaged'
};
function packageFields(entry){return {content:entry.content,title:entry.title,description:entry.description,excerpt:entry.description,published:entry.published,modified:entry.modified,listTitle:entry.listTitle,category:entry.category,tags:tags(entry.tags)};}
function postFields(post){return {content:post.post_content,title:post.post_title,description:post.meta.the_page_meta_description,excerpt:post.post_excerpt,published:localDate(post.post_date),modified:localDate(post.post_modified),listTitle:post.meta.playpoint_list_title,category:post.category,tags:tags(post.tags)};}
function compare(base,current,candidate){
 const b=JSON.stringify(base),w=JSON.stringify(current),n=JSON.stringify(candidate);
 return {state:b===w&&b===n?'unchanged':b===w?'source-only':b===n?'wordpress-only':w===n?'converged':'conflict',baselineSha256:sha(b),wordpressSha256:sha(w),candidateSha256:sha(n)};
}
export function diagnoseArticleBatch(baseline,candidate,current=null){
 const bases=packageEntries(baseline),next=packageEntries(candidate),posts=currentPosts(current),articles=[];
 for(const [key,entry] of next){
  const base=bases.get(key),post=posts?.get(key);
  const record={path:key,sourceBaselineMatched:false,status:'unverified',reason:!base?'baseline-missing':!posts?'current-wordpress-not-read':!post?'current-post-not-read':post.meta.playpoint_batch_source_sha256!==base.sourceSha256?'baseline-source-meta-mismatch':null};
  if(base)record.candidateShellChanged=['before','hero','after'].filter(name=>base[name]!==entry[name]);
  if(record.reason){articles.push(record);continue;}
  const b=packageFields(base),w=postFields(post),n=packageFields(entry);
  record.sourceBaselineMatched=true;record.fields=Object.fromEntries(Object.keys(b).map(name=>[name,compare(b[name],w[name],n[name])]));
  const fieldsWithState=state=>Object.keys(record.fields).filter(name=>record.fields[name].state===state);
  record.sourceOnlyFields=fieldsWithState('source-only');record.wordpressOnlyFields=fieldsWithState('wordpress-only');record.conflictingFields=fieldsWithState('conflict');
  record.status=record.conflictingFields.length?'conflict':record.sourceOnlyFields.length?'source-update-needed':record.wordpressOnlyFields.length?'preserve-wordpress-edits':'no-owned-field-difference';
  record.candidateDiffersFromWordPress=Object.keys(w).filter(name=>JSON.stringify(w[name])!==JSON.stringify(n[name]));
  record.wouldCombineNewShellWithDifferentWordPress=record.candidateShellChanged.length>0&&record.candidateDiffersFromWordPress.length>0;
  record.wordpressState={status:post.post_status,passwordPresent:post.post_password_present,rendered:post.post_status==='publish'&&!post.post_password_present};
  record.wordpressTimestampChanged={published:post.post_date!==base.published+' 00:00:00',modified:post.post_modified!==base.modified+' 00:00:00'};
  record.customListTitle=post.meta.playpoint_list_title!==post.meta.playpoint_batch_auto_list_title;
  record.autoTitleTrackingMatchesPost=post.meta.playpoint_batch_auto_post_title===post.post_title;
  articles.push(record);
 }
 const removedCandidatePaths=[...bases.keys()].filter(key=>!next.has(key));
 return {version:1,diagnosticOnly:true,deploymentApproved:false,wordpressWrites:0,networkRequests:0,
  currentReadback:posts?{provided:true,capturedAt:current.capturedAt,site:current.site}: {provided:false,status:'unverified'},
  status:articles.some(a=>!a.sourceBaselineMatched)?'unverified':removedCandidatePaths.length||articles.some(a=>a.status!=='no-owned-field-difference'||a.candidateShellChanged.length||!a.wordpressState.rendered||Object.values(a.wordpressTimestampChanged).some(Boolean))?'review-required':'comparison-complete',
  fieldOwnership,articles,removedCandidatePaths,
  limits:['Readback freshness and provenance cannot be verified offline.','Source hash matching does not authenticate package metadata; use the recorded original import artifact.','No automatic merge, post update or deployment decision.','Shell comparisons include packaged metadata and require rendered review; matching owned fields is not rendered parity.']};
}
async function readJson(file,packed=false){
 let raw;try{raw=await fs.readFile(file,'utf8');}catch{fail('input file unreadable');}
 try{
  if(packed&&raw.trimStart().startsWith('<?php')){
   const matches=[...raw.matchAll(/base64_decode\('([A-Za-z0-9+/=]+)'\)/g)];requireValue(matches.length===1,'ambiguous PHP payload');
   raw=gunzipSync(Buffer.from(matches[0][1],'base64'),{maxOutputLength:64*1024*1024}).toString('utf8');
  }
  return JSON.parse(raw);
 }catch{fail('input is not a valid JSON or article package');}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [baseFile,currentFile,candidateFile,...extra]=process.argv.slice(2);
  requireValue(baseFile&&currentFile&&candidateFile&&!extra.length,'Usage: node article-batch-diagnose.mjs <import-package.php|json> <wordpress-readback.json|-> <candidate-package.php|json>');
  const report=diagnoseArticleBatch(await readJson(baseFile,true),await readJson(candidateFile,true),currentFile==='-'?null:await readJson(currentFile));
  console.log(JSON.stringify(report,null,2));if(report.status==='unverified')process.exitCode=2;
 }catch(error){console.error('WordPress diagnostic failed: '+error.message);process.exitCode=1;}
}
