# PlayPoint Growth Operating Plan

最終更新: 2026-09-10

## 目的

PlayPointを「ページ数や機能数を増やすプロジェクト」ではなく、**Google Play Pointsに関する理解・計算・判断・記録・再訪を助け、その価値を持続的な利用と収益へ変えるプロダクト**として運営する。

改善判断では、見た目の一般論や単一KPIより先に以下を確認する。

1. なぜその要素が存在するか。
2. どのユーザー行動を変えるための要素か。
3. その要素が生む価値は何か。
4. 画面占有・保守・更新・別導線の機会損失など、占有コストは何か。
5. 実データで価値を確認できているか。
6. 変更すると、別の重要KPIを壊さないか。
7. 最小差分で検証できるか。

**「生み出す価値 > 占有コスト」かを、プロダクト全体で判断する。**

---

## 現在地

### 完了済み

- 記事ごとのArticle RoleをSSOT化。
- `calculator_bridge / decision_support / troubleshooting / retention / game_decision / reference / hold` を定義。
- 新規記事がRole未定義のまま追加されることをCIで検出。
- Search Intent Ownerを日本語・EN・KO・TWの主要検索意図へ拡張。
- intent owner競合は、実データ上で意味のある複数URL分散がある場合だけ警告。
- SEO改稿後14日のcooldownを維持し、古いSearch Consoleデータで連続修正しない。
- 記事→計算→初回成功のファネルを、イベント回数ではなく`activeUsers`を主指標にできるよう改善。
- GA4取得失敗やCustom Dimension未反映を「0」と「取得不可」で分離。
- 新しい定期WorkflowやGoogle書込権限は増やさず、既存監視へ集約。

### まだ閉じていない重要事項

- 本番GA4でArticle→Calculator / Start / First successの新ファネルを実取得する。
- `entry_source_path`等のCustom Dimension、Key event、DebugViewを最終確認する。
- troubleshooting / retention / decision_support等のRole固有Primary KPIは部分計測。
- 全記事のPortfolio分類を実データで継続更新する。

---

## P0 — 先に閉じないと後続判断が歪む

### P0-1. 本番ページ価値ファネルを確定

**目的:** 記事を検索流入だけで評価せず、「PlayPointで価値ある行動まで進んだか」を確認する。

確認する主系列:

`Organic/Search → Article → Calculator CTA → Calculator Start → First Success`

ルール:

- 主指標は`activeUsers`。
- `eventCount`は診断・互換情報として保持。
- 取得不可は0へ変換しない。
- calculator_bridge以外の記事をFirst successだけで評価しない。

### P0-2. GA4本番設定を完全確認

- `entry_source_path`
- `entry_link_context`
- `calculator_preset`
- `calculation_completed` Key event
- 必要に応じて`reverse_calculation_completed`
- DebugView実機確認

Data/Admin APIで確認できるものと、DebugViewでしか閉じられない確認を混同しない。

### P0-3. Intent owner競合を優先処理

P0にする条件は「似たページが存在する」ではなく、**同一検索意図が実データ上で複数URLへ意味ある割合で分散している**こと。

既知の重点境界:

- JP: 交換おすすめ vs 現金化/PayPay
- JP: Weekly概要 vs Super Weekly/確率/特別賞品
- TW: account transfer / balance transfer / cash conversion
- TW: ランク費用の情報検索 vs 残り金額Calculator

---

## P1 — 現在の成長効率を大きく変えられる

### P1-1. Article Portfolioを毎回生成

全日本語・EN・KO・TW記事を以下へ分類する。

- `CORE`: 既に価値・需要の強い中核。壊さず伸ばす。
- `GROWTH`: 需要/流入シグナルがあり、改善余地が大きい。
- `RETENTION`: 再訪・習慣化が仕事。単発PVでは評価しない。
- `SUPPORT`: 他の判断・問題解決を支える補助資産。
- `PROVE`: 需要未証明。削除ではなく追加投資を止めて検証。
- `HOLD`: 公式確認前。検索流入を取りに行かない。

Portfolioでは最低限以下を持つ。

