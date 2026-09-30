# Search Console 監視運用ガイド

最終更新: 2026-09-30

## 目的

- 重要クエリの順位・CTR低下を早期検知する
- インデックス異常を早期復旧する
- Core Web Vitals の悪化を継続監視する
- 生成 AI 機能とマルチモーダル検索での可視性を通常検索と混同せず継続監視する

## 監視対象プロパティ

- `https://playpoint-sim.com/`

## 週次チェック（毎週1回）

1. **検索パフォーマンス（過去28日）**
   - クリック数、表示回数、平均CTR、平均掲載順位を確認
   - 上位クエリのCTRが前週比で **-15%超** なら原因調査
2. **ページ別パフォーマンス**
   - `/` `/blog/` `/games/` `/about-playpoints.html` `/info.html` の推移確認
   - 特定ページだけ落ちる場合はタイトル/説明/競合変化を確認
   - 記事ごとに「記事から計算完了」へつながった割合をGA4と照合
3. **インデックス登録**
   - 「ページがインデックスに登録されなかった理由」を確認
   - 新規エラーが出たら対象URLをURL検査で再クロール依頼
4. **CWV（ウェブに関する主な指標）**
   - モバイルの「不良」URLが増えていないか確認
5. **手動による対策/セキュリティ**
   - 警告がないことを確認

## 日次の軽量チェック（5分）

1. パフォーマンスのクリック数が急落していないか
2. インデックスエラー件数に急増がないか

## 月次改善タスク

1. クエリ上位20件の検索意図を再判定
2. 表示回数があり掲載順位5〜20位のクエリを、既存記事への追記候補として優先
3. 順位が高くCTRが低いページの `title` と `description` を改善
4. 記事流入はあるが計算完了につながらないページの内部リンクとCTAを改善
5. 主要ページの内容更新（FAQ追記、注意点更新）
6. sitemap `lastmod` の妥当性を点検

## 生成 AI パフォーマンス（月次）

2026-08-31時点で、Search Consoleの生成 AI パフォーマンス分析は全サイトへ世界展開済み。SearchのAI Overviews・AI ModeなどでサイトURLが表示された回数を、通常検索のCTR改善とは別の可視性指標として扱う。

1. 「パフォーマンス」→「生成 AI」を開き、期間を過去28日と前の28日で比較する。
2. **表示回数**の全体推移を確認し、「ページ」で上位URLと増減の大きいURLを確認する。
3. 「国」「デバイス」「日付」で日本・米国・韓国・台湾、モバイル比率、急増・急減日を確認する。
4. 上位ページは、質問への短い結論、独自の計算・実測、更新日、一次情報、未確認事項の境界が見つけやすいか再点検する。
5. 生成 AI レポートで表示が0または空の場合は、通常検索のデータで代用して「生成 AI 流入あり」と扱わない。生成 AI 側で観測できた値だけを保存する。
6. 生成 AI の表示回数と通常検索のクリック・CTR・掲載順位は別指標として保存し、直接同じ分母で率計算しない。

生成 AI レポートは通常検索のクエリ改善表とは分離して記録する。ページ・国・日付・デバイスの単位で「どこで引用・参照されやすいか」を追い、内容変更は実際の需要と一次情報の更新に基づいて行う。

### マルチモーダル検索（毎月・画像更新時）

2026-09-24から、Search Consoleの通常の検索結果レポートと生成 AI レポートの両方で **multimodal search** フィルタが提供されている。対象にはGoogle Lens、AndroidのCircle to Search、Google検索への画像アップロード、Chromeの「この画像を検索」が含まれる。

1. 通常の「検索結果」レポートで multimodal search フィルタを適用し、過去28日と前の28日を比較する。
2. 「生成 AI」レポートでも同じ multimodal search フィルタを適用し、表示回数・ページ・国・デバイスの差を確認する。
3. データがある場合は「エクスポート」で保存し、通常テキスト検索と混ぜずに月次証拠として残す。
4. 上位ページでは、画像の内容と周辺本文が一致しているか、意味のあるalt、画像の直前・直後の説明、OGP/記事画像の品質を確認する。
5. 値が出ていない場合はサイト不具合や0クリックと断定せず、「multimodal検索で観測データなし」と記録する。

### API自動取得の境界

