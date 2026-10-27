# WordPress移行済み記事の更新連動（stg限定）

本番の配信・DB・広告設定を変えず、既存の静的台帳へ移行済み記事の公開内容だけを重ねる検証用ツール。自動デプロイの公開対象外の `tools/` に置く。本番用MUプラグインとして流用しない。代表記事の取り込みはstgの管理者操作だけで行う。

メディアグリッドとCSPの不適合は [MEDIA_CSP.md](MEDIA_CSP.md) を参照する。`media-staging.php` は、標準ブラウザーアップローダーとサーバー描画の挿入用HTMLを使うstg専用の代替候補。コア・CSP・記事を自動変更せず、実stgへの配置とブラウザー受入は別工程とする。

## 保持する契約

- `catalog.php` はWordPressの題名・説明・抜粋・更新日・分類・タグ・本文検索を同じ公開データから生成する。登録済みのURLだけを対象とし、未移行の行は保持する。
- 下書き・非公開・削除済み・パスワード付きは一覧と検索へ出さない。DB書込み・外部通信・永続キャッシュは行わず、復元したDBが次のリクエストから反映される。
- 記事内検索の形式は既存の `version:1`。共通 `article-search.js` の語句判定・順位・抜粋を使う。入力したまま開いている検索結果はページ再読込み後に最新化する。
- サイドバーの分類件数と記事名そのもののリンクを更新する。手書きの誘導文、既存の分類順と装飾を保持し、新しい分類は末尾へ追加する。
- 既存記事のA/Bデザイン・保存・閲覧履歴・計算機・広告要求と同意処理は保持する。`pp_catalog=list` は台帳確認用。`blog-staging.php` は既存の公開ブログの画面を再利用する追加候補で、本番の配信先ではない。

## 手動検証

PHP 8.3（DOM・mbstringを含む）とNodeを使用する。既存の必須CIを増やさない。

```text
node tools/wordpress/check-catalog.mjs <PHP実行ファイル>
node --test tests/article-search-language.test.cjs tests/playpoint-revenue-diagnostics.test.cjs
node tools/wordpress/build-staging.mjs <直前に読戻したstg記事PHP> <生成先>
node tools/wordpress/build-blog-staging.mjs <生成先>
node tools/wordpress/audit-migration.mjs <事前点検JSONの出力先>
```

生成先には検証済みライブラリー・台帳・stgラッパー・受動診断・記事PHPを出力する。記事PHPは4か所のフィルター接続だけを変更し、圧縮済みの既存デザイン・記事・広告コードはバイト単位で保持する。既に接続済みの箇所は再変更せず、接続点の不一致では生成を止める。

`build-blog-staging.mjs` は正本の `blog/index.html` と既存CSS・JSから `playpoint-catalog-blog.php` を生成する。元ソースのハッシュと変更点の一致を記録し、データ読込みとstg内のURLだけを接続する。ページ送り・検索・並べ替え・分類・ゲーム絞り込み・保存履歴の実装を再利用する。

stgの既存CSPを変更せず、本文索引を含む同じスナップショットを保存禁止のHTMLへ埋め込み、本文索引の解析は検索時に行う。CSSとJSは指紋付きの静的4ファイルへ分離し、`assets/wp-catalog/` へ生成する。headの2スクリプトとbody末尾の実行順、共通検索・保存の元コードを保持する。noscript専用の小さなCSSは条件内に残す。

静的ファイルはBasic認証を継承するstgの `/assets/wp-catalog/` へ置く。新しい専用 `.htaccess` は成功応答200/304だけを `private, max-age=31536000, immutable` にし、未認証401・欠落404の保存拒否を維持する。既存のルート設定・認証・CSPは変更しない。記事データの更新はHTMLだけを更新し、コード変更は別の指紋名を使う。画像は生成時に列挙した公開画像の固定allowlistからだけ読み、リクエスト文字列をパスへ連結せず、realpathが公開画像ルート内にあることを確認する。画像の複製・本番ファイルの上書きは行わない。

新しい一覧の候補URLは `/blog/?pp_flow=normal&pp_catalog=live`。既存のstgブログが広告・本番計測の対象外である状態を維持し、公開用共通スクリプトの広告／計測初期化はこの候補で実行しない。広告枠の属性と公開元のコードは保持する。この一覧での収益・広告表示の検証完了を意味せず、記事の広告確認とは区別する。権限・Basic認証・CSPやAdSense設定を変更して動かす手順は含めない。

## stgへの配置と切り戻し

1. Xserverで対象が `/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms/wp-content/mu-plugins` であることを確認する。既存記事PHPをローカルへ読戻し、時刻とSHA256を残す。認証情報・SQLをGitへ入れない。
2. `playpoint-catalog-library.php`、`playpoint-catalog-base.json`、`playpoint-ad-diagnostics.js` を配置して読戻し照合する。既存の検索索引・検索エンジンは上書きしない。
3. `playpoint-catalog-staging.php` を配置し、最後に生成された `playpoint-fest-candidate-staging.php` を配置する。各ダイアログのファイル名と読戻しハッシュを確認する。
4. 記事内検索、`/cms/index.php?pp_catalog=list`、`pp_catalog=catalog`、`pp_catalog=search` を確認する。Basic認証・noindex・no-storeを維持し、本番の配信状態・記事・計算機・ブログ・SWのハッシュ不変を照合する。
5. 障害時は、まず記事PHPを直前バックアップへ戻す。確認後にこのタスクで追加したラッパーを `.disabled` へ変更する。元の台帳・検索索引は残っている。DBを変更していないためDB復元は不要。稼働DBへのSQL投入はこの手順に含めない。