- URL / locale
- Article Role
- Primary KPI
- measurement status
- bucket
- priority
- search clicks / impressions / CTR
- Organic landing users
- Article→Calculator users
- Calculator Start users
- First Success users
- page revenue（取得できる場合）
- intent owner warning / cooldown
- next action / reason

### P1-2. Role固有KPIの測定不足を埋める

新しいイベントを増やす前に、既存イベント・遷移で測れないか確認する。

- `calculator_bridge`: 初回計算成功
- `troubleshooting`: 解決に必要な次行動
- `decision_support`: 文脈に合ったNext Best Action
- `retention`: 再訪・週次継続
- `game_decision`: ゲーム記事→ゲーム計算/判断
- `reference`: 次の問題解決へのassisted navigation

**測れないPrimary KPIを、計算機クリック率や滞在時間で代用しない。**

### P1-3. 高表示・低CTRページをCTR問題として扱う

表示が十分あるページは、新記事追加より先にSERP上の約束を改善する。

2026-09-10時点で目立つ例:

- JP Super Weekly: 約832 imp / CTR約0.24%
- EN cash conversion: 約705 imp / CTR約0.85%
- KO coupon/use: 約373 imp / CTR約0.27%
- TW use coupons: 約237 imp / CTR約0.42%

ただし、直近でSEO改稿したページはcooldownを優先し、古い期間の数字で即再改稿しない。

---

## P2 — Winnerを強くし、回遊と再訪を作る

### P2-1. WinnerのTop 3化

2026-09-10時点で強いシグナルがある例:

- JP Quests: 約264 imp / 13 click / Organic users約44
- EN Quests: 約192 imp / 9 click / Organic users約22
- KO cash conversion: 約363 imp / 10 click / Organic users約118
- KO Super Weekly: 約246 imp / 8 click / Organic users約13
- TW coupon trouble: 約90 imp / 4 click / Organic users約23
- TW levels: 約94 imp / 5 click / Organic users約23
- TW platinum/diamond cost: 約118 imp / 6 click / Organic users約23
- TW Play credit trouble: 約201 imp / 6 click / Organic users約20
- TW Weekly Reward: 約93 imp / 4 click / Organic users約26
- TW Quests: 約54 imp / 5 click / Organic users約22

Winnerでは「文字数を増やす」より、以下を優先する。

- 検索意図への直接回答
- title / descriptionとSERPの約束
- 一次情報との主張対応
- 比較表・計算例などPlayPoint固有価値
- 記事Roleに合うNext Best Action
- 内部リンクによるowner強化

### P2-2. CTAをArticle Role別にする

全記事を一律に「計算機へ」送らない。

- calculator_bridge → 個別計算
- troubleshooting → 原因切り分け / 公式確認 / 必要な次行動
- decision_support → 比較後の次の選択
- retention → 日記 / 週次確認 / 再訪
- game_decision → ゲーム別計算
- reference → 次に読むべき問題解決

### P2-3. 関連記事を「同カテゴリ」より「次のJob」で選ぶ

同じテーマだからリンクするのではなく、**この疑問を解決した人が次に何をしたいか**で導線を選ぶ。

### P2-4. 週次再訪ループを検証

以下を別機能としてではなく、1つの継続体験として見る。

`Weekly / Super Weekly / Quests / Latest → ほくほくリワード日記 → PWA / 翌週再訪`

日記の成功はOpen率だけではなく、保存・2回目利用・翌週再訪・PWAとの相関で評価する。

---

## P3 — コンテンツポートフォリオを軽く強くする

### P3-1. 言語パリティ目的の新規記事量産をしない

日本語記事があるからEN/KO/TWにも作る、という理由だけでは追加しない。

国/地域別の実検索需要を優先する。

- JP: Quests / Weekly / reflection / exchange等
- EN: cash conversion / Quests等
- KO: cash conversion / Super Ticket / use等
- TW: troubleshooting / Weekly / Quests / levels / cost等

### P3-2. PROVE記事はFreezeして観察

0PV・0clickだけでは削除しない。

