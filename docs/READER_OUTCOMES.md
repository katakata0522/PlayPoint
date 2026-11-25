# 読者行動・再訪の計測

既存の `capturePlayPointAnalyticsP1P2` から読者行動集計を呼び出す。追加のトリガー、OAuth権限、識別子保存は作らない。API通信中は共通ロックを保持せず、シート書込みと監視行更新だけをロックする。

## 利用可能な集計

- P1と同じ過去30日間のイベント別回数・利用者数。
- pagePathと公開台帳を結合した言語・記事の役割。利用者数を記事や行をまたいで合算しない。
- エラーの分類・端末・計算モード。生の入力値は送らない。
- 導線の種類・遷移先、質問候補、検索意図・検索結果件数。自由入力の検索語は送らない。
- ページで期間内に閲覧した新規・再訪利用者。最初に読んだ記事への帰属ではない。
- 28日目まで観測が完了した7つの獲得日コホートの0・7・28日目のアクティブ利用者。サイト全体の特定日の再訪であり、期間内の任意再訪率ではない。
- 閉じた計算開始→24時間以内成功のファネル。GA4 Data APIの順序評価を使い、独立したイベント人数の比を転換率にしない。同じ計算内容や元の記事までは保証しない。

ファネルのalpha APIが同名の指標ヘッダーを重複して返す場合は、実際に存在する値を保持する。欠落・矛盾する指標は取得エラーにし、0に置き換えない。通常イベントに開始利用者があるのに順序APIが全0の場合も `UNEXPECTED_ZERO` として転換率に使用しない。

## 必要な定義と未取得の扱い

既存の `error_type`、`calculation_mode` に加え、イベントスコープの `component`、`destination_type`、`candidate_id`、`intent_id`、`results_count` を使う。役割・言語・source_pathのカスタム定義は重複作成せず、標準pagePathと台帳で結合する。

毎回APIメタデータを確認し、未登録または反映待ちは `WAITING_DEFINITION` としてAPIを呼ばない。取得失敗は `ERROR`、しきい値等は `RESTRICTED`。空欄を0で埋めない。正常に取得した0行とは区別する。全source未取得の場合は前回シートを保持し、監視行に失敗を記録する。

新しい定義は通常24〜48時間の反映待ちがある。登録前のパラメータ別履歴の復元は保証しない。`(not set)` は計測の欠落・登録前期間等を確認し、読者の関心がないという意味で使わない。

パラメータ取得率はAPI返却行内のイベント回数を分母にし、項目ごとの取得・欠落も併記する。集計全体が `PARAMETER_PARTIAL` でも、必要な項目が揃う明細行は `OK` とする。検索結果件数の0は有効値で、件数未設定とは区別する。意図未設定でも件数が取得済みならその結果件数を使える。

`ARTICLE_ACTIONS` は標準 `pagePath × eventName` から記事ナビ・記事→計算機の回数と利用者数を独立取得する。分類が欠けても発生元記事の観測を捨てない。`NAVIGATION` と同じイベントを含み、計算機CTAとナビは同一クリックで発生し得るので合算しない。

原因調査は `capturePlayPointReaderParameterAudit()` を手動実行し、`🔬読者パラメータ診断` を確認する。4項目を個別に日別照会し、初取得観測日・最終未設定観測日を記録する。標準ページイベントはカスタム定義に依存しない。初取得観測日は登録日ではなく、GA4設定・変更履歴・実送信との比較が必要。新しいトリガーやカスタム定義は作らない。[2026-10-13の監査](READER_PARAMETER_AUDIT_2026-10-13.md)に取得できた記事別成果と未測定項目を記載した。

記事別の入口コホートによる7日・28日再訪、疑問が解決した割合は、この集計では未取得。クリック数・PV・計算成功で役割固有の主KPIを代用せず、Portfolioの既存判断も自動変更しない。BigQuery輸出や新しい識別子保存を暗黙に追加しない。

