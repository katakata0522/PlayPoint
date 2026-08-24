'use strict';

const { mapWithConcurrency, retry } = require('./http-check-utils.cjs');
const { validateLatestHub } = require('../../scripts/latest-hub-audit.cjs');
const { findHiddenFaqItems, hasLargeImagePreview } = require('../../scripts/article-seo-normalize.cjs');

const BASE_URL = 'https://playpoint-sim.com';
const FETCH_TIMEOUT_MS = 12000;
const HTTP_CONCURRENCY = 4;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1500;
const REPRESENTATIVE_OGP_URL = `${BASE_URL}/articles/ogp/weekly-reward.png`;
const ENFORCE_LATEST_HUB_NEXT_CHECK = process.env.LATEST_HUB_ENFORCE_NEXT_CHECK === '1';
const RELATED_HEADING_PATTERN = /(関連記事|あわせて読みたい|次に確認したい|Related guides|Related articles|Read next|관련|함께 읽|相關|延伸閱讀)/i;
const SCOPE_NOTE_PATHS = new Set([
  '/articles/2026-07-24-play-points-100-value.html',
  '/articles/2026-07-24-play-points-500-1000-value.html',
  '/en/articles/google-play-points-family-sharing.html',
  '/en/articles/google-play-points-multiple-accounts.html',
  '/en/articles/google-play-points-gift-cards.html',
  '/en/articles/google-play-points-subscriptions.html'
]);

const pageUrls = [
  `${BASE_URL}/`,
  `${BASE_URL}/about-playpoints.html`,
  `${BASE_URL}/info.html`,
  `${BASE_URL}/privacy.html`,
  `${BASE_URL}/terms.html`,
  `${BASE_URL}/attention.html`,
  `${BASE_URL}/sitemap.html`,
  `${BASE_URL}/latest/`,
  `${BASE_URL}/hk/`,
  `${BASE_URL}/in/`,
  `${BASE_URL}/status/diamond/`,
  `${BASE_URL}/status/platinum/`,
  `${BASE_URL}/status/gold/`,
  `${BASE_URL}/status/silver/`,
  `${BASE_URL}/maintenance/platinum/`,
  `${BASE_URL}/maintenance/diamond/`,
  `${BASE_URL}/campaign/2x/`,
  `${BASE_URL}/campaign/3x/`,
  `${BASE_URL}/campaign/wait/`,
  `${BASE_URL}/amount/10000/`,
  `${BASE_URL}/en/status/diamond/`,
  `${BASE_URL}/en/status/platinum/`,
  `${BASE_URL}/en/status/gold/`,
  `${BASE_URL}/en/status/silver/`,
  `${BASE_URL}/en/campaign/2x/`,
  `${BASE_URL}/en/campaign/3x/`,
  `${BASE_URL}/en/campaign/wait/`,
  `${BASE_URL}/en/amount/10000/`,
  `${BASE_URL}/ko/status/diamond/`,
  `${BASE_URL}/ko/status/platinum/`,
  `${BASE_URL}/ko/status/gold/`,
  `${BASE_URL}/ko/status/silver/`,
  `${BASE_URL}/ko/campaign/2x/`,
  `${BASE_URL}/ko/campaign/3x/`,
  `${BASE_URL}/ko/campaign/wait/`,
  `${BASE_URL}/ko/amount/10000/`,
  `${BASE_URL}/tw/status/diamond/`,
  `${BASE_URL}/tw/status/platinum/`,
  `${BASE_URL}/tw/status/gold/`,
  `${BASE_URL}/tw/status/silver/`,
  `${BASE_URL}/tw/campaign/2x/`,
  `${BASE_URL}/tw/campaign/3x/`,
  `${BASE_URL}/tw/campaign/wait/`,
  `${BASE_URL}/tw/amount/10000/`
];

function withCacheBuster(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('seo_check', String(Date.now()));
  return parsed.toString();
}

async function fetchText(url) {
  const response = await fetch(withCacheBuster(url), {
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });

  const body = await response.text();
  return { response, body };
}

