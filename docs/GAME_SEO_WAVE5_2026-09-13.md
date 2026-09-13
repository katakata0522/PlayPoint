# Game SEO Wave 5 — 2026-09-13

## Scope

Wave 5 adds three high-demand game entry points without hard-coding unverified current product prices:

- プロ野球スピリッツA (`prospi-a`)
- Pokémon GO (`pokemon-go`)
- eFootball™ (`efootball`)

Top-level calculator pages are generated for the same four game locales as the existing game corpus: Japanese, English/US, Korean, and Traditional Chinese/Taiwan. Japanese-only deep guides own the decision-support intent for purchase-route comparisons.

## Accuracy contract

1. A current product price is not published unless it can be fixed from current official evidence. Wave 5 starts all three games with custom Google Play checkout amount input.
2. Google Play purchases, publisher Web Stores, and publisher-specific points are separate systems. They are never added together as if they were one cashback rate.
3. The Google Play checkout screen is the final authority for current purchase amount and expected Play Points.
4. Regional Play Points math is preserved per locale:
   - JP: ¥100 base, tier rates 1 / 1.25 / 1.5 / 1.75 / 2
   - US: $1 base, tier rates 1 / 1.1 / 1.2 / 1.4 / 1.6
   - KR: ₩1,000 base, tier rates 1 / 1.1 / 1.3 / 1.6 / 2
   - TW: NT$30 base, tier rates 1 / 1.25 / 1.5 / 1.75 / 2
5. Prospi A international parent pages explicitly describe the Japan purchase flow as a reference and do not imply regional availability or pricing.

## Prospi A

Official KONAMI evidence confirms:

- Android in-app Energy purchases are processed using payment methods configured for the Google Account / platform store.
- KONAMI Gamesストア is a separate Web Store and KONAMI explicitly advertises it as more advantageous than in-app purchasing.
- Games Store purchases add items to the KONAMI-ID-linked game account.
- Official Games Store rules describe publisher-side rewards including パワスピ・ゴールド and, when linked/eligible, dポイント. These are not Google Play Points.

Deep guide: `/games/prospi-a/google-play-vs-konami-store/`

## Pokémon GO

Official Niantic evidence confirms:

- On Android, PokéCoin purchases can complete through Google Play or Galaxy Store.
- Pokémon GO Web Store is a separate Web Store and advertises bonus PokéCoins / Web-only items versus the in-app shop.
- Eligible real-money Web Store purchases can progress Reward Road; Reward Road is not Google Play Points.
- Free PokéCoins can also be earned through Gym defender gameplay, so paid cost comparisons should not assume every needed PokéCoin is purchased.

Deep guide: `/games/pokemon-go/google-play-vs-webstore/`

## eFootball

Official KONAMI evidence confirms:

- KONAMI publishes Android notices specifically for Google Play users purchasing eFootball Coins.
- eFootball Coins, GP, and eFootball Points are different in-game assets.
- eFootball Points are a KONAMI program requiring KONAMI ID linkage for exchange and are separate from Google Play Points.
- The current coin price is not hard-coded by Wave 5; the actual Google Play checkout is authoritative.

Deep guide: `/games/efootball/google-play-points-vs-efootball-points/`

## Build and regression strategy

Wave 5 is isolated from the large legacy game generator:

1. Existing generator produces the established game corpus.
2. Wave 1–4 correctness layers run unchanged.
3. `game-seo-wave5-sync.cjs` generates the three new titles across four locales, adds portal discovery, and creates the three Japanese decision guides.
4. `game-seo-wave5-regional-sync.cjs` applies region-specific Play Points rate labels and tier values.
5. The normal sitemap and HTML metadata synchronization discovers the generated pages recursively.
6. `tests/game-seo-wave5.test.cjs` prevents fixed-price regressions, regional-rate leakage, purchase-route conflation, thin guide output, and portal/sitemap disappearance.
