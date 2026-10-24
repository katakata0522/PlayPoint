# POSAカード企画の記事制作・公開前チェック（2026年10月23日）

## 制作範囲

- `articles/2026-10-23-seven-eleven-gift-card-lottery.html` — セブン‐イレブンの対象Google Playギフトカード・10口抽選・100pt保証の条件を解説
- `articles/2026-10-23-familymart-gift-card-lottery.html` — ファミマの抽選・ファミペイ追加1.5%・対象日を分けて解説
- `articles/2026-10-23-google-play-gift-card-comparison.html` — 2026/10/23時点のセブン、ファミマ、楽天クーポンの買い分けとGoogle Playストア内企画の検証状況を比較
- 既存 `articles/2026-06-20-discount-gift-cards.html` に開催中キャンペーンの入口と楽天クーポンを追記。常設記事の元本文は削除していない
- 新規3記事は各独立SEOタイトル、description、canonical、Article/BreadcrumbList、読めるFAQ、公式ソース、文脈的な相互リンクを実装

## 一次資料（2026年10月23日確認）

- セブン主催: https://vdpro.jp/sej.giftcards9/ （規約 https://vdpro.jp/sej.giftcards9/kiyaku.html ; FAQ https://vdpro.jp/sej.giftcards9/qa.html）
- セブン商品一覧: https://www.sej.co.jp/products/prepaid/detail.html
- ファミマ主催: https://vdpro.jp/fm.posacards13/ （規約 https://vdpro.jp/fm.posacards13/kiyaku.html ; FAQ https://vdpro.jp/fm.posacards13/qa.html）
- ファミマ商品一覧: https://www.family.co.jp/services/posa/posa/detail.html
- ファミペイ2％相当: https://www.family.co.jp/campaign/spot/posa-gmgs-cp.html
- 楽天200円引き: https://event.rakuten.co.jp/computer/gpgiftcard/

## 必ず守る数値と表現

- セブン：1,000円ごと1口、10口まとめて抽選＝累計10,000円、100ポイント最低保証。1口ずつ10回は保証対象外。購入11/15、応募11/16、抽選11/17 23:59まで。景品はPayPayポイントかdポイント（期間・用途限定）。
- ファミマ：3,000円ごと1口、10口まとめ＝累計30,000円、100円分最低保証。購入11/2、応募11/3。1等は10,000円分であり全員への付与ではない。
- ファミペイ：10/25〜11/3の対象期間、追加1.5％＋通常0.5％＝2％相当。抽選の購入期間と重なるのは10/25〜11/2。現金は抽選応募できるが、ファミペイ追加還元は対象外。追加付与分は期間限定。
- 楽天：200円OFF、5,000円以上・1人1回・先着10,000回、クーポン利用期間10/24 20:00〜10/27 9:59。取得のみでは適用されない。
- Google Playストア内最大10％分：別PR #622 で詳細記事を準備中。今ターンで固有規約ページは取得できず、購入先ランキングの確定金額には含めない。
- 買っただけで抽選完了と書かず、必ずマイページ登録→レシート等登録→抽選ボタン操作。
- 期間切れでタイトル・導入の「開催中」は終了案内へ切り替える。セブン11/15、ファミマ11/2、楽天10/27を個別に管理。

## 画像成果物

作成済みローカルZIP: `playpoint-posa-20261023-article-images.zip`

- `articles/ogp/2026-10-23-seven-eleven-gift-card-lottery.png`
- `articles/thumbnails/2026-10-23-seven-eleven-gift-card-lottery-square-v1.webp`
- `articles/ogp/2026-10-23-familymart-gift-card-lottery.png`
- `articles/thumbnails/2026-10-23-familymart-gift-card-lottery-square-v1.webp`
- `articles/ogp/2026-10-23-google-play-gift-card-comparison.png`
- `articles/thumbnails/2026-10-23-google-play-gift-card-comparison-square-v1.webp`

OGPは1200×630、拡張子 .png でJPEG実体。サムネイルは256×256 WebP。**画像は生成したが、GitHub上のバイナリファイルの配置は未完了。**

## 反映前の残工程

1. ZIP内の画像6点をPRブランチの上記パスにアップロード。JPEG実体をPNGバイナリに誤変換しない。
2. `blog/articles.json` に3記事を登録する。各idは記事スラッグ（`2026-10-23-...`）を正本にし、category=`キャンペーン`、browseCategory=`貯める・キャンペーン`、source=`editorial`など既存契約に従う。
3. `scripts/article-image-assets.json` のgenericArticleIdsに上記idを追加し、正規画像ロール同期とOGP画像一意性を通す。
4. 既存の記事生成処理を使い、索引・トップ・feed/atom・sitemap・日付・関連記事を同期。常設記事の更新日は本文追記と一致させたが台帳と生成物の連動は未実施。
5. 実ブラウザで320px・390px・PCの表の横スクロール、ヒーロー画像、目次、応募リンク、FAQを検証。
6. PR GateとOGP MIME/寸法、SEO、Chromium検証に成功するまでマージ・本番公開をしない。
7. 公開済み実URLから画像・canonical・Article JSON-LD・ページ一覧への導線を検証。

## 自動の確認で合格した項目

- 各HTMLにh1とmainがそれぞれ1個、canonical・OGP JPEG・Article・BreadcrumbListが存在
- 目次内アンカーはすべて同一ページに存在
- 3記事の個別タイトルと公式資料へのリンクを保持
- 今回の3記事から、別PR #622にしかない未公開記事へのリンクは張っていない
- 公開レポート・CI成功・本番配信をまだ主張しない

このPRは現時点で**原稿＋HTMLページのDraft**。上記の残工程完了前にマージすると画像リンク切れや一覧未登録を起こすため、マージ禁止。
