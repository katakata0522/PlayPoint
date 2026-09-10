# PlayPoint Growth Baseline — 2026-09-10

## この文書の役割

2026-09-10に実行した本番Growth監査と、その監査から同日中に行った修正を基準点として残す。

この文書は「この数字を永久に正しいものとして固定する」ためではなく、今後の改善で次の2つを防ぐためのスナップショットである。

- 古い数字を根拠に同じページを何度も改稿する
- PV・CTR・計算機遷移など単一指標だけで、記事や機能の存在価値を誤判定する

判断原則は `docs/GROWTH_OPERATING_PLAN.md` と `docs/ARTICLE_ROLES.md` を正本とする。

---

## 監査条件

- 本番監査実行日: 2026-09-10
- Search Console / GA4 対象期間: **2026-09-01〜2026-09-07**
- Search Console確定待ち: 3日
- データ取得: Google Search Console / GA4 read-only
- 記事対象: 日本語 / EN / KO / TW
- 記事総数: **161**
- 主ファネル単位: **activeUsers**

`eventCount` は診断情報として保持するが、同じ人の再クリック・再計算・日記オートセーブで膨らむため、主要なユーザー到達指標にはしない。

---

# 1. GA4 / 計測基盤

## 確認できたこと

本番API監査では以下が取得できた。

- GA4 Admin API: OK
- Organic landing: OK
- Article CTA: OK
- Article起点Calculator funnel: OK
- Publisher revenue: OK
- `(not set)` breakdown: OK

カスタムディメンション:

- `entry_source_path`: 登録済み
- `entry_link_context`: 登録済み
- `calculator_preset`: 登録済み

Key event:

- `calculation_completed`: 登録済み
- `reverse_calculation_completed`: 未登録（現時点では任意）

対象期間の主要イベント:

- `calculator_form_started`: 36
- `calculation_completed`: 70
- `reverse_calculation_completed`: 7
- `calculator_funnel_completed`: 28

## まだ閉じていない確認

### DebugView

Data/Admin APIだけでは、ブラウザで発火した1イベントがDebugViewへ届くところまで証明できない。

したがって「実装済み・Data APIで集計可能」と「DebugView実機確認済み」は分けて扱う。

### `app_display_mode`

PlayPoint側では `app_display_mode` を送信しているが、2026-09-10監査時点でGA4 Custom Dimensionとして未登録だった。

そのため、PWA `standalone` 利用者は **0人ではなく取得不可**。

この不足だけを理由に公開側へ新しいイベントやユーザー識別子を追加しない。まずGA4管理側の登録で既存パラメータを利用できる状態にするのが最小変更。

---

# 2. Article Portfolio

7日間の短期データを使った保守的な初期分類:

| Bucket | 件数 | 意味 |
| --- | ---: | --- |
| CORE | 1 | 既に強い実利用/需要を確認 |
| GROWTH | 4 | 伸びるシグナルがあり改善余地あり |
| RETENTION | 14 | 再訪が仕事。単発PVで評価しない |
| SUPPORT | 14 | 他の問題解決・判断を支援 |
| PROVE | 126 | 需要未証明。削除ではなく追加投資を止めて観察 |
| HOLD | 2 | 公式確認前。検索流入を取りに行かない |

## 最重要解釈

**PROVE 126件 = 126記事を消す、ではない。**

7日間の短期窓で需要が確認できていない記事を、追加改稿・翻訳・装飾の優先対象から外すための分類である。

長期検索、内部回遊、戦略Role、保守コスト、intent ownerとの重複を見て再判定する。

---

# 3. 期間中に強いシグナルがあった記事

## 日本

### Quests

`/articles/2026-07-31-google-play-quests.html`

- Search clicks: 9
- Impressions: 306
- CTR: 2.9%
- Organic users: 28
- Article→Calculator users: 1
- Calculator Start users: 1
- First Success users: 1
- Start→Success: 100%
- GA4 ad revenue: 約 ¥20.10

検索入口としてだけでなく、少数ながら実際の計算成功までつながった。

### Super Weekly

`/articles/2026-07-31-super-weekly-reward.html`

