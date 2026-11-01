const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const links=require('../tools/wordpress/article-batch-links.js');
const repo=path.resolve(__dirname,'..');

test('CSP対応メディア補助はstgの管理者に限定し、安全な画像HTMLを読取りだけで作る',async t=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'playpoint-media-'));
 try{
  await fs.mkdir(temporary+'/uploads');await fs.mkdir(temporary+'/uploads-other');
  await fs.writeFile(temporary+'/uploads/image.png','fixture');await fs.writeFile(temporary+'/uploads-other/image.png','outside');
  const fixture=`<?php
define('ABSPATH',($argv[1]??'stg')==='path' ? '/production/cms/' : '/home/hajikkoroom/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms/');
$_SERVER['HTTP_HOST']=($argv[1]??'stg')==='host' ? 'playpoint-sim.com' : 'stg.playpoint-sim.com';
$hooks=[];$allowed=true;$uploadAllowed=true;$admin=($argv[1]??'stg')!=='public';
function is_admin(){global $admin;return $admin;}
function add_filter($name,$fn){global $hooks;$hooks[$name]=$fn;}
function add_action($name,$fn){global $hooks;$hooks[$name]=$fn;}
function current_user_can($cap,...$args){global $allowed,$uploadAllowed;return $allowed&&($cap!=='upload_files'||$uploadAllowed);}
$post=(object)['ID'=>12,'post_type'=>'attachment','post_status'=>'inherit','post_mime_type'=>'image/png','post_title'=>'長い題名 <script>alert(1)</script>'];
$root=__DIR__.'/uploads';$file=$root.'/image.png';$url='https://stg.playpoint-sim.com/cms/wp-content/uploads/2026/10/image.png';$width=520;
function get_post($id){global $post;return $id===12?$post:null;}
function wp_get_upload_dir(){global $root;return ['basedir'=>$root];}
function get_attached_file($id){global $file;return $file;}
function wp_get_attachment_image_src($id,$size){global $url,$width;return [$url,$width,472,false];}
function wp_parse_url($url){return parse_url($url);}
function get_post_meta(...$args){return '説明 " onerror="alert(1) </textarea><script>bad</script>' ;}
function esc_attr($value){return htmlspecialchars((string)$value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function esc_url($value){return esc_attr($value);}
function esc_html($value){return esc_attr($value);}
function esc_textarea($value){return esc_attr($value);}
function wp_basename($value){return basename($value);}
function admin_url($path){return 'https://stg.playpoint-sim.com/cms/wp-admin/'.$path;}
function sanitize_text_field($value){return strip_tags($value);}
function wp_unslash($value){return stripslashes($value);}
function get_edit_post_link($id,$context){return admin_url('post.php?post='.$id.'&action=edit');}
function add_query_arg($args,$base){return $base.'&'.http_build_query($args);}
function wp_die(...$args){throw new RuntimeException('denied');}
class WP_Query {public $posts,$max_num_pages=2;function __construct($args){global $post,$queryArgs;$this->posts=[$post];$queryArgs=$args;}}
require ${JSON.stringify(repo+'/tools/wordpress/media-staging.php')};
if(($argv[1]??'stg')!=='stg'){echo json_encode(['hooks'=>array_keys($hooks)]);exit;}
$good=ppms_image(12);$rejected=[];
foreach(['https://playpoint-sim.com/cms/wp-content/uploads/x.png','https://stg.playpoint-sim.com.evil.example/cms/wp-content/uploads/x.png','http://stg.playpoint-sim.com/cms/wp-content/uploads/x.png','//stg.playpoint-sim.com/cms/wp-content/uploads/x.png','https://stg.playpoint-sim.com:8443/cms/wp-content/uploads/x.png','https://u:p@stg.playpoint-sim.com/cms/wp-content/uploads/x.png','https://stg.playpoint-sim.com/cms/wp-content/uploads-old/x.png','https://stg.playpoint-sim.com/cms/wp-content/uploads/%2e%2e/x.png','https://stg.playpoint-sim.com/cms/wp-content/uploads/%252e%252e/x.png','https://stg.playpoint-sim.com/cms/wp-content/uploads/a%5cb.png'] as $bad){$url=$bad;$rejected[]=ppms_image(12)===null;}
$url=$good['url'];$file=__DIR__.'/uploads-other/image.png';$rejected[]=ppms_image(12)===null;
$file=$root.'/missing.png';$rejected[]=ppms_image(12)===null;$file=$root.'/image.png';
$post->post_mime_type='image/svg+xml';$rejected[]=ppms_image(12)===null;$post->post_mime_type='image/png';
$post->post_status='trash';$rejected[]=ppms_image(12)===null;$post->post_status='inherit';
$width=0;$rejected[]=ppms_image(12)===null;$width=520;
$allowed=false;$rejected[]=ppms_image(12)===null;try{ppms_page();$denied=false;}catch(RuntimeException $error){$denied=true;}$allowed=true;
$uploadAllowed=false;try{ppms_page();$uploadDenied=false;}catch(RuntimeException $error){$uploadDenied=true;}$uploadAllowed=true;
$_GET=['image'=>'12','s'=>'<script>search</script>','paged'=>'1'];ob_start();ppms_page();$html=ob_get_clean();
$_GET=['image'=>['12'],'s'=>['array'],'paged'=>['2']];ob_start();ppms_page();$arrayHtml=ob_get_clean();
$_GET=['paged'=>'99999999999999999999999999'];ob_start();ppms_page();ob_end_clean();
$mode=$hooks['get_user_option_media_library_mode']('grid');$allowed=false;$nonAdminMode=$hooks['get_user_option_media_library_mode']('grid');
echo json_encode(['good'=>$good,'rejected'=>$rejected,'denied'=>$denied,'uploadDenied'=>$uploadDenied,'html'=>$html,'arrayHtml'=>$arrayHtml,'pageSize'=>$queryArgs['posts_per_page'],'maxPage'=>$queryArgs['paged'],'mode'=>$mode,'nonAdminMode'=>$nonAdminMode,'missing'=>ppms_image(404)]);
`;
  await fs.writeFile(temporary+'/fixture.php',fixture);
  const run=mode=>spawnSync(process.env.PLAYPOINT_PHP_BINARY||'php',['-n',temporary+'/fixture.php',mode],{encoding:'utf8'});
  const result=run('stg');
  if(result.error?.code==='ENOENT'){t.diagnostic('PHP実行環境なし。メディア補助のPHP検査は対応環境で実行する。');return;}
  assert.ifError(result.error);assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');
  const actual=JSON.parse(result.stdout);
  assert.equal(actual.good.width,520);assert.equal(actual.good.height,472);
  assert.ok(actual.good.html.includes('alt="説明 &quot; onerror=&quot;alert(1) &lt;/textarea&gt;&lt;script&gt;bad&lt;/script&gt;"'));
  assert.ok(actual.rejected.every(Boolean));assert.equal(actual.rejected.length,16);
  assert.equal(actual.denied,true);assert.equal(actual.uploadDenied,true);assert.equal(actual.missing,null);
  assert.equal(actual.mode,'list');assert.equal(actual.nonAdminMode,'grid');assert.equal(actual.pageSize,20);assert.equal(actual.maxPage,10000);
  assert.ok(actual.html.includes('media-new.php?browser-uploader=1'));assert.ok(actual.html.includes('upload.php?mode=list'));
  assert.ok(actual.html.includes('id="ppms-html"'));assert.ok(actual.html.includes('&lt;img src='));
  assert.ok(!actual.html.includes('<script>'));assert.ok(!actual.html.includes('onerror="'));assert.ok(!actual.html.includes('<form method="post"'));
  assert.ok(actual.arrayHtml.includes('この画像は利用できません'));assert.ok(!actual.arrayHtml.includes('id="ppms-html"'));
  for(const mode of ['host','path','public']){const boundary=run(mode);assert.equal(boundary.status,0,boundary.stderr);assert.deepEqual(JSON.parse(boundary.stdout).hooks,[],mode+' cannot register admin hooks');}
 }finally{await fs.rm(temporary,{recursive:true});}
});

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
 const diary='https://playpoint-sim.com/?mode=diary&week=current#weekly-reward-record';
 for(const source of ['/?mode=diary&week=current#weekly-reward-record','../?mode=diary&week=current#weekly-reward-record',diary,diary.replace('playpoint-sim.com','stg.playpoint-sim.com')]){
  assert.equal(links.link(source,config),diary,'diary links retain their original mode, week and fragment on the public site');
  assert.equal(links.link(links.link(source,config),config),diary,'the second URL pass must not turn the diary into the normal calculator');
 }
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

