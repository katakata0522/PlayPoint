# 本番デプロイ確認手順

PlayPointの本番反映は、GitHub Actionsのデプロイ結果と本番の公開ステータスを組み合わせて確認する。

## 1. GitHub Actionsのデプロイ結果

`main`へpushされた変更は `Deploy to Xserver` workflow で反映する。

確認対象はworkflow自体の結果とし、独自のGitHub commit statusは付与しない。ブランチ保護のrequired status checksには使っておらず、Actionsの結果と同じ状態を二重管理する必要がないためである。

- workflow成功: Xserver反映、主要ページのスモークテスト、SEOヘルスチェック、公開ステータス検証まで成功
- workflow失敗: いずれかの処理が失敗
- workflowキャンセル: 本番反映完了とは扱わない

## 2. 本番の公開ステータス

以下のJSONはキャッシュ禁止・検索登録禁止で公開される。

`https://playpoint-sim.com/status/deploy-status.json`

確認条件は次のとおり。

1. `status`が`verified`
2. `commit`が確認対象の40文字SHAと完全一致
3. `checks.preflight`、`checks.smokeTest`、`checks.seoHealth`がすべて`passed`
4. `verifiedAt`が有効なISO-8601日時

旧来の簡易確認用SHAも残す。

`https://playpoint-sim.com/status/deploy-revision.txt`

## 厳密ミラーと旧データ清掃

本番同期は、リポジトリの公開対象だけをXserverへ残す厳密ミラーとして実行する。

- `tests`、`docs`、`scripts`、`.github`などはルート直下だけを除外する
- `--delete-excluded`により、過去に本番へ置かれた除外対象も削除する
- 除外パターンを全階層へ広げないことで、旧ツール内の`tests`や`scripts`が削除を妨げないようにする
- 他サイトへ移設済みの`tools`、`kindle-tracker`、旧記事ファイルなどが物理的に残っていないことをSSHで直接検査する
- 旧URLの301転送は維持するが、転送できることだけで物理ファイル削除済みとは判定しない

この清掃検査に失敗した場合はworkflow自体が失敗し、本番反映完了とは扱わない。

## 自動検証

デプロイワークフローは、全ファイルをrsyncした直後に`deploying`状態を検証し、スモークテストとSEO検査を通過した後だけ`verified`へ更新する。その後、公開JSONを再取得してコミットSHAと検査状態を完全一致で検証する。

ローカルまたはActionsから公開JSONだけを検証する場合は、次の環境変数を指定する。

```bash
EXPECTED_DEPLOY_REVISION=<40文字のコミットSHA> \
EXPECTED_DEPLOY_STATUS=verified \
node .github/scripts/verify-deploy-status.cjs
```

「マージ完了」と「本番反映完了」は分けて扱い、`Deploy to Xserver` workflowの成功と公開JSONの一致を確認できるまでは本番反映完了としない。

## 検証用サブドメインの保護と取り消し

公開ルート直下の `stg.playpoint-sim.com` は、通常公開と復元の送信対象から除外し、受信側でも削除から保護する。`--delete-excluded` があるため通常の除外だけでは不十分であり、`hide` と `protect` の両方を維持する。同名の通常ファイル・リンクも保護対象とする。似た名前や将来の `/cms/` は対象外。

この変更は保護処理だけで、サブドメイン・DNS・WordPress・DB・HTTP設定を作成しない。検証用フォルダーをリポジトリの公開対象へ追加しない。設置前に実際の公開フォルダー名と保護名を一致させ、最新の保護処理が公開・復元に使われることを確認する。

### 本番ファイルの復旧

既存の直前の検証済みsnapshotと、最大5世代の検証済み履歴を使う。保持期間の保証や無制限の過去版復元ではない。通常公開失敗時の自動復元、手動rollback、復旧watchdogは、保護を含む共通の `deploy-rsync.sh` で復元する。

手動復元は現在のmainから起動し、履歴一覧・対象SHA検証・現在の検証済み本番の保存・選択履歴の有効化・復元・公開検証の順に進める。検証領域を含まない過去版でも、その領域を削除しない。検証領域が混入したsnapshot・履歴は変更前に拒否する。復旧後は公開ステータスと復元対象SHAの一致を確認する。

### 保護変更自体を取り消す場合

- **PR未マージ**：PRを閉じればよい。本番に反映された変更はない。
- **マージ後・検証環境の設置前**：該当マージの差分だけを取り消すrevert PRを作り、通常のPR Gateと公開確認を通す。mainの履歴を強制的に巻き戻さない。
- **検証環境の設置後**：先に検証サイトを停止し、WordPressのDB・uploads・設定を同期対象外へ退避して復旧可能性を確認する。その後に保護を取り消す。サイトの公開を戻すだけなら、保護を残した現在の復元処理を使う。

保護導入前の古い公開ジョブを再実行すると、保護なしの処理が動く可能性がある。検証環境の設置後は古いジョブを再実行せず、現在のmainから復旧手順を開始する。

検証用WordPressのDB・uploads等は本番snapshotから除外される。本番サイトの復元ではこれらを復旧できないため、検証環境を設置する段階で専用バックアップと復元試験を用意する。このPRのファイル同期試験を、DBやXserver上の復旧試験が完了したものとは扱わない。
