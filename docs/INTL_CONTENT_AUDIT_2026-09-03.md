# International Content Audit — 2026-09-03

## Purpose

This audit prioritizes **where to invest next**, not whether an article is "good" or "bad" in isolation. It combines a fixed GA4/Search Console snapshot with repeatable HTML structure checks so future audits can be compared on the same basis.

- GA4 landing/page period: 2026-08-04 to 2026-09-02
- Search Console period: 2026-08-02 to 2026-08-31
- Inventory scanned: 102 EN/KO/TW article pages
- Priority counts: A=13, B=7, C=5, Monitor=77
- HK/IN have no article corpus yet, so their regional gaps are tracked separately below.

## Priority meaning

- **A — Maintain / observe:** already strong, or changed today and should be allowed to collect 7–14 days of data before another rewrite.
- **B — Targeted improvement:** demand exists and the page mostly works, but snippet, first answer, internal role, or one decision branch can be sharpened.
- **C — Redesign candidate:** demand exists but CTR/engagement/intent alignment is weak enough to justify deeper work.
- **M — Monitor:** current demand evidence is too small or absent. This is not a quality penalty; it is a resource-allocation decision.
- **N — New intent gap:** no existing article cleanly owns the intent. New content is created only when evidence is strong enough to avoid thin duplication.

## Quality contract used for review

High-priority international pages should converge toward: direct answer before calculator CTA; concrete examples; comparison table when a choice exists; troubleshooting branches for error intent; clear boundary between official facts and account-specific state; explicit next action; local search vocabulary; current official source; and internal links that assign one owner page per intent.

## Current B/C queue

| Priority | Page | Organic sessions | Engagement | Avg sec | Answer before calc | Structure score / 7 | Action |
|---|---|---:|---:|---:|:---:|---:|---|
| C | `/ko/articles/google-play-points-expiration.html` | 15 | 33.33% | 12 | N | 5 | deep-review-after-wave3 |
| C | `/ko/articles/google-play-points-super-weekly-reward.html` | 12 | 50.00% | 11 | Y | 7 | wave3 |
| C | `/tw/articles/google-play-points-expiration.html` | 10 | 50.00% | 9 | N | 5 | deep-review-after-wave3 |
| C | `/ko/articles/google-play-quests.html` | 5 | 40.00% | 6 | Y | 7 | wave3 |
| C | `/en/articles/google-play-points-gift-cards.html` | 2 | 50.00% | 20 | Y | 7 | wave3 |
| B | `/tw/articles/google-play-points-coupon-not-applied.html` | 26 | 53.85% | 30 | Y | 5 | targeted-snippet-and-intent-review |
| B | `/tw/articles/google-play-quests.html` | 20 | 60.00% | 18 | N | 3 | targeted-first-answer-review |
| B | `/tw/articles/google-play-points-cash-conversion.html` | 15 | 46.67% | 23 | N | 5 | separate-cash-vs-transfer-role |
| B | `/ko/articles/google-play-points-use-coupons.html` | 7 | 85.71% | 15 | N | 3 | snippet-review-later |
| B | `/en/articles/google-play-points-super-weekly-reward.html` | 5 | 60.00% | 39 | N | 4 | monitor-super-ticket-snippet |
| B | `/en/articles/google-play-points-weekly-reward.html` | 4 | 50.00% | 26 | N | 3 | targeted-review-later |
| B | `/ko/articles/google-play-points-platinum-diamond-cost.html` | 2 | 50.00% | 34 | N | 4 | title-snippet-role-review |

### Wave 3 selection

1. **KO quests** — page-one visibility for `구글 플레이 퀘스트` variants but zero clicks in the measured query sample, plus 6s average engagement. Add a Korean search-first diagnostic before any calculator prompt.
2. **KO Super Ticket** — the largest unaddressed Korean intent cluster: generic Super Ticket terms plus `얻는 법` / `사용법`. Front-load acquisition/use rules and the fact that using a ticket replaces the previous Play Points reward.
3. **EN gift cards** — the page currently answers “do gift cards earn points?” while Search Console also exposes “how do Play Points become gift cards?”. One page should own both directions to avoid a duplicate article.

