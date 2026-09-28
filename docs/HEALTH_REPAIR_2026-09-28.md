# 2026-09-28 本番監視の異常と最小修正

## 実測と修正の範囲

起点は main `3c8897425db9ca808dc134ffcad8c8303b9bf707`、本番performance run `36357768836`、SEO health run `36356399705`。

- SEO確認期限の超過で、独立したsitemap/security/internal-link検査までスキップされていた。前提となるcheckout/Node/証跡初期化の成功と非キャンセルを条件に独立検査を実行する。失敗自体、鮮度の期限、予算閾値は緩和しない。
- 記事一覧の人気記事小画像は、62px幅の枠に1200x630の原本を配信していた。原本107,577 bytesを変更せず、186x98 WebPの派生3,184 bytesを用意した。原本のSHA-256から派生を選び、原本変更・派生欠損では元の画像に戻す。本文、OGP、CSS、順位、広告設定は非変更。画像転送量の削減は測定値であり、LCP/INP/CLSの改善率とは扱わない。
- 通常週次、Play Pass週次、クエスト、獲得率プロモーションを公式説明と照合し、確認記録と期限、構造化データ、サイトマップを同期。スーパー週次は一般制度説明のみを確認し、日本向けの最新賞品は未確認と明記した。9/18の国内賞品記録と期限前のランク・問題解決手順の確認日は維持した。

## 公式情報の確認先と限界

2026-09-28に取得できたGoogle公式ページの検索取得本文を使用。直接取得は一部429のため、最新の実機画面・国内賞品残数・アカウント対象可否を確認できたとは扱わない。

- https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja — 日本の通常週次、プロモーション
- https://support.google.com/googleplay/answer/16507543?hl=ja — 日本を含むPlay Pass週次
- https://support.google.com/googleplay/answer/11534416?hl=ja — クエスト
- https://play.google.com/store/apps/editorial?hl=ja&id=mc_games_editorialmd_loyalty_swp_cujs_bronzeandsilver_fcp — スーパー週次の一般ルール。表示賞品の地域が一致しないため日本向け賞品は転記しない。

## 検証境界

ローカルの隔離コピーで全1,079回帰と圧縮後17ケースが成功。生成物同期の一回限定処理でもcomplete preflight成功。通常の必須PR GateとChromium、本番デプロイは最終headのActionsを正本とし、この文書で実行前の成功を宣言しない。

一時同期workflowは最終ツリーから削除済み。新しい常設workflow、権限、予算閾値、製品依存パッケージは追加しない。同期途中のコミットをマージしない。

## 残る確認

- 本番計算機の大きなCLSとGoogle広告/CMP/GA4を含むTBTは小画像とは別。PR環境の性能成功で本番性能全体の解消を断定しない。広告削除、同意無効化、空白の水増しで緑にしない。
- Apps Scriptの日次再照合とDrive保存は別系統。保存済みv11.6.0のDrive例外が日次成功記録を妨げることを再現したが、live Code.gsの同一性とDrive権限の回復は未確認。シート値や健康状態を手で成功へ変更しない。
