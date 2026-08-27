'use strict';

const http = require('node:http');
const https = require('node:https');
const { retry } = require('./http-check-utils.cjs');

const DEFAULT_ATTEMPTS = 8;
const DEFAULT_DELAY_MS = 2500;
const DEFAULT_TIMEOUT_MS = 10000;

function requestRevisionText(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.get(url, {
      family: 4,
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache'
      }
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode || 0,
          text: body
        });
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error('revision request timeout')));
    request.on('error', reject);
  });
}

async function verifyDeployRevisionWithRetry({
  url,
  expectedRevision,
  attempts = DEFAULT_ATTEMPTS,
  delayMs = DEFAULT_DELAY_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onRetry = (error, attempt, totalAttempts) => {
    console.warn(`Revision readiness retry ${attempt + 1}/${totalAttempts} - ${error.message}`);
  }
}) {
  if (!expectedRevision) return { checked: false };
  if (!url) throw new Error('deploy revision URL is required');

  let lastActual = '';
  let attemptsUsed = 0;
  try {
    return await retry(async attempt => {
      attemptsUsed = attempt;
      const requestUrl = new URL(url);
      requestUrl.searchParams.set('browser_smoke', `${Date.now()}-${attempt}`);
      const response = await requestRevisionText(requestUrl, { timeoutMs });
      if (!response.ok) {
        throw new Error(`revision request returned HTTP ${response.status}`);
      }

      lastActual = response.text.trim();
      if (lastActual !== expectedRevision) {
        throw new Error(`revision mismatch: got ${lastActual || 'empty response'}`);
      }

      return {
        checked: true,
        expected: expectedRevision,
        actual: lastActual,
        attempts: attempt
      };
    }, { attempts, delayMs, onRetry });
  } catch (error) {
    throw new Error(
      `deployed revision check failed after ${attemptsUsed || attempts} attempts: expected ${expectedRevision}, got ${lastActual || 'no response'}: ${error.message}`
    );
  }
}

module.exports = {
  DEFAULT_ATTEMPTS,
  DEFAULT_DELAY_MS,
  DEFAULT_TIMEOUT_MS,
  requestRevisionText,
  verifyDeployRevisionWithRetry
};