## 文脈に合う次の行動の集計（2026-11-17）

本文の次の行動・記事末尾の案内・サイドバーの次の一歩を、既存の同意制御で記録する。通常の関連記事・人気記事・目次・著者リンクを主指標へ混ぜない。

| 記事の役割 | 標準イベント名 | 集計するもの |
| --- | --- | --- |
| 選択・意思決定支援 | `article_decision_action` | 文脈に合う次の行動を選んだ利用者 |
| 問題解決 | `article_resolution_action` | 解決に向けた確認先へ進んだ利用者。解決完了ではない |
| 基礎理解・参照 | `article_reference_action` | 次の判断・確認を支える案内へ進んだ利用者 |

パラメータは発生元と内部遷移先のパスだけ。検索語・金額・ポイント・断片・外部URL・新しい識別子を追加しない。`article_navigation_click` と同じクリックで発生するため、両者を足さない。管理画面のカスタム定義追加は不要。再訪・疑問解決の完了・計算成功はこのイベントから推定しない。

既存のGA4読取権限で取得するためのリクエストと、API応答からの集計を用意した。以下の日付は例で、計測開始日は実際の公開後、プロパティのタイムゾーンで最初の完全な日を指定する。

```text
node scripts/article-outcome-report.cjs --ga4-template 2026-11-18 2026-12-15 2026-11-18
node scripts/article-outcome-report.cjs --ga4 response-wrapper.json
```

最初のコマンドは `period`・`collectedFrom`・`request`・空の `response` を出す。既存プロパティに対し `request` を変更せず `runReport` で読取実行し、完全な応答を `response` に入れて2番目のコマンドで集計する。CLI自体は外部へ接続せず、認証・設定・トリガー・既存シートを変更しない。Apps Scriptの稼働中コードや自動集計へ、この変更が自動反映されたとは扱わない。

集計は `pagePath × eventName` の `totalUsers` を使う。分割行の利用者は合算しない。欠落ページ・不完全な応答・制限やサンプリングがある応答を0で補わない。計測開始前を含む期間や開始日が未確認なら主指標は未計測。対象期間全体を計測し、完全な応答が得られた場合だけ、閲覧がある記事の未発生イベントを0として扱う。役割別の再訪は従来どおり未取得のまま残す。

## 検証と比較

変更日は2026-10-05。導線候補にクエストの確認順を追加する。既存の検索例文、最新情報への質問、交換先比較への質問は保持する。次の確定した非重複28日で検索クリック・CTRを比較し、行動は同じ入口・期間・利用者集合で比較する。直前までの成長を今回の修正の成果とは扱わない。

検索クロス表の上限は50,000行。上限超過は引き続き総件数・表示件数・PARTIAL/TRUNCATEDを明示する。匿名化された検索語が取得できない制約とは別に扱う。

## 公式仕様

- https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/CohortSpec
- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1alpha/properties/runFunnelReport
- https://support.google.com/analytics/answer/14240153


## 2026-11-25 S優先の自動集計・公開変更比較

### 実装済みのイベントを集計へ統合

既存の `capturePlayPointEventDailyReview` と `capturePlayPointReaderOutcomes` のイベントリストに、通常・逆算、モード変更、購入比較、LP導線、共有、カレンダー、PWA、ウィジェット、Web Vitals、役割別行動を追加する。日次の全体イベントは63日（前後28日＋公開日・確定待ちの余裕）、記事別明細と入口帰属は35日のままとする。追加イベントのAPI正常応答に該当行がない時は NO_EVENT_ROW として空欄にし、計測開始や受信の未確認を利用ゼロと扱わない。カレンダーのイベントはカレンダーを開く・iCalを作成する行動であり、実際の予定登録や再訪の保証ではない。

