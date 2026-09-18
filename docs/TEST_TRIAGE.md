# PlayPoint テスト仕分けメモ

最終更新: 2026-09-18
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
| CSS/JSの版別HTTP cache・HTML/SW/JSON/revisionの再検証 | `tests/helpers/apache-cache-contract.cjs`（PR Gateの実Apache/TLS） | `tests/http-cache-contract.test.cjs` は応答判定・失敗伝播、`security-health-check.cjs` は本番HTTPと前後SHA |
| ブログ一覧の検索・ページング・カテゴリ・リセット・ARIA | `.github/scripts/browser-smoke.cjs` | Node側のブログUI ownershipメタガードは不要 |
| 本番revision取得・IPv4・retry | `tests/deploy-revision-readiness.test.cjs` | 実HTTPとtransport呼出の挙動。helper名・ソース断片の重複固定はしない |
| Browser entrypointで本番SHA不足を拒否 | `tests/blog-runtime-regressions.test.cjs` | 実entrypointを隔離VMで実行し失敗reportを検証 |
| Browser前後・suite完了SHA、Deploy証跡とのdigest結合 | `tests/browser-revision-evidence.test.cjs` | localhost/CLI fixtureと4本番レーンの起動境界。本番は実Chromium |
| 保存JSON退避・将来schema拒否 | `tests/storage-safety-contract.test.cjs` / `tests/article-storage-safety-contract.test.cjs` | 別データ領域を分け、source契約はUI/数式非干渉だけを守る |
| 全公開リンク・未説明地域横断・fragment | `tests/public-navigation-contract.test.cjs` | 台帳の分類仕様はnavigation-source-map、著者固有保証はintl-author-navigation、実遷移はChromium |
| 公開記事の静的到達性・クリック深度観測 | `scripts/site-click-depth.cjs` | 未到達だけhard fail。3クリック超は改善候補として記録し公開を阻止しない |
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

`node scripts/build-html.js` を env なしで回すとアセット版が時刻で変わり、再現性検査が落ちます。到達性検査はブログのJS一覧を数えず静的hrefを使います。3クリック超は観測値で、未到達だけをhard failにします。

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


## 個別監査・修正の第5回（2026-09-18）

S08完了後の次順として、基準930ケースに含まれる「計測・同意・広告」責務群69ケースを現行mainの実装と突合して個別精査した。PR #346 / #347はテスト基盤を変更しておらず、対象11ファイルは基準930コミット `cdf5e2999719edf8e96cafeeca3a205cd9364fae` と監査開始時mainで同一内容だったため、後発ケースを誤加算せず69ケースを基準件数へ加算する。

**基準930中149精査・781未精査。** 現行実行集合はPR #345時点961ケースから、重複3ケースをownerへ統合し、性能1ケースを別ownerへ移したため静的計算上958ケース。実件数・合否はPR Gate保存TAPを正本とし、件数固定テストは追加しない。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `consent-state.test.cjs` | 7 | 全件維持。GoogleFC/TCF、解析/広告の独立Consent、再同意、片側UNKNOWN、timeoutはいずれも状態遷移のbehavior保証 |
| `analytics-core.test.cjs` | 10 | 全件維持。許可外params・不正必須params・検索free text除去の汎用ownerをここへ集約 |
| `third-party-analytics-integration.test.cjs` | 7 | 全件維持。AdSense/GA4のロード順、Consent分離、retry、二重初期化防止は統合保証 |
| `calculator-funnel-behavior.test.cjs` | 7 | 全件維持。dedupe・Consent・生入力非送信を実APIで検証 |
| `calculator-funnel-analytics.test.cjs` | 3 | 3件とも保証は維持。#2のprivate変数名/DOM文字列禁止だけ削り、main→専用trackerの最小結線へ縮小。#3のmain結線staticはbehavior ownerができるまで残す |
| `third-party-resilience.test.cjs` | 2 | 全件維持。一時失敗後の実復旧 |
| `analytics-runtime-attribution.test.cjs` | 2 | 全件維持。外部gtag置換後の送信直前attribution |
| `analytics-state-boundaries.test.cjs` | 2 | 全件維持。壊れたstorageの隔離と有限pending queue |
| `article-navigation-observability.test.cjs` | 12 | 8件維持。性能1件を`ci-performance-sampling`へ移管。結果リンク分類1件は`calculator-funnel-analytics`、不正params1件と検索free text1件は`analytics-core`へ統合し重複削除 |
| `monetization-search-quality.test.cjs` | 9 | 保証は全件維持。広告経路はprivate callback名固定をやめ、公開面→共通runtime＋広告Consent用途の境界へ緩和。非広告5件は将来の責務移管候補だが今回削除しない |
| `measurement-baseline-contract.test.cjs` | 8 | 全件維持。通常の製品回帰ではなく2026-09-15監査証跡の改変防止ownerとして扱う |

### 今回の重複整理

- `article-navigation-observability` の「計算結果リンク分類」は既存 `calculator-funnel-analytics` が同じAnalytics sanitize境界を所有するため統合。
- 同ファイルの「必須paramsへ不正型」「search free text除去」は汎用 `analytics-core` ownerへ対照ケースごと吸収。
- 国際記事3地域の性能測定は `lighthouse-suite.cjs` が公開する `PAGES` を `ci-performance-sampling.test.cjs` から直接検査する。target名を別ファイルのソース文字列から探す方式は廃止。
- `calculator-funnel-analytics` は `calculatorFunnelStartedModes` 等のprivate変数名や `document.` / `.value` という実装表記を契約にしない。dedupe・Consent・生入力遮断はbehavior ownerへ委ねる。
- 広告経路は `whenAdsAllowed(loadArticleAdsense)` のようなcallback名完全一致を要求しない。公開HTMLが共通runtimeを読み、広告用途がConsent境界を通ることだけを高速static guardに残し、実広告要求はBrowser revenue smoke / third-party integrationが担当する。

公開HTML/CSS/JS、計算式、保存形式、記事、広告ID、Consent実装、workflow、権限、性能閾値は変更しない。今回の変更はテストと監査文書だけで、本番Deployを必要とする公開差分を作らない。


## 個別監査・修正の第6回（2026-09-18）

第5回に続き、基準930ケースに含まれる「計算機UI・first view・結果導線」8ファイル41ケースを現行mainの実装と突合して個別精査した。対象8ファイルは基準930コミット `cdf5e2999719edf8e96cafeeca3a205cd9364fae` と第5回完了時mainで同一内容だったため、後発ケースを混ぜず41ケースを基準件数へ加算する。

**基準930中190精査・740未精査。** 第5回後の実行集合958ケースから、`result-navigation-config` の「同一object instance」「deep freeze」という実装方式2ケースを「呼び出し側の変更が後続計算を汚染しない」1 behaviorケースへ統合するため、静的計算上957ケース。実件数・合否は当該PR Gate保存TAPを正本とし、件数固定テストは追加しない。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `main-calculator-ui.test.cjs` | 4 | 全件維持。通常獲得率/特別獲得率の可視化、冪等化、6地域copy、主要入力の初期DOMは利用者向けUI契約 |
| `mobile-first-view-contract.test.cjs` | 9 | 全件保証維持。入力DOMの再生成禁止をprivate source regexから既存node再利用behaviorへ変更。bootstrapはinline scriptを実行して判定。first-view配信は実ESM graph・asset revision・SW install precacheで検証 |
| `mobile-first-view-intro.test.cjs` | 4 | 全件維持。日本語冒頭の全文一致を廃止し、短さ・改行非依存・計算意図・static/hydration一致へ変更。title/metaの特定キーワード順はUI契約から外す |
| `calculator-result-guidance-visibility.test.cjs` | 1 | 維持。実render結果でdetails→購入確認→次アクションの表示順を検証 |
| `playpoint-result-contracts.test.cjs` | 8 | 全件維持。結果/共有/details順を4地域から6地域へ拡張。details見出しはconfig source文字列検索でなく実CONFIG値を検証 |
| `result-navigation-config.test.cjs` | 5 | 4保証へ整理。同一instance・deep freezeという内部方式を捨て、呼び出し側の変更が後続取得を汚染しないbehaviorへ統合。全リンク・6地域・coverage fail-closedは維持 |
| `share-behavior.test.cjs` | 4 | 全件維持。共有URLの生成・復元・境界値拒否はいずれも実API behavior |
| `ui-runtime-behavior.test.cjs` | 6 | 全件維持。keyboard、reduced motion、error locale、著者/埋め込み導線のruntime解決は実利用挙動 |

