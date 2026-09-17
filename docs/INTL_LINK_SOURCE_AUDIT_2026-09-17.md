# International Link / Region / Source Audit — Chapter 2 baseline

Date: 2026-09-17
Scope: Chapter 2 entry point only. This document inventories navigation ownership and audit rules; it does not yet rewrite production links.

## Goal

Create a reproducible inventory that answers all three questions for every public HTML page:

1. **Where does this link go now?**
2. **Is that destination correct for the source page's Play country / locale?**
3. **Which source generator or normalizer owns the link, so the fix is made at the source rather than hand-editing generated HTML?**

The audit is intentionally broader than a dead-link checker. A link can return HTTP 200 and still be wrong because it leaks an EN/KO/TW reader into Japanese content even though a localized equivalent exists.

## Coverage contract

The scanner walks every committed `*.html` file and inventories every `<a href>` plus canonical / hreflang metadata.

It classifies source pages by path:

| Prefix | Audit locale / Play country surface |
| --- | --- |
| `/` and non-locale directories | `ja` |
| `/en/` | `en` / United States |
| `/ko/` | `ko` / Korea |
| `/tw/` | `tw` / Taiwan |
| `/hk/` | `hk` / Hong Kong calculator surface |
| `/in/` | `in` / India calculator surface |

For each anchor it records:

- source file
- source locale
- component context: region switcher / breadcrumb / author / related / CTA / navigation / footer / content
- raw `href`
- normalized internal route
- target locale
- resolved target file when present
- issue codes
- localized equivalent candidate when one exists

Separate inventories cover:

- canonical tags
- hreflang targets
- Play country switcher destination completeness
- generator / normalizer candidates under `scripts/`, `js/`, `blog/`, and `.github/scripts/`

## Issue codes

| Code | Meaning | Chapter 2 treatment |
| --- | --- | --- |
| `BROKEN_INTERNAL_TARGET` | The resolved local file does not exist | investigate and fix source owner |
| `INVALID_HREF` | URL cannot be parsed | investigate and fix source owner |
| `NON_JA_TO_JA_BLOG` | Non-Japanese page points directly at `/blog/` | normally a locale leak; verify intent |
| `LOCALIZED_EQUIVALENT_EXISTS` | Non-Japanese page points into JA while the same path exists under its locale | high-priority wrong-locale candidate |
| `CROSS_LOCALE_TARGET` | Non-Japanese page links to a different non-Japanese locale outside the region switcher | verify or fix |
| `MISSING_CANONICAL` | HTML page has no canonical link | SEO/source ownership review |
| `MULTIPLE_CANONICALS` | More than one canonical | SEO/source ownership review |
| `CANONICAL_ROUTE_MISMATCH` | canonical does not match the committed page route | verify aliases before fixing |
| `BROKEN_HREFLANG_TARGET` | hreflang target does not resolve locally | verify locale publication contract |
| `REGION_SWITCHER_MISSING_DESTINATIONS` | a page with region-switch UI does not expose all six supported calculator regions | verify shell type before fixing |

Important: the first baseline is **inventory-only**. Findings are not automatically treated as defects until aliases, redirect contracts, intentionally Japanese-only content, and generated-page ownership are checked.

## Current build ownership map

The build pipeline in `scripts/build-html.js` is the authoritative execution order. Multiple passes can touch the same generated HTML, so ownership must be traced to the **last responsible pass**, not merely the first writer.

### 1. Calculator home / locale top pages

Primary owners:

- `scripts/locale-config.cjs` — locale copy/config SSOT
- `scripts/language-page-builder.cjs` — writes locale top pages and rewrites relative links
- `scripts/region-page-sync.cjs` — HK / IN region pages
- `scripts/region-hreflang-sync.cjs` — region hreflang set
- `scripts/calculator-header-sync.cjs` — calculator Site Shell headers
- `js/region-navigation.js` — runtime Play country selection and redirect behavior

Risk note: `language-page-builder.cjs` currently performs string-based relative-path rewriting and then applies specific route exceptions. Chapter 2 must inventory the emitted links before Chapter 3 replaces brittle rewrite patterns.

### 2. International guide/article publication

Primary writers / normalizers executed by `build-html.js`:

1. `scripts/intl-seo-pages.cjs`
2. `scripts/intl-game-guide-publish-normalize.cjs`
3. `scripts/intl-manual-content-sync.cjs`
4. `scripts/intl-content-expansion.cjs`
5. `scripts/intl-article-hreflang-sync.cjs`
6. `scripts/intl-article-layout.cjs`
7. `scripts/intl-hub-discovery.cjs`
8. `scripts/intl-navigation-sidebar-v1.cjs`
9. later article finalizers
10. final `scripts/intl-article-hreflang-sync.cjs` pass

This order matters: a correct early link can be overwritten by a later shell/navigation/finalizer pass.

### 3. International navigation contract

