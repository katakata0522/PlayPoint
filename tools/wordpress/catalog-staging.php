<?php
/** Plugin Name: PlayPoint stg catalog linkage */
if (!defined('ABSPATH')) exit;
if (rtrim(str_replace('\\','/',ABSPATH),'/') !== '/home/hajikkoroom/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms') return;
if (strtolower($_SERVER['HTTP_HOST'] ?? '') !== 'stg.playpoint-sim.com') return;
// 配布時に同じリポジトリのcatalog.phpと台帳を埋め込む。手動複製しない。
require_once __DIR__.'/playpoint-catalog-library.php';
function ppc_base() { return json_decode(file_get_contents(__DIR__.'/playpoint-catalog-base.json'),true,512,JSON_THROW_ON_ERROR); }
function ppc_mapping() {
    $map=[];
    if (function_exists('ppfn_id') && ppfn_id()) $map[ppfn_id()]=ppfn_data()['article']['path'];
    if (function_exists('ppcs_id') && ppcs_id()) $map[ppcs_id()]=ppcs_data()['article']['path'];
    return $map;
}
function ppc_snapshot() {
    static $result;
    if ($result === null) {
        $base=ppc_base();
        $index=json_decode(file_get_contents(__DIR__.'/playpoint-article-search-index.json'),true,512,JSON_THROW_ON_ERROR);
        $result=\PlayPoint\Catalog\build($base,$index,\PlayPoint\Catalog\wordpress_posts(ppc_mapping()));
    }
    return $result;
}
function ppc_url($kind='list',$params=[]) {
    if($kind==='list' && function_exists('ppcb_url'))return ppcb_url($params);
    return add_query_arg(array_merge(['pp_catalog'=>$kind],$params),'https://stg.playpoint-sim.com/cms/index.php');
}
function ppc_link($url) {
    $host=parse_url($url,PHP_URL_HOST);
    if ($host && !in_array(strtolower($host),['playpoint-sim.com','stg.playpoint-sim.com'],true)) return $url;
    $path=parse_url($url,PHP_URL_PATH);
    if (preg_match('~^/blog/(?:index\.html|page/(\d+)/)?$~',$path??'',$page)) {
        parse_str(parse_url($url,PHP_URL_QUERY) ?? '',$params);
        $params=array_filter(array_intersect_key($params,array_flip(['topic','q','game','category','sort','page'])),'is_string');
        if(!empty($page[1]))$params['page']=$page[1];
        return ppc_url('list',$params);
    }
    if (in_array($path,array_values(ppc_mapping()),true)) return 'https://stg.playpoint-sim.com'.$path.(parse_url($url,PHP_URL_QUERY)!==null?'?'.parse_url($url,PHP_URL_QUERY):'').(parse_url($url,PHP_URL_FRAGMENT)!==null?'#'.parse_url($url,PHP_URL_FRAGMENT):'');
    return $url;
}
function ppc_html($html) {
    $dom=new DOMDocument('1.0','UTF-8');$old=libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="UTF-8"><html><body>'.$html.'</body></html>',LIBXML_NONET);
    libxml_clear_errors();libxml_use_internal_errors($old);ppc_rewrite_dom($dom);
    $out='';foreach($dom->getElementsByTagName('body')->item(0)->childNodes as $child)$out.=$dom->saveHTML($child);
    return $out;
}
function ppc_rewrite_dom($dom) {
    $xp=new DOMXPath($dom);
    $original=[];foreach(ppc_base() as $row)$original[\PlayPoint\Catalog\path($row['file'])]=$row;
    $current=[];foreach(ppc_snapshot()['catalog'] as $row)$current[\PlayPoint\Catalog\path($row['file'])]=$row;
    foreach($xp->query('//form[@action]') as $form) {
        $action=$form->getAttribute('action');
        if(ppc_link($action)!==$action && in_array(parse_url($action,PHP_URL_PATH),['/blog/','/blog/index.html'],true)) {
            $form->setAttribute('action',function_exists('ppcb_url')?'https://stg.playpoint-sim.com/blog/':'https://stg.playpoint-sim.com/cms/index.php');
            foreach(function_exists('ppcb_url')?['pp_flow'=>'normal','pp_catalog'=>'live']:['pp_catalog'=>'list'] as $name=>$value){$input=$dom->createElement('input');$input->setAttribute('type','hidden');$input->setAttribute('name',$name);$input->setAttribute('value',$value);$form->appendChild($input);}
        }
    }
    foreach($xp->query('//a[@href]') as $link) {
        $href=$link->getAttribute('href');$key=parse_url($href,PHP_URL_PATH);
        if(in_array($key,array_values(ppc_mapping()),true) && !isset($current[$key])) {$link->removeAttribute('href');continue;}
        $updated=ppc_link($href);if($updated!==$href)$link->setAttribute('href',$updated);
        // 手書きの誘導文は保持し、記事名をそのまま表示する自動リンクだけ更新する。
        if(isset($original[$key],$current[$key])) {
            $label=\PlayPoint\Catalog\plain($link->textContent);
            $oldRow=$original[$key];
            if(in_array('article-card',explode(' ',$link->getAttribute('class')),true)) {
                $link->setAttribute('aria-label',$current[$key]['title']);
                foreach(['.//h3'=>$current[$key]['listTitle']??$current[$key]['title'],'.//p[contains(concat(" ",normalize-space(@class)," ")," card-desc ")]'=>$current[$key]['listDescription']??$current[$key]['description']??''] as $selector=>$text) {
                    $node=$xp->query($selector,$link)->item(0);if($node){while($node->firstChild)$node->removeChild($node->firstChild);$node->appendChild($dom->createTextNode($text));}
                }
            }
            if(in_array($label,array_filter([$oldRow['title']??'', $oldRow['listTitle']??'']),true) && $current[$key]['title']!==$oldRow['title']) {
                while($link->firstChild)$link->removeChild($link->firstChild);
                $link->appendChild($dom->createTextNode($current[$key]['title']));
            }
        }
        if($key==='/blog/' || $key==='/blog/index.html') {
            parse_str(parse_url($href,PHP_URL_QUERY)??'',$params);
            if(is_string($params['topic']??null)) {
                $count=ppc_snapshot()['categories'][$params['topic']]??0;
                $counter=$xp->query('.//*[contains(concat(" ",normalize-space(@class)," ")," sidebar-browse-count ")]',$link)->item(0);
                if($counter){$counter->nodeValue=(string)$count;$counter->setAttribute('aria-label',$count.'件');continue;}
                $label=\PlayPoint\Catalog\plain($link->textContent);
                if(preg_match('/\d+件$/u',$label)) {
                    $label=preg_replace('/\d+件$/u',$count.'件',$label);
                    while($link->firstChild)$link->removeChild($link->firstChild);
                    $link->appendChild($dom->createTextNode($label));
                }
            }
        }
    }
    foreach($xp->query('//*[contains(concat(" ",normalize-space(@class)," ")," sidebar-browse-list ")]') as $list) {
        $known=[];foreach($xp->query('.//a[@href]',$list) as $link){parse_str(parse_url($link->getAttribute('href'),PHP_URL_QUERY)??'',$params);if(is_string($params['topic']??null))$known[$params['topic']]=true;}
        $template=$xp->query('./li',$list)->item(0);if(!$template)continue;
        foreach(ppc_snapshot()['categories'] as $category=>$count)if(!isset($known[$category])){
            $item=$template->cloneNode(true);$link=$xp->query('.//a',$item)->item(0);if(!$link)continue;
            $link->setAttribute('href',ppc_url('list',['topic'=>$category]));$link->removeAttribute('aria-current');
            while($link->firstChild)$link->removeChild($link->firstChild);
            $label=$dom->createElement('span');$label->appendChild($dom->createTextNode($category));$counter=$dom->createElement('span',(string)$count);$counter->setAttribute('class','sidebar-browse-count');$counter->setAttribute('aria-label',$count.'件');$link->appendChild($label);$link->appendChild($counter);$list->appendChild($item);
        }
    }
}
add_filter('playpoint_stg_shell',function($shell){
    try {
        ppc_snapshot();
        foreach(['header','nav','sidebar','footer'] as $key)$shell[$key]=ppc_html($shell[$key]);
        $shell['js']=preg_replace('~/cms/wp-content/mu-plugins/playpoint-article-search-index\.json(?:\?v=[a-f0-9]+)?~','/cms/index.php?pp_catalog=search',$shell['js']);
        $changes=[
            "const hub = 'https://playpoint-sim.com/blog/';"=>'const hub = '.wp_json_encode(ppc_url()).';',
            "all.href = hub + (query ? '?q=' + encodeURIComponent(query) : '');"=>"all.href = hub + (query ? '&q=' + encodeURIComponent(query) : '');",
            ": 'https://playpoint-sim.com' + targetPath"=>": (".wp_json_encode(array_values(ppc_mapping())).".includes(targetPath) ? 'https://stg.playpoint-sim.com' : 'https://playpoint-sim.com') + targetPath"
        ];
        foreach($changes as $from=>$to) {
            if(substr_count($shell['js'],$from)!==1)throw new RuntimeException('検索の接続点が変わっています。');
            $shell['js']=str_replace($from,$to,$shell['js']);
        }
        if(($_GET['pp_diag']??null)==='1') $shell['js'].="\n".file_get_contents(__DIR__.'/playpoint-ad-diagnostics.js');
        return $shell;
    } catch(Throwable $error) { return $shell; }
});
add_filter('playpoint_stg_content',function($content){try{return ppc_html($content);}catch(Throwable $error){return $content;}});
add_filter('playpoint_stg_harness',function($script){
    // 閉じている検証パネルの大きなJSONを2秒ごとに再描画しない。手動更新は保持する。
    $from='render();setInterval(render,2000)';
    $to="render();const panel=document.getElementById('ppn-panel');const refreshVisible=()=>{if(document.visibilityState==='visible'&&panel?.open)render();};setInterval(refreshVisible,2000);panel?.addEventListener('toggle',refreshVisible);document.addEventListener('visibilitychange',refreshVisible)";
    return substr_count($script,$from)===1 ? str_replace($from,$to,$script) : $script;
});
function ppc_headers($type) {
    status_header(200);nocache_headers();header('Content-Type: '.$type);
    header('X-Robots-Tag: noindex, nofollow, noarchive',true);
    header('Cache-Control: private, no-store',true);
}
add_action('init',function(){
    if(parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH)!=='/cms/index.php')return;
    $kind=$_GET['pp_catalog']??null;
    if(!is_string($kind)||!in_array($kind,['search','catalog','list'],true))return;
    try{$snapshot=ppc_snapshot();}catch(Throwable $error){status_header(503);nocache_headers();header('Content-Type: text/plain; charset=utf-8');echo '記事データの生成に失敗しました。元の台帳は保持されています。';exit;}
    if($kind!=='list') {
        ppc_headers('application/json; charset=utf-8');
        header('X-PlayPoint-Catalog-Version: '.$snapshot['generation']);
        echo wp_json_encode($kind==='search'?$snapshot['search']:['articles'=>$snapshot['catalog'],'categories'=>$snapshot['categories'],'generation'=>$snapshot['generation']],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;
    }
    ppc_headers('text/html; charset=utf-8');
    $topic=is_string($_GET['topic']??null)?wp_unslash($_GET['topic']):'';
    $q=is_string($_GET['q']??null)?\PlayPoint\Catalog\plain(wp_unslash($_GET['q'])):'';
    $rows=array_values(array_filter($snapshot['catalog'],function($row)use($topic,$q){
        return ($row['listed']??true)!==false && ($topic===''||($row['browseCategory']??$row['category']??'')===$topic);
    }));
    $shell=ppfn_shell_data();
    ?><!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>PlayPoint 記事一覧・stg</title><style><?php echo $shell['css']; ?>
    .pp-catalog{max-width:1160px;margin:32px auto;padding:20px;color:#233d32}.pp-catalog form{display:flex;gap:8px;flex-wrap:wrap}.pp-catalog input,.pp-catalog button{min-height:44px;font:inherit;padding:8px}.pp-catalog-categories{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}.pp-catalog-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:20px}.pp-catalog-list article{padding:20px;border:1px solid #e1e7de;border-radius:12px;background:#fffefa}.pp-catalog-list h2{font-size:20px;line-height:1.6;margin:0 0 12px}.pp-catalog-list p{line-height:1.8}.pp-catalog a{color:#2b634b}.pp-catalog time{font-size:13px;color:#607164}
    </style></head><body style="background:#f5f6f2;margin:0"><main class="pp-catalog"><a href="<?php echo esc_url('https://stg.playpoint-sim.com'.ppfn_data()['article']['path'].'?pp_design=refined'); ?>">記事に戻る</a><h1>PlayPoint 記事一覧</h1><p>移行済み記事の題名・説明・分類はWordPressの現在の公開内容を反映しています。</p>
    <form action="/cms/index.php" method="get"><input type="hidden" name="pp_catalog" value="list"><label for="pp-catalog-q">記事を探す</label><input id="pp-catalog-q" type="search" name="q" value="<?php echo esc_attr($q); ?>"><button>検索</button></form>
    <nav class="pp-catalog-categories" aria-label="カテゴリー"><a href="<?php echo esc_url(ppc_url()); ?>">すべて</a><?php foreach($snapshot['categories'] as $name=>$count): ?><a href="<?php echo esc_url(ppc_url('list',['topic'=>$name])); ?>"><?php echo esc_html($name.' '.$count.'件'); ?></a><?php endforeach; ?></nav>
    <p role="status"><?php echo $q!==''?'記事を読み込んでいます…':count($rows).'件の記事'; ?></p><div class="pp-catalog-list"><?php foreach($rows as $row):$sourcePath=\PlayPoint\Catalog\path($row['file']);$url=ppc_link('https://playpoint-sim.com'.$sourcePath); ?><article data-catalog-path="<?php echo esc_attr($sourcePath); ?>"<?php if($q!=='')echo ' hidden'; ?>><h2><a href="<?php echo esc_url($url); ?>"><?php echo esc_html($row['listTitle']??$row['title']); ?></a></h2><p><?php echo esc_html($row['listDescription']??$row['description']??''); ?></p><time><?php echo esc_html($row['modified']??$row['date']??''); ?></time></article><?php endforeach; ?></div></main>
    <?php if($q!==''): ?><script src="/cms/wp-content/mu-plugins/playpoint-article-search.js?v=1d1de72781"></script><script>
    // 記事内と同じ全文検索エンジンを使い、未知語・追加条件の扱いも揃える。
    (async()=>{const status=document.querySelector('[role="status"]');try{
        const query=<?php echo wp_json_encode($q,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT); ?>;
        const response=await fetch('/cms/index.php?pp_catalog=search');if(!response.ok)throw Error('Unavailable');
        const index=await response.json(),engine=window.PlayPointSearch;if(!Array.isArray(index.articles)||!engine)throw Error('Invalid search data');
        const records=new Map(index.articles.map(row=>[row.path,row])),matches=[];
        for(const card of document.querySelectorAll('[data-catalog-path]')){
            const row=records.get(card.dataset.catalogPath);if(!row||!engine.matches(row,query,'ja'))continue;
            const snippet=engine.excerpt(row,query,'ja');card.querySelector('p').textContent=snippet.text;
            if(snippet.id)card.querySelector('a').hash=snippet.id;
            card.hidden=false;matches.push({card,score:engine.score(row,query,'ja')});
        }
        matches.sort((a,b)=>b.score-a.score).forEach(({card})=>document.querySelector('.pp-catalog-list').append(card));
        status.textContent=matches.length+'件の記事';
    }catch(error){status.textContent='検索を読み込めませんでした。キーワードを消して一覧から探せます。';}})();
    </script><?php endif; ?></body></html><?php exit;
},-105);
