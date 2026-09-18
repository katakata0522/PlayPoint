# 第0章: CIの再現性と失敗証跡

## 守る範囲

UI・数式・利用者の保存データ・公開生成物は変更しない。PR Gateは引き続き必須の検査であり、チェックの無効化、continue-on-error、性能上限の緩和、失敗sampleの除外によって緑にしない。

## 環境の正本

Ubuntuは`ubuntu-24.04`、Nodeは`.github/ci-runtime/node-version`の完全な版番号。ブラウザ検証の依存は`.github/ci-runtime/package.json`とlock、Lighthouseは同ディレクトリ内`lighthouse/`のmanifestとlockに分離する。どちらも`npm ci --ignore-scripts`で取得する。Playwrightが指定するChromiumを使い、runnerに偶然入っているChromeへfallbackしない。

2026-09-16の導入版はNode 22.23.2、Playwright Core 1.63.0、Lighthouse 13.4.1。従来のPlaywright 1.55.0 / Lighthouse 13.3.0を固定し直す案は採用しなかった。Playwrightのブラウザ取得に関する修正とLighthouse依存監査の警告を確認したため、修正版で動作を検証する。Lighthouse用の依存は性能jobだけが取得し、配信・復旧jobには持ち込まない。

参考: [Playwright browsers](https://playwright.dev/docs/browsers)、[Playwright releases](https://github.com/microsoft/playwright/releases)、[Lighthouse releases](https://github.com/GoogleChrome/lighthouse/releases)、[extract-zip advisory](https://github.com/advisories/GHSA-jmr9-qjv8-65gv)。

Ubuntuのrunner image、aptで取得するfont、kernelやCPUは完全固定ではない。その差は`ImageVersion`、OS情報、fontの版とファイルハッシュ、CPU、メモリと環境fingerprintで観測する。セキュリティ更新を永遠に止める運用ではなく、manifest/lock/NodeファイルをPRで一緒に更新し、同じ公開ソース・同じbudgetで再検証する。

## 証跡

各実行の`ci-evidence-<job>-<run>-<attempt>` artifactに開始時・ブラウザ準備後の環境JSONとjob結果を保存する。保存期間は7日。checkout SHA/tree、イベントSHA、PR head/baseを区別し、環境変数全体、GitHub event本文、step outputs、秘密情報は保存しない。環境準備失敗時にも取得できた範囲を残す。ただしrunnerの強制終了やcheckout自体の失敗で、artifactを保存できないことはある。

PR Gateの全preflightは`preflight.json`に工程ID・所要時間・終了コード・依存関係・結果を残す。生成物不一致なら圧縮と圧縮後検査を`UPSTREAM_SKIPPED`にする一方、独立した回帰テストは続ける。未実行を成功扱いにせず、全体は非ゼロで終了する。通常検証では公開生成物を復元し、`--prepare-deploy`だけが元の仕様どおり配信用生成物を保持する。

|分類|意味|
|---|---|
|PASS|その検査が初回成功|
|DETERMINISTIC_FAIL|構文・生成物比較など決定論的な検査工程の不合格。長期flaky率の実測証明とは別|
|CHECK_FAIL|実行された検査の不合格。情報不足の段階で環境・製品のどちらとも断定しない|
|ENVIRONMENT_FAIL|プロセス起動不能、依存取得・browser準備失敗など|
|FLAKY_RECOVERED|navigationが1回以上失敗し、上限3回の範囲で成功。初回失敗は削除しない|
|CANCELLED|中断。中断理由はこの情報だけでは未確定|
|CANCELLED_BY_NEW_COMMIT|上位の実行履歴調査が新commitによる中断を確認した場合だけ使用。単なるcancelledを自動変換しない|
|UPSTREAM_SKIPPED|前提工程の失敗で実行不能。原因工程IDを併記|
|NOT_RUN / RUNNING|未実行 / 実行途中。成功ではない|

`browser-smoke-artifacts/navigation-attempts.json`には各試行を即時保存し、`report.json`にも統合する。ブラウザ起動・終了処理の失敗時にも可能な限りreportを保存する。ブラウザの起動失敗や同じコードの一度のretry成功だけから、製品全体のflaky原因を断定しない。

## 性能の計測・判定

測定対象6ページとモバイル6倍CPU条件を維持。ローカルでは従来どおり広告/計測の外部通信を除外、本番では除外しない。両者の結果を同じ母集団と扱わない。

トップは常に3sample。他のページは初回に時間/scoreだけがhard budgetを超えた場合、2sampleを追加する。初回の悪い値も含む3件で判定する。byte超過や測定欠損を「成功するまで再実行」することはしない。途中で失敗したCLI・欠損したJSON・無効な数値・未測定のページは成功にしない。

時間/scoreは中央値、byteは最大値。どのsampleであっても350KiB超過を中央値で隠さない。既存の全hard budgetと次段階のtarget値は維持する。`audit-manifest.json`が今回実行したsampleの正本になり、ディレクトリに残った古いJSONをglobして足さない。

`budget-summary.json`は全sampleの数値、中央値、最小・最大、平均、範囲、標準偏差、MAD、sample単位のbudget超過を保存する。中央値が合格でも外れ値があれば`PASS_WITH_OUTLIERS`と表示する。これは「問題なし」の証明ではなく要観察の成功。LighthouseのJSON、診断、resource内訳は14日保存し、揺らぎの原因調査と初期転送量削減の根拠にする。

Node/ブラウザ/Lighthouseが変わった前後のscore差を、そのまま製品の改善量と報告しない。比較するなら、同一公開ソースに旧環境と新環境を当てた対照測定が必要。今回の変更は転送量自体を削減するものではなく、既存の小さいheadroomは別の公開アセット最適化で扱う。

## 故障注入と反復

`tests/ci-stability.test.cjs`は依存skip・独立工程継続・例外・中断分類・retry・秘密情報除外・shellのNode不一致/npm失敗/Chromium失敗を検証する。`tests/ci-performance-sampling.test.cjs`はbyte最大値、外れ値の保存、欠損、重複、環境混在、追加測定、CLI失敗、途中manifestを検証する。

同一SHAの反復はコードを変更せず実施し、実行ID/attempt・checkout SHA/tree・fingerprint・全失敗を記録する。同一runner上の反復は再現性の限定的な検査であり、別runner間・長期のflaky率の証明ではない。成功した回だけ採用したり、コード修正前後を同一SHAの反復と称したりしない。通常PRへ常時5倍の測定を追加しない。


## 第3章・本番ブラウザ証跡のSHA結合（2026-09-17）

本番では40桁小文字SHAを `SMOKE_EXPECT_REVISION` に必須とする。通常Deployは公開対象、auto-rollback/manual rollback/watchdogは検証済みsnapshotを渡す。triggerのSHAと復旧先SHAは区別する。ローカルPR検証は `checked: false` と理由を残し、本番検証成功とは扱わない。

`report.json.revision` にexpected/actual/checked/matchと検証前後の観測・時刻を残す。suite末尾で再度live SHAを確認し、checkout SHA一致と全証跡SHA256を `deployment-evidence.json` に保存する。同じmanifestはDeployのCI証跡側 `browser-deployment-evidence.json` にも保存する。署名/改ざん耐性を保証するものではなく、どのrun・checkout・本番・保存ファイルが対応するかを機械照合するための記録である。

旧snapshotのbrowser report（checked/expected/actual）はtrusted current checkoutの結合helperで厳密検証する。旧コードに新helperの存在を要求しない。古いreportの `checked: false` を後付けでtrueにしてはいけない。

ブラウザ成果物を展開したworking directoryで、次のコマンドにより保存済みmanifestと全ファイルを照合できる（HTTP再検査ではない）。

```sh
SMOKE_EXPECT_REVISION=<exact-40-character-sha> node .github/scripts/bind-browser-evidence.cjs verify
```

既存のupload工程だけが失敗した場合のjob記録は `OBSERVABILITY_FAIL`。この分類はworkflowの成功/失敗やrollback条件を変更しない。計算・本番HTTP/Chromium等の本物の失敗が混在する場合は引き続き `CHECK_FAIL`。任意のcontinue-on-error工程を成功扱いにする汎用例外は設けない。

故障注入はlocalhost HTTP・一時ディレクトリ・一時Gitリポジトリ・watchdogの純粋な判定入力を使用する。本番への意図的な誤配信・snapshot破損は行わない。

## Merge gate と advisory checks

- main rulesetの必須merge checkは `PR Gate`。これは全preflightを常時実行する。
- `Low-end Android performance` は対象path変更時と週次で実行する性能監視で、現時点ではrequired merge checkではない。
- GitHub CodeQLはPR / main pushで実行されるsecurity signalで、現時点ではrequired merge checkではない。
- requiredかadvisoryかを「走っているかどうか」と混同しない。merge阻止が必要な契約はPR Gateへ統合する。
- PR Gateは変更影響を分類し、docs/tests-onlyではApache実HTTPとChromiumを省略できる。公開成果物・runtime・browser検証基盤の変更では従来どおり必須とする。workflow_dispatchや差分不明時はfull verificationへfail-safeする。
