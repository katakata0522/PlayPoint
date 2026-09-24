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

### GSCページ集計と結合健全性

ページ価値ファネルの検索クリック・表示は、検索意図分析用の `query × page` を合算しない。
Search Console APIを **`page` 単独 / `byPage` / `FINAL`** で取得する。

理由:

- queryディメンションは匿名化・long-tail行が表から除外されることがある
- ページ価値ファネルは「検索語の内訳」ではなくページ全体の流入量を扱う
- query × pageは `🗃GSC 28日履歴` / `🧹GSC 28日正規化` 側で検索意図分析に使う

GSCは絶対URL、GA4はパスを返すため、結合キーは必ず
**site-relative path**（例: `/articles/example.html`）へ正規化する。
Apps Script V8ではブラウザ/Nodeの `URL` globalへ依存しない。

収集後はGSCクリックを重みとしてGA4 Organic landingとのjoin率を検査する。

- 20クリック未満: `LOW_SAMPLE`（異常判定しない）
- 20クリック以上かつjoin率50%未満: `PARTIAL`
- 正規化後のキーに `https://...` が1件でも残る: `PARTIAL`
- `PARTIAL` の間はページ価値ファネルをSEO判断のSSOTにしない

API取得成功だけでは `OK` にしない。**取得成功と結合成功を別々に検証する。**

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

### 旧 AdSense `PAGE_URL` 経路の廃止方針

旧 v11.5 コアには、AdSense Management APIへ `PAGE_URL` / `DATE + PAGE_URL` を定期送信する処理が残っていた。
2026-09-24の実行ログでは、この経路だけが `The combination of requested dimensions is unavailable` を継続して返し、
GA4/AdSenseの日次コアやP1のGA4 publisher metricsは正常だった。

運用上のownerを次のように固定する。

- **サイト全体のAdSense収益:** AdSense日次/Intradayを正本にする。
- **ページ別広告収益:** GA4 publisher metricsを正本にする。
- **AdSense `PAGE_URL`:** 自動日次・背景バックフィル・週次分析から外す。正本・フォールバックには使わない。
- 過去の `PAGE_URL` WARN、過去CSV、旧シートは監査証拠として書き換えたり0埋めしたりしない。
- 旧 `💰ページ別収益` / `💰ページ収益日次` が存在しなくても、新しい同期処理から再生成しない。

AdSense `PAGE_URL` を将来**診断目的で手動利用する場合だけ**、AdSense for Contentへ限定する
`PRODUCT_CODE==AFC` フィルタを必須にする。ページURL breakdownには最低インプレッション閾値があるため、
0行は「収益0」と断定せず、診断結果なしとして扱う。診断結果をページ収益SSOTへ昇格させない。

bound Apps Scriptの旧コアを移行した後は、次を確認する。

1. `runMasterpieceSync` の通常日次処理で新しい `AdSenseページ収益日次取得失敗` WARNが増えない。
2. `runWeeklyDetailedAnalysis` で新しい `AdSenseページ別収益取得失敗` WARNが増えない。
3. `AdSense_GA4日次データ` と `AdSense Intraday` は引き続き更新される。
4. `📊ページ価値ファネル` の「ページ収益」はGA4 publisher metricsで更新され、未取得時は空欄になる。
5. `🩺データ鮮度・システム状態` でP1ページ価値ファネルがOK/PARTIAL/ERRORを実データどおりに示す。

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


## 旧コア v11.5 → v11.5.1 移行

実働シートの2026-09-24監査で、旧コアに次の4問題を確認した。

1. 旧AdSense `PAGE_URL` の日次・背景補完・週次取得が継続失敗
2. `=== ... ===` で始まるログがGoogle Sheetsで数式化され `#ERROR!` になる
3. 旧 `updateHealthSheet_()` が固定行でシートを再生成し、P1/P2の健康状態行を消す
4. 日次再照合と週次詳細が同日に2回ずつ走る重複トリガーが存在

修正版v11.5.1では以下を行う。

- `PAGE_URL` 自動取得を日次・背景補完・週次から外す
- 残す診断用 `PAGE_URL` 関数には `PRODUCT_CODE==AFC` を必須化
- ログ先頭の数式トリガー文字をテキストとしてエスケープ
- 健康状態シート更新時に未知の外部コンポーネント行を保持
- 日次は45分、週次は90分の共有Script Properties dedupeを入れ、別アカウント所有の旧トリガーが残っても二重本処理を防ぐ

### 複数アカウントのインストール型トリガー

Apps Scriptのインストール型トリガーは作成ユーザーごとに所有される。
`ScriptApp.getProjectTriggers()` では、現在の実行ユーザーから見えるトリガーしか整理できない。
したがって、過去に別Googleアカウントから自動同期を設定した場合、そのアカウントでApps Scriptの
「トリガー」を開いて旧トリガーを削除する必要がある。

v11.5.1の共有dedupeは、その手動整理が終わるまでの安全網でもある。

### 移行後の確認

- INFOログに新しい `#ERROR!` が増えない
- 新しい `AdSenseページ収益日次取得失敗` / `AdSenseページ別収益取得失敗` が増えない
- 日次・週次の重複側は「重複トリガー実行をスキップ」と記録される
- `P1 ページ価値ファネル` / `P1 検索クロス分析` / `P2 URL Inspection` が健康状態シートに残る
- AdSense Intraday / AdSense_GA4日次データは従来どおり更新される

過去ログや過去Archiveは監査証拠として削除・0埋めしない。

## v11.6: アカウント非依存の自動実行

Apps Scriptのインストール型トリガーは、作成したGoogleアカウントの権限で実行される。
また、別アカウントが作成したトリガーは現在のアカウントから見えないことがある。

v11.6ではメールアドレス固定をSSOTにせず、Script Propertiesへ保存した **active triggerUid** を自動実行のSSOTにする。

- 最後に正式インストールされたtriggerUidだけを本処理する
- 別アカウント所有の古いトリガーが残っていても `SKIPPED_STALE_TRIGGER` として無視する
- 同時発火はScript Lock + 時間窓dedupeで二重本処理を防ぐ
- 手動実行にはtriggerUidがないため、アカウントに関係なく実行できる
- 自動実行を別アカウントへ引き継ぐ場合は、そのアカウントからinstallerを1回実行すればactive setが切り替わる
- ただし、そのアカウント自体にGA4 / AdSense / Search Console / Sheetの権限が無い場合、権限そのものをコードで代替することはできない。core installerは事前検査でその状態を検出し、壊れたトリガーを作らず停止する

### GSC 28日比較のtrigger event

`captureGscNonOverlapping28d()` は手動実行時に任意の日付文字列を受け取れる一方、時間主導トリガーからはevent objectが第1引数として渡される。

v11.6対応では両者を型で分離し、event objectを日付として解釈しない。