### 今回の過剰固定・重複整理

- first-viewが `insertAdjacentElement` や特定 `createElement` を使わないこと自体は契約にしない。既存の計算入力nodeがruntime後も同一であることを検証し、初期DOMの存在は既精査owner `static-calculator-delivery` が担当する。
- `playpoint-first-view-state` のソース断片 `mode===main` 等をregexで探さず、各公開6地域の実inline scriptを4シナリオで実行する。
- first-viewのimport引用符・SW文字列を固定せず、active ESM graph / `APP_MODULE_FILES` / 実SW installのprecache URLで保証する。
- 日本語first-viewの一文を全文snapshotしない。staticとhydrationの一致、強制改行なし、80文字以内、目標/必要/ポイントの意味を守る。
- UIテストからtitle/meta descriptionの特定キーワード並びを外す。SEO成果物の構造・公開整合は既存SEO ownerに任せ、UI側は可視本文の3つの計算意図を守る。
- result navigationは「同じobjectを返す」「deep freezeする」を要求しない。共有mutable singletonでもcloneでも、呼び出し側の変更が次の利用へ漏れないことだけを契約にする。

公開HTML/CSS/JS、計算式、保存形式、記事、コピー、結果ナビ設定値、workflow、権限、性能閾値は変更しない。今回もテストと監査文書だけを変更し、本番サイト挙動は変えない。


## 個別監査・修正の第7回（2026-09-18）

第6回に続き、基準930ケースに含まれる「記事探索・ブログ一覧・内部回遊」6ファイル30ケースを現行mainの実装と突合して個別精査した。対象6ファイルは基準930コミット `cdf5e2999719edf8e96cafeeca3a205cd9364fae` と第6回完了時mainで同一内容だったため、後発ケースを混ぜず30ケースを基準件数へ加算する。

**基準930中220精査・710未精査。** 今回はケース統合・削除を行わず、現行実行集合は第6回後と同じ957ケースを維持する。実件数・合否は当該PR Gate保存TAPを正本とし、件数固定テストは追加しない。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `article-discovery-retention.test.cjs` | 11 | 全件維持。4言語検索・section anchor・抽出境界・読書リスト安全性・上限・URL正規化はbehavior保証。diary週判定とoutcome reportはファイル内で別責務だが必要保証なので今回削除/移動しない |
| `blog-listing-ux.test.cjs` | 7 | 全件維持。検索/ゲーム名filter/page jump/公開controls/可視性/pagination contractを維持。カテゴリが今後も必ず4種類というtaxonomy固定をUI契約から除外し、scroll animation関数名の不存在も要求しない |
| `info-return-navigation.test.cjs` | 2 | 全件維持。同一origin referrerだけで言語を引き継ぎ、外部・偽origin・http・不正URLを拒否する実inline-script behavior |
| `internal-link-targets.test.cjs` | 4 | 全件維持。内部/外部分類・same-tab化・runtime external例外・公開HTML全走査を維持。正規化後HTMLの属性順・quote形式の完全一致だけを外し、href/target/relの意味を検証 |
| `japanese-navigation-sidebar.test.cjs` | 3 | 全件維持。公開記事のnext action・関連記事、本文/SEO非干渉、article role別の次行動を保証。3関連記事は現行デザイン契約として維持 |
| `top-article-calculator-funnel.test.cjs` | 3 | 全件維持。Retention/トラブル/比較記事の回答順序と計算機destinationを維持。CTA本文の特定文言snapshotを外し、配置・直接遷移・generated prompt重複なしを保証 |

### 今回の過剰固定整理

- ブログ一覧UIから `articles.json` のカテゴリが永久に4種類であることを要求しない。検索・ゲーム名filterはカテゴリtaxonomyとは独立したbehaviorとして検証する。
- 記事カードが可視である保証はCSS初期状態と既存Browser smokeが担当するため、`fade-in-up` / `setupScrollAnimations` / `scrollObserver` といったprivate実装名の不存在は契約にしない。
- 内部リンク正規化は、属性の並び順やquote形式まで完全一致させず、内部リンクがsame-tabになり、`noopener/noreferrer`だけが不要時に除かれ、`nofollow/sponsored`等の無関係なrelを保持する意味で検証する。
- 上位記事CTAは見出し・本文の特定文言を固定しない。Retention回答/問題解決/門檻回答の後にCTAがあり、正しい通常/逆算計算機へ直接遷移し、generic promptが重複しないことを契約にする。

`growth-critical-pages.test.cjs` と `japanese-guide-brand.test.cjs` はUI台帳に置かれているが、主責務がSEO意図・ブランド文言のため今回の30件には含めない。後続の内容/ブランド責務群で精査し、重複加算を避ける。

公開HTML/CSS/JS、記事本文、表示文言、検索ロジック、読書リスト仕様、ナビ設定、workflow、権限、性能閾値は変更しない。今回もテストと監査文書だけを変更し、本番サイト挙動は変えない。


## 個別監査・修正の第8回（2026-09-18）

第7回で保留したブランド/検索意図2ファイルと、基準930ケースに含まれるSEO・公開整合11ファイルを合わせ、13ファイル51ケースを現行mainの実装・生成器・公開成果物と突合して個別精査した。対象13ファイルは基準930コミット `cdf5e2999719edf8e96cafeeca3a205cd9364fae` と第7回完了時mainで同一内容だったため、後発ケースを混ぜず51ケースを基準件数へ加算する。

**基準930中271精査・659未精査。** 今回はケース統合・削除を行わず、第7回後の現行957ケースを維持する。実件数・合否は当該PR Gate保存TAPを正本とする。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `growth-critical-pages.test.cjs` | 4 | 全件維持。CTA順序は第7回ownerへ委譲し、ここはcanonical/analytics/article runtimeと検索意図を担当。TWトラブル記事の具体的fact文言snapshotとlatestの固定年をSEO契約から除外 |
| `japanese-guide-brand.test.cjs` | 3 | 全件維持。「Google Play Points 完全攻略ガイド」は意図的なブランドSSOT。記事ハブ・OGP・記事ヘッダー・RSS/Atomの一致とlegacy brand排除は正当な成果物契約 |
| `all-article-quality-audit.test.cjs` | 4 | 全件維持。全公開記事のcanonical/H1/author/公式source/関連導線/Article JSON-LD/FAQ整合を維持。meta description 35文字以上という任意閾値を廃止し、非空・placeholderなしへ変更 |
| `article-seo-normalize.test.cjs` | 6 | 全件維持。可視FAQとFAQPage同期、Article保持、robots/max-image-preview、check-onlyは実変換behavior |
| `author-hreflang.test.cjs` | 2 | 全件維持。日本語＋生成3言語の相互hreflang clusterと冪等同期 |
| `human-sitemap-task-hub.test.cjs` | 2 | 全件維持。task destination・技術URL分離・full article list再生成防止を維持。emoji/見出しcopyと「60リンク未満」閾値を除外 |
| `manual-lp-hreflang.test.cjs` | 4 | 全件維持。manual LPの完全alternate cluster、FAQ責務分離、相互clusterを実成果物で検証 |
| `navigation-source-map.test.cjs` | 8 | 全件維持。全公開面・locale・遷移分類・generator ownership・pipeline inventoryを維持。「HTML100ページ超」「40工程超」「先頭/末尾関数完全一致」「dynamic RegExp不使用」という実装/規模固定を除外 |
| `ogp-mime-contract.test.cjs` | 1 | 維持。image/jpeg固定配信する.png互換URLの実体が全てJPEGであることはHTTP整合契約 |
| `public-navigation-contract.test.cjs` | 4 | 全件維持。全公開リンク、説明のないlocale crossing、fragment、偽ID/不正escapeを実監査 |
| `seo-head-audit-parser.test.cjs` | 4 | 全件維持。HTML entityとJSON-LD script終端のparser regressionをfixture behaviorで検証 |
| `seo-hygiene.test.cjs` | 7 | 全件維持。XML sitemap重複、Play Points scope、専用sitemap分離、非対象記事混入、地域top/Q&Aの意味を保証 |
| `sitemap-information-hierarchy.test.cjs` | 2 | 全件維持。H1→目的説明→secondary groupsという構造をcopy非依存で検証し、比較導線はhref一意＋可視labelの意味で確認 |

### 今回の過剰固定整理

