# PlayPoint テスト個別監査・修正チェックリスト（第2回）

対象リポジトリ: `katakata0522/PlayPoint`。基準コミット: `cdf5e2999719edf8e96cafeeca3a205cd9364fae`。

## 完了単位と集計

前回46ケースの監査で確認した具体的な問題を修正し、次のCI・公開境界28ケースを一つずつ精査した。**基準930ケースに対する個別精査は74、未精査は856**。新規ケースや移動で番号がずれるため、旧P/R/S、今回CI/D/CのIDを継続し、現行TAP番号だけで同一性を判断しない。

本書の「改善済み」はこのPRの実装とローカル検証の状態。必須PR Gate・本番適用・最終SHAの根拠は対応PRのChecksと完了コメントを参照する。未実行のCIや本番確認を先に成功とは扱わない。

| 項目 | 状態 |
|---|---|
| 前回の6実験（E1〜E6） | 正常・異常を区別する実装へ移行し、比較を再実行済み |
| 全回帰 | ローカル934/934成功。旧ケースの無条件廃止で減らす施策ではない |
| 圧縮後 | 現行2ファイル15ケースが成功。934の一部の再実行 |
| 次のCI/Deploy | 28ケース精査、CI05/CI09/D01/D02/D05/C03を改善・統合。他は下表で残件を明示 |
| 公開ソース | HTML/CSS/利用者向けJS、計算式、1728の例、保存形式、広告・同意・法務は非変更 |
| 公開経路 | preflightは既存classifier上の配信入力なので通常のPR/Deploy経路で確認。強制dispatch/判定変更はしない |
| 復旧 | 本PRの変更をrevertする。個々の安全条件や性能閾値を下げて通すことはしない |

## 今回の重点対応

- [x] E1/R05: コード長の疑似保証を4言語の実ブラウザ計算へ置換。150と1500を区別する。
- [x] E2/P21: CSS記法固定を結果の実表示検証へ置換。コメントは許し、単列化・数値分断は落とす。
- [x] E3/S05: 説明と記事の存在・一意性・順序を先に確認し、-1比較を解消。
- [x] E4/S08: 有効な条件付きCache-Control宣言を検査。全コメント化・条件反転・誤対象を拒否。
- [x] E5/R02: 引用符だけの制約を除き、CSS対象定義・資産定義・実資産の版を照合。残る文字列ガードの集約は未完。
- [x] E6/S04: インラインCSSの空白固定を外し、静的DOMと320/390/1024pxの表示へ移行。
- [x] R03: 改行同値の対になる「実内容が違えばhashも違う」を追加。
- [x] P04/D01/D02: 秘密漏出、subdirの誤除外、別管理領域の削除の故障を実rsyncで確認して統合。
- [x] P06/P13/CI05: 本物のpreflight entrypointを実行し、コマンド順序・対象集合・失敗伝播を確認。
- [x] P08: 構文検査CLIへ壊れた運用JSと必須ファイル欠損を与えて確認。
- [x] 必須の圧縮後テストが欠けた時、existsSyncで黙って減らさず失敗。集合0件も拒否。
- [x] C03: 正解を実装の集合から取り出す循環を解消。未知rootのfail-closedとCLIの区切り入力も追加。
- [x] CI09: 配信工程がない場合の-1比較を拒否。
- [ ] R01/R02/S07の資産参照とSW動作の残る集約。
- [ ] S08のApache実HTTP（未版・有効v・その他query）比較。静的検査で代替済みとは扱わない。
- [ ] CIの有効YAML構造・if条件、remote snapshot/cleanupの動作移行。
- [ ] 未精査856ケースの個別レビュー。

## 検証方法と限界

Nodeはローカルv22.16.0。必須CIはリポジトリ固定v22.23.2で実施する。OS/Node差を同一環境とは呼ばない。ローカルのURLナビゲーションは `ERR_BLOCKED_BY_ADMINISTRATOR` で拒否されたため、サイト全体のローカルChromium成功は主張しない。ポリシー変更やホスト切替は行っていない。ウィジェット単体とCSS/DOMの入力fixtureは通信しないオフラインの実Chromiumで検査し、実サイトの統合は通常のPR Gateへ委ねる。

