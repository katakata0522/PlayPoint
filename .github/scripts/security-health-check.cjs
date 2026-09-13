'use strict';

const { mapWithConcurrency, retry } = require('./http-check-utils.cjs');

const BASE_URL = 'https://playpoint-sim.com';
const FETCH_TIMEOUT_MS = 12000;
const HTTP_CONCURRENCY = 3;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1500;

const REPRESENTATIVE_PATHS = Object.freeze([
  '/',
  '/games/prospi-a/',
  '/games/pokemon-go/',
  '/en/'
]);

const SENSITIVE_PATHS = Object.freeze([
  '/.env',
  '/.git/HEAD',
  '/scripts/build-html.js',
  '/tests/game-page-ssot.test.cjs',
  '/package.json',
  '/package-lock.json'
]);

function withCacheBuster(pathname) {
  const url = new URL(pathname, BASE_URL);
  url.searchParams.set('security_check', String(Date.now()));
  return url.toString();
}

async function fetchResponse(pathname, options = {}) {
  return fetch(withCacheBuster(pathname), {
    cache: 'no-store',
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    },
    redirect: options.redirect || 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
}

function requireHeader(response, name, predicate, expectation) {
  const value = response.headers.get(name) || '';
  if (!predicate(value)) {
    throw new Error(`${response.url}: ${name} expected ${expectation}, got ${value || '(missing)'}`);
  }
  return value;
}

function hasCspDirective(policy, directive, expectedValue = null) {
  const directives = new Map();
  for (const raw of policy.split(';')) {
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;
    directives.set(parts[0], parts.slice(1));
  }
  if (!directives.has(directive)) return false;
  if (expectedValue === null) return true;
  return directives.get(directive).includes(expectedValue);
}

async function checkHeaders(pathname) {
  const response = await fetchResponse(pathname);
  if (!response.ok) throw new Error(`${pathname}: HTTP ${response.status}`);

  requireHeader(
    response,
    'strict-transport-security',
    value => /(?:^|;)\s*max-age=31536000(?:;|$)/i.test(value) && /(?:^|;)\s*includesubdomains(?:;|$)/i.test(value),
    'max-age=31536000; includeSubDomains'
  );
  requireHeader(response, 'x-content-type-options', value => value.toLowerCase() === 'nosniff', 'nosniff');
  requireHeader(response, 'x-frame-options', value => value.toUpperCase() === 'SAMEORIGIN', 'SAMEORIGIN');
  requireHeader(
    response,
    'referrer-policy',
    value => value.toLowerCase() === 'strict-origin-when-cross-origin',
    'strict-origin-when-cross-origin'
  );
  requireHeader(response, 'x-xss-protection', value => value.trim() === '0', '0');
  requireHeader(
    response,
    'x-permitted-cross-domain-policies',
    value => value.toLowerCase() === 'none',
    'none'
  );

  const permissions = requireHeader(
    response,
    'permissions-policy',
    value => ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()', 'usb=()'].every(token => value.includes(token)),
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  if (!permissions) throw new Error(`${pathname}: Permissions-Policy missing`);

  const csp = requireHeader(response, 'content-security-policy', value => value.length > 0, 'a non-empty CSP');
  const requiredCsp = [
    ['default-src', "'self'"],
    ['script-src-attr', "'none'"],
    ['style-src', "'self'"],
    ['font-src', "'self'"],
    ['worker-src', "'self'"],
    ['manifest-src', "'self'"],
    ['media-src', "'self'"],
    ['object-src', "'none'"],
    ['base-uri', "'self'"],
    ['form-action', "'self'"],
    ['frame-ancestors', "'self'"],
    ['upgrade-insecure-requests', null]
  ];
  for (const [directive, value] of requiredCsp) {
    if (!hasCspDirective(csp, directive, value)) {
      throw new Error(`${pathname}: CSP missing ${directive}${value ? ` ${value}` : ''}`);
    }
  }
  for (const staleOrigin of ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com']) {
    if (csp.includes(staleOrigin)) throw new Error(`${pathname}: CSP still allows unused ${staleOrigin}`);
  }
}

async function checkSensitivePath(pathname) {
  const response = await fetchResponse(pathname, { redirect: 'manual' });
  if ([403, 404, 410].includes(response.status)) return;
  throw new Error(`${pathname}: sensitive/non-public path unexpectedly returned HTTP ${response.status}`);
}

async function runChecks(items, check, label) {
  const results = await mapWithConcurrency(items, HTTP_CONCURRENCY, async item => {
    await retry(() => check(item), {
      attempts: MAX_ATTEMPTS,
      delayMs: RETRY_DELAY_MS,
      onRetry: (error, attempt, attempts) => {
        console.warn(`Retry ${attempt + 1}/${attempts} - ${error.message}`);
      }
    });
    return item;
  });

  const failures = [];
  for (const result of results) {
    if (result.status === 'fulfilled') console.log(`ok - ${label} ${result.item}`);
    else {
      failures.push(result.reason);
      console.error(`not ok - ${result.reason.message}`);
    }
  }
  return failures;
}

async function main() {
  const failures = [];
  failures.push(...await runChecks(REPRESENTATIVE_PATHS, checkHeaders, 'security headers'));
  failures.push(...await runChecks(SENSITIVE_PATHS, checkSensitivePath, 'non-public path'));

  if (failures.length > 0) {
    console.error(`Production security health check failed (${failures.length} failures).`);
    process.exitCode = 1;
    return;
  }
  console.log('Production security health check passed.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
