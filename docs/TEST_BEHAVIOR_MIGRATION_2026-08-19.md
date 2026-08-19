# PlayPoint behavior-first テスト移行記録 — 2026-08-19

この文書は、`docs/TEST_TRIAGE.md` の設計原則を実際のテストへ適用した履歴と、現在の主担当テストを記録する。

目的はテスト本数を減らすことではない。

- 本当に壊れた時は厳しく失敗する
- 正しいリファクタリングでは実装名の変更だけで失敗しない
- 同じ仕様を複数のsource snapshotで重複固定しない
- Product regression / Test brittleness / Generated artifact drift を混同しない

## 現在のbehavior owner

| 仕様 | 主担当 | 補助安全網 |
|---|---|---|
| Consent状態遷移・GoogleFC・TCF・timeout・再同意 | `tests/consent-state.test.cjs` | 公開Consent UI / CSP / architecture guard |
| GA4初期化・初回page_view・二重初期化防止 | `tests/third-party-analytics-integration.test.cjs` | `tests/analytics-core.test.cjs` |
| third-party load順序・Analytics/広告Consent分離・AdSense retry | `tests/third-party-analytics-integration.test.cjs` | ブログ広告の残存architecture guard |
| 計算機の数値入力受理/拒否 | `tests/calculator-input-validation.test.cjs` | Browser calculator smoke |
| 計算ファネル開始/完了/dedupe/Consent | `tests/calculator-funnel-behavior.test.cjs` | `tests/calculator-funnel-analytics.test.cjs` のraw値遮断/ownership guard |
| 日記保存成功/失敗/サイレント保存 | `tests/diary-save-behavior.test.cjs` | Analytics event allowlist |
| URL優先の地域表示・地域切替 | `tests/region-navigation-behavior.test.cjs` | `runtime-module-guards` の責務集約guard + Browser smoke |
| Service Worker install/activate/fetch/cache fallback | `tests/service-worker-behavior.test.cjs` | asset packaging / deploy smoke |
| ブログ一覧の検索・ページング・カテゴリ・リセット・ARIA | `.github/scripts/browser-smoke.cjs` | `tests/blog-runtime-regressions.test.cjs` のcoverage ownership guard |
| 法務ページ更新日整合 | `tests/full-integrity-audit.test.cjs` | `scripts/content-dates.cjs` |

## 2026-08-19にbehaviorへ移した領域

### GA4初期化

旧guardは `pendingEvents` / `flushPending` / `sendInitialPageView` / 完全一致するconfigコードなどを直接検査していた。

現在はVMで実際に初期化を動かし、次を契約としている。

- Consent許可後にGA4 configが行われる
- 初回page_viewは一度だけ
- configより前にpage_viewを送らない
- Analytics未許可ではGA4を開始しない
- 別経路で初期化済みなら二重configしない

### 計算機入力

旧guardの `Number.isFinite(value)` / `element.min` / `element.max` の存在検査を廃止。

現在は正常値、境界値、min未満、max超過、`NaN`、`Infinity`、HTML validity違反、呼び出し側制約との競合を実際に入力して戻り値を検証する。

### Consent

Google Privacy & Messaging / TCF fallback / Analyticsと広告の個別許可 / timeout / 拒否後の再同意はruntime testを主担当にした。

product guardには、公開設定導線・廃止した独自同意UIの再導入防止・共通Consent境界などだけを残す。

### Full integrity audit

既にruntime ownerがある還元率・Consentの重複source snapshotを削除。

法務ページは特定日 `2026-08-18` を固定するのではなく、以下が相互一致することを契約に変更した。

- `last-modified`
- JSON-LD `dateModified`
- 本文の最終改定日
- `CONTENT_DATE_OVERRIDES`

正しい将来更新でテスト側の日付を書き換える必要はない。

### Service Worker

旧guardは `isCacheableRequest` / `getCacheKey` / `handleNavigationRequest` などの関数名やsource順序を検査していた。

現在は`sw.js`をVMで実行して次を確認する。

- precache成功時だけ`skipWaiting`
- precache失敗を握りつぶさない
- 自分の古いcacheだけ削除し他アプリcacheを残す
- POST / 外部origin / Service Worker自身は処理しない
- navigationはnetwork-first
- offline時は同一ページcache → root fallback
- static assetのcache keyは版番号だけ保持し追跡queryを捨てる

Service Workerの現行cache名はテスト内へ固定せず、`sw.js`の現在値をfixtureとして取得する。

### 日記保存

旧guardは「保存失敗時のearly returnがtrackよりsource上で前にある」ことを検査していた。

現在は実際にlocalStorage保存を成功/失敗させる。

