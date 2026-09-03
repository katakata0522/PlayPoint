# PlayPoint Growth Audit — 2026-09-03

## 目的

2026年8月に起きたアクセス増加を、GA4 / Search Console の実データから分解し、次の改修を「流入を増やす」「検索流入を計算機利用へつなぐ」「4〜15位の検索語を押し上げる」の3点に絞る。

## A. 伸長要因の特定

### 月次の変化

- 2026-07: 月間アクティブユーザー 101 / GA4 PV 143
- 2026-08: 月間アクティブユーザー 984 / GA4 PV 1,369
- 2026-09-01〜02: 月間アクティブユーザー 52 / GA4 PV 63

7月→8月は、月間アクティブユーザーが約9.7倍、PVが約9.6倍。単一ページだけのスパイクではなく、検索流入と多言語ページ群の面で広がっている。

### 2026-08-04〜09-02 の流入構成

- mobile × Organic Search: 654 sessions / 618 active users
- desktop × Organic Search: 199 sessions / 190 active users
- desktop × Direct: 89 sessions / 62 active users
- mobile × Direct: 63 sessions / 54 active users

Organic Search が主因。特にモバイル検索が最大の成長エンジン。

### 国別

- Japan: 322 active users / 516 PV
- South Korea: 206 active users / 250 PV
- Taiwan: 199 active users / 266 PV
- United States: 107 active users / 122 PV

日本だけでなく韓国・台湾・米国まで伸びているため、「日本語トップの一発当たり」ではなく、多言語SEOの面展開が効いている。

### 上位ランディング（Organic Search）

1. `/ko/articles/google-play-points-cash-conversion.html` — 92 sessions / 91 users
2. `/` — 88 sessions / 79 users
3. `/articles/2026-07-31-google-play-quests.html` — 40 sessions / 39 users
4. `/tw/articles/google-play-points-coupon-not-applied.html` — 26 sessions / 25 users
5. `/tw/articles/google-play-points-platinum-diamond-cost.html` — 24 sessions / 22 users
6. `/en/` — 23 sessions / 23 users
7. `/tw/articles/google-play-points-levels.html` — 23 sessions / 23 users
8. `/tw/articles/google-play-points-weekly-reward.html` — 22 sessions / 22 users

結論: 8月の伸長は **検索流入 × 多言語記事 × モバイル** が中心。日本語トップ、クエスト、日本語の使い道系も伸びしろがあるが、最大流入口は韓国語の現金化記事。

## B. 上位流入ページの強化対象

### Tier 1 — 現在の流入を守りつつ回遊率を上げる

1. 韓国語「Play Points 現金化」
   - 入口として最大。
   - 検索意図への即答を維持し、計算機CTAを本文詳細より前に置く現行構造を保持。
   - 計算機CTA → 計算完了を `article_to_calculator_clicked` / `calculation_completed` で追う。

2. 日本語トップ
   - 「プラチナ いくら」「ダイヤモンド 維持」系で上位表示。
   - 計算機が主役である構造は崩さず、記事リンクや最新情報を主CTAより強くしない。

3. 日本語クエスト記事
   - Organic 40 sessions、エンゲージメント率80%。
   - 高品質流入なので、問題解決後に計算機・最新情報へ自然に進む導線を優先。

4. 台湾「クーポン適用不可」
   - 問題解決型検索の入口。
   - 解決手順を邪魔せず、解決後の次行動として計算機を提示。

5. 台湾「プラチナ/ダイヤ費用」
   - ランク費用という計算機との親和性が非常に高い。
   - CTAクリック→計算開始→初回成功のファネルを重点確認。

## C. 記事 → 計算機 → 次の判断 の導線

### 現状確認

リポジトリには既に以下がある。

- 記事冒頭付近の `article-calculator-prompt`
- `article_to_calculator_clicked`
- 計算開始 `calculator_form_started`
- 初回成功 `calculator_funnel_completed`
- 計算完了 `calculation_completed`
- 計算結果から関連記事 / 判断ページへのクリックイベント

したがって、新しい派手なCTAを増やすのではなく、**既存ファネルを主導線として統一する**。

### 意思決定ルール

- 検索着地直後: まず検索意図への答え
- 答えの直後: 「自分の場合」を計算
- 計算後: 最新キャンペーン / 反映確認 / 関連ガイドのうち、その計算結果に必要な1〜3件だけ提示
- サイト内リンクにUTMを付けない
- CTAを増やして競合させない

### 評価指標

ページ別に以下を追う。

1. Organic landing users
2. `article_to_calculator_clicked`
3. `calculator_form_started`
4. `calculator_funnel_completed`
5. 計算後の `result_decision_link_clicked` / `result_related_article_clicked`

「PVが増えたか」だけでなく、**検索着地100人あたり何人が計算完了まで進むか**を主要指標にする。

## D. 平均掲載順位 4〜15 の集中改善

Search Console 2026-08-02〜08-31 から、表示回数・順位・CTRを合わせて優先度を付ける。

### 最優先

| Query / Page | Impressions | CTR | Position | 判断 |
| --- | ---: | ---: | ---: | --- |
| `google play ポイント増量キャンペーン 予定 2026` → `/latest/` | 356 | 6.74% | 4.35 | 4位台。最新性を守れば最大の上積み候補 |
| `google play ポイント交換 おすすめ` → best-use | 131 | 1.53% | 8.48 | 表示多・CTR低。タイトル/冒頭の検索意図一致を継続改善 |
| `구글 플레이 포인트 현금화` → KO cash conversion | 135 | 1.48% | 8.43 | 最大LPと直結。CTR改善余地が大きい |
| `redeem google play points for cash` → EN cash conversion | 106 | 0.94% | 7.47 | 表示多・CTR低。英語現金化クラスタの代表候補 |
| `google play 抵 用 金 無法 使用` → TW play-credit-not-working | 70 | 1.43% | 4.73 | 4位台なのにCTR低。スニペット一致の余地が大きい |

### 次点

- `google play プラチナ 課金額` → `/` — 83 impressions / 2.41% / 3.43
- `google プレイ ダイヤモンド いくら` → `/` — 58 / 1.72% / 5.28
- `googleplay ポイントアップ` → `/` — 57 / 1.75% / 7.88
- `google play 優惠券` → TW use-coupons — 43 / 2.33% / 8.72
- `play points 使い道` → best-use — 27 / 3.70% / 9.59
- `ウィークリーリワードとは` → weekly-reward — 24 / 4.17% / 8.42
- `プレイポイント 反映されない` → reflection-timing — 20 / 5.00% / 6.25

### 改善原則

1. 4〜15位かつ表示回数が多いクエリを優先。
2. 検索意図と既存本文が一致している場合、内容を増やすより title / description / quick answer /内部リンクを整える。
3. すでに1〜3位のクエリは大きく書き換えず防衛。
4. 同じ検索意図で複数ページが競合する場合は、役割を分けて内部リンクで正規の回答ページへ集約。
5. 変更後は最低7〜14日単位で CTR / position / landing sessions を比較し、短期ノイズで戻さない。

## 今回の結論

PlayPointは「記事数不足」より「すでにGoogleが拾い始めた検索面を深掘りする」段階に移った。新規記事の大量追加より、上位LPのCV導線と4〜15位クエリのCTR改善を優先する。