rsync検査ではSSH/rsync/sleepをPATH限定スタブに置換し、本物の転送scriptを起動して引数を取得する。remote heredocは読み捨て、実行しない。そのフィルターだけを実rsyncで一時フォルダー間に適用する。これをXserverのsnapshot/cleanupを実行した証拠とは扱わない。Windowsのbash/rsyncケースは明示skipし、Linux CIで検証する。

Apacheの補助検査は現行のHeader/FilesMatch/正のQUERY_STRING regexという限定された宣言契約である。Webサーバー全体の独自エミュレーターではなく、未知の式を成功扱いにしない。HTTP側の検証を削除しない。

最初のローカル全体実行は、一時workflowの削除がGit indexに未反映だったためrepository-integrityで停止した。indexを最終差分へ揃え、テスト条件を変えず全934件と圧縮後15件が成功。

## 前回46ケースの修正状況

| ID | 状態 | 主担当／今回の処置・残件 |
|---|---|---|
| P01 | 未着手 | `tests/playpoint-product-guards.test.cjs` — HTMLを構造として読み、og:imageをURL解決して対応資産の存在を検証する。対象は公開中の著者ページへ広げる。 |
| P02 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 公開導線・禁止済み同意表現の静的検査と、許可／拒否／再設定の動作検査を分ける。既存法務文言は監査を理由に変更しない。 |
| P03 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 共通APIを通す配置規則は残し、許可・拒否時の送信やパラメータ除去を動作で検証する。内部識別子だけを主な保証にしない。 |
| P04 | 統合済み | `deploy-cleanup D01` — 転送スクリプトを偽transportで起動して引数を捕捉し、実rsyncを二つの一時フォルダー間で実行。rootの除外漏れ・同名subdir過剰除外・別管理領域削除を検出。workflowの起動境界は残す。 |
| P05 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 現行のCSSのみ圧縮方針はそのままに、変換前後の資産集合・JSの許容差分・参照URLの整合性を実データで確認する。JS圧縮解禁を勝手に行わない。 |
| P06 | 置換済み | `preflight-execution-contract` — 圧縮後の構文検査の実行と、その失敗が配信境界を止め全体を失敗にすることをVM＋実phase runnerで確認。 |
| P07 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 一時ディレクトリ上の生成結果・追跡成果物差分・公開treeを検査し、未同期なら失敗する契約にする。起動境界の最小静的チェックは残す。 |
| P08 | 置換済み | `syntax-verifier-execution` — 本物のCLIへ運用JSの構文エラーと必須ファイル欠損を与え、失敗することを検証。非対象docs/testsは別fixtureで維持。 |
| P09 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 公開中の地域一覧から初期HTMLの見出し・タブを調べ、利用者向け文言と意味を確認する。属性の並びは不問にする。 |
| P10 | 未着手 | `tests/playpoint-product-guards.test.cjs` — workflowの構造と条件を確認する主担当に集約し、ミラー→検証→verifiedの実行契約をテストする。 |
| P11 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 必要な順序と起動条件を構造解析で確認し、実処理の失敗は統合fixtureで検証する。 |
| P12 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 変更パス→期待する検査／公開の表形式テストへ集約する。検証実行と本番再配信を別に扱う。 |
| P13 | 統合済み | `preflight-execution-contract` — 全量一度→圧縮→構文→配信境界という実行と集合を確認。全930件という固定値は追加しない。 |
| P14 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 実際の対象定義をデータとして読み込んで全対象を調べる。実行用定義の検証と本番HTTPの確認は区別する。 |
| P15 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 地域・ページ役割から必要な代表対象を定義し、実行対象集合と照合する。全398ページを毎回ブラウザで開く設計にはしない。 |
| P16 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 国・通貨・レートの対応は独立した仕様値として守る。説明文の校正を全文固定と切り離す。意味の正しさを単純な単語検出で証明したことにしない。 |
| P17 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 実際の解決後URL・表示名の非空・地域の整合を主に検証する。装飾絵文字は契約から外す候補。 |
| P18 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 250の初期条件と1728の特定組合せを独立したケースで残し、画面上の出し分けを確認する。FAQの意味は保ち、校正で不要に落とさない。 |
| P19 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 初期HTMLをDOMとして検査し、開閉は操作で確認する。tooltip数は宣言された対象要素と対応させ、9という本数自体を要件にしない。 |
| P20 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 現行6枚の仕様は変更せず、itemsPerPageとスケルトン数が一致する関係を検査する。読み込み後の置換とnoscript導線は動作・DOMで確認する。 |
| P21 | ブラウザへ置換 | `browser-smoke / calculator-presentation-contract` — 実結果を展開し、項目と値の対応・はみ出し・値内部の分断を測定。CSSコメントを許し、単列化・spanブロック化を拒否する。 |
| P22 | 未着手 | `tests/playpoint-product-guards.test.cjs` — CSS構文検査とtooltipの初期非表示／表示操作へ分離する。特定のhoverルール形状を要求する目的は再確認する。 |
| P23 | 維持 | `tests/playpoint-product-guards.test.cjs` — 目的と検査を維持する。必要originの確認と、許可が広すぎないことの確認は別保証として扱う。HTTP上の実ヘッダー検査も残す。 |
| P24 | 未着手 | `tests/playpoint-product-guards.test.cjs` — DOMのアクセシブルな名前を確認し、対応地域を網羅する。方式ではなく読み上げ名と対象の結び付きを検査する。 |
| P25 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 現在の画像仕様は維持し、metaを構造的に読む。画像実寸・形式との一致を検査し、必要なら対応6地域へ展開する。 |
| P26 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 現在の遅延読込方針は守り、実importとpreloadの解決URL集合を比較する。ハッシュ表記だけでなく同一資産であることを確認する。 |
| P27 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 現行の通知削減という判断を維持し、可視通知の重複とカレンダー登録の操作を確認する。ID自体は連携上必要な場合のみ残す。 |
| P28 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 海外利用者向けの英語案内という現行仕様を守り、DOM属性・computed表示・到達URLを検証する。 |
| P29 | 未着手 | `tests/playpoint-product-guards.test.cjs` — 説明文の確認と、生入力の外部送信を防ぐ動作検証を分ける。リンクはDOMで解決する。法務・プライバシー表現を勝手に変更しない。 |
| P30 | 未着手 | `tests/playpoint-product-guards.test.cjs` — スクロール0の状態で許可／拒否／待機を与え、共通ローダーの呼出と広告枠要求を観測する。収益を守る目的を削らない。 |
| R01 | 一部改善・残あり | `runtime-module-guards` — 今回R02と共通の資産パス確認で引用符だけの制約を緩和。main・precacheを実依存データで照合する移行は未完。 |
| R02 | 一部改善・残あり | `runtime-module-guards` — cssTargetsとService Worker資産定義を実データとして参照。実資産の版とprecache/importを照合。引用符変更を許容。残るsource包含と主担当集約は次回。 |
| R03 | 改善済み | `runtime-module-guards` — LF/CRLF同値だけでなく、内容変更でhashが変わる対照を追加。 |
| R04 | 未着手 | `tests/runtime-module-guards.test.cjs` — 公開対象台帳に沿って能動的なresource参照を検査し、必要ならCSS import等も見る。説明文や非公開資料に文字があるだけで落とさない。 |
| R05 | ブラウザへ置換 | `embed-widget-smoke` — 4言語で通常／逆算を実操作。空・負・上限超過・ゼロを区別。想定外のresource取得を拒否。空実装と10倍誤計算は失敗、コード長は不問。 |
| R06 | 未着手 | `tests/runtime-module-guards.test.cjs` — 案内ジェネレーターの言語入力→解決URLを表形式で実行し、コピー計測の同意・生値除去も検証する。 |
| R07 | 未着手 | `tests/runtime-module-guards.test.cjs` — 許可済みイベントを実APIへ渡し、許可時に規定の分類値だけが送られることを検証する。 |
| R08 | 未着手 | `tests/runtime-module-guards.test.cjs` — region-navigationの動作テストを主とし、mainの起動から実際に呼ばれる結線も確認する。最小限の依存境界だけ静的に残す。 |
| S01 | 未着手 | `tests/static-calculator-delivery.test.cjs` — 現在も呼ばれる変換の互換性は維持する。旧形式だから不要と判断せず、入力値・ラベル関連付け・既存属性の保存を確認する。 |
| S02 | 未着手 | `tests/static-calculator-delivery.test.cjs` — 最終DOMを独立に読み、入力・ラベル・任意設定の存在／関連付けを確認する。共有CSS等の参照で必要な構造と私的命名を区別する。 |
| S03 | 未着手 | `tests/static-calculator-delivery.test.cjs` — 通常率／特別率という意味・通貨単位・編集可否を保ちながら、静的翻訳の主担当へ集約する。HK／INは対応仕様を別途確認して補完する。 |
| S04 | 改善済み | `static-calculator-delivery / browser-smoke` — 静的DOMの欠損・重複・順序を独立確認。320/390/1024pxで実際のボタンと操作欄を見る。display:contentsの正しい実装を誤拒否しない。 |
| S05 | 改善済み | `static-calculator-delivery / browser-smoke` — 説明と記事見出しの存在・一意性・順序を確認。コメントの変更は許容。ブラウザでもsection本文・記事リンクを確認する。 |
| S06 | 維持 | `tests/static-calculator-delivery.test.cjs` — 現行の実行検証を維持する。置換結果の件数や未対応言語の挙動は必要に応じた追加候補。 |
| S07 | 未着手 | `tests/static-calculator-delivery.test.cjs` — 資産参照URLの一致は共通検査へ、register引数・update呼出はserviceWorkerを置き換えた隔離実行へ分離する。 |
| S08 | 一部改善・残あり | `static-calculator-delivery / apache-cache-contract` — コメント内だけの宣言、FilesMatchの誤対象、QUERY_STRING条件反転・無条件immutableを拒否。静的な有効宣言の契約であり、Apache全体や全queryの実HTTPを模倣・証明しない。HTTP比較の追加は残件。 |

