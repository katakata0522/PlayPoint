'use strict';
const { classifyPhase, cleanError, writeJson } = require('./ci-evidence.cjs');

function createPhaseRunner({ outputPath, metadata = {} }) {
  const report = { schemaVersion: 1, ...metadata, startedAt: new Date().toISOString(), phases: [], passed: false };
  const save = () => { if (outputPath) writeJson(outputPath, report); };
  return {
    report,
    run({ id, name, dependsOn = [], deterministic = false }, execute) {
      if (report.phases.some(phase => phase.id === id)) throw new Error(`重複した工程ID: ${id}`);
      for (const dependency of dependsOn) {
        if (!report.phases.some(phase => phase.id === dependency)) throw new Error(`未定義の依存工程: ${dependency}`);
      }
      const blockedBy = report.phases.filter(phase => dependsOn.includes(phase.id) && phase.classification !== 'PASS').map(phase => phase.id);
      const phase = { id, name, dependsOn, blockedBy, classification: blockedBy.length ? 'UPSTREAM_SKIPPED' : 'RUNNING', durationMs: 0 };
      report.phases.push(phase);
      save();
      if (blockedBy.length) { console.log(`${name}: UPSTREAM_SKIPPED (${blockedBy.join(', ')})`); return phase; }
      const start = Date.now();
      let result;
      try { result = execute(); } catch (error) { result = { status: 1, error }; }
      phase.classification = classifyPhase(result, deterministic);
      phase.exitCode = result.status ?? null;
      phase.signal = result.signal || null;
      if (result.error) phase.error = cleanError(result.error);
      phase.durationMs = Date.now() - start;
      save();
      return phase;
    },
    finish() {
      report.finishedAt = new Date().toISOString();
      report.passed = report.phases.length > 0 && report.phases.every(phase => phase.classification === 'PASS');
      save();
      return report;
    }
  };
}
module.exports = { createPhaseRunner };
