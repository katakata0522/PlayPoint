# Analytics measurement plan

## 目的

計算機や記事が利用者の問題解決につながっているかを判断する。入力した課金額、必要ポイント、日記内容などの個人情報になり得る値は送信しない。

## GA4イベント

| Event | Trigger | Properties | Decision |
| --- | --- | --- | --- |
| `purchase_comparison_opened` | モンストの購入先比較を初めて開いた時（1ページ1回） | `game_id=monst`, `region=JP` | 購入先比較の発見。通常のゲームポイント計算と分ける |
| `purchase_comparison_completed` | 明示的な比較操作で有効な結果を初めて表示した時（1ページ1回） | `game_id=monst`, `region=JP` | 比較の実利用。入力額・特典価値・個数・結論は送信しない |
| `calculation_completed` | 通常計算が成功した時 | `calculation_mode`, `region`, `target_status`, 流入属性（該当時のみ） | ランク計算の利用状況と記事・LPからの完了率を判断する |
| `reverse_calculation_completed` | 逆算が成功した時 | `calculation_mode`, `region`, 流入属性（該当時のみ） | 逆算機能の需要と記事・LPからの完了率を判断する |
| `calculator_form_started` | 通常計算・逆算で最初の入力/変更/送信があった時（各モード1ページ1回） | `calculation_mode`, `region`, `start_field`, 流入属性（該当時のみ） | 記事・LP別のクリック→計算開始率を判断する |
| `calculator_funnel_completed` | 各モードで最初の計算成功時（各モード1ページ1回） | `calculation_mode`, `region`, 流入属性（該当時のみ） | 記事・LP別の計算開始→初回成功率を判断する |
| `calculator_validation_error` | 明示的な計算操作が入力エラーで失敗した時 | `calculation_mode`, `region`, `error_type` | どの種類の入力エラーが計算完了を妨げているか判断する |
| `calculator_mode_changed` | 通常計算・逆算・日記のタブを実際に切り替えた時 | `region`, `from_mode`, `to_mode` | モード間の移動需要を判断する |
| `diary_tab_opened` | 日記タブをそのページで初めて開いた時 | `region`, `open_surface` | 日記を開いた人のうち保存へ進む割合を判断する |
| `diary_entry_saved` | 週次日記の保存が成功した時 | `region`, `entry_type` | 継続利用の有無を判断する |
| `article_to_calculator_clicked` | 記事から計算機へ移動した時 | `source_path`, `link_context`, `destination_path` | コンテンツがツール利用へつながったか判断する |
| `article_navigation_click` | EN / KO / TW記事のNavigation / Sidebar v1導線を押した時 | `source_path`, `target_path`（同一originのみ）, `component`, `locale`, `article_role`, `article_category`, `destination_type`, `link_position` | Next step / Popular / Related / Author / Browse / headerのうち、どの導線が次行動に使われているか判断する |
| `lp_to_calculator_clicked` | 検索意図別LPから計算機へ移動した時 | `source_path`, `source_surface`, `link_context` | どのLPとCTAが計算開始につながるか判断する |
| `lp_related_link_clicked` | LP内の関連記事/関連ページ導線を押した時 | `source_path`, `target_path`, `link_context` | LP内の回遊導線を残すか改善するか判断する |
| `result_related_article_clicked` | 計算結果下の関連記事を押した時 | `source_path`, `target_path`, `target_status`, `calculation_mode`, `link_position` | 計算完了後に次の読了/理解へ進めているか判断する |
| `result_decision_link_clicked` | 計算結果下の判断導線を押した時 | `source_path`, `target_path`, `target_status`, `calculation_mode`, `link_position` | 計算後にキャンペーン比較・反映確認・購入前チェックへ進めているか判断する |
| `share_url_copied` | 計算結果URLのコピーに成功した時 | `calculation_mode`, `region`, `target_status` | 共有URLが実際に使われる導線か判断する |
| `share_x_clicked` | X共有ボタンを押した時 | `calculation_mode`, `region`, `target_status` | SNS共有の需要を判断する |
| `calendar_reminder_added` | Googleカレンダーを開いた時、またはiCalの作成に成功した時 | `region`, `calendar_type` | 金曜の再訪導線が使われているか判断する |
| `pwa_install_accepted` | 日記保存後のインストール案内を承諾した時 | `region`, `install_surface` | 日記利用者の再訪手段としてPWAが有効か判断する |
| `widget_code_copied` | ウィジェットコードのコピーに成功した時 | `theme`, `language`, `mode` | 配布機能の需要と利用構成を判断する |
| `widget_referral_landed` | 埋め込みウィジェットから計算機へ到着した時 | `region`, `entry_surface` | 配布ウィジェットが本体利用へつながるか判断する |
| `web_vital` | ページを離れる時にLCP/INP/CLSを観測できた場合 | `metric_name`, `metric_rating`, `metric_value_bucket`, `page_group`, `release_version` | 実際の利用環境で速度悪化したページ群とリリースを特定する |