## 次の28ケース：個別判定

行番号とテスト名は基準コミットのもの。ファイル名だけで承認せず、各assert・実行経路と副作用を確認した。

### CI01 — 必須PR GateがローカルChromium検証を所有し、Standalone Browser SmokeをActions登録しない

`tests/ci-guardrails.test.cjs`（基準L19）。**維持・構造改善候補**。

必須6ブラウザ検証の起動境界は必要。文字列がコメントや無効stepにある場合の解析は今後YAMLの有効step検証へ。

### CI02 — PR Gateは失敗を隠さない検査専用ゲートで、Deployだけが配信用アセットを保持する

`tests/ci-guardrails.test.cjs`（基準L43）。**改善待ち**。

失敗を隠さない・配信用差分を通常PRへ残さない目的は維持。teeの書式、15分、7日を一体固定せず実行・保存・予算を分離する。

### CI03 — Deployは本番非公開のtests・docs・tools変更だけでは起動しない

`tests/ci-guardrails.test.cjs`（基準L58）。**改善待ち**。

tests/docs/toolsの除外はコスト境界。paths-ignoreの有効scopeを解析して文字の所在だけに依存しない検証へ。

### CI04 — AI同期プリフライト本体は非公開toolsに置き、公開ミラーから除外する

`tests/ci-guardrails.test.cjs`（基準L66）。**改善待ち**。

