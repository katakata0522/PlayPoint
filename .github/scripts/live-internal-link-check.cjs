'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { mapWithConcurrency, retry } = require('./http-check-utils.cjs');

const ROOT = path.resolve(__dirname, '../..');
const ORIGIN = 'https://playpoint-sim.com';
const SKIP_DIRS = new Set(['.git', '.github', 'docs', 'node_modules', 'scripts', 'tests']);
const CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) return [];
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.html') ? [absolute] : [];
  });
}

function publicUrlForFile(file) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  const pathname = relative.endsWith('/index.html')
    ? `/${relative.slice(0, -'index.html'.length)}`
    : `/${relative}`;
  return new URL(pathname, ORIGIN);
}

function anchorHrefs(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)].map((match) => match[2]);
}

function normalizeInternalUrl(rawHref, sourceUrl) {
  const href = rawHref.trim().replace(/&amp;/g, '&');
  if (!href || href.startsWith('#') || /^(?:mailto|tel|javascript|data):/i.test(href)) return null;

  let url;
  try {
    url = new URL(href, sourceUrl);
  } catch {
    return null;
  }

  if (url.origin !== ORIGIN) return null;
  url.hash = '';
  url.search = '';
  return url.toString();
}

function collectInternalLinks() {
  const sourcesByUrl = new Map();

  for (const file of htmlFiles(ROOT)) {
    const sourceUrl = publicUrlForFile(file);
    const html = fs.readFileSync(file, 'utf8');

    for (const href of anchorHrefs(html)) {
      const url = normalizeInternalUrl(href, sourceUrl);
      if (!url) continue;
      const sources = sourcesByUrl.get(url) || new Set();
      sources.add(path.relative(ROOT, file));
      sourcesByUrl.set(url, sources);
    }
  }

  return sourcesByUrl;
}

async function request(url, method) {
  return fetch(url, {
    method,
    redirect: 'follow',
    headers: {
      'cache-control': 'no-cache',
      'user-agent': 'PlayPoint-Link-Healthcheck/1.0'
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
}

async function checkUrl(url) {
  let response = await request(url, 'HEAD');
  if (response.status === 405 || response.status === 501) response = await request(url, 'GET');
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
}

async function main() {
  const sourcesByUrl = collectInternalLinks();
  const urls = [...sourcesByUrl.keys()].sort();
  console.log(`Checking ${urls.length} unique production URLs referenced by repository HTML...`);

  const results = await mapWithConcurrency(urls, CONCURRENCY, async (url) => {
    await retry(() => checkUrl(url), {
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
      console.log(`ok - ${result.item}`);
      continue;
    }

    const url = result.item;
    const sources = [...(sourcesByUrl.get(url) || [])].sort();
    failures.push({ url, sources, message: result.reason.message });
    console.error(`not ok - ${result.reason.message}`);
    console.error(`  referenced from: ${sources.join(', ')}`);
  }

  if (failures.length > 0) {
    console.error(`Production internal link check failed (${failures.length}/${urls.length}).`);
    process.exitCode = 1;
    return;
  }

  console.log(`Production internal link check passed (${urls.length} URLs).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