function assertIncludes(body, pattern, message) {
  const matched = pattern instanceof RegExp ? pattern.test(body) : body.includes(pattern);
  if (!matched) throw new Error(message);
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasStaticRelatedSection(body) {
  if (/class=["'][^"']*\b(?:related-links-section|contextual-guide-links|article-related-guides)\b[^"']*["']/i.test(body)) {
    return true;
  }

  return [...body.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
    .some((match) => RELATED_HEADING_PATTERN.test(stripTags(match[1])));
}

async function checkPage(url) {
  const { response, body } = await fetchText(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);

  assertIncludes(body, /<title>[\s\S]*?<\/title>/i, `${url}: title missing`);
  assertIncludes(body, /<meta\s+name="description"\s+content="[^"]+"/i, `${url}: description missing`);
  assertIncludes(body, /<link\s+rel="canonical"\s+href="[^"]+"/i, `${url}: canonical missing`);
  assertIncludes(body, /<meta\s+name="robots"\s+content="[^"]+"/i, `${url}: robots missing`);
  assertIncludes(body, /<script\s+type="application\/ld\+json">/i, `${url}: structured data missing`);
}

async function checkLatestHub() {
  const url = `${BASE_URL}/latest/`;
  const { response, body } = await fetchText(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);

  return validateLatestHub(body, {
    enforceFreshness: true,
    enforceNextCheckDates: ENFORCE_LATEST_HUB_NEXT_CHECK,
    maxAgeDays: 14
  });
}

async function checkSitemap() {
  const [robots, sitemap] = await Promise.all([
    fetchText(`${BASE_URL}/robots.txt`),
    fetchText(`${BASE_URL}/sitemap.xml`)
  ]);

  if (!robots.response.ok) throw new Error(`${BASE_URL}/robots.txt: HTTP ${robots.response.status}`);
  assertIncludes(robots.body, 'Sitemap:', 'robots.txt: sitemap directive missing');

  if (!sitemap.response.ok) throw new Error(`${BASE_URL}/sitemap.xml: HTTP ${sitemap.response.status}`);
  assertIncludes(sitemap.body, '<urlset', 'sitemap.xml: urlset missing');

  const articleUrls = [...sitemap.body.matchAll(/https:\/\/playpoint-sim\.com\/(?:(?:en|ko|tw)\/)?articles\/[^<]+\.html/g)]
    .map((match) => match[0])
    .filter((url, index, urls) => urls.indexOf(url) === index);

  if (articleUrls.length === 0) throw new Error('sitemap.xml: article urls missing');
  return articleUrls;
}

async function checkArticle(url) {
  const { response, body } = await fetchText(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);

  assertIncludes(body, /<title>[\s\S]*?<\/title>/i, `${url}: article title missing`);
  assertIncludes(body, /<meta\s+name="description"\s+content="[^"]+"/i, `${url}: article description missing`);
  assertIncludes(body, /<link\s+rel="canonical"\s+href="[^"]+"/i, `${url}: article canonical missing`);
  assertIncludes(body, /<script\s+type="application\/ld\+json">/i, `${url}: article structured data missing`);
  if (!hasLargeImagePreview(body)) {
    throw new Error(`${url}: max-image-preview:large missing`);
  }
  const hiddenFaqItems = findHiddenFaqItems(body);
  if (hiddenFaqItems.length > 0) {
    throw new Error(`${url}: FAQPage contains ${hiddenFaqItems.length} hidden or mismatched Q&A items`);
  }
  if (!hasStaticRelatedSection(body)) {
    throw new Error(`${url}: static related-article section missing`);
  }
  if (SCOPE_NOTE_PATHS.has(new URL(url).pathname) && !/\barticle-scope-note\b/.test(body)) {
    throw new Error(`${url}: search-intent scope note missing`);
  }
  if (url.includes(`${BASE_URL}/articles/`)) {
    assertIncludes(body, /<script\s+src="\.\.\/blog\/article\.js\?v=[^"]+"><\/script>/i, `${url}: shared article script missing`);
  }
}

async function checkOgpMime() {
  const response = await fetch(withCacheBuster(REPRESENTATIVE_OGP_URL), {
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`${REPRESENTATIVE_OGP_URL}: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!/^image\/jpeg(?:;|$)/i.test(contentType)) {
    throw new Error(`${REPRESENTATIVE_OGP_URL}: expected image/jpeg, got ${contentType || 'missing content-type'}`);
  }
}

async function runChecks(urls, check, label) {
  const results = await mapWithConcurrency(urls, HTTP_CONCURRENCY, async (url) => {
    await retry(() => check(url), {
      attempts: MAX_ATTEMPTS,
      delayMs: RETRY_DELAY_MS,
      onRetry: (error, attempt, attempts) => {
        console.warn(`Retry ${attempt + 1}/${attempts} - ${error.message}`);
      }
    });
    return url;
  });

  const failures = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      console.log(`ok - ${label} ${result.item}`);
    } else {
      failures.push(result.reason);
      console.error(`not ok - ${result.reason.message}`);
    }
  }
  return failures;
}

async function main() {
  const failures = await runChecks(pageUrls, checkPage, 'page');

  try {
    const result = await retry(checkLatestHub, {
      attempts: MAX_ATTEMPTS,
      delayMs: RETRY_DELAY_MS,
      onRetry: (error, attempt, attempts) => {
        console.warn(`Retry ${attempt + 1}/${attempts} - ${error.message}`);
      }
    });
    console.log(`ok - latest hub verified ${result.verificationDate}`);
  } catch (error) {
    failures.push(error);
    console.error(`not ok - ${error.message}`);
  }

  let articleUrls = [];
  try {
    articleUrls = await retry(checkSitemap, {
      attempts: MAX_ATTEMPTS,
      delayMs: RETRY_DELAY_MS,
      onRetry: (error, attempt, attempts) => {
        console.warn(`Retry ${attempt + 1}/${attempts} - ${error.message}`);
      }
    });
    console.log(`ok - sitemap articles (${articleUrls.length})`);
  } catch (error) {
    failures.push(error);
    console.error(`not ok - ${error.message}`);
  }

  try {
    await retry(checkOgpMime, {
      attempts: MAX_ATTEMPTS,
      delayMs: RETRY_DELAY_MS,
      onRetry: (error, attempt, attempts) => {
        console.warn(`Retry ${attempt + 1}/${attempts} - ${error.message}`);
      }
    });
    console.log(`ok - OGP MIME ${REPRESENTATIVE_OGP_URL} image/jpeg`);
  } catch (error) {
    failures.push(error);
    console.error(`not ok - ${error.message}`);
  }

  failures.push(...await runChecks(articleUrls, checkArticle, 'article'));

  if (failures.length > 0) {
    console.error(`SEO health check failed (${failures.length} failures).`);
    process.exitCode = 1;
    return;
  }

  console.log(`SEO health check passed (concurrency ${HTTP_CONCURRENCY}).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