追加の一覧を反映するときは、まず静的4ファイルと専用 `.htaccess` を配置して読戻し・HTTP応答を照合し、その後で新しいブログ用プラグイン、連動ラッパー、記事PHPを配置する。ブログ用PHPは必要な静的実体の欠落・指紋不一致で503となるため、PHPの切替を先行させない。稼働ファイルを直前にすべて読戻して照合し、別の作業による変更があれば上書きしない。`blog-build.json` はローカル証跡だけに置く。直前のブログ用PHPへ戻せば前版へ切り戻せる。旧記事PHP・旧ラッパーへ戻した後で、新しいブログ用プラグインを `.disabled` にすれば、前の台帳確認用一覧へ戻せる。指紋付きの旧アセットは切り戻し用に保持する。新しいUIを実際にstgへ反映したとの報告は、認証・ヘッダーと実URLでの確認後に限る。

全記事の点検は読取りだけで、本文・URL・見出し・表・画像・開閉・入力操作・参照スクリプトとスタイルを記録する。分類は検証順の目安であり、本文中心の記事でも個別のCSS・JS・リンクを確認する。一括公開や移行完了を意味しない。

DB復旧は、取得済みの本番専用CMSバックアップを、ループバックだけで動くMariaDB 10.11.18の別DBへ投入して確認する。復元元の時点、全テーブル数と指紋、実WordPressでの読出し、停止後の一時サーバー終了を記録する。記事を公開・編集する試験は隔離した複製だけで行う。公開後の変更を含まない古いバックアップを「最新版を復旧できた」と報告しない。画像・全ファイルの復旧確認はDB復元と別に扱う。

## 代表3記事のstg検証

`node tools/wordpress/article-batch-build.mjs <生成先>` は、通常本文の `2026-10-14-play-credit-subscription`、表付きの `2026-10-13-play-points-stamp-cards`、画像付きの `2026-10-10-diamond-play-pass-value` の元HTML・本文・CSS・JS・画像参照を保持する候補を生成する。本文の完全再構成、検索と保存の元コード、生成後のJS構文を所有テストで確認する。

旧記事のheader前にあるHTMLコメントはheroへ元バイトのまま保持する。先頭の本文や入力付き記事の除外条件は緩めない。これは読み取り処理の準備で、代表3件以外を取り込む変更ではない。旧広告起動方式・games階層・国際header・入力controllerは、それぞれの隔離と実行確認を終えてから対象を追加する。

生成した `playpoint-article-batch-staging.php` をstgのMUプラグインへ配置し、管理者で `/cms/wp-admin/tools.php?page=playpoint-article-batch` から1回だけ取り込む。権限とnonceが必須で、匿名GETではDBを変更しない。同じ試験URLの既存記事は内容・状態を上書きせず再利用する。同時送信の排他はないため、応答不明時は再押下せず投稿一覧を確認する。新規記事の本文が原文と一致しなければ、その新規記事だけをゴミ箱へ戻して中断する。

取り込み後、stgルートの既存規則より前に次の3パスだけを追加する。本番へ追加しない。連動ラッパーの `pp_catalog_mapping` 接続で一覧・分類・本文検索も現在の公開データへ揃える。

```apache
RewriteRule ^articles/(2026-10-14-play-credit-subscription|2026-10-13-play-points-stamp-cards|2026-10-10-diamond-play-pass-value)\.html$ /cms/index.php [END,QSA]
```

記事の元canonical・OGP画像・見出しIDを保持し、題名・説明・日付・構造化データはWPの内容へ連動させる。手動の一覧見出しは上書きせず、自動追従中の見出しだけ題名変更へ揃える。下書き等は元URLを404にし、一覧と検索から除く。新規3記事だけはstgの本番GA4・広告初期化を抑止し、公開元コードとアカウント設定は保持する。広告の調査は既存Festの診断用URLで継続する。

記事アセットは固定allowlist・拡張子・実体境界・元ファイルの指紋を照合し、公開元の画像は読取りだけで使用する。任意パスは受け付けない。stgで元URL・本文・表・画像・スマホ・検索・保存・計算機を確認する。この候補を本番へそのまま転用しない。切り戻しは追加した3パスの規則を直前の設定へ戻し、連動ラッパーを戻してから新規プラグインを `.disabled` にする。検証記事のDBデータは保持する。

WPで追加した画像は、stgの `/cms/wp-content/uploads/` 内のURLだけをstgへ保持する。画像本体・srcset・拡大リンクを同じ接続先に揃え、Basic認証を継承した通常のメディア配信を使う。公開元の絶対URLは本番のまま保持し、固定assetのallowlistへメディアを追加したり、認証・CSP・配信規則を広げたりしない。投稿の仮編集を検証するときは、直前の本文と題名を保存し、検証後に完全一致で復元する。stgの更新日時とリビジョンは試験履歴として残る。

## 広告の診断と範囲

記事へ `&pp_diag=1` を付けると、ChromeのHeavy Ad Intervention、読込みタグ数、広告枠の配信状態とフレーム寸法を表示できる。診断は外部送信しない。広告はクリックせず、強制再要求・自動再読込み・広告設定変更も行わない。

広告フレームのCPU制限とサイト本体のLong Taskは別の指標。第三者通信量が取得できない値を0として扱わない。停止通知がない短時間の観測や `filled` 1回を、再発しない保証・旧新の配信率比較には使わない。既存stg検証パネルの2秒ごとの再描画は、パネルが開きページが可視の間だけ行う。これは検証画面側の負荷軽減であり、広告素材の負荷制限そのものの解決ではない。

一次資料: [Chrome Heavy Ad Intervention](https://developer.chrome.com/docs/web-platform/heavy-ads-intervention)、[MariaDB Windows ZIP](https://mariadb.com/docs/server/server-management/install-and-upgrade-mariadb/installing-mariadb/binary-packages/installing-mariadb-windows-zip-packages)。
