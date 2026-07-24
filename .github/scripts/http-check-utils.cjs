'use strict';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function validatePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(name + ' must be a positive integer');
  }
}

async function retry(operation, options = {}) {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 1000;
  const onRetry = options.onRetry ?? (() => {});

  validatePositiveInteger(attempts, 'attempts');
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new TypeError('delayMs must be a non-negative number');
  }

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === attempts) break;
      onRetry(lastError, attempt, attempts);
      await wait(delayMs * attempt);
    }
  }

  throw lastError;
}

async function mapWithConcurrency(items, concurrency, worker) {
  validatePositiveInteger(concurrency, 'concurrency');
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  if (typeof worker !== 'function') throw new TypeError('worker must be a function');

  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;

      try {
        results[index] = {
          status: 'fulfilled',
          value: await worker(items[index], index),
          item: items[index]
        };
      } catch (error) {
        results[index] = {
          status: 'rejected',
          reason: error instanceof Error ? error : new Error(String(error)),
          item: items[index]
        };
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

module.exports = {
  mapWithConcurrency,
  retry,
  wait
};