- 検索順位「4〜15位」のような一時的観測値をテスト名・契約の根拠にしない。優先検索ページが検索意図を保つことだけを保証する。
- article CTAの配置/destinationは第7回の `top-article-calculator-funnel` がowner。SEO側はcritical articleのcanonical・計測runtime・indexable metadataを担当する。
- meta descriptionにSEO上の必須最小文字数はないため「35文字以上」を品質gateにしない。非空、placeholder/template残存なしを守る。
- human sitemapは目的別hubであることを、主要task destinationとfull-list非生成で保証する。emoji・見出し本文・総リンク数60未満は契約にしない。
- navigation inventoryは「100ページ以上」「40工程以上」のような規模閾値を品質指標にしない。空でない完全走査、6locale、未分類0、generator/pipelineの実捕捉を保証する。
- pipeline scannerはidentifier boundaryの入出力behaviorを守り、内部で `RegExp` を使う/使わないという実装方式は固定しない。
- human sitemap hierarchyは具体的H1/lead copyではなく、primary heading→purpose lead→secondary navigationの順序を守る。比較表リンクも表示文言全文ではなく一意href＋可視labelを契約にする。

公開HTML/CSS/JS、記事本文、ブランド文言、SEO metadata、canonical/hreflang、sitemap、feed、workflow、権限、性能閾値は変更しない。今回もテストと監査文書だけを変更し、本番サイト挙動は変えない。


## 個別監査・修正の第9回（2026-09-18）

基準930ケースに含まれる「Play Points本体の公式事実・ランク条件・獲得率の意味」8ファイル65ケースを、現行Google公式ヘルプ、現行mainの地域SSOT、公開記事・LP・最新情報ハブと突合して個別精査した。対象8ファイルは基準930コミット `cdf5e2999719edf8e96cafeeca3a205cd9364fae` と第8回完了時mainで同一内容だった。なお `campaign-lp-meaning-consistency` と `status-lp-meaning-consistency` はループ内で `test()` を生成するため、単純なsource declaration数ではなく実行時ケース数4件・6件として基準件数へ加算する。

**基準930中336精査・594未精査。** `common-pages-fact-ux` の「アプリモジュール変更でSW用指紋が変わる」1ケースは、既精査owner `runtime-module-guards.test.cjs` が実ESM・内容改訂・precacheまで同等以上に保証済みのため統合する。第8回後957ケースから静的計算上956ケース。実件数・合否は当該PR Gate保存TAPを正本とする。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `about-playpoints-current-official.test.cjs` | 4 | 全件維持。日本の獲得対象・5ステータス・常設/個別特典境界を維持。更新日だけ固定日snapshotから内容日SSOTとの一致へ変更 |
| `article-fact-regression.test.cjs` | 27 | 全件維持。週次3制度、ランク条件、期限、支払/参加条件、誇張防止などの事実回帰owner。公式「獲得対象」ページ間でGoogle Oneの記載差があるため、特定サービス名の必須化ではなく一次情報の範囲を超えて一般化しない契約へ変更 |
| `campaign-lp-meaning-consistency.test.cjs` | 4 | 全件維持。2x/3x/waitの入力は「倍率」ではなくGoogle Play表示の特別獲得率であることを保証 |
| `common-pages-fact-ux.test.cjs` | 6 | 5ケース維持・1件既存ownerへ統合。地域数値をJP/US/KR/TWからHK/INを含む6地域へ強化。巨大な混在テストは公開トップの獲得率意味/入力境界へ縮小 |
| `latest-hub-operations.test.cjs` | 12 | 全件維持。確認日・次回確認日・鮮度・日付妥当性・運用禁止事項を維持。content-datesのprivate変数名固定をSSOT値一致へ、Consent配線のsource regexを実components VM behaviorへ変更 |
| `status-lp-meaning-consistency.test.cjs` | 6 | 全件維持。Silver/Gold/Diamond LPの特別獲得率意味と削除済み週平均の再発防止 |
| `status-platinum-meaning.test.cjs` | 2 | 全件維持。Platinum LPの特別獲得率意味と月/日平均表示を維持 |
| `trust-pages-consistency.test.cjs` | 4 | 全件維持。実配信中のAdSense/Rakuten affiliate、登録不要terms、human sitemap regional hub整合を保証 |

### 現行一次情報との照合で確認した境界

- 日本の通常ウィークリーリワードはシルバー以上、金曜更新。Play Pass加入者向け週次ボーナス/ブースターは日本を含む対象地域で木曜更新。Play Pass加入によるGoldステータス特典は仏・独・米・英のみで、日本は対象外。この3制度を同一視しない。
- 日本の公式「ポイントを貯める」案内には、現在の新しいページでアプリ/ゲーム、アプリ内・ゲーム内購入/定期購入、書籍が列挙される一方、別の現行公式ページにはAndroidからのGoogle One定期購入も残る。テストは片方のサービス例を唯一の正本にせず、公式URLと「未確認サービスを対象と断定しない」境界を守る。
- 地域別ランク・通常獲得率は6地域の現行SSOTと照合。香港は5レベル、インドはPlatinumが最高の4レベルである差もテストへ含める。

### 今回の過剰固定・重複整理

- `about-playpoints` の更新日 `2026-09-14` をテストへ二重記載しない。内容日台帳の値と公開meta/JSON-LD/可視日付が一致することを保証する。
- Google Oneという1サービス名の存在だけを「日本の現在獲得対象」の証明にしない。一次情報ページ間の記載差を許容しつつ、YouTube Premium等の未確認サービスを公式対象と断定しない。
- `common-pages-fact-ux` の計算JS private式・ゲームポータル順序・アフィリエイト文言を1ケースへ詰め込まず、公開トップの意味とinput boundaryに限定する。計算behaviorは計算owner、ゲーム導線は各UI owner、広告/affiliateは収益/法務ownerが担当する。
- app module revisionの内容変更検知は `runtime-module-guards` が実import・revision・Service Worker precacheまで検証済みのため重複1件を削除。
- latest hubのcontent-dateはprivate変数名やsource断片を固定せず、公開ページから抽出した確認日と内容日SSOTの一致を契約にする。
- latest hubのConsent経路は `isLatestPage` 等のprivate変数名を探さず、実 `blog/components.js` を `/latest/` として実行しサイトルートのConsent managerを要求することを確認する。

公開HTML/CSS/JS、記事本文、公式数値、ブランド、保存形式、workflow、権限、性能閾値は変更しない。今回もtests/docsのみの変更で、本番サイト挙動は変えない。


## 個別監査・修正の第10回（2026-09-18）

基準930ケースに含まれる「記事構成・台帳・コンテンツ役割」7ファイル39ケースを、現行記事台帳・記事Role監査・静的記事ハブ・redirect・生成器・公開HTMLと突合して個別精査した。対象7ファイルは基準930コミット `cdf5e2999719edf8e96cafeeca3a205cd9364fae` と第9回完了時mainで同一内容だったため、39ケースを基準件数へ加算する。

**基準930中375精査・555未精査。** 今回はテストケース自体の削除・統合は行わない。第9回直後は956ケースだったが、並行してmainへ入ったPR #353が基準930外の回帰1ケースを追加したため、Wave 10マージ後の現行実行集合は**957ケース見込み**。3クリックという固定深度はhard gateから外すが、**トップから静的導線で到達できない記事は引き続きpreflightを失敗**させる。深度は改善候補として観測・出力する。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `article-content-audit-regression.test.cjs` | 8 | 全件維持。記事主回答順序、年齢/期限/海外過去条件/抽選、全記事ID一意、関連記事正規化は成果物・事実境界 |
| `article-quality-polish.test.cjs` | 6 | 全件維持。多言語ゲーム記事UI・共通説明・日付meta・author heading・table overflowを維持。著者profile「60件以上」という履歴件数snapshotだけ除外 |
| `changelog-hygiene.test.cjs` | 2 | 全件維持。Latestは先頭1件だけという意味を維持し、v2.4.0/v2.3.2の固定version snapshotを除外。韓国語混入防止も文全体一致から語境界へ縮小 |
| `content-structure.test.cjs` | 10 | 全件維持。カテゴリ・redirect・answer-first・Role CTA・比較表・台帳/静的一覧・到達性・deep runtime・legacy intro・knowledge boundaryを保証。4カテゴリ固定/3クリックhard limit/private source/copy/layout固定を整理 |
| `jp-cash-conversion-intent.test.cjs` | 2 | 全件維持。現金化/PayPayの検索意図と更新日/公式確認日分離を維持。title/H1/結論全文snapshotを意味検査へ変更 |
| `play-points-content-evolution.test.cjs` | 7 | 全件維持。記事台帳一意、週次/Quest/無料/買い切り/継続課金の役割分離、第三者決済混入防止は固有コンテンツ契約 |
| `tw-rank-cost-intent-boundaries.test.cjs` | 4 | 全件維持。100點/levels/白金鑽石費用ownerのscope分離を維持し、見出し・CTA全文snapshotを100點・公式閾値・owner link・direct calculator destinationへ置換 |

