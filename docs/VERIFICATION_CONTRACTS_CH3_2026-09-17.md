# 第3章・検証契約の仕上げ（2026-09-17）

第2章の残件はPR #339で処理。正式な「第0章完了後ロードマップ」の第3章は生成系の再設計ではなく、テスト責務と本番の検証証跡の結合である。

## 完了単位

1. 本番browserは40桁小文字の期待SHAを必須とし、前後で実SHAを観測する。未指定・空応答・HTTP異常・途中切替を成功にしない。
2. 通常Deployは対象コミット、auto-rollback/manual rollback/watchdogは検証済みsnapshot SHAを渡す。trigger SHAを復旧先と取り違えない。
3. 全browser suite後に再観測し、checkoutとreportのSHA、全成果物SHA256を結合する。同一manifestをbrowser artifactとDeploy CI artifactへ保存し、CLIで再照合可能にする。
4. 旧snapshotのブラウザコードと既存report形式を維持し、結合helperはtrusted current checkoutから呼ぶ。旧版のchecked:falseを成功へ上書きしない。
5. uploadだけの失敗はOBSERVABILITY_FAILとして記録し、実検証失敗と区別する。GitHub jobの結果や復旧条件は変えない。
6. TEST_TRIAGE.mdのowner表と全テスト台帳を更新。今回触れた旧全文固定・helper名固定は意味/挙動へ移行。公式数値・安全境界・異なる検証層は維持。

## 故障確認

localhost HTTP、隔離VM、一時Gitディレクトリ、watchdogの状態fixtureで、SHA欠損/不一致/検証中切替/HTTP失敗/改変証跡/旧report/CLIコピー一致/triggerと復旧先の相違を検証する。既存のsnapshot不正・復旧条件・upload非発火契約も再実行する。本番の破壊的な故障注入は行わない。

## 非変更

公開HTML/CSS/JS、デザイン、計算、保存schema、広告、事実、日付、SEO本文は変更しない。新しい依存パッケージ・常設workflow・権限追加なし。性能閾値緩和なし。preflight全回帰と圧縮後2ファイルの既存責務を維持。

## 反映と復旧

通常PR Gate→merge→Xserver Deployを実行し、production reportのrevision.checked/match、manifestの期待/観測/checkout SHA、browser側とDeploy側のmanifest一致を確認する。実行結果はPRに追記する。実行前の成功は記載しない。

不具合時は本PRをrevertし同じ公開経路を通す。公開データ変換・保存データ削除は不要。次の第4章は広告を維持した性能余裕の確保。計測や事業成果の改善はこの第3章の完了条件とは混同しない。
