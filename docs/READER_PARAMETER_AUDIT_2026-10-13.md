# 読者パラメータ部分取得の監査（2026-10-13）

対象: PlayPoint Analyticsの2026-10-13 09:57 JST取得分。読者集計は2026-09-11〜2026-10-10。日次イベント表は09:57:22取得の2026-09-08〜10-12から同じ30日だけを抽出した。イベント回数は合算できるが、日別・分類別の利用者数を合算しない。

## 確認結果

| 対象 | 観測総回数 | パラメータ取得 | 未設定 | 分かること |
| --- | ---: | ---: | ---: | --- |
| article_navigation_click | 36 | component / destination_type とも6 | とも30 | 発生元pagePathは36回すべて取得。ページ別クリック数は残る |
| search | 19 | intent_id / results_count とも4 | とも15 | 4回はother。結果件数は0・1・2・37が各1回 |
| article_to_calculator_clicked | 18 | 標準pagePathで18回取得 | 分類はこの取得では未照会 | 記事別クリック回数を日次表から同期間へ復元 |
| calculator_form_started | 301 | entry_source_path付き21 | 残りは未帰属 | 記事以外のLPも含む。未帰属には直接利用等があり、全件を送信故障としない |
| calculator_funnel_completed | 249 | entry_source_path付き18 | 残りは未帰属 | 記事以外のLPも含む。開始との単純比を記事別経路転換率としない |

検索結果0件は既知の結果件数を持つ4回中1回。19回全体の0件率は不明。人数や全訪問者の解決率には変換しない。componentとdestination_typeの欠落は同じ30回に重なり、欠落を60回と数えない。

## 送信・設定・API・表示の切り分け

| 項目 | 現行送信 | 現行取得 | 判断 |
| --- | --- | --- | --- |
| source_path | ナビ・記事CTAで送信 | カスタム値ではなく標準pagePath | 発生元記事は判定可能。カスタム定義を重複作成しない |
| target_path | 内部ナビのみ送信、外部は送信しない | 読者表では照会しない | 遷移先の個別記事はこの表から判定不能。外部で欠けるのは意図した仕様 |
| component / destination_type | ナビ必須、許可分類以外はイベント自体を抑止 | 登録済みAPI名で照会でき、6回は値あり | 現行コードの通常経路は裸のナビイベントを送らない。過去30回の原因は登録時期・旧送信経路・実受信を照合して確定する |
| locale / article_role / article_category | ナビで送信 | locale/roleは台帳とpagePathから導出、categoryは未照会 | シートのroleはGA4からの受信確認ではない |
| link_position | 対象リンクで1〜10を送信 | 未照会 | 順位別成果は現行表から不明 |
| intent_id | 日本語検索で固定ID、海外一覧検索では送っていない | 4回other、15回未設定 | 海外の省略はコード上で確認。ただし今回19回はすべて/blogで、今回の15回の原因にはできない |
| results_count | 日本語・海外一覧検索で非負整数を送信 | 4回取得、15回未設定 | 未設定と0件を区別する |
| entry_source_path | 同意済みの内部CTA起点がある時だけ、30分以内 | 登録済み、21開始・18成功を同期間に観測 | 全計算イベントに必須ではない。未帰属を記事の成果ゼロにしない |

本番の `js/analytics-core.js`、`blog/script.js`、`js/intl-guide-hub.js` を取得し、監査開始時main d86e3b5ab8957444bd686ca3694b19433cc5bda0とバイト一致を確認した。現在の送信コードの未反映は確認されなかった。既存集計はAPI成功後の(not set)をPARAMETER_PARTIALとしており、イベント全体の未取得ではない。APIページング・品質制限・数値欠落は既存の検証がある。

GA4の現行カスタム定義のparameterName/scopeの原本、登録変更履歴、bound Apps Script本体は今回の接続から直接取得できていない。取得済みの値とコードから登録前期間が有力な候補だが、断定しない。Data APIは未登録のcustomEventを照会すると失敗するので、この成功済み部分取得を単に「未登録」と診断して同じ定義を増やさない。GA4は送信と定義作成後24〜48時間の反映待ちを案内する。過去未登録値の復元は保証しない。

## 修正

- 欠落をパラメータ別に集計する。数値0を有効値として扱う。
- 取得済みの明細行をOKとして表示する。集計全体のPARTIALは保持する。
- 検索結果件数だけ取れた行は、意図の欠落と分けて活用する。未取得を「検索結果0件」にしない。
- ARTICLE_ACTIONSは標準pagePath × eventNameを独立取得し、ナビ分類が欠けても記事別回数・重複除去済み人数を保持する。NAVIGATIONとの合算は禁止。
- `capturePlayPointReaderParameterAudit()` を手動診断として追加する。標準pagePathのイベント日次と、4項目を1項目ずつ日次照会し、初取得観測日・最終欠落観測日を表示する。初取得日を登録日と呼ばない。定義の欠けた1項目で他の項目を止めない。
- 新規イベント、カスタム定義、利用者ID、Cookie、検索語の送信、OAuth権限、タイマーは追加しない。海外intent_idの新分類は、分類の実用性を検証するまで追加しない。

## 同期間で観測できた記事別成果

下表の開始・成功はentry_source_pathの帰属付きイベント回数であり、クリックした同じ人の経路を照合した転換率ではない。0はこの期間に帰属観測がない意味。クリックにも同じイベント以外の未計測リンクがある。NAVとCTAは同じクリックで両イベントが出る場合があるので合算しない。

