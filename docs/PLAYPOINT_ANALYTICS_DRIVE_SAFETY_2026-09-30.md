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

### 2026-10-05 稼働反映と実行検証

PlayPoint Analyticsをコンテナとする稼働中プロジェクトを確認し、本体コードを非公開のローカル作業領域へバックアップした。稼働本体は保存版v11.6.1とパッチの適用箇所が一致したため、構文検査・関連29テストと実コードのDrive動作5ケースを検証してv11.6.2へ更新した。メニューの版表示は `CONFIG.VERSION` と同期するよう修正した。追加スクリプト2本・サービス・OAuthスコープ・既存トリガーは変更していない。

通常の日次同期を一度実行し、2026-10-05 12:05:30（Asia/Tokyo）に正常終了した。

- 日次再照合：最新データ2026-10-04、RECONCILED、連続失敗0、最終エラーなし。
- 日次更新期間：2026-09-28〜2026-10-04。保存済み398日を維持。
- Drive：2026年8月・7月の完了月アーカイブを保存し、今回の実行でDrive権限エラー・Drive保留警告なし。
- 週次詳細：従来の正常なRECONCILED状態を維持。

これは手動同期での復旧確認であり、既存トリガーの次の定期実行成功を先取りした記録ではない。所有者が異なる旧バックアップを削除する権限は広げず、編集または別名保存と削除失敗の分離で処理を継続する。

このリポジトリの `docs/patches/playpoint-analytics-v11.6.2-drive-safe.patch` は、保存版 `PlayPoint_Analytics_v11_6_1_UiSafe_Code.gs` に対する差分の正本とする。

live bound Apps Scriptへ反映後は次の日次実行で以下を確認する。

- 日次再照合が `RECONCILED` に戻る
- 既存日次行が維持される
- Drive保存に問題が残る場合はERRORではなくWARNになる
- `Access denied: DriveApp.` が「通常同期エラー」として増えない
- GA4 Realtime / Intraday / AdSense Intraday / Search速報の既存正常経路を壊さない

過去ログは監査証拠として削除・書き換えない。

## パッチ形式の再検証（2026-09-30）

元の差分にはハンクの行数不整合があり、標準の `git apply` で読み込めなかった。保存済み v11.6.1 に適用した結果から差分を再生成し、通常の `git apply --check` と適用後の構文検査が通ることを確認した。

作業用コピーのあるフォルダで、以下を順に実行する。ファイル名は v11.6.1 のまま、内部のバージョンと処理が v11.6.2 になる。原本は別に保管する。

```text
git apply --check <このリポジトリの絶対パス>/docs/patches/playpoint-analytics-v11.6.2-drive-safe.patch
git apply <このリポジトリの絶対パス>/docs/patches/playpoint-analytics-v11.6.2-drive-safe.patch
```

稼働中コードがこの保存版と異なる場合は先に照合し、独自変更を保つ。構文検査とGitHubへの反映は、bound Apps Scriptへの適用・正常実行の証明ではない。

Windows の自動 CRLF 変換でも文脈が一致しなくなるため、`docs/patches/*.patch` の保存・取得時の改行を `.gitattributes` で LF に固定する。保存版の作業用コピーも LF で用意する。
