# 本番キャッシュ検査の公開markerパス修正

基準: 4e60207b3db75acc6a797161d240feefdff93a90（PR #344）。

## 経過

PR #344は全957/957、圧縮後17/17、18工程、Apache99応答、既存Chromiumが成功。通常Deploy run35281445393は全preflightを通過し、本番転送とHTTP/SEO/sitemap検査も成功したが、production-securityが失敗した。自動rollbackと復旧後のHTTP/security/Chromiumは成功し、公開版はd0a5d13bd1000270886270473025198e29df172eへ戻った。

## 確認した不具合

PR #343で追加した検査は/deploy-revision.txtと/deploy-status.jsonを要求していた。実際のdeploy-status.cjsはstatusディレクトリへ生成し、既存verify-deploy-status.cjsも/status/deploy-status.jsonを参照する。検査の参照先が本番の生成先と一致していなかった。

従来のApache fixtureは検査対象リストからファイルを作るため、誤ったパスにもダミーファイルを置いて成功してしまった。これはfixtureだけの自己整合で、本番構成との整合を保証できていなかった。

## 修正と主担当

- HTTP cache対象、前後revision読取、security初回取得を/status/配下へ修正する。公開ファイルの移動・コピー・URL変更は行わない。
- 初回取得でHTTP 200を確認してからSHA本文を受理する。404の本文がSHAに見えても受理しない。
- 新規tests/security-health-execution.test.cjsを起動・生成先の統合検査ownerにする。実際のdeploy-status writerで生成し、Nodeの実security CLIとcache checkerを動かす。HTTPのみローカルfixtureへ隔離し、実ネットワークや本番書込は行わない。
- 既存12応答検査と実Apache99応答は維持。CLI4ケースは期待SHA指定/自動取得、HTTP失敗/不正値、指定SHAとの差異を確認する。

ローカルは関連26/26（HTTP12＋CLI4＋preflight10）、Apache99/99が成功。両パス誤り、cache側だけ誤り、初回取得側だけ誤りの3種類を意図的に戻すと新CLI検査が失敗した。全回帰の実合否は当該PR Gate成果物で確認する。

## 範囲と未確定事項

UI・計算式・記事・保存形式・広告・Consent・.htaccess・workflow・権限・性能基準は変更しない。基準930中80精査/850未精査は重複加算せず維持する。

run35281445393の個別ジョブログはツール経由で読めていないため、当時のエラー文との直接照合は未完了。ただし上記パス不一致と、それによる実CLI失敗は生成コードと隔離実行で再現した。さらに古いrun35274726631の全回帰失敗原因は別件であり未特定。本番反映完了は、新しい通常Deployの全工程・公開cache・exact SHA・verified・Chromiumの実結果で判定する。
