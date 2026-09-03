# International article reading-flow audit — 2026-09-03

## Scope

- Corpus: 102 published EN / KO / TW article pages.
- Goal: enforce the reading order defined in PR #197: **direct answer / summary → calculator CTA → detailed body**.
- Audit target: legacy pages using an opening `<div class="intro">`, which the shared reading-flow generator did not recognize as an answer block.

## Finding

The shared generator recognized introductory `<section>` blocks (`answer-box`, `summary-box`, `intro`) but not the legacy `<div class="intro">` pattern. As a result, the generated calculator CTA was inserted at the start of `<article class="content">` on affected pages, ahead of the direct answer.

After fixing the shared anchor detection and running the canonical `scripts/prepare-pr.cjs` regeneration, **61 of 102 articles changed**:

- EN: 21
- KO: 21
- TW: 19
- Total: 61

The other 41 articles were already using answer-first structures, knowledge-boundary placement, or article-specific contextual CTA placement and therefore did not move.

## Change boundary

For the 61 affected articles, the intended content is unchanged. The generated CTA is moved from before the opening answer to immediately after the opening answer (or to an existing later article-specific anchor where applicable).

This wave does **not** intentionally change:

- titles or meta descriptions
- canonical / hreflang policy
- factual article body copy
- official-source claims
- calculator logic
- article-specific troubleshooting CTA rules
- cash-conversion alternative placement

## Regression protection

`tests/intl-article-reading-flow.test.cjs` now covers both:

1. synthetic legacy `div.intro` pages across EN / KO / TW, including idempotency; and
2. every published international article, asserting that an opening legacy intro precedes the generated calculator CTA.

The existing contextual rules for TW coupon troubleshooting, TW Platinum/Diamond, cash-conversion pages, and knowledge-boundary pages remain protected by their dedicated tests.

## Validation

- Canonical regeneration: `node scripts/prepare-pr.cjs` — passed in GitHub Actions.
- Reading-flow regression test after regeneration — passed in GitHub Actions.
- Generated diff audit: 61 article pages changed; changes are reading-order movement rather than broad content rewrites.

## Follow-up

Measure article → calculator CTA engagement after enough post-deploy data accumulates. Do not infer success or failure from engagement time alone; compare search landing behavior and calculator-click / calculator-start conversion by language and page role.
