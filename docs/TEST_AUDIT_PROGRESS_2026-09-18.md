# PlayPoint テスト個別監査・修正チェックリスト（2026-09-18）

最新集計: **基準930ケース中663精査・267未精査**。以下の第3回記録は当時の証跡として保持し、第5回〜第17回を末尾へ追記する。

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

基準930コミットに存在した7ファイル39ケースを現行mainと照合した。対象ファイルは基準コミットと第9回完了時mainで同一内容。既精査336へ39を加え、**375精査・555未精査**とする。Wave 10自体はケース数を増減しないが、並行PR #353が基準930外の回帰1ケースをmainへ追加したため、マージ後の現行実行集合は**957ケース見込み**。

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


## 第11回: ゲーム固有価格・課金経路・深掘りガイド73ケース（2026-09-18）

### 集計

基準930コミットに存在した9ファイル73ケースを現行mainと照合した。対象ファイルは基準コミットとWave10完了時mainで同一内容。既精査375へ73を加え、**448精査・482未精査**とする。source regexだけを確認する重複1ケースを実sanitize behaviorへ統合するため、現行957ケースから静的計算上956ケース。

### ファイル別判断

| ファイル | 基準件数 | 判定 |
|---|---:|---|
| game-earn-rate-copy | 1 | 維持。generator sourceではなく公開成果物の旧倍率表現をguard |
| game-guide-article-hub | 13 | 12維持・1統合。17本/date/class/private regex snapshotをdata/behavior契約へ |
| game-guide-text-safety | 2 | 全維持。HTML escape/hidden region text extraction |
| game-seo-depth | 9 | 全維持。FGO/原神/モンスト/ブルアカ、HTML数値をGAME_SEO SSOT同期へ |
| game-seo-expanded | 15 | 全維持。Wave2 verification/fail-closed、HTML数値をSSOT同期へ |
| game-seo-wave3 | 10 | 全維持。verified mechanics/price pending分離、旧card全文を危険price claim guardへ |
| game-seo-wave4 | 9 | 全維持。Web/Google Play境界、guide値をWave4 SSOT同期へ |
| game-seo-wave5 | 11 | 全維持。任意source数/文字数/h2数閾値を除外し意味契約を維持 |
| rescued-pad-and-articles | 3 | 全維持。古いdesign class禁止だけ除外し救出記事/OGP保証を維持 |

### 変更したテスト設計

1. deep guide catalogは17件exactではなく、非空・ID/file一意・path/Role/manifest/filter/search同期を保証。
2. official verification dateは固定日ではなくcatalog.modifiedとverification registryの一致。
3. blog deep-guide inputはsource regex guardを削除し、実sanitizerの許可/拒否behaviorへ統合。
4. FGO/原神/モンスト/スタレ/ZZZ/ウマ娘/プロセカ/PAD/アークナイツ/HBR/崩壊3rd/ファンパレ/プロスピA/Pokémon GO/eFootballの生成HTMLは各SSOTから期待値を導出。
5. price未確認ゲームのfail-closedと旧固定price復活防止は維持。
6. Wave5のsource件数・HTML文字数・h2数を品質条件にしない。
7. 救出記事の#168 design class禁止はdesign ownerへ委譲し、台帳・著者・公式source・関連記事・OGPを保証。

公開コード・ゲームSSOT・記事本文・台帳・検索index・sitemap・workflowは変更していない。


## 第12回: 記事生成・日付・Role・ゲーム生成SSOT・FAQ同期64ケース（2026-09-18）

### 集計

基準930コミットに存在した16ファイル64ケースを現行mainと照合した。対象ファイルは基準コミットとWave11完了時mainで同一内容。既精査448へ64を加え、**512精査・418未精査**とする。ケース増減なしで現行956ケースを維持する。

### ファイル別判断