非公開toolsへの責務委譲は必要。wrapperの実行と公開treeの除外を主担当にし、requireの引用符固定は移行候補。

### CI05 — preflightは本番同期前に鮮度・記事正規化・全送信URL Headを検証する

`tests/ci-guardrails.test.cjs`（基準L75）。**置換済み**。

preflightの実entrypointと実phase runnerをVMで実行。外部コマンドだけを捕捉し、--fresh/--checkと圧縮前実行を観測。

### CI06 — Deployはproduction Chromiumをverified前に所有し、ブラウザ準備失敗では本番を触らない

`tests/ci-guardrails.test.cjs`（基準L108）。**維持・構造改善候補**。

ブラウザ準備→配信→検証→verifiedの境界は必要。全markerの存在確認済み。工程の表示名固定は残る。

### CI07 — 検証・復旧専用workflowの変更だけでは本番Deployを起動しない

`tests/ci-guardrails.test.cjs`（基準L130）。**維持・構造改善候補**。

重複した自動workflowを復活させないコスト境界。trigger/pathの有効構造確認への移行は残る。

### CI08 — Deployは変更影響を判定して本番処理を一括でゲートする

`tests/ci-guardrails.test.cjs`（基準L146）。**改善待ち**。

変更影響で本番操作を一括制御する必要がある。現在はif表記を固定。条件評価fixtureへ移行候補。