### 今回の過剰固定・責務整理

- 記事カテゴリを「永久に4種類」と固定しない。公開記事が非空カテゴリを持ち、そのカテゴリが静的記事ハブの `data-topic-cluster` と同期することを保証する。runtime側は未登録カテゴリもfallback表示できる現行設計。
- 統合済み「反映されない」旧記事は301・台帳除外・sitemap除外・canonical正本を契約とし、統合先本文の特定2文や英語関連記事文脈まで固定しない。
- Article Roleの全公開記事監査は専用owner `article-role-next-action-audit.test.cjs` に任せ、`content-structure` は `insertStaticPrompt` のunit behavior（冪等・回答後・詳細前・retention非生成）へ限定する。
- 「トップから3クリック以内」は一般的な改善目安であり絶対的な公開要件ではないため、4クリック以上だけを理由にPR/Deployを落とさない。**到達不能はhard failのまま**。推奨3クリック超はログへ出して改善対象として残す。
- deep URLのConsent境界は `third-party.js` のprivate変数名やquerySelector断片ではなく、公開深層ページが共通runtimeをroot-relativeで配信する成果物契約に変更する。
- `knowledge-boundary__grid` という特定レイアウトclassの禁止をやめ、knowledge boundaryが存在する場合に見出しと説明を持つ意味契約へ変更する。
- 日本語著者profileの「60記事以上」は現状件数snapshotなので廃止し、対象が空でないこと＋各profileが見出し階層を汚さないことを保証する。
- changelogはversion番号を固定せず、timeline先頭だけがLatestであることを保証する。
- JP cash conversion / 台湾rank-costは見出し・CTA全文ではなく検索意図、owner link、公式閾値、direct destinationで責務を守る。

公開HTML/CSS/JS、記事本文、記事台帳、redirect、sitemap、計算式、保存形式は変更しない。変更対象はtests、検査用scripts、preflight表示名、監査文書のみで、本番サイト挙動は変えない。


## 個別監査・修正の第11回（2026-09-18）

基準930ケースに含まれる「ゲーム固有の価格・課金経路・深掘りガイド」9ファイル73ケースを、現行のゲームSSOT、verification state、公式source URL、生成済みゲーム計算機・深掘り記事・記事台帳・検索index・sitemapと突合して個別精査した。対象9ファイルは基準930コミット `cdf5e2999719edf8e96cafeeca3a205cd9364fae` とWave10完了時mainで同一内容だったため、73ケースを基準件数へ加算する。

**基準930中448精査・482未精査。** `game-guide-article-hub` の「blog runtimeがdeep game guide用regexをsource文字列として持つ」1ケースは、同ファイルの `sanitizeArticleFile` 実関数をVM実行して許可/拒否境界を直接確認するbehavior caseが同等以上を保証しているため統合する。Wave10後957ケースから静的計算上956ケース。実件数・合否は当該PR Gate保存TAPを正本とする。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `game-earn-rate-copy.test.cjs` | 1 | 維持。公開ゲームページの旧「倍率/1%」表現復活防止を成果物で確認し、generator source文字列の二重固定を除外 |
| `game-guide-article-hub.test.cjs` | 13 | 12ケース維持・1件統合。17本exact、2026-09-13 exact、装飾class群、private regex source固定を除外し、catalog一意性・manifest/filter・検索index・canonical/sitemap・実sanitize・記事Role・冪等修復を維持 |
| `game-guide-text-safety.test.cjs` | 2 | 全件維持。タイトル/関連ラベルのHTML escapeとscript/style除外は直接security/data behavior |
| `game-seo-depth.test.cjs` | 9 | 全件維持。FGOの確認済み価格/330回、原神price snapshot、モンストWeb商品、ブルアカfail-closedを維持。公開HTML側の数値はGAME_SEO SSOTから導出 |
| `game-seo-expanded.test.cjs` | 15 | 全件維持。スタレ/ZZZ/ウマ娘/プロセカ/NIKKE/学マスのverification stateとfail-closedを維持。生成HTMLの重複数値はSSOT同期へ変更 |
| `game-seo-wave3.test.cjs` | 10 | 全件維持。ポケポケ/PAD/アークナイツ/ドッカン/鳴潮の確認済みmechanicsと未確認price分離。深掘り本文の数値はSSOTから導出し、旧全文card snapshotは危険な旧price claimへ一般化 |
| `game-seo-wave4.test.cjs` | 9 | 全件維持。HBR/崩壊3rd/ファンパレ/Reverse:1999のWeb決済・Google Play境界を維持。guide数値はWave4 SSOTから導出し、旧全文card snapshotを旧固定price claimへ一般化 |
| `game-seo-wave5.test.cjs` | 11 | 全件維持。プロスピA/Pokémon GO/eFootballの購入経路・地域別rate・portal・sitemapを維持。source「4件以上」、HTML 7000文字以上、h2 5個以上という任意量閾値を廃止 |
| `rescued-pad-and-articles.test.cjs` | 3 | 全件維持。PAD全locale、救出記事の台帳/著者/公式source/関連記事、専用OGP実体と重複防止を維持。#168時代のCSS class禁止は記事design ownerへ委譲 |

### 今回の事実契約と過剰固定の分離

- FGOの聖晶石価格、330回確定召喚、PADパス980円、モンストWebショップ190個/月1回200個、ウマスク980円など、現在も公式一次情報と整合する確認済み値はSSOT側の事実契約として維持する。
- ただし同じ値をSSOT・親計算機・深掘り記事テストへ何度もリテラルで書かない。SSOTの確認済み値と公開成果物の同期を検証し、値更新時に「正しい変更なのに複数snapshotを手修正する」構造を解消する。
- `verification=official` / `current-published-price-snapshot` / `*-price-recheck-pending` と `publishGooglePlayPrices=false` の区別を維持する。公開一次情報で現行価格を固定できないゲームは自由入力へfail closedし、旧priceや固定天井円額を復活させない。
- deep guide catalogは「17本」という当時の件数ではなく、非空・ID/file一意・正規path・Article Role・manifest/search/filter同期を契約にする。
- game guideのofficial verification dateは `2026-09-13` をテストへ再記載せず、記事catalogのmodified日とverification registryが一致することを保証する。
- blog runtimeのdeep guide許可はprivate変数名/regex sourceではなく、実 `sanitizeArticleFile` を実行して正常pathを通し、path traversal/URL/query/未登録pathを拒否するbehaviorをownerにする。
- Wave5の「sourceが4件以上」「HTML 7000文字以上」「h2が5個以上」は品質そのものではないため廃止し、Google Play公式sourceを含むこと、HTTPS source、購入経路分離、必要sectionの存在へ変更する。
- 救出記事の古い `btn-clean-shimmer|clean-accordion|pro-con-grid` class禁止は履歴design snapshotのため外し、Article Design System/browser smokeへ委譲する。

公開HTML/CSS/JS、ゲームSSOT、価格、記事本文、記事台帳、検索index、sitemap、計算式、保存形式、workflowは変更しない。tests/docsのみの変更で本番サイト挙動は変えない。


## 個別監査・修正の第12回（2026-09-18）

基準930ケースに含まれる「記事生成・日付・Role・ゲーム生成SSOT・FAQ同期」16ファイル64ケースを、現行SSOT・生成器・公開成果物・冪等性・fail-closed境界と突合して個別精査した。対象16ファイルは基準930コミット `cdf5e2999719edf8e96cafeeca3a205cd9364fae` とWave11完了時mainで同一内容だったため、64ケースを基準件数へ加算する。