| 記事パス | NAV回数 | 分類既知 | 分類不明 | 計算機CTA回数 | 帰属開始回数 | 帰属成功回数 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| /en/articles/google-play-quests.html | 5 | 0 | 5 | 1 | 0 | 0 |
| /articles/2026-07-31-google-play-quests.html | 3 | 0 | 3 | 3 | 1 | 1 |
| /tw/articles/google-play-points-use-coupons.html | 3 | 2 | 1 | 1 | 0 | 0 |
| /articles/2026-06-20-discount-gift-cards.html | 3 | 0 | 3 | 0 | 0 | 0 |
| /articles/2026-07-31-super-weekly-reward.html | 3 | 0 | 3 | 0 | 0 | 0 |
| /ko/articles/google-play-points-level-maintenance-reset.html | 2 | 2 | 0 | 1 | 1 | 0 |
| /tw/articles/google-play-points-platinum-diamond-cost.html | 2 | 1 | 1 | 1 | 2 | 2 |
| /en/articles/google-play-points-country-differences.html | 1 | 0 | 1 | 2 | 0 | 0 |
| /articles/2025-12-25-playpoints-rank-maintenance.html | 1 | 0 | 1 | 1 | 1 | 0 |
| /en/articles/google-play-points-use-coupons.html | 1 | 0 | 1 | 1 | 0 | 0 |
| /ko/articles/google-play-points-multiple-accounts.html | 1 | 0 | 1 | 1 | 0 | 0 |
| /ko/articles/google-play-points-play-credit-not-working.html | 1 | 0 | 1 | 1 | 0 | 0 |
| /tw/articles/google-play-points-levels.html | 1 | 0 | 1 | 1 | 1 | 1 |
| /tw/articles/google-play-points-weekly-reward.html | 1 | 0 | 1 | 1 | 1 | 1 |
| /articles/2025-12-25-weekly-reward.html | 1 | 0 | 1 | 0 | 0 | 0 |
| /articles/2026-07-24-play-points-cash-conversion.html | 1 | 0 | 1 | 0 | 0 | 0 |
| /ko/articles/google-play-points-cash-conversion.html | 1 | 0 | 1 | 0 | 0 | 0 |
| /ko/articles/google-play-points-platinum-diamond-cost.html | 1 | 0 | 1 | 0 | 0 | 0 |
| /tw/articles/google-play-points-balance-history-progress.html | 1 | 1 | 0 | 0 | 0 | 0 |
| /tw/articles/google-play-points-cash-conversion.html | 1 | 0 | 1 | 0 | 0 | 0 |
| /tw/articles/google-play-points-expiration.html | 1 | 0 | 1 | 0 | 0 | 0 |
| /tw/articles/google-play-quests.html | 1 | 0 | 1 | 0 | 0 | 0 |
| /en/articles/google-play-points-levels.html | 0 | 0 | 0 | 1 | 2 | 1 |
| /en/articles/pokemon-tcg-pocket-premium-pass.html | 0 | 0 | 0 | 1 | 0 | 0 |
| /tw/articles/zenless-inter-knot-membership.html | 0 | 0 | 0 | 1 | 0 | 0 |
| /ko/articles/google-play-points-levels.html | 0 | 0 | 0 | 0 | 1 | 1 |

## 記事改善判断

記事別に使えるのは、計測対象導線のクリック、帰属付き計算開始・初回成功、各ページのPV、同じ期間のページ広告収益。ページ価値ファネルの現在窓（9/7〜10/6）は読者表と異なるので今回のクリック表へ混ぜない。全流入ページ収益を特定記事経由の計算が生んだ収益とはしない。

疑問解決率・初回記事への7日/28日再訪貢献・記事別の厳密なクリック→開始→成功率・内部遷移先別の成果は未測定。reader_question_clickedは質問入口の利用であり、解決の回答ではない。サイト全体の順序付き開始→24時間以内成功は242人→205人で、記事別帰属や同じ計算内容は保証されない。ページのreturning閲覧と、サイト全体の初回獲得日コホートを記事の再訪貢献へ置き換えない。

「分類が不明」「帰属観測なし」を低価値記事の根拠にしない。特にretention/troubleshooting/referenceの削除・統合判断は、役割と検索意図・検索需要・実内容を併せて行う。現行Portfolioの編集判断はこの監査で上書きしない。

## 反映と残件

GitHubの修正とbound Apps Scriptの反映は別工程。メンテナンスモジュールをバックアップ後に置換し、`capturePlayPointReaderParameterAudit()` → `capturePlayPointReaderOutcomes()` を実行、シートの期間・パラメータ別欠落・ARTICLE_ACTIONSと健康状態を読み直す。定義の追加・再作成はしない。

1. GA4カスタム定義がcomponent/destination_type/intent_id/results_countのEVENT scopeへ正しく紐付くことを原本で確認する。
2. GA4の登録変更履歴と日別診断で、欠落が登録前・反映待ちに限られるかを比較する。
3. 最新の確定済み期間でも欠ける場合、同意済みの実ブラウザ送信とDebugViewを1操作ずつ照合する。未同意/拒否のイベント非送信も確認する。
4. 結果と反映日時を追記する。GitHubテスト成功やシート更新だけをGA4実受信確認としない。

## 一次資料

- Google Sheets: https://docs.google.com/spreadsheets/d/1s1ag_hgFobpglhC2EkrvkNngdeDLCFcLbf8fV3Oc0U0/edit
- 計測契約: docs/ANALYTICS.md、docs/READER_OUTCOMES.md
- Google Data API仕様: https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
- Googleの反映待ち説明: https://support.google.com/analytics/answer/14239696?hl=ja