Web Vitalsは既存の有限分類（指標名、rating、ページ群、release_version、端末）を利用し、カスタム定義未登録時は WAITING_DEFINITION とする。観測件数を実際の全利用者数やp75へ置き換えない。新しいGA4管理設定、識別子、自由入力、広告設定は追加しない。

### 📊記事の役割別成果

既存記事台帳と標準 pagePath × eventName × totalUsers を使い、各記事の閲覧者・役割別行動者を同一期間で表示する。意思決定、解決に向けた行動、参照の3役割に既存のarticle_*_actionを割り当てる。計測開始日は、公開と実受信を確認した最初の完全な日を既存Apps Scriptのスクリプトプロパティ `PLAYPOINT_ROLE_ACTIONS_VERIFIED_FROM`（YYYY-MM-DD）へ任意で記録する。未設定時は観測された件数だけを表示し、未発生件数・率を空欄にする。確認済み開始日が直近30日内ならその日以降の同じ窓で取り直す。再訪閲覧者は同じ期間の独立した参考値のみ。計算成功の記事別順序帰属、入口コホート再訪率、疑問解決完了は未計測を維持し、補助イベントから推定しない。母数なし・不一致・小標本・非掲載は明示する。Portfolioの手動判断を変更しない。

### 🚀公開変更履歴 / 📈公開変更効果

既存の日次 `capturePlayPointAdChangeMonitor` から `capturePlayPointReleaseEffectReview()` を実行する。公開status JSONとrevision.txtの両方を読取し、production / verified、main、40桁SHA一致、3検査passed、公開日時と検証日時、対象repo・workflowを検証した記録だけを追記する。マージ日を公開日と見なさない。公開URLがApps Script環境から取得できない場合、実際に検証済みの証拠（同じJSONとrevision文字列）を取得できた管理者だけが `PLAYPOINT_VERIFIED_RELEASE_RECEIPTS_JSON` に `[{"status": { ...実際のstatus JSON... }, "revision": "...実際のSHA..."}]` 形式で登録できる。最大20件/回。同一証拠は重複登録しない。履歴シートを直接書き換えない。初回記録以前の公開や観測間に行われた全公開を捕捉できるとは限らない。取得できなければ WAITING_EVIDENCE/PARTIAL として記録し、過去の証拠を保持する。

前後7/14/28日を、公開開始日から検証完了日まで除いて同じ日数・曜日構成で比較する（GA4はJST、GSCはPTで各々の公開日境界を計算）。GA4 PV・計算開始・初回成功・入力エラーの回数、100PV当たりの行動頻度、GSCのproperty totalの日別クリック・表示・CTRを表示する。確定待ち（GA4は3日、GSCは保守的に4日）や欠測・日付不一致は空欄。過去に両窓を完全取得した値はHISTORICALとして保持する。期間内の他の観測公開数を記録し、因果や唯一の改修効果と断定しない。未確認の公開・季節性・広告・需要の変化は残る。63日より古い未取得窓は復元済みとしない。

### 稼働環境への反映と受入確認

1. PR Gate通過後、bound Apps Scriptの既存 `playpoint-analytics-maintenance.gs` / `playpoint-ad-change-monitor.gs` を同期する。#841の `playpoint-analytics-p1p2.gs` も未反映なら同時に同期。追加トリガーは不要。
2. `capturePlayPointEventDailyReview()` と `capturePlayPointReaderOutcomes()` を実行し、日次/期間別の追加イベント、NO_EVENT_ROW、役割別成果、VITALSの定義・取得状態を確認する。全イベントの本番受信が確認できたとは扱わない。
3. `capturePlayPointReleaseEffectReview()` を実行し、公開証拠とJST/PTの比較窓を確認。未取得の場合は実証済みのreceiptのみで復旧し、推定日付を入れない。
4. 新しいシートや健康状態行の生成、日次・週次の定期実行成功、既存表/手動判断の保存、取得量・実行時間を確認する。GitHubの修正だけで稼働版が更新されたとは判断しない。