`article_navigation_click` はリンク文言・記事タイトル・自由入力を送らず、有限の分類値だけを送る。`component` は `site_identity / global_nav / breadcrumb / region_switch / next_step / popular / related / author / katakatalab / browse`、`locale` は `en / ko / tw`、`article_role` と `article_category` は既存のArticle Role / guide taxonomyに合わせる。外部のKatakataLab導線では `target_path` を送らず、`destination_type=external_profile` だけを記録する。これにより内部リンクのアンカー文言や利用者入力がGA4へ流れないようにする。

分類値の制限はイベント単位で適用する。既存の日本語ブログ `article_click` の `article_category` は海外ナビの分類に変換せず保持し、計算結果リンクの `internal / external / official_google_support` も維持する。海外記事内のアンカー移動は `section`、一般の外部リンクは `external` として内部記事への遷移と区別し、外部URLは送らない。必須項目の欠落や不正な引数は例外にせず、そのイベントを送信しない。

`calculator_form_started` と `calculator_funnel_completed` は通常計算・逆算ごとに1ページ1回だけ送る。`calculation_completed` / `reverse_calculation_completed` は従来どおり再計算のたびに送るため、利用回数は既存イベント、開始→初回成功率はファネル専用イベントで判断する。入力した金額・ポイント数そのものはファネルイベントへ送らない。

`calculation_completed` と `reverse_calculation_completed` には、外部キャンペーンURLに `utm_source`, `utm_medium`, `utm_campaign` がある場合のみ `entry_source`, `entry_medium`, `entry_campaign` を追加する。記事・検索意図別LPから計算機へ移動した場合は、同意済みセッション内に `entry_source_path`, `entry_link_context`, `calculator_preset` を最大30分だけ保持する。計算機側で最初に流入情報を参照した時点で sessionStorage からページ内メモリへ移し、`calculator_form_started` と `calculator_funnel_completed` にも同じ記事・LP起点を付与する。`calculation_completed` / `reverse_calculation_completed` への起点付与は最初の1回だけとし、再計算による水増しを防ぐ。ページを離れるとページ内メモリは破棄されるため、後続の別訪問へ同じ起点を持ち越さない。サイト内リンクにはUTMを付けず、ページ階層とCTAの位置から流入面を判定する。入力された課金額、必要ポイント、獲得ポイント、日記本文などの値は送信しない。

イベント名とパラメータは `js/analytics-core.js` の許可リストで統一する。同意マネージャ読込前は最大20件だけをメモリに保留し、拒否時は保留イベントと流入情報を破棄する。

## Conversion

`calculation_completed` を主要Key eventとする。2026-09-15のread-only GA4 Admin API監査で登録済みを確認した。`reverse_calculation_completed` は逆算利用も主要成果として追う場合だけ追加する任意Key eventで、同日時点では未登録。

