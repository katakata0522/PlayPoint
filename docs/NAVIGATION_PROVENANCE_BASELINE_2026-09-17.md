# 第2章 ナビゲーション遷移・生成元ベースライン

基準日: 2026-09-17

## 目的

第2章「リンク・地域・多言語整合性」でリンクを直し始める前に、**現在の公開サイトがどこからどこへ遷移し、その遷移をどの生成・書換処理が作っているか**を再実行可能な形で固定する。

この文書は人間向けの要約。機械判定の正本は `docs/NAVIGATION_PROVENANCE_BASELINE_2026-09-17.json`、1件単位の完全な遷移一覧はPR Gateの `navigation-provenance-inventory.json` / `.md` evidenceとする。

## 網羅範囲

2026-09-17の成功PR Gateで次を確認した。

| 対象 | 件数 |
|---|---:|
| 公開ファイル | 547 |
| 公開HTML | 398 |
| 生成元/正本を分類できたHTML | 398 / 398 |
| 未分類HTML | 0 |
| 静的ナビゲーション参照 | 17,703 |
| 内部静的参照 | 15,573 |
| 外部静的参照 | 1,375 |
| 公開runtime JS/CJS/MJS | 40 |
| runtime遷移式 | 7 |
| PWA platform参照 | 1 |
| 内部リンク切れ | 0 |
| 構造エラー | 0 |
| build/runtime依存グラフ走査 | 114 files |
| ナビゲーション信号を持つソース候補 | 66 files |
| 手動レジストリ外から自動捕捉 | 43 files |

`/` と `/index.html`、`/en/` と `/en/index.html` のような同一配信ページは別物として誤判定しない。初回監査でここを正規化できていなかったため107件の偽リンク切れが出たが、現在の基準では0件になっている。

## 地域の扱い

監査は表示言語だけでなくPlay countryとして以下を区別する。

- JP: `/`
- US: `/en/`
- KR: `/ko/`
- TW: `/tw/`
- HK: `/hk/`
- IN: `/in/`

HKは記事コンテンツについてTW、INはEN/USを既存fallbackとして利用するため、`HK -> TW` / `IN -> US` の記事・ゲーム導線は単純に「別localeだからバグ」としない。

## 遷移判定

- `same-region`: 同一Play country内の通常遷移。
- `declared-region-switch`: Play country切替UIからの意図した地域横断。
- `declared-content-fallback`: HK→TW / IN→US の明示したコンテンツfallback。
- `hreflang-cross-locale`: SEOメタデータの意図した相互参照。
- `likely-wrong-locale`: 日本語へ飛んでいるが、同じ行先のlocale版が実在する高優先レビュー候補。
- `japanese-fallback-review`: 日本語へ飛ぶが、同等localeページを機械的には確認できないため仕様判断が必要。
- `cross-region-review`: region switch以外の地域横断で仕様確認が必要。

**review候補は確定バグ数ではない。** 第2章の次PRで、生成元とUX意図を照合して「修正」「明示fallback」「共有ページ」のどれかへ確定する。

## 現在のレビュー候補

### 高優先: 237件

`localized-equivalent-exists`。locale版が実在するため、誤遷移の可能性が高い。

- **207件**: 非JPページから日本語 `/author/katakata.html` へ向く。EN/KO/TWにはlocale別authorページが存在するため、まず生成元を確認する。
- **30件**: amount / campaign / maintenance / status 系のlocaleページから、日本語の同等LPへ向く。対象は `amount/10000`、`campaign/2x`、`campaign/3x`、`campaign/wait`、`maintenance/platinum`、`maintenance/diamond`、`status/silver`、`status/gold`、`status/platinum`、`status/diamond` の各locale導線。

役割別では footer / header / related の比率が大きい。個別HTMLを直すのではなく、site shell・国際ナビ・関連記事・author導線の生成元まで遡る。

### 中優先: 293件

- `unexpected-japanese-fallback`: **233件**
- `cross-region-user-navigation`: **60件**

233件のうち **214件（privacy 107 + terms 107）** は海外ページから共通 `/privacy.html` / `/terms.html` へ向くもの。locale版が存在する高優先誤遷移とは別で、共有法務ページを維持するのか、locale別法務ページを用意するのかを先に決める。

