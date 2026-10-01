'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

test('保存ガードの互換入口はfirst-viewの公開関数を再exportする', () => {
  // 公開ESMを変換せずリンクする。UIは実行せず、互換exportの実在を確認する。
  const script = String.raw`
    const fs = require('node:fs');
    const vm = require('node:vm');
    const path = require('node:path');
    const {pathToFileURL, fileURLToPath} = require('node:url');
    const modules = new Map();
    const context = vm.createContext({});
    function load(url) {
      if (!modules.has(url)) modules.set(url, new vm.SourceTextModule(
        fs.readFileSync(fileURLToPath(url), 'utf8'), {context, identifier: url}));
      return modules.get(url);
    }
    (async () => {
      const entry = load(pathToFileURL(path.resolve('js/language-suggestion.js')).href);
      await entry.link((specifier, parent) => load(new URL(specifier, parent.identifier).href));
      process.stdout.write(JSON.stringify(Object.getOwnPropertyNames(entry.namespace)));
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const child = spawnSync(process.execPath, ['--experimental-vm-modules', '-e', script], {
    cwd: root, encoding: 'utf8', timeout: 15000
  });
  if (child.error) throw child.error;
  assert.equal(child.status, 0, child.stderr);
  const names = new Set(JSON.parse(child.stdout));
  for (const name of ['bindLanguageSuggestionDismiss', 'checkLanguageSuggestion',
    'formatLastCalculationText', 'getLastMainCalculationForRegion',
    'sameCalculationContext', 'saveLastMainCalculationForRegion']) assert.ok(names.has(name), name);
});