2026-09-30時点の公開Search Console APIは、通常のSearch Analyticsについて `web` / `image` / `video` / `discover` 等のtypeと `searchAppearance` を公開している。一方、専用の生成 AI パフォーマンスレポートや新しい multimodal search フィルタを直接指定する公開APIパラメータは公式APIリファレンスに明記されていない。

そのため、次の境界を守る。

- 既存のSearch Console API自動取得は通常検索のRaw / Normalized / Property Total用として継続する。
- 生成 AI / multimodal専用値は、公式にAPI値が公開されるまで未文書化のパラメータを推測実装しない。
- 生成 AI / multimodalはSearch Console画面の値または公式Exportを正本にする。
- 将来API仕様が公開された場合は、通常検索とは別レイヤーとして追加し、既存のProperty Totalへ混入させない。

公式参照:
- https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports
- https://developers.google.com/search/blog/2026/09/web-multimodal-in-sc
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/webmaster-tools/v1/searchanalytics/query

## クエリ × ページ改善表

通常の「検索結果」レポートで、期間を過去28日と前の期間の比較にし、次の順で1行ずつ記録する。

| クエリ | ページ | 表示回数 | クリック | CTR | 掲載順位 | 前期差 | 次の対応 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 例: play points 1万円 | `/amount/10000/` | Search Console値 | Search Console値 | Search Console値 | Search Console値 | 前28日との差 | タイトル維持／追記／内部リンク改善 |

1. 「クエリ」で表示回数上位20件を確認する。
2. 対象クエリの行を選択してフィルタし、「ページ」に切り替える。
3. 同じ意図で複数URLが表示される場合は、内容の重複と内部リンクの主従を確認する。
4. 掲載順位5〜20位で表示回数がある組み合わせを追記候補の最優先にする。
5. 順位1〜5位でCTRが低い組み合わせは、検索意図とtitle・descriptionのずれを先に確認する。
6. 匿名化されたクエリやデータ上限により、表の合計がサイト全体の合計と一致しない場合がある。

## 成長施策の観察クエリ

LPや記事導線を追加したら、最低28日後にSearch ConsoleとGA4を照合する。Search Consoleでは表示回数、CTR、掲載順位、対象ページを見て、GA4では該当LPからの `lp_to_calculator_clicked` と `calculation_completed` / `reverse_calculation_completed` を確認する。

| 観察クエリ | 主対象URL | 補助導線 | 確認日 |
| --- | --- | --- | --- |
| 2倍キャンペーン | `/campaign/2x/` | `articles/2025-12-25-campaign.html`, `articles/2025-12-25-new-year-campaign.html` | 2026-07-25 |
| play points 1万円 | `/amount/10000/` | `articles/2026-06-20-discount-gift-cards.html` | 2026-07-25 |
| ダイヤモンド 必要額 | `/status/diamond/` | `articles/2025-12-25-diamond-worth-it.html` | 2026-07-25 |
| プラチナ 維持 | `/maintenance/platinum/` | `articles/2025-12-25-playpoints-rank-maintenance.html` | 2026-07-25 |
| ダイヤモンド 維持 | `/maintenance/diamond/` | `articles/2025-12-25-diamond-worth-it.html`, `articles/2025-12-25-diamond-vip.html` | 2026-07-25 |
| Play Points いつ反映 | `articles/2026-03-10-play-points-reflection-timing.html` | 統合済み旧URLから301転送 | 2026-08-04 |
| Play Points 反映されない | `articles/2026-03-10-play-points-reflection-timing.html` | 統合済み旧URLから301転送 | 2026-08-04 |
| Play Points 有効期限 | `articles/2025-12-25-expiration.html` | `articles/2025-12-25-check-balance.html` | 2026-08-04 |
| Play Points ギフトカード ポイント | `articles/2026-06-20-discount-gift-cards.html` | `articles/2025-12-25-gift-card.html`, `/amount/10000/` | 2026-08-04 |
| Google Play Points Diamond cost | `/en/status/diamond/` | `/en/articles/google-play-points-platinum-diamond-cost.html` | 2026-08-04 |
| Google Play Points 2x promotion | `/en/campaign/2x/` | `/en/articles/google-play-points-levels.html` | 2026-08-04 |
| Google Play Points not showing up | `/en/articles/google-play-points-not-showing.html` | 英語旧記事から301転送 | 2026-08-04 |
| Google Play Points gift cards | `/en/articles/google-play-points-gift-cards.html` | `/en/amount/10000/` | 2026-08-04 |