test('WP画像と検索フォームをstgへ接続し、計算用フォームの属性と内容を保持する',async t=>{
 const config={path:'/articles/test.html',paths:['/articles/test.html'],assets:{'/images/test.webp':'/cms/index.php?pp_batch_asset=fixture/images/test.webp'}};
 const media='/cms/wp-content/uploads/2026/10/editor-image.webp?size=large&v=1#preview';
 const expected='https://stg.playpoint-sim.com'+media;
 const inputs=[media,'../cms/wp-content/uploads/2026/10/editor-image.webp?size=large&v=1#preview',expected,'//stg.playpoint-sim.com'+media];
 for(const value of inputs){
  assert.equal(links.link(value,config),expected);
  assert.equal(links.link(links.link(value,config),config),expected,'PHP出力後の動的変換でもstgを保持する');
  assert.equal(links.asset(value,config),value,'固定assetの許可リストへ追加しない');
 }
 const unchanged=['https://playpoint-sim.com'+media,'https://elsewhere.example'+media,'//stg.playpoint-sim.com.evil.example'+media];
 for(const value of unchanged)assert.equal(links.link(value,config),value);
 for(const value of ['/cms/wp-content/uploads-old/editor.webp','/cms/wp-content/uploads','/cms/wp-content/uploads/../outside.webp','/cms/wp-content/uploads/%2e%2e/outside.webp']){
  const target=new URL(value,'https://playpoint-sim.com');
  assert.equal(links.link(value,config),target.href,'uploads以外の従来の接続先を保持する');
 }
 const template=await fs.readFile(repo+'/tools/wordpress/article-batch-staging.php','utf8');
 const functions=template.slice(template.indexOf('function ppab_asset_url('),template.indexOf('function ppab_replace_meta('));
 const cases=[...inputs,...unchanged,'/cms/wp-content/uploads-old/editor.webp','/cms/wp-content/uploads','/cms/wp-content/uploads/../outside.webp','/cms/wp-content/uploads/%2e%2e/outside.webp'];
 const calculator='<form id="calculator" action="/calculate?x=1&amp;y=2" method="post" onsubmit="return false"><input id="amount" name="amount" value="10"><button type="submit">計算</button></form>';
 const noAction='<form id="calendar"><input type="checkbox" name="day" value="friday"></form>';
 const similarClass='<form class="sidebar-search-form-extra" action="/original"><input name="original"></form>';
 const search='<form class="other sidebar-search-form" action="/blog/" method="get"><input name="q"></form>';
 const inline='<script>const example = \'<form class="sidebar-search-form" action="/keep"><input name="keep"></form>\';</script>';
 const html='<a href="'+expected.replaceAll('&','&amp;')+'"><img src="'+media.replaceAll('&','&amp;')+'" srcset="'+media.replaceAll('&','&amp;')+' 640w, https://playpoint-sim.com'+media.replaceAll('&','&amp;')+' 1280w"><source srcset="'+expected.replaceAll('&','&amp;')+' 2x, https://elsewhere.example'+media.replaceAll('&','&amp;')+' 3x"></a><img src="/images/test.webp">'+calculator+noAction+similarClass+search+inline;
 const diary='https://playpoint-sim.com/?mode=diary&week=current#weekly-reward-record';
 const diaries=['/?mode=diary&week=current#weekly-reward-record','../?mode=diary&week=current#weekly-reward-record',diary,diary.replace('playpoint-sim.com','stg.playpoint-sim.com')];
 const fixture=Buffer.from(JSON.stringify({cases,html,diaries})).toString('base64');
 const php='<?php function ppab_data(){return ["generation"=>"fixture","assets"=>["fixture/images/test.webp"=>[]]];} function ppab_entries(){return [["path"=>"/articles/test.html"]];}\n'+functions+'\n$fixture=json_decode(base64_decode("'+fixture+'"),true);echo json_encode(["urls"=>array_map(fn($value)=>ppab_public_url($value,"/articles/test.html"),$fixture["cases"]),"diaries"=>array_map(fn($value)=>ppab_public_url($value,"/articles/test.html"),$fixture["diaries"]),"html"=>ppab_rewrite_html($fixture["html"],"/articles/test.html")],JSON_UNESCAPED_SLASHES);';
 const result=spawnSync(process.env.PLAYPOINT_PHP_BINARY||'php',['-n'],{input:php,encoding:'utf8'});
 if(result.error?.code==='ENOENT'){t.diagnostic('PHP実行環境なし。JS境界は検査済み、PHP経路は対応環境で検査する。');return;}
 assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
 const actual=JSON.parse(result.stdout);
 assert.deepEqual(actual.diaries,diaries.map(()=>diary));
 for(const url of actual.diaries)assert.equal(links.link(url,config),diary,'PHP output and the later JavaScript pass preserve the same diary destination');
 assert.deepEqual(actual.urls.slice(0,inputs.length),inputs.map(()=>expected));
 assert.deepEqual(actual.urls.slice(inputs.length,inputs.length+unchanged.length),unchanged);
 assert.equal(actual.urls.at(-4),'https://playpoint-sim.com/cms/wp-content/uploads-old/editor.webp');
 assert.equal(actual.urls.at(-3),'https://playpoint-sim.com/cms/wp-content/uploads');
 assert.equal(actual.urls.at(-2),'https://playpoint-sim.com/cms/wp-content/uploads/../outside.webp');
 assert.equal(actual.urls.at(-1),'https://playpoint-sim.com/cms/wp-content/uploads/%2e%2e/outside.webp');
 const escaped=expected.replaceAll('&','&amp;'),production=('https://playpoint-sim.com'+media).replaceAll('&','&amp;');
 assert.ok(actual.html.includes('href="'+escaped+'"'));
 assert.ok(actual.html.includes('src="'+escaped+'"'));
 assert.ok(actual.html.includes('srcset="'+escaped+' 640w, '+production+' 1280w"'));
 assert.ok(actual.html.includes('srcset="'+escaped+' 2x, '+('https://elsewhere.example'+media).replaceAll('&','&amp;')+' 3x"'));
 assert.ok(actual.html.includes('src="/cms/index.php?pp_batch_asset=fixture/images/test.webp"'),'既存の固定画像assetを保持する');
 assert.equal(links.link(actual.urls[0],config),expected);
 for(const original of [calculator,noAction,similarClass,inline])assert.ok(actual.html.includes(original),'non-search forms and script literals retain their original bytes');
 assert.ok(actual.html.includes('class="other sidebar-search-form" action="https://stg.playpoint-sim.com/blog/" method="get"'));
 assert.equal((actual.html.match(/name="pp_flow"/g)||[]).length,1);
 assert.equal((actual.html.match(/name="pp_catalog"/g)||[]).length,1);
});

