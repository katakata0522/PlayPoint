# SEO / Security Hardening — 2026-09-13

## Scope

This hardening pass intentionally changes no article copy, game pricing, title/H1, or ranking-target content. It tightens the production delivery boundary and makes live verification part of the deploy contract.

## SEO

- Keep the existing submitted-URL Head audit as the static canonical/noindex/hreflang/schema gate.
- Add a production registry check for every sitemap declared in `robots.txt`.
- Reject duplicate submitted URLs across submitted sitemaps.
- Require every production sitemap and `<loc>` to stay on canonical HTTPS `https://playpoint-sim.com`.
- Run the sitemap registry check both after deployment and in the scheduled SEO health check.

## Security

- Retain HTTPS redirect, HSTS, `nosniff`, `SAMEORIGIN`, and strict-origin referrer policy.
- Add `Permissions-Policy` for unused powerful browser features.
- Add `X-XSS-Protection: 0` and `X-Permitted-Cross-Domain-Policies: none`.
- Tighten CSP by removing unused CDN/Google Fonts allowlists and adding explicit worker/manifest/media/form/upgrade directives.
- Keep executable inline-script compatibility for the current static architecture, while continuing to block inline event attributes with `script-src-attr 'none'`.
- Fail closed at rsync for `.env`, private key/certificate candidates, logs/SQL/backups, and package-management files.
- Verify on the remote server that sensitive or non-public root artifacts are absent.
- Verify production security headers and inaccessible non-public paths before a deployment may be marked `verified`.

## CI contract

The PR Gate now runs a static SEO/security contract audit. A main deployment can be marked `verified` only after:

1. deployment smoke verification,
2. production SEO health,
3. every submitted sitemap check,
4. production security-header and non-public-path check.

The scheduled SEO health workflow also runs the sitemap and security checks so regressions after deployment are detected independently.
