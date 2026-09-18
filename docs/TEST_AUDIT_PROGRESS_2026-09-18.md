# PlayPoint テスト個別監査・修正チェックリスト（2026-09-18）

最新集計: **基準930ケース中375精査・555未精査**。以下の第3回記録は当時の証跡として保持し、第5回〜第10回を末尾へ追記する。

基準: `katakata0522/PlayPoint` / `d46527f7f1adf692c1d5dc881d7ed186052f0ce6`。作業単位: R01/R02/S07の残件と、既存Service Worker 6ケース。

## 集計と完了境界

前回台帳 `TEST_AUDIT_PROGRESS_2026-09-17.md` / 同名JSONは履歴として保持する。前回74ケースに、新たに一つずつ確認した既存SW01〜SW06の6ケースを加え、**基準930ケースの精査済みは80、未精査は850**。R01/R02/S07の再確認や新規テストを二重加算しない。

現在の実行集合は**943ケース / 171ファイル**。S07を1から4ケースへ分離し、SW07〜SW12を6ケース追加したため934から9増加。圧縮後は2ファイル18ケースで、943の一部を再実行する。件数を品質目標や固定閾値にはしない。

本書は実装・ローカル検証の記録。最終PR HEADのCI、マージ、公開SHAと保存成果物は対応PRの完了記録を根拠とする。未実行のCI・本番を先に成功と記載しない。

## 個別チェックリスト

| ID | 判定 | 処置・保証と境界 |
|---|---|---|
| R01 | 既精査・改善完了 | 能動的なESM依存グラフ21モジュールとinstall時の先読みURLを照合。必要7モジュールの内容変更でcache世代が変わることも実行確認。引用符・コメント・re-export経由の同義変更を許容。 |
| R02 | 既精査・改善完了 | configの実import、SWの実先読み、ブログ起動時に挿入されたCSS URLを、独立に求めた内容SHA256の版と照合。共通CSSの二重挿入を防ぎ、圧縮対象のJS混入も拒否。 |
| S07 | 既精査・改善完了 | 文字列検査を4ケースへ置換。実地域判定を含む登録モジュールを実行し、6地域のroot URL・HTTP cache不使用・更新確認、idle/timer遅延、未対応、拒否を分離。 |
| SW01 | 今回精査・維持改善 | 実installでreload要求とskipWaitingを確認。addAll拒否でinstallが失敗する保護を維持。FakeRequestのinstanceofという私的な実装固定を外した。実ブラウザのCache.addAll原子性を模擬証明しない。 |
| SW02 | 今回精査・維持 | 実activateが現行世代と他アプリのcacheを削除しないことを確認。削除APIの実行結果・多タブ更新は別範囲。 |
| SW03 | 今回精査・補完 | GET/同一origin/許可destinationの境界を維持。HEAD・API・音声/動画/worker等の拒否と、許可6種の対になる成功を追加。 |
| SW04 | 今回精査・維持 | 画面遷移はcacheがあってもnetwork-first。追跡query除去と取得内容の保存を確認。保存失敗との混同はSW07で修正。 |
| SW05 | 今回精査・維持 | 通信失敗時の同一ページ→トップのfallbackを維持。両方欠損時の拒否はSW09へ補完。 |
| SW06 | 今回精査・補完 | 静的資産では版vを保持し追跡queryを除去する。異なる版同士の混線をSW12で補完。 |
| SW07 | 新規・実装修正済み | 閲覧中のcache open/match/put失敗で正常なnetwork応答を失わない。document/scriptの6条件で確認。初回installへは緩和を適用しない。 |
| SW08 | 新規・実装修正済み | 静的cache hitはnetworkを待たず返す。再取得と保存を同期dispatch中のevent.waitUntilへ渡し、保存完了まで寿命を保持。遅延Promiseで実時間待ちを避ける。 |
| SW09 | 新規・実装修正済み | 静的再取得失敗で既存cacheを返し、cache missは元の通信エラーで明示拒否。undefinedを正常応答と扱わない。 |
| SW10 | 新規・補完 | 404/503・opaque/cors応答を正常cacheへ保存しない。HTTP応答とネットワーク例外を混同しない。 |
| SW11 | 新規・補完 | 初回installのcache open拒否は失敗のまま。skipWaiting/claimしない。閲覧中のbest-effort保存とは別契約。 |
| SW12 | 新規・補完 | 古いvのcacheがあっても新しいvの通信失敗を古い資産で代替しない。追跡query差は同版として扱う。 |

