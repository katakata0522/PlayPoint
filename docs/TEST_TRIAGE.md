# PlayPoint テスト仕分けメモ

最終更新: 2026-08-25  
対象: `katakata0522/PlayPoint`（本番正本。`cli-auto/PlayPoint` ではない）

## いまの規模

| 時点 | 本数 | メモ |
|------|------|------|
| 整理前 | 44 | メタ検査・日付バッチ・方針固定が混在 |
| 第1弾 | 34 | 明らかに不要な10本を削除 |
| **第2弾（2026-08-07時点）** | **33** | regression ダイエット / nine+audit 統合 / intl 共通化 / 重要ガード復元 |
| **第3弾（2026-08-19）** | — | テスト本数ではなく、実装詳細依存を減らして behavior contract を強化 |
| **第4弾（2026-08-25）** | — | Browser/Lighthouseの役目済みownership・workflowメタガードを削減し、現行ownerをSSOT化 |

---

## テスト設計原則（2026-08-19 追加）

PlayPointでは、**テストを緩めるのではなく「本当に壊してはいけないものを厳格に守る」**ことを優先する。

### 1. ユーザー向け挙動は behavior / integration test を第一選択にする

本当に守りたい結果を、可能な限り実際にコードを動かして検証する。

例:
- Consent許可後にGA4が初期化され、初回 `page_view` が一度だけ送られる
- Consent未許可ならGA4を起動しない
- GA4初期化済みなら二重初期化しない
- 計算機が `NaN` / `Infinity` / min未満 / max超過 / HTML validity違反を計算へ通さない

`pendingEvents`、`sendInitialPageView`、`Number.isFinite(value)` のような**private変数名・関数名・具体的な実装方法そのものは契約ではない**。
同じ振る舞いを保つ安全なリファクタリングでテストが落ちるなら、まずテスト側が実装詳細へ依存しすぎていないか確認する。

### 2. static guard は「静的にしか守れない境界」に限定する

ソース文字列・正規表現による検査が適しているのは、主に以下。

- CSPに必要なoriginがある
- デプロイで秘密・運用ファイルを公開しない
- 記事・ブログが共通Analytics/Consent境界を迂回して直接送信しない
- canonical / hreflang / JSON-LD / 公開HTML構造など、成果物自体が契約
- 廃止した危険なUI・文言・パスを復活させない
- GitHub ActionsのtriggerやDeploy modeなど、実行されないとbehavior test自体が起動できないCI境界

private関数の名前、内部処理の並び、完全一致するコード断片は、**それ自体が外部契約・セキュリティ境界・デプロイ境界でない限りstatic guardにしない**。

### 3. 1つの保証には「主担当テスト」を決める

同じ仕様を複数テストで別々の実装文字列として固定しない。

重複が必要な場合は、**unit → integration → browser/production smoke の異なる層**で守る。同じ内部文字列を複数箇所で検査する重複は避ける。

### 4. brittle test を消す時は、先に同等以上の保証を確認する

「邪魔だから削除」は禁止。

1. そのテストが本来守ろうとしている仕様を言語化する
2. 既存のbehavior / integration / browser / production checkが同等以上を保証しているか確認する
3. ownerがなければ、先に適切なownerを追加する
4. 新旧の保証が成立することをCIで確認する
5. その後に実装詳細依存の旧テストを削除する

これにより、**テスト摩擦は減らすが安全網は薄くしない**。

### 5. 失敗は3種類に仕分けてから直す

テストが赤くなった時、すぐ製品コードを変更しない。

- **Product regression:** 実際の仕様・ユーザー挙動が壊れた → 製品コードを修正
- **Test brittleness:** 正しい挙動なのに実装方法の変更だけで落ちた → テストをbehavior contractへ修正
- **Generated artifact drift:** ソースと生成済みHTML/asset hash/sitemap等が未同期 → 正規の生成手順で同期

この3つを混同しない。特に「テストを通すためだけの本番コード変更」を避ける。

### 6. テスト件数を品質指標にしない

