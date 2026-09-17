# PlayPoint テスト仕分けメモ

最終更新: 2026-09-17
対象: `katakata0522/PlayPoint`（本番正本。`cli-auto/PlayPoint` ではない）

## 整理の履歴（当時の本数。現在値は末尾の全件台帳）

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
| 本番revision取得・IPv4・retry | `tests/deploy-revision-readiness.test.cjs` | 実HTTPとtransport呼出の挙動。helper名・ソース断片の重複固定はしない |
| Browser entrypointで本番SHA不足を拒否 | `tests/blog-runtime-regressions.test.cjs` | 実entrypointを隔離VMで実行し失敗reportを検証 |
| Browser前後・suite完了SHA、Deploy証跡とのdigest結合 | `tests/browser-revision-evidence.test.cjs` | localhost/CLI fixtureと4本番レーンの起動境界。本番は実Chromium |
| 保存JSON退避・将来schema拒否 | `tests/storage-safety-contract.test.cjs` / `tests/article-storage-safety-contract.test.cjs` | 別データ領域を分け、source契約はUI/数式非干渉だけを守る |
| 全公開リンク・未説明地域横断・fragment | `tests/public-navigation-contract.test.cjs` | 台帳の分類仕様はnavigation-source-map、著者固有保証はintl-author-navigation、実遷移はChromium |
| 自動復旧の発火条件 | `tests/automatic-rollback.test.cjs` | 外部watchdogの状態入力はdeploy-recovery-watchdog、snapshotの実I/Oはsnapshot-history |
| 証跡アップロード失敗の分類 | `tests/ci-stability.test.cjs` | OBSERVABILITY_FAILとCHECK_FAILを分離。rollback条件は緩めない |
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
| main-responsibility-split | **分離モジュールが asset-sync / Service Worker先読みに含まれる**は `runtime-module-guards` に復元。JSは圧縮せず内容ハッシュ同期を契約とする |
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
- `minify.cjs` の未実行JS minify対象リスト・仮想削減量計測を削除し、CSS圧縮とJS asset version同期の実契約へ一致
- preflightの圧縮後再実行を8テストファイルから配信境界owner 2ファイルへ縮小。全回帰と圧縮後JavaScript構文検証は維持

---

## 残しているコア

- 計算: `playpoint-calculation-contracts`, `playpoint-result-contracts`, `playpoint-safety-guards`, `main-calculator-ui`, `static-calculator-delivery`, `play-points-rounding-guide`, `calculator-input-validation`
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
- **圧縮後:** 全JavaScript構文チェックと配信境界2ファイルだけ
  - `static-calculator-delivery.test.cjs`
  - `runtime-module-guards.test.cjs`
- これは既存preflightの実行内容を文書へ反映した訂正。今回テストを8本から2本へ減らしたのではない。
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

## CI安定化の検査所有（2026-09-16）

第0章の実行環境・工程journal・retry記録は `tests/ci-stability.test.cjs`、性能sampleの欠損/重複/集約・追加測定は `tests/ci-performance-sampling.test.cjs` が所有する。runtime配置と共有helperの呼出境界は既存の `tests/browser-runtime-ssot.test.cjs` を更新して維持する。国際記事の測定対象は `lighthouse-suite.cjs` が所有し、workflowから同runnerが呼ばれることと合わせて検証する。個別画面・数式・保存データの回帰検査は削除しない。仕様と証跡の読み方は [CI_STABILITY.md](CI_STABILITY.md)。


## 第3章の整理判断（2026-09-17）

上の仕様別owner表が主担当の正本で、下の全件台帳は同じ文書内のファイル別索引。監査用の台帳をさらにCIで固定する自己目的のメタテストは追加しない。