## New-intent gaps

### N1 — 1 play point value in india

- Evidence: 3 impressions / 0 clicks / average position 6 on /in/
- Decision: Strengthen /in/ before creating an India article. Bronze earning rate is 1 point per ₹5 eligible spend, not a fixed ₹5 redemption/cash value.

### N2 — cash out Google Play balance / credit

- Evidence: Small cluster currently landing on the Play Points cash-conversion page, generally lower positions
- Decision: Distinct intent from Play Points cash-out, but defer a new page until the cluster grows enough to avoid premature thin content.

### DEFER — Hong Kong-specific Play Points guides

- Evidence: Very low current HK traffic; shared Traditional Chinese intent is already won by /tw/ pages
- Decision: Do not duplicate Taiwan articles until uniquely Hong Kong demand appears.

## Complete EN / KO / TW inventory

| P | Lang | Page | Modified | Sessions | ER | Answer first | Table | FAQ | Official sources | Action |
|---|---|---|---|---:|---:|:---:|:---:|:---:|---:|---|
| C | KO | `/ko/articles/google-play-points-expiration.html` | 2026-07-24 | 15 | 33.33% | N | Y | Y | 1 | deep-review-after-wave3 |
| C | KO | `/ko/articles/google-play-points-super-weekly-reward.html` | 2026-09-03 | 12 | 50.00% | Y | Y | Y | 2 | wave3 |
| C | TW | `/tw/articles/google-play-points-expiration.html` | 2026-07-24 | 10 | 50.00% | N | Y | Y | 1 | deep-review-after-wave3 |
| C | KO | `/ko/articles/google-play-quests.html` | 2026-09-03 | 5 | 40.00% | Y | Y | Y | 1 | wave3 |
| C | EN | `/en/articles/google-play-points-gift-cards.html` | 2026-09-03 | 2 | 50.00% | Y | Y | Y | 2 | wave3 |
| B | TW | `/tw/articles/google-play-points-coupon-not-applied.html` | 2026-07-25 | 26 | 53.85% | Y | N | Y | 3 | targeted-snippet-and-intent-review |
| B | TW | `/tw/articles/google-play-quests.html` | 2026-08-02 | 20 | 60.00% | N | N | Y | 1 | targeted-first-answer-review |
| B | TW | `/tw/articles/google-play-points-cash-conversion.html` | 2026-08-20 | 15 | 46.67% | N | Y | Y | 2 | separate-cash-vs-transfer-role |
| B | KO | `/ko/articles/google-play-points-use-coupons.html` | 2026-07-25 | 7 | 85.71% | N | N | Y | 2 | snippet-review-later |
| B | EN | `/en/articles/google-play-points-super-weekly-reward.html` | 2026-08-05 | 5 | 60.00% | N | N | Y | 2 | monitor-super-ticket-snippet |
| B | EN | `/en/articles/google-play-points-weekly-reward.html` | 2026-08-05 | 4 | 50.00% | N | N | Y | 3 | targeted-review-later |
| B | KO | `/ko/articles/google-play-points-platinum-diamond-cost.html` | 2026-08-21 | 2 | 50.00% | N | Y | N | 2 | title-snippet-role-review |
| A | KO | `/ko/articles/google-play-points-cash-conversion.html` | 2026-09-03 | 92 | 63.04% | Y | Y | Y | 2 | observe-after-2026-09-03-refresh |
| A | TW | `/tw/articles/google-play-points-platinum-diamond-cost.html` | 2026-08-21 | 24 | 75.00% | Y | Y | N | 2 | maintain |
| A | TW | `/tw/articles/google-play-points-levels.html` | 2026-08-05 | 23 | 69.57% | N | Y | Y | 3 | maintain-and-role-check |
| A | TW | `/tw/articles/google-play-points-weekly-reward.html` | 2026-09-03 | 22 | 86.36% | Y | Y | Y | 4 | observe-after-wave1 |
| A | TW | `/tw/articles/google-play-points-use-coupons.html` | 2026-09-03 | 19 | 52.63% | Y | Y | Y | 3 | observe-after-wave2 |
| A | TW | `/tw/articles/google-play-points-play-credit-not-working.html` | 2026-09-03 | 18 | 61.11% | Y | Y | Y | 4 | observe-after-2026-09-03-refresh |
| A | EN | `/en/articles/google-play-quests.html` | 2026-09-03 | 16 | 62.50% | Y | Y | Y | 1 | observe-after-wave2 |
| A | EN | `/en/articles/google-play-points-cash-conversion.html` | 2026-09-03 | 13 | 61.54% | Y | Y | Y | 2 | observe-after-2026-09-03-refresh |
| A | KO | `/ko/articles/google-play-points-levels.html` | 2026-08-05 | 8 | 87.50% | N | Y | Y | 3 | maintain |
| A | EN | `/en/articles/google-play-points-country-differences.html` | 2026-08-24 | 7 | 85.71% | N | Y | Y | 7 | maintain |
| A | TW | `/tw/articles/google-play-points-multiple-accounts.html` | 2026-08-20 | 7 | 71.43% | N | N | Y | 2 | maintain-as-transfer-owner |
| A | EN | `/en/articles/google-play-points-not-showing.html` | 2026-08-21 | 6 | 83.33% | N | N | Y | 2 | maintain |
| A | EN | `/en/articles/google-play-points-levels.html` | 2026-08-05 | 5 | 100.00% | N | Y | Y | 3 | maintain |
| M | EN | `/en/articles/2026-06-20-discount-gift-cards.html` | 2026-08-05 | 0 | - | N | N | Y | 3 | monitor |
| M | EN | `/en/articles/google-play-balance-combine-payment.html` | 2026-08-04 | 0 | - | N | N | Y | 2 | monitor |
| M | EN | `/en/articles/google-play-games-vs-play-points.html` | 2026-08-04 | 0 | - | N | N | Y | 4 | monitor |
| M | EN | `/en/articles/google-play-points-100-value.html` | 2026-08-03 | 0 | - | N | N | Y | 2 | monitor |
| M | EN | `/en/articles/google-play-points-500-1000-cost.html` | 2026-08-21 | 0 | - | N | Y | Y | 3 | monitor |
| M | EN | `/en/articles/google-play-points-apps-books-purchases.html` | 2026-08-04 | 0 | - | N | N | Y | 3 | monitor |
| M | EN | `/en/articles/google-play-points-balance-history-progress.html` | 2026-08-04 | 0 | - | N | N | Y | 3 | monitor |
| M | EN | `/en/articles/google-play-points-country-change.html` | 2026-08-05 | 0 | - | N | N | Y | 2 | monitor |
| M | EN | `/en/articles/google-play-points-coupon-not-applied.html` | 2026-07-25 | 0 | - | N | N | Y | 3 | monitor |
| M | EN | `/en/articles/google-play-points-device-change.html` | 2026-08-04 | 0 | - | N | N | Y | 2 | monitor |
| M | EN | `/en/articles/google-play-points-discounts-promo-codes.html` | 2026-08-04 | 0 | - | N | N | Y | 4 | monitor |
| M | EN | `/en/articles/google-play-points-earn-free.html` | 2026-08-05 | 0 | - | N | Y | Y | 4 | monitor |
| M | EN | `/en/articles/google-play-points-expiration.html` | 2026-07-24 | 0 | - | N | Y | Y | 1 | monitor |
| M | EN | `/en/articles/google-play-points-family-sharing.html` | 2026-07-24 | 0 | - | N | Y | Y | 2 | monitor |
| M | EN | `/en/articles/google-play-points-fastest-silver.html` | 2026-08-05 | 0 | - | N | N | Y | 3 | monitor |
| M | EN | `/en/articles/google-play-points-join-eligibility.html` | 2026-08-05 | 0 | - | N | N | Y | 4 | monitor |
| M | EN | `/en/articles/google-play-points-level-maintenance-reset.html` | 2026-07-25 | 0 | - | N | N | Y | 2 | monitor |
| M | EN | `/en/articles/google-play-points-multiple-accounts.html` | 2026-07-25 | 0 | - | N | N | Y | 2 | monitor |
| M | EN | `/en/articles/google-play-points-platinum-diamond-cost.html` | 2026-08-21 | 0 | - | N | Y | N | 2 | monitor |
| M | EN | `/en/articles/google-play-points-play-credit-not-working.html` | 2026-07-25 | 0 | - | N | N | Y | 4 | monitor |
| M | EN | `/en/articles/google-play-points-promotion-not-applied.html` | 2026-08-03 | 0 | - | N | N | Y | 1 | monitor |
| M | EN | `/en/articles/google-play-points-promotion-stacking.html` | 2026-08-05 | 0 | - | N | N | Y | 2 | monitor |
| M | EN | `/en/articles/google-play-points-refund.html` | 2026-07-24 | 0 | - | N | Y | Y | 2 | monitor |
| M | EN | `/en/articles/google-play-points-rounding-tax.html` | 2026-08-04 | 0 | - | N | N | Y | 2 | monitor |
| M | EN | `/en/articles/google-play-points-subscriptions.html` | 2026-08-03 | 0 | - | N | N | Y | 1 | monitor |
| M | EN | `/en/articles/google-play-points-use-coupons.html` | 2026-09-03 | 0 | - | Y | Y | Y | 3 | monitor |
| M | KO | `/ko/articles/2026-06-20-discount-gift-cards.html` | 2026-08-05 | 0 | - | N | N | Y | 3 | monitor |
| M | KO | `/ko/articles/google-play-balance-combine-payment.html` | 2026-08-04 | 0 | - | N | N | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-games-vs-play-points.html` | 2026-08-04 | 0 | - | N | N | Y | 4 | monitor |
| M | KO | `/ko/articles/google-play-points-100-value.html` | 2026-08-21 | 0 | - | N | N | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-500-1000-cost.html` | 2026-08-04 | 0 | - | N | Y | Y | 3 | monitor |
| M | KO | `/ko/articles/google-play-points-apps-books-purchases.html` | 2026-08-04 | 0 | - | N | N | Y | 3 | monitor |
| M | KO | `/ko/articles/google-play-points-balance-history-progress.html` | 2026-08-04 | 0 | - | N | N | Y | 3 | monitor |
| M | KO | `/ko/articles/google-play-points-country-change.html` | 2026-08-05 | 0 | - | N | N | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-country-differences.html` | 2026-08-21 | 0 | - | N | Y | Y | 5 | monitor |
| M | KO | `/ko/articles/google-play-points-coupon-not-applied.html` | 2026-07-25 | 0 | - | N | N | Y | 3 | monitor |
| M | KO | `/ko/articles/google-play-points-device-change.html` | 2026-08-04 | 0 | - | N | N | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-discounts-promo-codes.html` | 2026-08-04 | 0 | - | N | N | Y | 4 | monitor |
| M | KO | `/ko/articles/google-play-points-earn-free.html` | 2026-08-05 | 0 | - | N | Y | Y | 4 | monitor |
| M | KO | `/ko/articles/google-play-points-family-sharing.html` | 2026-07-24 | 0 | - | N | Y | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-fastest-silver.html` | 2026-08-05 | 0 | - | N | N | Y | 3 | monitor |
| M | KO | `/ko/articles/google-play-points-gift-cards.html` | 2026-08-03 | 0 | - | N | N | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-join-eligibility.html` | 2026-08-05 | 0 | - | N | N | Y | 4 | monitor |
| M | KO | `/ko/articles/google-play-points-level-maintenance-reset.html` | 2026-07-25 | 0 | - | N | N | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-multiple-accounts.html` | 2026-07-25 | 0 | - | N | N | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-not-showing.html` | 2026-08-21 | 0 | - | N | N | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-play-credit-not-working.html` | 2026-07-25 | 0 | - | N | N | Y | 4 | monitor |
| M | KO | `/ko/articles/google-play-points-promotion-not-applied.html` | 2026-08-21 | 0 | - | N | N | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-promotion-stacking.html` | 2026-08-05 | 0 | - | N | N | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-refund.html` | 2026-07-24 | 0 | - | N | Y | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-rounding-tax.html` | 2026-08-04 | 0 | - | N | N | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-subscriptions.html` | 2026-08-21 | 0 | - | N | N | Y | 2 | monitor |
| M | KO | `/ko/articles/google-play-points-weekly-reward.html` | 2026-08-05 | 0 | - | N | N | Y | 3 | monitor |
| M | TW | `/tw/articles/2026-06-20-discount-gift-cards.html` | 2026-08-05 | 0 | - | N | N | Y | 3 | monitor |
| M | TW | `/tw/articles/google-play-balance-combine-payment.html` | 2026-08-04 | 0 | - | N | N | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-games-vs-play-points.html` | 2026-08-04 | 0 | - | N | N | Y | 4 | monitor |
| M | TW | `/tw/articles/google-play-points-100-value.html` | 2026-07-24 | 0 | - | N | N | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-points-500-1000-cost.html` | 2026-08-04 | 0 | - | N | Y | Y | 3 | monitor |
| M | TW | `/tw/articles/google-play-points-apps-books-purchases.html` | 2026-08-04 | 0 | - | N | N | Y | 3 | monitor |
| M | TW | `/tw/articles/google-play-points-balance-history-progress.html` | 2026-08-04 | 0 | - | N | N | Y | 3 | monitor |
| M | TW | `/tw/articles/google-play-points-country-change.html` | 2026-08-05 | 0 | - | N | N | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-points-country-differences.html` | 2026-08-21 | 0 | - | N | Y | Y | 5 | monitor |
| M | TW | `/tw/articles/google-play-points-device-change.html` | 2026-08-04 | 0 | - | N | N | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-points-discounts-promo-codes.html` | 2026-08-04 | 0 | - | N | N | Y | 4 | monitor |
| M | TW | `/tw/articles/google-play-points-earn-free.html` | 2026-08-05 | 0 | - | N | Y | Y | 4 | monitor |
| M | TW | `/tw/articles/google-play-points-family-sharing.html` | 2026-07-24 | 0 | - | N | Y | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-points-fastest-silver.html` | 2026-08-05 | 0 | - | N | N | Y | 3 | monitor |
| M | TW | `/tw/articles/google-play-points-gift-cards.html` | 2026-08-03 | 0 | - | N | N | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-points-join-eligibility.html` | 2026-08-05 | 0 | - | N | N | Y | 4 | monitor |
| M | TW | `/tw/articles/google-play-points-level-maintenance-reset.html` | 2026-07-25 | 0 | - | N | N | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-points-not-showing.html` | 2026-08-21 | 0 | - | N | N | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-points-promotion-not-applied.html` | 2026-08-21 | 0 | - | N | N | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-points-promotion-stacking.html` | 2026-08-05 | 0 | - | N | N | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-points-refund.html` | 2026-07-24 | 0 | - | N | Y | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-points-rounding-tax.html` | 2026-08-04 | 0 | - | N | N | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-points-subscriptions.html` | 2026-08-21 | 0 | - | N | N | Y | 2 | monitor |
| M | TW | `/tw/articles/google-play-points-super-weekly-reward.html` | 2026-08-05 | 0 | - | N | N | Y | 2 | monitor |

## Re-run

```bash
node scripts/audit-intl-content.cjs
```

Refresh the demand snapshot before using this report for a later decision window. Do not compare a freshly edited page against a full prior-month baseline without marking the observation window.
