# Article CSS architecture

PlayPoint の記事CSSは、現在の公開デザインを維持しながら旧記事と新記事を段階的に統一するため、次の責務に分ける。

## 1. `articles/article-shared.css` — 公開デザインの正本

日本語記事で最終的に表示されるサイト共通の見た目を持つ。

- サイトヘッダー / グローバルナビ / パンくず
- 2カラム本文 / サイドバー
- 記事タイトル、公開日・更新日などのメタ情報
- H2 / H3 / H4
- CTA、FAQ、著者欄、関連記事、記事ナビ
- 共通の表・吹き出し・注意ボックス
- レスポンシブレイアウト

日本語記事では互換CSSより後に読み込み、公開時の visual contract とする。

## 2. `articles/article-legacy.css` — 旧記事の互換レイヤー

旧記事固有CSSがまだ依存している共通部品だけを残す。新しい共通デザインをここへ追加しない。

旧記事固有CSSは `article-legacy.css` より先、`article-shared.css` は後に読む。

旧記事固有CSSには歴史的に `.hero` の背景色・余白・中央寄せなどが含まれているため、`article-legacy.css` の末尾で公開シェルに不要な hero 装飾だけを打ち消す。記事固有のカード・表・色付き部品はそのまま維持する。

## 3. `articles/article-modern.css` — 新しめの記事の互換レイヤー

`formula`、`note`、reward comparison など、まだ shared へ移していない記事部品を維持するための互換CSS。

単独ページ時代の `.hero` 背景・余白は公開シェルの責務ではないため、末尾で打ち消す。共通のタイトル・CTA・見出しなどは `article-shared.css` に任せる。

## 4. `articles/styles/*.css` — 記事固有の部品

特定記事だけに必要な表現を持つ。

今後ここへ追加してよいもの:

- その記事だけの比較カード
- その記事だけの図・強調UI
- 固有データ表のレイアウト

今後ここへ追加しないもの:

- ページ全体の背景
- 公開記事の `.hero` シェル
- サイト共通のタイトル / 見出し / CTA
- 共通ヘッダー / フッター / サイドバー

## 読み込み順の契約

旧記事:

```text
記事固有CSS
→ article-legacy.css
→ article-shared.css
```

新しめの記事:

```text
article-modern.css
→ article-shared.css
```

`tests/japanese-article-css-contract.test.cjs` でこの順序と hero の責務境界を固定する。

## 移行方針

互換CSSからルールを削るときは一度に全面削除しない。

1. shared 側に同等の公開表示があることを確認する
2. 回帰テストを追加する
3. 旧・新の代表記事を実ブラウザで確認する
4. その後、互換CSSから重複ルールを小さな単位で削除する

これにより「旧記事だけ色が戻る」「新記事だけ余白が広がる」といったカスケード事故を避ける。

## 国際記事との関係

英語・韓国語・繁体字の記事も `article-shared.css` を日本語版の visual contract として利用するが、言語・既存マークアップ差分は `articles/intl-article.css` が担当する。

日本語互換CSS (`article-legacy.css` / `article-modern.css`) の hero 正規化は `body[data-article-category] .main-content-column > .hero` に限定し、国際記事やゲームページへ波及させない。
