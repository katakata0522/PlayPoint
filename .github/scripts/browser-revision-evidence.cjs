'use strict';

const { verifyDeployRevisionWithRetry } = require('./verify-deploy-revision.cjs');
const EXACT_SHA = /^[0-9a-f]{40}$/;

// 検証前後の観測を一つの記録に残す。未指定や途中失敗を成功へ補完しない。
function createRevisionSession({ expectedRevision = '', required = false } = {}) {
  const evidence = { required, checked: false, expected: expectedRevision || null,
    actual: null, match: null, observations: [] };
  async function check(baseUrl, phase, options = {}) {
    if (!required && !expectedRevision) {
      evidence.reason = 'local-source; no production revision requested';
      return evidence;
    }
    if (!EXACT_SHA.test(expectedRevision)) {
      evidence.match = false;
      evidence.reason = 'production verification requires an exact lowercase 40-character SHA';
      throw new Error(evidence.reason);
    }
    const checkedAt = new Date().toISOString();
    try {
      const result = await verifyDeployRevisionWithRetry({ ...options,
        url: new URL('status/deploy-revision.txt', baseUrl).href, expectedRevision });
      evidence.observations.push({ phase, checkedAt, ...result, match: result.actual === expectedRevision });
      evidence.checked = true;
      evidence.actual = result.actual;
      evidence.match = evidence.observations.every(item => item.checked && item.match);
    } catch (error) {
      const result = error.revision || { checked: false, expected: expectedRevision, actual: null, attempts: 0 };
      evidence.observations.push({ phase, checkedAt, ...result, match: false, error: error.message });
      evidence.checked = result.checked;
      evidence.actual = result.actual;
      evidence.match = false;
      throw error;
    }
    return evidence;
  }
  return { evidence, check };
}

module.exports = { EXACT_SHA, createRevisionSession };