| ファイル | 件数 | 判定 |
|---|---:|---|
| article-content-navigation-normalize | 7 | 全維持。関連記事/scope/check-only/冪等/self-link rejection |
| article-date-contract | 6 | 全維持。100件超snapshot→実inventory件数一致 |
| article-role-context-required | 2 | 全維持。Role context必須/国際例外 |
| article-role-next-action-audit | 1 | 維持。全Role populated snapshotを除外、inventory cross-checkへ |
| article-role-registry | 6 | 全維持。Role definition/classification/fail-closed |
| blog-index-sync | 5 | 全維持。registry→static index/sitemap/PR pins |
| build-io-boundaries | 6 | 全維持。exact read counts→scope/write/idempotency |
| build-output-equivalence | 2 | 全維持。boundary-only normalize |
| build-pipeline-simplification | 2 | 全維持。exact call counts→minimum presence + dependency order |
| content-date-separation | 4 | 全維持。build/content date SSOT separation |
| editorial-summary-integrity | 3 | 全維持。marker cleanup/canonical block |
| game-page-locale-predicate | 3 | 全維持。canonical game locale predicate |
| game-page-ssot | 5 | 全維持。game outputs/sitemap/date/sync |
| game-seo-common | 6 | 全維持。exact I/O counts→scope/order/idempotency |
| localized-top-targets | 3 | 全維持。locale leaf SSOT |
| lp-faq-sync | 3 | 全維持。visible FAQ→FAQPage JSON-LD |

### 変更したテスト設計

1. 日付監査件数は100超ではなくgetArticleFilesの実inventoryと一致。
2. Article Role監査は全Role非空を要求せず、全記事が1Roleへ集計されfailure 0を保証。
3. Role監査対象数はlocale手書き一覧ではなく独立article inventoryと照合。
4. build I/Oはexact read回数ではなく対象外write禁止・write churn抑止・asset再評価・repeat idempotency・欠損fail closed。
5. build pipelineはhreflang/asset/game-hubのexact呼出回数ではなく必要工程の存在と依存順序。
6. game-seo-commonはread/write各1回ではなくscope/order/non-JA非干渉/repeat no-write。

公開コード・生成器・記事本文・Role定義・日付・FAQ・workflowは変更していない。


## 第13回: Site Shell・公開出力差分・runtime差分比較33ケース（2026-09-18）

### 集計

基準930コミットに存在した7ファイル33ケースを現行mainと照合した。対象ファイルは基準コミットとWave12完了時mainで同一内容。既精査512へ33を加え、**545精査・385未精査**とする。Wave13自体はケース数を増減しないが、並行PR #357が基準930外の回帰2件をmainへ追加したため、現行実行集合は**958ケース**。

### ファイル別判断

| ファイル | 件数 | 判定 |
|---|---:|---|
| lp-monetization-idempotency | 2 | 全維持。見出し全文snapshot→canonical managed structure |
| refactor-output-equivalence | 6 | 全維持。public byte-equivalence/隔離build/repeat差分の主owner |
| refactor-runtime-comparison | 4 | 全維持。任意case数閾値/特定source mutationを一般化 |
| site-shell-calculator-header | 5 | 全維持。6 target/4+4 item/ARIA map二重固定をregistry/semanticへ |
| site-shell-footer | 6 | 全維持。exact six-link/copyright year snapshotをsemantic profile contractへ |
| site-shell-header | 5 | 全維持。3 target/4 or 6 link countをregistry-drivenへ |
| site-shell-legal-nav | 5 | 全維持。checked件数をLEGAL_NAV_TARGETSから導出 |

### 実装側の最小改善

`renderCalculatorHeader` は従来「region buttons 4個かつheader links 4個」でないと例外にしていたが、この件数自体はUI意味契約ではない。非空配列・ARIA label必須・region ID一意・activeRegion有効を要求する形へ一般化する。現行6 calculator profilesの出力は変更しない。

### 維持した安全網