**基準930中512精査・418未精査。** 今回はケース削除・統合なし。現行実行集合は956ケースを維持する。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `article-content-navigation-normalize.test.cjs` | 7 | 全件維持。関連記事挿入/保持/scope note/check-only/冪等/自己リンク拒否はtransform behavior |
| `article-date-contract.test.cjs` | 6 | 全件維持。更新日と公式確認日の意味分離・legacy meta保持・冪等・全件同期を維持。記事数100超という任意閾値を実inventory件数との一致へ変更 |
| `article-role-context-required.test.cjs` | 2 | 全件維持。relativePath必須と国際contextual CTA例外の実契約 |
| `article-role-next-action-audit.test.cjs` | 1 | 維持。全件Role/CTA監査。各Roleが必ず1件以上存在する状態snapshotを外し、別SSOTのarticle inventory件数と全Role集計一致へ |
| `article-role-registry.test.cjs` | 6 | 全件維持。Role定義・全記事分類・代表job分類・未知記事fail-closedはプロダクト契約 |
| `blog-index-sync.test.cjs` | 5 | 全件維持。台帳→静的新着/カテゴリ、非掲載除外、未知カテゴリfail-closed、PR準備pin、人向けsitemap同期 |
| `build-io-boundaries.test.cjs` | 6 | 全件維持。I/Oなしtransform、asset hash更新、地域補正、price safetyを維持。read回数exactを外し、対象外write禁止・1同期内write churn抑止・再実行冪等へ |
| `build-output-equivalence.test.cjs` | 2 | 全件維持。改行境界のみ許容しsemantic/internal whitespace driftは拒否 |
| `build-pipeline-simplification.test.cjs` | 2 | 全件維持。必要な最終化順序/手動国際記事所有権を維持。hreflang=2回、asset=1回、game hub=1回のexact call countを最低必要回数＋順序へ変更 |
| `content-date-separation.test.cjs` | 4 | 全件維持。build dateとcontent date分離、top/sitemap/build-targetsのSSOT一元化 |
| `editorial-summary-integrity.test.cjs` | 3 | 全件維持。壊れたmarker cleanup・空行正規化・自動対象のcanonical block一意 |
| `game-page-locale-predicate.test.cjs` | 3 | 全件維持。canonical localeのgame path判定と不正path拒否 |
| `game-page-ssot.test.cjs` | 5 | 全件維持。locale game set・sitemap/date・override・同期passをSSOTで保証 |
| `game-seo-common.test.cjs` | 6 | 全件維持。required edit/fail-closed/writer/範囲指定/title ownershipを維持。read/write各1回exactをscope・order・再実行無writeへ変更 |
| `localized-top-targets.test.cjs` | 3 | 全件維持。locale ID leaf SSOT・top/article target整合 |
| `lp-faq-sync.test.cjs` | 3 | 全件維持。可視FAQをJSON-LD正本としbyte-idempotent/manual LP一致 |

### 今回の過剰固定整理

- 公開記事総数を「100件超」と固定しない。日付同期が監査する件数と、同じSSOTから取得した実article inventory件数が一致することを保証する。
- Article Roleは「全Roleが常に1件以上存在」を要求しない。記事の追加・統合で一時的に0件になるRoleを品質低下とみなさず、全監査記事がちょうど1Roleへ数えられ、failuresが0であることを保証する。
- Article Role全件inventoryで `en/ko/tw` をテスト側に二重記載せず、別の日付契約inventoryと全件数を突合する。
- build I/Oはread回数そのものを仕様にしない。対象外writeをしない、1同期で同一targetを無意味に何度もwriteしない、asset変更を次回runで再評価する、2回目は不要なwriteをしない、欠損契約はfail closedすることを保証する。
- build pipelineは同義な安全工程の追加で落ちないよう、exact invocation countではなく「必要工程が存在し、依存する最終化順序が守られる」ことを契約にする。
- game SEO共通replacementもread回数exactを外し、日本語game scope、replacement順序、non-JA非干渉、再実行無writeを保証する。

公開HTML/CSS/JS、記事本文、記事台帳、Role定義、content date、game SSOT、FAQ、生成器、workflowは変更しない。tests/docsのみの変更で本番サイト挙動は変えない。


## 個別監査・修正の第13回（2026-09-18）

基準930ケースに含まれる「Site Shell・公開出力差分・runtime差分比較」7ファイル33ケースを、現行shared renderer、同期器、公開成果物比較、runtime differential comparator、PR Gate配線と突合して個別精査した。対象7ファイルは基準930コミット `cdf5e2999719edf8e96cafeeca3a205cd9364fae` とWave12完了時mainで同一内容だったため、33ケースを基準件数へ加算する。

**基準930中545精査・385未精査。** ケース削除・統合なし。Wave13自体は件数を増減しないが、並行PR #357が基準930外の回帰2ケースを追加したため、現行実行集合は**958ケース**。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `lp-monetization-idempotency.test.cjs` | 2 | 全件維持。managed収益sectionの一意性とcanonical byte-idempotencyを維持。見出し全文をmarkerにせず、canonical section/classで識別 |
| `refactor-output-equivalence.test.cjs` | 6 | 全件維持。public manifestの追加/削除/変更、byte比較、symlink拒否、固定build env、隔離build、repeat差分証跡はrefactor safetyの主owner |
| `refactor-runtime-comparison.test.cjs` | 4 | 全件維持。runtime differential、数値/markup regression、required module欠損、PR Gate配線を維持。6000/2000/1000等のケース数閾値と特定source文字列mutationを一般化 |
| `site-shell-calculator-header.test.cjs` | 5 | 全件維持。registry/香港・インドfallback/byte-canonical/drift repair/build順序を維持。6ページ/4button/4link/ARIA手書きmapの二重固定を除外 |
| `site-shell-footer.test.cjs` | 6 | 全件維持。renderer escape/markup ownership/legacy removal/canonical footer/fallbackを維持。各localeのexact 6-link snapshotと固定copyright年を意味契約へ変更 |
| `site-shell-header.test.cjs` | 5 | 全件維持。Country & Region Guide legal境界/byte-canonical/drift repair/build順序を維持。3 target/4 links/6 linksのexact countをregistry駆動へ |
| `site-shell-legal-nav.test.cjs` | 5 | 全件維持。privacy/termsの共通nav、偽言語切替拒否、migration/idempotency/build順序を維持。checked=2はLEGAL_NAV_TARGETS件数から導出 |

### 今回の過剰固定・実装改善

- Site ShellのStage 12A/B/Cという実装段階名を契約にしない。現在のshared registry/renderersがSSOTであり、target追加時に「件数が変わっただけ」で落ちないようにする。
- footerはexact 6 href配列をテスト側へ二重記載せず、locale home・author/verification・privacy・terms・href一意性・Google disclaimer・copyright形式を保証する。
- fixed-page headerはtarget=3、navLinks=4/6を固定せず、registry全targetがimmutableで有効なnavigationを持つことを保証する。Country & Region GuideのHK/IN導線とlegal分離は厳格に残す。
- calculator headerはtarget=6、regionButtons=4、links=4を固定しない。profile配列が非空・region id一意・activeRegion有効・ARIA非空であることを保証し、HK/INの「他地域ルールである」fallback文言は専用契約として残す。
- renderer本体 `renderCalculatorHeader` も同じ理由で4/4固定を外し、非空＋unique region idへ一般化する。現行profiles/公開HTMLの出力は変えない。
- runtime differentialのcoverageをmain>6000/reverse>2000/pure>1000で固定せず、4種類すべてが正の実行件数を記録しmismatch 0であることを保証する。
- runtime regression fixtureはJP Silver=1.25や `<dl>` 完全一致をmutation pointにせず、対象意味を保ったままcurrent sourceへ適応する。
- PR Gate checkoutは `fetch-depth: 2` 完全一致ではなく、base revisionを取得できる2以上またはfull fetchを許容する。

公開HTML/CSS/JS、Site Shell profiles、リンク文言、記事本文、計算式、保存形式、workflowは変更しない。rendererの固定件数制約だけを一般化するため `scripts/site-shell.cjs` を変更する。現行profile入力の出力不変は、complete preflight内のSite Shell byte-canonical/idempotency契約とChromiumで確認する。条件付きbuild-refactor/runtime比較レーンは今回の変更分類では対象外ならskipを正しく扱う。


## 個別監査・修正の第14回（2026-09-18）

「公開・CI」カテゴリ10ファイルを実査した。基準930に存在するのは8ファイル57ケースで、`preflight-execution-contract.test.cjs` 8ケースと `syntax-verifier-execution.test.cjs` 1ケースは基準930後の追加なので、現行品質として精査するが基準進捗には加算しない。

