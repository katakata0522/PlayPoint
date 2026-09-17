'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const test = require('node:test');
const script = path.resolve(__dirname, '../.github/scripts/browser-smoke.cjs');

// helper名の存在検査ではなく、実entrypointを実行し、本番で検証を省略できないことを守る。
test('本番browser entrypointは期待SHA不足を起動前に拒否し失敗reportを保存する', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-browser-entry-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let launched = false;
  const processStub = { env: { SMOKE_BASE_URL: 'https://playpoint-sim.com/', CHROME_PATH: '/fixture/chrome' }, exitCode: 0 };
  const nativeRequire = createRequire(script);
  const completion = vm.runInNewContext(fs.readFileSync(script, 'utf8'), {
    require(name) {
      if (name === 'playwright-core') return { chromium: { async launch() { launched = true; throw new Error('Must not launch'); } } };
      return nativeRequire(name);
    },
    __dirname: path.join(root, '.github/scripts'), process: processStub, URL,
    console: { log() {}, error() {}, warn() {} }, setTimeout, clearTimeout
  }, { filename: script });
  await completion;
  assert.equal(launched, false);
  assert.equal(processStub.exitCode, 1);
  const report = JSON.parse(fs.readFileSync(path.join(root, 'browser-smoke-artifacts/report.json'), 'utf8'));
  assert.equal(report.passed, false);
  assert.equal(report.revision.checked, false);
  assert.equal(report.revision.match, false);
  assert.match(report.error, /exact lowercase 40-character SHA/);
});
