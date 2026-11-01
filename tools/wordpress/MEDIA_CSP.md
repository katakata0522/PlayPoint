# WordPressメディア操作とCSP（stg専用）

2026-10-27 JST。公開側のCSP、WordPressコア、本番配信、広告設定、記事デザインは変更しない。`media-staging.php` は自動配信対象外の `tools/` にある配置候補で、実stgへの設置・実ブラウザーでの受入確認は別工程。

## 照合した実装と境界

2026-10-27付の[技術資料](https://drive.google.com/file/d/1h_6lOoBdpXFb36HmByZhJJ1rllVPPSmK/view)、[残作業資料](https://drive.google.com/file/d/1ns_GDucE4kgQjj3vK4QtrGtS4FUKpuZ7/view)、PR #632の既存head `3f16cbb` を照合した。資料が記録する実stgの `EvalError` は、公式WordPress 7.1.3（tag commit `fc9832bef919c2a08541248db23af90d14ffb082`）の以下の実装と一致する。稼働中コアの全ファイルを再取得したという意味ではない。

- `wp-includes/js/underscore.js:951`: `new Function(argument, '_', source)`。
- `wp-includes/js/wp-util.js:43`: `wp.template` が `_.template` を呼ぶ。グリッド・メディア選択モーダルがこの経路を共有する。
- `wp-admin/upload.php:133–142`: 一覧の設定保存と、グリッド時の `wp_enqueue_media()`。一覧ではサーバー側の `WP_Media_List_Table` を使う。
- `wp-admin/media-new.php:30–38,69–70`: `browser-uploader` によるHTMLフォーム、`check_admin_referer('media-form')`、`media_handle_upload()`、通常のメディア一覧へのリダイレクト。`upload_files` の権限検査もコアにある。

ルート `.htaccess` は `script-src-attr 'none'` と `unsafe-eval` 禁止を維持している。CMS fixtureの投稿編集画面では同一オリジン／blobのフレームだけを追加許可し、evalは禁止のまま。fixtureには以前から `revision.php` だけのeval例外もあるが、今回追加・拡大しない。fixtureと稼働中CMS設定を同一視しない。

未認証の実stg管理画面とuploadsは401・Basic challenge・`private, no-store` を返した。実stgへのブラウザー接続は `ERR_INVALID_AUTH_CREDENTIALS` で止まった。現在のセッションでログイン後の操作を再確認できていない。

## 方法の比較と今回の採用案

| 方法 | 新規アップロード／記事への挿入 | 保護・保守への影響 | 判断 |
| --- | --- | --- | --- |
| 標準の一覧＋ブラウザーアップローダー | 標準フォームでアップロード。既存のURLを手で挿入する | コアの権限・nonce・ファイル検査をそのまま使う。画像選択モーダルは回復しない | 基礎に採用 |
| サーバー描画の補助画面 | 標準アップローダーへの入口と、選んだ画像の挿入用HTMLを提供。既存編集画面へ手で貼る | 独自のアップロード／記事更新APIなし。追加JS・テンプレートコンパイルなし。stg管理者に限定 | 今回の実装 |
| 管理画面の限定CSP例外 | 標準グリッド・選択モーダルが動く可能性が高いが、他の制約も含め実ブラウザー検証が必要 | `Function`／文字列evalが使えるようになり、文字列をコードに変えるXSS経路への防御を減らす。管理者権限で動くため影響が大きい | 未採用。具体的な対象・保護・代替案を示してから別判断 |
| テンプレートの事前コンパイル／独自モーダル | 実行時evalを避ける設計は可能 | コアの翻訳、プラグインが追加するテンプレート、更新ごとの差分追従が必要。全管理UIを保証するには広範な検証が要る | 今回は実装しない |

eval例外を検討する場合も、公開側への追加や `/cms/wp-admin/` 全体の一括許可を前提にしない。host・実際に必要な画面・認証・外部scriptの許可・401/エラー・内部rewriteを合わせて設計する。CSPヘッダーをもう一つ追加しても、既存の厳しいポリシーは相互に適用されるため、それだけでは禁止を解除できない。今回はCSP変更なしで使う経路を選んだ。

## 補助画面の範囲

- 読み込む条件はstgの正確な `ABSPATH` とhost、および管理リクエスト。利用は `manage_options` と `upload_files` を持つ管理者に限る。
- 標準メディア一覧の未指定時の表示を、DBへ設定を書かずに一覧へする。明示的な `mode=grid` は診断用に残す。
- 画像追加は `media-new.php?browser-uploader=1` を使う。新たなPOST／AJAX／RESTエンドポイント、権限、nonce方式、MIME許可は追加しない。
- 補助画面は最大20件ずつサーバー側で検索・表示する。画像はattachment・inherit・ラスター形式・添付の編集権限・uploads配下の実ファイルを確認する。外部URL、別host、http、資格情報／port付きURL、似たパス、親参照、uploads外の実体は挿入候補にしない。
- WordPressが返すlargeサイズを使い、URL・代替テキスト・寸法をエスケープしてHTMLを作る。タイトル空欄ではファイル名を使う。0件・不正な選択・配列入力でも画面を維持する。
- 記事の本文・画像バイナリーは書き換えない。記事挿入／置換は生成したHTMLを既存編集画面へ貼り、通常の保存・プレビューで確認する。自動挿入、標準選択モーダル、画像加工の復旧ではない。

## stgへの設置と受入

1. 対象が `/playpoint-sim.com/public_html/stg.playpoint-sim.com/cms/wp-content/mu-plugins/` であると確認する。本番の `/cms/` へ置かない。既存の同名ファイルがあれば読戻しとハッシュを保存し、後続変更を上書きしない。
2. `media-staging.php` を `playpoint-media-staging.php` としてstgだけへ配置し、読戻しが候補とバイト単位で一致することを確認する。既存の移行記事PHP・DB・`.htaccess` は触らない。
3. メディアの「画像アップロード・挿入用HTML」を開く。「画像をアップロード」から標準ブラウザーアップローダーを開き、使い捨てのPNGを追加する。完了後に一覧へ戻り、画像が1件増えたことを確認する。
4. 補助画面で画像を選び、生成HTMLをコピーする。対象stg投稿の直前の題名・本文を退避し、「カスタムHTML」ブロックまたはコードエディターの意図した位置へ貼って保存する。編集途中の別タブを上書きしない。
5. 記事の画像、スマホでの収まり、代替テキストとリンク、他の本文・表・canonicalを確認する。別画像のHTMLへ対象imgだけを差し替え、元画像と他記事が維持されることを確認する。
6. 題名・本文を直前データへ完全一致で復元し、仮画像・確認語が記事から消えたことを確認する。stgの更新日時・リビジョンは試験履歴として扱う。試験画像の永久削除はこの手順に含めない。
7. 管理画面・画像・記事の未認証401、Basic challenge、no-store、eval禁止を確認し、本番marker・先行記事の応答ハッシュとCSPの不変を照合する。

画像の代替テキストは標準の添付編集画面で保存した後、補助画面を開き直して生成HTMLへ反映する。既に記事へ貼ったHTMLの代替テキストは自動更新しない。標準の「メディアを追加」・画像選択モーダル・ブロック画像の標準置換・画像加工は受入対象を別に残す。

切り戻しは、今回追加したstgの `playpoint-media-staging.php` だけを `.disabled` に変更する。既存ファイルの置換であった場合は、配置直前に読戻した版へ戻す。画像・投稿DB・既存移行PHP・CSPを戻す作業は不要。アップロードと記事保存の試験で作られたデータは、別途退避・復元の対象として区別する。

## 検証記録

元コードを使ったPHPテストで、stg以外／公開リクエストでフック登録なし、権限不足拒否、16種の不適合画像、悪意ある代替テキストのエスケープ、配列入力、件数制限・ページ送り条件を確認した。既存のWordPress記事テストに収め、新しい必須チェックは追加しない。

公開側に関係する既存のHTTPキャッシュ・Service Worker・公開物境界・PR影響判定・セキュリティ契約46件も成功。今回の変更は全て公開物の許可リスト外で、公開PHP・静的ファイル・広告コードに差分はない。

公式WordPress 7.1.3・PHP 8.3.6・MariaDB 10.11.14の新規隔離DBで、標準HTMLフォームのPNGアップロード2件（520×472、640×320）、同名ファイルの別名保存、不正nonceの403、subscriberの管理画面／アップロード拒否、SVGの登録拒否、0件表示をHTTP経由で確認した。生成HTMLをWordPress標準REST APIで代表記事へ挿入し、別画像への置換・画像HTTP応答・元バイナリー保持・他2記事の本文保持・元本文と題名の完全復元・試験画像の本文からの除去まで確認した。更新日時とリビジョンは隔離DBの試験履歴として保持した。

隔離コピーだけはABSPATHと画像オリジンをlocalhost/httpへ適合させた。元のstg境界は変更前提なしのPHPテストで別途検査している。HTTP fixtureはリポジトリのCSPをWordPressの応答後に設定し、ローカルHTTP用にupgrade-insecure-requestsだけを省く。`script-src`・`script-src-attr 'none'` の存在とeval禁止を受信ヘッダーで確認した。実Apacheの検証、JS実行、ブラウザーでの貼付をこのHTTP試験に含めない。結果と対象ソースSHA256は [media-verification-20261027.json](media-verification-20261027.json) に記録した。

実stgの追加アップロードと実ブラウザーでの貼付・置換・画面幅確認は、認証済みセッションが得られてから実施する。HTTPでの検証、隔離環境での確認、実stgでの受入を分けて記録する。

一次資料: [media_handle_upload](https://developer.wordpress.org/reference/functions/media_handle_upload/)、[media_upload_form](https://developer.wordpress.org/reference/functions/media_upload_form/)、[wp_enqueue_media](https://developer.wordpress.org/reference/functions/wp_enqueue_media/)、[wp.template](https://codex.wordpress.org/Javascript_Reference/wp.template)、[CSP Level 3](https://www.w3.org/TR/CSP3/)。