### CI09 — 本番Chromium失敗はverified前かつproduction mutation後なので自動rollback対象になる

`tests/ci-guardrails.test.cjs`（基準L174）。**改善済み・構造改善残**。

mirror欠損時のindexOf=-1を拒否する存在確認を追加。復旧条件やstep構造の本格的な統合は別途。

### CI10 — 退避したBrowser Smokeレシピはlocal・productionの手動再確認手順を保持する

`tests/ci-guardrails.test.cjs`（基準L193）。**維持**。

退避recipeが自動登録されず手動local/production用途を残す保証を維持。archive内容そのものの起動試験は別責務。

### D01 — デプロイは公開物だけを厳密にミラーし、除外物も本番から削除する

`tests/deploy-cleanup.test.cjs`（基準L15）。**置換済み**。

専用script→実argv→実ローカルrsyncで機密除外、旧物除去、同名subdirの保持、別管理領域保護を確認。P04とD02の保証を吸収。

### D02 — 別リポジトリ管理の公開領域を厳密ミラーの削除対象から保護する

`tests/deploy-cleanup.test.cjs`（基準L46）。**D01へ統合済み**。

manner/kanji-slicerの実ファイルを残せることをD01で確認。protectの一重引用符を固定する同層重複を除去。

### D03 — デプロイ前snapshotはverified本番だけを公開領域外へ1世代退避する

`tests/deploy-cleanup.test.cjs`（基準L58）。**改善待ち**。

verified snapshot、SHA一致、symlink拒否、atomic入替と復旧の目的は残す。snapshot-history等の実I/O ownerを全文照合してから統合。今回はremote heredocを実行していない。

### D04 — 移設済み・非公開・統合済みの旧パスをXserver上の実体で検査する

`tests/deploy-cleanup.test.cjs`（基準L84）。**改善待ち**。

旧公開物・秘密の不存在は必要。文言/パスの所在だけでなく、remote検査のfixture実行へ移す。今回のD01はrsync除外だけでこの検査全体の代替ではない。

### D05 — Xserverの一時的なSSH障害は本体ミラーだけ長めに、snapshot・後続処理は短めに再試行する

`tests/deploy-cleanup.test.cjs`（基準L116）。**置換済み**。

5種類の通信エラーからの再試行成功、非通信エラー即時停止、mirror7回とsnapshot/cleanup/status5回の上限、待機上限を実scriptで観測。remote通信はスタブ。

### D06 — 接続後にXserver応答が止まってもSSHとrsyncが無期限に待たない

`tests/deploy-cleanup.test.cjs`（基準L140）。**改善待ち**。

SSH keepalive/rsync I/O有限待機は必要。代入文字列・出現2回より、各モードの捕捉argvの実値へ移行する候補。

### D07 — 本番SSHは公開鍵だけを使い、転送・TTY・鍵残存を許さない

`tests/deploy-cleanup.test.cjs`（基準L148）。**改善待ち**。

