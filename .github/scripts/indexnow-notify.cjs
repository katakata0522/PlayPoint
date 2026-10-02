'use strict';

const { execFileSync } = require('node:child_process');
const { isPublicRepositoryPath } = require('./public-paths.cjs');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const SITE_HOST = 'playpoint-sim.com';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const INDEXNOW_KEY = '9884d02d82192ef32eac196f82d0bd85ce281735';
const INDEXNOW_KEY_FILE = `${INDEXNOW_KEY}.txt`;
const INDEXNOW_KEY_LOCATION = `${SITE_ORIGIN}/${INDEXNOW_KEY_FILE}`;
const MAX_URLS = 10000;
const FETCH_TIMEOUT_MS = 10000;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

function normalizeRepositoryPath(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replaceAll('\\', '/').replace(/^\.\/+/, '').replace(/\/{2,}/g, '/').replace(/\/$/, '');
}

function repositoryPathToPublicUrl(filePath) {
  const normalized = normalizeRepositoryPath(filePath);
  if (!normalized || !/\.html$/i.test(normalized)
    || normalized.split('/').some(part => part === '..' || part === '.')
    || !isPublicRepositoryPath(normalized)) return null;
  if (normalized === 'index.html') return `${SITE_ORIGIN}/`;
  if (/\/index\.html$/i.test(normalized)) {
    return `${SITE_ORIGIN}/${normalized.slice(0, -'index.html'.length)}`;
  }
  return `${SITE_ORIGIN}/${normalized}`;
}

function parseNameStatus(source) {
  return String(source || '')
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(Boolean)
    .map(line => {
      const tab = line.indexOf('\t');
      if (tab <= 0) throw new Error(`Unexpected git diff --name-status line: ${line}`);
      const status = line.slice(0, tab).trim();
      const filePath = line.slice(tab + 1).trim();
      if (!status || !filePath) throw new Error(`Incomplete git diff entry: ${line}`);
      return { status, filePath };
    });
}

function collectChangedPublicUrls({
  baseSha,
  headSha,
  execGit = (args) => execFileSync('git', args, { encoding: 'utf8' }),
} = {}) {
  if (!SHA_PATTERN.test(String(baseSha || '')) || !SHA_PATTERN.test(String(headSha || ''))) {
    return { urls: [], skippedReason: 'base-or-head-sha-unavailable' };
  }

  let diff;
  try {
    diff = execGit(['diff', '--name-status', '--no-renames', baseSha, headSha]);
  } catch (error) {
    return {
      urls: [],
      skippedReason: `git-diff-unavailable: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const urls = [...new Set(
    parseNameStatus(diff)
      .map(({ filePath }) => repositoryPathToPublicUrl(filePath))
      .filter(Boolean)
  )].sort();

  if (urls.length > MAX_URLS) {
    throw new Error(`IndexNow URL batch exceeds protocol limit: ${urls.length} > ${MAX_URLS}`);
  }

  return { urls, skippedReason: null };
}

function buildIndexNowPayload(urls) {
  if (!Array.isArray(urls)) throw new TypeError('urls must be an array');
  if (urls.length > MAX_URLS) throw new Error(`IndexNow URL batch exceeds protocol limit: ${urls.length} > ${MAX_URLS}`);
  for (const url of urls) {
    const parsed = new URL(url);
    if (parsed.origin !== SITE_ORIGIN || parsed.username || parsed.password) {
      throw new Error(`IndexNow URL is outside canonical host: ${url}`);
    }
  }
  return {
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: [...urls],
  };
}

async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function verifyIndexNowKey(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is unavailable');
  const response = await fetchWithTimeout(fetchImpl, INDEXNOW_KEY_LOCATION, {
    method: 'GET',
    headers: { accept: 'text/plain' },
  });
  const body = (await response.text()).trim();
  if (!response.ok || body !== INDEXNOW_KEY) {
    throw new Error(`IndexNow key verification failed: HTTP ${response.status}, body=${JSON.stringify(body)}`);
  }
}

async function submitIndexNow(urls, { fetchImpl = globalThis.fetch } = {}) {
  if (!urls.length) return { submitted: 0, status: null };
  await verifyIndexNowKey(fetchImpl);
  const payload = buildIndexNowPayload(urls);
  const response = await fetchWithTimeout(fetchImpl, INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      accept: 'text/plain, application/json',
    },
    body: JSON.stringify(payload),
  });
  const responseBody = await response.text();
  if (![200, 202].includes(response.status)) {
    throw new Error(`IndexNow submission failed: HTTP ${response.status} ${responseBody.slice(0, 500)}`);
  }
  return { submitted: urls.length, status: response.status };
}

async function runFromEnvironment(env = process.env, options = {}) {
  const result = collectChangedPublicUrls({
    baseSha: env.INDEXNOW_BASE_SHA,
    headSha: env.INDEXNOW_HEAD_SHA || env.GITHUB_SHA,
    execGit: options.execGit,
  });
  if (result.skippedReason) {
    console.log(`[indexnow] skipped: ${result.skippedReason}`);
    return { submitted: 0, skippedReason: result.skippedReason };
  }
  if (result.urls.length === 0) {
    console.log('[indexnow] no changed public HTML URLs to submit');
    return { submitted: 0, skippedReason: 'no-public-html-changes' };
  }

  const submission = await submitIndexNow(result.urls, { fetchImpl: options.fetchImpl });
  console.log(`[indexnow] submitted ${submission.submitted} URL(s), HTTP ${submission.status}`);
  for (const url of result.urls) console.log(`[indexnow] ${url}`);
  return { ...submission, urls: result.urls, skippedReason: null };
}

if (require.main === module) {
  runFromEnvironment().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  FETCH_TIMEOUT_MS,
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  INDEXNOW_KEY_FILE,
  INDEXNOW_KEY_LOCATION,
  MAX_URLS,
  SITE_HOST,
  SITE_ORIGIN,
  buildIndexNowPayload,
  collectChangedPublicUrls,
  normalizeRepositoryPath,
  parseNameStatus,
  repositoryPathToPublicUrl,
  runFromEnvironment,
  submitIndexNow,
  verifyIndexNowKey,
};
