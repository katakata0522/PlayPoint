# 2026-11-27 新規記事7本の編集・実装引継ぎ

## 状態と根拠

日本語の本文原稿7本。2026-11-27に公式ヘルプの検索結果を取得して照合した。モンハンNowのジェム資料はページ本文も取得。Googleヘルプの一部で429／キャッシュ取得失敗があり、検索結果の公式抜粋を基準にした箇所があるため、公開直前に対象の公式ページを再取得し、該当記述を全文で確認する。ログイン後の画面、個別アカウント、実決済・登録・解約は未検証。著者の体験として創作しない。公開日・全公式情報確認日を原稿作成日で自動確定しない。

mainの既存記事台帳と未マージPR #848（新規クレジット使い道・Google ストアポイント記事）を踏まえた企画。月間検索数・最新GSCクエリデータは未取得。以下は検索意図の仮説であり順位・流入保証ではない。既存ページと検索意図ownerが重複しないかを公開前に再照合する。

| 原稿 | 主クエリ・読者の疑問 | Role案 | メタ説明案 | 実装時の関連導線 |
| --- | --- | --- | --- | --- |
| google-play-gift-card-not-working.md | ギフトカード 使えない／詳しい情報／別アカウント／返品 | troubleshooting | Google Playギフトカードがチャージできないときのエラー別の確認先。有効化、誤登録、本人確認、利用限度、返金を整理。 | gift-card、play-credit-not-working、country-change、上限原稿 |
| google-play-balance-use-up.md | Google Play残高 使い切る／余り／端数／100円以下 | decision_support | 余った10円・100円のGoogle Play残高を、次の購入や併用払いで無駄なく使う方法。追加支払いの計算例も紹介。 | balance-combine-payment、期限原稿、PR #848のクレジット使い道（公開確認後のみ） |
| google-play-gift-card-balance-expiration.md | ギフトカード 有効期限／Google Play残高 期限 | reference | 日本の通常ギフトカード残高とPlay Points交換・キャンペーン残高の有効期限の違い。年末・機種変更時の注意点。 | expiration、rank-maintenance、device-change、gift-card |
| monster-hunter-now-web-store-vs-google-play.md | モンハンNow 課金 お得／Web Store／ハンターパス | game_decision | モンハンNowの初回ジェム購入例とハンターパスの追加ジェムを公式情報から比較。Google Play Pointsとの損得分岐点も試算。 | web-store-external-billing-points、discount-gift-cards、汎用計算機。ゲーム専用計算機は未作成。存在しないURLへ誘導しない。 |
| google-play-balance-charge-limit.md | Google Play 残高 上限／チャージ 上限 | reference | 日本の残高保有上限20万円とGoogle Play内のギフトカード購入制限の違い。上限までの余裕とエラー対応を解説。 | gift-card、discount-gift-cards、ギフトカードエラー原稿 |
| google-play-payment-failed.md | Google Play 課金できない／支払い拒否／残高・携帯決済 | troubleshooting | Google Playで課金できないときの注文履歴、カード、携帯決済、残高の確認順。購入済みアイテム未着との違い。 | reflection-timing、purchase-history-budget、balance-combine-payment |
| google-play-pass-after-cancellation.md | Play Pass 解約 どうなる／セーブデータ／特典 | decision_support | Play Passを解約するとゲームやセーブデータはどうなる？利用権、広告、割引、木曜特典、家族の扱いを整理。 | play-pass-worth-it、diamond-play-pass-value、weekly-reward |

## 実装時の品質条件

- AGENTS.mdの文体・読後感、ARTICLE_ROLES、ARTICLE_DESIGN_SYSTEMを継承。既存の日本語記事サイドバー（sidebar-column ja-article-sidebar）と共通CSS、広告設定、既存のトップUIは変更しない。
- 記事固有の比較表は読み取りやすく、注意枠は誤購入など重大な条件に限定。トラブル記事は公式解決先を主導線とし、計算機への無理な誘導はしない。
- 残高使い切り原稿の試算は整数円で、残高・購入額の差を表示。任意のクーポン・併用可否を自動保証しない。入力が空、0、負数、小数、上限超過の場合を検証してから必要なら計算UIを実装する。
- モンハンNow記事の価格は公式掲載の初回例。最新実売を確認できない限り「現在の販売価格」と表示しない。ゲーム内外の同一商品・初回条件・定期購入を混ぜない。14,000×15,000÷16,500=12,727.27円、差額=1,272.73円（約1,273円）を試算の前提とともに提示。
- 一般記事の専用OGPは1200×630 JPEG、一覧用は256×256 WebP。ゲーム記事の一覧アイコンは既存契約に従い、権利・出所を確認してから用意する。画像実体・台帳・head・JSON-LDの整合を検証。画像は今回未制作。
- 実装時は実際の生成元・記事台帳・Role登録・検索インデックス・サイトマップ・hreflang・関連導線を同期。既存PR #848と衝突しないよう最新mainを基準に確認。未公開URLに本番記事からリンクしない。
- 公開前に320/390/1280px等で実ブラウザ検証し、現在のhead SHAのPR Gateを通す。マージ・配信・本番URLの検証を別々の状態として記録する。今回は執筆範囲に留め、HTML、生成物、画像、公開URL、既存ページは変更しない。
