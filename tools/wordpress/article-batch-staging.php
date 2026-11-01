<?php
/** Plugin Name: PlayPoint stg article batch */
if (!defined('ABSPATH')) exit;
if (rtrim(str_replace('\\','/',ABSPATH),'/') !== '/home/hajikkoroom/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms') return;
if (strtolower($_SERVER['HTTP_HOST'] ?? '') !== 'stg.playpoint-sim.com') return;

function ppab_data() {
    static $value;
    if ($value === null) $value=json_decode(gzdecode(base64_decode('__PLAYPOINT_ARTICLE_BATCH__')),true,512,JSON_THROW_ON_ERROR);
    return $value;
}
function ppab_entries() { return ppab_data()['articles']; }
function ppab_ids() {
    $result=[];
    foreach(ppab_entries() as $entry) {
        $posts=get_posts(['post_type'=>'post','post_status'=>'any','posts_per_page'=>2,'meta_key'=>'playpoint_batch_path','meta_value'=>$entry['path'],'suppress_filters'=>true]);
        if(count($posts)>1) throw new RuntimeException('同じ試験URLの記事が重複しています。');
        if($posts) $result[$posts[0]->ID]=$entry['path'];
    }
    return $result;
}
add_filter('pp_catalog_mapping',function($mapping){foreach(ppab_ids() as $id=>$path)$mapping[$id]=$path;return $mapping;});

