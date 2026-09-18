'use strict';
const { cleanError } = require('./ci-evidence.cjs');
const MAX_NAVIGATION_ATTEMPTS = 3;
async function withNavigationRetry({ url, operation, delay, onAttempt, maxAttempts = MAX_NAVIGATION_ATTEMPTS }) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_NAVIGATION_ATTEMPTS) throw new Error(`navigation retry limit must be 1..${MAX_NAVIGATION_ATTEMPTS}`);
  const parsed = new URL(url);
  const safeUrl = parsed.origin + parsed.pathname;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const start = Date.now();
    let value;
    try { value = await operation(); }
    catch (error) {
      // 記録の失敗をnavigation失敗と取り違えて再試行しない。
      onAttempt({ url: safeUrl, attempt, classification: 'CHECK_FAIL', errorType: error.name || 'Error', error: cleanError(error), durationMs: Date.now() - start });
      if (attempt === maxAttempts) throw error;
      await delay(attempt * 1000);
      continue;
    }
    onAttempt({ url: safeUrl, attempt, classification: attempt === 1 ? 'PASS' : 'FLAKY_RECOVERED', durationMs: Date.now() - start });
    return value;
  }
}
module.exports = { MAX_NAVIGATION_ATTEMPTS, withNavigationRetry };
