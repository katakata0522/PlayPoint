'use strict';

const { mapWithConcurrency, retry } = require('./http-check-utils.cjs');

const BASE_URL = 'https://playpoint-sim.com';
const FETCH_TIMEOUT_MS = 12000;
const HTTP_CONCURRENCY = 4;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1500;

function withCacheBuster(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('sitemap_check', String(Date.now()));
  return parsed.toString();
}

async function fetchText(url) {
  const response = await fetch(withCacheBuster(url), {
    cache: 'no-store',
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  const body = await response.text();
  return { response, body };
}

function parseSitemapDirectives(robots) {
  return [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gmi)].map(match => match[1]);
}

function parseLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(match => match[1].trim());
}

async function loadSubmittedSitemaps() {
  const robotsUrl = `${BASE_URL}/robots.txt`;
  const { response, body } = await fetchText(robotsUrl);
  if (!response.ok) throw new Error(`${robotsUrl}: HTTP ${response.status}`);

  const sitemapUrls = parseSitemapDirectives(body);
  if (sitemapUrls.length === 0) throw new Error('robots.txt: no Sitemap directives');
  if (new Set(sitemapUrls).size !== sitemapUrls.length) throw new Error('robots.txt: duplicate Sitemap directives');

  for (const sitemapUrl of sitemapUrls) {
    const parsed = new URL(sitemapUrl);
    if (parsed.protocol !== 'https:' || parsed.origin !== BASE_URL) {
      throw new Error(`robots.txt: non-canonical sitemap URL ${sitemapUrl}`);
    }
    if (parsed.hash) throw new Error(`robots.txt: sitemap URL has fragment ${sitemapUrl}`);
  }
  return sitemapUrls;
}

async function checkSitemap(url) {
  const { response, body } = await fetchText(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  if (!/<(?:urlset|sitemapindex)\b/i.test(body)) throw new Error(`${url}: XML sitemap root missing`);

  const locs = parseLocs(body);
  if (locs.length === 0) throw new Error(`${url}: no <loc> entries`);
  for (const loc of locs) {
    let parsed;
    try {
      parsed = new URL(loc);
    } catch {
      throw new Error(`${url}: invalid <loc> ${loc}`);
    }
    if (parsed.protocol !== 'https:' || parsed.origin !== BASE_URL) {
      throw new Error(`${url}: non-canonical <loc> ${loc}`);
    }
    if (parsed.hash) throw new Error(`${url}: fragmented <loc> ${loc}`);
  }
  return { url, locs };
}

async function main() {
  let sitemapUrls;
  try {
    sitemapUrls = await retry(loadSubmittedSitemaps, {
      attempts: MAX_ATTEMPTS,
      delayMs: RETRY_DELAY_MS,
      onRetry: (error, attempt, attempts) => console.warn(`Retry ${attempt + 1}/${attempts} - ${error.message}`)
    });
  } catch (error) {
    console.error(`not ok - ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const results = await mapWithConcurrency(sitemapUrls, HTTP_CONCURRENCY, async url => {
    return retry(() => checkSitemap(url), {
      attempts: MAX_ATTEMPTS,
      delayMs: RETRY_DELAY_MS,
      onRetry: (error, attempt, attempts) => console.warn(`Retry ${attempt + 1}/${attempts} - ${error.message}`)
    });
  });

  const failures = [];
  const owners = new Map();
  let totalLocs = 0;
  for (const result of results) {
    if (result.status === 'rejected') {
      failures.push(result.reason);
      console.error(`not ok - ${result.reason.message}`);
      continue;
    }
    const { url, locs } = result.value;
    console.log(`ok - sitemap ${url} (${locs.length} URLs)`);
    totalLocs += locs.length;
    for (const loc of locs) {
      const existing = owners.get(loc);
      if (existing) failures.push(new Error(`duplicate submitted URL: ${loc} in ${existing} and ${url}`));
      else owners.set(loc, url);
    }
  }

  if (totalLocs === 0) failures.push(new Error('submitted sitemaps contain no URLs'));
  if (failures.length > 0) {
    failures.forEach(error => console.error(`not ok - ${error.message}`));
    console.error(`Production sitemap registry check failed (${failures.length} failures).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Production sitemap registry check passed (${sitemapUrls.length} sitemaps / ${totalLocs} unique URLs).`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
