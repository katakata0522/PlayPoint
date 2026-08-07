# PlayPoint テスト仕分けメモ

最終更新: 2026-08-07  
対象: `katakata0522/PlayPoint`（本番正本。`cli-auto/PlayPoint` ではない）

## いまの規模

| 時点 | 本数 | メモ |
|------|------|------|
| 整理前 | 44 | メタ検査・日付バッチ・方針固定が混在 |
| 第1弾 | 34 | 明らかに不要な10本を削除 |
| **第2弾（現在）** | **33** | regression ダイエット / nine+audit 統合 / intl 共通化 / 重要ガード復元 |

---

## 第1弾で消したものの再点検（重要要素は残っているか）

| 削除ファイル | 再点検結果 |
|--------------|------------|
| pipeline-best-practices | **SWネットワーク優先・改行差のないキャッシュ世代**は `runtime-module-guards` に復元。CI自己検査は不要のまま削除 |
| growth-priority | **外部Google Fonts禁止**は `runtime-module-guards` に復元。docs文言固定は不要のまま |
| growth-migration | 旧パス実体は `deploy-cleanup`。**主要計測イベント名**は `runtime-module-guards` に復元 |
| http-check-utils | 汎用 util。本番ロジックではない → 削除維持で問題なし |
| main-responsibility-split | **分離モジュールが minify/asset-sync/sw に含まれる**は `runtime-module-guards` に復元 |
| jp-guide-batch-20260805 | ランク段階・倍率の足し合わせ禁止・参加条件は **`article-fact-regression` に要点だけ復元** |
| intl-regional-guides-20260805 | hreflang・地域数値は `all-article-quality` / `intl-regional-accuracy` / `manual-intl-articles` が担当 |
| article-quality-audit-wave1 | 全体監査 `all-article-quality-audit` と重複 → 削除維持 |
| human-first-article-architecture | 構造・台帳は content / fact / all-article 側。特定記事全文スナップショットは過剰 |
| mobile-performance-phase1 | Lighthouse WFのメタ検査。製品挙動は performance-hardening / audit 系 |

---

## 第2弾でやったこと

### 1. `playpoint-regression` ダイエット

- **162ケース / 約3180行 → 29ケース / 約716行**
- 残す: `loadCalculatorContext` / `CALC_PURE` 系（計算・パック丸め・共有URL・地域 spendUnit 等）
- 外した: blog/SEO/記事HTML/デプロイ文字列など、**他ファイルに既にある静的検査**

### 2. nine-fixes + audit-fixes 統合

- `playpoint-nine-fixes.test.cjs` + `playpoint-audit-fixes.test.cjs`
  → **`playpoint-product-guards.test.cjs` 1本**（Consent / SW / デプロイ / トップ文言 / AdSense 等）

### 3. intl 共通化

- 共通ヘルパ: `tests/helpers/intl-check.cjs`
- 類似クラスタ統合: `intl-use-eligibility` + `intl-weekly-accounts`
  → **`intl-topic-pages.test.cjs`**
- 固有条件が強いものは分離維持:
  - `intl-coupon-credit` / `intl-rank-maintenance` / `intl-platinum-diamond`
  - `intl-maintenance-calculators` / `intl-content-expansion` / `intl-rewards-quests`
  - `intl-regional-accuracy` / `intl-manual-content-sync`

### 復元ガード

- `runtime-module-guards.test.cjs`（削除しすぎ防止）

---

## 残しているコア

- 計算: `playpoint-regression`, `main-calculator-ui`, `static-calculator-delivery`, `play-points-rounding-guide`
- 事実: `common-pages-fact-ux`, `article-fact-regression`, `attention-country-classification`
- SEO/整合: `seo-hygiene`, `all-article-quality-audit`, `repository-integrity-audit`
- デプロイ: `deploy-cleanup`, `ogp-mime-deployment`, product-guards 内デプロイ検査
- 多言語: `intl-*` + `intl-topic-pages` + `manual-intl-articles` + `top-page-language-integrity`

---

## 触る場所

| 用途 | 場所 |
|------|------|
| 本番 | `C:\Users\tomok\PlayPoint` / `katakata0522/PlayPoint` |
| 公開 | https://playpoint-sim.com/ |
| 使わない | `cli-auto/PlayPoint`（レガシー） |