## 国別チェック

Search Consoleでは月次で国フィルタを切り替え、表示回数が増えた国から優先して本文を厚くする。最初の確認対象は `Japan`, `United States`, `South Korea`, `Taiwan` とする。

| 国/地域 | 主に見るURL | 判断 |
| --- | --- | --- |
| Japan | `/`, `/blog/`, `/status/diamond/`, `/campaign/2x/` | 既存日本語記事の追記候補を探す |
| United States | `/en/`, `/en/status/diamond/`, `/en/articles/` | 英語記事の表示回数とCTRを見る |
| South Korea | `/ko/`, `/ko/status/diamond/`, `/ko/campaign/2x/` | 韓国語LPの需要があるか見る |
| Taiwan | `/tw/`, `/tw/status/diamond/`, `/tw/amount/10000/` | 繁体字LPの需要があるか見る |

判断基準:

- 表示回数があるのにCTRが低い場合は、title / description / ファーストビュー文言を優先して改善する。
- 記事からLPクリックはあるが計算完了が少ない場合は、LPの初期条件やCTA文言を見直す。
- LP表示は少ないが記事流入がある場合は、記事内リンクの位置やアンカーテキストを見直す。

## 異常時の対応フロー

1. 影響範囲の確認（全体か特定ページか）
2. URL検査で「クロール済み/インデックス登録済み」を確認
3. `robots.txt` / `canonical` / `noindex` / `301` を点検
4. 修正後に再クロールをリクエスト
5. 72時間は日次追跡

## KPIの目安（運用用）

- 主要クエリCTR: **5%以上** を維持目標
- 主要ページのインデックス率: **100%**
- CWVモバイル: 不良URL **0件** を目標

## 補足

- Search Console の権限操作はアカウント保有者のみ実施可能
- 本リポジトリでは運用手順を管理し、実操作は管理画面で行う


## 非重複28日比較の保存契約（2026-09-19追加）

`PlayPoint Analytics` の最新ビューだけでは、ローリング更新後に「その直前28日」の query × URL raw を再現できない。
Issue #181 の比較証拠は、次の専用レイヤーへ保存する。

- `🗃GSC 28日履歴`: current_28d / previous_28d を同じ `pair_id` で保存する比較証拠SSOT
- `🔍GSC 28日比較`: Raw（query × exact URL）の前後比較
- `🧹GSC 28日正規化`: Normalized（query × base URL）の前後比較
- Property Total: dimensionなし / `byProperty` をAPIから直接取得し、query行合計で代用しない
- 実装・導入手順: `docs/GSC_28D_CAPTURE_RUNBOOK.md`
- Apps Scriptモジュール: `scripts/gsc-nonoverlap-28d.gs`

比較は Search Console の FINAL データだけを使用し、各窓は28日、互いに非重複でなければならない。
履歴には `site_property / search_type / dimensions / request_aggregation_type / response_aggregation_type / api_timezone` も保存する。
Search Console APIの日付は `America/Los_Angeles` 基準として扱う。

current / previous の片方、Raw / Normalized / Property Total のいずれか、
または取得条件メタデータが欠ける場合は `BLOCKED` とし、SEO変更の根拠に使わない。

通常の `🔎検索語×ページ` と `🎯SEO改善候補` は最新状況を見る運用ビューとして残す。
最新ビューの更新と、比較証拠の履歴保存は別責務として扱う。


## P1/P2 分析レイヤー（2026-09-19追加）

P0のRaw / Normalized / Property Totalに加えて、SEO判断の切り分け用に次を取得する。

- `🔎検索クロス分析`
  - GA4 Organic Search: `sessionSourceMedium`
  - GSC: Query × Country / Query × Device
  - GSCは非重複28日FINAL・`byProperty`
- `🧭URL検査`
  - 固定重要URL + GSC表示回数上位URL
  - 1回最大30URL
  - index / canonical / fetch / robotsを確認

Country / Deviceのクロス行は検索改善候補の診断用であり、サイト総量のProperty Totalとして扱わない。
URL Inspectionも全URL常時監視には使わず、需要不足と技術的なindex問題の切り分けに限定する。

ページ価値・収益・構造化ログを含む実装契約は `docs/PLAYPOINT_ANALYTICS_P1P2_RUNBOOK.md` を正本とする。
