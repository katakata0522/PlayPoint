// 取得済みの本番DBを新規ループバックDBへ複製し、3記事だけの移行を検証する。
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash,randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {buildArticleBatch} from './article-batch-build.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../..');
const task=path.resolve(process.argv[2]||'');assert.ok(process.argv[2],'Usage: node article-batch-native.mjs <task directory>');
const work=task+'/work/migration-next-20261026/article-batch',run=work+'/private/run-'+Date.now(),out=task+'/outputs/migration-next-20261026/evidence';
await fs.mkdir(run,{recursive:true});await fs.mkdir(out,{recursive:true});
const prior=task+'/work/wp-update-recovery-20261025',php=prior+'/runtime/php/php.exe',maria=prior+'/runtime/maria/mariadb-10.11.18-winx64';
const secret=randomBytes(32).toString('hex'),digest=v=>createHash('sha256').update(v).digest('hex');
function call(exe,args,opts={}){const r=spawnSync(exe,args,{encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024,...opts});if(r.status!==0){const e=new Error(path.basename(exe)+' failed');e.privateText=String(r.stderr||r.stdout||r.error).replaceAll(secret,'[local-secret]');throw e;}return r.stdout;}
const port=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(e=>e?reject(e):resolve(n));});});
const require=createRequire('C:/Users/tomok/Documents/Codex/2026-10-20/playpoint-wordpress-cocoon-trial/package.json'),{unzipSync}=require('fflate');
const safe=(root,rel)=>{assert.ok(!path.isAbsolute(rel)&&!rel.split(/[\\/]/).includes('..'),'zip path');const p=path.resolve(root,rel);assert.ok(p.startsWith(path.resolve(root)+path.sep),'zip boundary');return p;};
const report={scope:'New local loopback DB only; original production/stg DB unchanged',productionWrites:0,stagingWrites:0};let db,http,defaults;
try{
 const {data,manifest}=await buildArticleBatch(task+'/outputs/migration-next-20261026/staging-only');report.package=manifest;
 const raw=await fs.readFile(task+'/work/recovery-latest-20261026/private/production-db-20261026.sql.gz');assert.equal(digest(raw),'bcdeef2000ab0cf0d361e0752ba72dd5cc9ddcb8d97361b8f8d76d5bdd5d1222');
 const original=gunzipSync(raw).toString('utf8');assert.ok(!/^\s*(?:USE\s|CREATE\s+DATABASE|GRANT\s|CREATE\s+USER|SET\s+GLOBAL|LOAD\s+DATA|DELIMITER\b)/im.test(original));
 const tables=[...original.matchAll(/CREATE TABLE\s+`([a-zA-Z0-9_]+)`/g)].map(m=>m[1]);assert.equal(tables.length,23);const prefix=tables.find(t=>t.endsWith('_options')).slice(0,-7);
 const dbPort=await port();call(maria+'/bin/mariadb-install-db.exe',['--datadir='+run+'/data','--password='+secret,'--port='+dbPort,'--silent']);
 defaults=run+'/client.ini';await fs.writeFile(defaults,'[client]\nhost=127.0.0.1\nport='+dbPort+'\nuser=root\npassword='+secret+'\nprotocol=tcp\n');
 db=spawn(maria+'/bin/mariadbd.exe',['--defaults-file='+run+'/data/my.ini','--datadir='+run+'/data','--bind-address=127.0.0.1','--port='+dbPort,'--skip-name-resolve','--local-infile=0','--innodb-buffer-pool-size=64M','--max-connections=10','--log-error='+run+'/mariadb.err'],{windowsHide:true,stdio:'ignore'});
 const args=['--defaults-file='+defaults,'--local-infile=0','--batch','--raw','--skip-column-names'];const sql=(q,name)=>call(maria+'/bin/mariadb.exe',[...args,...(name?[name]:[]),'-e',q]);
 let ready=false;for(let i=0;i<60;i++){if(db.exitCode!==null)throw Error('MariaDB startup');try{sql('SELECT 1');ready=true;break;}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready,'MariaDB ready');
 const names=['pp_batch_test','pp_batch_restored'];for(const name of names)sql('CREATE DATABASE '+name+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 call(maria+'/bin/mariadb.exe',[...args,names[0]],{input:original});report.databaseVersion=sql('SELECT VERSION()').trim();report.backupSha256=digest(raw);
 const dumpArgs=['--defaults-file='+defaults,'--skip-comments','--skip-dump-date','--skip-lock-tables','--hex-blob','--order-by-primary'];
 const dump=name=>call(maria+'/bin/mariadb-dump.exe',[...dumpArgs,name]);const fingerprints=name=>Object.fromEntries(tables.map(t=>[t,digest(call(maria+'/bin/mariadb-dump.exe',[...dumpArgs,'--skip-add-drop-table',name,t]))]));
 sql("CREATE USER 'batch_reader'@'127.0.0.1' IDENTIFIED BY '"+secret+"'");for(const name of names)sql('GRANT SELECT ON '+name+".* TO 'batch_reader'@'127.0.0.1'");
 const publicRoot=run+'/public_html',wp=publicRoot+'/stg.playpoint-sim.com/cms';await fs.mkdir(wp,{recursive:true});
 for(const [entry,bytes]of Object.entries(unzipSync(await fs.readFile(task+'/work/wp-runtime-execution/assets/wordpress-7.1.3.zip')))){if(!entry.startsWith('wordpress/'))continue;const rel=entry.slice(10);if(!rel)continue;const p=safe(wp,rel);if(entry.endsWith('/'))await fs.mkdir(p,{recursive:true});else{await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,bytes);}}
 const themeRoot='C:/Users/tomok/Documents/Codex/2026-10-20/playpoint-wordpress-cocoon-trial/wp-content/themes';for(const name of await fs.readdir(themeRoot))if(name.startsWith('cocoon'))await fs.cp(themeRoot+'/'+name,wp+'/wp-content/themes/'+name,{recursive:true,errorOnExist:true,force:false});
 for(const asset of Object.values(data.assets)){const p=safe(publicRoot,asset.path.slice(1));await fs.mkdir(path.dirname(p),{recursive:true});await fs.copyFile(repo+asset.path,p);}
 const uploads=unzipSync(await fs.readFile(task+'/work/recovery-latest-20261026/private/production-uploads-20261026.zip'));for(const [name,bytes]of Object.entries(uploads)){const match=name.match(/(?:^|\/)uploads\/(.+)$/);if(!match)continue;const p=safe(wp+'/wp-content/uploads',match[1]);if(name.endsWith('/'))await fs.mkdir(p,{recursive:true});else{await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,bytes);}}
 const quote=v=>"'"+v.replaceAll('\\','/').replaceAll("'","\\'")+"'";
 await fs.writeFile(wp+'/wp-config.php',`<?php define('DB_NAME',getenv('PP_BATCH_DB')?:'${names[0]}');define('DB_USER',getenv('PP_BATCH_READER')?'batch_reader':'root');define('DB_PASSWORD',${quote(secret)});define('DB_HOST','127.0.0.1:${dbPort}');define('DB_CHARSET','utf8mb4');define('DB_COLLATE','');$table_prefix=${quote(prefix)};define('WP_HOME','http://127.0.0.1');define('WP_SITEURL','http://127.0.0.1');define('WP_HTTP_BLOCK_EXTERNAL',true);define('DISABLE_WP_CRON',true);define('DISALLOW_FILE_MODS',true);define('AUTOMATIC_UPDATER_DISABLED',true);define('WP_CACHE',false);define('WP_ENVIRONMENT_TYPE','local');define('WP_DEBUG',false);define('AUTH_KEY',${quote(randomBytes(32).toString('hex'))});if(!defined('ABSPATH'))define('ABSPATH',__DIR__.'/');require_once ABSPATH.'wp-settings.php';`);
 const mu=wp+'/wp-content/mu-plugins';await fs.mkdir(mu,{recursive:true});await fs.writeFile(mu+'/local-only.php',"<?php add_filter('pre_option_active_plugins','__return_empty_array');add_filter('pre_site_option_active_sitewide_plugins','__return_empty_array');add_filter('pre_wp_mail','__return_false');add_filter('pre_http_request',fn()=>new WP_Error('isolated','External request disabled'),PHP_INT_MAX);");
 const guard='/home/hajikkoroom/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms';
 let plugin=await fs.readFile(task+'/outputs/migration-next-20261026/staging-only/playpoint-article-batch-staging.php','utf8');assert.equal(plugin.split(guard).length,2);plugin=plugin.replace(guard,()=>wp.replaceAll('\\','/'));await fs.writeFile(mu+'/playpoint-article-batch-staging.php',plugin);
 let adapter=await fs.readFile(here+'/catalog-staging.php','utf8');assert.ok(adapter.includes("apply_filters('pp_catalog_mapping'"),'real catalog mapping integration');adapter=adapter.replace(guard,()=>wp.replaceAll('\\','/'));await fs.writeFile(mu+'/playpoint-catalog-staging.php',adapter);
 await fs.copyFile(here+'/catalog.php',mu+'/playpoint-catalog-library.php');await fs.copyFile(repo+'/blog/articles.json',mu+'/playpoint-catalog-base.json');await fs.copyFile(task+'/outputs/stg-navigation-restore/staging-only/playpoint-article-search-index.json',mu+'/playpoint-article-search-index.json');
 const phpBase=['-d','extension_dir='+prior+'/runtime/php/ext','-d','extension=mysqli','-d','extension=mbstring','-d','extension=openssl','-d','memory_limit=512M','-d','display_errors=0','-d','log_errors=1','-d','error_log='+run+'/php.err'];
 const phase=(name,database=names[0],reader=false)=>JSON.parse(call(php,[...phpBase,here+'/article-batch-check.php',wp,name],{env:{...process.env,PP_BATCH_DB:database,...(reader?{PP_BATCH_READER:'1'}:{})}}));
 report.import=phase('import');assert.equal(report.import.created,3);assert.ok(report.import.articles.every(a=>a.storedContentExact&&a.titleMatches&&a.listed===1&&a.indexed===1&&a.rendered));
 const baseline=dump(names[0]);await fs.writeFile(run+'/baseline.sql',baseline);const before=fingerprints(names[0]);report.idempotent=phase('idempotent');assert.equal(report.idempotent.created,0);assert.deepEqual(report.idempotent.ids,report.import.ids);assert.deepEqual(fingerprints(names[0]),before,'idempotent import must not write');
 const webPort=await port();await fs.writeFile(run+'/router.php',"<?php $_SERVER['HTTP_HOST']='stg.playpoint-sim.com';require "+quote(wp+'/index.php')+';');
 http=spawn(php,[...phpBase,'-S','127.0.0.1:'+webPort,run+'/router.php'],{windowsHide:true,stdio:'ignore',env:{...process.env,PP_BATCH_DB:names[0],PP_BATCH_READER:'1'}});
 let webReady=false;for(let i=0;i<30;i++){try{const r=await fetch('http://127.0.0.1:'+webPort+data.articles[0].path);if(r.status===200){webReady=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(webReady,'local HTTP route');
 report.http=[];for(const entry of data.articles){const r=await fetch('http://127.0.0.1:'+webPort+entry.path),html=await r.text();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.ok(r.headers.get('x-robots-tag')?.includes('noindex'));assert.ok(html.includes('https://playpoint-sim.com'+entry.path));assert.ok(html.includes('<title>'+entry.title.replaceAll('&','&amp;')+'</title>'));assert.equal((html.match(/<table\b/gi)||[]).length,entry.counts.tables);await fs.writeFile(run+'/'+entry.slug+'.html',html);report.http.push({path:entry.path,status:r.status,bytes:Buffer.byteLength(html),tables:entry.counts.tables,images:entry.counts.images});}
 report.assets=[];for(const extension of ['css','js','webp']){const [key,a]=Object.entries(data.assets).find(([,a])=>a.path.endsWith('.'+extension)),r=await fetch('http://127.0.0.1:'+webPort+'/cms/index.php?pp_batch_asset='+key),bytes=Buffer.from(await r.arrayBuffer());assert.equal(r.status,200);assert.equal(digest(bytes),a.servedSha256||a.sourceSha256);report.assets.push({extension,status:r.status,contentType:r.headers.get('content-type'),cache:r.headers.get('cache-control'),hashEqual:true});}
 for(const query of ['unknown','../../wp-config.php','x[]']){const r=await fetch('http://127.0.0.1:'+webPort+'/cms/index.php?pp_batch_asset='+encodeURIComponent(query));assert.equal(r.status,404);}
 assert.deepEqual(fingerprints(names[0]),before,'HTTP reads must not write DB');
 report.edited=phase('edit');assert.ok(report.edited.articles[0].titleChanged&&report.edited.articles[0].listTitleChanged&&report.edited.articles[0].renderTitleChanged&&report.edited.articles[0].bodyMarkerSearchable);
 assert.equal(report.edited.articles[0].category,'隔離・バッチ分類');assert.deepEqual(report.edited.articles[0].tags,['隔離・バッチタグ']);report.customTitle=phase('custom-title');assert.equal(report.customTitle.articles[0].listTitle,'手書きの一覧見出し');
 report.draft=phase('draft');assert.equal(report.draft.articles[0].listed,0);assert.equal(report.draft.articles[0].indexed,0);assert.equal(report.draft.articles[0].rendered,false);const hidden=await fetch('http://127.0.0.1:'+webPort+data.articles[0].path);assert.equal(hidden.status,404);
 call(maria+'/bin/mariadb.exe',[...args,names[1]],{input:baseline});assert.deepEqual(fingerprints(names[1]),before,'restore all table schema and data');report.restored=phase('read',names[1],true);assert.equal(report.restored.generation,report.import.generation);assert.ok(report.restored.articles.every(a=>a.storedContentExact&&a.titleMatches&&a.listed===1&&a.indexed===1&&a.rendered));assert.deepEqual(fingerprints(names[1]),before);
 report.all23TableFingerprintsEqual=true;report.status='passed';report.completedAtUtc=new Date().toISOString();await fs.writeFile(work+'/last-private-run.txt',run);
}catch(error){if(error.privateText)await fs.writeFile(run+'/private-error.txt',error.privateText);report.status='failed';report.failure=error.message;throw new Error(error.message);}finally{
 if(http){http.kill();await new Promise(r=>http.exitCode!==null?r():http.once('exit',r));}
 if(db){try{call(maria+'/bin/mariadb-admin.exe',['--defaults-file='+defaults,'shutdown']);}catch{db.kill();}await new Promise(r=>db.exitCode!==null?r():db.once('exit',r));}
 report.serversStopped=true;report.stoppedAtUtc=new Date().toISOString();await fs.writeFile(run+'/server-stopped.txt',report.stoppedAtUtc);await fs.writeFile(out+'/article-batch-native.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,failure:report.failure,created:report.import?.created,all23TableFingerprintsEqual:report.all23TableFingerprintsEqual,serversStopped:report.serversStopped}));
}
