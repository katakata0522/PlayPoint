'use strict';

// ソースを書き換えず、Node自身のESMパーサー／リンカーで公開モジュールを読む。
// 実ブラウザのSW lifecycleはbrowser-smokeが担当。ここでは通信・タイマーを制御する。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');
const ORIGIN = 'https://playpoint-sim.com';

function runEsmProbe(input) {
  const result = spawnSync(process.execPath, ['--experimental-vm-modules', __filename], {
    input: JSON.stringify(input), encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ESM probe failed: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout);
}

function createLoader(context, overrides = {}) {
  const modules = new Map();
  function load(url) {
    const resolved = new URL(url, ORIGIN);
    if (resolved.origin !== ORIGIN) throw new Error(`外部モジュールは取得しません: ${resolved.href}`);
    const file = resolved.pathname.slice(1);
    if (!modules.has(resolved.href)) {
      const source = Object.hasOwn(overrides, file) ? overrides[file] : fs.readFileSync(path.join(ROOT, file), 'utf8');
      modules.set(resolved.href, new vm.SourceTextModule(source, { context, identifier: resolved.href }));
    }
    return modules.get(resolved.href);
  }
  const resolve = (specifier, parent) => {
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) throw new Error(`非ローカルimport: ${specifier}`);
    return new URL(specifier, parent).href;
  };
  return { load, resolve, modules };
}

function inspectGraph(overrides) {
  const loader = createLoader(vm.createContext({}), overrides);
  const mainSource = overrides && Object.hasOwn(overrides, 'js/main.js') ? overrides['js/main.js'] : fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
  const version = require('node:crypto').createHash('sha256').update(mainSource.replace(/\r\n/g, '\n')).digest('hex').slice(0, 10);
  const queue = [new URL(`/js/main.js?v=${version}`, ORIGIN).href];
  const seen = new Set();
  const modules = [];
  for (let index = 0; index < queue.length; index += 1) {
    const url = queue[index];
    if (seen.has(url)) continue;
    seen.add(url);
    const module = loader.load(url);
    const imports = module.dependencySpecifiers.map(specifier => loader.resolve(specifier, url));
    modules.push({ url, imports });
    queue.push(...imports);
  }
  return modules;
}

async function observeRegistration(options, overrides) {
  const listeners = new Map();
  const idle = [];
  const timers = [];
  const calls = [];
  const errors = [];
  const warnings = [];
  let updates = 0;
  const location = new URL(options.pathname, ORIGIN);
  const storage = new Map();
  const context = vm.createContext({
    URL, URLSearchParams, location,
    console: { log() {}, warn(...args) { warnings.push(String(args[0])); }, error(...args) { errors.push(String(args[0])); } },
    navigator: options.unsupported ? {} : { serviceWorker: {
      async register(url, registrationOptions) {
        calls.push({ url: new URL(url, location).href, options: { ...registrationOptions } });
        if (options.registerFailure) throw new Error('registration unavailable');
        return { scope: `${ORIGIN}/`, async update() {
          updates += 1;
          if (options.updateFailure) throw new Error('update unavailable');
        } };
      }
    } },
    document: { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
      getElementById() { return null; }, createElement() { return { dataset: {}, setAttribute() {} }; },
      head: { appendChild() {} }, documentElement: { lang: 'en' } },
    sessionStorage: { getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, String(value)); }, removeItem(key) { storage.delete(key); } },
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(callback); },
    setTimeout(callback, delay) { timers.push({ callback, delay }); },
    dispatchEvent() {}
  });
  context.window = context;
  if (!options.noIdle) context.requestIdleCallback = (callback, config) => idle.push({ callback, config });
  const loader = createLoader(context, overrides);
  const entry = loader.load('/js/service-worker-registration.js');
  await entry.link((specifier, parent) => loader.load(loader.resolve(specifier, parent.identifier)));
  await entry.evaluate();
  entry.namespace.registerServiceWorker();
  const beforeLoad = calls.length;
  const loadListeners = listeners.get('load') || [];
  loadListeners.forEach(callback => callback());
  const afterLoad = calls.length;
  const scheduled = { idle: idle.length, timers: timers.length };
  [...idle, ...timers].forEach(task => task.callback());
  // 戻り値がvoidのAPIのpromise連鎖も、実時間待機ではなく次のevent-loop境界で完了させる。
  await new Promise(resolve => setImmediate(resolve));
  return { beforeLoad, afterLoad, loadListeners: loadListeners.length, scheduled, calls, updates, errors, warnings };
}

if (require.main === module) {
  (async () => {
    const input = JSON.parse(fs.readFileSync(0, 'utf8'));
    const result = input.kind === 'graph'
      ? inspectGraph(input.overrides)
      : await Promise.all(input.scenarios.map(options => observeRegistration(options, input.overrides)));
    process.stdout.write(JSON.stringify(result));
  })().catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { runEsmProbe, ORIGIN };
