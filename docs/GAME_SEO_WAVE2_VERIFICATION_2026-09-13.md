# Game SEO Wave 2 verification — 2026-09-13

## Scope

Second-wave verification covers the generated Japanese game pages for Honkai: Star Rail, Zenless Zone Zero, Uma Musume, Project SEKAI, NIKKE, and Gakuen Idolmaster, plus their new deep-dive guides where applicable.

## Release rules

- Keep the gacha/pity search intent, but do not present a fixed yen amount when actual cash spend varies with owned currency, free currency, monthly passes, first-purchase bonuses, campaigns, or purchase route.
- Do not reuse official WebStore prices as Google Play prices.
- When a current Google Play price cannot be fixed from sufficiently authoritative evidence, expose custom amount input instead of an old fixed pack list.
- Keep verification confidence explicit: official, current published price snapshot, or price recheck pending.

## Final generated HTML audit

### Honkai: Star Rail

- 980+110 Oneiric Shards: 1,840 yen in the generated Japanese calculator.
- Removed fixed 27,000 yen / 54,000 yen pity presets.
- Kept pity as a search intent and linked `/games/starrail/supply-pass-value/`.

### Zenless Zone Zero

- 980+110 Monochrome: 1,840 yen in the generated Japanese calculator.
- Removed fixed 27,000 yen / 54,000 yen pity presets.
- Linked `/games/zzz/membership-value/`.

### Uma Musume

- Removed the discontinued Daily Jewel Pack from the current purchase selector.
- Current monthly choices shown as Umasuku 980 yen and Uma Plan 1,980 yen.
- Removed the fixed 60,000 yen 200-pull preset.
- Linked `/games/umamusume/umasuku-value/`.

### Project SEKAI

- Google Play calculator is custom-input only until current Google Play prices are verified.
- Official WebStore pricing is kept separate from Google Play Points.
- Removed the fixed 90,000 yen 300-pull preset.
- Linked `/games/proseka/google-play-vs-webstore/`.

### NIKKE

- Removed unverified fixed Google Play pack prices and fixed cash estimates for 200 pulls / limit breaks.
- Calculator is custom-input only and instructs users to use the amount shown by Google Play.

### Gakuen Idolmaster

- Removed unverified fixed pack/pass prices and the fixed 60,000 yen 200-pull estimate.
- Calculator is custom-input only and the previous points/rank contradiction is removed.

## Automated evidence before PR merge

- Canonical generation workflow completed successfully.
- `node scripts/prepare-pr.cjs` completed successfully.
- `tests/game-seo-expanded.test.cjs` and `tests/game-seo-depth.test.cjs` passed after canonical regeneration.
- Browser calculator smoke passed on the final generated HEAD.
- GitHub Advanced Security reported no new CodeQL alerts in code changed by PR #272.

The repository-wide `PR Gate` remains the required merge gate. This document does not replace it; it records the direct and focused evidence used to review the final generated output.