test('三者比較は旧WP本文の再利用・WP編集・双方の衝突を区別し、未取得を成功扱いしない',async()=>{
 const {diagnoseArticleBatch}=await import('../tools/wordpress/article-batch-diagnose.mjs');
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const pack=changes=>{
  const entry={path:'/articles/fixture.html',before:'<html><article>',hero:'<header><h1>題名</h1></header>',content:'<p>非公開の読戻し本文</p>',after:'</article></html>',title:'題名',description:'元の説明',published:'2026-10-01',modified:'2026-10-02',listTitle:'一覧名',category:'分類',tags:['B','A'],...changes};
  entry.sourceSha256=hash(entry.before+entry.hero+entry.content+entry.after);entry.contentSha256=hash(entry.content);return {version:1,articles:[entry]};
 };
 const base=pack(),entry=base.articles[0];
 const current={version:1,source:'wordpress-readback',site:'https://stg.playpoint-sim.com',capturedAt:'2026-11-01T00:00:00Z',posts:[{ID:34,post_status:'publish',post_password_present:false,post_title:entry.title,post_content:entry.content,post_excerpt:entry.description,post_date:entry.published+' 00:00:00',post_modified:entry.modified+' 00:00:00',category:entry.category,tags:['A','B'],meta:{playpoint_batch_path:entry.path,playpoint_batch_source_sha256:entry.sourceSha256,the_page_meta_description:entry.description,playpoint_list_title:entry.listTitle,playpoint_batch_auto_list_title:entry.listTitle,playpoint_batch_auto_post_title:entry.title}}]};
 const original=JSON.stringify({base,current});
 const candidate=pack({content:'<p>新しい原稿</p>',hero:'<header><h1>新しい外枠</h1></header>'});
 let report=diagnoseArticleBatch(base,candidate,current),article=report.articles[0];
 assert.equal(article.status,'source-update-needed');assert.equal(article.fields.content.state,'source-only');assert.equal(article.wouldCombineNewShellWithDifferentWordPress,true);
 assert.equal(article.fields.tags.state,'unchanged','tag order does not create a false edit');
 assert.equal(report.deploymentApproved,false);assert.equal(report.wordpressWrites,0);assert.equal(report.networkRequests,0);
 assert.ok(!JSON.stringify(report).includes('非公開の読戻し本文'),'the report must not expose body text');
 const edited=structuredClone(current);edited.posts[0].post_content='<p>WPで編集した本文</p>';
 article=diagnoseArticleBatch(base,base,edited).articles[0];assert.equal(article.status,'preserve-wordpress-edits');assert.equal(article.fields.content.state,'wordpress-only');
 article=diagnoseArticleBatch(base,candidate,edited).articles[0];assert.equal(article.status,'conflict');assert.deepEqual(article.conflictingFields,['content']);
 edited.posts[0].post_content=candidate.articles[0].content;
 article=diagnoseArticleBatch(base,candidate,edited).articles[0];assert.equal(article.fields.content.state,'converged');assert.equal(article.status,'no-owned-field-difference');
 const metaCandidate=pack({title:'候補題名',description:'候補説明',published:'2026-10-03',modified:'2026-10-04'}),metaEdit=structuredClone(current);
 metaEdit.posts[0].post_title='WP題名';metaEdit.posts[0].meta.the_page_meta_description='';metaEdit.posts[0].post_excerpt='WP抜粋';metaEdit.posts[0].post_date='2026-10-05 15:00:00';metaEdit.posts[0].post_modified='2026-10-06 16:00:00';
 article=diagnoseArticleBatch(base,metaCandidate,metaEdit).articles[0];
 for(const field of ['title','description','excerpt','published','modified'])assert.equal(article.fields[field].state,'conflict',field+' has an independent owner');
 assert.equal(article.autoTitleTrackingMatchesPost,false);
 const sameDay=structuredClone(current);sameDay.posts[0].post_modified='2026-10-02 16:00:00';sameDay.posts[0].meta.playpoint_list_title='手書きの一覧名';
 article=diagnoseArticleBatch(base,base,sameDay).articles[0];assert.equal(article.fields.modified.state,'unchanged');assert.equal(article.wordpressTimestampChanged.modified,true);assert.equal(article.customListTitle,true);
 const hidden=structuredClone(current);hidden.posts[0].post_status='draft';hidden.posts[0].post_password_present=true;
 report=diagnoseArticleBatch(base,base,hidden);assert.equal(report.status,'review-required');assert.equal(report.articles[0].wordpressState.rendered,false);
 report=diagnoseArticleBatch(base,candidate);assert.equal(report.status,'unverified');assert.equal(report.articles[0].reason,'current-wordpress-not-read');assert.equal(report.articles[0].fields,undefined);
 report=diagnoseArticleBatch(base,candidate,{...current,posts:[]});assert.equal(report.articles[0].reason,'current-post-not-read');
 const mismatched=structuredClone(current);mismatched.posts[0].meta.playpoint_batch_source_sha256='0'.repeat(64);
 report=diagnoseArticleBatch(base,candidate,mismatched);assert.equal(report.status,'unverified');assert.equal(report.articles[0].reason,'baseline-source-meta-mismatch');assert.equal(report.articles[0].fields,undefined);
 const incomplete=structuredClone(current);delete incomplete.posts[0].meta.the_page_meta_description;
 assert.throws(()=>diagnoseArticleBatch(base,candidate,incomplete),/missing the_page_meta_description/);
 assert.throws(()=>diagnoseArticleBatch(base,candidate,{...current,posts:[...current.posts,...current.posts]}),/duplicate WordPress/);
 const corrupted=structuredClone(candidate);corrupted.articles[0].content+='changed';
 assert.throws(()=>diagnoseArticleBatch(base,corrupted,current),/package source hash mismatch/);
 assert.equal(JSON.stringify({base,current}),original,'diagnosis must not mutate package or readback data');
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'playpoint-three-way-'));
 try{
  const {gzipSync}=require('node:zlib'),baselineFile=path.join(temporary,'import.php'),currentFile=path.join(temporary,'current.json'),candidateFile=path.join(temporary,'candidate.json');
  const baselineText="<?php throw new Exception('must not execute'); base64_decode('"+gzipSync(Buffer.from(JSON.stringify(base))).toString('base64')+"');";
  await fs.writeFile(baselineFile,baselineText);await fs.writeFile(currentFile,JSON.stringify(current));await fs.writeFile(candidateFile,JSON.stringify(candidate));
  const run=file=>spawnSync(process.execPath,[repo+'/tools/wordpress/article-batch-diagnose.mjs',baselineFile,file,candidateFile],{encoding:'utf8'});
  const unknown=run('-');assert.equal(unknown.status,2,unknown.stderr);assert.equal(JSON.parse(unknown.stdout).status,'unverified');
  const known=run(currentFile);assert.equal(known.status,0,known.stderr);assert.equal(JSON.parse(known.stdout).articles[0].status,'source-update-needed');
  await fs.writeFile(currentFile,'{"sensitive": NOT_VALID_PRIVATE_CONTENT}');const invalid=run(currentFile);
  assert.equal(invalid.status,1);assert.ok(!invalid.stderr.includes('NOT_VALID_PRIVATE_CONTENT'),'JSON parsing errors do not echo private data');
  assert.equal(await fs.readFile(baselineFile,'utf8'),baselineText);assert.deepEqual((await fs.readdir(temporary)).sort(),['candidate.json','current.json','import.php'],'CLI writes no files');
 }finally{await fs.rm(temporary,{recursive:true});}
});