- Impressions: 498
- Search clicks: 0
- Organic users: 16

検索表示の大きさに対してクリックが弱い。ただしこのSearch Console期間終了後にSEO修正が入っているため、**古い期間データだけで即再改稿しない**。

### 現金化

`/articles/2026-07-24-play-points-cash-conversion.html`

- 2 clicks / 187 impressions
- CTR: 約1.1%
- Organic users: 6
- GA4 ad revenue: 約 ¥6.77

検索意図ownerとして監視対象を継続する。

## English

### Quests

`/en/articles/google-play-quests.html`

- 6 clicks / 521 impressions
- CTR: 約1.2%
- Organic users: 14

露出が大きい。直近改稿とのcooldownを守り、古い期間だけで連続改稿しない。

### Cash conversion

`/en/articles/google-play-points-cash-conversion.html`

- 1 click / 136 impressions
- CTR: 約0.7%
- Organic users: 1

長期では重要な検索テーマだが、短期7日間の利用者数だけでページ価値を否定しない。

## Korea

### Cash conversion

`/ko/articles/google-play-points-cash-conversion.html`

- 2 clicks / 140 impressions
- CTR: 約1.4%
- Organic users: 39
- GA4 ad revenue: 約 ¥45.18
- 内部次ページへ進んだusers: 1

海外記事の中でも強い入口。

### Super Weekly

`/ko/articles/google-play-points-super-weekly-reward.html`

- 4 clicks / 73 impressions
- CTR: 約5.5%
- Organic users: 8

短期でも検索スニペットとの一致が比較的良い。

### Coupon / use

`/ko/articles/google-play-points-use-coupons.html`

- 2 clicks / 479 impressions
- CTR: 約0.4%
- Organic users: 1

露出は大きいがCTRは弱い。ただし直近SEO変更の観察期間を優先する。

## Taiwan

複数テーマへ需要が分散しており、単一winnerというよりクラスターとして育ち始めている。

主な短期シグナル:

- Play credit trouble: 2 / 59, CTR 3.4%, Organic users 8
- Quests: 1 / 15, CTR 6.7%, Organic users 8
- Platinum / Diamond cost: 2 / 39, CTR 5.1%, Organic users 7
- Weekly Reward: 3 / 9, CTR 33.3%, Organic users 4

小標本は率だけで過大評価しない。

---

# 4. 日記 / PWA / Retention

2026-09-01〜09-07:

- `diary_tab_opened`: activeUsers 2 / eventCount 3
- `diary_entry_saved`: activeUsers 0
- `calendar_reminder_added`: 0
- `pwa_install_accepted`: 0
- 全体 activeUsers: 309
- returning users: 18
- returning / active: 約5.8%

## 判断

この1週間では、**日記が再訪を生んでいるという仮説はまだ証明できていない。**

同時に、2人Open / 0 Saveという標本だけで「日記は不要」「ファーストビューから下げる」と判断する根拠もない。

日記の存在理由は、

- 週次再訪
- 継続利用
- 自分の履歴
- PWAの利用理由
- PlayPointを単発計算機から継続ツールへ広げること

にあるため、単発Open率だけで評価しない。

`diary_entry_saved` はオートセーブでも発火するため、将来データが増えても `eventCount` をユーザー数として扱わず `activeUsers` を中心に見る。

---

# 5. Article Role Outcome Proxy

新しい公開トラッキングを増やす前に、GA4標準データで使える弱い証拠を監査した。

- troubleshooting: Google公式へのoutbound clickを「解決確認へ進んだ」medium proxy
- decision_support: 記事直後の内部遷移をweak proxy
- reference: 次のPlayPointページへの内部遷移をweak proxy
- game_decision: 内部遷移をweak proxy。ただしゲーム計算機固有利用とは断定しない
- calculator_bridge: proxyではなくFirst calculation successを優先
- retention: 別のRetention Loop監査を優先

重要: **proxyはPrimary KPIではない。**

例えば公式リンククリック0件でも、記事内で疑問が解決して離脱した可能性がある。0を失敗とみなさない。

---

# 6. Search Intent Ownership — 本番監査で見つかった3件

本番監査時点で3件の警告が出た。