GA4管理画面ではセッション/ユーザー単位も併記し、繰り返し計算による水増しと区別する。

### GA4管理画面での設定

1. 「管理」→「データの表示」→「イベント」を開く。
2. `calculation_completed` がキーイベントとしてマークされていることを確認する。
3. 逆算利用も主要成果として追う場合のみ `reverse_calculation_completed` もキーイベントにする。
4. 公開後7日間は「レポート」→「エンゲージメント」→「イベント」で、計算完了数とユーザー数を併記する。
5. 同じ利用者の再計算があるため、イベント数だけを訪問者数として扱わない。

## 検証

1. GA4 DebugViewを開く。
2. 通常計算、逆算、日記保存、記事から計算機への移動を各1回実行する。
3. `/campaign/2x/`, `/campaign/3x/`, `/amount/10000/` から計算機CTAと関連記事リンクを各1回クリックする。
4. 計算結果のコピー、X共有、関連記事クリック、判断導線クリックを各1回実行する。
5. Googleカレンダー、iCal、日記保存後のPWA追加、ウィジェットコードコピー、ウィジェットからの流入を各1回実行する。
6. イベントが各1回だけ表示されることを確認する。
7. 課金額、必要ポイント、獲得ポイント、日記の入力値がパラメータへ含まれないことを確認する。
8. スマホ幅とPC幅、同意状態ごとに重複送信がないことを確認する。
9. ページを操作して別タブへ移動し、`web_vital` に値そのものではなく `metric_rating` と `metric_value_bucket` だけが入ることを確認する。
10. 記事と検索意図別LPから計算機へ移動して計算し、流入属性が最初の完了イベントだけに付くことを確認する。
11. EN / KO / TWの代表記事で Next step / Popular / Related / About Katakata / KatakataLab / Browse / Play country を1回ずつ操作し、`article_navigation_click` が有限分類だけで届くことを確認する。
12. `article_navigation_click` にリンク文言、記事タイトル、課金額、必要ポイントが含まれないことを確認する。

### DebugViewの完了条件

- 同意前・拒否後はイベントが送られない。
- 同意後は通常計算1回につき `calculation_completed` が1回だけ届く。
- `neededPoints`、課金額、獲得ポイント、日記の入力内容がパラメータに存在しない。
- `web_vital` は `LCP`、`INP`、`CLS` のうちブラウザで観測できた指標だけが届く。
- 上記を本番と同じGA測定IDで確認した日付を、この文書の末尾に追記する。

## Measurement Readiness

実装と自動テスト上は計測可能。`calculation_completed` のKey event登録、`entry_source_path` / `entry_link_context` / `calculator_preset` に加え、2026-09-19に `app_display_mode` もGA4のEVENT scope Custom Dimensionとして登録済み。登録には一度限りの `analytics.edit` を使い、成功確認後に権限とmaster pushトリガーを撤去して通常のread-only監査へ戻した。残る「運用前確認中」はDebugView実測だけとする。サイト内導線は外部集客用UTMから分離済みで、GA4のセッション参照元を上書きしない。

2026-11-16のDebugView実受信で、共有URLの入力金額が標準パラメータ `page_location` に残ることを確認した。現在はこの入力値除外と同意境界の受け入れが未完了であり、以下の実測結果に従ってIssue #180をopenのまま維持する。

同日のDraft PR #809では、共有復元を保持した入力URL除外の修正候補を作成し、隔離環境の実Googleタグ要求でも改善を確認した。公開サイトへの反映・反映後のDebugView・実際の地域別CMPの受け入れは未実施であり、公開環境の完了状態とは区別する。

### 2026-08-11 本番点検（当時の状態）

- 本番トップで測定ID `G-HED6D0FR4L` の `gtag.js` と同意管理スクリプトの読み込みを確認した。
- 実装・回帰テストでは、通常計算の成功時に `calculation_completed` を1回呼び、許可済みの分類値だけを送ることを確認した。
- 当時はGA4プロパティ側のキーイベント指定とDebugViewでの受信確認が未確認だった。

