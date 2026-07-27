# Analytics measurement plan

## 目的

計算機や記事が利用者の問題解決につながっているかを判断する。入力した課金額、必要ポイント、日記内容などの個人情報になり得る値は送信しない。

## GA4イベント

| Event | Trigger | Properties | Decision |
| --- | --- | --- | --- |
| `calculation_completed` | 通常計算が成功した時 | `calculation_mode`, `region`, `target_status` | ランク計算の利用状況を判断する |
| `reverse_calculation_completed` | 逆算が成功した時 | `calculation_mode`, `region` | 逆算機能の需要を判断する |
| `diary_entry_saved` | 週次日記の保存が成功した時 | `region`, `entry_type` | 継続利用の有無を判断する |
| `article_to_calculator_clicked` | 記事から計算機へ移動した時 | `source_path`, `link_context`, `destination_path` | コンテンツがツール利用へつながったか判断する |
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

`calculation_completed` と `reverse_calculation_completed` には、外部キャンペーンURLに `utm_source`, `utm_medium`, `utm_campaign` がある場合のみ `entry_source`, `entry_medium`, `entry_campaign` を追加する。サイト内リンクにはUTMを付けず、ページ階層とCTAの位置から流入面を判定する。入力された課金額、必要ポイント、獲得ポイント、日記本文などの値は送信しない。

## Conversion

`calculation_completed`と`reverse_calculation_completed`を主要イベント候補とする。GA4管理画面ではセッション単位で確認し、繰り返し計算による水増しと区別する。

## 検証

1. GA4 DebugViewを開く。
2. 通常計算、逆算、日記保存、記事から計算機への移動を各1回実行する。
3. `/campaign/2x/`, `/campaign/3x/`, `/amount/10000/` から計算機CTAと関連記事リンクを各1回クリックする。
4. 計算結果のコピー、X共有、関連記事クリック、判断導線クリックを各1回実行する。
5. Googleカレンダー、iCal、日記保存後のPWA追加、ウィジェットコードコピー、ウィジェットからの流入を各1回実行する。
6. イベントが各1回だけ表示されることを確認する。
7. 課金額、必要ポイント、獲得ポイント、日記の入力値がパラメータへ含まれないことを確認する。
8. スマホ幅とPC幅、同意状態ごとに重複送信がないことを確認する。

## Measurement Readiness

実装と自動テスト上は計測可能。GA4管理画面で主要イベント指定とDebugView実測を行うまでは「運用前確認中」とする。サイト内導線は外部集客用UTMから分離済みで、GA4のセッション参照元を上書きしない。

担当: PlayPoint運営者。イベント追加時は本書と回帰テストを同時に更新する。