## 6-1. Korea Diamond cost — 監視側の誤分類

Query:

`구글 플레이 다이아몬드 유지 비용`

実際に露出していた主ページ:

`/ko/maintenance/diamond`

- 18 impressions
- 平均順位 約4.9

元owner台帳はこれを「ダイヤモンド到達費用」と誤分類していた。

### 対応済み

- `유지` を到達費用intentから除外
- 実Queryに基づき `ko-diamond-maintenance` を追加
- ownerを `/ko/maintenance/diamond/` に設定

**正しいページを改稿せず、監視モデル側を直した。**

## 6-2. Taiwan Platinum cost — 本物のカニバリ

Query意図:

`白金級 要花多少錢`

本番分散:

- cost owner: 約50%
- levels: 約34%
- 100-value: 約16%

cost owner自体は平均順位約2.8で強い。

## 6-3. Taiwan Diamond cost — 本物のカニバリ

Query意図:

`鑽石級 要花多少錢`

本番分散:

- cost owner: 約55%
- levels: 約31%
- 100-value: 約14%

cost owner自体は平均順位約2.6。

### Taiwan対応済み

削除・統合ではなくRole境界を修正した。

#### `levels`

本来の仕事を「等級制度の参照」と再定義。

- Article Role: `calculator_bridge` → `reference`
- meta descriptionから「基本消費估算」を外す
- 「從0點開始の固定総消費額」セクションを削除
- 年度門檻は固定消費額ではないことを説明
- 総費用質問は `platinum-diamond-cost` へ送る

#### `100-value`

100点を累積する費用比較そのものは残す。

- 「100點を貯める金額」と「白金/鑽石へ到達する総費用」は別intentと明示
- 総費用ownerへscope noteで内部リンク

#### `platinum-diamond-cost`

平均2〜3位で既にownerとして強いため、同時にtitle/H1まで改稿しなかった。

まず競合ページ側の境界変更だけを行い、次回の確定データで効果を分離して見る。

---

# 7. 2026-09-10時点で「今は触らない」と判断したもの

## 日記の配置

データ不足。移動/削除しない。

## 台湾cost ownerのtitle/H1

既に平均2〜3位。競合側のscope修正と同時に変更すると、どちらが効いたか分からなくなるため据え置き。

## 9月8日前後に改稿した高表示低CTR記事

Search Consoleの対象期間が9月7日までなので、変更後のデータをまだ含んでいない。

古いデータで再改稿しない。

## 126 PROVE記事の一括削除

しない。

追加投資を抑え、長期需要・回遊・Role・保守コストを観察する。

---

# 8. 次の優先順位

## P0

1. GA4 DebugView実機確認
2. `app_display_mode` をGA4 Custom Dimensionとして登録し、既存パラメータでstandalone利用を測定可能にする
3. 次回確定Search Consoleで台湾Platinum/Diamond costのURL分散が縮小したか確認

## P1

4. cooldown明けの高表示・低CTR winnerだけを再査定
5. Article PortfolioのP0/P1を最終判断の入口にする
6. troubleshooting / decision_support等は、標準GA4 proxyで判断可能かを先に確認し、不足時だけ最小の追加イベントを検討

## P2

7. Quests / Weekly / Cash conversion等、実需のあるwinnerを壊さず強化
8. 日記→保存→再訪→PWAのデータを蓄積し、配置変更はその後判断
9. 地域別のwinnerテーマを優先し、言語パリティ目的の新規記事量産をしない

---

# 9. この基準点からの判断ルール

次の改善では必ず、

`存在理由 → 狙う行動 → 生む価値 → 占有/保守コスト → 実データ → 副作用 → 最小検証`

の順に考える。

UI・SEO・記事・計測・収益化のどれであっても、局所KPIの改善だけで全体価値を壊さない。

特に、

- 「CTRが低いから即改稿」
- 「PVが低いから削除」
- 「計算機へ行かないから記事価値が低い」
- 「主役ではないからファーストビューから下げる」
- 「測りたいからイベントを追加する」

を自動判断にしない。

**PlayPoint全体で、その要素が占有するコストより生み出す価値が大きいかを最終基準にする。**
