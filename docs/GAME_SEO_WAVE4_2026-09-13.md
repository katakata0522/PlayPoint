# Game SEO Wave 4 verification — 2026-09-13

## 対象

- ヘブンバーンズレッド
- 崩壊3rd
- 呪術廻戦 ファントムパレード
- リバース：1999

第4波では、残っていた固定価格・固定天井円額を、2026年時点の公式購入経路と照合した。

## 共通ルール

- Google Play価格を公開一次情報で固定できなければ自由入力へ fail closed
- 公式Web Shop / Charge Center / Top-up CenterをGoogle Play購入として扱わない
- Web側の値引き・独自ポイント・増量とGoogle Play Pointsを同じポイントとして合算しない
- 無料通貨・チケット・キャンペーンで実支払額が変わるガチャを固定円額の天井にしない
- 深掘り記事は購入判断が独立して成立する場合だけ追加する

## ヘブンバーンズレッド

### 公式確認

2026年9月現在の公式WEB SHOPおよびヘルプで以下を確認。

- 対象のパック・クォーツ商品はアプリ内より5%OFF
- WEB SHOP購入で基本1%のWEB SHOPポイント
- 現在、WEB限定30,000クォーツ/28,500円、20,000/19,000円等を表示
- 10,000クォーツ/9,500円、4,750/4,655円等の5%OFF商品を表示
- プレミアムパス / ライトパスはWEB SHOPでは加入不可
- Google/Apple等のアカウント連携が必要
- 有償クォーツは購入時に指定したプラットフォーム以外では利用不可

継続月額サービスとしてプレミアムパス/ライトパスの存在自体も公式過去告知で確認できるが、現行Google Playの月額価格は公開一次情報で固定できなかった。

### 修正

- 旧ライトパス600円、プレミアムパス2,900円を現行Google Play価格として使わない
- 旧クォーツ価格表、200連60,000円、完凸240,000円を撤去
- Google Play購入画面の実支払額を自由入力
- `/games/hbr/google-play-vs-webshop/` を追加

### 出典

- https://webshop-jp.heaven-burns-red.wfs.games/
- https://webshop-jp.heaven-burns-red.wfs.games/ja/help/1
- https://webshop-jp.heaven-burns-red.wfs.games/ja/help/2
- https://webshop-jp.heaven-burns-red.wfs.games/ja/help/4
- https://heaven-burns-red.com/half-anniversary-campaign/

## 崩壊3rd

### 公式確認

HoYoverse公式で以下を確認。

- 崩壊3rd公式チャージセンターが存在
- 月パス以外の水晶2倍チャージボーナスはゲーム内とチャージセンターで共有
- チャージセンター購入でもゲーム内チャージ特典を受取可能
- 月パスの有効期間が180日未満なら追加購入で延長可能
- 2026-03-05〜2026-04-16には公式チャージセンター向け5% / 10%割引クーポンイベントがあった
- 上記割引は期間限定であり、恒常割引として扱わない

### 修正

- 旧月パス600円、水晶価格表を現行Google Play価格として使わない
- 10連5,600円、90連50,400円、装備一式70,000円を撤去
- Google Play側は自由入力
- `/games/honkai3rd/google-play-vs-charge-center/` を追加

### 出典

- https://www.hoyolab.com/article/31445251
- https://www.hoyolab.com/article/44065005

## 呪術廻戦 ファントムパレード

### 公式確認

2026年9月13日の公式WEBショップで以下を確認。

- 有償廻珠A〜G: 160 / 480 / 1,000 / 1,500 / 3,000 / 5,000 / 10,000円
- 初回17〜20%増量表示
- 期間パックに4〜5%増量表示
- 一部WEB限定100%増量商品
- 商品価格と同数のマイルpt表示（例: 1,000円商品→1,000マイルpt）
- ファンパレボーナス610円・4%増量
- 毎日廻珠ボーナス480円・4%増量
- プレミアムパス付き廻珠パック1,000円は期間限定表示

これらはWEBショップの現在表示であり、Google Play価格として流用しない。

### 修正

- Google Play親計算機の旧固定価格、250連75,000円、完凸300,000円を撤去
- Google Play側は自由入力
- `/games/phantomparade/google-play-vs-webshop/` を追加
- WEB増量・マイルとGoogle Play Pointsを別軸で説明

### 出典

- https://webshop.jujutsuphanpara.jp/
- https://webshop.jujutsuphanpara.jp/login

## リバース：1999

### 公式確認

公式の資金決済法・特商法表示で、販売価格は「購入ページに表示」と明記されている。

公式サイトには「チャージセンター / Official Top-up」導線があり、公式Top-up Centerも存在する。

### 修正

- 咆哮のひと月610円、純雨の雫価格表を現行Google Play価格として使わない
- 70連25,200円、140連50,400円を撤去
- 「月パスやパックの購入ですべてPlay Points還元」という無条件断定を撤去
- Google Play側は自由入力
- 公式Top-up Centerの商品差・割引を十分確認できないため、薄い比較記事は作らない

### 出典

- https://re1999.bluepoch.com/jp/bluepoch/fund.html
- https://re1999.bluepoch.com/jp/bluepoch/about.html
- https://re1999.bluepoch.com/jp/home/
- https://re1999.bluepoch.com/payment/info

## 次の実装候補（Wave 5）

### 新規ゲーム

1. **プロ野球スピリッツA**
   - Androidのエナジー購入がGoogleアカウント経由であることを公式確認済み
   - KONAMI Games Storeがあり、アプリ内よりお得な商品を公式に訴求
   - Google Play vs KONAMI Games Storeの記事価値が非常に高い

2. **eFootball**
   - 2026年にもGoogle Playユーザー向けeFootballコイン購入告知あり
   - 現行日本価格を固定せず自由入力ベースなら追加可能

3. **Pokémon GO**
   - 需要・Play Points親和性は高い
   - 日本公式Web Storeの現行商品差を一次情報で十分固定できるまで保留

### 既存ゲーム残監査

Wave 4後も、全ゲームページを横断して以下を検索する。

- `約xx,xxx円` の固定天井・完凸
- 古い月額パス価格
- 「全額Play Points対象」等の無条件断定
- Web/PC/公式チャージ価格をGoogle Playへ流用した可能性

## CIで守ること

- Wave 4対象4ゲームのGoogle Play固定価格が再生成で復活しない
- 固定天井円額が復活しない
- 深掘り3記事がsitemap・lastmod・親ページ導線へ入る
- WEB SHOP / Charge CenterをGoogle Play購入として扱わない
- 期間限定割引を恒常割引と誤表現しない
- 公式URLはhostname/pathとして検証する