function ppab_asset_url($path) {
    $key=ppab_data()['generation'].$path;
    return isset(ppab_data()['assets'][$key])?'/cms/index.php?pp_batch_asset='.$key:null;
}
function ppab_public_url($value,$sourcePath) {
    if($value===''||preg_match('~^(?:#|data:|mailto:|tel:)~i',$value)) return $value;
    $parts=parse_url(html_entity_decode($value,ENT_QUOTES|ENT_HTML5,'UTF-8'));
    if($parts===false) return $value;
    if(isset($parts['host'])&&!in_array(strtolower($parts['host']),['playpoint-sim.com','stg.playpoint-sim.com'],true))return $value;
    $pathname=$parts['path']??'';
    if(!str_starts_with($pathname,'/')) {
        $pathname=dirname($sourcePath).'/'.$pathname;
        $segments=[];foreach(explode('/',$pathname) as $segment){if($segment===''||$segment==='.')continue;if($segment==='..'){array_pop($segments);continue;}$segments[]=$segment;}
        $trailing=str_ends_with($pathname,'/');
        $pathname='/'.implode('/',$segments).($segments&&$trailing?'/':'');
    }
    $suffix=(isset($parts['query'])?'?'.$parts['query']:'').(isset($parts['fragment'])?'#'.$parts['fragment']:'');
    // WPで追加したstgメディアは固定assetへ加えず、既存の保護下にある元URLを使う。
    if(str_starts_with($pathname,'/cms/wp-content/uploads/')&&(!isset($parts['host'])||strtolower($parts['host'])==='stg.playpoint-sim.com')&&!preg_match('~(?:^|/)(?:\.|%2e){1,2}(?:/|$)~i',$pathname))return 'https://stg.playpoint-sim.com'.$pathname.$suffix;
    if(preg_match('~^/blog/(?:index\.html)?$~',$pathname)) {
        parse_str($parts['query']??'',$query);
        $query=array_filter(array_intersect_key($query,array_flip(['topic','q','game','category','sort','page'])),'is_string');
        $url=function_exists('ppcb_url')?ppcb_url($query):'https://stg.playpoint-sim.com/blog/?'.http_build_query(array_merge(['pp_flow'=>'normal','pp_catalog'=>'live'],$query));
        return $url.(isset($parts['fragment'])?'#'.$parts['fragment']:'');
    }
    if(preg_match('~^/+$~D',$pathname))return 'https://stg.playpoint-sim.com/points-cost/?pp_flow=normal';
    if(preg_match('~^/points-cost/(?:index\.html)?$~D',$pathname)){
        parse_str($parts['query']??'',$query);$query=array_filter($query,'is_string');$query['pp_flow']='normal';
        return 'https://stg.playpoint-sim.com/points-cost/?'.http_build_query($query).(isset($parts['fragment'])?'#'.$parts['fragment']:'');
    }
    $known=array_column(ppab_entries(),'path');
    if(function_exists('ppc_mapping'))$known=array_merge($known,array_values(ppc_mapping()));
    return (in_array($pathname,$known,true)?'https://stg.playpoint-sim.com':'https://playpoint-sim.com').$pathname.$suffix;
}
function ppab_attr($value){return htmlspecialchars($value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function ppab_rewrite_html($html,$sourcePath) {
    $protected=[];
    $html=preg_replace_callback('~<(script|style)\b[^>]*>[\s\S]*?</\1\s*>~i',function($match)use(&$protected){$key='PPAB_PROTECTED_'.count($protected).'_END';$protected[$key]=$match[0];return $key;},$html);
    $html=preg_replace_callback('~<(a|link|script|img|source|form)\b[^>]*>~i',function($match)use($sourcePath){
        $tag=strtolower($match[1]);
        if($tag==='link'&&preg_match('~\brel=["\'](?:canonical|alternate)["\']~i',$match[0]))return $match[0];
        return preg_replace_callback('~\b(href|src|srcset|data-search-module|action)=(["\'])(.*?)\2~is',function($attr)use($tag,$sourcePath){
            $name=strtolower($attr[1]);$value=html_entity_decode($attr[3],ENT_QUOTES|ENT_HTML5,'UTF-8');
            if($name==='srcset') {
                $items=[];foreach(explode(',',$value) as $item){$pair=preg_split('/\s+/',trim($item),2);$url=ppab_public_url($pair[0],$sourcePath);$path=parse_url($url,PHP_URL_PATH);$items[]=(ppab_asset_url($path)??$url).(isset($pair[1])?' '.$pair[1]:'');}$value=implode(', ',$items);
            } elseif($tag==='a') {
                $value=ppab_public_url($value,$sourcePath);$path=parse_url($value,PHP_URL_PATH);if(preg_match('~\.(?:webp|png|jpe?g|gif|avif)$~i',$path??''))$value=ppab_asset_url($path)??$value;
            } elseif($tag==='form') {
                $value='https://stg.playpoint-sim.com/blog/';
            } else {
                $url=ppab_public_url($value,$sourcePath);$path=parse_url($url,PHP_URL_PATH);$value=ppab_asset_url($path)??$url;
            }
            return $attr[1].'='.$attr[2].ppab_attr($value).$attr[2];
        },$match[0]);
    },$html);
    // 外部scriptの開始タグも属性だけ接続し、スクリプト本文を再シリアライズしない。
    foreach($protected as $key=>$block) {
        $block=preg_replace_callback('~^(<script\b[^>]*\bsrc=)(["\'])(.*?)\2~is',function($m)use($sourcePath){$url=ppab_public_url($m[3],$sourcePath);return $m[1].$m[2].ppab_attr(ppab_asset_url(parse_url($url,PHP_URL_PATH))??$url).$m[2];},$block);
        $block=preg_replace_callback('~\bdata-search-module=(["\'])(.*?)\1~is',function($m)use($sourcePath){$url=ppab_public_url($m[2],$sourcePath);return 'data-search-module='.$m[1].ppab_attr(ppab_asset_url(parse_url($url,PHP_URL_PATH))??$url).$m[1];},$block);
        $html=str_replace($key,$block,$html);
    }
    $html=preg_replace_callback('~<form\b[^>]*>~i',fn($m)=>$m[0].'<input type="hidden" name="pp_flow" value="normal"><input type="hidden" name="pp_catalog" value="live">',$html);
    return $html;
}
function ppab_replace_meta($html,$name,$value) {
    return preg_replace_callback('~(<meta\b[^>]*\b(?:name|property)=["\']'.preg_quote($name,'~').'["\'][^>]*\bcontent=)(["\'])(.*?)\2~is',fn($m)=>$m[1].$m[2].ppab_attr($value).$m[2],$html);
}
function ppab_render($entry,$post) {
    if(($post['status']??'')!=='publish'||($post['password']??'')!=='')return null;
    $title=trim(strip_tags($post['title']??''));if($title==='')throw new RuntimeException('試験記事の題名が空です。');
    $description=$post['description']??$entry['description'];
    $hero=preg_replace_callback('~(<h1\b[^>]*>)[\s\S]*?(</h1\s*>)~i',fn($m)=>$m[1].ppab_attr($title).$m[2],$entry['hero']);
    foreach(['published','modified'] as $dateName) {
        $date=substr($post[$dateName]??$entry[$dateName],0,10);
        $hero=preg_replace_callback('~(<time\b[^>]*\bdata-article-date="'.$dateName.'"[^>]*\bdatetime=")[^"]*("[^>]*>)[\s\S]*?(</time>)~i',fn($m)=>$m[1].$date.$m[2].str_replace('-','/',$date).$m[3],$hero);
    }
    $published=substr($post['published']??$entry['published'],0,10);$modified=substr($post['modified']??$entry['modified'],0,10);
    $dateLabel=($modified>$published?'更新':'公開').' '.$modified.' ';
    $hero=preg_replace_callback('~(<details\b[^>]*\bclass="[^"]*\breading-metadata\b[^"]*"[^>]*>\s*<summary>)[\s\S]*?(<span\b[^>]*>日付の詳細</span>)~i',fn($m)=>$m[1].$dateLabel.$m[2],$hero);
    $html=$entry['before'].$hero.$post['html'].$entry['after'];
    $html=preg_replace_callback('~<title>[\s\S]*?</title>~i',fn()=>'<title>'.ppab_attr($title).'</title>',$html);
    foreach(['description','og:description','twitter:description'] as $name)$html=ppab_replace_meta($html,$name,$description);
    foreach(['og:title','twitter:title'] as $name)$html=ppab_replace_meta($html,$name,$title);
    $html=ppab_replace_meta($html,'robots','noindex,nofollow,noarchive');
    $html=ppab_replace_meta($html,'last-modified',substr($post['modified']??$entry['modified'],0,10));
    $html=ppab_replace_meta($html,'article:published_time',$published.'T00:00:00+09:00');
    $html=ppab_replace_meta($html,'article:modified_time',$modified.'T00:00:00+09:00');
    $html=preg_replace_callback('~(<script\b[^>]*\btype=["\']application/ld\+json["\'][^>]*>)([\s\S]*?)(</script>)~i',function($m)use($title,$description,$entry,$post){$data=json_decode($m[2],true);if(!is_array($data)||($data['@type']??'')!=='Article')return $m[0];$data['headline']=$title;$data['description']=$description;foreach(['published'=>'datePublished','modified'=>'dateModified'] as $field=>$key)if(isset($data[$key]))$data[$key]=substr($post[$field]??$entry[$field],0,10).'T00:00:00+09:00';return $m[1].json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP).$m[3];},$html);
    $html=ppab_rewrite_html($html,$entry['path']);
    $snapshot=function_exists('ppc_snapshot')?ppc_snapshot():['catalog'=>[],'search'=>['version'=>1,'articles'=>[]]];
    $assetMap=[];foreach(ppab_data()['assets'] as $key=>$asset)$assetMap[$asset['path']]='/cms/index.php?pp_batch_asset='.$key;
    $mapping=array_column(ppab_entries(),'path');if(function_exists('ppc_mapping'))$mapping=array_merge($mapping,array_values(ppc_mapping()));
    $config=['path'=>$entry['path'],'paths'=>$mapping,'assets'=>$assetMap];
    $json=fn($data)=>json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT);
    $boot='<script id="ppab-config" type="application/json">'.$json($config).'</script>';
    $boot.='<script>window["ga-disable-G-HED6D0FR4L"]=true;window["ga-disable-G-V9EZD7RBM3"]=true;'.ppab_data()['linkScript'].'</script>';
    $snapshots='<script id="ppab-search-snapshot" type="application/json">'.$json($snapshot['search']).'</script><script id="ppab-catalog-snapshot" type="application/json">'.$json($snapshot['catalog']).'</script>';
    foreach(['/blog/common-components.css'=>'data-common-components-style','/articles/source-notice.css'=>'data-article-source-style'] as $path=>$attr)$boot.='<link rel="stylesheet" '.$attr.' href="'.ppab_attr(ppab_asset_url($path)).'">';
    $html=preg_replace_callback('~(<html\b[^>]*)(>)~i',fn($m)=>$m[1].' data-pp-stg-batch="1"'.$m[2],$html,1);
    $html=preg_replace_callback('~</head>~i',fn()=>$boot.'</head>',$html,1);
    return preg_replace_callback('~</body>~i',fn()=>$snapshots.'</body>',$html,1);
}