テストは多くてもよい。重要なのは、

- 本当に壊れた時に落ちる
- 正しいリファクタリングでは落ちない
- 失敗理由が、直すべき責務を指している

こと。

テスト本数を減らすこと自体を目的にしない。

---

## 現在のテスト所有権（SSOT）

この表を**現行ownerの正本**とする。`TEST_BEHAVIOR_MIGRATION_2026-08-19.md` は移行理由・履歴の記録であり、現行ownerの判断ではこの表を優先する。

| 保証する仕様 | 主担当 | 補助安全網 / 備考 |
|---|---|---|
| Consent状態遷移・GoogleFC・TCF・timeout・再同意 | `tests/consent-state.test.cjs` | 公開Consent UI / CSP / architecture guard |
| GA4初期化・初回page_view・二重初期化防止 | `tests/third-party-analytics-integration.test.cjs` | `tests/analytics-core.test.cjs` |
| third-party load順序・Analytics/広告Consent分離・AdSense retry | `tests/third-party-analytics-integration.test.cjs` | ブログ広告の共通境界guard |
| 計算機の数値入力受理・拒否 | `tests/calculator-input-validation.test.cjs` | Browser calculator smoke |
| 計算ファネル開始/完了/dedupe/Consent | `tests/calculator-funnel-behavior.test.cjs` | `tests/calculator-funnel-analytics.test.cjs` はraw値遮断・ownership境界 |
| 日記保存の成功/失敗/サイレント保存 | `tests/diary-save-behavior.test.cjs` | Analytics event allowlist |
| URL優先の地域表示・地域切替 | `tests/region-navigation-behavior.test.cjs` | `runtime-module-guards` の責務集約guard + Browser smoke |
| Service Worker install/activate/fetch/cache fallback | `tests/service-worker-behavior.test.cjs` | asset packaging / deploy smoke |
| ブログ一覧の検索・ページング・カテゴリ・リセット・ARIA | `.github/scripts/browser-smoke.cjs` | Node側のブログUI ownershipメタガードは不要 |
| 本番Browser smokeのrevision取得・IPv4 retry | `tests/blog-runtime-regressions.test.cjs` | 直接のbehavior ownerを作るまではstatic契約を維持 |
| モバイル性能budget | `.github/workflows/mobile-performance.yml` + `.github/scripts/mobile-performance-budget.cjs` | workflow実装を別Nodeテストでsnapshotしない |
| Browser revenue smokeの実行経路 | `.github/scripts/browser-revenue-smoke.cjs` | workflowから外れないことはCI/収益境界なのでstatic guard可 |
| PR Gate / Deploy mode / path trigger | `tests/ci-guardrails.test.cjs` | 実行されなければ下位checkが成立しないCI境界に限定 |
| 法務ページ更新日整合 | `tests/full-integrity-audit.test.cjs` | `scripts/content-dates.cjs` |

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
| mobile-performance-phase1 | Lighthouse WFのメタ検査。性能保証は `mobile-performance.yml` と `mobile-performance-budget.cjs` が直接担当 |

---

## 第2弾でやったこと

### 1. `playpoint-regression` ダイエット

- **162ケース / 約3180行 → 29ケース / 約716行**
- 残す: `loadCalculatorContext` / `CALC_PURE` 系（計算・逆算丸め・共有URL・地域 spendUnit 等）
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

## 第3弾でやったこと（2026-08-19）

### GA4初期化

- `third-party-analytics-integration.test.cjs` を追加
- 許可後の初回 `page_view` 一回性、未許可時の非送信、二重初期化防止をVM上で検証
- `pendingEvents` / `flushPending` / `sendInitialPageView` / GA4 config完全一致などの重複static guardを削除

### 計算機入力検証

- `calculator-input-validation.test.cjs` を追加
- 有限値・HTML validity・min/max・呼び出し側制約を実際の戻り値で検証
- `Number.isFinite(value)` / `element.min` / `element.max` の存在検査を削除

### Consent

