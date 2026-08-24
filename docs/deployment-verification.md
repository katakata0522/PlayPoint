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