test('stg更新パッケージは同じcheckoutの台帳と本文索引をそろえ、記事本文を変更しない',async()=>{
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'playpoint-catalog-bundle-'));
 try{
  const source="<?php\n// /home/hajikkoroom/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms\nfunction ppfn_shell_data() { return ppfn_data()['shell']; }\nfunction fixture($content) {\n  return $content;\n}\nadd_action('init',function(){\necho ppfn_data()['harness'];\necho ppfn_data()['article']['breadcrumb'];\n});\n";
  const input=path.join(temporary,'previous.php'),output=path.join(temporary,'candidate');
  await fs.writeFile(input,source);
  const result=spawnSync(process.execPath,[repo+'/tools/wordpress/build-staging.mjs',input,output],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);
  for(const [generated,original] of [['playpoint-catalog-base.json','blog/articles.json'],['playpoint-article-search-index.json','blog/article-search-index.json']]){
   const actual=await fs.readFile(path.join(output,generated)),expected=await fs.readFile(path.join(repo,original));
   assert.deepEqual(actual,expected,'the candidate uses the current repository bytes: '+original);
   assert.equal(report.files[generated].sha256,createHash('sha256').update(expected).digest('hex'));
  }
  assert.equal(await fs.readFile(input,'utf8'),source,'the backed-up plugin is not overwritten');
  assert.equal(report.payloadUnchanged,true);assert.equal(report.newIntegrationPoints,4);
  const catalog=JSON.parse(await fs.readFile(path.join(output,'playpoint-catalog-base.json'),'utf8'));
  const index=JSON.parse(await fs.readFile(path.join(output,'playpoint-article-search-index.json'),'utf8'));
  const listed=catalog.filter(row=>row.listed!==false).map(row=>new URL(row.file,'https://playpoint-sim.com/blog/').pathname).sort();
  assert.deepEqual(index.articles.map(row=>row.path).sort(),listed,'every currently listed article is searchable');
 }finally{await fs.rm(temporary,{recursive:true});}
});

