# PlayPoint 収益異常診断 運用手順

最終更新: 2026-09-30

## 目的

AdSense_GA4日次データ の確定済み日次データから、アクセス増と広告単価上振れを分離して検知する。
2026-09-29 のような収益外れ値について、必要なときだけ AdSense を国・端末・入札方式まで分解して原因候補を残す。

## 安全原則

- サイト全体の日次収益は既存 AdSense_GA4日次データ を正本にする。
- RECONCILED 行だけを基準・判定対象にする。
- 異常値を自動修正・自動除外しない。
- AdSense PAGE_URL breakdown は使用しない。
- ページ別収益の正本は既存どおり GA4 publisher metrics。本モジュールはサイト全体の日次収益診断だけを担当する。
- 基準データが14日未満なら INSUFFICIENT_HISTORY として fail closed する。
- Drive Archive 保存エラーと収益データ取得成否を分離する。DriveApp エラーを理由に収益値を0化しない。
- 既存の日次再照合の健康状態を手動で成功へ書き換えない。

## 検知方法

過去28日の RECONCILED データを基準に、中央値と MAD (median absolute deviation) で robust Z-score を計算する。
MAD が0のときだけ標準偏差 Z-score へフォールバックする。

- NORMAL: |Z| < 2.5
- WATCH: 2.5 <= |Z| < 3.5
- HIGH: |Z| >= 3.5

判定群:
- 金額価値: 推定収益 / ページRPM / インプレッションRPM
- トラフィック: GA4 PV / AdSense PV / 広告インプレッション
- クリック: クリック数 / ページCTR / インプレッションCTR

主因分類:
- UNIT_VALUE_SPIKE: 金額価値だけが上振れ
- TRAFFIC_SPIKE: トラフィックだけが上振れ
- CLICK_SPIKE: クリック系だけが上振れ
- MIXED_SPIKE: 複数群が同時に上振れ
- NORMAL_RANGE: 通常範囲
- UNDETERMINED: 基準不足

## 異常時の AdSense drilldown

通常日でも軽量な1軸内訳を取得:
- COUNTRY_CODE
- PLATFORM_TYPE_CODE
- BID_TYPE_CODE

WATCH / HIGH のときだけ追加で2軸内訳を取得:
- COUNTRY_CODE × PLATFORM_TYPE_CODE
- COUNTRY_CODE × BID_TYPE_CODE
- PLATFORM_TYPE_CODE × BID_TYPE_CODE

各レポートは別々に取得し、互換性のない dimensions をまとめた巨大レポートにしない。

metrics: ESTIMATED_EARNINGS / CLICKS / IMPRESSIONS / PAGE_VIEWS / IMPRESSIONS_CTR / IMPRESSIONS_RPM / COST_PER_CLICK
filters: PRODUCT_CODE==AFC / OWNED_SITE_DOMAIN_NAME==playpoint-sim.com

## 2026-09-29 実データでの期待結果

基準: 2026-09-01 ～ 2026-09-28（28日）

| 指標 | 9/29 | 基準中央値 | robust Z |
| --- | ---: | ---: | ---: |
| 推定収益 | ¥194 | ¥48 | 5.32 |
| GA4 PV | 112 | 95 | 0.42 |
| AdSense PV | 122 | 111.5 | 0.29 |
| 広告インプレッション | 486 | 512.5 | -0.13 |
| 広告クリック | 6 | 3.5 | 0.67 |
| ページCTR | 4.92% | 4.085% | 0.33 |
| ページRPM | ¥1,594 | ¥469 | 6.87 |
| インプレッションCTR | 1.23% | 0.75% | 0.98 |
| インプレッションRPM | ¥400 | ¥87 | 22.22 |

期待判定: severity=HIGH / cause=UNIT_VALUE_SPIKE
中央値インプレッションRPM（¥87）で486表示なら期待収益は約¥42.28。実収益¥194との差は約¥151.72で、約78%が通常単価からの上振れに相当する。

## 出力

### 💰収益異常分析
対象日、severity、主因、基準期間、期待収益、上振れ寄与率、日次再照合の状態、DriveAppエラー分離状態を先頭に表示し、その下に各指標の平均・中央値・MAD・ZとAdSense内訳を表示する。

### 🩺データ鮮度・システム状態
新規 component: 収益異常診断
状態: NORMAL / WATCH / HIGH / PARTIAL / ERROR
既存の日次再照合の行は上書きしない。

### 実行ログ
prefix: [REVENUE_DIAG]

## 導入手順

同じ bound Apps Script project に scripts/playpoint-revenue-diagnostics.gs の内容を追加する。
1. AdSense advanced service が有効であることを確認。
2. 複数の AdSense account が見える場合だけ Script Property ADSENSE_ACCOUNT_NAME に対象 resource name (accounts/pub-...) を設定。
3. 最初は手動で capturePlayPointRevenueDiagnostics('2026-09-29') を実行。
4. 💰収益異常分析 が HIGH / UNIT_VALUE_SPIKE になることを確認。
5. 実行ログに [REVENUE_DIAG] が残ることを確認。
6. 🩺データ鮮度・システム状態に 収益異常診断 が追加されることを確認。
7. 国・端末・入札方式の各 breakdown が取得できることを確認。
8. 正常なら一度だけ installPlayPointRevenueDiagnosticsDailyTrigger() を実行。

## 現在の DriveApp エラーについて

2026-09-30 時点で日次再照合は Access denied: DriveApp. により健康状態上 ERROR。
一方、Archives/Weekly には 2026-09-28 のアーカイブが存在しており、Driveアクセス全体が恒常的に壊れているとは断定できない。

したがって、日次再照合のデータ取得 / Drive Archiveへの保存 / トリガー実行ユーザー・権限を別工程として扱い、live Code.gs と実行トリガー所有者を確認できるまで原因を1つに断定しない。
収益異常診断は Drive Archive に依存しないため、Drive保存エラーで診断を失敗させない。