### 2026-09-15 本番点検

- `calculation_completed` Key event: **確認済み**。
- `reverse_calculation_completed` Key event: 任意・未登録。
- `entry_source_path` / `entry_link_context` / `calculator_preset`: Custom Dimension登録を確認済み。
- 2026-09-01〜2026-09-07のData API集計は `calculator_form_started=36`、`calculation_completed=70`、`reverse_calculation_completed=7`、`calculator_funnel_completed=28`。
- `app_display_mode` は公開コードから送信しているが、2026-09-10監査時点ではGA4 Custom Dimensionとして未登録。したがってstandalone利用者は0ではなく取得不可。
- DebugViewでの実ブラウザ受信、raw値非送信、同意前/拒否後の挙動は未完了。コード側の回帰テストを実測の代替にしない。
- 変更前Baselineは `scripts/measurement-baseline.cjs` の `phase2-pre-change-2026-09-15` と `docs/MEASUREMENT_AUDIT_2026-09-15.md` を正本とする。

### 2026-09-19 本番点検

- `app_display_mode`: **GA4 EVENT scope Custom Dimensionとして登録済み**。trend-reporter の一度限りWorkflow run #62 が成功し、登録後は一時的な `analytics.edit` scope とmaster push triggerを撤去して `analytics.readonly` 運用へ戻した。
- `PlayPoint Analytics` の `🩺データ鮮度・システム状態` では、GA4 Realtimeが **2026-09-19 22:01 JST** に更新成功、状態 `REALTIME`、連続失敗 `0`。
- GA4 Intraday / AdSense Intraday / 今日ページ別も **2026-09-19** の暫定データを取得し、連続失敗 `0`。
- `📊ページ価値ファネル` は対象期間 **2026-08-18〜2026-09-16**、状態 **OK**。GSC click-weighted joinは **89.1%**（GSC clicks 1499 / joined clicks 1336）、absolute URL keyは `0`。
- DebugViewでの実ブラウザ受信、raw値非送信、同意前/拒否後の挙動は引き続き未完了。API、Sheet、回帰テストをDebugView実測の代替にはしない。
- Issue #180 は **DebugView固有の最終確認だけを残してopen継続**する。

### 2026-11-16 DebugView本番実受信（受け入れ未完了）

Windows上の既存Chromeログインを使い、GA4プロパティ `489079798` / 測定ID `G-HED6D0FR4L` のDebugViewとGoogle Tag Assistantを照合した。Gitの比較基点はmain `fc6d91a0715f2230f5369e67327a89c82882a878`。操作対象は公開済みの静的サイトで、入力は必要ポイント137、金額23,456円という架空の試験値だけを使用した。

| 確認項目 | 結果 | 根拠・残る条件 |
| --- | --- | --- |
| 実ブラウザからのイベント受信 | 確認済み | 通常計算、逆算、共有コピー、X共有ボタン、関連記事、判断導線のイベント名をDebugViewで確認 |
| 入力値が送信パラメータに含まれない | 不合格 | 共有URLからの訪問で、`page_location` に架空の入力金額 `amount=23456` が残った |
| 同意前・拒否後に送信されない | 未実施 | この日本向け環境では実効的な `analytics_storage=denied` の前提を再現できなかった |
| 確認日・結果の文書化 | 本節に記録 | 入力値除外と同意境界の最終受け入れが通るまでIssue #180は閉じない |

#### 確認した受信と共有URLの問題

次の6イベントを実受信した。

- `calculation_completed`
- `reverse_calculation_completed`
- `share_url_copied`
- `share_x_clicked`
- `result_related_article_clicked`
- `result_decision_link_clicked`

共有コピーは画面の成功通知とDebugView受信を照合した。X共有は入力画面を開くところまでで、投稿は行っていない。関連記事・判断導線は既存の内部記事へ移動した。試験には再入力と画面遷移があるため、この受信一覧だけで全経路・全端末の重複送信がないことまでは保証しない。

