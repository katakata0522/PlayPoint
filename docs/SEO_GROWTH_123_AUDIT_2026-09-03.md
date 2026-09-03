# PlayPoint SEO Growth 1-2-3 Audit — 2026-09-03

## Scope

This audit connects three growth tasks instead of optimizing them independently:

1. Article → calculator funnel attribution
2. Search Console opportunities at average position 4–15
3. CTR / intent-owner audit

Search data source: `PlayPoint Analytics` → `🔎検索語×ページ`, period 2026-08-02 through 2026-08-31 (FINAL).

A live sheet tab `🎯SEO改善候補` now filters rows with average position 4–15 and at least 10 impressions. The sheet's `CTR監査優先 / 順位改善優先 / 観測` label is a triage heuristic, not an industry CTR benchmark. Final decisions also consider search intent, competing PlayPoint URLs, sample size, and whether the page was changed on 2026-09-03.

## 1. Funnel measurement

Existing events are reused:

- `article_to_calculator_clicked`
- `calculator_form_started`
- `calculator_funnel_completed`
- `calculation_completed` / `reverse_calculation_completed`

The calculator entry context is limited to:

- `entry_source_path`
- `entry_link_context`
- `calculator_preset`

No entered amount, points value, diary text, or other form value is added.

The entry is stored only for the handoff from an internal article/LP to the calculator. When the calculator first reads it, it moves from sessionStorage to page-local memory. This lets Start and First success keep the same article source even if `calculation_completed` fires before the MutationObserver-backed funnel completion event, while preventing the same source from leaking into a later unrelated calculator visit.

Evaluation should use article × country × locale `activeUsers` at each stage:

`Article view → calculator click → calculator start → first successful result`

Primary rates:

- View → Click
- Click → Start
- Start → First success
- View → First success

Do not use repeated calculation event counts as the conversion denominator.

## 2. Search position 4–15 opportunities

### Protect / rank rather than rewrite

#### `/latest/`

Query: `google play ポイント増量キャンペーン 予定 2026`

- 356 impressions
- 24 clicks
- CTR 6.74%
- average position 4.35

The snippet already matches the query and earns clicks. Priority is authority / ranking improvement, not a title rewrite.

### Observe after 2026-09-03 changes

The following surfaces have meaningful impressions but were materially refreshed on 2026-09-03. Avoid same-day rewrite churn; remeasure after 7–14 days:

- EN cash conversion cluster (`redeem google play points for cash`: 106 impressions / 1 click / position 7.47)
- KO cash conversion (`구글 플레이 포인트 현금화`: 135 / 2 / 8.43)
- TW Play credit troubleshooting (`google play 抵 用 金 無法 使用`: 70 / 1 / 4.73)
- TW / EN / KO international pages changed in content-quality Waves 1–5

### Intent-owner cleanup

#### JP generic exchange / recommendations

Owner: `articles/2025-12-25-best-use.html`

Exact query `google play ポイント交換 おすすめ`:

- best-use: 131 impressions / 2 clicks / position 8.48
- cash-conversion: 43 impressions / 0 clicks / position 9.00

The best-use page was refreshed on 2026-09-03 and its title directly targets recommendations. Keep it as the generic exchange / best-use owner and observe before another rewrite.

#### JP cash / PayPay

Owner: `articles/2026-07-24-play-points-cash-conversion.html`

Signals:

- `google play ポイント交換`: 68 impressions / 0 clicks / position 10.29
- `google play ポイント 交換 paypay`: 49 impressions / 0 clicks / position 7.65
- generic recommendation overlap: 43 impressions / 0 clicks / position 9.00

Current title also says `交換先・使い道を比較`, which overlaps the best-use owner. High-confidence action: specialize this page around cash-out / PayPay impossibility and route generic 'which reward should I choose?' intent to best-use.

#### TW transfer

Owner: `tw/articles/google-play-points-multiple-accounts.html`

Exact query `play points 轉移`:

- multiple-accounts: 64 impressions / 2 clicks / position 3.52
- cash-conversion: 58 / 0 / 6.03
- country-change: 11 / 0 / 6.64

The owner is already clear. Do not create another transfer article. Revisit internal ownership after the 2026-09-03 international changes have accrued enough data.

#### JP weekly reward

There is still role mixing between the broad weekly article and the super-weekly article:

- `ウィークリーリワードとは`: broad weekly 24 impressions / 1 click / position 8.42
- same generic intent also reaches super-weekly, including 35 impressions / 0 clicks / position 3.34 on one exact variant
- `google play ウィークリーリワード 確率`: super-weekly 21 / 1 / position 1.95 vs broad weekly 14 / 0 / 10.50

Do not add a new article. A later focused ownership pass should make broad weekly own 'what is weekly reward / schedule / types' and super-weekly own 'super / Super Ticket / special prize' intent.

## 3. Immediate CTR action

Only one page is changed immediately in this batch: JP cash conversion.

Target role:

- cash-out possible or not
- PayPay / bank transfer possible or not
- safe official alternatives after the direct 'no'

Generic recommendation intent remains owned by best-use.

Pages changed on 2026-09-03 are deliberately put into observation rather than repeatedly rewritten.

## Next evaluation

Prioritize future work with:

`impressions × ranking headroom × CTR / intent mismatch × article→calculator conversion × business value`

Do not optimize a page from CTR or engagement time alone. Short-answer intents can satisfy users quickly; high-ranking snippets can already be healthy even when their raw CTR is below a generic benchmark.
