# PlayPoint Analytics Drive保存分離修正 v11.6.2

確認日: 2026-09-30

## 現象

PlayPoint Analytics の `AdSense_GA4日次データ` では 2026-09-25〜09-29 が `RECONCILED` まで保存できている一方、`🩺データ鮮度・システム状態` の「日次再照合」は 2026-09-25 以降 6回連続で `Access denied: DriveApp.` となっていた。

同じ環境で 2026-09-28 の週次詳細は 6/6 成功し、`Archives/Weekly/2026-09-28_072938` への新規アーカイブ保存にも成功している。したがって、GA4 / AdSenseの日次取得やDrive全体のアクセス障害として扱わない。

## 原因

保存版 v11.6.1 では日次処理が次の順序だった。

1. GA4 / AdSenseを取得
2. `AdSense_GA4日次データ` 等へ保存
3. `SpreadsheetApp.flush()`
4. 月初バックアップ
5. 完了月Driveアーカイブ
6. `DAILY_RECONCILE` の成功記録

このため、4〜5のDrive補助処理が失敗すると、1〜3が成功していても外側のcatchへ入り、日次再照合全体がERRORとして記録される。

加えて `createOrReplaceTextFile_()` は、同名CSV/JSONをすべて `setTrashed(true)` してから新規ファイルを作っていた。

Google DriveのMy Driveでは、ファイルをゴミ箱へ移せるのは所有者だけである。共有フォルダの編集者は新規ファイル作成や既存ファイル編集ができても、別所有者の既存ファイルをゴミ箱へ移す操作では権限エラーになり得る。

## v11.6.2 の修正

### 1. 日次データ成功とDrive保存を分離

日次API取得・シート書き込みが完了した時点で `DAILY_RECONCILE=RECONCILED` を確定する。

その後の月初バックアップと完了月アーカイブはそれぞれ個別 `try/catch` にし、失敗時はWARNとして記録する。

これにより、

- GA4 / AdSense取得失敗 → 日次再照合ERROR
- Sheets書き込み失敗 → 日次再照合ERROR
- Drive補助保存だけ失敗 → 日次再照合はRECONCILEDのまま、Drive保存WARN

に分離される。

### 2. trash-first置換を廃止

同名ファイルがある場合は `File.setContent()` を優先する。

- 編集可能 → 同じファイルIDの内容を更新
- 編集不可 → 既存ファイルを削除せず、`__writer_YYYYMMDD_HHMMSS` 付き別名で新規保存
- 同名ファイルなし → 従来どおり正規名で作成

`setTrashed(true)` を置換の前提にしない。

### 3. 古いバックアップ整理をbest-effort化

保持数を超えた旧バックアップのゴミ箱移動は個別にcatchする。

他アカウント所有の旧バックアップを整理できなくても、新しいバックアップ作成や分析本体を失敗させない。

## 検証

隔離した v11.6.2 全文でJavaScript構文チェックを通過。

追加の6ケース:

1. v11.6.2へのversion更新とtrash-first廃止
2. `DAILY_RECONCILE` 成功記録がDrive補助処理より前
3. 編集可能な同名ファイルは `setContent()` で更新
4. 更新不可な同名ファイルは削除せず別名保存
5. 同名なしは正規名で作成
6. 旧バックアップのowner-only trash失敗を吸収

6/6 success。

## 適用境界

GitHubはbound Apps Scriptへ自動同期されない。

このリポジトリの `patches/playpoint-analytics-v11.6.2-drive-safe.patch` は、保存版 `PlayPoint_Analytics_v11_6_1_UiSafe_Code.gs` に対する差分の正本とする。

live bound Apps Scriptへ反映後は次の日次実行で以下を確認する。

- 日次再照合が `RECONCILED` に戻る
- 既存日次行が維持される
- Drive保存に問題が残る場合はERRORではなくWARNになる
- `Access denied: DriveApp.` が「通常同期エラー」として増えない
- GA4 Realtime / Intraday / AdSense Intraday / Search速報の既存正常経路を壊さない

過去ログは監査証拠として削除・書き換えない。