test('記事パッケージは原文と入力操作を保持し、未受入形式のpreviewではWP登録と取り込みを行わない',async t=>{
 const {buildArticleBatch,splitArticle,selectedPaths}=await import('../tools/wordpress/article-batch-build.mjs');
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
  const catalog=JSON.parse(await fs.readFile(repo+'/blog/articles.json','utf8'));
  let commentPrefixed=0;
  for(const row of catalog.filter(row=>row.listed!==false)){
   const pathname=new URL(row.file,'https://playpoint-sim.com/blog/').pathname,original=await fs.readFile(repo+pathname,'utf8');
   const inner=original.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i)[1];
   const prefix=inner.slice(0,inner.indexOf('<header'));
   if(!prefix.includes('<!--'))continue;
   const parts=splitArticle(original),expectedHero=inner.slice(0,inner.indexOf('</header>')+'</header>'.length);
   assert.equal(parts.hero,expectedHero,'leading comments and the complete hero retain their original bytes: '+pathname);
   assert.equal(parts.before+parts.hero+parts.content+parts.after,original,'exact source reconstruction: '+pathname);
   assert.equal(parts.content,inner.slice(expectedHero.length),'comments do not move into the editable article body: '+pathname);
   assert.throws(()=>splitArticle(original.replace(prefix,prefix+'<p>先頭の本文は削らない</p>')),/source article header/,'non-comment content before the header is not silently consumed');
   commentPrefixed++;
  }
  assert.ok(commentPrefixed>0,'the current catalog exercises actual comment-prefixed articles');
  const comments=' \n<!-- <header>コメント内の見出し</header> -->\t'.repeat(12000);
  const fixtureHero='<header><h1>実際の見出し</h1></header>',fixtureBody='<p>元の本文</p>';
  const fixture='<article class="content">'+comments+fixtureHero+fixtureBody+'</article>',split=splitArticle(fixture);
  assert.equal(split.hero,comments+fixtureHero,'many consecutive comments are preserved without selecting a header inside a comment');
  assert.equal(split.content,fixtureBody);assert.equal(split.before+split.hero+split.content+split.after,fixture);
  assert.throws(()=>splitArticle('<article class="content">'+comments+'<!-- 閉じ忘れ'+'x'.repeat(100000)+fixtureHero+fixtureBody+'</article>'),/source article header/,'an unterminated comment is rejected without dropping source bytes');
  const originalSelection=selectedPaths.slice();
  try{
   for(const pathname of ['/games/monst/google-play-vs-webshop/index.html','/articles/2026-09-19-play-points-calendar-schedule-guide.html','/articles/2026-07-24-play-points-1-value.html']){
    selectedPaths.splice(0,selectedPaths.length,pathname);
    await assert.rejects(buildArticleBatch(temporary),/exclude interactive articles/,'actual source controls remain excluded: '+pathname);
   }
  }finally{selectedPaths.splice(0,selectedPaths.length,...originalSelection);}
  assert.deepEqual(selectedPaths,originalSelection,'temporary control fixtures cannot change the selected three articles');
  assert.equal(createHash('sha256').update(await fs.readFile(temporary+'/playpoint-article-batch-staging.php')).digest('hex'),manifest.phpSha256,'rejected control fixtures cannot overwrite the generated three-article candidate');
  const previewPaths=['/games/monst/google-play-vs-webshop/index.html','/articles/2026-09-19-play-points-calendar-schedule-guide.html','/articles/2026-07-24-play-points-1-value.html','/articles/2026-08-17-diamond-valley-festival-guide.html'];
  const preview=await buildArticleBatch(temporary+'/preview',{previewPaths});
  assert.equal(preview.manifest.previewOnly,true);assert.equal(preview.manifest.importAllowed,false);assert.equal(preview.manifest.wordpressHooksEnabled,false);assert.equal(preview.manifest.deploymentPath,null);
  for(const entry of preview.data.articles){
   const original=await fs.readFile(repo+entry.path,'utf8');
   assert.equal(entry.before+entry.hero+entry.content+entry.after,original,'all controls, scripts, styles and identifiers reconstruct exactly: '+entry.path);
  }
  const diamond=preview.data.articles.at(-1);
  assert.ok(diamond.hero.includes('<nav class="breadcrumb-nav"'));assert.ok(diamond.hero.includes('<h1>'));assert.ok(diamond.hero.includes('data-article-date="modified"'));
  assert.ok(!diamond.hero.includes('ゲームの中で集めたダイヤ'));assert.ok(diamond.content.trimStart().startsWith('<p>ゲームの中で集めたダイヤ'));
  assert.throws(()=>splitArticle((diamond.before+diamond.hero+diamond.content+diamond.after).replace('<h1>','<p>先頭本文を隠さない</p><h1>')),/source article header/);
  assert.throws(()=>splitArticle((diamond.before+diamond.hero+diamond.content+diamond.after).replace('class="article-meta"','class="unrelated"')),/source article header/);
  for(const name of ['/js/monst-purchase-comparison.js','/js/reader-calendar.js','/js/play-points-rounding.js'])assert.equal(preview.data.assets[preview.data.generation+name].text,await fs.readFile(repo+name,'utf8'),'interactive controllers retain their original code');
  await assert.rejects(buildArticleBatch(temporary+'/invalid',{previewPaths:['/articles/../private.html']}),/source path boundary/);
  const php='<?php define("ABSPATH","/home/hajikkoroom/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms/");$_SERVER["HTTP_HOST"]="stg.playpoint-sim.com";$hooks=[];function add_action(...$args){global $hooks;$hooks[]=$args[0];}function add_filter(...$args){global $hooks;$hooks[]=$args[0];}require '+JSON.stringify(temporary+'/preview/playpoint-article-batch-staging.php')+';$pages=[];foreach(ppab_entries() as $entry){$pages[]=ppab_render($entry,["status"=>"publish","title"=>$entry["title"],"description"=>$entry["description"],"html"=>$entry["content"],"published"=>$entry["published"],"modified"=>$entry["modified"]]);}try{ppab_import();$blocked=false;}catch(RuntimeException $error){$blocked=true;}echo json_encode(["hooks"=>$hooks,"importBlocked"=>$blocked,"pages"=>$pages]);';
  const rendered=spawnSync(process.env.PLAYPOINT_PHP_BINARY||'php',['-n'],{input:php,encoding:'utf8'});
  if(rendered.error?.code==='ENOENT'){t.diagnostic('PHP実行環境なし。previewのPHP描画・操作検証は未完了。');return;}
  assert.ifError(rendered.error);assert.equal(rendered.status,0,rendered.stderr);const actual=JSON.parse(rendered.stdout);
  assert.deepEqual(actual.hooks,[],'preview cannot register WordPress routes or management actions');assert.equal(actual.importBlocked,true,'preview cannot import even when its function is called directly');
  for(const [index,html] of actual.pages.entries()){
   const entry=preview.data.articles[index],original=entry.before+entry.hero+entry.content+entry.after;
   for(const form of original.matchAll(/<form\b[^>]*>/gi))if(!form[0].includes('sidebar-search-form'))assert.ok(html.includes(form[0]),'the rendered input form keeps its attributes: '+entry.path);
   for(const script of original.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/application\/ld\+json/.test(script[1])&&script[2].trim())assert.ok(html.includes(script[2]),'inline executable code remains intact: '+entry.path);
   const canonical=original.match(/<link\b[^>]*\brel="canonical"[^>]*>/i)?.[0];
   assert.ok(canonical&&html.includes(canonical),'the original canonical, including directory-style game URLs, is retained');
   assert.ok(html.includes(original.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)[0]),'an unchanged source title must not add its site-name suffix to h1');
  }
 }finally{
  const resolved=await fs.realpath(temporary),tempRoot=await fs.realpath(os.tmpdir());
  assert.ok(resolved.startsWith(tempRoot+path.sep)&&path.basename(resolved).startsWith('playpoint-article-batch-'));
  await fs.rm(resolved,{recursive:true});
 }
});