## 再現した本体の問題と修正

旧sw.jsへ新しい異常条件を与えると、取得済みの正常なページがcache open/put失敗で失われた。また、静的cache hit後の再取得・保存はevent.waitUntilに結び付いていなかった。テストだけを都合よく変更せず、実証したsw.jsの責務分離を最小限修正した。

閲覧中のCache APIは補助保存として失敗を隔離し、通信成功をそのまま返す。通信自体が失敗した時だけfallbackする。静的資産の再取得と保存はwaitUntilで追跡し、cache missの応答側には元の通信エラーを伝える。installの必須先読みは従来通り失敗させる。

## 主担当と重複の整理

- `runtime-module-guards.test.cjs`: 実モジュールグラフ・内容版・実先読みURL・CSSローダー。R01/R02の文字列代理を置換し、S07に重複していた資産版保証を集約。
- `static-calculator-delivery.test.cjs`: S07は実登録APIの動作に限定。`runtime-esm.cjs`はNodeのネイティブESMパーサー／リンカーで公開ソースをそのまま実行する。import/exportの正規表現置換や地域判定関数のスタブ化はしない。
- `service-worker-behavior.test.cjs`: 実sw.jsのイベントハンドラー、失敗伝播、保存／再取得の寿命を制御可能なCache/fetch fixtureで確認。既存VMをhelperへ移しただけで、SWを独自再実装しない。
- `.github/scripts/browser-smoke.cjs`: 既存のChromium上での登録・制御・オフライン計算・日記の遅延読込検証を引き続き必須とする。VM成功を実ブラウザ成功とは呼ばない。

## ローカルの実行証跡

- Node v22.16.0 / Linux。CI固定Node v22.23.2とは区別する。リモートmainのtree `23762a301bb6458a57e4c368156728327594e114` と、復元した全ソースのgit treeが完全一致してから編集した。
- 接続先GitHubの読み取りで基準SHAを確認。ローカル復元cloneにはoriginがないためai-sync-preflightは失敗した。利用者PCのdirty状態を確認したとは扱わない。
- 新規異常条件を旧sw.jsへ適用: 12中8成功・4失敗。既存6ケースは成功するのに異常条件を見逃していたことを確認。
- 重点3ファイル: 30ケース成功。全回帰の逐次実行: 943/943成功、失敗・cancelled・skip・todoは0。
- 通常complete preflight: 全工程成功。全回帰943/943、圧縮後18/18。初回のコマンド時間上限による中断を成功扱いにせず、通常コマンドを完走した最終ログとphase記録を保存。検証条件・並列数・workflowは変更していない。
- 故障／同義変更14試行: 正常な4変更は成功、故障10変更はassertion失敗。全試行でcancelled/skip/todo=0。タイムアウトや未完了を「故障を検出した」と数えない。

### 比較実験の一覧

| 同義変更で成功（4） | 故障で失敗（10） |
|---|---|
| importの引用符・コメント整形 | 必須importをコメントだけにする |
| 登録モジュールをre-export経由へ変更し版・先読みも正しく同期 | 計測importをコメントだけにする |
| 登録変数の改名・オプションの同義整形 | configとSWを同じ古い計測hashへ揃える |
| SWの私的関数名を変更 | 共通CSSのhref設定をコメント化 |
| — | update呼出をコメント化 |
| — | 実地域判定からHK/INを除外 |
| — | updateViaCacheをnoneからallへ変更 |
| — | 背景処理のwaitUntilをコメント化 |
| — | 保存失敗を再throwする |
| — | 資産版vをcache keyから消す |

