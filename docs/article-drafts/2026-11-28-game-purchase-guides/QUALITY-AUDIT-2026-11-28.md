# 人気ゲーム記事8本・お得カレンダー 公開前品質監査

確認日：2026-11-28（日本時間）。対象 PR #857。監査開始head 4486dd690884c2b3afb0cfb6f343f5e4c640cf8a、照合main 8003cedff93e802d3edfca9362581ffaaa8066d3、記事台帳119件。新規ID・URL重複0。既存ファンパレの課金比較とは周年商品の意図を分離。日本版ログイン後画面、実決済、PC上の未共有作業は未確認。

## 記事別ファクトチェック・公開判断

| 記事 | 公式資料で確認できた範囲 | 残件・判定 |
| --- | --- | --- |
| にゃんこ大商店 | 11/25販売開始、同価格増量、会員登録、未成年購入不可。楽天7%OFFは12/4 20時〜12/11 1:59、税込1,500円以上・先着30,000・1回 | 両経路の日本版の価格と数量。第三者情報に由来する数値を実売と誤認させないため、明示した架空の比較例に変更 |
| にゃんこ14周年 | 大感謝パック・超限定セール11/28 11時〜12/12 10:59、スロット11/26〜12/9、レジェンドチケット11/27〜12/25、30日ログイン各10枚 | 第2期実売パックの内訳・購入上限。価格の未確認例を削除。期間・無料特典ガイドとしてなら記事化可能 |
| MHO | 詳細FAQの米ドル7商品表、初回パック別、最大28%の基準数量。通常時8,080対8,280。別の英語公式ガイドは通常時6,480対8,280と記載 | 公式同士の不一致を冒頭に明示。日本版の同一商品の価格・通常ボーナス・初回共有条件の確認まで実売比較は未確定 |
| ファンパレ | サムザップ公式：第2弾ガチャ11/30 15時、第3弾12/8 15時 | セレクトパックの販売予定は二次情報。商品自体の公式条件未取得、公開保留 |
| ロマサガRS | 8周年パックは有償・無償可、5回、1/1 4時まで。Web無料パックとセールも1/1まで。チケット対象ガチャ1/8まで、30日ログイン最大45,000ジュエルは2/1まで | 円価格・内訳は未確認。価格の仮例を削除、公式利用手順へ差し替え |
| P5X | 11/26メンテナンス後、12/10 10:59切替・メール受取、1/7 10:59無料受取、95枚＋800→400、60,000＋5,000→2,500、バンドル1回 | 日本円価格・地域条件は未確認。公式追加分が2倍であり全商品2倍と誤認させない |
| デュエプレ | 通常150、1日1パック100、専用セット1,500＋SR以上ランダム1枚、上限3、通常10パック一括にチケットなし、無料最大15パック | 円単価・日替わり更新時刻・次弾日時未確認。ジェム単位の比較は成立 |
| ホワサバ | 公式wikiのパック価格、寒霜の星の消費量とチャージポイント目安、公式ショップでGoogle Playギフトカード残高不可 | Web販売の星の数量、増量、個別イベントへの加算を確認できない。購入経路の比較は公開保留 |

一部公式URLは直接openで取得制限、公式検索結果の本文を取得して照合した。MHOの日本向け商品表示は約3週間前の取得データなので現行実売保証に使わない。二次情報を公式発表と混同しない。

## 数値再計算

- にゃんこ例（実売ではなく説明用）：同額1万円・4,000対4,200個。Web側5%増量、10,000×(1−4,000/4,200)=476.190476円、整数円なら477円以上。税抜10,000/1.1×2/100=181.818…→182pt。7%OFF・1pt=1円の仮定なら9,118円、2.2795円/個。割引適用とポイント利用価値が前提。
- MHO FAQ：1,800/6,480=27.7778%、200/8,080=2.47525%、200/12,960=1.54321%。両経路15,000円の仮定なら初回227.9635円、通常362.3188円、必要整数円228/363。273ptは税込15,000円、税率10%、2pt/100円を仮定。日本実売比較ではない。
- デュエプレ：150×10=1,500、100×10=1,000、差500（約33.3%）。SRチケット内容、10日かかる条件、無料券と有料セットは別。
- ホワサバ：仮に5%多いなら必要割引率4.7619%。実際の増量ではない。
- 税抜対象額・購入単位の四捨五入・最も高い適用獲得率・利用価値を区別。ポイントを現金と同一視しない。

## 文体・SEO

AGENTS.md・ARTICLE_ROLES・ARTICLE_DESIGN_SYSTEM・GAME_THUMBNAIL_POLICY・OGP_SPECIFICATION_POLICYを踏襲。8本の本文、title、H1、description、OGP/Twitter、Article/BreadcrumbList、記事台帳候補を同期。検索タイトルは正式名/略称・商品名・具体的な数字または期限を優先し、未確認の価格・最安を約束しない。お得さを説明した後に注意の反復を避け、確定情報と仮定を判断箇所で区別。出典は日本語向け公式資料・公式アプリ掲載を優先し、P5X等では受取と購入を分ける。旧タイトルの混入なし。全8HTMLのJSON-LD解析、見出しID一意、title/H1/OGP/Twitter/Article/description整合、noindexを静的に確認。不要なFAQは作らない。公開前原稿の公開日表示・Article日時を削除し、実公開日に戻す契約を明示。検索ボリューム・最新Search Consoleクエリは未取得。Googleが検索結果のタイトル・説明を自動生成するため表示・順位は保証しない。

## OGPと公式アプリアイコン

