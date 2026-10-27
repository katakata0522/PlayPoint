<?php
require __DIR__.'/catalog.php';
use function PlayPoint\Catalog\build;
function check($ok,$name) {if(!$ok) throw new RuntimeException($name);}
$a=['id'=>'one','file'=>'../articles/one.html','title'=>'元の題名','listTitle'=>'一覧の元題名','description'=>'元説明','tags'=>['以前'],'browseCategory'=>'旧分類'];
$b=['id'=>'two','file'=>'../articles/two.html','title'=>'別の記事','description'=>'保持','browseCategory'=>'旧分類'];
$search=['version'=>1,'locale'=>'ja','articles'=>[['path'=>'/articles/one.html','title'=>'元の題名','sections'=>[]],['path'=>'/articles/two.html','title'=>'別の記事','sections'=>[]]]];
$p=['path'=>'/articles/one.html','status'=>'publish','title'=>'更新した題名','description'=>'新説明','excerpt'=>'新一覧説明','modified'=>'2026-10-25','category'=>'新分類','tags'=>[],
    'html'=>'<p>冒頭</p><h2 id="stable-id">新見出し</h2><table><tr><td>復旧検証語</td></tr></table><script>隠し検証語</script>'];
$first=build([$a,$b],$search,[$p]);
check($first['catalog'][0]['title']==='更新した題名','タイトル');
check($first['catalog'][0]['listDescription']==='新一覧説明','一覧説明');
check($first['catalog'][1]===$b,'未移行台帳保持');
check($first['search']['articles'][1]===$search['articles'][1],'未移行索引保持');
check($first['categories']===['新分類'=>1,'旧分類'=>1],'分類件数');
check($first['search']['articles'][0]['tags']===[],'タグ削除');
check(str_contains(json_encode($first['search'],JSON_UNESCAPED_UNICODE),'復旧検証語'),'表の検索');
check(!str_contains(json_encode($first['search'],JSON_UNESCAPED_UNICODE),'隠し検証語'),'実行コード除外');
check($first['search']['articles'][0]['sections'][1]['id']==='stable-id','アンカー保持');
$draft=$p;$draft['status']='draft';$hidden=build([$a,$b],$search,[$draft]);
check(count($hidden['catalog'])===1&&count($hidden['search']['articles'])===1,'下書き除外');
$password=$p;$password['password']='fixture';check(count(build([$a,$b],$search,[$password])['catalog'])===1,'パスワード記事除外');
$bad=$p;$bad['path']='https://example.com/articles/one.html';check(build([$a,$b],$search,[$bad])['catalog'][0]===$a,'任意URL拒否');
$failed=false;try{build([$a,$b],$search,[$p,$p]);}catch(RuntimeException $e){$failed=true;}check($failed,'重複拒否');
check(build([$a,$b],$search,[$p])['generation']===$first['generation'],'決定的な版');
$p['title']='さらに更新';check(build([$a,$b],$search,[$p])['generation']!==$first['generation'],'更新で版変更');
echo json_encode(['status'=>'passed','checks'=>15,'fixture'=>$first['search']],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