**基準930中602精査・328未精査。** Wave14自体は現行ケース数を増減せず、PR #357〜#361までを含む現行実行集合は**959ケース**を維持する。

| 対象 | 基準ケース | 現行ケース | 判断 |
|---|---:|---:|---|
| `ci-guardrails.test.cjs` | 10 | 10 | 全件維持。必須PR Gate、Deploy ownership、production Chromium、rollback境界を維持。artifact保持7日・timeout15分・fetch-depth=2のチューニング値をbounded contractへ変更 |
| `ci-stability.test.cjs` | 11 | 11 | 全件維持。phase failure伝播、CI evidence、navigation retry、runtime setup、observability failure区別を維持。navigation最大3回をexported SSOTから導出 |
| `deploy-cleanup.test.cjs` | 11 | 10 | 基準11ケースを全件精査。既に現行では「厳密mirror」と「別管理領域保護」が実rsync引数の1 behavior caseへ統合済み。retry 7/5回の二重固定をshell policy SSOT＋有限上限へ変更 |
| `deploy-impact-classifier.test.cjs` | 7 | 9 | 基準7件全維持＋後発2件も精査。公開/非公開/ビルド入力/未知root/CLI判定は現在のfail-closed設計として妥当 |
| `deploy-revision-readiness.test.cjs` | 4 | 4 | 全件維持。stale read許容・exact SHA必須・bounded retry・IPv4/no-cache transport |
| `ogp-mime-deployment.test.cjs` | 2 | 2 | 全件維持。JPEG実体の互換PNG URLと実Content-Type検査 |
| `public-deployment-tree.test.cjs` | 5 | 5 | 全件維持。root allowlist、unknown fail-closed、明示staging、repository root直deploy拒否 |
| `workflow-step-ids.test.cjs` | 7 | 7 | 全件維持。step key/id重複をworkflow全件で検出し、heredoc等のfalse positiveを避ける |
| `preflight-execution-contract.test.cjs` | 基準外 | 8 | 後発8件を全件精査。必須配信境界欠損、空回帰集合、pre/post-minify順序、実TAP証跡、失敗保存、保存先I/O失敗をbehaviorで検査しており維持 |
| `syntax-verifier-execution.test.cjs` | 基準外 | 1 | 後発1件を精査。実CLIでowned JSの構文破損・必須ファイル欠損を検出し、docs/testsを対象外にする実行契約として維持 |

### 今回の過剰固定整理

- PR Gateのartifact retentionを「必ず7日」、job timeoutを「必ず15分」と固定しない。retentionは1〜30日、PR Gate timeoutは5〜60分の有限範囲を要求し、運用調整だけでテストを壊さない。
- Deploy checkoutの `fetch-depth: 2` 完全一致をやめ、base diffに必要な履歴を持つ `0`（full）または2以上を許容する。
- browser navigation retryの上限値は `.github/scripts/browser-navigation-retry.cjs` の `MAX_NAVIGATION_ATTEMPTS` をSSOT化し、テスト側へ3を二重記載しない。現在値3は維持し、1〜5の有限範囲を安全境界とする。
- deploy transportの `DEPLOY_MAX_ATTEMPTS=7` / `DEFAULT_MAX_ATTEMPTS=5` はshell policyから読み、実transportがその上限で止まることを検証する。値そのものは変更せず、2〜10の有限範囲とmain>=auxiliaryを保証する。

### 維持した厳格な安全網

- public deploymentは明示allowlist stagingのみで、repository rootを直接rsyncしない。
- unknown rootは無視せずfail-closed側へ送る。
- verified snapshotは本番変更前に検証し、rollback revisionをexact 40-char SHAで固定する。
- transient network errorだけを再試行し、非通信エラーは即失敗する。
- production Chromiumはverified publicationより前、失敗時rollback対象となる。
- preflightは必須検査欠損・空集合・TAP保存失敗を成功扱いしない。
- CI evidenceは任意env・step outputs・event secretを保存しない。
- workflow step ID重複、owned CI JS構文破損、OGP MIME不整合をfailさせる。

公開HTML/CSS/JS、deploy先、retry実値、workflow順序、公開allowlist、rollback仕様は変更していない。CI helperでnavigation retry ceilingをSSOT化し、tests側のチューニング値固定だけを整理する。

## 個別監査・修正の第15回（2026-09-18）

基準930ケースに含まれる「計算・入力面」4ファイル31ケースを、現行mainの計算実装・地域設定・6地域公開HTMLと突合して個別精査した。4ファイルはいずれも基準930コミット `cdf5e2999719edf8e96cafeeca3a205cd9364fae` とWave14完了時mainで同一内容だったため、31ケースを基準件数へ加算する。

**基準930中633精査・297未精査。** 今回はテストケース自体の削除・統合を行わず、現行実行集合は**959ケース**を維持する。公開HTML/CSS/JS・計算式・表示文言・地域設定値・保存形式は変更しない。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `calculator-input-validation.test.cjs` | 3 | 全件維持。有限値、HTML validity、呼び出し側/HTML側の厳しい境界を実入力behaviorで検証しており、実装詳細依存はない |
| `decimal-inputmode.test.cjs` | 2 | 全件維持。数値入力の意味に対応するmobile keyboard契約。テスト名の「every calculator locale」に合わせ、既に同じ正しいHTMLを持つHK/INも対象へ追加 |
| `interactive-input-surfaces.test.cjs` | 7 | 全件維持。ゲーム・各地域トップ・points-cost・maintenanceの実入力面を保証。ゲームディレクトリ21件以上という規模snapshotと、JA/EN差分2パスの完全一致配列を意味契約へ変更 |
| `playpoint-calculation-contracts.test.cjs` | 19 | 全件維持。通常/逆算、獲得率、丸め、年末、必要ポイント、1728例、KR単位、結果詳細を維持。「次の1ランクだけ」「JPは5ステータス」「option位置固定」を設定値・有効遷移・重複なしの契約へ変更 |

### 今回の過剰固定・不足整理

- ゲーム計算機の入力保証に「公開ゲームが21件以上」を混ぜない。ゲーム出力inventoryは既精査のgame SSOT ownerへ任せ、このテストは存在する公開ゲーム計算機が必要入力を持つことだけを保証する。
- JA/ENの入力差分を2つのファイル名完全一致で固定しない。差分がある場合はmaintenance LPであり、計算機本体へ `mode=main` で渡す役割を持つことを検証する。
- Bronzeの目標を「optionが必ず1件」と固定しない。現在ランクから進める設定済み昇格先を含み、未知・重複targetを出さないことを保証する。将来、正当な遠い目標選択を追加してもテストだけが妨げない。
- status selectorの5件固定をやめ、JP設定のstatus数と実option数・一意性を照合する。
- ゴールド→プラチナの`1728`例は残すが、`options[1]`という配列位置には依存せず、`statusLabel`で対象遷移を特定する。
- `decimal-inputmode` はHK/INを取りこぼしていたため6地域へ補完し、現行HTMLがすでに正しいことを確認した。

公開サイト挙動は変更していない。今回の変更はtests/docsのみで、現在の「維持＋次ランク」実装もそのまま残る。ただしテストは、その実装方式自体ではなく利用者に提示するtargetが設定上有効で重複しないことを契約とする。


## 個別監査・修正の第16回（2026-09-18）

基準930ケースに含まれる「地域コア」4ファイル10ケースを、現行mainの6地域HTML・地域生成器・runtime設定・実ESM依存グラフ・Service Worker install要求と突合して個別精査した。対象4ファイルは基準930コミット `cdf5e2999719edf8e96cafeeca3a205cd9364fae` からWave15後まで同一で、PR #364後の地域関連コードにも競合する変更はない。

**基準930中643精査・287未精査。** ケース数は増減せず、PR #364のGateで確認された現行実行集合**959ケース**を維持する。公開HTML/CSS/JS・地域数値・表示文言・遷移挙動は変更しない。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `attention-country-classification.test.cjs` | 4 | 全件維持。6地域導線・HK/IN専用条件・ブラウザ言語だけで国を断定しない境界・内容日整合を維持。6地域を列挙した英文1文の完全一致だけを除外 |
| `region-expansion.test.cjs` | 1 | 維持。HK/IN生成結果とruntime configを直接検証し、config/navigationソース文字列の二重固定を除去 |
| `region-navigation-behavior.test.cjs` | 4 | 全件維持・変更なし。URL優先、保存値、segment誤判定防止、6地域切替を実script behaviorで検証 |
| `region-runtime-wiring.test.cjs` | 1 | 維持。import文・private定数・source断片の固定を、実ESM graph・asset revision input・実SW install precacheへ置換 |

