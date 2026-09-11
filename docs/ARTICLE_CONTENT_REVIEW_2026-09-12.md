# 全記事内容監査の修正記録 — 2026年9月12日

対象は公開159記事と非掲載2記事。サブエージェントは使用していない。前回監査のP1 23記事・P2 53記事を個別に修正し、関連2記事を合わせて78記事の本文等を変更した。ほか1記事は関連記事のPixel案内ラベルのみ同期。残る公開記事は前回全文確認の判定を維持。広告枠・広告設定は変更対象外。

## 修正方針

- 本文・FAQ・構造化データ・検索用説明文の意味を揃える。
- 獲得費用、交換価値、今年の進捗、現在ランクを分ける。途中昇格を含む連続近似は実決済の保証にしない。
- ゲーム記事は一次情報付きの受取条件・実商品例を加え、過去商品と現行販売を区別する。
- 海外版は現地通貨での仮例と地域条件を使い、制作事情や繰り返しを削る。
- トラブル記事は計算機より解決先を優先し、タイトルの後に回答を置く。

## 出典再確認と不確実性

2026年9月12日に以下を確認。記事全体の公式確認日を一律に更新することはせず、新規確認事項の出典・日付を本文または本記録に残す。

- [獲得・期限・インストール特典](https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja)
- [登録条件（18歳以上）](https://support.google.com/googleplay/answer/15776077?hl=ja)
- [日本のランク条件](https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DJP&hl=ja)
- [ポイント使用・対象国のチェックアウト・ポイント履歴](https://support.google.com/googleplay/answer/9079840?hl=en)
- [ラーニングガイドの保存済み特典の案内](https://support.google.com/googleplay/answer/15776916?hl=en)
- [Opinion RewardsのPlayクレジット](https://support.google.com/opinionrewards/answer/6322284?hl=en)
- [Google Storeコードへの交換](https://support.google.com/store/answer/12119039?hl=ja)
- [Pass加入によるGoldの対象国](https://support.google.com/googleplay/answer/14673382?hl=en)
- [パズドラパスFAQ](https://pad.gungho.jp/member/pdpass/faq.html)
- [ドッカンのガシャポイント](https://bnfaq.channel.or.jp/faq/detail/8775)
- [ドッカンの異なるOS間の引き継ぎ](https://bnfaq.channel.or.jp/faq/detail/1625/8122)
- [ウマ娘4.5周年の過去商品例](https://umamusume.jp/news/detail?id=2727)
- [楽天認定店購入条件](https://event.rakuten.co.jp/computer/gpgiftcard/detail/)
- [楽天認定店決済・受け取り](https://event.rakuten.co.jp/computer/gpgiftcard/)

クーポンの保存先は公式二資料の記載が異なるため、片方を廃止扱いせず両方の確認経路を記載した。Super Ticketの旧公式URLは取得時にNot Foundとなり、30日／90日周期や元報酬の扱いを現行保証から外した。制度終了とは断定していない。

TGS・Diamond Valleyの非掲載2記事は、日本の2026年対象条件を確定できる新規一次資料を今回の検索で確認できず、非掲載を維持した。台湾のギフトカード提供一覧は公式ページ取得制限のため、現行提供有無の再確認は保留。ログイン後の特典表示・実購入・ネイティブ校閲は実施していない。

## 検証

- 全回帰テスト：615件中614件成功・失敗0・既定スキップ1。続く重複ID修正は7件の対象テスト成功。
- 全161記事のJSON-LD解析成功。広告枠は修正前と一致。
- 見出し・表の列・目次リンクのDOM検査で見つけた2件の重複IDを修正。
- 全159公開記事のPC1280px・スマートフォン390px・狭幅320px表示検証を実施中。
- コミット後の生成再現性、PR Gate、本番反映は続けて確認する。

## 全161記事の記録

|記事|監査時|今回の対応|修正・判断内容|
|---|---|---|---|
|[articles/2026-08-25-pad-puzzle-and-dragons-play-points.html](../articles/2026-08-25-pad-puzzle-and-dragons-play-points.html)|P2|修正済み|パズパス固有の配信・経験値・受取・更新条件を追加|
|[articles/2026-08-25-dokkan-battle-dragon-ball-play-points.html](../articles/2026-08-25-dokkan-battle-dragon-ball-play-points.html)|P2|修正済み|未確認の商品固有名を一般化しゲーム公式の交換・OS移行条件を追加|
|[articles/2026-08-24-umamusume-half-anniversary-points.html](../articles/2026-08-24-umamusume-half-anniversary-points.html)|P2|修正済み|一次情報付きの過去商品例で券の種類・除外対象・販売経路を具体化|
|[articles/2026-08-19-play-points-locked.html](../articles/2026-08-19-play-points-locked.html)|P2|修正済み|導入の重複を整理|
|[articles/2026-08-19-install-offer-points-not-received.html](../articles/2026-08-19-install-offer-points-not-received.html)|P1|修正済み|反映目安と保証の区別|
|[articles/2026-08-19-redeemed-item-not-received.html](../articles/2026-08-19-redeemed-item-not-received.html)|P2|修正済み|公開本文の編集履歴を除去|
|[articles/2026-08-19-web-store-external-billing-points.html](../articles/2026-08-19-web-store-external-billing-points.html)|OK|確認済み・変更不要|課金経路・特典・問い合わせ先を分け、比較の軸が具体的。|
|[articles/2026-08-19-play-points-google-store.html](../articles/2026-08-19-play-points-google-store.html)|OK|確認済み・変更不要|Play Points・Storeコード・Storeポイント・Playクレジットを区別し、購入手順が具体的。多少の重複あり。|
|[articles/2026-08-17-tgs-google-play-vip.html](../articles/2026-08-17-tgs-google-play-vip.html)|HOLD|非掲載を維持|非掲載。8/18時点の未確認という保留記事。現時点のイベント発表有無は別途再調査が必要。|
|[articles/2026-08-17-diamond-valley-festival-guide.html](../articles/2026-08-17-diamond-valley-festival-guide.html)|HOLD|非掲載を維持|非掲載。過去実績と2026年の未確認を区別。最新開催状況は未再確認。|
|[articles/2026-08-16-play-pass-worth-it.html](../articles/2026-08-16-play-pass-worth-it.html)|OK|確認済み・変更不要|木曜Pass/金曜通常/加入によるGoldを区別。料金そのものと収支例がないので『入るべき』への判断材料は追加余地。|
|[articles/2026-08-16-pc-play-games-points.html](../articles/2026-08-16-pc-play-games-points.html)|OK|確認済み・変更不要|PC限定ブーストと通常対象購入、スマホ限定機能を明確に区別。|
|[articles/2026-08-16-fastest-gold.html](../articles/2026-08-16-fastest-gold.html)|P2|修正済み|Silverというランクと今年の250点進捗を区別。不足額FAQの文を整理|
|[articles/2026-08-16-fastest-platinum.html](../articles/2026-08-16-fastest-platinum.html)|P2|修正済み|Goldと今年の1000点進捗を区別。不足額FAQの文を整理|
|[articles/2026-08-16-gold-platinum-worth-it.html](../articles/2026-08-16-gold-platinum-worth-it.html)|P1|修正済み|年間合計と追加費用、特典付与方向を分離。Pass特典の方向と対象国を公式に合わせる|
|[articles/2026-08-16-premium-support.html](../articles/2026-08-16-premium-support.html)|P2|修正済み|問い合わせ入口と表示されない場合の確認順を具体化|
|[articles/2026-08-16-payment-methods-points.html](../articles/2026-08-16-payment-methods-points.html)|P2|修正済み|獲得率と別制度の実質還元を区別|
|[articles/2026-08-16-points-disappeared.html](../articles/2026-08-16-points-disappeared.html)|P1|修正済み|残高の失効起点と未受取期限|
|[articles/2026-08-16-family-link-play-points.html](../articles/2026-08-16-family-link-play-points.html)|P2|修正済み|後から管理対象になる場合を区別|
|[articles/2026-08-16-play-points-day.html](../articles/2026-08-16-play-points-day.html)|P2|修正済み|情報源の比較表と最終獲得率の読み方を整理|
|[articles/2026-08-16-youtube-premium-play-points.html](../articles/2026-08-16-youtube-premium-play-points.html)|P2|修正済み|契約開始日と参加後の更新請求を区別し履歴照合例を追加|
|[articles/2026-08-16-pixel-discount-coupon.html](../articles/2026-08-16-pixel-discount-coupon.html)|P1|修正済み|Pixel個別配布とポイント交換の違い|
|[articles/2026-08-16-weekly-reward-not-showing.html](../articles/2026-08-16-weekly-reward-not-showing.html)|OK|確認済み・変更不要|症状ごとの切り分けと画面手順があり、週次の種類を分けられる。|
|[articles/2026-08-16-january-rank-reset.html](../articles/2026-08-16-january-rank-reset.html)|P2|修正済み|到達年・保証期間・再判定年を具体例で明示|
|[articles/2026-08-05-play-points-levels-guide.html](../articles/2026-08-05-play-points-levels-guide.html)|OK|確認済み・変更不要|段階別の累計購入額約25,000/85,000/285,000/913,600円を仮定付きで説明。他記事14の年間総額と矛盾する比較基準として有用。|
|[articles/2026-08-05-play-points-cannot-join.html](../articles/2026-08-05-play-points-cannot-join.html)|P1|修正済み|登録条件の年齢追記。加入条件表の列数と出典を修正|
|[articles/2026-08-05-play-country-change-points.html](../articles/2026-08-05-play-country-change-points.html)|OK|確認済み・変更不要|Pointsの喪失とPlay残高の国紐付け、契約継続を区別。90日ルールの最新確認対象。|
|[articles/2026-08-05-play-points-multiplier-stacking.html](../articles/2026-08-05-play-points-multiplier-stacking.html)|P2|修正済み|末尾の重複説明を削除|
|[articles/2026-08-05-fastest-silver.html](../articles/2026-08-05-fastest-silver.html)|P2|修正済み|導入と末尾の手順反復を整理|
|[articles/2026-08-03-play-points-device-change.html](../articles/2026-08-03-play-points-device-change.html)|OK|確認済み・変更不要|旧端末不要・ゲームデータ別・Pass15日は残高消失ではない、という読者の疑問に具体的に答える。|
|[articles/2026-07-31-super-weekly-reward.html](../articles/2026-07-31-super-weekly-reward.html)|OK|確認済み・変更不要|公式と国内観測、過去例と現行条件を区別。具体例があり記事としての厚みは強い。Super Ticketの過去仕様を実行判断に使う点は最新規約再確認対象。|
|[articles/2026-07-31-google-play-quests.html](../articles/2026-07-31-google-play-quests.html)|OK|確認済み・変更不要|達成条件、アカウント/設定、返金の関係を具体的に説明。通常の購入とクエスト条件を区別できる。|
|[articles/2026-07-25-play-points-coupon-not-applied.html](../articles/2026-07-25-play-points-coupon-not-applied.html)|P2|修正済み|公式二資料のクーポン確認先を併記。トラブル記事の計算誘導を解決先へ変更|
|[articles/2026-07-25-play-credit-not-working.html](../articles/2026-07-25-play-credit-not-working.html)|P2|修正済み|トラブル記事の計算誘導を解決先へ変更|
|[articles/2026-07-24-play-points-cash-conversion.html](../articles/2026-07-24-play-points-cash-conversion.html)|OK|確認済み・変更不要|交換先ごとの条件と払い戻しの違いを具体的に整理。固定最適解を避け、現金化の代替が分かる。|
|[articles/2026-07-24-play-points-1-value.html](../articles/2026-07-24-play-points-1-value.html)|P2|修正済み|丸め比較ツールへの誘導を主回答の後へ移動。重複した関連記事欄を統合しID重複を解消|
|[articles/2026-07-24-play-points-500-1000-value.html](../articles/2026-07-24-play-points-500-1000-value.html)|P1|修正済み|固定倍率表の前提・段階例・交換価値|
|[articles/2026-07-24-earn-play-points-free.html](../articles/2026-07-24-earn-play-points-free.html)|P2|修正済み|無料記事のSuper Ticket断定修正|
|[articles/2026-07-24-play-points-100-value.html](../articles/2026-07-24-play-points-100-value.html)|P1|修正済み|100点FAQの断定を本文と統一|
|[articles/2026-06-20-discount-gift-cards.html](../articles/2026-06-20-discount-gift-cards.html)|P1|修正済み|根拠のない最強・固定還元・即時発行を撤回し確定還元で比較|
|[articles/2026-03-10-play-points-reflection-timing.html](../articles/2026-03-10-play-points-reflection-timing.html)|OK|確認済み・変更不要|反映7日は保証ではないと正しく区別。注文/履歴/アカウント/参加時期の分岐が具体的。4の記事との差異は大きい。|
|[articles/2025-12-25-multiple-accounts.html](../articles/2025-12-25-multiple-accounts.html)|OK|確認済み・変更不要|合算不可、購入者アカウント、家族の支払いを分け、用途別の判断材料あり。|
|[articles/2025-12-25-play-games.html](../articles/2025-12-25-play-games.html)|OK|確認済み・変更不要|GamesとPoints、クエスト・PC・リーグの関係を具体的に整理。インストール7日も記載済み。|
|[articles/2025-12-25-movies-books.html](../articles/2025-12-25-movies-books.html)|P2|修正済み|書籍固有の購入判断を追加|
|[articles/2025-12-25-expiration.html](../articles/2025-12-25-expiration.html)|OK|確認済み・変更不要|最後の獲得・使用から1年を明示し、残高・ランク・交換後の期限を区別。17の誤記修正の基準にできる。|
|[articles/2025-12-25-promo-code.html](../articles/2025-12-25-promo-code.html)|P2|修正済み|税抜対象額が判明した具体計算を追加|
|[articles/2025-12-25-check-balance.html](../articles/2025-12-25-check-balance.html)|OK|確認済み・変更不要|4種類の数字と履歴の読み方が具体的。『使う』タブの期限確認をFAQにも明示すると一貫する。|
|[articles/2025-12-25-refund.html](../articles/2025-12-25-refund.html)|OK|確認済み・変更不要|獲得ポイントの減算と交換に使ったポイントの返却、解約と返金を区別。負残高の数値例あり。|
|[articles/2025-12-25-gift-card.html](../articles/2025-12-25-gift-card.html)|P2|修正済み|Play残高と外部決済の矛盾を訂正|
|[articles/2025-12-25-family-sharing.html](../articles/2025-12-25-family-sharing.html)|OK|確認済み・変更不要|共有不可の残高と共有可能なコンテンツを分ける。集約は購入所有権も考慮する旨を41と揃える余地。|
|[articles/2025-12-25-subscription.html](../articles/2025-12-25-subscription.html)|OK|確認済み・変更不要|請求経路・更新・初回特典・解約返金を切り分け、具体的な確認手順がある。|
|[articles/2025-12-25-weekly-reward.html](../articles/2025-12-25-weekly-reward.html)|OK|確認済み・変更不要|個人実測を平均や保証にせず、通常/スーパー/Passを区別。日記への自然な接続と読む楽しさがある。|
|[articles/2025-12-25-getting-started.html](../articles/2025-12-25-getting-started.html)|P1|修正済み|始め方の加入前提|
|[articles/2025-12-25-new-year-campaign.html](../articles/2025-12-25-new-year-campaign.html)|P2|修正済み|編集履歴を除去し年またぎ期限の具体例を追加|
|[articles/2025-12-25-diamond-vip.html](../articles/2025-12-25-diamond-vip.html)|OK|確認済み・変更不要|プラチナ共通特典をダイヤ固有として二重計上せず、到達後の追加率で判断する構造が良い。|
|[articles/2025-12-25-campaign.html](../articles/2025-12-25-campaign.html)|P2|修正済み|待機による価格差と増加ポイントの比較例|
|[articles/2025-12-25-best-use.html](../articles/2025-12-25-best-use.html)|OK|確認済み・変更不要|実質価値の式と最低購入額の例を示し、期限・返金を踏まえて選べる。38のFAQとは方針が不一致。|
|[articles/2025-12-25-diamond-worth-it.html](../articles/2025-12-25-diamond-worth-it.html)|OK|確認済み・変更不要|維持時の75万円と初到達額を明確に区別。追加率差25pt/1万円を示す比較は有用。|
|[articles/2025-12-25-playpoints-rank-maintenance.html](../articles/2025-12-25-playpoints-rank-maintenance.html)|P2|修正済み|到達翌年と翌々年の主語を統一|
|[en/articles/2026-06-20-discount-gift-cards.html](../en/articles/2026-06-20-discount-gift-cards.html)|OK|確認済み・変更不要|購入予定額・還元上限・正規販売店を具体例で説明。日本版の恒常的な最強断定より適切。|
|[en/articles/google-play-balance-combine-payment.html](../en/articles/google-play-balance-combine-payment.html)|P1|修正済み|対象国でのチェックアウト併用を説明|
|[en/articles/google-play-games-vs-play-points.html](../en/articles/google-play-games-vs-play-points.html)|OK|確認済み・変更不要|GamesのXPとPoints、PCとスマホの条件を分けて説明。|
|[en/articles/google-play-points-100-value.html](../en/articles/google-play-points-100-value.html)|P2|修正済み|重複した獲得費用の説明を交換価値の具体例へ|
|[en/articles/google-play-points-500-1000-cost.html](../en/articles/google-play-points-500-1000-cost.html)|P1|修正済み|固定倍率と途中昇格の区別|
|[en/articles/google-play-points-apps-books-purchases.html](../en/articles/google-play-points-apps-books-purchases.html)|P2|修正済み|制作意図の露出を除去|
|[en/articles/google-play-points-balance-history-progress.html](../en/articles/google-play-points-balance-history-progress.html)|P2|修正済み|FAQ履歴の案内を本文と統一|
|[en/articles/google-play-points-cash-conversion.html](../en/articles/google-play-points-cash-conversion.html)|OK|確認済み・変更不要|現金化不可の理由と代替用途を説明。|
|[en/articles/google-play-points-country-change.html](../en/articles/google-play-points-country-change.html)|OK|確認済み・変更不要|国変更の要件・48時間・残高とポイントの違いを順序立てて説明。|
|[en/articles/google-play-points-country-differences.html](../en/articles/google-play-points-country-differences.html)|OK|確認済み・変更不要|地域別数値と移植できない条件を分け、関連記事への案内が具体的。|
|[en/articles/google-play-points-coupon-not-applied.html](../en/articles/google-play-points-coupon-not-applied.html)|OK|修正済み|公式二資料のクーポン確認先を併記|
|[en/articles/google-play-points-device-change.html](../en/articles/google-play-points-device-change.html)|OK|確認済み・変更不要|端末変更時の症状から原因を絞る説明に価値がある。|
|[en/articles/google-play-points-discounts-promo-codes.html](../en/articles/google-play-points-discounts-promo-codes.html)|P2|修正済み|FAQ税抜条件を補完|
|[en/articles/google-play-points-earn-free.html](../en/articles/google-play-points-earn-free.html)|P1|修正済み|アンケート報酬とポイントを区別|
|[en/articles/google-play-points-expiration.html](../en/articles/google-play-points-expiration.html)|OK|確認済み・変更不要|最新獲得・使用から1年とランク・交換済み報酬期限を明確に区別。|
|[en/articles/google-play-points-family-sharing.html](../en/articles/google-play-points-family-sharing.html)|OK|確認済み・変更不要|家族決済でも購入者に付くこととライブラリ共有を区別。|
|[en/articles/google-play-points-fastest-silver.html](../en/articles/google-play-points-fastest-silver.html)|OK|確認済み・変更不要|Silver前に週次報酬を使えない点と残りポイントの例が具体的。|
|[en/articles/google-play-points-gift-cards.html](../en/articles/google-play-points-gift-cards.html)|P2|修正済み|SEO制作事情の露出を除去|
|[en/articles/google-play-points-join-eligibility.html](../en/articles/google-play-points-join-eligibility.html)|OK|確認済み・変更不要|18歳・国・管理・決済の条件と症状の対応が具体的。|
|[en/articles/google-play-points-level-maintenance-reset.html](../en/articles/google-play-points-level-maintenance-reset.html)|P2|修正済み|到達年・維持年・再判定年の具体例|
|[en/articles/google-play-points-levels.html](../en/articles/google-play-points-levels.html)|P1|修正済み|ランク閾値と支出を区別|
|[en/articles/google-play-points-multiple-accounts.html](../en/articles/google-play-points-multiple-accounts.html)|OK|確認済み・変更不要|購入者・資金提供者・加入時期を区別し実用的。|
|[en/articles/google-play-points-not-showing.html](../en/articles/google-play-points-not-showing.html)|P2|修正済み|通常対象の残高購入を除外扱いせず具体的原因で切り分け。本文とサイドバーの関連記事ID重複を解消|
|[en/articles/google-play-points-platinum-diamond-cost.html](../en/articles/google-play-points-platinum-diamond-cost.html)|OK|確認済み・変更不要|到達費用と維持費用を明確に分け、下位ランク途中昇格も説明。|
|[en/articles/google-play-points-play-credit-not-working.html](../en/articles/google-play-points-play-credit-not-working.html)|OK|確認済み・変更不要|交換前後を分けて原因を追える。|
|[en/articles/google-play-points-promotion-not-applied.html](../en/articles/google-play-points-promotion-not-applied.html)|P2|修正済み|一般条件と個別除外を分け上限の仮例を追加|
|[en/articles/google-play-points-promotion-stacking.html](../en/articles/google-play-points-promotion-stacking.html)|OK|確認済み・変更不要|最終付与率と倍率を数値例で区別。|
|[en/articles/google-play-points-refund.html](../en/articles/google-play-points-refund.html)|OK|確認済み・変更不要|解約と返金、負残高、交換クーポン返還の違いまで説明。|
|[en/articles/google-play-points-rounding-tax.html](../en/articles/google-play-points-rounding-tax.html)|OK|確認済み・変更不要|税抜・個別丸めの具体例があり実用的。|
|[en/articles/google-play-points-subscriptions.html](../en/articles/google-play-points-subscriptions.html)|OK|確認済み・変更不要|初回と更新、無料期間と課金を区別。|
|[en/articles/google-play-points-super-weekly-reward.html](../en/articles/google-play-points-super-weekly-reward.html)|P1|修正済み|Super Ticket現行未確認の扱いを統一|
|[en/articles/google-play-points-use-coupons.html](../en/articles/google-play-points-use-coupons.html)|OK|修正済み|交換ガイドにも両方の公式確認経路を反映|
|[en/articles/google-play-points-weekly-reward.html](../en/articles/google-play-points-weekly-reward.html)|OK|確認済み・変更不要|木曜・金曜・Superを区別。89と公式根拠の扱いを統一したい。|
|[en/articles/google-play-quests.html](../en/articles/google-play-quests.html)|OK|確認済み・変更不要|購入・ゲーム条件・返金・追跡設定を具体的に説明。|
|[ko/articles/2026-06-20-discount-gift-cards.html](../ko/articles/2026-06-20-discount-gift-cards.html)|OK|確認済み・変更不要|韓国用カード・上限・予定支出の例を具体化。|
|[ko/articles/google-play-balance-combine-payment.html](../ko/articles/google-play-balance-combine-payment.html)|P1|修正済み|対象国でのチェックアウト併用を説明|
|[ko/articles/google-play-games-vs-play-points.html](../ko/articles/google-play-games-vs-play-points.html)|OK|確認済み・変更不要|XPとポイント、PCとクエストの違いが明確。|
|[ko/articles/google-play-points-100-value.html](../ko/articles/google-play-points-100-value.html)|P2|修正済み|重複した獲得費用の説明を交換価値の具体例へ|
|[ko/articles/google-play-points-500-1000-cost.html](../ko/articles/google-play-points-500-1000-cost.html)|P1|修正済み|固定倍率と途中昇格の区別|
|[ko/articles/google-play-points-apps-books-purchases.html](../ko/articles/google-play-points-apps-books-purchases.html)|OK|確認済み・変更不要|韓国の書籍購入と他国の書籍ボーナスを区別。|
|[ko/articles/google-play-points-balance-history-progress.html](../ko/articles/google-play-points-balance-history-progress.html)|P2|修正済み|FAQ履歴の案内を本文と統一|
|[ko/articles/google-play-points-cash-conversion.html](../ko/articles/google-play-points-cash-conversion.html)|OK|確認済み・変更不要|換金不可と使える価値を分ける。導入は長めだが実用的。|
|[ko/articles/google-play-points-country-change.html](../ko/articles/google-play-points-country-change.html)|OK|確認済み・変更不要|国変更の影響と前後の確認が明確。|
|[ko/articles/google-play-points-country-differences.html](../ko/articles/google-play-points-country-differences.html)|OK|確認済み・変更不要|韓国と他国の数値差・適用不可の説明が具体的。|
|[ko/articles/google-play-points-coupon-not-applied.html](../ko/articles/google-play-points-coupon-not-applied.html)|P2|修正済み|現地通貨の仮例。公式二資料のクーポン確認先を併記|
|[ko/articles/google-play-points-device-change.html](../ko/articles/google-play-points-device-change.html)|OK|確認済み・変更不要|端末変更の症状別チェックが有用。|
|[ko/articles/google-play-points-discounts-promo-codes.html](../ko/articles/google-play-points-discounts-promo-codes.html)|P2|修正済み|FAQ税抜条件を補完|
|[ko/articles/google-play-points-earn-free.html](../ko/articles/google-play-points-earn-free.html)|P1|修正済み|アンケート報酬とポイントを区別|
|[ko/articles/google-play-points-expiration.html](../ko/articles/google-play-points-expiration.html)|OK|確認済み・変更不要|失効・ランク・交換済み報酬を区別。|
|[ko/articles/google-play-points-family-sharing.html](../ko/articles/google-play-points-family-sharing.html)|OK|確認済み・変更不要|家族共有の対象とポイント帰属を区別。|
|[ko/articles/google-play-points-fastest-silver.html](../ko/articles/google-play-points-fastest-silver.html)|OK|確認済み・変更不要|不足60点の例とSilver到達前の報酬制約を説明。|
|[ko/articles/google-play-points-gift-cards.html](../ko/articles/google-play-points-gift-cards.html)|OK|確認済み・変更不要|カード購入と対象商品購入を区別。|
|[ko/articles/google-play-points-join-eligibility.html](../ko/articles/google-play-points-join-eligibility.html)|OK|確認済み・変更不要|韓国の加入条件・18歳・症状別対応を記載。|
|[ko/articles/google-play-points-level-maintenance-reset.html](../ko/articles/google-play-points-level-maintenance-reset.html)|P2|修正済み|到達年・維持年・再判定年の具体例|
|[ko/articles/google-play-points-levels.html](../ko/articles/google-play-points-levels.html)|P1|修正済み|ランク閾値と支出を区別|
|[ko/articles/google-play-points-multiple-accounts.html](../ko/articles/google-play-points-multiple-accounts.html)|OK|確認済み・変更不要|購入アカウント特定と加入前購入の説明が有用。|
|[ko/articles/google-play-points-not-showing.html](../ko/articles/google-play-points-not-showing.html)|P2|修正済み|通常対象の残高購入を除外扱いせず具体的原因で切り分け|
|[ko/articles/google-play-points-platinum-diamond-cost.html](../ko/articles/google-play-points-platinum-diamond-cost.html)|OK|確認済み・変更不要|維持と到達の金額、週次最大値と保証を明確に区別。|
|[ko/articles/google-play-points-play-credit-not-working.html](../ko/articles/google-play-points-play-credit-not-working.html)|OK|確認済み・変更不要|交換前後のトラブルと期限を整理。|
|[ko/articles/google-play-points-promotion-not-applied.html](../ko/articles/google-play-points-promotion-not-applied.html)|P2|修正済み|一般条件と個別除外を分け上限の仮例を追加|
|[ko/articles/google-play-points-promotion-stacking.html](../ko/articles/google-play-points-promotion-stacking.html)|OK|確認済み・変更不要|直接付与率と倍率、丸めの説明が明確。|
|[ko/articles/google-play-points-refund.html](../ko/articles/google-play-points-refund.html)|OK|確認済み・変更不要|返金と解約・ポイント交換種類の違いまで説明。|
|[ko/articles/google-play-points-rounding-tax.html](../ko/articles/google-play-points-rounding-tax.html)|P2|修正済み|地域に合うFAQへ修正|
|[ko/articles/google-play-points-subscriptions.html](../ko/articles/google-play-points-subscriptions.html)|P2|修正済み|購読導入の反復を注文の確認方法へ|
|[ko/articles/google-play-points-super-weekly-reward.html](../ko/articles/google-play-points-super-weekly-reward.html)|P1|修正済み|Super Ticket現行未確認の扱いを統一|
|[ko/articles/google-play-points-use-coupons.html](../ko/articles/google-play-points-use-coupons.html)|P2|修正済み|韓国版に実質価値比較と交換後の確認先を追加。交換ガイドにも両方の公式確認経路を反映。韓国FAQも確認先を統一|
|[ko/articles/google-play-points-weekly-reward.html](../ko/articles/google-play-points-weekly-reward.html)|OK|確認済み・変更不要|韓国の最大報酬と保証の違い、木金の違いを説明。|
|[ko/articles/google-play-quests.html](../ko/articles/google-play-quests.html)|OK|確認済み・変更不要|クエスト進行の種類別対応と設定の任意判断まで記載。|
|[tw/articles/2026-06-20-discount-gift-cards.html](../tw/articles/2026-06-20-discount-gift-cards.html)|OK|確認済み・変更不要|台湾未提供を前提に海外コードとの違いを説明。現在の公式提供国一覧は再照合対象。|
|[tw/articles/google-play-balance-combine-payment.html](../tw/articles/google-play-balance-combine-payment.html)|P1|修正済み|対象国でのチェックアウト併用を説明|
|[tw/articles/google-play-games-vs-play-points.html](../tw/articles/google-play-games-vs-play-points.html)|OK|確認済み・変更不要|台湾の単位・XP・PCを区別。|
|[tw/articles/google-play-points-100-value.html](../tw/articles/google-play-points-100-value.html)|P2|修正済み|重複した獲得費用の説明を交換価値の具体例へ|
|[tw/articles/google-play-points-500-1000-cost.html](../tw/articles/google-play-points-500-1000-cost.html)|P1|修正済み|固定倍率と途中昇格の区別|
|[tw/articles/google-play-points-apps-books-purchases.html](../tw/articles/google-play-points-apps-books-purchases.html)|OK|確認済み・変更不要|台湾の書籍加算という地域固有の説明がある。|
|[tw/articles/google-play-points-balance-history-progress.html](../tw/articles/google-play-points-balance-history-progress.html)|P2|修正済み|FAQ履歴の案内を本文と統一|
|[tw/articles/google-play-points-cash-conversion.html](../tw/articles/google-play-points-cash-conversion.html)|OK|確認済み・変更不要|換金と使用価値を区別し必要な手順を記載。|
|[tw/articles/google-play-points-country-change.html](../tw/articles/google-play-points-country-change.html)|OK|確認済み・変更不要|国変更の条件・影響を明確化。|
|[tw/articles/google-play-points-country-differences.html](../tw/articles/google-play-points-country-differences.html)|OK|確認済み・変更不要|地域比較の使い方と誤適用防止が具体的。|
|[tw/articles/google-play-points-coupon-not-applied.html](../tw/articles/google-play-points-coupon-not-applied.html)|P2|修正済み|現地通貨の仮例。公式二資料のクーポン確認先を併記|
|[tw/articles/google-play-points-device-change.html](../tw/articles/google-play-points-device-change.html)|OK|確認済み・変更不要|症状とアカウント確認を具体化。|
|[tw/articles/google-play-points-discounts-promo-codes.html](../tw/articles/google-play-points-discounts-promo-codes.html)|P2|修正済み|FAQ税抜条件を補完|
|[tw/articles/google-play-points-earn-free.html](../tw/articles/google-play-points-earn-free.html)|P1|修正済み|アンケート報酬とポイントを区別|
|[tw/articles/google-play-points-expiration.html](../tw/articles/google-play-points-expiration.html)|OK|確認済み・変更不要|失効の起点と三種類の期限を区別。|
|[tw/articles/google-play-points-family-sharing.html](../tw/articles/google-play-points-family-sharing.html)|OK|確認済み・変更不要|家族決済とポイント帰属を区別。|
|[tw/articles/google-play-points-fastest-silver.html](../tw/articles/google-play-points-fastest-silver.html)|OK|確認済み・変更不要|台湾Silverの不足点と購入例が具体的。|
|[tw/articles/google-play-points-gift-cards.html](../tw/articles/google-play-points-gift-cards.html)|OK|確認済み・変更不要|台湾のカード未提供と他国コードの問題を説明。|
|[tw/articles/google-play-points-join-eligibility.html](../tw/articles/google-play-points-join-eligibility.html)|OK|確認済み・変更不要|台湾の加入条件と症状別手順を説明。|
|[tw/articles/google-play-points-level-maintenance-reset.html](../tw/articles/google-play-points-level-maintenance-reset.html)|P2|修正済み|到達年・維持年・再判定年の具体例|
|[tw/articles/google-play-points-levels.html](../tw/articles/google-play-points-levels.html)|OK|確認済み・変更不要|費用を固定化せず閾値と倍率を説明。英韓版より正確な構成。|
|[tw/articles/google-play-points-multiple-accounts.html](../tw/articles/google-play-points-multiple-accounts.html)|OK|確認済み・変更不要|ポイント帰属・移転不可・加入時期を説明。|
|[tw/articles/google-play-points-not-showing.html](../tw/articles/google-play-points-not-showing.html)|P2|修正済み|通常対象の残高購入を除外扱いせず具体的原因で切り分け|
|[tw/articles/google-play-points-platinum-diamond-cost.html](../tw/articles/google-play-points-platinum-diamond-cost.html)|OK|確認済み・変更不要|到達と維持の区別と具体例が明確。|
|[tw/articles/google-play-points-play-credit-not-working.html](../tw/articles/google-play-points-play-credit-not-working.html)|OK|確認済み・変更不要|交換不可・未反映・使用不可の三症状と支援手順が具体的。|
|[tw/articles/google-play-points-promotion-not-applied.html](../tw/articles/google-play-points-promotion-not-applied.html)|P2|修正済み|一般条件と個別除外を分け上限の仮例を追加|
|[tw/articles/google-play-points-promotion-stacking.html](../tw/articles/google-play-points-promotion-stacking.html)|OK|確認済み・変更不要|台湾の数値で倍率・最終率を説明。|
|[tw/articles/google-play-points-refund.html](../tw/articles/google-play-points-refund.html)|OK|確認済み・変更不要|返金・解約・交換種類の区別が具体的。|
|[tw/articles/google-play-points-rounding-tax.html](../tw/articles/google-play-points-rounding-tax.html)|P2|修正済み|地域に合うFAQへ修正|
|[tw/articles/google-play-points-subscriptions.html](../tw/articles/google-play-points-subscriptions.html)|P2|修正済み|購読導入の反復を注文の確認方法へ|
|[tw/articles/google-play-points-super-weekly-reward.html](../tw/articles/google-play-points-super-weekly-reward.html)|P1|修正済み|Super Ticket現行未確認の扱いを統一|
|[tw/articles/google-play-points-use-coupons.html](../tw/articles/google-play-points-use-coupons.html)|P2|修正済み|台湾版の導入反復を除去し交換判断例を追加。交換ガイドにも両方の公式確認経路を反映。台湾FAQも確認先を統一|
|[tw/articles/google-play-points-weekly-reward.html](../tw/articles/google-play-points-weekly-reward.html)|OK|確認済み・変更不要|台湾の資格・週次報酬・新端末15日の切り分けが具体的。|
|[tw/articles/google-play-quests.html](../tw/articles/google-play-quests.html)|OK|確認済み・変更不要|任務条件・課金対象・個人化設定・返金を説明。|