通常URL上の対象イベントでは、独自パラメータに入力金額・必要ポイント・獲得ポイント・日記本文の項目は見つからなかった。ただし、標準パラメータを含む実送信全体は不合格となった。次のURLはすべて架空の試験値である。

```text
https://playpoint-sim.com/?mode=reverse&status=1&multiplier=1&amount=23456
```

この共有URLを開いた後、DebugViewで以下を確認した（日本時間）。

- **14:25:57** の `reverse_calculation_completed`: `page_location` が上記URLと一致し、`amount=23456` を含んだ。
- **14:29:31** の `share_url_copied`: 画面を通常計算へ切り替えた後も、`page_location` に同じURLが残った。

独自イベントの許可リストだけでは、Googleタグが付加するページURL内の入力値を除外できていない。共有URLで計算条件を復元する機能を保持しつつ、計算用クエリが `page_location` や参照元などの送信コンテキストへ入らないよう対処し、同じ実受信経路で再検証する必要がある。`page_referrer`、必要ポイントを含む別の共有URL、日記保存イベント本体の実操作検証は今回未実施である。

#### 同意境界の未実施範囲

通常の日本向け表示では `analytics_storage=granted` を確認した。既存のプライバシー設定ボタンを操作し、さらにGoogle公式の公開済みメッセージ用プレビュー `?fc=alwaysshow&fctype=gdpr` を表示して「同意しない」を1回選択したが、Tag Assistantの最新ページ全体では `analytics_storage=granted` のままだった。この状態での送信を、実効的な拒否後の試験やEEAでの実測とは扱わない。

同意前・拒否後のイベント非送信は、実効状態がpending / deniedになる正規の対象環境で、実ブラウザの通信とDebugViewを照合するまで未実施として残す。メッセージの強制表示は外観確認用であり、地域判定や同意状態の再現を保証しない。測定ID、GA4フィルタ、CMP公開設定、ネットワークや地域の設定、認証権限は変更していない。

#### 検証の境界

同じmainに対する直前のローカル監査では、analytics-core / state-boundaries / runtime-attribution / calculator-funnel / third-party integrationの既存32検査が成功し、失敗・skipは0だった。これはVMスタブの結果であり、今回見つかった実受信URLの問題や未実施の同意境界を合格に変更しない。スマートフォン実機・別ブラウザでの受け入れは未実施。

今回の変更はこの文書だけで、公開HTML/JS、DB、GA4・広告・CMPの設定には変更していない。本番測定IDへは架空の試験データだけを送信し、実投稿・購入・日記保存・広告クリックは行っていない。ブラウザ内の直近計算の保存動作により137ptの試験値は保存されたが、既存の日記データを削除・上書きしていない。Tag Assistantの一時デバッグ接続は停止を確認し、作業用タブを閉じた。スクリーンショットと受信文字列は非公開ローカル成果物に保存し、認証情報、Cookie、セッションIDの値や実利用者のデータは本書へ掲載しない。