### 現行公式条件との照合

- Google公式の香港向け現行表は、250/1,000/4,000/15,000ptの境界と、HK$7あたり1/1.25/1.5/1.75/2ptを示す。
- Google公式のインド向け現行表は、250/1,000/4,000ptの境界、₹5あたり1/1.1/1.2/1.4pt、Platinumが現行最高ランクであることを示す。
- したがって地域数値のテストは弱めず、実装方法の固定だけを外す。

### 今回の過剰固定・重複整理

- 注意ページは「6地域を列挙した英文が一字一句同じ」である必要はない。各地域名・一意な導線・公式確認経路が存在することを契約にする。
- HK/IN設定は `region-expansion-config.js` 内の `rateUnit` 等の文字列を検索せず、`loadConfigs(true)` が返す実runtime設定を検査する。
- HK/IN遷移URLは `region-expansion` 側のsource regexから外す。実際の切替結果は `region-navigation-behavior` が主担当。
- 結果ナビ責務は特定import文や `deepFreeze({...})` の形を固定しない。active ESM graph上で `region-navigation` / `calculator` から結果ナビ設定へ到達し、cache revision対象に入り、HK/INトップが実install precacheへ入ることを保証する。
- 旧 `region-result-navigation.js` の二重owner復活だけは、責務重複防止として不存在を維持する。

公開サイト挙動は変更していない。tests/docsのみの変更である。


## 個別監査・修正の第17回（2026-09-18）

基準930ケースに含まれる「地域セレクタ・静的言語整合」4ファイル20ケースを、6地域公開HTML、first-view owner、active ESM graph、必須Chromiumのmobile-region-layout smokeと突合して個別精査した。

**基準930中663精査・267未精査。** ケース数は増減せず、現行実行集合**959ケース**を維持する。公開HTML/CSS/JS・表示文言・デザイン・地域挙動は変更しない。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `region-selector-semantics.test.cjs` | 13 | 全件維持。6地域の初期HTML、HK/IN発見性、first-paint保護、44px touch target、desktop flag asset、localized accessible nameを維持。Chromiumが所有する5列/1行/選択色/右端geometryの具体CSS値と、browser-language recommendationの重複source snapshotを整理 |
| `top-page-language-integrity.test.cjs` | 5 | 全件維持。生成EN/KO/TWに加え、別生成経路のHK/IN tracked topもwidget/feed/chart/static language leak監査へ追加 |
| `en-locale-hygiene.test.cjs` | 1 | 維持。英語HTML監査を`en/`だけでなく英語Indiaトップの`in/`にも拡張 |
| `global-error-localization.test.cjs` | 1 | 維持。「each calculator entry」の実態に合わせ、HK `zh-HK` とIN `en-IN`を追加 |

### 今回の過剰固定・不足整理

- browser-languageの国別推薦マッピングは既精査 `mobile-first-view-contract` が実関数behaviorで所有するため、region-selector側で`startsWith(...)`やprivate DOM関数名を再固定しない。ここではcompatibility moduleがactive ESM graph上でfirst-viewへ依存することだけを確認する。
- mobile selectorの5列・同一行・ラベル表示・選択色・desktop右端geometryは必須 `mobile-region-layout-smoke` が6地域×320/360/390/412px＋1024pxのcomputed layoutで検証済み。Node側は具体的grid値・色hex・radius pxを二重固定しない。
- first-paint用critical styleがboot前に注入される順序、44px touch target、desktop/mobile labelの役割分離、OS flag emoji非依存、localized accessible namesは静的境界として維持する。
- HK/INはEN/KO/TWと生成経路が異なるため、従来の3言語generator loopへ無理に混ぜず、tracked outputを同じ意味契約で追加検査する。
- 英語IndiaとHK/INの静的`lang`を取りこぼしていたため、言語混入・pre-init error localeの対象を6地域へ補完する。

公開サイト挙動は変更していない。tests/docsのみの変更である。


## 個別監査・修正の第18回（2026-09-18）

基準930ケースに含まれる「国際locale基盤・翻訳意味・著者導線」6ファイル34ケースを、canonical locale ID、公開HTML、用語contract、hreflang、共通footer同期、navigation source mapと突合して個別精査した。

**基準930中697精査・233未精査。** 今回はケース数を削除・統合せず、現行959ケースを維持する。公開HTML/CSS/JS・記事本文・翻訳copy・hreflang・著者導線は変更しない。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `intl-locale-registry.test.cjs` | 2 | 全件維持・変更なし。canonical `INTERNATIONAL_LOCALES` と各registry/x-defaultを同期するSSOT契約 |
| `intl-localization-semantics.test.cjs` | 6 | 全件維持・変更なし。地域別preset、最終特別獲得率、韓/TW補助ラベル、自然な地域表現、TW問題排解、現金化語感の回帰 |
| `intl-localization-quality.test.cjs` | 7 | 全件維持。TW/HK用語・相互hreflang・sitemapを維持。用語監査の非破壊性をsource内の関数名不存在ではなく、違反fixtureで実際に失敗しファイルを変更しないbehaviorへ置換 |
| `localization-quality-audit.test.cjs` | 5 | 全件維持・変更なし。トップ地域aria、日本語destination marker、自然copy、TW source wording、changelog、legacy banner不在 |
| `intl-locale-chrome.test.cjs` | 10 | 全件維持・変更なし。記事/LP/gameのchrome、法務marker、calculator destination analytics境界、前後ナビ・CTA localeを保証 |
| `intl-author-navigation.test.cjs` | 4 | 全件維持。国際locale一覧をcanonical SSOTから導出し、manual LP 9件・HK/IN author 3本という固定件数を実対象数/意味契約へ変更 |

### 今回の過剰固定・重複整理

- 台湾用語contractは「監査コード内に `writeFileSync` 等の文字列がない」ことを安全性の根拠にしない。全source fixtureを用意し、widgetに禁止語を注入すると `assertTaiwanTerminology` が失敗し、対象ファイル内容が前後一致することを直接検証する。
- 台湾widgetの黃金級/1000ptと、foreign terminology markerの例外behaviorは引き続き維持する。
- HK用語変換は `region-page-sync.cjs` が特定helper名をrequireしていることや `html.replace` 不在を固定せず、`mapOutsideForeignTerminology` の入出力behaviorを主契約にする。実HK公開生成は第16回ownerが別途保証済み。
- 国際著者導線のEN/KO/TW一覧は `INTERNATIONAL_LOCALES` から導出し、locale追加時にテスト側の手書き一覧が正本化しないようにする。
- 手書きLP footer同期の checked/changed は固定値9ではなく、fixtureで実際に準備した対象 `paths.length` と一致させる。
- HK/INトップのauthor linkは「必ず3本」という現在のmarkup件数を契約にせず、少なくとも可視author参照が存在し、存在する全リンクが既存言語版へ向き明示fallback markerを持つことを保証する。

公開サイト挙動は変更していない。tests/docsのみの変更である。


## 個別監査・修正の第19回（2026-09-18）

基準930ケースに含まれる「国際ガイド発見性・関連記事・人気記事・sidebar」4ファイル18ケースを、taxonomy SSOT、公開hub、related ranking helper、popular editorial SSOT、BreadcrumbList、6地域switcherと突合して個別精査した。

**基準930中715精査・215未精査。** ケース数は増減せず、現行959ケースを維持する。公開HTML/CSS/JS・記事本文・sidebar表示件数・人気記事順・関連記事生成は変更しない。

| 対象 | 基準ケース | 判断 |
|---|---:|---|
| `intl-guide-discovery.test.cjs` | 5 | 全件維持。taxonomy・XSS安全性・locale別curation・search/filter・active navigationを維持。Start 5件・catalog 20件以上という規模snapshotをSSOT一致/category coverageへ変更 |
| `intl-related-guides.test.cjs` | 3 | 全件維持。ranking fixtureと高signal導線を維持。公開sidebar 3件固定・文脈signature 6種以上を非空/一意/同locale/自己リンクなし/複数文脈へ変更 |
| `intl-popular-guides.test.cjs` | 3 | 全件維持。editorial SSOT・rank・current self-link防止を維持。snapshot日 `2026-09-02` と5件固定を有効日付・SSOT件数/helper出力一致へ変更 |
| `intl-navigation-sidebar-v1.test.cjs` | 7 | 全件維持。Role別next action、breadcrumb、author trust、region switcher、BreadcrumbListを維持。EN/KO/TW一覧をcanonical `INTERNATIONAL_LOCALES` から導出 |

