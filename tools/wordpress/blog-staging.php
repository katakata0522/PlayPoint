<?php
/** Plugin Name: PlayPoint stg original blog linkage */
if (!defined('ABSPATH')) exit;
if (rtrim(str_replace('\\','/',ABSPATH),'/') !== '/home/hajikkoroom/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms') return;
if (strtolower($_SERVER['HTTP_HOST'] ?? '') !== 'stg.playpoint-sim.com') return;
function ppcb_data() {
    static $data;
    if($data===null)$data=json_decode(gzdecode(base64_decode('__PLAYPOINT_BLOG_PAYLOAD__')),true,512,JSON_THROW_ON_ERROR);
    return $data;
}
function ppcb_url($params=[]) { return add_query_arg(array_merge(['pp_flow'=>'normal','pp_catalog'=>'live'],$params),'https://stg.playpoint-sim.com/blog/'); }
function ppcb_render() {
    $snapshot=ppc_snapshot();$catalog=$snapshot['catalog'];
    // DOMのHTML整形でスクリプト内の日本語やJSONを文字参照へ変換しない。
    $blocks=[];$template=preg_replace_callback('~<(?:script|style)\b[^>]*>[\s\S]*?</(?:script|style)>~i',function($match)use(&$blocks){$key='<!--pp-blog-block-'.count($blocks).'-->';$blocks[$key]=$match[0];return $key;},ppcb_data()['html']);
    $dom=new DOMDocument('1.0','UTF-8');$previous=libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="UTF-8">'.$template,LIBXML_NONET);
    libxml_clear_errors();libxml_use_internal_errors($previous);ppc_rewrite_dom($dom);
    $html=strtr($dom->saveHTML(),$blocks);
    $jsonFlags=JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES;
    return strtr($html,[
        '__PP_BLOG_CATALOG__'=>wp_json_encode($catalog,$jsonFlags),
        '__PP_BLOG_SEARCH__'=>wp_json_encode($snapshot['search'],$jsonFlags),
        '__PP_BLOG_GAMES__'=>wp_json_encode(ppcb_data()['games'],$jsonFlags),
        '__PP_BLOG_CONFIG__'=>wp_json_encode(['origin'=>'https://stg.playpoint-sim.com','paths'=>array_values(ppc_mapping()),'images'=>ppcb_data()['imageKeys'],'categories'=>$snapshot['categories'],'generation'=>$snapshot['generation']],$jsonFlags)
    ]);
}
add_action('init',function(){
    $path=parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH);
    if($path==='/cms/index.php' && isset($_GET['pp_blog_image'])) {
        $key=$_GET['pp_blog_image'];$entry=is_string($key)?(ppcb_data()['images'][$key]??null):null;
        if(!$entry){status_header(404);exit;}
        // 公開済み画像の固定allowlistだけを読む。リクエスト値をファイルパスへ連結しない。
        $publicRoot=realpath(dirname(rtrim(ABSPATH,'/'),2));$file=realpath($publicRoot.'/'.$entry['path']);
        if(!$publicRoot||!$file||!str_starts_with($file,$publicRoot.DIRECTORY_SEPARATOR)||!is_file($file)){status_header(404);exit;}
        header('Content-Type: '.$entry['mime']);header('X-Content-Type-Options: nosniff');
        header('X-Robots-Tag: noindex, nofollow, noarchive');header('Cache-Control: private, max-age=300');readfile($file);exit;
    }
    if($path!=='/blog/' || ($_GET['pp_flow']??null)!=='normal' || ($_GET['pp_catalog']??null)!=='live')return;
    $allowed=['pp_flow','pp_catalog','q','topic','game','category','sort','page'];$seen=[];
    foreach(explode('&',$_SERVER['QUERY_STRING']??'') as $part){$key=urldecode(explode('=',$part,2)[0]);if(isset($seen[$key])){status_header(400);exit;}$seen[$key]=true;}
    foreach($_GET as $key=>$value)if(!in_array($key,$allowed,true)||!is_string($value)){status_header(400);exit;}
    try{$html=ppcb_render();}catch(Throwable $error){status_header(503);nocache_headers();header('Content-Type: text/plain; charset=utf-8');echo '一覧を生成できませんでした。既存の記事と台帳は保持されています。';exit;}
    ppc_headers('text/html; charset=utf-8');header('X-PlayPoint-Catalog-Version: '.ppc_snapshot()['generation']);echo $html;exit;
},-106);
