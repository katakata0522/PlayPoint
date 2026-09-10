# Article Role / Next Action Audit — 2026-09-10

## 目的

全記事を「検索流入を取るページ」として一律に扱わず、`docs/GROWTH_OPERATING_PLAN.md` と `docs/ARTICLE_ROLES.md` で定義した Article Role に対して、主導線と関連記事がそのページの仕事を壊していないか確認する。

今回の変更では、SEOの14日cooldownを守るため、title / meta description / H1 / 検索意図の本文は変更しない。

## 監査範囲

日本語・EN・KO・TWの公開/保留記事を含む **161記事**。

Role内訳:

| Role | 件数 |
| --- | ---: |
| calculator_bridge | 23 |
| decision_support | 39 |
| troubleshooting | 21 |
| retention | 14 |
| game_decision | 3 |
| reference | 59 |
| hold | 2 |

## 発見した構造上の問題

Article Role自体は全記事へ定義済みだった一方、canonical build側では日本語・国際記事の大半へ一律に「必要額を計算する」主CTAを自動生成していた。

そのため、例えば以下のRoleでも、Primary KPIとは直接一致しない計算CTAが本文上部の強い導線になり得た。

- `troubleshooting`: 原因切り分け・公式確認・必要な次行動が仕事
- `retention`: 週次確認・日記・再訪が仕事
- `decision_support`: 比較後に文脈に合う選択をすることが仕事
- `reference`: 次の理解・問題解決を支えることが仕事
- `game_decision`: ゲーム別の購入判断・計算が仕事

さらに国際記事の旧prompt除去条件が広く、記事固有に置いた `article-calculator-prompt` まで汎用promptへ置換し得る責務境界だった。

## 対応

### 1. 汎用主計算CTAをRole-aware化

`calculator_bridge` のみを、汎用「必要額を計算」主CTAの自動生成対象とした。

他Roleではgenerated汎用CTAを除去し、記事固有のCTA・本文・関連記事を優先する。

### 2. 既存の文脈CTAを保護

既に個別設計され、記事の回答順と一致している以下は例外として維持した。

- EN cash conversion: 現金化不可と代替手段を説明した後に計算
- KO cash conversion: 同上
- TW coupon not applied: 問題排解を完了した後だけreverse modeへ進む
- TW platinum / diamond cost: 門檻回答後に不足分を計算

国際記事のlegacy prompt判定も、汎用生成物だけを対象に狭め、任意の手動CTAを削除しないようにした。

### 3. 全記事監査を常設

`scripts/article-role-next-action-audit.cjs` を追加し、全記事について以下を検証する。

- Article Roleが定義されている
- generated主CTAが重複しない
- Roleに不適切な汎用計算CTAを生成しない
- `calculator_bridge` には計算主導線がある
- HOLDへgenerated主CTAを出さない
- 公開記事にNext Action候補となる関連記事がある

テストを `tests/article-role-next-action-audit.test.cjs` として常設したため、通常のPR Gate全回帰に含まれる。

## 修正後監査結果

`Article Role / Next Action Audit`:

- articles: 161
- errors: **0**
- generated prompts:
  - calculator_bridge: 22
  - decision_support: 2
  - troubleshooting: 1
  - retention: 0
  - game_decision: 0
  - reference: 0
  - hold: 0

`calculator_bridge` が23件に対してgenerated promptが22件なのは、generatedであること自体を必須にせず、記事固有の計算主導線も有効と扱うため。

`decision_support` 2件と `troubleshooting` 1件は上記の検証済み文脈CTAであり、汎用CTAではない。

## 関連記事のNext Job警告

Roleだけから推定する弱いヒューリスティックでは、次の6件が警告になった。

1. `articles/2026-08-16-play-points-day.html`
2. `articles/2026-07-24-play-points-500-1000-value.html`
3. `articles/2025-12-25-new-year-campaign.html`
4. `en/articles/google-play-points-earn-free.html`
5. `ko/articles/google-play-points-earn-free.html`
6. `tw/articles/google-play-points-earn-free.html`

これらはリンク切れやRole違反ではなく、「Roleだけで見れば別の次Job候補もあり得る」という警告である。

今回は次の理由で自動変更しない。

- 現在の関連記事はすべて実在し、既存の内部リンク監査を通過している
- Role一致だけでユーザーの次行動を断定できない
- 2026-09-08〜10のSEO/intent変更の評価期間中で、追加の内部リンク変更を混ぜると効果分離が難しくなる
- 実データなしに全言語の関連記事を機械的に入れ替えると、過剰最適化になる

したがってこの6件は **errorではなく観察候補** とし、9/22〜25のSearch Console / GA4再測定とArticle Portfolio更新時に、実際の内部遷移・検索需要と合わせて再評価する。

## 検証

canonical buildで生成物を同期したうえで、Role関連の対象テストは **24件すべて成功 / fail 0**。

加えて既存の内部リンク監査は161記事で変更0、公開記事のクリック深度は159件・最大3クリックを維持した。

最終的なマージ可否は通常どおりPR Gateと必要なBrowser smokeで判断する。

## 今回変更しないもの

- title / meta description / H1
- 検索意図を変える本文
- Article Role自体の分類
- 日記/PWAの配置
- 広告配置
- 6件のNext Job警告に対する推測ベースのリンク差し替え

今回の変更は「Roleを定義しているだけ」の状態から、**canonical buildがRoleを実際に守る状態**へ進めることに限定する。