function ppab_import() {
    if(!current_user_can('manage_options'))throw new RuntimeException('管理者だけが取り込めます。');
    $result=[];
    foreach(ppab_entries() as $entry) {
        $existing=get_posts(['post_type'=>'post','post_status'=>'any','posts_per_page'=>2,'meta_key'=>'playpoint_batch_path','meta_value'=>$entry['path'],'suppress_filters'=>true]);
        if(count($existing)>1)throw new RuntimeException('試験URLが重複しています。');
        if($existing){$result[]=['id'=>$existing[0]->ID,'path'=>$entry['path'],'created'=>false];continue;}
        $values=['post_type'=>'post','post_status'=>'publish','post_title'=>$entry['title'],'post_name'=>'stg-batch-'.$entry['slug'],'post_content'=>$entry['content'],'post_excerpt'=>$entry['description'],'post_date'=>$entry['published'].' 00:00:00','post_date_gmt'=>get_gmt_from_date($entry['published'].' 00:00:00'),'post_author'=>get_current_user_id(),'comment_status'=>'closed','ping_status'=>'closed'];
        $id=wp_insert_post(wp_slash($values),true);if(is_wp_error($id))throw new RuntimeException('試験記事を取り込めませんでした。');
        if(get_post($id)->post_content!==$entry['content']){wp_trash_post($id);throw new RuntimeException('原文と一致しないため新規の試験記事をゴミ箱へ戻しました。');}
        update_post_meta($id,'playpoint_batch_path',$entry['path']);update_post_meta($id,'playpoint_batch_source_sha256',$entry['sourceSha256']);update_post_meta($id,'playpoint_list_title',$entry['listTitle']);update_post_meta($id,'playpoint_batch_auto_list_title',$entry['listTitle']);update_post_meta($id,'playpoint_batch_auto_post_title',$entry['title']);update_post_meta($id,'the_page_meta_description',$entry['description']);
        $term=term_exists($entry['category'],'category');if(!$term)$term=wp_insert_term($entry['category'],'category');if(is_wp_error($term))throw new RuntimeException('分類の取り込みに失敗しました。');
        wp_set_post_terms($id,[(int)(is_array($term)?$term['term_id']:$term)],'category',false);wp_set_post_terms($id,$entry['tags'],'post_tag',false);
        // 移行だけで元記事の更新日を進めない。対象はこの場で作った試験記事だけ。
        global $wpdb;$date=$entry['modified'].' 00:00:00';$wpdb->update($wpdb->posts,['post_modified'=>$date,'post_modified_gmt'=>get_gmt_from_date($date)],['ID'=>$id]);clean_post_cache($id);
        $result[]=['id'=>$id,'path'=>$entry['path'],'created'=>true];
    }
    return $result;
}
add_action('save_post_post',function($id,$post,$update){
    if(!$update)return;$sourcePath=get_post_meta($id,'playpoint_batch_path',true);$entry=null;foreach(ppab_entries() as $candidate)if($candidate['path']===$sourcePath){$entry=$candidate;break;}if(!$entry)return;
    $before=get_post_meta($id,'playpoint_batch_auto_post_title',true);if($before===''||$before===$post->post_title)return;
    // 独自に書かれた一覧見出しは保持し、自動追従中の見出しだけ更新する。
    if(get_post_meta($id,'playpoint_list_title',true)===get_post_meta($id,'playpoint_batch_auto_list_title',true)){
        $title=$post->post_title===$entry['title']?$entry['listTitle']:$post->post_title;
        update_post_meta($id,'playpoint_list_title',$title);update_post_meta($id,'playpoint_batch_auto_list_title',$title);
    }
    update_post_meta($id,'playpoint_batch_auto_post_title',$post->post_title);
},10,3);
add_action('admin_menu',function(){add_management_page('PlayPoint記事移行・stg','PlayPoint記事移行・stg','manage_options','playpoint-article-batch',function(){
    if(!current_user_can('manage_options'))return;
    echo '<div class="wrap"><h1>PlayPoint記事移行・stg</h1><p>指定3記事だけを新規に取り込みます。同じ試験URLの記事がある場合、その内容・状態を上書きしません。本番には接続しません。</p><ul>';
    foreach(ppab_entries() as $entry)echo '<li>'.esc_html($entry['title']).' — <a href="'.esc_url('https://stg.playpoint-sim.com'.$entry['path']).'">stgで表示</a></li>';
    echo '</ul><form method="post" action="'.esc_url(admin_url('admin-post.php')).'"><input type="hidden" name="action" value="ppab_import">';wp_nonce_field('ppab_import');submit_button('3記事をstgへ取り込む');echo '</form></div>';
});});
add_action('admin_post_ppab_import',function(){if(!current_user_can('manage_options'))wp_die('管理者だけが取り込めます。','',['response'=>403]);check_admin_referer('ppab_import');try{ppab_import();wp_safe_redirect(admin_url('tools.php?page=playpoint-article-batch&imported=1'));exit;}catch(Throwable $error){wp_die(esc_html($error->getMessage()));}});
add_action('init',function(){
    $path=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH);
    if($path==='/cms/index.php'&&isset($_GET['pp_batch_asset'])) {
        $key=$_GET['pp_batch_asset'];$asset=is_string($key)?(ppab_data()['assets'][$key]??null):null;
        if(!$asset){status_header(404);exit;}
        $extension=strtolower(pathinfo($asset['path'],PATHINFO_EXTENSION));$types=['css'=>'text/css; charset=utf-8','js'=>'text/javascript; charset=utf-8','svg'=>'image/svg+xml','png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','webp'=>'image/webp','gif'=>'image/gif','avif'=>'image/avif','woff'=>'font/woff','woff2'=>'font/woff2','ttf'=>'font/ttf','otf'=>'font/otf'];
        if(!isset($types[$extension])){status_header(404);exit;}
        if(isset($asset['text']))$bytes=$asset['text'];else{$root=realpath(dirname(rtrim(ABSPATH,'/\\'),2));$file=$root?realpath($root.$asset['path']):false;if(!$file||!str_starts_with($file,$root.DIRECTORY_SEPARATOR)||!is_file($file)||!hash_equals($asset['sourceSha256'],hash_file('sha256',$file))){status_header(404);exit;}$bytes=file_get_contents($file);}
        header('Content-Type: '.$types[$extension]);header('X-Content-Type-Options: nosniff');header('X-Robots-Tag: noindex, nofollow, noarchive');header('Cache-Control: private, max-age=3600');header('ETag: "'.hash('sha256',$bytes).'"');echo $bytes;exit;
    }
    $entry=null;foreach(ppab_entries() as $candidate)if($candidate['path']===$path){$entry=$candidate;break;}if(!$entry)return;
    $id=array_search($path,ppab_ids(),true);$post=$id?get_post($id):null;
    $html=$post?ppab_render($entry,['status'=>$post->post_status,'password'=>$post->post_password,'title'=>$post->post_title,'html'=>$post->post_content,'description'=>get_post_meta($id,'the_page_meta_description',true),'published'=>$post->post_date,'modified'=>$post->post_modified]):null;
    status_header($html===null?404:200);nocache_headers();header('Content-Type: text/html; charset=utf-8');header('X-Robots-Tag: noindex, nofollow, noarchive');header('Cache-Control: private, no-store');
    if($html===null){echo 'この試験記事は公開状態ではありません。';exit;}echo $html;exit;
},-115);
