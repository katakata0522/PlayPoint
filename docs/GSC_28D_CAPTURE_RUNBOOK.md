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

partial writeが発生した場合は、次回実行で不足レコードだけを補完する。
片側・片レイヤーだけ存在する状態を「取得済み」としてスキップしない。

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
