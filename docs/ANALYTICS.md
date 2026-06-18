# Analytics measurement plan

## 目的

計算機や記事が利用者の問題解決につながっているかを判断する。入力した課金額、必要ポイント、日記内容などの個人情報になり得る値は送信しない。

## GA4イベント

| Event | Trigger | Properties | Decision |
| --- | --- | --- | --- |
| `calculation_completed` | 通常計算が成功した時 | `calculation_mode`, `region`, `target_status` | ランク計算の利用状況を判断する |
| `reverse_calculation_completed` | 逆算が成功した時 | `calculation_mode`, `region` | 逆算機能の需要を判断する |
| `diary_entry_saved` | 週次日記の保存が成功した時 | `region`, `entry_type` | 継続利用の有無を判断する |
| `article_to_calculator_clicked` | 記事から計算機へ移動した時 | `source_path` | コンテンツがツール利用へつながったか判断する |

## Conversion

`calculation_completed`と`reverse_calculation_completed`を主要イベント候補とする。GA4管理画面ではセッション単位で確認し、繰り返し計算による水増しと区別する。

## 検証

1. GA4 DebugViewを開く。
2. 通常計算、逆算、日記保存、記事から計算機への移動を各1回実行する。
3. イベントが各1回だけ表示されることを確認する。
4. 課金額、必要ポイント、日記の入力値がパラメータへ含まれないことを確認する。
5. スマホ幅とPC幅、同意状態ごとに重複送信がないことを確認する。

担当: PlayPoint運営者。イベント追加時は本書と回帰テストを同時に更新する。