すべて一時コピー上で実験し、本番への故障注入・外部通信・SSH操作をしない。検証用helperはtests配下にのみ配置し、依存追加や恒久workflow追加はしない。

## 非変更・残件・次の順序

**公開側の変更はsw.jsだけ**。HTML/CSS、見た目、計算式、1728例、記事、日記の保存形式、広告・同意・法務、権限、CI/性能閾値は非変更。Cache key形式・APP_MODULE_FILES・資産版・installの必須条件は変更していない。復旧はこのPRをrevertし、通常の検証・公開経路を通す。

未完了として残すもの:

1. **S08**: Apacheの未版／正しいv／その他queryの実HTTP比較。今回のService Worker確認で代替したとは扱わない。
2. 実ブラウザの多タブ・多世代の更新、Cache.addAllの取得途中失敗、実quota不足の統合検証。今回のVMはこれら全体の再現ではない。
3. R04/R06/R07/R08等の未改修の文字列ガード、UI・同意・広告、CIの有効YAML/if条件、remote snapshot/cleanup、未精査850ケース。

次はS08の公開HTTP契約を小単位で確認し、その後UI・同意・広告へ進む。未精査項目の一括削除や、テストを通すための公開デザイン変更は行わない。


## 第5回: 計測・同意・広告69ケース（2026-09-18）

### 集計

基準930コミットに存在した11ファイル69ケースを現行mainと照合した。対象ファイルは監査開始時mainと基準コミットで同一内容。既精査80へ69を加え、**149精査・781未精査**とする。新規・移動先テストを二重加算しない。

### ファイル別判断

| ファイル | 件数 | 判定 |
|---|---:|---|
| consent-state | 7 | 全維持。Consent状態機械のbehavior owner |
| analytics-core | 10 | 全維持。不正paramsと検索free textの汎用ownerへ統合 |
| third-party-analytics-integration | 7 | 全維持。GA4/AdSense/Consentの統合owner |
| calculator-funnel-behavior | 7 | 全維持。dedupe/Consent/raw値遮断 |
| calculator-funnel-analytics | 3 | 維持。#2だけprivate実装固定を除去 |
| third-party-resilience | 2 | 全維持。外部依存の一時失敗復旧 |
| analytics-runtime-attribution | 2 | 全維持。gtag置換時のattribution |
| analytics-state-boundaries | 2 | 全維持。壊れたstateと有限queue |
| article-navigation-observability | 12 | 8維持、1性能ownerへ移管、3を既存ownerへ統合 |
| monetization-search-quality | 9 | 全保証維持。広告境界のprivate callback名固定だけ緩和 |
| measurement-baseline-contract | 8 | 全維持。2026-09-15監査証跡owner |

### 変更したテスト設計

1. `analytics-core` の既存privacyケースへ、不正必須paramsと「検索語は捨てるがresults_countは残す」対照を吸収。
2. `article-navigation-observability` から、結果リンク分類・不正params・search free textの同層重複3ケースを削除。性能ケースは削除ではなく`ci-performance-sampling`へ移管。
3. `ci-performance-sampling` は `lighthouse-suite.PAGES` を直接検証し、EN/KO/TWの測定route・budget・workflow起動境界を所有。
4. `calculator-funnel-analytics` はprivate変数名やDOM文字列の不存在を要求せず、mainから専用trackerへの最小architecture boundaryだけ残す。
5. `monetization-search-quality` は特定callback名の完全一致をやめ、代表公開面が共通runtimeへ接続し、広告用途がConsent boundaryを通ることを確認する。

PR #345時点の保存TAPは961/961。今回の静的ケース計算は958だが、最終件数と合否はこの変更のPR Gate成果物を正本とする。公開コード・広告ID・Consent実装・数式・UI・保存形式・workflow・性能閾値は変更していない。


## 第6回: 計算機UI・first view・結果導線41ケース（2026-09-18）

### 集計

基準930コミットに存在した8ファイル41ケースを現行mainと照合した。対象ファイルは基準コミットと第5回完了時mainで同一内容。既精査149へ41を加え、**190精査・740未精査**とする。実装方式2ケースを1 behaviorへ統合するが、基準ケースの精査件数は41のまま二重加算しない。

