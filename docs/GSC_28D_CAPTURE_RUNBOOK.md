# Search Console 非重複28日履歴 — 導入手順

最終更新: 2026-09-19

## 目的

`PlayPoint Analytics` の最新ビューは Search Console の query × page を取得できているが、
ローリング更新だけでは Issue #181 が必要とする「過去28日 vs その直前28日」を後から再現できない。

P0では、単に query × page を保存するだけでなく、計測Baselineで定義済みの3層を同じ `pair_id` で保存する。

1. **Raw** — query × exact URL。fragmentを保持。
2. **Normalized** — query × base URL。Rawからfragmentだけを除去して集約。
3. **Property Total** — dimensionなし、Search Console APIの `byProperty` で直接取得。

## 保存するシート

### `🗃GSC 28日履歴`

current / previousの2窓 × 3層を同じ `pair_id` へ保存するraw正本。

- `current_28d`: 最新FINAL日を末尾とする28日
- `previous_28d`: その直前28日
- 期間は1日も重複させない
- Search typeは `web`
- Search Console APIの日付基準は `America/Los_Angeles`
- FINALのみ比較へ使用
- Property Totalをquery行の合計で代用しない
- APIが返した `responseAggregationType` も保存する

列:

`pair_id / window_role / layer / period_start / period_end / record_type / search_query / exact_url / base_url / clicks / impressions / ctr / avg_position / data_state / search_type / dimensions / request_aggregation_type / response_aggregation_type / site_property / api_timezone / fetched_at / source / derivation`

### `🔍GSC 28日比較`

Rawの query × exact URL を現28日・前28日で比較する。
Issue #181の根拠として使う。

上部にはProperty Totalのcurrent / previousも表示し、
「見えているquery行」とプロパティ全体を混同しない。

### `🧹GSC 28日正規化`

Normalizedの query × base URL を現28日・前28日で比較する。

同一ページの `#fragment` が複数行へ分散しても、
ページ単位のSEO判断では1つのbase URLとして確認できる。

## Apps Script

GitHub:

`scripts/gsc-nonoverlap-28d.gs`

既存の PlayPoint Analytics に紐づく Apps Script プロジェクトへこのファイルを追加する。

### 必要な設定

Script Properties:

- `SEARCH_CONSOLE_SITE_URL`
  - 既存のSearch Console取得処理で使っている**同じプロパティ文字列**を設定する。
  - URL-prefix / domain propertyを推測で変更しない。
- `PLAYPOINT_ANALYTICS_SPREADSHEET_ID`
  - bound scriptなら不要。
  - standalone scriptの場合のみ設定する。

必要権限:

- Search Console readonly
- Spreadsheet
- external request

## 初回実行

Apps Scriptエディタから:

`captureGscNonOverlapping28d()`

を1回実行する。

成功条件:

- `🗃GSC 28日履歴` に current / previous × Raw / Normalized / Property Total の6組が入る
- `🔍GSC 28日比較` が `READY` になる
- `🧹GSC 28日正規化` が `READY` になる
- Property Totalの `response_aggregation_type` が `byProperty`
- Rawの `response_aggregation_type` が `byPage`
- site property / search type / API timezoneが履歴に残る
- 同じpair_idを再実行しても重複追記しない

partial writeが発生した場合は、次回のAPI応答と既存レコードが同じ場合だけ不足行を補完する。
異なるスナップショットを混ぜず、既存履歴を保護する。6層に加えて完了証跡を照合するまで取得済みとしない。

## 自動実行

初回確認後に1回だけ:

`installPlayPointGsc28dWeeklyTrigger()`

を実行する。

同名triggerがある場合は新規作成しない。
毎週金曜8時台に最新FINAL日を基準として current / previous の3層を保存する。

## Fail-closed

以下ではIssue #181を完了扱いにしない。

- current / previous の片方がない
- Raw / Normalized / Property Total のいずれかがない
- 28日ではない
- 期間が重複している
- PROVISIONALを比較に使っている
- Rawのaggregationが `byPage` ではない
- Property Totalのaggregationが `byProperty` ではない
- site property / search type / API日付基準を追跡できない
- ローリング30日同士を28日比較の代わりにしている

## 既存表との役割分担

- `🔎検索語×ページ`: 最新状況を見る運用ビュー
- `🎯SEO改善候補`: 最新状況からの機械的な候補抽出
- `🗃GSC 28日履歴`: 3層の比較証拠SSOT
- `🔍GSC 28日比較`: exact URLの前後比較
- `🧹GSC 28日正規化`: base URLの前後比較

最新ビューと比較証拠は別責務として維持する。


## 2026-11-25 履歴索引・完了証跡

`🗂GSC履歴索引` は履歴正本のpair_idの連続行範囲と走査カーソルを保存する派生表。初回・28日ごとの全走査は2万行のブロック単位、通常は新規追記分だけを走査する。非連続の補完ブロックを個別に参照し、境界や対象pairに不一致があれば再索引する。履歴の任意編集・途中への行挿入はappend-only契約外。管理者が必要に応じて `rebuildPlayPointGscHistoryIndex()` を実行する。索引・履歴の直接編集を避ける。

取得成功時、保存行数とSHA-256を検証して最後に同じpair_idの `PAIR_RECEIPT` 行（layer=capture_receipt、derivation=GSC_CAPTURE_V1:行数:ハッシュ）を追加する。従来の6層とは別のメタデータ行であり検索クリック等の集計対象ではない。完了証跡のない旧履歴はAPIで再取得して同じ内容と確認できた場合のみ証跡を付ける。既存データと一致しない時や証跡と保存結果が異なる時は保留し、変更・削除しない。API上位行の取得の完全性であり、匿名検索を含む全検索語の網羅性ではない。

索引にスプレッドシート全体の割当セルと直近最大4pairの平均行数から見積もった容量余裕を表示する。800万セルは早期計画用の運用目安であってGoogle Sheetsの上限の主張ではない。PLAN_SOON/PLAN_ARCHIVEを運営ダッシュボードで確認し、承認した移行手順・バックアップと整合確認なしに履歴を自動削除/移動しない。

比較ビューは完了証跡の照合後に新しい表を組み立て、READYと明細を一括保存する。手動で古いpairを再取得しても、より新しい比較ビューを上書きしない。新旧の比較シートは独立した書込なので、障害時は実行ログ・各pair_idを確認する。
