
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('クレジット記事の主回答は記事タイトルの後に配置する',()=>{
 const s=read('articles/2026-07-25-play-credit-not-working.html');
 assert.ok(s.indexOf('<h1')<s.indexOf('id="quick-answer"'));
 assert.doesNotMatch(s,/<div class="cta-box">[\s\S]*?計算機で確認する/);
});
test('年齢条件は加入ガイドと参加できない記事の双方にある',()=>{
 for(const p of ['articles/2025-12-25-getting-started.html','articles/2026-08-05-play-points-cannot-join.html']){
 const s=read(p);assert.match(s, /18歳以上/);assert.match(s,/15776077/);
 }
});
test('期限の説明と検索用説明は最後の獲得または使用を基準にする',()=>{
 const s=read('articles/2026-08-16-points-disappeared.html');
 const d=s.match(/<meta name="description" content="([^"]+)"/)[1];assert.match(d,/最後の獲得または使用から1年/);
 assert.doesNotMatch(s,/受取後1週間|残高の1年期限、1年の未利用/);
});
test('海外版のSuper Ticketは過去条件を現行の保証にしない',()=>{
 for(const l of ['en','ko','tw']){
 const s=read(l+'/articles/google-play-points-super-weekly-reward.html');
 const d=s.match(/<meta name="description" content="([^"]+)"/)[1];
 assert.doesNotMatch(d,/30.?90|30일|90일/);
 assert.match(s,/historical|과거|過去/);assert.match(s,/current card|현재 카드|目前卡片/);
 }
});
test('ギフトコードの抽選は確定還元として負担から差し引かない',()=>{
 const s=read('articles/2026-06-20-discount-gift-cards.html');
 assert.match(s,/抽選のみ・未当選/);assert.match(s,/上限500円/);
 assert.doesNotMatch(s,/★★★★★|実質5%|還元率最強|約9,000〜9,800円|即座にコード/);
});
test('残高併用記事は使用方法の出典と対象国限定のチェックアウト案内を持つ',()=>{
 const checks={en:/eligible countries/,ko:/대상 국가/,tw:/適用國家/};
 for(const [l,pattern]of Object.entries(checks)){const s=read(l+'/articles/google-play-balance-combine-payment.html');assert.match(s,/9079840/);assert.match(s,pattern);}
});


test("全記事でHTMLのIDを一意にする",()=>{
 for(const d of ["articles","en/articles","ko/articles","tw/articles"]){
 for(const f of fs.readdirSync(path.join(root,d)).filter(f=>f.endsWith(".html"))){const ids=[...read(d+"/"+f).matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,d+"/"+f);}
 }
});

test('補助関連記事のasideを認識し、再生成で重複欄を追加しない',()=>{
 const {normalizeHtml}=require('../scripts/article-content-navigation-normalize.cjs');
 const file='articles/2026-07-24-play-points-1-value.html',html=read(file);
 const result=normalizeHtml(file,html);
 assert.equal(result.changed,false);
 assert.equal((result.html.match(/id="related-guides"/g)||[]).length,1);
});
