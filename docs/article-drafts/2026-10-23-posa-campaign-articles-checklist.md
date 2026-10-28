# POSA3記事の公開準備・検証記録（2026年10月28日）

## 対象と公開判断

PR #624。10月23日に作成した下書き3記事を10月28日の公式条件で更新した。URLの日付は維持し、初回公開日・更新日・公式確認日は実際の公開準備日2026-10-28へ同期する。

- `articles/2026-10-23-seven-eleven-gift-card-lottery.html`
- `articles/2026-10-23-familymart-gift-card-lottery.html`
- `articles/2026-10-23-google-play-gift-card-comparison.html`
- 常設入口 `articles/2026-06-20-discount-gift-cards.html` と `/latest/`

**公開条件：最終HEADの必須PR Gate成功、3記事の320/390/1280px表示確認、未解決の公開障壁なし。その後Squashマージし、Xserver Deploy・本番SEO/HTTP/Chromium・verified状態まで確認する。起動やskippedを成功扱いしない。**

## 公式照合（2026-10-28、日本時間）

| 施策 | 状態と条件 |
| --- | --- |
| セブンPOSA | 開催中。購入10/19 0:00〜11/15 23:59、応募11/16まで、抽選11/17 23:59まで。1,000円で1口、1万円分を専用10口ボタンで引くと100ポイント保証。1口ずつ10回は保証なし。累計100万円まで。 |
| セブン特典 | PayPayポイントまたは期間・用途限定dポイント。登録後の変更不可。2027年1月上旬以降案内予定。メール記載のチャージ期限あり。チャージ後のPayPayは無期限、dポイントは進呈月を1か月目として6か月目の末日まで。 |
| ファミマPOSA | 開催中。購入10/20 0:00〜11/2 23:59、応募11/3 23:59まで。3,000円で1口、3万円分の10口まとめ抽選で100円分保証。予定本数で早期終了。1等1万円分は1人3回まで。 |
| ファミマ特典 | えらべるギフト。PayPayの選択先はPayPayマネーライト。11/26までに案内予定、交換2027/2/28まで。交換後のコードの期限は交換先による。 |
| ファミペイ | 対象期間10/25〜11/3。抽選と購入が重なるのは11/2まで。対象商品のバーコード払いで通常0.5％＋追加1.5％。追加分は1対象期間3,000円相当まで、通常分にこの上限なし。追加分は終了月末までに進呈、有効期限の公式表記は「進呈月を含む6ヶ月後の末日」。 |
| 楽天旧200円OFF | **終了済み**。5,000円以上・先着1万回・1人1回。利用10/24 20:00〜10/27 9:59。現在の固定メリット・おすすめに含めない。 |
| 楽天次回500円OFF | **事前取得可・利用開始前**。取得10/28 10:00〜11/11 1:59、利用11/4 20:00〜11/11 1:59。1万円以上・先着15,000回・1人1回・他クーポン併用不可。決済画面で適用が必要。 |
| Google Playストア内 | 今回は主催者TOP/FAQ/規約を取得・照合できた。Android限定、対象デジタルギフトカード13種、購入11/30 23:59・応募12/1 23:59まで。1件1万円以上で1,000円分、5,000〜9,999円で500円分。合算不可・1人5回・特典5,000円分上限。コンビニ・楽天購入は対象外。12/22までに配信予定、チャージ2027/1/15・残高利用2027/11/29まで。未公開PR #622へのリンクは追加しない。 |
| ローソン秋企画 | 購入10/19・応募10/26終了。常設入口と最新情報で購入・応募終了を明記。応募済みの特典取得は11/2 23:59まで。 |

各抽選はマイページ・レシート等登録の後に抽選ボタン操作が必要。複数カードがあるレシートは、ほかのカード番号を隠し1番号ずつ登録。同じカード・レシート情報の重複応募は無効。読み取り不良は応募期限内に事務局へ問い合わせる。実購入・実応募・当選は行っていない。

## 一次資料

- セブン: https://vdpro.jp/sej.giftcards9/ / https://vdpro.jp/sej.giftcards9/qa.html / https://vdpro.jp/sej.giftcards9/kiyaku.html
- セブン商品: https://www.sej.co.jp/products/prepaid/detail.html
- ファミマ: https://vdpro.jp/fm.posacards13/ / https://vdpro.jp/fm.posacards13/qa.html / https://vdpro.jp/fm.posacards13/kiyaku.html
- ファミマ商品: https://www.family.co.jp/services/posa/posa/detail.html
- ファミペイ: https://www.family.co.jp/campaign/spot/posa-gmgs-cp.html （還元上限・進呈日は同ページの公式画像も確認）
- 楽天: https://event.rakuten.co.jp/computer/gpgiftcard/ （旧200円は10/23のPR公式検証記録と期限も照合）
- Google Playストア内: https://vdpro.jp/google_gifting01/ / https://vdpro.jp/google_gifting01/qa.html / https://vdpro.jp/google_gifting01/kiyaku.html （金額表画像も確認）
- Google公式: https://support.google.com/googleplay/answer/16585331?hl=ja
- ローソン: https://mldata.lawson.co.jp/lab/campaign/googlemileage2609/

## 画像6点と生成物

既存成果物 `playpoint-posa-20261023-article-images.zip` を取得できた。元OGPは拡張子.png・JPEG実体だったため、新規配置は拡張子を.jpgへ統一。既存サイトの.png共有URL・Apache契約は保持する。

- `articles/ogp/2026-10-23-seven-eleven-gift-card-lottery.jpg`
- `articles/ogp/2026-10-23-familymart-gift-card-lottery.jpg`
- `articles/ogp/2026-10-23-google-play-gift-card-comparison.jpg`
- `articles/thumbnails/2026-10-23-seven-eleven-gift-card-lottery-square-v1.webp`
- `articles/thumbnails/2026-10-23-familymart-gift-card-lottery-square-v1.webp`
- `articles/thumbnails/2026-10-23-google-play-gift-card-comparison-square-v1.webp`

OGPはJPEG 1200×630、一覧はWebP 256×256。ファミマのOGP・一覧は組込みImagegenで「1万円」→「1万円分」だけを修正した。編集指示は「金額が現金でなくデジタルコードの価値と分かるよう分を追記。他の日本語・配色・構図・装飾は保持」。Sharpで所定寸法・形式へ書き出した。3記事は独立した画像を使用する。

`blog/articles.json`、画像ロール台帳、公式確認日台帳、関連記事生成元を登録。`node scripts/prepare-pr.cjs` で検索索引・静的一覧/番号ページ・カテゴリ件数・RSS/Atom・サイトマップを同期。記事追加によるカテゴリ件数は既存各記事のサイドバーにも生成反映される。広告・同意・共有CSS・人気順位の設定は変更しない。

## 検証結果と残工程

- 画像役割、JPEG/WebP・OGP寸法/一意性、記事ファクトの対象検査39件は成功。
- 初回全事前検証では未コミット生成物・未追跡画像と新規記事のinline styleを検出。画像の追跡・正規再生成・inline style除去で対処し、検査の閾値は緩めない。
- 既存article-design-smokeへ3記事を追加し、320/390/1280pxで画像・目次・関連記事・横はみ出しとスクリーンショットを検査する。
- 最終コミット後の全事前検証・必須CI・ブラウザ証跡レビュー・マージ・本番確認は、PRの最新実行結果とresume stateで追跡する。未完了工程を成功と記載しない。
