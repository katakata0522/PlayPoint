# WordPress移行済み記事の更新連動（stg限定）

本番配信・DB・広告設定を変えず、既存の静的台帳へ移行済み記事の公開内容だけを重ねる検証用ツール。自動デプロイの公開対象外の `tools/` に置く。本番用MUプラグインとして流用しない。

## 保持する契約

- `catalog.php` はWordPressの題名・説明・抜粋・更新日・分類・タグ・本文検索を同じ公開データから生成する。登録済みのURLだけを対象とし、未移行の行は保持する。
- 下書き・非公開・削除済み・パスワード付きは一覧と検索へ出さない。DB書込み・外部通信・永続キャッシュは行わず、復元したDBが次のリクエストから反映される。
- 記事内検索の形式は既存の `version:1`。共通 `article-search.js` の語句判定・順位・抜粋を使う。入力したまま開いている検索結果はページ再読込み後に最新化する。
- サイドバーの既存分類件数と記事名そのもののリンクを更新する。手書きの誘導文は保持する。新しい分類は検証一覧へ表示される。記事側の固定分類メニューへの追加は別途編集する。
- 既存記事のA/Bデザイン・保存・閲覧履歴・計算機・広告要求と同意処理は保持する。検証一覧は記事台帳の連動確認用で、公開用ブログの全機能移植を完了したものではない。

## 手動検証

PHP 8.3（DOM・mbstringを含む）とNodeを使用する。既存の必須CIを増やさない。

```text
node tools/wordpress/check-catalog.mjs <PHP実行ファイル>
node --test tests/article-search-language.test.cjs tests/playpoint-revenue-diagnostics.test.cjs
node tools/wordpress/build-staging.mjs <直前に読戻したstg記事PHP> <生成先>
```

生成先には検証済みライブラリー・台帳・stgラッパー・受動診断・記事PHPを出力する。記事PHPは3か所のフィルター接続だけを変更し、圧縮済みの既存デザイン・記事・広告コードはバイト単位で保持する。接続点の不一致では生成を止める。

## stgへの配置と切り戻し

1. Xserverで対象が `/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms/wp-content/mu-plugins` であることを確認する。既存記事PHPをローカルへ読戻し、時刻とSHA256を残す。認証情報・SQLをGitへ入れない。
2. `playpoint-catalog-library.php`、`playpoint-catalog-base.json`、`playpoint-ad-diagnostics.js` を配置して読戻し照合する。既存の検索索引・検索エンジンは上書きしない。
3. `playpoint-catalog-staging.php` を配置し、最後に生成された `playpoint-fest-candidate-staging.php` を配置する。各ダイアログのファイル名と読戻しハッシュを確認する。
4. 記事内検索、`/cms/index.php?pp_catalog=list`、`pp_catalog=catalog`、`pp_catalog=search` を確認する。Basic認証・noindex・no-storeを維持し、本番の配信状態・記事・計算機・ブログ・SWのハッシュ不変を照合する。
5. 障害時は、まず記事PHPを直前バックアップへ戻す。確認後にこのタスクで追加したラッパーを `.disabled` へ変更する。元の台帳・検索索引は残っている。DBを変更していないためDB復元は不要。稼働DBへのSQL投入はこの手順に含めない。

DB復旧は、取得済みの本番専用CMSバックアップを、ループバックだけで動くMariaDB 10.11.18の別DBへ投入して確認する。復元元の時点、全テーブル数と指紋、実WordPressでの読出し、停止後の一時サーバー終了を記録する。記事を公開・編集する試験は隔離した複製だけで行う。公開後の変更を含まない古いバックアップを「最新版を復旧できた」と報告しない。画像・全ファイルの復旧確認はDB復元と別に扱う。

## 広告の診断と範囲

記事へ `&pp_diag=1` を付けると、ChromeのHeavy Ad Intervention、読込みタグ数、広告枠の配信状態とフレーム寸法を表示できる。診断は外部送信しない。広告はクリックせず、強制再要求・自動再読込み・広告設定変更も行わない。

広告フレームのCPU制限とサイト本体のLong Taskは別の指標。第三者通信量が取得できない値を0として扱わない。停止通知がない短時間の観測や `filled` 1回を、再発しない保証・旧新の配信率比較には使わない。既存stg検証パネルの2秒ごとの再描画は、パネルが開きページが可視の間だけ行う。これは検証画面側の負荷軽減であり、広告素材の負荷制限そのものの解決ではない。

一次資料: [Chrome Heavy Ad Intervention](https://developer.chrome.com/docs/web-platform/heavy-ads-intervention)、[MariaDB Windows ZIP](https://mariadb.com/docs/server/server-management/install-and-upgrade-mariadb/installing-mariadb/binary-packages/installing-mariadb-windows-zip-packages)。
