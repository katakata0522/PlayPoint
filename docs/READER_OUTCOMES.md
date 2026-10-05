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

## 必要な定義と未取得の扱い

既存の `error_type`、`calculation_mode` に加え、イベントスコープの `component`、`destination_type`、`candidate_id`、`intent_id`、`results_count` を使う。役割・言語・source_pathのカスタム定義は重複作成せず、標準pagePathと台帳で結合する。

毎回APIメタデータを確認し、未登録または反映待ちは `WAITING_DEFINITION` としてAPIを呼ばない。取得失敗は `ERROR`、しきい値等は `RESTRICTED`。空欄を0で埋めない。正常に取得した0行とは区別する。全source未取得の場合は前回シートを保持し、監視行に失敗を記録する。

新しい定義は通常24〜48時間の反映待ちがある。登録前のパラメータ別履歴の復元は保証しない。`(not set)` は計測の欠落・登録前期間等を確認し、読者の関心がないという意味で使わない。

記事別の入口コホートによる7日・28日再訪、疑問が解決した割合は、この集計では未取得。クリック数・PV・計算成功で役割固有の主KPIを代用せず、Portfolioの既存判断も自動変更しない。BigQuery輸出や新しい識別子保存を暗黙に追加しない。

## 検証と比較

変更日は2026-10-05。導線候補にクエストの確認順を追加する。既存の検索例文、最新情報への質問、交換先比較への質問は保持する。次の確定した非重複28日で検索クリック・CTRを比較し、行動は同じ入口・期間・利用者集合で比較する。直前までの成長を今回の修正の成果とは扱わない。

検索クロス表の上限は50,000行。上限超過は引き続き総件数・表示件数・PARTIAL/TRUNCATEDを明示する。匿名化された検索語が取得できない制約とは別に扱う。

## 公式仕様

- https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/CohortSpec
- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1alpha/properties/runFunnelReport
- https://support.google.com/analytics/answer/14240153