鍵限定、TTY/転送無効、鍵削除は必要。文字があるだけの保証を有効argv/後処理scopeへ移す。権限や設定は緩和しない。

### D08 — GitHub Actionsのjob timeoutは失敗時の自動復元・再検証まで途中で打ち切らない

`tests/deploy-cleanup.test.cjs`（基準L176）。**再評価待ち**。

50分下限は現行の復旧完遂意図。有限retryと全経路最大時間に対応付け、実測なしに縮小も増加も行わない。

### D09 — 旧calculatorファイルを持たず301転送だけを維持する

`tests/deploy-cleanup.test.cjs`（基準L182）。**改善待ち**。

旧URL→301と旧実体不在は必要。RewriteRule一字一句でなく代表URLの結果・query保持のHTTPfixtureへ移行。

### D10 — 全階層のindex.htmlを階層を保った正規URLへ301転送する

`tests/deploy-cleanup.test.cjs`（基準L187）。**改善待ち**。

全階層index正規化は必要。コメント内の規則や同義regexを区別するHTTPfixtureへ。

### D11 — デプロイスクリプトのBash構文が有効である

`tests/deploy-cleanup.test.cjs`（基準L193）。**維持**。

bash -nによる実構文検査は維持。Windows非互換skipとLinux CI必須実行を区別。

### C01 — 公開ミラーへ実際に入る変更は本番Deploy対象にする

`tests/deploy-impact-classifier.test.cjs`（基準L12）。**維持**。

代表的な公開パスを独立した期待値で判定し、実装の一覧そのものから正解を作っていない。

### C02 — 品質検査・文書・非公開ツールだけの変更では本番Deployしない

`tests/deploy-impact-classifier.test.cjs`（基準L26）。**維持**。

非公開・検証専用変更だけで不要な配信をしない境界を維持。

### C03 — 配信成果物を実行時に変える非公開ビルド入力はDeploy対象にする

`tests/deploy-impact-classifier.test.cjs`（基準L52）。**改善済み**。

実装のDEPLOYMENT_INPUTSをそのまま期待値に使う循環を解消。17の現在の配信入力を独立列挙し、preflightを集合から消す故障を検出。

### C04 — 品質検査と公開変更が混在する場合は安全側でDeployする

`tests/deploy-impact-classifier.test.cjs`（基準L62）。**維持**。

公開/非公開が混在しても公開変更を捨てない。

### C05 — rsyncで除外するルート管理ファイルはDeploy対象にしない

`tests/deploy-impact-classifier.test.cjs`（基準L74）。**維持**。

root管理ファイルの非公開判定は独立した例で維持。

### C06 — Windows形式と相対パス表記を正規化する

`tests/deploy-impact-classifier.test.cjs`（基準L88）。**維持**。

Windows/相対表記の正規化を維持。preflightの対象パスにもPOSIX表記を採用し、Windowsで必須検査が誤欠損にならないよう修正。

### C07 — 不正な入力は黙って判定しない

`tests/deploy-impact-classifier.test.cjs`（基準L94）。**維持**。

配列以外・非文字列要素で明示失敗。全入力の網羅とは扱わない。

## 次回の着手順

1. P05/R02/S07の残る配信資産・Service Workerの責務を結び直す。実データ同期と登録/updateの動作を先に検査し、旧文字列ガードを後で引き継ぐ。
2. P19/P22/P24/P30の可視性・tooltip・アクセシブル名・広告接続を既存ブラウザ/同意検査と照合する。広告や見た目を勝手に変えない。
3. CI/Deploy下表の残件を動作検証へ移行し、必要な起動・安全境界は残す。
4. その後に計算系の未精査へ進む。記事・翻訳・保存の未精査を完了済みと混ぜない。

## 件数の扱い

本数は品質指標ではない。7つの旧Nodeケースを既存/新しい責務へ引き継ぎ、9つのNodeケースと2つの補助検査ケースを加え、930→934となった。16→15の圧縮後差分はR05の計算保証を必須ブラウザへ移したため。CI時間の削減率・広告収益効果は測定していない。