- 専用OGP8本のURL・1200×630 JPEGのメタは準備済みだが、画像実体は未制作・未登録。画像の一意性、寸法、JPEG実体、配信HTTP、alt、Article.imageとTwitter.imageの一致を公開前に検証する。
- 7ゲーム中、ファンパレの既存128px・240px WebPを取得して目視。現行台帳とファイルを確認。最新公式ストア画像との同一性、利用条件の再確認が必要。ほか6ゲームは公式日本向けアプリ掲載の特定まで。
- 既存ファンパレOGP実物：濃紺背景、青緑アクセント、左に大見出し、右にアプリアイコン、下に小さな補助ラベル。今回もその雰囲気を維持しつつ、タイトルは2〜3行、補助ラベルは最小限にする。価格・割引率は確認済みの場合だけ画像に入れる。周年限定の公式キービジュアルは権利・出典確認が前提。公式掲載ページの確認は画像利用許諾ではない。
- Google Discoverの現行推奨は幅1200px以上・16:9・文字過多回避。既存SNS用1200×630契約を独断で変更しない。16:9自動切り抜きで主題を欠かさないよう構図を確認する。公開時max-image-preview:largeを復元する。

| ゲーム | 日本向け公式アプリ | 一覧アイコン |
| --- | --- | --- |
| にゃんこ大戦争 | [Google Play](https://play.google.com/store/apps/details?gl=JP&hl=ja&id=jp.co.ponos.battlecats) | 新規取得・権利確認・台帳登録待ち |
| モンハンアウトランダーズ | [Google Play](https://play.google.com/store/apps/details?gl=JP&hl=ja&id=com.tencent.mhadv) | 新規取得・権利確認・台帳登録待ち |
| ファンパレ | [Google Play](https://play.google.com/store/apps/details?gl=JP&hl=ja&id=jp.co.sumzap.pj0014) | 既存2サイズ・目視確認済み（最新性未確認） |
| ロマサガRS | [Google Play](https://play.google.com/store/apps/details?gl=JP&hl=ja&id=com.square_enix.android_googleplay.RSRS) | 新規取得・権利確認・台帳登録待ち |
| P5X | [Google Play](https://play.google.com/store/apps/details?gl=JP&hl=ja&id=com.sega.persona5.the.phantomx.jp) | 新規取得・権利確認・台帳登録待ち |
| デュエプレ | [Google Play](https://play.google.com/store/apps/details?gl=JP&hl=ja&id=jp.co.takaratomy.duelmastersplays) | 新規取得・権利確認・台帳登録待ち |
| ホワサバ | [Google Play](https://play.google.com/store/apps/details?gl=JP&hl=ja&id=com.gof.global) | 新規取得・権利確認・台帳登録待ち |

MHOはLevel Infiniteのcom.tencent.mhadv。Garena版やモンハンNowと混同しない。新規アイコンは公式CDNから取得・リサイズして保存、外部ホットリンクをしない。公式素材が確認できなければGAME_THUMBNAIL_POLICYに従ってフォールバックする。

## お得カレンダー

データ9件と本文・公式発表を照合。P5Xの開始18:00は根拠がないためnull・メンテナンス後と明示。無料受取と購入、メール受取条件を区別。開始時刻や終了日が分からない場合は日時要確認。埋込JSONとデータの一致、静的一覧、開始前/開始/終了境界、日時未確定、ID一意を確認。期限は運営公表予定で販売状態の保証ではない。正式サイトシェル、絞り込み、320/390/1280px・ダークモード・キーボードの実ブラウザ検証は未実施。

## リリース判断

優先：デュエプレ、ロマサガRS、P5X、にゃんこ14周年（確定した日程・無料特典に限定）。にゃんこ大商店、MHOの実売比較は実画面の追加確認を優先。ファンパレ・ホワサバは保留継続。全記事は専用OGP、画像台帳、公開日、robots、生成元・生成物、内部リンク、サイトマップ、実ブラウザ、最新headのPR Gateの完了まで非公開。既存CSS、広告、トップ、公開記事、mainの公開ルートは変更しない。現在のHTMLはdocs配下の候補であり、実公開ルートの相対アセット確認は未完了。

## 参照先

- https://battlecats.club/news/game/news_4558/
- https://battlecats.club/news/game/20261126_14th-event/
- https://event.rakuten.co.jp/computer/gpgiftcard/
- https://www.midasbuy.com/midasbuy/jp/article/monster-hunter-outlanders-top-up-faq-news_hdpsuw
- https://www.midasbuy.com/midasbuy/jp/buy/monster-hunter-outlanders?lang=ja
- https://www.midasbuy.com/midasbuy/mc/article/monster-hunter-outlanders-top-up-news_err9yt
- https://sumzap.co.jp/2026/11/15/f84c781794913122/
- https://games.aktsk.jp/news/62839/
- https://www.jp.square-enix.com/saga_reuniverse/notice/webjewelshop/
- https://p5x.jp/news/details/0015330WPp2yAY.html
- https://dmps.takaratomy.co.jp/news/16646
- https://dmps.takaratomy.co.jp/news/16648
- https://www.whiteoutsurvival.wiki/ja/vip-post/%E7%B7%8F%E5%90%88%E6%A1%88%E5%86%85/
- https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja
- https://support.google.com/googleplay/answer/11174377?hl=ja
- https://developers.google.com/search/docs/appearance/title-link?hl=ja
- https://developers.google.com/search/docs/appearance/snippet?hl=ja
- https://developers.google.com/search/docs/appearance/google-discover?hl=ja
