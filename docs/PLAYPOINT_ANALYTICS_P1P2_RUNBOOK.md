# PlayPoint Analytics P1/P2 導入・運用

最終更新: 2026-09-19

## 対象

P0のSearch Console 28日履歴に続き、次をPlayPoint Analyticsへ同期する。

### P1

1. 検索 → Organic landing → 記事CTA → 計算開始 → 初回成功
2. ページ別広告収益
3. GA4 Organic Searchの検索エンジン別内訳
4. Search Console Query × Country / Query × Device

### P2

1. 重要URLだけのURL Inspection
2. 原因が分かる構造化ログ

## Apps Scriptモジュール

GitHub:

`scripts/playpoint-analytics-p1p2.gs`

P0の `scripts/gsc-nonoverlap-28d.gs` と同じbound Apps Scriptプロジェクトへ追加する。

## P1: ページ価値ファネル

出力先:

`📊ページ価値ファネル`

全ソースを同じ30日窓（確定待ち3日を除外）へ揃えて再構築する。

列:

- ページ
- 検索クリック
- 検索表示
- 検索CTR
- Organic LPセッション
- Organic LPユーザー
- GA4 PV
- 記事→計算ユーザー
- 計算開始ユーザー
- 初回計算成功ユーザー
- Start→Success
- ページ広告収益
- 収益 / Organic LPユーザー
- 状態

記事→計算、計算開始、初回成功はイベント回数ではなく **activeUsers** を主単位にする。

計算開始・初回成功は `entry_source_path` で元ページへ帰属する。

### ページ別収益

ページ別収益の主経路はGA4 Data APIのpublisher metrics。

- `totalAdRevenue`
- `publisherAdImpressions`
- `publisherAdClicks`
- `screenPageViews`

既存Apps ScriptではAdSense APIのページ別取得が
`The combination of requested dimensions is unavailable`
で継続失敗しているため、AdSense `PAGE_URL` breakdownをページ別収益のSSOTにしない。

AdSense全体収益は照合用途として残す。

GA4 publisher metricsが取得できない場合は収益を **0にせず空欄** とする。

## P1: 検索クロス分析

出力先:

`🔎検索クロス分析`

### GA4 Organic Search

`sessionSourceMedium` で分解する。

これによりGSC Property TotalとGA4 Organicを比較するとき、
Google / Bing / Naverなどを一括のOrganic Searchとして誤認しない。

### GSC

current 28日とprevious 28日の非重複FINALを次で保存・比較する。

- Query × Country
- Query × Device

aggregationは `byProperty`。

Cross分析は改善候補の切り分け用途であり、Property Totalの代わりにはしない。

## P2: URL Inspection

出力先:

`🧭URL検査`

毎回サイト全URLを検査しない。

最大30URL。

優先対象:

1. 固定の重要URL
2. `🔎検索語×ページ` の表示回数上位URL

記録:

- Verdict
- Coverage
- Indexing
- Page fetch
- Robots
- Google canonical
- User canonical
- Last crawl
- Mobile verdict
- エラー本文

目的は、表示が弱いURLについて「需要不足」と「index/canonical/fetch問題」を区別すること。

## P2: ログ

既存 `実行ログ` に追記する。

新しい処理は次の形式。

`[P1P2:PAGE_VALUE] ...`
`[P1P2:SEARCH_CROSS] ...`
`[P1P2:URL_INSPECTION] ...`

失敗時は `#ERROR!` だけを残さず、実際の例外本文を保存する。

過去の `#ERROR!` ログは監査証拠として書き換えない。

## 初回実行

P0/P1/P2のコードをbound Apps Scriptへ追加した後:

1. `captureGscNonOverlapping28d()`
2. `capturePlayPointAnalyticsP1P2()`

を順に1回実行する。

確認:

- P0 Raw / Normalized がREADY
- `📊ページ価値ファネル` の後半列が実測で埋まる
- `🔎検索クロス分析` にGA4 source/mediumとGSC Country / Deviceが入る
- `🧭URL検査` に重要URLの結果が入る
- `実行ログ` に `[P1P2:...]` の成功ログが残る

## 自動実行

初回確認後:

- `installPlayPointGsc28dWeeklyTrigger()`
- `installPlayPointAnalyticsP1P2WeeklyTrigger()`

をそれぞれ1回だけ実行する。

P0は金曜8時台、P1/P2は金曜9時台に実行する。

## Fail-closed

以下を0として扱わない。

- GA4 publisher metrics未取得
- entry_source_path未取得
- URL Inspection API失敗
- GSC Country / Device取得失敗

その場合は空欄またはPARTIAL / ERRORとして残し、SEO変更・収益判断を強行しない。


## 健康状態の更新

各ステージ実行時に `🩺データ鮮度・システム状態` の次の行を更新する。

- `P1 ページ価値ファネル`
- `P1 検索クロス分析`
- `P2 URL Inspection`

状態遷移:

- 開始: `RUNNING`
- 完全取得: `OK`
- 一部source未取得 / URL Inspection一部失敗: `PARTIAL`
- ステージ例外: `ERROR`

失敗時は連続失敗数を加算し、最終エラーに実際の例外本文を保存する。
健康状態更新そのものが失敗しても、収集処理の結果を隠さない。
