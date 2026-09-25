# 日本語記事のNavigation / Sidebar

## 現行構成

公開日本語記事の本文・SEO・主CTA・Article Roleを維持し、右サイドバーを次の順序で静的生成する。

1. 記事検索
2. 「カテゴリーから探す」7分類（公開記事台帳の `browseCategory` から件数を自動集計）
3. 今月よく読まれている記事（直近30日の日本語公開記事 Top 5、PV非表示。1位だけ画像付き）
4. Article Roleに応じた「次にやること」1件
5. 本文の編集済み関連記事を優先した「あわせて読みたい」3件
6. 運営者情報

表示用7分類は「はじめて・基本 / ランク・ステータス / 貯める・キャンペーン / 使う・交換 / トラブル・アカウント / ゲーム別課金 / 最新情報・イベント」。既存の `category`（ランク / トラブル / 使い方 / キャンペーン）は旧URLと記事カード互換のため残し、読者向け絞り込みは `?topic=` を使う。

生成元は `scripts/japanese-navigation-sidebar.cjs`、順位データは `scripts/japanese-popular-guides.snapshot.json`、参照APIは `scripts/japanese-popular-guides.cjs`、生成入口は `scripts/build-html.js`。スタイルは既存の `articles/japanese-shell.css` を使う。現在の記事がTop 5なら自己リンクを作らず「閲覧中」とする。

## 週次更新

定期実行は登録承認待ち。予定はCodexの本タスクに紐づく「PlayPoint記事ランキング週次更新」、毎週土曜09:00（Asia/Tokyo）、初回2026-09-26。承認後に登録結果を確認して本節を更新する。ローカルのCodex実行環境とGoogle Drive接続が必要。GitHub Actionsだけで集計しているわけではない。停止・認証切れ・不完全なデータでは前回順位を保持し、必要な対応を通知する。

順位変更時だけ通常のPR・必須PR Gate・マージ・既存Xserverデプロイを行う。順位が同じなら日付だけのコミットやデプロイを作らない。表示上の「今月」は暦月ではなく直近30日。UIには「直近30日の閲覧傾向・順位更新 YYYY-MM-DD」と、実際に順位を更新した日を表示する。未稼働の定期更新を公開文言で約束しない。

### 集計元と入力

接続済みGoogle Driveの **PlayPoint Analytics** を読み取り専用で使う。ファイルID: `1s1ag_hgFobpglhC2EkrvkNngdeDLCFcLbf8fV3Oc0U0`。

- metadataでタブを確認し、`📄ページ別分析` のA:G（順位・パス・タイトル・PV・ユーザー・時間・対象期間）を取得する。最初はA1:G100、必要なら次の範囲へ進み全行を確認する。
- `🩺データ鮮度・システム状態` の「週次詳細」の最終成功・対象日・状態を照合する。正常完了を確認できない `PARTIAL`、`PROVISIONAL`、欠損、期限超過は更新しない。状態だけを都合よくCOMPLETEへ読み替えない。
- 各行の対象期間が同じ30日であることを確認する。終了日は当日より前、7日以内。取得日は実際の読取り日。欠損PVを0として補完しない。日次・リアルタイム・Search Consoleクリック順位を代用しない。
- 非公開の作業ディレクトリに次のJSONを用意する。PVと取得元の生データはリポジトリ・PR本文・公開物に保存しない。

```json
{
  "source": "PlayPoint Analytics / 📄ページ別分析",
  "status": "COMPLETE",
  "complete": true,
  "start": "YYYY-MM-DD",
  "end": "YYYY-MM-DD",
  "fetchedAt": "YYYY-MM-DD",
  "rows": [{ "path": "/articles/example.html", "pv": 123 }]
}
```

上は形式例。実行には実測の全行が必要。COMPLETEとcompleteは、正常状態・同一期間・全件取得を実際に確認した場合だけ指定する。

### 検証と反映

1. `node scripts/ai-sync-preflight.cjs` で正本と未共有作業を確認する。未コミット変更を巻き込まない。
2. `node scripts/update-japanese-popular-guides.cjs <非公開JSON>` でdry-run。正常な日本語公開記事5件だけをPV順に選び、同数はURL順で安定させる。
3. `UNCHANGED` は変更せず終了。`CHANGE_AVAILABLE` なら作業ブランチで同じ入力に `--write` を付ける。不正入力は保存済み順位を変更せず失敗する。
4. `node scripts/prepare-pr.cjs` で生成。関連回帰、PR Gate、本番デプロイと公開サイドバーを確認する。公開するのは順位・記事名・対象期間・順位更新日のみ。
5. トップページのランク別4枚と海外版ランキングは変更しない。

2026-09-21の接続確認ではページ別分析を取得できたが、「週次詳細」がPARTIALだったため9/19の順位を保持した。これを集計障害の修復済みという意味にしない。

## 計測

既存の `article_navigation_click` の同意・有限分類・内部パス制限を共有する。人気記事 `component=popular`、関連記事 `component=related`、次行動 `component=next_step`。検索語、生PV、金額、個人識別子、外部URLはナビ計測へ送信しない。
