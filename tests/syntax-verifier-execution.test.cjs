'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

test('構文検査の実CLIは.github/scriptsの壊れたJSを見逃さず、非対象文書を読まない', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-syntax-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const put = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  };
  put('.github/scripts/verify-js-syntax.cjs', fs.readFileSync(path.resolve(__dirname, '../.github/scripts/verify-js-syntax.cjs'), 'utf8'));
  put('.github/scripts/smoke-test.cjs', 'const valid = true;');
  put('.github/scripts/verify-build-output.cjs', 'const valid = true;');
  put('js/runtime.js', 'const valid = true;');
  put('docs/example.js', 'const = broken;');
  put('tests/example.test.cjs', 'const = broken;');
  const run = () => spawnSync(process.execPath, [path.join(dir, '.github/scripts/verify-js-syntax.cjs')], { cwd: dir, encoding: 'utf8', timeout: 10000 });
  const valid = run();
  assert.equal(valid.status, 0, valid.stderr);
  put('.github/scripts/new-verifier.cjs', 'const = broken;');
  const invalid = run();
  assert.equal(invalid.status, 1);
  assert.ok(invalid.stderr.includes('.github/scripts/new-verifier.cjs'));
  put('.github/scripts/new-verifier.cjs', 'const fixed = true;');
  assert.equal(run().status, 0);
  fs.unlinkSync(path.join(dir, '.github/scripts/smoke-test.cjs'));
  const missing = run();
  assert.equal(missing.status, 1);
  assert.ok(missing.stderr.includes('.github/scripts/smoke-test.cjs'));
});
