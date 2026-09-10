# PlayPoint Article Roles

## 目的

記事を「ランク / 使い方 / トラブル」のようなテーマだけで管理せず、**PlayPoint全体の中で何の仕事をするページか**で評価するための運用契約です。

記事の存在価値は、単一KPIでは決めません。まず存在理由を言語化し、**その要素が占有するコストと、その要素が生み出す価値**を比較します。検索流入・回遊・再訪・計算利用・信頼・収益など、役割ごとに異なる価値を見ます。

SSOT は `scripts/article-role-registry.cjs` です。新しい記事が既存Roleへ分類できない場合は、暗黙に `reference` へ落とさず、Roleを意図的に追加・拡張します。

## Role

| Role | 仕事 | Primary KPI | 注意 |
| --- | --- | --- | --- |
| `calculator_bridge` | 一般条件を読者自身の不足pt・金額へ落とし、初回計算成功へつなぐ | `view_to_first_calculation_success` | 滞在時間だけで評価しない |
| `decision_support` | 交換・購入・キャンペーン等の比較から次の判断を助ける | `contextual_next_action_rate` | 計算機クリックだけで評価しない |
| `troubleshooting` | 症状を切り分け、解決に必要な確認・再試行・公式導線へ進める | `resolution_next_action_rate` | 計算機クリック率を成功条件にしない |
| `retention` | 週次特典・クエスト等を理由に再訪習慣を作る | `returning_user_rate` | 単発PVだけで切らない |
| `game_decision` | Play Pointsをゲーム固有の購入候補へ接続し比較・計算を助ける | `game_article_to_calculator_success` | 「最強」等の断定を成果としない |
| `reference` | 制度・アカウント・購入条件の正確な参照点になる | `assisted_navigation_rate` | 文字数や計算遷移だけで評価しない |
| `hold` | 公式確認前のテーマを検索へ出さず、安全に公開判断を待つ | `verified_before_indexing` | 検索流入を求めない |

## 改善判断の順序

1. **なぜ存在するか** — 検索流入だけでなく、回遊・再訪・信頼・判断支援を含めて役割を確認する。
2. **狙う行動は何か** — RoleのPrimary KPIを基準にする。
3. **実際に価値を生んでいるか** — GA4 / Search Consoleの実測を確認する。
4. **占有コストは何か** — 画面占有、別導線の機会損失、更新頻度、公式確認、翻訳・多言語保守を含める。
5. **変更の副作用は何か** — 1指標を改善して別の重要指標を壊さないか確認する。
6. **最小差分で検証する** — 更新直後は既存のcooldown方針に従い、古いSearch Consoleデータで連続改稿しない。

## 計測上の扱い

現時点で `calculator_bridge` は、既存の

`Article view → article_to_calculator_clicked → calculator_form_started → calculator_funnel_completed`

で比較できます。

一方、`troubleshooting` の問題解決、`retention` の再訪、`decision_support` の文脈別Next Best Actionなどは計測が部分的です。**測れないものを計算機クリック率へ無理に置き換えません。** まず既存イベントを再利用できるか確認し、新イベント追加は本当に意思決定を変える場合だけ行います。

## 記事の削除・降格

低PV・0クリックだけでは削除しません。Role、検索表示、内部回遊、保守コスト、戦略的価値を合わせて判断します。需要未証明でも低コストで将来の検索意図を検証するページは観察できます。一方、役割が重複し、別ownerの検索意図を奪い、更新コストも高い場合は統合・noindex・削除候補になります。