- 旧「Free widget」の全文固定は、第2章で「翻訳された名称＋日本語の遷移先表示」に置換。static生成/実行時/ブラウザは異なる層のため維持。
- Browser helper名とIPv4ソース断片の存在固定は、実entrypoint失敗reportとHTTP transportの挙動検証へ置換。ネットワークretryの主担当は既存のreadinessテストへ集約。
- 公開398ページの全体監査と、著者・ゲーム・記事Roleの固有検査は対象範囲が違う。件数削減のためには削除しない。
- rollback、watchdog、snapshotはそれぞれ「当該run内の失敗条件」「別runからの状態判断」「復旧元の実I/O」が主責務。似たSHA表現だけを根拠に統合しない。
- exact文字列のうち、公式数値、URL、イベント名、ARIA契約、機密非公開、snapshot SHA、危険な旧機能防止は実契約なので残す。一般的なリファクタリングを妨げるprivate関数名は今後も当該領域を変更する時にbehaviorへ置き換える。
- 横断監査ファイルは単純移動・分割しない。名前が似ていても違う仕様のケースを落とす危険がある。各ファイルの全assertを一律に書き換えたという意味ではない。
- preflight/PR Gate/production/rollbackの実行回数・権限・ハード性能budgetは維持する。検査専用変更だけで不必要な本番再配信を増やすdeploy判定変更も採用しない。

## 現行の全テストファイル台帳（2026-09-17）

`tests/*.test.cjs` の168ファイルを全件分類。ファイル数と内部のtestケース数は別物。代表保証は実ファイルのテスト名から採録し、その他のケースを省略・無効化したものではない。

| 主責務 | ファイル数 |
|---|---:|
| 内容・事実・対象範囲 | 24 |
| SEO・公開整合 | 11 |
| 計測・同意・広告 | 11 |
| 生成・再現性 | 23 |
| UI・導線 | 21 |
| 保存 | 5 |
| 地域・翻訳 | 37 |
| 復旧 | 4 |
| ブラウザ検証 | 3 |
| 計算 | 5 |
| 公開・CI | 8 |
| 性能・配信 | 4 |
| アクセシビリティ | 5 |
| 横断監査 | 7 |