### ファイル別判断

| ファイル | 件数 | 判定 |
|---|---:|---|
| main-calculator-ui | 4 | 全維持。主画面の必要入力・冪等layout・6地域copy・初期input contract |
| mobile-first-view-contract | 9 | 全保証維持。source regex 3箇所をnode再利用behaviorへ、bootstrapを実inline実行へ、配信をESM/SW実行へ変更 |
| mobile-first-view-intro | 4 | 全維持。全文snapshotとSEOキーワード順を外し、first-view意味・短さ・static/runtime一致をowner化 |
| calculator-result-guidance-visibility | 1 | 維持。render後のdetails外表示順 |
| playpoint-result-contracts | 8 | 全維持。6地域DOM順と実CONFIG値へ強化 |
| result-navigation-config | 5 | 2実装方式ケースを1汚染防止behaviorへ統合。6地域/全リンク/coverageは維持 |
| share-behavior | 4 | 全維持。共有URL生成・復元・不正値拒否 |
| ui-runtime-behavior | 6 | 全維持。keyboard/reduced-motion/error locale/runtime link解決 |

### 変更したテスト設計

1. first-view runtimeはprivate API名や特定DOM操作の不存在ではなく、既存の計算入力nodeを再生成しない結果で検証する。
2. first-view bootstrapは公開6地域のinline scriptを実行し、main×倍率1超だけopenになることを検証する。
3. first-view module deliveryは実ESM依存、asset revision入力、実Service Worker install precacheを照合する。
4. 日本語introは全文一致をやめ、短さ・改行なし・計算意図・static/hydration一致を検証する。title/metaのキーワード順はUI ownerから外す。
5. 結果DOM順をJP/US/KR/TWだけでなくHK/INまで拡張し、details見出しはconfig source文字列でなく読み込んだ6地域CONFIGを検証する。
6. result navigationの同一instance/deep freeze固定を廃止し、外部変更が後続取得へ漏れないbehavior 1件へ統合する。

第5回後958ケースから1件純減し、静的計算上957ケース。最終件数・合否はこの変更のPR Gate保存TAPを正本とする。公開コード・UI・copy・数式・保存形式・workflowは変更していない。


## 第7回: 記事探索・ブログ一覧・内部回遊30ケース（2026-09-18）

### 集計

基準930コミットに存在した6ファイル30ケースを現行mainと照合した。対象ファイルは基準コミットと第6回完了時mainで同一内容。既精査190へ30を加え、**220精査・710未精査**とする。今回はケース数の純減なしで、現行957ケースを維持する。

### ファイル別判断

| ファイル | 件数 | 判定 |
|---|---:|---|
| article-discovery-retention | 11 | 全維持。検索・anchor・本文抽出・読書リスト・URL正規化はbehavior。diary週/outcome reportも必要だが別責務 |
| blog-listing-ux | 7 | 全維持。taxonomyのカテゴリ数固定とprivate animation名固定だけ除外 |
| info-return-navigation | 2 | 全維持。同一origin referrerとfallback地域の安全な実script behavior |
| internal-link-targets | 4 | 全維持。属性順完全一致を意味ベースのhref/target/rel契約へ変更 |
| japanese-navigation-sidebar | 3 | 全維持。role別next action、関連記事、本文/SEO非干渉 |
| top-article-calculator-funnel | 3 | 全維持。CTAのcopy snapshotを外し、回答順・destination・prompt重複防止を維持 |

### 変更したテスト設計

1. ブログ一覧のゲーム名filterは記事カテゴリ数に依存させず、filter一覧の重複なし/有効値と実filter behaviorを確認する。
2. 記事可視性はprivate animation関数名の不存在ではなく、初期CSSで主要カードを不可視にしないこととBrowser smokeに委ねる。
3. 内部リンクsame-tab化は正規化後タグ文字列の属性順ではなく、href維持・target除去・無関係rel維持を確認する。
4. 上位記事CTAは本文の特定フレーズではなく、記事役割に応じた回答後の配置と計算機destinationを確認する。
5. growth-critical-pages / japanese-guide-brandはUIではなくSEO/ブランド責務として後続精査へ回し、今回の30件へ加算しない。

