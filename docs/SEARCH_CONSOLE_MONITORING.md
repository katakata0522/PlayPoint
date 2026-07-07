# Search Console 監視運用ガイド

最終更新: 2026-07-07

## 目的

- 重要クエリの順位・CTR低下を早期検知する
- インデックス異常を早期復旧する
- Core Web Vitals の悪化を継続監視する

## 監視対象プロパティ

- `https://playpoint-sim.com/`

## 週次チェック（毎週1回）

1. **検索パフォーマンス（過去28日）**
   - クリック数、表示回数、平均CTR、平均掲載順位を確認
   - 上位クエリのCTRが前週比で **-15%超** なら原因調査
2. **ページ別パフォーマンス**
   - `/` `/blog/` `/articles/` `/about-playpoints.html` `/info.html` の推移確認
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

## 成長施策の観察クエリ

LPや記事導線を追加したら、最低28日後にSearch ConsoleとGA4を照合する。Search Consoleでは表示回数、CTR、掲載順位、対象ページを見て、GA4では該当LPからの `lp_to_calculator_clicked` と `calculation_completed` / `reverse_calculation_completed` を確認する。

| 観察クエリ | 主対象URL | 補助導線 | 確認日 |
| --- | --- | --- | --- |
| 2倍キャンペーン | `/campaign/2x/` | `articles/2025-12-25-campaign.html`, `articles/2025-12-25-new-year-campaign.html` | 2026-07-25 |
| play points 1万円 | `/amount/10000/` | `articles/2026-06-20-discount-gift-cards.html` | 2026-07-25 |
| ダイヤモンド 必要額 | `/status/diamond/` | `articles/2025-12-25-diamond-worth-it.html` | 2026-07-25 |
| プラチナ 維持 | `/maintenance/platinum/` | `articles/2025-12-25-playpoints-rank-maintenance.html` | 2026-07-25 |
| ダイヤモンド 維持 | `/maintenance/diamond/` | `articles/2025-12-25-diamond-worth-it.html`, `articles/2025-12-25-diamond-vip.html` | 2026-07-25 |
| Play Points いつ反映 | `articles/2026-03-10-play-points-reflection-timing.html` | `articles/2025-12-25-playpoints-not-reflected.html` | 2026-08-04 |
| Play Points 反映されない | `articles/2025-12-25-playpoints-not-reflected.html` | `articles/2026-03-10-play-points-reflection-timing.html` | 2026-08-04 |
| Play Points 有効期限 | `articles/2025-12-25-expiration.html` | `articles/2025-12-25-check-balance.html` | 2026-08-04 |
| Play Points ギフトカード ポイント | `articles/2026-06-20-discount-gift-cards.html` | `articles/2025-12-25-gift-card.html`, `/amount/10000/` | 2026-08-04 |

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