参考: [Google公式DebugView](https://support.google.com/analytics/answer/7201382?hl=en)、[Tag Assistantの同意確認](https://support.google.com/tagmanager/answer/14218557?hl=en)、[公開済みCMPメッセージのプレビュー](https://support.google.com/adsense/answer/10924669)。

### 2026-11-16 入力URL除外の修正候補（Draft・未公開）

`js/analytics-core.js` の共通境界で、Googleタグの初期 `set`、`config`、明示イベントへ渡す `page_location` / `page_referrer` を整形する。現在URLはUTM・Google広告流入の既知キーだけを残し、計算条件・未知のクエリ・断片・URL内の認証情報を除く。参照元はクエリ・断片・認証情報を除き、不正・非HTTP(S)の参照元も省略せず空文字にする。イベント呼出元がURL値を指定しても採用せず、外部タグが `gtag` を置換した後の `PlayPointAnalytics.track()` にも同じ処理を適用する。

ブログの自動初回page_viewと、計算機の手動初回page_viewの両方が対象で、既存の `send_page_view: false`、一度だけの初回表示、独自イベントの許可リスト、記事起点の分類を保持する。Googleタグの[URL設定と既定値](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)に対応する明示値であり、ブラウザURL自体の消去ではない。

共有URLの生成・復元と計算式は変更していない。金額・必要ポイント・対象額・獲得率・倍率・ランクの条件は従来どおりURLから復元する。`points-cost/` の計算後の履歴更新と条件コピーも維持する。実Googleタグの隔離試験で、同ページの自動 `form_start` が現在URLを `form_destination` に含める経路も確認したため、日本語・英語・韓国語・台湾向けの4フォームには各言語のクエリなしURLを `action` として明示した。submitは従来どおりJavaScriptが `preventDefault()` して計算し、サーバーへのフォーム書込みは追加しない。

共通coreと読込み元の内容ハッシュ、Service Workerの参照を既存生成処理で同期した。公開HTML449ファイルのうち、4フォームの `action` 以外は版参照だけの差分であり、記事本文・日付・順位・索引・レイアウトは変更していない。

#### 修正候補の検証

| 検証 | 結果・意味 |
| --- | --- |
| 元コードでの回帰再現 | 新しいURL文脈の2検査が失敗。実Googleタグ要求でも共有金額・参照元ポイント・フォーム送信先ポイントを確認 |
| 関連Node回帰 | analytics-core / runtime-attribution / state-boundaries / third-party integration・resilience / share-behavior / calculator-funnel / article-navigationの84件成功、失敗・skipなし |
| URLの境界 | エンコード・重複・未知キー、断片、参照元の認証情報・不正URL、config第3引数省略、直接set/event、外部gtag置換、保留後のURL変更と明示拒否後の破棄を検証 |
| ローカル実DOM・390px / 1280px | 通常・逆算の共有復元、既存計算結果、4言語の必要額フォームの復元・履歴更新・安全なaction、同意境界、既存広告分離が成功 |
| 実Googleタグの送信直前データ | 静的gtag.jsだけを取得した隔離Chromeで、共有ページと必要額フォームの `page_location` / `page_referrer` / `form_destination` から入力クエリが消えた。全collect要求をローカルで遮断し外部転送0 |
| JavaScript構文 | 234ファイル成功 |
| Windowsの全事前検証 | 全体試行のBash実行6ケースは固定されたBash実体がなく失敗し、main基準でも再現。記事計測の新URL文脈に合わせた期待値更新後は関連検査が成功。Linuxの全体結果はPR #809のチェックを正本とする |

関連テストは既存の所有ファイルに追加した。独自イベントの検査とURL文脈の生payload検査を分け、URL文脈を単に除外して安全と判定しない。ローカルブラウザ検証は次の既存コマンドで、外部Google/CMPをstubし、公開サイトや実データには接続しない。

```text
node .github/scripts/browser-revenue-smoke.cjs
node .github/scripts/preflight.cjs
```

実Googleタグの比較では、元コードと候補の各捕捉JSONを認証情報・Cookie・client/session IDの値なしで非公開証跡へ保存した。元コードでの捕捉JSONのSHA256は `364abd396a8915a5bd3d0e35354795befbfad0125333c8f0b3e980ea23e4a1d5`、修正後JSONは `811766af8261db4d1e783d5fbfe376b158482076f30defdfde6e37dcaaf67dab`。これは通信前の捕捉であり、修正後の本番DebugView受信確認ではない。

#### 同意境界と残る受け入れ

隔離したCMP fixtureではpending / deniedの間にアプリイベントとGA取得がなく、許可後に計測を開始し、取消し後の計算でイベントが増えないことを両画面幅で確認した。fixtureの結果は、EEA等の実地域・実CMPでの同意前 / 拒否後のGoogle自動イベント非送信を証明しない。前節の日本向け環境では必要な実効状態を再現できておらず、**実CMPの受け入れは未実施のまま**残す。

この候補の検証時点では、マージ・デプロイ、公開HTML/JS・DB・GA4・CMP・広告の管理設定変更は行っていない。公開環境で修正後のDebugView、実効的な同意境界、他の共有URL・日記・全端末の最終受け入れが完了するまでIssue #180は閉じない。

### 2026-11-16 最終レビューで見つかった自動検索計測

マージ前の実Googleタグ試験で、`/blog/?q=fictional-23456-137` から自動 `view_search_results` の `search_term` に架空の入力文字列が入ることを確認した。`page_location` は整形済みでも、この経路は残っていた。`search_term` の明示的な固定値も自動イベントには上書きされ、対策にはならなかった。

Google公式の[拡張計測](https://support.google.com/analytics/answer/9216061)は、既定で `q` / `s` / `search` / `query` / `keyword` を実URLから読み取る。管理設定を変更せず、タグ読込み前にそれぞれ `pp_q` / `pp_s` / `pp_search` / `pp_query` / `pp_keyword` へ正規化する。値・重複・他の計算条件・断片・履歴stateを保持し、旧キーは全て取り除く。既に新キーがある場合は空文字も含めてそちらを優先する。

ブログ、海外記事ハブ、ゲーム一覧、記事内検索は新しい `pp_q` と旧 `q` の両方を読み、生成する検索リンクは `pp_q` を使う。旧ブックマーク・静的サイドバー・SearchActionからの `q` も復元できる。`popstate` / `pageshow` でも正規化し、URLを保護できない場合は両ローダーでGoogleタグの取得・設定を開始しない。計算共有の `mode` / `status` / `target` / `points` / `amount` / `eligible` / `baseRate` / `multiplier` はこの正規化の対象外である。

既存の変換fixtureが参照する記事内検索の文字列も同期した。これは過去のビルド検査の互換調整であり、WordPress移行・staging受け入れ・DB操作を再開するものではない。

関連Node89件は成功し、旧URLと候補を比較した実Googleタグの隔離試験では、自由入力が `search_term` へ入らず検索ページのpage_viewが継続することを確認した。旧版の捕捉JSONはSHA256 `7d193778d5433b306e23b2834db2a114dd9eb4a18b17737b89d0cc932b3ea165`、修正後は `3c65d5d2440370522c3b884d1fe41ab2253f89506234c9c2fbfc3cf472fc78a5`。全collect要求は遮断し、外部転送は0である。既存の入力・クリア・再読込み・記事から戻る・戻る/進むの画面検査もこのURL契約で実行する。最終headのCI結果はPR #809を正本とする。

追加の検索・配信回帰87件と既存の検索/記事閲覧・収益ブラウザ検査も成功した。最新差分の公開HTML452ファイルは、4フォームのaction以外が版参照だけである。実Googleタグが生成した外部要求14件について、URL・body・参照元に同じ架空入力値が含まれないことを照合した。これらも送信前の捕捉で、外部collect転送は0である。

### 公開後のDebugView・実CMP受け入れ手順

以下は作業手順であり、記載だけでは合格にならない。各項目を成功・不合格・未実施に分けてIssue #180へ記録する。公開DB・既存投稿・日記データ、GA4/CMP/広告の管理設定、認証権限は変更しない。

1. **版と環境を固定する。** `Deploy to Xserver` の成功と `/status/deploy-status.json` の `verified`・対象merge SHA・各passed、`deploy-revision.txt` の一致を確認する。新規テストプロファイルまたはテスト専用タブを使い、通常/拡張/PWAの別、画面幅、日時・地域、対象SHAを記録する。既存サイトデータの全消去は行わない。
2. **架空の条件を復元する。** 通常 `?mode=main&status=1&target=silver&points=137&baseRate=2.5&multiplier=2` と、逆算 `?mode=reverse&status=1&amount=23456&eligible=22000&baseRate=2.5&multiplier=2` を開く。入力値と通常5,480円・逆算550pt、共有コピー後の再読込みを照合する。4言語の必要額ページもポイント・ランク・倍率、再計算後の履歴URL・コピーを確認する。390px・1280pxの確認とスマホ実機の確認は区別する。
3. **検索の互換性を確認する。** `/blog/?q=Play+Pass&sort=updated&page=2` と各地域ハブの旧 `q` リンクから入力を復元する。`pp_q` への正規化後も検索・並べ替え・ページ・再読込み・記事から戻る・クリア・戻る/進むが同じ条件を表示することを確認する。GA4の検索キーや追加収集キーへ `pp_*` を登録しない。
4. **許可時の実受信を確認する。** 既存ログインのGA4プロパティ `489079798` / `G-HED6D0FR4L` と対象デバイスを照合し、Google公式Tag Assistant等の一時的な端末デバッグだけを使う。通常・逆算・コピー・X共有ボタン・関連記事・判断導線を1回ずつ操作し、実操作回数と受信を記録する。Xは入力画面までとし投稿しない。広告はクリックせず、既存の内部記事だけを使う。再試行は別記する。
5. **全送信項目を調べる。** 独自イベント項目に加え、`page_location` / `page_referrer` / `form_destination` / `link_url` / `search_term` と通信のURL・bodyを確認する。金額・ポイント・日記本文・自由検索語、その値を含むURLが送られないことを照合する。DebugViewの件数やVM/stub合格だけで非送信とは判定しない。認証情報・Cookie・client/session IDの値や実利用者の値を公開記録へ載せない。
6. **実効的な同意状態を確認する。** 既存の正規な対象地域環境で、Tag Assistantの当該ページの実効 `analytics_storage` とアプリ状態を照合する。同意前pending/denied、拒否後denied、許可後granted、許可取消し後deniedをそれぞれ確認してから同じ架空計算を実行する。拒否状態では新しいGAイベント・collectがないことを通信とDebugViewで照合する。送信前からのin-flight要求やcookieless pingも区別し、受信画面が空という理由だけで合格にしない。広告/CMP初期化と広告枠要求も分けて記録する。
7. **前提がなければ未実施で止める。** 日本向け表示で拒否ボタンを押してもanalyticsがgrantedなら、実地域CMPの拒否試験ではない。`?fc=alwaysshow&fctype=gdpr` は外観プレビューであり、その地域・同意状態の証拠にはしない。VPN・地域/OS設定・権限・CMP公開設定を変えて前提を作らず、実効状態を再現できない項目は未実施に残す。
8. **終了と判定を記録する。** デバッグ接続を停止し作業タブを閉じる。失敗時は対象SHA・実効状態・操作・送信項目を残し、追加公開作業を止めて通常の修正手順へ進む。計算・表示の重大回帰は既存の[復旧手順](deployment-verification.md)で扱う。実CMPや公開DebugView等が残る間はIssue #180を閉じない。

一次手順: [DebugView](https://support.google.com/analytics/answer/7201382?hl=en)、[Tag Assistantの同意確認](https://support.google.com/tagmanager/answer/14218557?hl=en)、[CMP外観プレビュー](https://support.google.com/adsense/answer/10924669)。

担当: PlayPoint運営者。イベント追加時は本書と回帰テストを同時に更新する。

## PWA / ブラウザ起動形態

GA4のページビューと以後のイベントには、技術的な起動形態を比較するため `app_display_mode` を付与します。値は通常ブラウザの `browser` と、PWA・ホーム画面起動の `standalone` の2種類です。入力した金額・ポイント数・個人情報はこの値には含めません。

日本語公開記事も article_navigation_click の対象。locale=ja を追加し、記事のdata属性から有限のRole・categoryを取得する。ナビ・関連記事・次行動・運営者・記事一覧のクリックを既存の同意境界で処理する。
