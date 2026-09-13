# Game SEO Wave 3 verification — 2026-09-13

## 方針

第3波も「検索需要があるから固定価格を置く」のではなく、公開一次情報で確認できる範囲だけを公開する。

- 現行Google Play価格を公開一次情報で固定できない場合は自由入力へ fail closed
- サブスクやガチャ仕様だけ公式確認できる場合は、仕様と価格を別々に扱う
- 公式Web StoreはGoogle Play購入と混同しない
- 所持通貨・無料分・チケット・セール等で実支払額が変わる場合、天井を固定円額にしない
- 深掘り記事は、ユーザーの購入判断が独立して成立するテーマだけ作る

## Pokémon TCG Pocket（ポケポケ）

### 確認できたこと

公式サポートで以下を確認。

- プレミアムパスは1か月単位の定期購入
- 初回無料体験は14日
- 購入権利はプラットフォームアカウントに紐づく
- Google Playでは選択したGoogleアカウントの定期購入として管理される

### 確認できなかったこと

公開公式サポートでは、現行日本円のプレミアムパス料金と各ポケゴールド商品の価格を固定表示していない。

### 対応

- 旧PlayPointの980円・140円〜13,800円の商品価格を現行正本として使わない
- Google Play購入画面の実額を自由入力する方式へ変更
- `/games/pokepoke/premium-pass-guide/` を追加し、無料体験・更新・アカウント・Play Points対象タイミングを解説

### 出典

- https://app-ptcgp.pokemon-support.com/hc/ja/articles/39082740268569-
- https://support.pokemon.com/hc/en-us/articles/30331739144596-Pok%C3%A9mon-TCG-Pocket-Purchase-and-Premium-Pass-FAQ

## パズル＆ドラゴンズ

### 確認できたこと

パズドラ公式で以下を確認。

- パズドラパスは月額980円
- 1か月単位の自動更新
- AndroidではGoogle Playの定期購入
- 初回1週間の無料トライアル
- 毎日専用ダンジョン
- チーム枠+5
- 獲得ランク経験値5%アップ
- 対象ダンジョンの常時解放
- 専用バッジ
- イベントによって追加クエスト報酬

### 対応

- 月額980円は公式確認済み値として保持
- その他の一般課金は商品価格表ではなく課金予定額として扱う現状を維持
- `/games/pad/pad-pass-value/` を追加し、無料体験・常設特典・Play Pointsを一つの購入判断として解説

### 出典

- https://pad.gungho.jp/member/pdpass/
- https://pad.gungho.jp/member/pdpass/faq.html

## アークナイツ

### 確認できたこと

公式サポート・公式告知で以下を確認。

- 月パス購入時に有償純正源石6個
- 30日間、毎日合成玉200個 + 理性回復剤1個
- 2026年リミテッドスカウトでも、スカウト1回につきリミテッドスカウト契約証1枚
- 300回スカウト時の追加限定オペレーター仕様

### 確認できなかったこと

現行日本Google Playの月パス、月間スカウトパック、純正源石各商品の価格を、公開一次情報だけで固定できなかった。

### 対応

- 旧610円・2,440円・純正源石価格表を計算候補から除外
- 「300連=約90,000円」を撤去
- Google Play購入画面の実額を自由入力
- `/games/arknights/monthly-pass-limited-scout/` を追加し、月パス内容と300回仕様を価格と分離して解説

### 出典

- https://www.arknights.jp/contact-1-hint
- https://arknights.jp/news/2909

## ドラゴンボールZ ドッカンバトル

### 確認できたこと

バンダイナムコ公式FAQで、公式Web Store購入とアプリ外購入履歴を確認できることを確認。

### 問題点

既存ページには以下の固定値が残っていた。

- デイリーカプセルの異なる日数・価格表記
- 固定の龍石通常価格
- セール100個4,000円
- 周年・Wフェス50,000円プリセット

販売商品・セールは時期で変わるため、恒久的な正本として不適切。

### 対応

- Google Play固定価格を全て自由入力へ fail closed
- 公式Web StoreをGoogle Play決済として扱わない
- `/games/dokkan/google-play-vs-webstore/` を追加

### 出典

- https://bnfaq.channel.or.jp/faq/detail/3015/8687
- https://bnfaq.channel.or.jp/faq/detail/3015/8681

## 鳴潮

### 確認できたこと

鳴潮公式サイトでAndroid対応・ゲーム内課金ありを確認。

### 確認できなかったこと

現行日本Google Playの月相、月相観測パス、先駆ラジオ等の価格を公開一次情報だけで固定できなかった。

### 対応

- 旧固定価格を撤去
- 80/160連の固定現金額を撤去
- S6 200,000円固定プリセットを撤去
- 「全額Play Points対象」という無条件断定を撤去
- 現段階では独立記事を増やさず、親計算機を安全な自由入力へ寄せる

### 出典

- https://wutheringwaves.kurogames.com/jp/announcement/405

## 未対応大型タイトルの調査

### eFootball

優先度: 高

公式にGoogle Playユーザー向けeFootballコイン購入案内が2026年にもあり、Android/iOS向け課金導線が現在も存在することを確認。日本向け現行コイン価格を固定できる一次情報は不足している。

次回候補:

- 新規ゲーム計算機は自由入力ベースなら成立
- Google Play購入と他プラットフォーム購入を混同しない
- 現行価格表を無理に持たない

出典:

- https://www.konami.com/efootball/ja/topic/news/5074
- https://www.konami.com/efootball/ja/topic/news/4796

### プロ野球スピリッツA

優先度: 最優先級

公式サポートでAndroidのエナジー購入がGoogleアカウント経由であることを確認。さらにKONAMI Games Store公式ページでは、アプリ内購入よりお得な商品があること、Web Store側で独自ポイント・決済手段があることを確認。

PlayPointとの相性が非常に高い。

次回候補:

- 日本語新規ゲーム計算機
- Google Play vs KONAMI Games Store比較記事
- Web Store購入ではGoogle Play Pointsを前提にしない
- 多言語トップレベルゲームセットの整合性を壊さない追加方法を先に設計する

出典:

- https://www.konami.com/games/prospi_a/
- https://ja-support1.konami.com/hc/ja/articles/5665131759129-
- https://pawaspi-point.konami.net/general/prospi_games_store

### Pokémon GO

優先度: 高だが保留

Google Playとの親和性・検索需要は非常に高いが、今回の調査では日本向け公式Web Storeの現在商品・増量率を静的な一次情報で十分に固定できなかった。

次回は公式Web Storeの現行商品表示とGoogle Play購入の差を再確認し、固定比較が成立する場合のみ追加する。

## 次の監査候補

既存ゲーム:

1. ヘブンバーンズレッド
2. 崩壊3rd
3. 呪術廻戦 ファントムパレード
4. リバース：1999
5. その他、固定価格や固定天井円額が残るページ

新規タイトル:

1. プロ野球スピリッツA
2. eFootball
3. Pokémon GO
4. Last War
5. Whiteout Survival

## CIで守ること

- `publishGooglePlayPrices: false` のゲームに固定パック価格が再出現しない
- 旧固定天井円額が再出現しない
- Web Store記事がGoogle Play Points獲得を断定しない
- 深掘り記事がsitemap・lastmod・親ページ導線に入る
- 公式ソースのホストとパスをURLとして検証し、単純な部分一致によるCodeQL警告を出さない