- Google Privacy & Messaging / TCF / Analytics・広告個別許可 / timeout / 再同意は `consent-state.test.cjs` のruntime検証を主担当にする
- `playpoint-product-guards` は公開設定導線・旧独自UI防止・共通広告Consent境界などに限定

---

## 第4弾でやったこと（2026-08-25）

- `blog-runtime-regressions.test.cjs` から、Browser Smokeの関数名・エラーメッセージを固定するownership meta guardを削除
- 本番revision取得のIPv4/retry契約は、直接ownerがまだないため維持
- `performance-hardening.test.cjs` から、`mobile-performance.yml` のschedule / Lighthouse version / CPU slowdown / budget script名をsnapshotするテストを削除
- Browser Smoke本体・Lighthouse workflow本体・性能budgetは変更せず、実行レイヤーの保証を維持

---

## 残しているコア

- 計算: `playpoint-regression`, `main-calculator-ui`, `static-calculator-delivery`, `play-points-rounding-guide`, `calculator-input-validation`
- 計測・Consent: `analytics-core`, `third-party-analytics-integration`, `consent-state`, `calculator-funnel-behavior`, `calculator-funnel-analytics`
- ランタイムbehavior: `diary-save-behavior`, `region-navigation-behavior`, `service-worker-behavior`
- 事実: `common-pages-fact-ux`, `article-fact-regression`, `attention-country-classification`
- SEO/整合: `seo-hygiene`, `all-article-quality-audit`, `repository-integrity-audit`
- デプロイ/CI境界: `deploy-cleanup`, `ogp-mime-deployment`, `ci-guardrails`, product-guards 内デプロイ検査
- ブラウザ/本番: `browser-smoke.cjs`, `browser-revenue-smoke.cjs`, `mobile-performance.yml`
- 多言語: `intl-*` + `intl-topic-pages` + `manual-intl-articles` + `top-page-language-integrity`

---

## 記事追加時（検査は緩めない）

検査条件はそのまま。落ちる主因は「記事HTMLだけ足して生成物と静的導線を揃えていない」こと。

1. `blog/articles.json` へ載せる（非掲載は `listed: false`）
2. 本文に `support.google.com/googleplay` または `play.google.com/store/apps/editorial` の公式リンクを入れる
3. `node scripts/prepare-pr.cjs` を実行する（日付・アセット版はコミット済み値で固定）
4. 生成された sitemap / feed / `blog/index.html` の noscript / `sitemap.html` / 関連リンクを確認してコミットする

`node scripts/build-html.js` を env なしで回すとアセット版が時刻で変わり、再現性検査が落ちます。3クリック検査はブログのJS一覧を数えません。

---

## preflight の実行方針（2026-08-25 更新）

- **圧縮前:** 全 `tests/*.test.cjs` を1回
- **圧縮後:** 構文チェック + 重点セット  
  - 計算・ランタイム: `playpoint-regression` / `main-calculator-ui` / `play-points-rounding-guide` /  
    `static-calculator-delivery` / `playpoint-product-guards` / `runtime-module-guards`
  - minify 対象 JS を読む検査: `common-pages-fact-ux` / `content-structure`
- 記事SEO・intl 全文監査は圧縮で壊れにくいため、圧縮後の二重実行から外す
- 日記保存は `diary-save-behavior`、地域表示は `region-navigation-behavior`、Service Worker fetch/cacheは `service-worker-behavior` を主担当にする
- `runtime-module-guards` は、分離モジュールがminify / asset revision / Service Worker等の共有配信境界から脱落しないことを担当する
- **PR・deployの全preflightは維持する。** false positive削減は検査を飛ばすのではなく、brittle testをbehavior contractへ置き換えることで行う

---

## 触る場所

| 用途 | 場所 |
|------|------|
| 本番 | `C:\Users\tomok\PlayPoint` / `katakata0522/PlayPoint` |
| 公開 | https://playpoint-sim.com/ |
| 使わない | `cli-auto/PlayPoint`（レガシー） |