Design/source contract:

- `docs/INTL_NAVIGATION_SIDEBAR_V1_2026-09-11.md`
- `scripts/intl-navigation-sidebar-v1.cjs`
- `tests/intl-navigation-sidebar-v1.test.cjs`

Existing contract already states that contextual related links should remain **same-locale**, and the country selector represents **Play country**, not a generic language picker.

### 4. Hreflang / canonical ownership

Relevant sources:

- `scripts/region-hreflang-sync.cjs`
- `scripts/intl-article-hreflang-sync.cjs`
- `scripts/manual-lp-hreflang-sync.cjs`
- `scripts/author-hreflang-sync.cjs`
- `scripts/seo-head-audit.cjs`
- `scripts/article-seo-normalize.cjs`
- `.github/scripts/seo-health-check.cjs`

Chapter 2 should avoid creating a second independent hreflang registry unless the audit proves the existing split cannot be reconciled.

### 5. Breadcrumb / related / next action ownership

Relevant sources:

- `scripts/intl-navigation-sidebar-v1.cjs`
- `scripts/intl-article-layout.cjs`
- `scripts/article-content-navigation-normalize.cjs`
- `scripts/article-discovery-sync.cjs`
- `scripts/article-role-registry.cjs`
- `scripts/article-role-next-action-audit.cjs`
- `blog/article.js` for Japanese runtime contextual behavior

These links must be checked independently because they have different intent: current-location hierarchy, contextual reading, and calculator conversion are not interchangeable.

### 6. Author / trust navigation ownership

Relevant sources:

- `scripts/intl-author-pages.cjs`
- `scripts/author-hreflang-sync.cjs`
- `scripts/article-author-semantics.cjs`
- `scripts/intl-navigation-sidebar-v1.cjs`

Locale-local operator profile links should not silently jump to the Japanese profile when a localized profile exists.

### 7. Japanese-only / game / manual landing pages

These must remain in the scan because they can be linked from international surfaces or included in hreflang/navigation generation:

- `scripts/game-guide-article-hub-sync.cjs`
- `scripts/game-seo-sync.cjs`
- `scripts/game-seo-safety-sync.cjs`
- `scripts/game-seo-expanded-sync.cjs`
- `scripts/game-seo-wave3-sync.cjs`
- `scripts/game-seo-wave4-sync.cjs`
- `scripts/game-seo-wave5-sync.cjs`
- `scripts/game-seo-wave5-regional-sync.cjs`
- `scripts/manual-lp-hreflang-sync.cjs`
- `scripts/fixed-page-header-sync.cjs`
- `scripts/legal-page-lang-nav-sync.cjs`

## Generator candidate inventory rule

`scripts/intl-link-source-audit.cjs` does not hard-code only the files listed above. It also scans source directories and records any JS/CJS/MJS/HTML file containing navigation/localization signals such as:

- `href`
- `canonical`
- `hreflang`
- `breadcrumb`
- `region`
- `locale`
- `articles`
- `blog`
- `author`
- `related`

It also marks files that mutate/generate HTML (`writeFile`, `replace`, `split().join()`, generator-like filenames). This is deliberately redundant so a newly added generator cannot disappear from the inventory just because this document was not updated.

## False-positive handling

Do not bulk-fix audit output blindly.

Before a Chapter 2 fix is accepted, each finding must be assigned one of:

- **BUG** — wrong destination; localized/region-correct target exists or intended route is clear
- **INTENTIONAL_JA_FALLBACK** — no localized page and Japanese fallback is intentionally user-visible
- **REGION_SWITCH_EXCEPTION** — cross-locale route is a deliberate Play country change
- **ALIAS/ROUTE_CONTRACT** — canonical or link points at an intentional alias/redirect route
- **GENERATOR_FALSE_POSITIVE** — parser context is insufficient; improve the audit before suppressing broadly

Any suppression should be narrow and source-documented; do not create a large allowlist that hides future mistakes.

## PR completion criteria for this baseline

- audit scanner syntax/tests pass
- scanner executes against the real repository in PR Gate
- every public HTML file discovered by the repository is included in the scan
- full JSON + Markdown evidence is preserved in CI artifacts
- generator/source candidate list is produced from the repo, not hand-curated only
- actual baseline findings are reviewed before any automatic failure threshold is introduced
- no production link, UI, copy, calculator logic, canonical, or hreflang is changed in this PR

## Next PR after baseline

Use this audit output to create the first Chapter 2 correction PR. Fix **generation sources first**, regenerate normal outputs, then verify:

1. static audit
2. existing SEO/navigation tests
3. complete preflight
4. Chromium navigation on representative JA / EN / KO / TW / HK / IN surfaces
5. production deploy + exact post-deploy verification

Only after the concrete wrong-locale routes are fixed should Chapter 3 start consolidating brittle exact-string / regex rewrites into stronger SSOT or marker-based ownership.