公開コード・記事本文・表示文言・検索ロジック・保存仕様・workflowは変更していない。


## 第8回: SEO・公開整合・ブランド51ケース（2026-09-18）

### 集計

基準930コミットに存在した13ファイル51ケースを現行mainと照合した。対象ファイルは基準コミットと第7回完了時mainで同一内容。既精査220へ51を加え、**271精査・659未精査**とする。今回はケース数純減なしで、現行957ケースを維持する。

### ファイル別判断

| ファイル | 件数 | 判定 |
|---|---:|---|
| growth-critical-pages | 4 | 全維持。CTA owner重複を外し、critical articleのruntime/検索意図へ責務を限定 |
| japanese-guide-brand | 3 | 全維持。ブランドSSOT・OGP・記事header・Feed整合 |
| all-article-quality-audit | 4 | 全維持。35文字閾値だけ廃止し、構造/公式source/JSON-LD/placeholder防止を維持 |
| article-seo-normalize | 6 | 全維持。FAQ/robotsの実変換behavior |
| author-hreflang | 2 | 全維持。author alternate clusterと冪等性 |
| human-sitemap-task-hub | 2 | 全維持。copy/emoji/60リンク閾値を外しtask destinationsとfull-list排除を維持 |
| manual-lp-hreflang | 4 | 全維持。manual LP clusterとFAQ責務分離 |
| navigation-source-map | 8 | 全維持。100ページ/40工程/先頭末尾関数/private実装固定を外し、完全走査とownershipを維持 |
| ogp-mime-contract | 1 | 維持。JPEG固定配信と実bytesの一致 |
| public-navigation-contract | 4 | 全維持。全リンク・locale crossing・fragment実監査 |
| seo-head-audit-parser | 4 | 全維持。entity/JSON-LD parser regression |
| seo-hygiene | 7 | 全維持。sitemap scope/重複/意味整合 |
| sitemap-information-hierarchy | 2 | 全維持。copy snapshotを構造・一意hrefへ置換 |

### 変更したテスト設計

1. growth-criticalのCTA配置は第7回ownerへ譲り、SEO側はcanonical・analytics/article runtime・query intentを担当。
2. 全記事meta descriptionは任意の35文字下限ではなく、非空・placeholder/template残存なしを保証。
3. human sitemapは主要task destinationとfull article list非生成を保証し、emoji/heading copy/総リンク数は自由にする。
4. navigation source-mapは規模の数値閾値を捨て、非空inventory・6locale・未分類0・実generator/pipeline捕捉を保証。
5. scannerの内部RegExp使用可否、pipelineの先頭/末尾関数名を契約にしない。
6. sitemap hierarchyは具体的文言ではなくH1→目的説明→secondary groups、比較リンクは一意href＋非空labelを保証。

公開コード・記事本文・ブランド・metadata・sitemap/feed・workflowは変更していない。


## 第9回: Play Points本体の公式事実・ランク・獲得率65ケース（2026-09-18）

### 集計

基準930コミットに存在した8ファイル65ケースを現行mainと照合した。対象ファイルは基準コミットと第8回完了時mainで同一内容。既精査271へ65を加え、**336精査・594未精査**とする。ループ生成テストを実行時件数で数え、source declaration数だけで過少計上しない。既精査ownerへ重複1ケースを統合するため、現行957ケースから静的計算上956ケース。

### ファイル別判断