### 今回の過剰固定・重複整理

- `START_HERE_SLUGS` はlocale別curationのSSOTなので、テスト側で5件を再定義しない。非空・一意・同locale・実在を確認し、公開featured cardがSSOTと完全一致することを保証する。
- hub全catalogの「20件以上」は記事数増減に依存する任意閾値なので削除。curated startより広いcatalogであり、全taxonomy categoryに実記事があり、filterが存在することを契約にする。
- related sidebarの件数3は現在のrenderer判断であり、テスト品質指標にしない。非空・一意・自己リンクなし・同locale・実在を守り、記事ごとに少なくとも複数の異なる関連集合が生じることを保証する。
- popular snapshotは更新時に正しく日付を進められるよう、特定日完全一致ではなくISO日付として妥当であることを検証する。popular list件数もSSOT配列長・helper/render結果から導出する。
- navigation sidebarのcontent locale一覧は `INTERNATIONAL_LOCALES` に一本化する。

公開サイト挙動は変更していない。tests/docsのみの変更である。

## 現行の全テストファイル台帳（2026-09-18）

`tests/*.test.cjs` の172ファイルを全件分類（第2回の追加3ファイル、第4回のHTTP応答検査1ファイルを含む）。ファイル数と内部のtestケース数は別物。代表保証は実ファイルのテスト名から採録し、その他のケースを省略・無効化したものではない。

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
| 公開・CI | 10 |
| 性能・配信 | 5 |
| アクセシビリティ | 5 |
| 横断監査 | 8 |

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
| `http-cache-contract.test.cjs` | 性能・配信 | HTTP応答の版別cache・重複ヘッダー・本文/状態・通信失敗・前後revisionを検証する |
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

## 個別監査・修正の第2回（2026-09-17）

ファイル分類とケース個別承認を分ける。基準930ケースの個別精査は74、未精査856。全件の必要性を承認した状態ではない。対応リストは `TEST_AUDIT_PROGRESS_2026-09-17.md` と同名JSONへ集約する。

| 保証 | 現行の主担当 | 移行元／境界 |
|---|---|---|
| preflightの実対象・実行順序・欠損/エラー伝播 | `tests/preflight-execution-contract.test.cjs` | P06/P13。CI05はcheck-only起動、全件数は固定しない |
| 運用JSを含む構文検査の実CLI | `tests/syntax-verifier-execution.test.cjs` | P08。欠損・壊れたJSで失敗 |
| 実転送引数の除外・保護と有限retry | `tests/deploy-cleanup.test.cjs` | P04/D02をD01へ統合。remote snapshotの実行保証とは別 |
| 結果値の読みやすさ・主要CTAの実表示 | `.github/scripts/browser-smoke.cjs` | P21を実画面へ。静的DOM順序はS04/S05にも残す |
| 独立ウィジェットの通常/逆算・境界4言語 | `.github/scripts/embed-widget-smoke.cjs` | R05。コード長の疑似保証は廃止 |
| 静的順序と有効Cache-Control宣言の故障fixture | `tests/markup-contract-fixtures.test.cjs` | S04/S05/S08の補助。Apache HTTP全体の模倣ではない |

追加された台帳行：

| ファイル（tests/） | 主責務 | 代表保証 |
|---|---|---|
| `preflight-execution-contract.test.cjs` | 公開・CI | 必須検査の欠損・空集合を拒否し、実行順序と失敗伝播を確認する |
| `syntax-verifier-execution.test.cjs` | 公開・CI | 実CLIで運用JSの構文エラー・必須ファイル欠損を検出する |
| `markup-contract-fixtures.test.cjs` | 横断監査 | 説明欠損・偽タグ・コメントだけの設定・条件反転を拒否する |

ローカル全体検証は934ケース、圧縮後は2ファイル15ケース（同じ934の一部）。前段の168/930/16は第3章時点の履歴であり恒久閾値ではない。

## 個別監査・修正の第3回（2026-09-18）

最新差分台帳は `TEST_AUDIT_PROGRESS_2026-09-18.md` / 同名JSON。第2回台帳を履歴として保持し、R01/R02/S07を重複加算せず、今回精査した既存SW6ケースを加算する。基準930中80精査・850未精査。現行943ケース、圧縮後18ケースは別の集計である。

| 保証 | 主担当 | 変更と境界 |
|---|---|---|
| 能動的なESM依存・内容版・実先読み・CSS挿入 | `runtime-module-guards.test.cjs` | R01/R02を実行検証へ。S07の資産版重複を集約 |
| 6地域の登録URL・update・遅延・拒否 | `static-calculator-delivery.test.cjs` | S07を4動作ケースへ。実地域判定を使い、私的変数名は固定しない |
| 閲覧時Cache API障害・背景処理の寿命・異なる版の分離 | `service-worker-behavior.test.cjs` | 既存6を精査、新規6で見逃しを補完。installの必須先読みは緩和しない |

helpersは公開ソースを実行する検査用部品であり、新しい製品ランタイムではない。実ブラウザの登録・制御・オフライン確認は既存browser-smokeへ残す。多タブ更新と実quota不足、S08のApache実HTTPは未完了として保持する。


## 個別監査・修正の第4回（2026-09-18）

S08で残っていたApache実HTTPを検証した。S08は既に個別精査80に含まれるため重複加算せず、基準930中80精査・850未精査を維持する。第3回末尾のS08未完了は当時の状態であり、本節で実HTTPへの移行を記録する。

### 再現した実不具合と最小修正

- 従来の設定では、版付きJavaScriptがFilesMatchの短期指定に上書きされていた。一方、版クエリ付きHTML/一般JSONは一年間immutableになり、deploy-status/revisionには短期禁止と長期保存の矛盾したCache-Controlが二重に付いていた。従来の宣言文字列検査はこれを見逃していた。
- immutableをCSS/JS/MJSのFilesMatchだけに限定し、同じ設定階層の順序で適用する。sw.jsは版クエリがあっても短期再検証へ戻す。UI・HTML・CSS・計算式・保存形式・広告・Consent・公開範囲には変更しない。
- 既にブラウザが長期保存した個別URLを即時消去できることは保証しない。ユーザーデータの消去や強制キャッシュ初期化は行わない。

### 検査所有と実行経路

| 層 | 主担当 | 保証 |
|---|---|---|
| 純粋な応答判定と失敗伝播 | `tests/http-cache-contract.test.cjs` | 12ケース。指示順等の同義変更を許容し、誤った長期保存・重複/矛盾・不正max-age・誤HTTP status・別本文・前後SHA切替・通信失敗を拒否 |
| 候補設定の実行 | `tests/helpers/apache-cache-contract.cjs` | 候補.htaccessを無変更で隔離Apache/TLSへ適用。99応答（実パス・階層・版/非版/空/不正版・404・転送）を検証。fixture専用CAでTLS検証し、終了時にプロセス/一時領域を片付ける |
| 公開環境 | `.github/scripts/security-health-check.cjs` → `http-cache-contract.cjs` | 66応答と検査前後のexact revision。既存production-security工程の失敗としてverified化を止める。旧snapshot復旧は従来どおりsnapshot自身の検証コードを使う |

Apache統合検査は既存PR Gate内で一回実行する。Windowsの通常Node単体検査にApacheを必須化しない。新しいworkflow/job・権限・外部サービス・依存パッケージ・性能閾値を増やさない。既存のCI証跡保管先へJSONを保存する。

旧S08の宣言検査とmarkup fixture内のcache宣言ケース（2ケース）は上記へ置換。markupの存在・順序・偽タグ拒否は残す。第2回表のmarkup cache担当は本節へ移管した。現行ケース数の計算上は943−2＋12＝953、圧縮後は18−1＝17となるが、実際の全件合否・件数は当該PR Gate成果物を正本とし、件数を固定するテストは追加しない。

ローカルの実Apache検証では、旧設定を含む故障7種類を拒否し、同義表記変更2種類を受理した。通常Node・Apacheの両方でOS依存を区別する。これはHTTPキャッシュの検証であり、Service Workerの多タブ更新・実quota不足のブラウザ検証は引き続き未完了。残る850ケースの必要性を承認したという意味ではない。
