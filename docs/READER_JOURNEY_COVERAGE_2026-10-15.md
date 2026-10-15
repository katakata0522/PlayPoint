# 記事導線の計測カバレッジ補強（2026-10-15）

## 目的と前提

既存の \`article_navigation_click\` をそのまま使い、読者に既に表示されているリンクの分類漏れだけを減らす。
新しいイベント、GA4カスタム定義、Cookie、匿名識別子、権限、外部送信先、広告設定は追加しない。

### 今回追加する分類

- 日本語記事の \`.breadcrumbs-wrapper\`：\`component=breadcrumb\`
- 本文内の編集済み \`article .related-links-section\`：\`component=related\`
- サイドバーのカテゴリ別 \`.sidebar-browse-category\`：\`component=browse\`
- \`/blog/?topic=...\` と \`/blog/?game=...\` と \`/blog/?q=...\` は、従来の \`guide_hub\` と区別して \`destination_type=category\`

\`target_path\` は同一originのパスだけを記録し、クエリ、検索語、金額、表示リンクの文言、外部URLは送信しない。外部の遷移先を新たに追跡する変更もない。リンクは既存の同意境界を通る。

**イベント増は計測範囲拡張の影響を含むため、前後で生のクリック数だけを「改善」と見なさない。**
過去に取りこぼしたクリック数や分類値のバックフィルはしない。

## 現状の欠落との関係

2026-09-11〜2026-10-10の旧観測では、\`article_navigation_click\` 36回のうち \`component\` と \`destination_type\` が取得できたのは各6回だけだった。これは既存のGA4管理画面の登録時期、受信状態、旧送信経路の切り分けが済んでいないため、**今回のUI側分類拡張で解決したとは主張しない**。

また、\`search\` 19回のうち \`intent_id\`/\`results_count\` は各4回分のみ取得済み。この修正では検索イベントに変更を加えず、原因切り分けを優先する。

## 本番に反映する前の確認

1. 既存の回帰検査と \`tests/article-navigation-observability.test.cjs\` を実行し、すべての必須チェックを通す。
2. 390px/1440pxで、JP記事のパンくず・本文末関連記事・サイドバーカテゴリを実クリックして、見た目・実遷移に差分がないことを確認する。
3. GA4 DebugViewで同意後に \`article_navigation_click\` へ分類値が付くことと、同一クリックにつき一度だけ送信されることを確認する。
4. 同意拒否時は計測されず、検索語・クエリ・外部URL・個人情報がイベントパラメータへ混入しない。
5. 実データで新しい対象リンクが増えた後に、旧コードとの観測範囲の違いを注記する。

## 別途必要なGA4読者パラメータ診断（管理画面／Apps Script）

詳細な原因切り分けは既存 \`docs/READER_PARAMETER_AUDIT_2026-10-13.md\` と
\`capturePlayPointReaderParameterAudit()\` を利用する。

- 正しいPlayPointのGA4プロパティで \`component\`, \`destination_type\`, \`intent_id\`, \`results_count\` の既存イベントスコープ定義を**読むだけで**確認する。
- 登録日時・変更履歴（取得できる範囲）・DebugView実受信・過去30日の(日付×パラメータ)診断を比較する。
- \`(not set)\`、値\`0\`、イベント0件、API失敗、閾値制限を区別する。
- 複数登録、既存の再作成、新規トリガーを推測で行わない。必要な設定変更は事実を揃えて別途確認。
- クリック数は疑問解決率ではない。記事ごとの成果は役割別に測る。

## 検証範囲

このPRは分類カバレッジの限定変更。検索順位・CTR・自然流入を直接向上させる変更ではない。