追加改稿を止め、検索表示・内部回遊・戦略Role・保守コストを一定期間後に再評価する。

削除/統合/noindexを検討するのは、例えば以下が重なった場合。

- 長期間需要なし
- 内部回遊価値なし
- Roleが他ページと重複
- intent ownerを奪う
- 更新コストが高い
- 独自価値がない

### P3-3. Freshness LevelをRole/テーマ別に持つ

週次/キャンペーンと制度解説を同じ更新頻度にしない。

- 高鮮度: Weekly / Quests / Campaign / Latest
- 中鮮度: rank条件 / redemption / troubleshooting
- 低鮮度: 基礎概念 / evergreen reference

### P3-4. 一次情報の品質を「リンク有無」から「主張対応」へ

Google公式URLが1つあるだけを合格条件にしない。

重要な数字・条件・制限について、どの一次情報で確認したかが追える状態を目指す。

### P3-5. ゲーム記事を比較・判断支援へ寄せる

PlayPointの権威範囲は「ゲーム攻略の最強断定」より、**購入候補を金額・獲得ポイント・条件で比較し、読者が判断できること**に置く。

---

## P4 — 収益と長期資産化

### P4-1. 記事Roleごとの収益貢献を分ける

すべての記事へ同じ広告/収益期待を置かない。

- 直接PV/広告収益を取るページ
- 計算利用へ送るページ
- 再訪を作るページ
- 信頼を作るページ
- 購入直前の意思決定を支えるページ

### P4-2. AdSenseをRoleごとに評価

広告表示量だけではなく、主要JobやNext Best Actionを阻害していないかを見る。

### P4-3. アフィリエイトは購入意図とユーザー利益が一致する場合だけ

ギフト・決済等も「置けるから置く」ではなく、PlayPointの判断支援を強める場合だけ検討する。

### P4-4. North Star Metricを確定

PV単独をNorth Starにしない。

候補:

- Google Play Pointsに関する「意思決定完了ユーザー数」
- 再訪ユーザー数 / 週次継続率
- 上記を支える検索入口数

最終的には、**単発問題解決と継続利用の両方を壊さない指標体系**にする。

---

## 実装・運用ガードレール

### 新機能を作る前

最低限、以下を説明できること。

- 存在理由
- 変えたいユーザー行動
- Primary KPI
- 期待価値
- 画面占有コスト
- 保守/更新コスト
- 他機能への副作用
- 最小検証方法

説明できない場合は、実装より先に仮説を詰める。

### 新記事を作る前

- 既存ownerで答えられない実需要か。
- 検索語の言い換えだけでページを増やしていないか。
- どのArticle Roleか。
- 成功KPIは何か。
- 更新コストは許容できるか。

### 新テスト・Workflow・監査scriptを作る前

- 既存ownerで同じ保証を持てないか。
- 本当に再発防止に必要か。
- テスト実装詳細ではなくユーザー/運用契約を守っているか。
- 「追加した仕組みを維持するための仕組み」が自己増殖していないか。

**1つの保証には原則1つのownerを置く。**

### UIを動かす前

「主役ではないから下げる」を理由にしない。

必ず、

`改善したいKPI` と `失う可能性があるKPI`

をセットで確認する。

例: 日記を下げる場合、計算開始率だけでなく日記発見率・保存率・翌週再訪・PWA利用を同時に見る。

---

## 次に着手する順番

1. 本番ページ価値ファネル実取得
2. GA4 Admin / Custom Dimension / DebugView最終確認
3. 全記事Article Portfolio生成
4. P0 owner競合の実データ確認
5. P1 Role KPI測定不足の設計
6. 高表示・低CTRページのcooldown判定
7. CORE/GROWTH Winnerの個別改善
8. Article Role別Next Best Action最適化
9. 日記・週次・PWA再訪ループ測定
10. 地域別コンテンツ投資配分
11. PROVE記事の再判定
12. Role別収益・North Star設計

この順序は固定ではない。実データで大きな異常・機会が出た場合は、**期待価値・確度・変更コスト・副作用**で再優先順位付けする。