| ファイル（tests/） | 主責務 | 代表保証 |
|---|---|---|
| `about-playpoints-current-official.test.cjs` | 内容・事実・対象範囲 | Play Points基礎ページは現在の日本向け公式獲得対象を案内する |
| `all-article-quality-audit.test.cjs` | SEO・公開整合 | the complete published article corpus keeps structural quality signals |
| `analytics-core.test.cjs` | 計測・同意・広告 | GA4初期化前のイベントは保持し、準備完了後に一度だけ送信する |
| `analytics-runtime-attribution.test.cjs` | 計測・同意・広告 | 外部タグがgtag関数を置き換えても記事起点を送信直前に付与する |
| `analytics-state-boundaries.test.cjs` | 計測・同意・広告 | 未来日時・壊れたJSONの流入情報は破棄し、イベント送信を止めない |
| `article-content-audit-regression.test.cjs` | 内容・事実・対象範囲 | クレジット記事の主回答は記事タイトルの後に配置する |
| `article-content-navigation-normalize.test.cjs` | 生成・再現性 | missing mapped related section is inserted before article end |
| `article-date-contract.test.cjs` | 生成・再現性 | 更新日と公式情報確認日を別の意味として表示する |
| `article-design-system.test.cjs` | UI・導線 | Article Design System 2.0 is owned by article-shared.css |
| `article-discovery-retention.test.cjs` | UI・導線 | four-language synonym search finds body-only information and links to its section |
| `article-fact-regression.test.cjs` | 内容・事実・対象範囲 | 通常のウィークリーリワードとPlay Pass週次特典を区別して案内する |
| `article-navigation-observability.test.cjs` | 計測・同意・広告 | international article navigation emits only finite classification values |
| `article-quality-polish.test.cjs` | 内容・事実・対象範囲 | 韓国語・繁体字ゲーム記事の共通UIを各言語で表示する |
| `article-role-context-required.test.cjs` | 生成・再現性 | Role-aware prompt生成はrelativePathなしで旧一律CTAへフォールバックしない |
| `article-role-next-action-audit.test.cjs` | 生成・再現性 | 全記事のArticle Roleとgenerated主CTAが一致する |
| `article-role-registry.test.cjs` | 生成・再現性 | 記事Roleは仕事・成功KPI・誤最適化防止まで定義する |
| `article-seo-normalize.test.cjs` | SEO・公開整合 | 可視本文と一致するFAQPageは保持する |
| `article-storage-safety-contract.test.cjs` | 保存 | 記事保存とブログ設定は現行schemaだけを正常値として受け入れる |
| `attention-country-classification.test.cjs` | 地域・翻訳 | 注意ページは現在の6地域専用モードを正確に案内する |
| `author-hreflang.test.cjs` | SEO・公開整合 | 日本語運営者ページへ完全なhreflangクラスターを一度だけ同期する |
| `automatic-rollback.test.cjs` | 復旧 | rollback snapshotのSHAを本番変更前に検証してstep outputへ固定する |
| `blog-index-sync.test.cjs` | 生成・再現性 | static blog article links follow article registry titles and remain idempotent |
| `blog-listing-ux.test.cjs` | UI・導線 | listed blog search indexes title, description, tags, and category in memory |
| `blog-runtime-regressions.test.cjs` | ブラウザ検証 | 本番browser entrypointは期待SHA不足を起動前に拒否し失敗reportを保存する |
| `browser-revision-evidence.test.cjs` | ブラウザ検証 | 本番SHA未指定・短縮・不正値を拒否し、ローカル未検査とは区別する |
| `browser-runtime-ssot.test.cjs` | ブラウザ検証 | Playwright対応Chromium・固定依存・日本語fontは単一helperが所有する |
| `build-io-boundaries.test.cjs` | 生成・再現性 | 記事変換はI/Oなしで本文・既存アンカー・入力レコードを保つ |
| `build-output-equivalence.test.cjs` | 生成・再現性 | generated text comparison ignores only line-ending and final-newline differences |
| `build-pipeline-simplification.test.cjs` | 生成・再現性 | hreflangは二段階を維持し、公開アセット全走査だけ一度にする |
| `calculator-funnel-analytics.test.cjs` | 計測・同意・広告 | 計算ファネルイベントは分類値だけを許可し入力値を捨てる |
| `calculator-funnel-behavior.test.cjs` | 計測・同意・広告 | 開始イベントは計算モードごとに最初の操作だけを記録する |
| `calculator-input-validation.test.cjs` | 計算 | 有限な範囲内入力だけを計算値として受け入れる |
| `calculator-result-guidance-visibility.test.cjs` | UI・導線 | 計算後の次アクションは詳細折りたたみの外で、購入確認より後に表示する |
| `campaign-lp-meaning-consistency.test.cjs` | 内容・事実・対象範囲 | ${label} campaign LP does not describe the input as a multiplier |
| `changelog-hygiene.test.cjs` | 内容・事実・対象範囲 | 更新履歴はLatest表示を最新エントリ1件だけに持つ |
| `ci-guardrails.test.cjs` | 公開・CI | 必須PR GateがローカルChromium検証を所有し、Standalone Browser SmokeをActions登録しない |
| `ci-performance-sampling.test.cjs` | 性能・配信 | 時間の中央値が合格しても1sampleのbyte超過を隠さない |
| `ci-stability.test.cjs` | 公開・CI | 上流失敗は依存工程だけを止め、独立工程を続行し全体を失敗にする |
| `common-pages-fact-ux.test.cjs` | 内容・事実・対象範囲 | 地域別の公式レート・年間しきい値・通貨単位を固定する |
| `consent-state.test.cjs` | 計測・同意・広告 | Google Privacy & MessagingのConsent Mode値を一次情報として使用する |
| `content-date-separation.test.cjs` | 生成・再現性 | ビルド日を変えてもトップと多言語ページの内容更新日は変わらない |
| `content-structure.test.cjs` | 内容・事実・対象範囲 | 記事一覧は4つの検索意図カテゴリだけを使う |
| `decimal-inputmode.test.cjs` | アクセシビリティ | fractional spending inputs request a decimal mobile keyboard in every calculator locale |
| `deploy-cleanup.test.cjs` | 公開・CI | デプロイは公開物だけを厳密にミラーし、除外物も本番から削除する |
| `deploy-impact-classifier.test.cjs` | 公開・CI | 公開ミラーへ実際に入る変更は本番Deploy対象にする |
| `deploy-recovery-watchdog.test.cjs` | 復旧 | 元Deployのproduction mirrorが実際に試行された時だけattemptedと判定する |
| `deploy-revision-readiness.test.cjs` | 公開・CI | post-deploy revision readiness tolerates bounded stale reads but still requires the exact SHA |
| `diary-save-behavior.test.cjs` | 保存 | 保存失敗時は成功扱いの計測・通知・UI更新を一切行わない |
| `editorial-summary-integrity.test.cjs` | 生成・再現性 | 壊れた平文マーカーと複数の正規ブロックをまとめて除去できる |
| `en-locale-hygiene.test.cjs` | 地域・翻訳 | English HTML does not contain accidental Japanese-script UI or punctuation |
| `full-integrity-audit.test.cjs` | 横断監査 | ゲーム生成物は確認範囲と出典を明示し保留記事を推薦しない |
| `game-earn-rate-copy.test.cjs` | 内容・事実・対象範囲 | ゲームページは旧倍率表現ではなく特別獲得率として案内する |
| `game-guide-article-hub.test.cjs` | 内容・事実・対象範囲 | game guide catalog contains exactly 17 unique deep guides |
| `game-guide-text-safety.test.cjs` | 内容・事実・対象範囲 | ゲーム記事のタイトルとバッジはHTMLではなく文字列として出力する |
| `game-page-locale-predicate.test.cjs` | 生成・再現性 | generated game page predicate follows every canonical game locale directory |
| `game-page-ssot.test.cjs` | 生成・再現性 | generated top-level game outputs cover the canonical game locales with the same game set |
| `game-seo-common.test.cjs` | 生成・再現性 | required edits keep repeat execution safe but reject missing source contracts |
| `game-seo-depth.test.cjs` | 内容・事実・対象範囲 | FGOの価格・確定召喚・福袋の正本は確認済み値に固定する |
| `game-seo-expanded.test.cjs` | 内容・事実・対象範囲 | 第2波SSOTは価格スナップショット・公式情報・価格再確認待ちを区別する |
| `game-seo-wave3.test.cjs` | 内容・事実・対象範囲 | wave 3 verification states separate verified mechanics from unverified prices |
| `game-seo-wave4.test.cjs` | 内容・事実・対象範囲 | Wave 4 verification data separates Web payment facts from unverified Google Play prices |
| `game-seo-wave5.test.cjs` | 内容・事実・対象範囲 | Wave 5 SSOT separates verified purchase routes from unverified current prices |
| `global-error-localization.test.cjs` | 地域・翻訳 | each calculator entry page has a stable static lang for pre-init errors |
| `growth-critical-pages.test.cjs` | UI・導線 | top organic landing articles keep role-appropriate next-action paths |
| `growth-foundation-regression.test.cjs` | 横断監査 | 記事一覧JSONは版付き静的資産より短い再検証ルールを優先する |
| `high-priority-audit.test.cjs` | 横断監査 | PWA起動は保存済み地域を復元する専用ランチャーを経由する |
| `home-status-intent-routing.test.cjs` | UI・導線 | 日本語トップはランク別必要額LPへ静的導線を持つ |
| `human-sitemap-task-hub.test.cjs` | SEO・公開整合 | human sitemap is a task hub instead of a full URL warehouse |
| `info-return-navigation.test.cjs` | UI・導線 | 案内ページの戻り先は同一オリジンのパスだけから言語を引き継ぐ |
| `interactive-input-surfaces.test.cjs` | アクセシビリティ | 日本語ゲーム計算機は課金予定額を自分で打てる |
| `internal-link-targets.test.cjs` | UI・導線 | internal URL detection separates PlayPoint navigation from external destinations |
| `intl-amount-earn-rate.test.cjs` | 地域・翻訳 | dormant international Amount fallback copy uses special earn-rate terminology |
| `intl-article-earn-rate-meaning.test.cjs` | 地域・翻訳 | international article source does not teach multiplier-as-input semantics |
| `intl-article-layout.test.cjs` | 地域・翻訳 | international article shell synchronization is idempotent and preserves article content |
| `intl-article-reading-flow.test.cjs` | 地域・翻訳 | calculator_bridgeの国際記事だけ汎用promptを言語別・冪等に生成する |
| `intl-article-ux-audit.test.cjs` | 地域・翻訳 | international article hubs keep the shared article shell |
| `intl-author-navigation.test.cjs` | 地域・翻訳 | 全公開海外ページの通常の著者導線は同言語版を使い、言語切替を残す |
| `intl-content-expansion.test.cjs` | 地域・翻訳 | 国・地域別の実用記事を3言語で意味のある本文として公開する |
| `intl-coupon-credit.test.cjs` | 地域・翻訳 | クーポン・Playクレジット問題解決記事は4言語でSEO公開要件を満たす |
| `intl-demand-content-quality.test.cjs` | 地域・翻訳 | 9件の需要別記事が質問への回答を持ち、不要な汎用計算CTAを出さない |
| `intl-game-guide-expansion.test.cjs` | 地域・翻訳 | 多言語ゲーム特集は17本×3言語を一意に持つ |
| `intl-guide-discovery.test.cjs` | 地域・翻訳 | international guide taxonomy keeps known ambiguous guides in one SSOT category |
| `intl-locale-chrome.test.cjs` | 地域・翻訳 | 海外記事JSは日本語CTA・公式注記・日本語パンくずを差し込まない |
| `intl-locale-registry.test.cjs` | 地域・翻訳 | international content registries stay aligned with canonical locale identifiers |
| `intl-localization-quality.test.cjs` | 地域・翻訳 | Korean article hub keeps the missing/not-completing negation |
| `intl-localization-semantics.test.cjs` | 地域・翻訳 | 国際ランク・キャンペーンLPは地域別の現在等級と不足ポイントを引き継ぐ |
| `intl-maintenance-calculators.test.cjs` | 地域・翻訳 | 海外向け維持計算は地域別の公式門檻・積点率・通貨を分ける |
| `intl-manual-content-sync.test.cjs` | 地域・翻訳 | manual multilingual guide links survive regeneration exactly once without generating article bodies |
| `intl-navigation-sidebar-v1.test.cjs` | 地域・翻訳 | reference, troubleshooting, and calculator-bridge articles receive different next-step contracts |
| `intl-platinum-diamond.test.cjs` | 地域・翻訳 | プラチナ・ダイヤモンド比較は地域別公式数値と計算条件を明示する |
| `intl-popular-guides.test.cjs` | 地域・翻訳 | popular guide SSOT uses the stable recent-readership snapshot |
| `intl-rank-maintenance.test.cjs` | 地域・翻訳 | ランク維持記事は4言語で相互接続され公式条件とSEO要件を満たす |
| `intl-regional-accuracy.test.cjs` | 地域・翻訳 | 海外の金額LPは各地域の現地通貨と初期金額を使う |
| `intl-related-guides.test.cjs` | 地域・翻訳 | related guide ranking prefers concrete slug overlap, then the same topic |
| `intl-rewards-quests.test.cjs` | 地域・翻訳 | reward and quest topics have complete Japanese, English, Korean and Taiwan clusters |
| `intl-status-campaign-earn-rate.test.cjs` | 地域・翻訳 | international status pages describe final special earn rates instead of multiplying tier rates |
| `intl-topic-pages.test.cjs` | 地域・翻訳 | ${cluster.name}記事は3言語でSEO公開要件を満たす |
| `japanese-article-css-contract.test.cjs` | UI・導線 | legacy and modern compatibility CSS yield the published hero shell to shared CSS |
| `japanese-guide-brand.test.cjs` | UI・導線 | 日本語記事ハブは「Google Play Points 完全攻略ガイド」を正本にする |
| `japanese-navigation-sidebar.test.cjs` | UI・導線 | 日本語の全公開記事は次行動1件・関連記事3件を持ち、自己リンクと非公開記事を除外する |
| `jp-cash-conversion-intent.test.cjs` | 内容・事実・対象範囲 | JP cash-conversion owns cash/PayPay intent instead of generic recommendation intent |
| `latest-hub-operations.test.cjs` | 内容・事実・対象範囲 | 最新情報ハブは確認範囲・公式参照・確認日・次回確認目安を明示する |
| `localization-quality-audit.test.cjs` | 地域・翻訳 | calculator top pages keep localized region aria and Japanese-only destination markers |
| `localized-top-targets.test.cjs` | 生成・再現性 | 公開locale識別子は副作用のないleaf moduleを正本として各設定と一致する |
| `lp-faq-sync.test.cjs` | 生成・再現性 | visible details are the source of truth for FAQPage JSON-LD |
| `lp-monetization-idempotency.test.cjs` | 生成・再現性 | LP収益セクションの正規化は全対象でbyte-idempotent |
| `main-calculator-ui.test.cjs` | UI・導線 | 通常計算は必要な獲得率入力を主画面へ残し、旧パック設定を除去する |
| `manual-intl-articles.test.cjs` | 地域・翻訳 | 地域別に手動確認した記事の正本一覧は重複せず実在する |
| `manual-lp-hreflang.test.cjs` | SEO・公開整合 | manual LP synchronizer inserts the complete alternate cluster once |
| `meaning-consistency.test.cjs` | 地域・翻訳 | generated international top pages carry the corrected earn-rate meaning |
| `measurement-baseline-contract.test.cjs` | 計測・同意・広告 | Phase 2 baseline fixes one comparable pre-change window and user-count semantics |
| `mobile-first-view-contract.test.cjs` | UI・導線 | スマホ詳細設定は初回HTMLに存在し、first-view runtimeは入力DOMを作り直さない |
| `mobile-first-view-intro.test.cjs` | UI・導線 | 日本語トップの初期HTMLから固定改行なしの短い説明を返す |
| `monetization-search-quality.test.cjs` | 計測・同意・広告 | 記事・LP・ゲームの管理広告は有効な広告ユニットIDを持つ |
| `navigation-source-map.test.cjs` | SEO・公開整合 | navigation source-map scans the complete checked-in public HTML surface |
| `ogp-mime-contract.test.cjs` | SEO・公開整合 | JPEG固定配信する記事OGPはJPEG実体だけを置く |
| `ogp-mime-deployment.test.cjs` | 公開・CI | JPEG実体の既存OGP URLをimage/jpegとして配信する |
| `performance-hardening.test.cjs` | 性能・配信 | 記事CSSは外部化され、AdSense以外のinline styleを残さない |
| `play-points-content-evolution.test.cjs` | 内容・事実・対象範囲 | 新規記事は記事台帳へ一意に登録される |
| `play-points-rounding-guide.test.cjs` | 計算 | 公式例のシルバー500円は6ポイントへ丸める |
| `playpoint-calculation-contracts.test.cjs` | 計算 | ステータス選択の初期値はブロンズになる |
| `playpoint-product-guards.test.cjs` | 横断監査 | 著者ページのOGP画像は実在する |
| `playpoint-result-contracts.test.cjs` | UI・導線 | 通常計算の補足導線は1グループに統合し最大3件だけ表示する |
| `playpoint-safety-guards.test.cjs` | 計算 | 削除済みのウィークリーリワード自動差し引きは設定にも計算処理にも残さない |
| `post-147-integrity.test.cjs` | 横断監査 | Speculation Rules normalizer groups multiple href matches under OR |
| `public-deployment-tree.test.cjs` | 公開・CI | repository root has no unreviewed deployment entries |
| `public-navigation-contract.test.cjs` | SEO・公開整合 | 公開ページのリンク先・言語横断・fragmentを全件検証し、案内自体を削らない |
| `pwa-orientation-accessibility.test.cjs` | アクセシビリティ | PWA manifest does not lock users to a single screen orientation |
| `reduced-motion.test.cjs` | アクセシビリティ | custom CSS with keyframe animation respects reduced-motion preference |
| `refactor-output-equivalence.test.cjs` | 生成・再現性 | 公開ファイルの追加・削除・変更を区別し、同一出力は通す |
| `refactor-runtime-comparison.test.cjs` | 生成・再現性 | runtime differential comparator executes full controller paths without modifying either source |
| `region-expansion.test.cjs` | 地域・翻訳 | HK/IN生成・地域別数値・UI辞書の境界 |
| `region-navigation-behavior.test.cjs` | 地域・翻訳 | ルートは保存済み地域が違っても日本表示を選び、保存設定そのものは上書きしない |
| `region-runtime-wiring.test.cjs` | 地域・翻訳 | 地域結果導線の責務集約・配信参照の静的境界 |
| `region-selector-semantics.test.cjs` | 地域・翻訳 | ${file} presents Play country/region rather than language-only labels |
| `remaining-calendar-days.test.cjs` | 計算 | remaining calendar days uses date-only boundaries |
| `repository-integrity-audit.test.cjs` | 横断監査 | ファイル名はOS差で衝突せず、一時ファイルを追跡しない |
| `rescued-pad-and-articles.test.cjs` | 内容・事実・対象範囲 | PAD is published for every generated game locale and linked from each portal |
| `result-navigation-config.test.cjs` | UI・導線 | 結果ナビ設定は公開6地域を明示的に解決し未知地域はJPへ戻す |
| `rollback-workflow.test.cjs` | 復旧 | 通常Deployは本番を書き換える前に保存snapshotを再検証する |
| `runtime-module-guards.test.cjs` | 性能・配信 | 分離した実行時モジュールはキャッシュ改訂・Service Worker先読みに含まれる |
| `security-seo-hardening.test.cjs` | 横断監査 | security headers and CSP stay fail-closed without unused third-party allowlists |
| `seo-head-audit-parser.test.cjs` | SEO・公開整合 | Head監査はHTMLエンティティを一度だけデコードし二重アンエスケープしない |
| `seo-hygiene.test.cjs` | SEO・公開整合 | 送信するXMLサイトマップ間でURLを重複させない |
| `service-worker-behavior.test.cjs` | 性能・配信 | precache成功時だけ最新版をreload取得してskipWaitingする |
| `share-behavior.test.cjs` | UI・導線 | main share URL serializes the current calculator state and removes unrelated query/hash state |
| `site-integrity-audit-regressions.test.cjs` | 保存 | 日記ポイントは0以上の整数だけを正規化し、0を記録として保持する |
| `site-shell-calculator-header.test.cjs` | 生成・再現性 | Stage 12C owns the six calculator headers from one immutable Site Shell registry |
| `site-shell-footer.test.cjs` | 生成・再現性 | Stage 12A footer profiles are immutable and keep the current six-link structure |
| `site-shell-header.test.cjs` | 生成・再現性 | Stage 12B owns the three fixed-page headers from one immutable Site Shell registry |
| `site-shell-legal-nav.test.cjs` | 生成・再現性 | 法務ページは日本語文書として、誤解のないPlayPoint内ナビだけを共有する |
| `sitemap-information-hierarchy.test.cjs` | SEO・公開整合 | human sitemap introduces the page purpose before secondary navigation groups |
| `snapshot-history.test.cjs` | 復旧 | verified履歴は公開領域外へSHA単位で最大5世代だけ保持する |
| `static-calculator-delivery.test.cjs` | UI・導線 | 旧HTMLを初回描画から安定する静的レイアウトへ安全に変換できる |
| `status-lp-meaning-consistency.test.cjs` | 内容・事実・対象範囲 | ${label} LP uses the current special earn-rate meaning |
| `status-platinum-meaning.test.cjs` | 内容・事実・対象範囲 | Platinum LP describes the current special earn-rate input |
| `storage-safety-contract.test.cjs` | 保存 | valid diary and last-calculation schemas are accepted |
| `storage-safety-source-contract.test.cjs` | 保存 | 保存ガードはUI・計算式へ触れず、既存first-view互換exportを維持する |
| `tab-keyboard-navigation.test.cjs` | アクセシビリティ | calculator tabs expose roving tabindex and tab semantics in every locale |
| `third-party-analytics-integration.test.cjs` | 計測・同意・広告 | DOMContentLoaded後はAdSenseを先に取得しAnalyticsはload・delay・idle後まで待つ |
| `third-party-resilience.test.cjs` | 計測・同意・広告 | analytics coreの一時失敗後もpromiseを捨てて後続ロードで復旧する |
| `top-article-calculator-funnel.test.cjs` | UI・導線 | 日本語クエスト記事はRetention回答と条件境界の後に文脈CTAだけを置く |
| `top-page-language-integrity.test.cjs` | 地域・翻訳 | 地域セレクタだけを属性追加に依存せず多言語混入監査から除外する |
| `trust-pages-consistency.test.cjs` | 内容・事実・対象範囲 | privacy page describes the affiliate programs that are actually shipped |
| `tw-rank-cost-intent-boundaries.test.cjs` | 内容・事実・対象範囲 | 台湾100點・levels記事は白金/鑽石総費用ownerへscopeを譲る |
| `ui-runtime-behavior.test.cjs` | UI・導線 | calculator tab keyboard navigation moves focus/click by WAI-ARIA order and skips disabled tabs |
| `weekly-reward-ui.test.cjs` | UI・導線 | ウィークリーリワードUIは既存の日記保存契約を変更せず表示層だけを担当する |
| `workflow-step-ids.test.cjs` | 公開・CI | duplicate id mapping keys fail even when an if key separates them |