- Site Shell rendererとコミット済みheader/footerのbyte一致。
- drift repair後の冪等性。
- HK/IN fallbackがlocal game coverageと誤認させないこと。
- privacy/termsで偽の言語切替を出さないこと。
- public build outputのbyte-equivalence、symlink fail-closed、隔離build。
- runtime comparatorが数値・markup・required module regressionを実際に検出すること。
- required PR Gateがbase SHAとruntime/visual independent gatesを使用すること。

公開profile・表示文言・HTML・計算挙動は変更していない。今回のworkflow分類では条件付きbuild-refactor/runtime比較レーンは対象外でskipされ得るため、現行出力不変の正本はcomplete preflight内のbyte-canonical/idempotency契約とChromium結果とする。


## 第14回: 公開・CI 57基準ケース＋後発9ケース（2026-09-18）

### 集計

公開・CIカテゴリ10ファイルを精査。基準930に存在する8ファイル57ケースを既精査545へ加え、**602精査・328未精査**とする。後発のpreflight execution 8件とsyntax verifier execution 1件は現行品質として精査済みだが基準930進捗には加算しない。Wave14自体はケース数を増減せず、現行959ケースを維持する。

### 判断

- ci-guardrails 10: 全維持。retention 7日 / timeout 15分 / fetch-depth 2 exactだけbounded contractへ。
- ci-stability 11: 全維持。navigation retry ceilingをMAX_NAVIGATION_ATTEMPTS SSOTへ。
- deploy-cleanup 基準11→現行10: 基準11 identitiesを全精査。既存統合1件を確認し、retry 7/5 snapshotをshell policy連動へ。
- deploy-impact-classifier 基準7→現行9: 基準7＋後発2を全維持。
- deploy-revision-readiness 4、ogp-mime-deployment 2、public-deployment-tree 5、workflow-step-ids 7: 全維持。
- preflight-execution-contract 8、syntax-verifier-execution 1: 基準外後発だがbehavior中心で有効、全維持。

### 変更した設計

1. artifact retention / PR Gate timeoutは有限な安全範囲を検査し、1つの運用値に固定しない。
2. checkout depthはfull fetchまたはbase diff可能な2以上を許容。
3. navigation retry上限をCI helperのexported SSOTへ集約。
4. deploy retry回数はshellのDEFAULT/DEPLOY policyから導出し、有限範囲・main>=auxiliary・実transport停止回数を検証。

公開物・deploy先・retry実値・rollback仕様・allowlistは変更していない。

## 第15回: 計算・入力面31ケース（2026-09-18）

### 集計

基準930コミットに存在した4ファイル31ケースを現行mainの計算実装・地域設定・6地域公開HTMLと照合した。4ファイルは基準コミットとWave14完了時mainで同一内容。既精査602へ31を加え、**633精査・297未精査**とする。ケース数の増減はなく、現行959ケースを維持する。

### ファイル別判断

| ファイル | 基準件数 | 判定 |
|---|---:|---|
| calculator-input-validation | 3 | 全維持。有限値・HTML validity・厳しい入力境界をbehaviorで検証 |
| decimal-inputmode | 2 | 全維持。JP/EN/KO/TWだけだった対象を現行HTMLが同契約を満たすHK/INまで拡張 |
| interactive-input-surfaces | 7 | 全維持。21件以上というゲーム規模snapshotとJA/EN差分exact listだけを意味契約へ |
| playpoint-calculation-contracts | 19 | 全維持。次ランクonly・JP 5件・option index固定をconfig/valid transition/unique optionへ変更し、1728例・数式・丸め・KR単位は維持 |

### 変更したテスト設計

1. ゲームinventory件数は別ownerへ委譲し、入力面テストは存在する公開ゲームの入力UIを確認する。
2. JA/ENの入力差分は特定2パスのsnapshotではなく、maintenance LP＋`mode=main`導線という役割で許容する。
3. target optionの「1件/2件」「配列0/1番」を契約にせず、設定済み遷移に属する・必要な昇格先を含む・重複しないことを保証する。
4. status件数は5固定ではなくJP configから導出する。
5. ゴールド→プラチナ1728例は遷移labelで特定して維持する。
6. decimal/numeric keyboard契約を6地域へ補完する。