60件の地域横断には、国・地域差比較、サイトマップ、attentionページ等から他地域へ進む意図的導線が混ざる。これも一律置換しない。

## 生成元・書換元の追跡

### 既知の主要生成/書換系

手動レジストリで、少なくとも次の系統を明示している。

- `scripts/build-html.js` — 全生成処理のオーケストレータ
- `scripts/language-page-builder.cjs` — EN/KO/TWトップ
- `scripts/region-page-sync.cjs` — HK/INトップ・地域展開
- `scripts/intl-seo-pages.cjs` — 国際記事/ハブ系生成
- `scripts/intl-content-expansion.cjs` — 国際コンテンツ展開
- `scripts/intl-game-guide-expansion.cjs` — 国際ゲーム記事
- `scripts/generate-game-simulators.cjs` — ゲーム計算機
- `scripts/intl-navigation-sidebar-v1.cjs` — 国際ヘッダー/Play country/Sidebar/次アクション
- `scripts/intl-article-layout.cjs` — 国際記事shell/breadcrumb
- `scripts/article-content-navigation-normalize.cjs` — CTA/関連記事
- `scripts/article-discovery-sync.cjs` — 記事探索導線
- `scripts/japanese-navigation-sidebar.cjs` — 日本語記事ナビ
- `scripts/*hreflang*` — canonical/hreflang相互参照
- `js/region-navigation.js` — 計算機のruntime Play country切替
- `blog/article.js` — 日本語記事runtime導線

### 自動探索による漏れ防止

手動レジストリだけでは「新しい生成スクリプトを書いたのに一覧へ登録し忘れる」可能性がある。そのため次も自動で辿る。

1. `scripts/build-html.js` からのローカル依存グラフ
2. 全398公開HTMLが実際に読み込むruntime script
3. その依存先
4. href / canonical / hreflang / region switch / breadcrumb / related / location / window.open / History API / form action / HTML書換の信号

現在は66ファイルを候補として捕捉し、うち43ファイルは手動レジストリ外から自動検出された。これは「43件の未処理」ではなく、**手動一覧に依存せず自動的に監査対象へ入った43件**を意味する。完全なファイル名はJSON baselineに固定する。

## runtime / PWA

静的HTMLだけでは捕まらない遷移も無視しない。

- `js/region-navigation.js`: JP / US / KR / TW / HK / IN の6地域
- `pwa-launch.html`: 保存地域から同じ6地域へ振り分け
- `blog/script.js`: 同一ページのquery state更新
- `js/points-cost.js`: 同一ページのquery state更新
- `js/share.js`: 動的な外部share target
- `js/calculator.js`: X/Twitter intent
- `games/game-sim.js`: X/Twitter intent
- `manifest.json`: `start_url` = `/pwa-launch.html` が実在することを確認

行先が式になっているものを静的解析で無理に決め打ちせず、`runtimeDestinationContracts` としてbaselineに固定する。

## CIで固定するもの

baseline JSONは単なる件数だけではなく、次のSHA-256 fingerprintも持つ。

- 全静的遷移
- ページ→生成元/書換元対応
- review候補集合
- 生成元候補カタログ
- runtime遷移式

そのため、件数が偶然同じままリンク先だけ変わった場合も差分を検知できる。

通常のPRでは、完全一覧をCI evidenceへ生成したうえで `scripts/navigation-provenance-baseline-check.cjs` がこのbaselineと比較する。意図した変更で差分が出た場合は、**baselineだけを機械的に更新せず、完全inventoryをレビューしてから**新しい基準へ更新する。

## 次PRの順番

1. 高優先237件を生成元単位で分解する。
2. まず207件のauthor locale誤遷移候補を、どのshell/sidebar/footer生成処理が作っているか確定する。
3. 残るlocale LP 30件を生成元へ遡って修正する。
4. privacy/terms 214件は「共有法務ページ」か「locale別ページ」かを先に仕様確定する。
5. cross-region 60件は国比較・地域切替・本当の誤遷移を分離する。
6. 修正ごとにbaseline fingerprintとChromiumを再確認し、意図しない地域横断を増やさない。

このPRでは上記の誤遷移候補そのものはまだ一括修正しない。**何を直すかを誤らないための観測・正本・回帰防止を完成させること**がスコープである。
