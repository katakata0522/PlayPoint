<?php
// 隔離したWordPressコピーでのみ呼ぶ検証。認証情報と本文は出力しない。
$_SERVER['HTTP_HOST']='stg.playpoint-sim.com';$_SERVER['REQUEST_URI']='/';
require $argv[1].'/wp-load.php';
$phase=$argv[2];
function ppab_assert($value,$message){if(!$value)throw new RuntimeException($message);}
function ppab_check_read() {
    $snapshot=ppc_snapshot();$ids=ppab_ids();$result=[];
    foreach(ppab_entries() as $entry) {
        $id=array_search($entry['path'],$ids,true);$post=$id?get_post($id):null;ppab_assert($post!==null,'imported article');
        $listed=array_values(array_filter($snapshot['catalog'],fn($r)=>\PlayPoint\Catalog\path($r['file'])===$entry['path']));
        $indexed=array_values(array_filter($snapshot['search']['articles'],fn($r)=>$r['path']===$entry['path']));
        $render=ppab_render($entry,['status'=>$post->post_status,'password'=>$post->post_password,'title'=>$post->post_title,'description'=>get_post_meta($id,'the_page_meta_description',true),'html'=>$post->post_content,'published'=>$post->post_date,'modified'=>$post->post_modified]);
        $result[]=['path'=>$entry['path'],'status'=>$post->post_status,'storedContentExact'=>$post->post_content===$entry['content'],'titleMatches'=>$post->post_title===$entry['title'],'listed'=>count($listed),'indexed'=>count($indexed),'rendered'=>$render!==null,'category'=>$listed[0]['browseCategory']??null,'tags'=>$listed[0]['tags']??[],'listTitle'=>$listed[0]['listTitle']??null,'bodyMarkerSearchable'=>isset($indexed[0])&&str_contains(json_encode($indexed[0],JSON_UNESCAPED_UNICODE),'隔離連動バッチ検証語'),'titleChanged'=>isset($listed[0])&&$listed[0]['title']==='隔離・バッチの更新確認','listTitleChanged'=>isset($listed[0])&&$listed[0]['listTitle']==='隔離・バッチの更新確認','renderTitleChanged'=>$render!==null&&str_contains($render,'<title>隔離・バッチの更新確認</title>')];
    }
    return ['articles'=>$result,'catalogCount'=>count($snapshot['catalog']),'searchCount'=>count($snapshot['search']['articles']),'generation'=>$snapshot['generation']];
}
if($phase==='import'||$phase==='idempotent') {
    $admins=get_users(['role'=>'administrator','number'=>1]);ppab_assert(count($admins)===1,'administrator');wp_set_current_user($admins[0]->ID);
    $created=ppab_import();$read=ppab_check_read();$read['created']=count(array_filter($created,fn($r)=>$r['created']));$read['ids']=array_column($created,'id');echo json_encode($read,JSON_UNESCAPED_SLASHES);exit;
}
if($phase==='edit') {
    $ids=ppab_ids();$id=array_search(ppab_entries()[0]['path'],$ids,true);$post=get_post($id);
    wp_update_post(wp_slash(['ID'=>$id,'post_title'=>'隔離・バッチの更新確認','post_excerpt'=>'一覧に反映する隔離検証','post_content'=>$post->post_content.'<p>隔離連動バッチ検証語</p>']));
    update_post_meta($id,'the_page_meta_description','検索へ反映する隔離検証');
    $term=wp_insert_term('隔離・バッチ分類','category');if(is_wp_error($term))$term=term_exists('隔離・バッチ分類','category');wp_set_post_terms($id,[(int)$term['term_id']],'category');wp_set_post_terms($id,['隔離・バッチタグ'],'post_tag');
}
if($phase==='draft') {$id=array_search(ppab_entries()[0]['path'],ppab_ids(),true);wp_update_post(['ID'=>$id,'post_status'=>'draft']);}
if($phase==='custom-title') {$id=array_search(ppab_entries()[0]['path'],ppab_ids(),true);update_post_meta($id,'playpoint_list_title','手書きの一覧見出し');wp_update_post(wp_slash(['ID'=>$id,'post_title'=>'隔離・次の題名']));}
echo json_encode(ppab_check_read(),JSON_UNESCAPED_SLASHES);