公開HTML/CSS/JS・計算式・copy・地域設定・保存形式は変更していない。

## 第16回: 地域コア10ケース（2026-09-18）

### 集計

基準930コミットに存在した4ファイル10ケースを、6地域公開HTML・地域生成器・runtime config・実ESM graph・Service Worker install要求と照合した。既精査633へ10を加え、**643精査・287未精査**とする。ケース数の増減はなく、PR #364後も現行959ケースを維持する。

### ファイル別判断

| ファイル | 基準件数 | 判定 |
|---|---:|---|
| attention-country-classification | 4 | 全維持。英文列挙1文の全文snapshotだけ除外し、6地域名・導線・公式確認・内容日を維持 |
| region-expansion | 1 | 維持。生成HK/IN成果物＋実runtime configへ集約し、config/navigation source regexを除去 |
| region-navigation-behavior | 4 | 全維持・変更なし。URL優先・保存・segment・実切替behavior |
| region-runtime-wiring | 1 | 維持。source shapeから実ESM graph・APP_MODULE_FILES・SW install precacheへ置換 |

### 変更したテスト設計

1. 6地域の案内を特定の英文1文ではなく、地域名＋一意なdestinationで保証する。
2. HK/INのrate unit・通貨位置・tooltips・URLは読み込まれたruntime configを検証する。
3. 地域切替URLのownerはregion-navigation behaviorへ一本化し、region-expansionでsource文字列を再検査しない。
4. result navigationの配線はimport文の引用符やobject literal形状ではなく、Node自身が解釈したactive ESM dependency graphで検証する。
5. HK/INトップのoffline install境界は実Service Worker runtimeのaddAll要求を検査する。
6. 廃止済みregion-result-navigationの復活だけは二重owner防止の明示guardとして残す。

公開HTML/CSS/JS・地域条件・copy・計算式・保存形式は変更していない。

## 第17回: 地域セレクタ・静的言語整合20ケース（2026-09-18）

### 集計

基準930コミットに存在した4ファイル20ケースを、6地域公開HTML・first-view behavior owner・active ESM graph・必須Chromiumのregion layout smokeと照合した。既精査643へ20を加え、**663精査・267未精査**とする。ケース数は増減せず現行959ケースを維持する。

### ファイル別判断

| ファイル | 基準件数 | 判定 |
|---|---:|---|
| region-selector-semantics | 13 | 全維持。source/pixel二重固定を整理し、first-paint/touch/flag/accessibility契約を維持 |
| top-page-language-integrity | 5 | 全維持。HK/IN tracked topをwidget/feed/chart/language leakへ追加 |
| en-locale-hygiene | 1 | 維持。英語India `in/`も監査対象へ |
| global-error-localization | 1 | 維持。HK/INのstatic langを追加し6地域化 |

### 変更したテスト設計

1. browser-language推薦の意味は既精査first-view behavior ownerへ委譲し、compatibility→first-viewの実ESM依存だけをregion-selector側で確認する。
2. mobile 5列/1行・active色・desktop geometryは実Chromium ownerへ委譲し、具体的CSS値をNodeで重複固定しない。
3. 44px touch target、critical first-paint ordering、OS emoji非依存、localized accessible nameは静的契約として維持する。
4. top-page language integrityは生成3言語とHK/IN tracked outputを分けて検査し、生成方式の違いをテストへ漏らしすぎない。
5. English hygieneへIndiaを追加。
6. pre-init error用static html langをJP/US/KR/TW/HK/INの6地域へ補完。

公開HTML/CSS/JS・デザイン・copy・地域挙動は変更していない。