| ファイル | 基準件数 | 判定 |
|---|---:|---|
| about-playpoints-current-official | 4 | 全維持。更新日exact snapshotのみSSOT一致へ変更 |
| article-fact-regression | 27 | 全維持。一次情報の範囲を超える断定防止へ調整し、週次/Pass/ランク/期限等の事実回帰を維持 |
| campaign-lp-meaning-consistency | 4 | 全維持。倍率入力への回帰を拒否 |
| common-pages-fact-ux | 6 | 5維持・1統合。6地域の公式数値へ拡張、混在static testを公開意味へ縮小 |
| latest-hub-operations | 12 | 全維持。private source固定をSSOT equality / VM behaviorへ変更 |
| status-lp-meaning-consistency | 6 | 全維持。特別獲得率意味と週平均復活防止 |
| status-platinum-meaning | 2 | 全維持。Platinum意味/表示契約 |
| trust-pages-consistency | 4 | 全維持。実配信の広告/affiliate/terms/sitemap契約 |

### 現行公式との照合結果

- 通常ウィークリー: シルバー以上・金曜更新。
- Play Pass週次: 日本を含む対象地域・木曜更新。
- Play Pass加入Gold特典: 仏/独/米/英のみ、日本は対象外。
- 日本の獲得対象公式ページは、新ページと旧URLの現行ページでGoogle Oneの列挙有無に差があるため、特定サービス名ではなく公式source boundaryを契約にする。
- HKを含む5レベル地域と、DiamondのないIndia 4レベルを含め6地域の数値を検査する。

### 変更したテスト設計

1. aboutページの更新日は固定日ではなく内容日SSOTと公開4表現の一致。
2. getting-started/subscription/YouTube PremiumはGoogle One exact wordingではなく、公式source URLと未確認サービス非断定を保証。
3. Play Pass articleは日本の木曜週次と加入Gold特典の対象国を別制度として明示的に検査。
4. common-pagesの地域数値を6地域へ拡張し、巨大mixed testからprivate calculation実装・game/affiliate別責務を外す。
5. app module revision重複1件を既精査runtime-module-guardsへ統合。
6. latest hubはcontent-dateのsource変数名を固定せずSSOT equality、Consentはactual components VM実行で保証。

公開コード・記事本文・数式・保存形式・workflowは変更していない。


## 第10回: 記事構成・台帳・コンテンツ役割39ケース（2026-09-18）

### 集計

基準930コミットに存在した7ファイル39ケースを現行mainと照合した。対象ファイルは基準コミットと第9回完了時mainで同一内容。既精査336へ39を加え、**375精査・555未精査**とする。ケース数純減なしで現行956ケースを維持する。

### ファイル別判断

| ファイル | 件数 | 判定 |
|---|---:|---|
| article-content-audit-regression | 8 | 全維持。記事主回答/事実境界/ID一意/再生成冪等 |
| article-quality-polish | 6 | 全維持。author profile 60件以上という件数snapshotだけ除外 |
| changelog-hygiene | 2 | 全維持。version固定を外し先頭Latest 1件へ |
| content-structure | 10 | 全維持。4カテゴリ/3クリック/private source/design class固定を意味契約へ |
| jp-cash-conversion-intent | 2 | 全維持。全文copy snapshotを現金化/PayPay intentへ |
| play-points-content-evolution | 7 | 全維持。公式記事群の役割分離・台帳一意 |
| tw-rank-cost-intent-boundaries | 4 | 全維持。copy snapshotをowner/threshold/destinationへ |

### 変更したテスト・preflight設計

1. カテゴリは4種類exactではなく、公開記事台帳と静的記事ハブのcategory cluster同期を保証。
2. 301統合はredirect/registry/sitemap/canonicalをownerとし、統合先の特定copyを固定しない。
3. Article Roleの全件最終監査は専用ownerへ任せ、content-structureはprompt生成unit behaviorへ限定。
4. クリック深度は3を推奨値として観測し、未到達のみhard fail。prepare-pr/preflightの表示名も「到達性・クリック深度観測」へ変更。
5. deep URLはthird-party runtimeのprivate実装ではなく公開HTMLのroot-relative配信を確認。
6. knowledge boundaryは特定grid禁止ではなく見出し＋説明を保証。
7. author profile件数、changelog version番号、JP/TW記事の見出し/CTA全文snapshotを除去。

公開コード・記事本文・台帳・redirect・sitemap・計算式・保存形式は変更していない。
