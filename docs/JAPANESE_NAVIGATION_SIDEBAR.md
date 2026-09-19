# 日本語記事のNavigation / Sidebar

## 現行構成

公開中の日本語記事では、本文・title・H1・meta・主CTA・Article Roleを維持しながら、右サイドバーを次の順序で静的生成する。

1. 記事検索
2. 今月よく読まれている記事（直近30日の日本語記事Top 5、週1回更新、PV数は非表示）
3. Article Roleに応じた「次にやること」1件
4. 本文の編集済み関連記事を優先した「あわせて読みたい」3件
5. 運営者情報

生成元は `scripts/japanese-navigation-sidebar.cjs`、人気記事SSOTは `scripts/japanese-popular-guides.cjs`、入口は `scripts/build-html.js`。追加のレンダリング阻害CSSを増やさないため、検索・人気記事・運営者情報のスタイルは既存の `articles/japanese-shell.css` に統合する。

## 人気記事の更新方針

- 根拠は PlayPoint Analytics の `📄ページ別分析` にある日本語記事の直近30日PV順位。
- UIにはPV数を表示しない。
- 週1回だけスナップショットを更新し、短期ノイズで毎日順位を動かさない。
- 現在読んでいる記事がTop 5内の場合は自己リンクにせず「閲覧中」と表示する。
- 海外版の順位は日本語ランキングへ流用しない。
- データが欠損・暫定・期間不一致なら前回の確定スナップショットを維持する。

## 計測

日本語の `article_navigation_click` は既存の同意・有限分類・内部パス制限を共有する。
人気記事は `component=popular`、関連記事は `component=related`、次行動は `component=next_step` として区別する。
検索語そのものやPV数、金額、個人識別子、外部URLはこのナビ計測へ送信しない。
