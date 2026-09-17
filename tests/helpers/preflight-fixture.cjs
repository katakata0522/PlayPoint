'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createPhaseRunner } = require('../../.github/scripts/ci-phase-runner.cjs');
const root = path.resolve(__dirname, '../..');

// 本物のentrypointと工程runnerを動かし、外部コマンドだけを観測する。
// 個別auditorの正しさはそれぞれのテストが担当。再帰的な全回帰や本番通信は行わない。
function runPreflight(t, { missing = [], empty = false, prepareDeploy = false, commandResult, transform = s => s } = {}) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-preflight-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true });
    fs.writeFileSync(path.join(fixture, file), text);
  };
  fs.mkdirSync(path.join(fixture, 'tests'));
  for (const file of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html', 'pwa-launch.html']) write(file, '<!doctype html>');
  write('sw.js', "const ASSETS = ['./index.html'];");
  write('style.css', '/* original */');
  if (!empty) for (const file of ['static-calculator-delivery.test.cjs', 'runtime-module-guards.test.cjs', 'example.test.cjs']) {
    if (!missing.includes(file)) write('tests/' + file, "require('node:test')('example', () => {});");
  }
  const calls = [];
  const messages = [];
  const fakeProcess = { execPath: process.execPath, argv: [process.execPath, 'preflight.cjs', ...(prepareDeploy ? ['--prepare-deploy'] : [])], env: {}, exitCode: 0 };
  const loaded = {
    'node:child_process': { spawnSync(command, args) {
      const call = { command, args: Array.from(args) }; calls.push(call);
      if (args[0] === '.github/scripts/minify.cjs') write('style.css', '/* prepared */');
      return commandResult?.(call, calls) || { status: 0 };
    } },
    './ci-phase-runner.cjs': { createPhaseRunner },
    './ci-evidence.cjs': { evidenceDir: () => path.join(fixture, 'evidence') },
    '../../scripts/build-targets.cjs': { generatedFiles: [] },
    './minify.cjs': { assetSyncMutableJsTargets: [], cssTargets: ['style.css'] }
  };
  const sandbox = { __dirname: path.join(fixture, '.github/scripts'), process: fakeProcess,
    require: name => Object.hasOwn(loaded, name) ? loaded[name] : require(name),
    console: { log: (...args) => messages.push(args.join(' ')), error: (...args) => messages.push(args.join(' ')) }
  };
  const source = transform(fs.readFileSync(path.join(root, '.github/scripts/preflight.cjs'), 'utf8'));
  vm.runInNewContext(source, sandbox, { filename: 'preflight.cjs', timeout: 5000 });
  return { calls, exitCode: fakeProcess.exitCode, messages,
    report: JSON.parse(fs.readFileSync(path.join(fixture, 'evidence/preflight.json'), 'utf8')),
    css: fs.readFileSync(path.join(fixture, 'style.css'), 'utf8') };
}
module.exports = { runPreflight };
