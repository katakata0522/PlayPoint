# 新規記事7本の公開候補（2026-11-27）

2026年11月28日、7本を公開用記事へ統合しました。以下は11月27日時点の下書きと引き継ぎ記録です。

本ディレクトリは **非公開用の編集・実装引継ぎ**。実際の公開ルートには未配置。画像の実体ファイルをGitHubへ転送できず、既存の #848 も未マージのため、共通台帳を直接上書きしない。既存デザインを継承したHTML 7本、統合用の台帳追加データ、Role、関連導線、公式出典の対応を用意した。GitHubの接続機能ではテキスト編集が可能だが、この実行環境からバイナリ画像を直接転送できない。

- articles/ のHTMLは最終配置先での相対パスを前提に作成。現行日本語記事の共通CSS、ヘッダー、記事サイドバー、広告枠、著者、フッターを継承。広告・トップの仕様変更なし。
- integration-plan.json の manifestAdditions は blog/articles.json へIDで追加（既存記事は保持）。roleByStem は scripts/article-role-registry.cjs の既存分類に追加（一般的な gift-card 判定より優先）。genericArticleIds / dedicatedOgpIds は scripts/article-image-assets.json と照合し、既存の画像運用ルールに沿って登録する。relatedChoices は scripts/reader-related-choices.cjs に追加。モンハンNowの公式アプリアイコンは取得・権利確認後に既存の game-thumbnail-assets.cjs と画像台帳に登録する。仮のジェム画像を公式アプリアイコンとして登録しない。
- 画像14枚は別途作成・寸法形式検証済み（OGP 1200×630 JPEG、一覧256×256 WebP）。GitHub未登録。モンハンNowの一覧用ジェムは確認用のみ。
- source-audit.json は各記事の出典と本文節の対応。公式ヘルプの一部で直接取得制限があったため、公開前に該当ページを再確認し、問題がない場合のみ公式確認日を記録。実際の決済、解約、アカウント画面は未検証。
- 公開日は原稿日ではなく実際の公開日に合わせて更新。日本語版のみ。存在しない翻訳hreflangは付けない。
- #848などの最新mainを取り込み、記事ID・URL・検索意図の重複確認、画像実体の登録、上記台帳の追加、HTML配置を実施。既存の生成処理 node scripts/prepare-pr.cjs で記事一覧、検索インデックス、サイトマップ、関連導線、日付等を同期する。
- 7ページのtitle/H1、canonical、Article JSON-LD、BreadcrumbList JSON-LD、画像URL、見出しID重複、サイドバー存在、表の列数、関連ID・出典番号を静的確認済み。実ブラウザ・既存全体の生成処理・CIは未実行。最新headのPR Gate成功と実ページの確認までマージしない。
- 月間検索数・最新GSCクエリは未取得。検索意図の仮説に基づくタイトル・説明・内部リンク設計。成果は公開後に計測。
