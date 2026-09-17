# Browser storage contract

## Purpose

PlayPoint stores a small amount of state in the browser. A UI refactor, schema change, malformed value, or future version must never silently discard the previous raw value.

## Persistent and temporary stores

| Key / store | Owner | Kind | Schema / retention | Export | Analytics | Failure policy |
| --- | --- | --- | --- | --- | --- | --- |
| `hokuhokuDiaryData` | `js/diary.js` | localStorage | Legacy unversioned diary tree: year → month → week → `{ points, prize }` | Yes, raw JSON | Never | Invalid JSON/schema is preserved before the first valid replacement |
| `hokuhokuDiaryDataRecoveryV1` | `js/language-suggestion.js` | localStorage | Recovery envelope containing the unreadable raw diary value | Manual recovery only | Never | A different existing recovery copy is never overwritten |
| `playpointLastMainCalculationV1` | `js/first-view.js` | localStorage | Version 1, per-region last successful main-calculation input | No | Never | Malformed/unknown data is preserved before a valid V1 replacement |
| `playpointLastMainCalculationRecoveryV1` | `js/language-suggestion.js` | localStorage | Recovery envelope containing the previous malformed or future-version value | Manual recovery only | Never | A different existing recovery copy is never overwritten |
| `playpointPreferredRegion` | `js/region-navigation.js` | localStorage | Region code string | No | No raw value | Invalid/unavailable storage falls back to path/browser locale |
| `playpoint_reading_library_v1` | `js/reading-library.js` | localStorage | Saved articles (100), recent articles (20), history flag | No | Never | Phase 1 follow-up: add the same explicit schema/fail-closed contract |
| `katakata_blog_settings` | `blog/script.js` | localStorage | Theme and sort preferences | No | Only finite theme-change classification | Phase 1 follow-up: prevent malformed settings from being cleaned and overwritten |
| `playpointCalculatorEntryContext` | `js/analytics-core.js` | sessionStorage | Consent-gated finite attribution values, maximum 30 minutes | No | Allowed finite values only | Invalid/expired data is removed; no form value is stored |
| `playpointLangBannerClosed` | `js/first-view.js` | sessionStorage | Boolean-like dismissal marker for the current tab | No | No | Failure only re-shows the recommendation |
| `playpoint:widget-referral-tracked` | `js/widget-referral.js` | sessionStorage | Per-tab deduplication marker | No | Event classification only | Failure may duplicate the event but does not affect user data |
| `dismiss_mobile_sticky_cta` | `blog/article.js` | sessionStorage | Per-tab UI dismissal marker | No | No | Failure only re-shows the CTA |
| Service Worker Cache Storage | `sw.js` | Cache Storage | Public static response cache, versioned by the service worker | Not user data | No | Cache can be deleted/rebuilt; it is not migrated as user state |
| Google CMP / consent state | Google Privacy & Messaging | Cookie / third-party managed state | Managed by Google/TCF contract | Outside app export | Consent controls analytics/ads | Do not reinterpret or migrate as PlayPoint-owned JSON |

## Non-destructive rules

1. A read failure and an empty valid store are different states.
2. Malformed JSON, a wrong root type, or a future version must not be lost without retaining its exact raw value.
3. Replacement data must pass the current owned schema before it is written.
4. The original raw value is copied to a versioned recovery envelope before the first valid replacement.
5. An existing recovery envelope that contains different raw data is never overwritten automatically; the new write is blocked instead.
6. Migrations must be idempotent, must validate the output before commit, and must retain the pre-migration raw value until the new schema has been read successfully.
7. No raw amount, needed-points value, diary content, saved-list title, or browser-storage dump may be sent to Analytics.
8. Cache Storage and temporary session markers are documented but are not user backup data.

## Current implementation boundary

The first Stage 1 patch protects the two calculator-owned stores that can be automatically rewritten during normal calculation or diary use:

- `hokuhokuDiaryData`
- `playpointLastMainCalculationV1`

The reading library and blog settings remain inventoried follow-up items. Their implementation should be changed in a separate minimal PR so a large article-runtime diff is not mixed into diary and calculator safety.

## Test obligations

- Valid current data round-trips without mutation.
- Malformed JSON, wrong schemas, and future versions are copied byte-for-byte to a recovery envelope before replacement.
- Invalid replacement data is rejected.
- A different existing recovery copy blocks an unbacked overwrite.
- Repeated guard installation is idempotent.
- Session storage and unrelated localStorage keys are unaffected.
