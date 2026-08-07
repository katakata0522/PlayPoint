# PlayPoint テスト仕分けメモ

最終更新: 2026-08-07  
対象: `katakata0522/PlayPoint`（本番正本。`cli-auto/PlayPoint` ではない）

## 2026-08-07 整理内容（実施済み）

**44本 → 34本**（10本削除）。明らかにメタ／日付バッチ／移行完了後の固定／他と被るものを外した。

### 削除したものと理由

| 削除ファイル | 理由 |
|--------------|------|
| `pipeline-best-practices.test.cjs` | CI/preflight の**書き方そのもの**を検査。自己言及が強い |
| `growth-priority.test.cjs` | プロダクト方針・docs文言の固定。方針変更の足かせ |
| `growth-migration.test.cjs` | 移設完了済み。旧パス検査は `deploy-cleanup` が担当 |
| `http-check-utils.test.cjs` | 汎用ユーティリティ単体。壊れにくくコストに見合わない |
| `main-responsibility-split.test.cjs` | 一度きりの責務分割の残骸検査。import構成の固定が強い |
| `jp-guide-batch-20260805.test.cjs` | 日付付きバッチ。記事事実は `article-fact` / `content-structure` 側でカバー |
| `intl-regional-guides-20260805.test.cjs` | 同上。hreflang・地域数値は `all-article-quality` / 各 intl-* / `intl-regional-accuracy` |
| `article-quality-audit-wave1.test.cjs` | P1限定ウェーブ。全体監査 `all-article-quality-audit` と重複 |
| `human-first-article-architecture.test.cjs` | 特定記事のスナップショット過多。構造は content / fact 系へ |
| `mobile-performance-phase1.test.cjs` | Lighthouse ワークフロー実装のメタテスト。本番挙動ではない |

### 残したもの（意図）

- **計算コア:** `playpoint-regression`, `main-calculator-ui`, `static-calculator-delivery`, `play-points-rounding-guide`
- **事実・誤情報防止:** `common-pages-fact-ux`, `article-fact-regression`, `attention-country-classification`
- **SEO / 公開衛生:** `seo-hygiene`, `all-article-quality-audit`, `repository-integrity-audit`, `performance-hardening`
- **デプロイ安全:** `deploy-cleanup`, `ogp-mime-deployment`
- **多言語コンテンツ:** 各 `intl-*`, `manual-intl-articles`, `top-page-language-integrity`
- **ビルドスクリプト:** `article-seo-normalize`, `article-content-navigation-normalize`
- **個別回帰:** `playpoint-nine-fixes`, `playpoint-audit-fixes`（Consent/SW 等。将来さらに統合可）

---

## まだ厚いが今回触っていないもの

次の候補（必要なら別PR）:

1. `playpoint-regression` の中身ダイエット（CALC_PURE中心に）
2. `playpoint-nine-fixes` + `playpoint-audit-fixes` の統合
3. 多数の `intl-*.test.cjs` を共通ヘルパ＋1〜2本へ
4. preflight の「全テスト×2回（minify前後）」を計算系以外は1回に

---

## 触る場所の再確認

| 用途 | 場所 |
|------|------|
| 本番コード・テスト | `C:\Users\tomok\PlayPoint` / `katakata0522/PlayPoint` |
| 公開サイト | https://playpoint-sim.com/ |
| 使わない | `C:\Users\tomok\cli-auto\PlayPoint`（レガシー） |