- 保存失敗: 成功計測、engagement、成功toast、公開イベント、成功UIを出さない
- 通常成功: データ保存・計測・通知を一度ずつ確定
- サイレント成功: 保存と計測は行うが公開成功通知を出さない

### 地域URL優先

旧guardは `STATE.currentRegion = 'JP'` やlocalStorageアクセス文字列の有無を検査していた。

現在は、古い保存設定とURLを意図的に競合させて実際のstate/storage/navigation結果を確認する。

static guardとして残すのは「地域判断・保存責務を`region-navigation.js`へ集約し、`main.js`へ散らさない」というarchitecture boundaryのみ。

### 計算ファネル

状態管理を`js/calculator-funnel-analytics.js`へ分離した。

現在は次をbehavior contractとしている。

- 開始/完了は計算モードごとにdedupe
- validation errorは分類値だけを送る
- raw inputを計測APIへ渡さない
- mode change / diary openを適切に記録
- Consent拒否中はイベントだけでなくdedupe状態も汚さない
- pending中のdedupeは拒否確定時にリセットできる

#### この整理で見つかった実バグ

旧実装ではConsent拒否中の成功計算でも「完了済み」Setだけ更新され得た。

Analytics CoreがGA4送信を破棄してもdedupe状態は残るため、その後Consentを許可した最初の成功計算が抑止される可能性があった。

専用モジュールでは拒否中はdedupe状態も更新しない。

### third-party / AdSense

旧guardは `ANALYTICS_DELAY_MS = 1200` / `ADSENSE_DELAY_MS = 3000` / `fetchpriority` / private関数順序などをsource snapshotとして固定していた。

現在は時間・window load・idle・script成功/失敗・Analytics Consent・広告Consentを制御できるruntime integration testで次を確認する。

- AdSense libraryは早期取得
- Analyticsはload後もdelay/idleまで待つ
- GA scriptだけ低優先度
- Analytics Consentと広告枠Consentを独立管理
- 広告枠の二重push防止
- standalone分類
- GA4二重config防止
- AdSense失敗後の実際の再取得

#### この整理で見つかった実バグ

AdSense script取得失敗後も失敗した`<script>`がDOMへ残っていたため、再試行時に「既存script」と誤認し、ネットワーク再取得を行わない可能性があった。

`loadScript()`のerror時に失敗scriptを除去する最小修正で解消した。

### ブログ一覧

`blog-runtime-regressions.test.cjs`でprivate関数をsourceからsliceし、検索・件数・ページング・リセット・カテゴリ・ARIAの内部実装を固定していた重複テストを整理。

これらはBrowser smokeが実ブラウザで一連の操作を行うため、Browser smokeを主担当に一本化した。

## 実際に遭遇したTest brittleness

### VM Realm差

日記behavior testで、VM内オブジェクトとNode側オブジェクトのprototype差により、中身が同じでも`deepStrictEqual`が失敗した。

製品コードは変更せず、比較をplain JSONへ正規化した。

### 非公開関数をテストAPI化しようとした

地域テストの初版でprivate `getRegionPath`を直接露出させようとして失敗した。

テスト都合でprivate APIを契約化せず、公開`switchRegion()`を実際に呼んで遷移結果を確認する形へ修正した。

### Service Worker cache revision固定

正規buildでcache revisionが更新された際、テストfixtureが旧cache名をハードコードしていたため失敗した。

現行`CACHE_NAME`を`sw.js`からfixtureとして取得する形へ変更した。

## Generated artifact driftの扱い

asset hashが変わる変更では、手計算でHTML/SWを書き換えない。

1. 正規の`verify-build-output.cjs` / buildロジックで差分を生成
2. changed fileとchanged lineの範囲を検査
3. 想定外の差分があれば停止
4. 確定した正規生成物だけコミット
5. 一時診断workflowは最終差分から除去
6. 最後に正式full preflightを再実行

2026-08-19のthird-party変更では239 HTMLが版番号更新対象になったが、239ファイル・478変更行すべてが旧`third-party.js` revisionから新revisionへの置換だけであることを機械検査してから同期した。

## 今後の判断基準

新しいテストを書く前に次を確認する。

1. これはユーザー/外部から観測できるbehaviorか？ → 実行して検証する
2. これはCSP、deploy、生成HTML、architecture ownershipのような静的契約か？ → static guardでよい
3. 同じ保証をすでに別層のテストが持っていないか？
4. private関数名や完全一致コードを契約にしていないか？
5. 正しい実装変更でこのテストだけが赤くならないか？

迷った場合は「この実装文字列が存在すること」ではなく、**「何が壊れたらユーザー・収益・データ品質・運用に実害が出るか」**からテストを設計する。
