'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const rootDir = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
const main = read('js/main.js');
const calculator = read('js/calculator.js');
const regionNavigation = read('js/region-navigation.js');
const resultNavigation = read('js/result-navigation-config.js');
const assetSync = read('scripts/asset-sync.cjs');
const serviceWorker = read('sw.js');
assert.doesNotMatch(main, /installExpandedRegionResultNavigation/);
assert.match(calculator, /import \{ getResultNavigationConfig \} from '\.\/result-navigation-config\.js';/);
assert.match(calculator, /return getResultNavigationConfig\(STATE\.currentRegion\);/);
assert.doesNotMatch(calculator, /const localized = \{/);
assert.doesNotMatch(regionNavigation, /installExpandedRegionResultNavigation/);
assert.doesNotMatch(regionNavigation, /import \{ CALC \} from '\.\/calculator\.js';/);
assert.match(resultNavigation, /const RESULT_NAVIGATION_CONFIGS = deepFreeze\(\{ JP, US, KR, TW, HK, IN \}\);/);
assert.match(resultNavigation, /export function assertResultNavigationCoverage\(regionCodes\)/);
assert.doesNotMatch(regionNavigation, /import \{ createExpansionConfigs \} from '\.\/region-expansion-config\.js';/);
assert.match(regionNavigation, /import\('\.\/region-expansion-config\.js'\)/);
assert.match(regionNavigation, /export async function prepareRegionConfigForPath\(\)/);
assert.match(regionNavigation, /assertResultNavigationCoverage\(Object\.keys\(REGION_PATHS\)\)/);
assert.match(main, /prepareRegionConfigForPath/);
assert.equal(fs.existsSync(path.join(rootDir, 'js/region-result-navigation.js')), false);
assert.match(assetSync, /'js\/result-navigation-config\.js'/);
assert.doesNotMatch(assetSync, /region-result-navigation\.js/);
assert.match(serviceWorker, /'\.\/js\/result-navigation-config\.js'/);
assert.doesNotMatch(serviceWorker, /region-result-navigation\.js/);
assert.match(serviceWorker, /'\.\/hk\/'/);
assert.match(serviceWorker, /'\.\/in\/'/);
console.log('Region runtime wiring guards passed.');

// Evaluate the unmodified ESM entry point. Text-only guards missed a stale
// top-level call after the factory was moved behind a dynamic import.
assert.doesNotMatch(
  regionNavigation.split('export async function prepareRegionConfigForPath')[0],
  /\bcreateExpansionConfigs\s*\(/,
  'the expansion factory must not run before the lazy loader'
);

require('node:test')('地域ESMは初期化でき、遅延読込・同時呼出・失敗後の再試行を守る', () => {
  const { spawnSync } = require('node:child_process');
  const child = spawnSync(process.execPath, ['--experimental-vm-modules', '-e', String.raw`
    'use strict';
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const vm = require('node:vm');
    const source = fs.readFileSync('js/region-navigation.js', 'utf8');
    const publicRegions = ['JP', 'US', 'KR', 'TW', 'HK', 'IN'];

    async function load(pathname, failFirst = false) {
      const configs = { JP: {}, US: {}, KR: {}, TW: {} };
      const state = { currentRegion: 'JP' };
      const window = { location: { pathname } };
      const context = vm.createContext({ window, console });
      const counters = { imports: 0, factories: 0, coverage: 0 };
      const dependencies = {
        './config.js': { CONFIGS: configs, STATE: state, CONSTANTS: {} },
        './ui.js': { UI: {} },
        './result-navigation-config.js': {
          assertResultNavigationCoverage(codes) {
            assert.deepEqual(Array.from(codes), publicRegions);
            counters.coverage += 1;
          }
        }
      };
      const modules = new Map();
      function synthetic(values) {
        return new vm.SyntheticModule(Object.keys(values), function () {
          for (const [name, value] of Object.entries(values)) this.setExport(name, value);
        }, { context });
      }
      const entry = new vm.SourceTextModule(source, {
        context,
        identifier: 'region-navigation.js',
        importModuleDynamically: async (specifier) => {
          assert.equal(specifier, './region-expansion-config.js');
          counters.imports += 1;
          if (failFirst && counters.imports === 1) throw new Error('transient expansion load');
          const expansion = synthetic({
            createExpansionConfigs(base) {
              assert.strictEqual(base, configs);
              counters.factories += 1;
              return { HK: { region: 'HK' }, IN: { region: 'IN' } };
            }
          });
          await expansion.link(() => { throw new Error('unexpected expansion dependency'); });
          await expansion.evaluate();
          return expansion;
        }
      });
      await entry.link((specifier) => {
        assert.ok(Object.hasOwn(dependencies, specifier), 'unexpected import: ' + specifier);
        if (!modules.has(specifier)) modules.set(specifier, synthetic(dependencies[specifier]));
        return modules.get(specifier);
      });
      await entry.evaluate();
      assert.equal(counters.coverage, 1, 'check all six public routes exactly once at startup');
      assert.equal(counters.imports, 0, 'module evaluation must not download expansion config');
      assert.deepEqual(Object.keys(configs), ['JP', 'US', 'KR', 'TW']);
      return { prepare: entry.namespace.prepareRegionConfigForPath, configs, counters, window };
    }

    (async () => {
      for (const pathname of ['/', '/en/', '/ko/', '/tw/']) {
        const h = await load(pathname);
        assert.equal(await h.prepare(), true, pathname);
        assert.equal(h.counters.imports, 0, pathname + ': no expansion download');
      }
      for (const pathname of ['/hk/', '/in/']) {
        const h = await load(pathname);
        assert.deepEqual(await Promise.all([h.prepare(), h.prepare(), h.prepare()]), [true, true, true]);
        assert.equal(h.counters.imports, 1, pathname + ': deduplicated download');
        assert.equal(h.counters.factories, 1, pathname + ': deduplicated factory');
        assert.equal(h.configs.HK.region, 'HK');
        assert.equal(h.configs.IN.region, 'IN');
        h.window.location.pathname = pathname === '/hk/' ? '/in/' : '/hk/';
        assert.equal(await h.prepare(), true);
        assert.equal(h.counters.imports, 1, 'reuse loaded expansion config');
      }
      for (const pathname of ['/hk/', '/in/']) {
        const h = await load(pathname, true);
        await assert.rejects(h.prepare(), /transient expansion load/);
        assert.equal(h.configs.HK, undefined, 'failed download must not alter config');
        assert.equal(h.configs.IN, undefined, 'failed download must not alter config');
        assert.equal(await h.prepare(), true, 'retry after transient failure');
        assert.equal(h.counters.imports, 2);
        assert.equal(h.counters.factories, 1);
      }
      console.log('ESM runtime: 4 primary routes, 2 lazy routes, concurrent calls, cached reuse, and 2 retries passed.');
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `], { cwd: rootDir, encoding: 'utf8', timeout: 15000 });
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stdout + child.stderr);
});
