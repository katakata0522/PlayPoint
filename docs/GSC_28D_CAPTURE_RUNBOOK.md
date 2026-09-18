# Search Console 非重複28日履歴 — 導入手順

最終更新: 2026-09-19

## なぜ必要か

現在の `PlayPoint Analytics` は Search Console の query × page を取得できているが、
`🔎検索語×ページ` は最新のローリング期間で置き換わるため、
Issue #181 が必要とする「過去28日 vs その直前28日」の非重複比較を後から再現できない。

これは「Search Consoleデータが取れていない」障害ではなく、
**比較に必要なraw履歴を保存していない設計上の欠落**。

既存の最新表は残し、比較専用の履歴レイヤーを追加する。

## 追加する2シート

### `🗃GSC 28日履歴`

1回の取得で必ず2窓を同じ `pair_id` に保存する。

- `current_28d`: 最新の確定日を末尾とする28日
- `previous_28d`: その直前28日
- 期間は1日も重複させない
- dimension は `query × exact URL`
- fragmentを含め、APIが返したURLをそのまま保存する
- `FINAL` データだけを比較に使用する

列:

`pair_id / window_role / period_start / period_end / record_type / search_query / exact_url / clicks / impressions / ctr / avg_position / data_state / fetched_at / source`

### `🔍GSC 28日比較`

最新の `pair_id` について、検索クエリとexact URLを1行にまとめ、
現28日・前28日の Click / Impression / CTR / Position と差分を表示する。

比較ペアが欠けている場合は `BLOCKED` とし、
その状態でSEO改稿を進めない。

## Apps Script パッチ

GitHub:

`scripts/gsc-nonoverlap-28d.gs`

既存の PlayPoint Analytics に紐づく Apps Script プロジェクトへこのファイルを追加する。

### 必要な設定

Script Properties:

- `SEARCH_CONSOLE_SITE_URL`
  - 既存のSearch Console取得処理で使っている**同じプロパティ文字列**を設定する。
  - URL-prefixかdomain propertyかを推測して別値へ変えない。
- `PLAYPOINT_ANALYTICS_SPREADSHEET_ID`
  - bound scriptなら不要。
  - standalone scriptで使う場合だけ設定する。

必要権限:

- Search Console readonly
- Spreadsheet
- external request

### 初回確認

Apps Script エディタから:

`captureGscNonOverlapping28d()`

を1回実行する。

成功時:

- `🗃GSC 28日履歴` に current / previous の2窓が同じ pair_id で追加される
- `🔍GSC 28日比較` に検索クエリ・URL・両期間の値が表示される
- 同じ pair_id を再実行しても重複追記しない

### 自動実行

初回確認後に1回だけ:

`installPlayPointGsc28dWeeklyTrigger()`

を実行する。

同名triggerが既に存在する場合は新規作成しない。
毎週金曜8時台に実行し、Search Console APIで確認できた最新FINAL日を基準に
28日 + 直前28日を保存する。

## Fail-closed

以下では #181 を完了扱いにしない。

- current / previous の片方しかない
- 28日ではない
- 期間が重複している
- query または exact URL が保存されていない
- PROVISIONAL を比較に使っている
- ローリング30日同士を「過去28日 vs 前28日」の代用にしている

## 既存表との役割分担

- `🔎検索語×ページ`: 最新状況を見る運用ビュー。既存動作を維持。
- `🎯SEO改善候補`: 最新状況の機械的な絞り込み。変更判断の根拠そのものにはしない。
- `🗃GSC 28日履歴`: 比較のraw正本。
- `🔍GSC 28日比較`: 人間がquery×URLの前後差を確認するビュー。

この分離により、最新表の更新と比較証拠の保存を混同しない。
