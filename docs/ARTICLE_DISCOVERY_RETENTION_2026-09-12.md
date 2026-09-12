# 記事検索・保存・地域編集・役割別評価

対象: 改善案 1 / 2 / 3 / 4 / 13 / 15 / 21 / 22 / 23 / 25 / 33。
広告の配置・配信方針は変更しない。サブエージェントは使用しない。

## 読者向け機能

- 日本語57記事、英語・韓国語・繁体字各34記事の見出しと本文を静的インデックス化する。
- 表記ゆれ・同義語、複数語AND検索、関連節の抜粋・アンカー、0件時の条件解除・候補を4言語で提供。本文インデックス取得失敗時はタイトル検索を残す。
- あとで読む100件・最近読んだ記事20件。端末のlocalStorageのみ。個別削除、全件削除、履歴停止に対応。日記とは別キー。
- 週次記事から直近金曜の日記行を開く。月初・年初は前月／前年も扱う。実際の受取日時はGoogle Playの国と表示条件を優先する。
- 海外102記事で表示言語と地域基準を明示。サイト言語を変えてもGoogle Playアカウントの国は変わらない。
- 海外のクエスト・現金化・交換先・週次リワード12記事を個別確認・推敲。既存の有用な例は維持し、不足する判断例と近接出典を追加。実体験や画面を創作しない。
- 更新日は編集日、公式情報確認日は従来の確認範囲を表す。部分的な再確認で全情報確認日を一律更新しない。

## 役割ごとの評価

`node scripts/article-outcome-report.cjs --template > INPUT.json` で159記事の雛形を作り、同期間の確認値のみ記入。
`node scripts/article-outcome-report.cjs INPUT.json > REPORT.md` で率・未計測・少数標本を出す。入力・出力に個人データを含めない。

| 役割 | 主指標の分子 | 共通分母 |
|---|---|---|
| calculator_bridge / game_decision | calculationUsers: 記事を入口として最初の計算成功に至ったユーザー | 同期間のその記事を閲覧したユーザー |
| decision_support | nextActionUsers: 文脈に合う次の行動へ進んだユーザー | 同上 |
| troubleshooting | resolutionActionUsers: 公式確認・関連する切り分けへ進んだユーザー | 同上 |
| retention | returningUsers: その記事を閲覧した再訪ユーザー | 同上 |
| reference | assistedNavigationUsers: 理解を補う関連記事・公式資料へ進んだユーザー | 同上 |

### GA4からの取得条件

- articleUsers は該当 pagePath の閲覧イベントに対する totalUsers。activeUsers、イベント回数、PVを混ぜない。
- 計算は既存 calculator_funnel_completed と entry_source_path を使い、同期間の対象記事閲覧者に限定する。別期間の持ち越しや既存30分のアトリビューション範囲に注意する。
- 次の行動は article_navigation_click の source_path を対象記事に絞る。component が contextual_action / next_step、destination_type が目的に合う article / calculator / official_google_support のOR条件でユーザーをまとめて重複排除する。
- 問題解決は公式支援リンク、または症状に合う次の切り分け記事への遷移を選ぶ。citation / next_step / contextual_action を使う。単なる人気記事やホームへの移動は含めない。解決に向けた行動率であって解決完了率ではない。
- 参照記事は related / citation / contextual_action と article / official_google_support を組み合わせる。部品別ユーザー数の加算は重複するため、OR条件の総ユーザー数を使う。
- 再訪は同期間の対象記事閲覧ユーザー群とGA4の再訪ユーザー定義を使う。新規率から引いた値や日記クリック数を代用しない。
- diaryOpenedUsers / diarySavedUsers は補助列。diary_tab_opened / diary_entry_saved から対象記事経由の同一ユーザー群を確認できるときだけ記入する。
- 必要なディメンション・ユーザー集合が取得できない場合は null。未計測を0にしない。GA4のしきい値・サンプリング・同意率・期間・フィルタ条件を集計メモへ残す。
- 30人未満を small_sample と表示するが、30人以上を統計的有意と扱わない。役割間の率で順位を付けず、同じ記事の前期間と比較する。
- 本改修の効果を示すデータは公開後に蓄積する。テスト用数値を実績にしない。

## 出典の再確認

2026-09-12にGoogle公式のクエスト、米国・韓国・台湾の積点条件、交換の学習ガイド、韓国等級表を確認。
- https://support.google.com/googleplay/answer/11534416
- https://support.google.com/googleplay/answer/9077192
- https://support.google.com/googleplay/answer/15776916
- https://support.google.com/googleplay/answer/9080348

9079840の再取得はGoogle側の制限で失敗したため、同じ交換条件を確認できた15776916を追加出典に用いた。

## 公開前の実操作確認

4言語で本文検索・該当節・保存/削除・履歴停止・0件からの再検索・今週の日記を確認。320px幅で横はみ出しなし。全159記事で共通UI、海外102記事で地域表示を確認。検索JSON取得失敗でもタイトル検索が残り、保存拒否でも保存済み表示にならないことを確認。保存上限では既存の記事を消さず案内する。
