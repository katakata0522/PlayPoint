'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const os = require('node:os');
const baseline = process.argv[2];
assert.ok(baseline, 'Pass the extracted baseline source directory explicitly.');
const candidate = path.resolve(__dirname, '../..');
const evidence = process.env.REFACTOR_EVIDENCE_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-runtime-evidence-'));
fs.mkdirSync(evidence, { recursive: true });
const plain = value => JSON.parse(JSON.stringify(value));
function load(root, day) {
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [day])); } static now() { return new FixedDate().getTime(); } }
  const events = [];
  const context = { Date: FixedDate, console, __TEST_ENV__: true, Option: function(text,value){return {text,value:String(value),dataset:{}};},
    UI: { displayResult(element, html, error = false) { element.html = html; element.error = error; }, displayResultDetails(html) { context.details = html; } },
    SHARE: { buildMainShareUrl: () => 'https://playpoint-sim.com/?mode=main', buildReverseShareUrl: () => 'https://playpoint-sim.com/?mode=reverse' },
    PlayPointAnalytics: { track: (...args) => events.push(args), markEngaged: () => events.push(['engaged']), getEntryContext: () => ({}) }
  };
  context.window = context;
  vm.createContext(context);
  for (const name of ['region-rules.js', 'calculator-core.js', 'calculator-result-view.js', 'config.js', 'region-expansion-config.js', 'result-navigation-config.js', 'calculator.js']) {
    const file = path.join(root, 'js', name);
    if (!fs.existsSync(file)) {
      assert.ok(['region-rules.js', 'calculator-core.js', 'calculator-result-view.js'].includes(name), `Missing required ${file}`);
      continue;
    }
    const source = fs.readFileSync(file, 'utf8').replace(/^import[^\n]+\n/gm, '').replace(/^export\s+/gm, '');
    vm.runInContext(source, context, { filename: file, timeout: 5000 });
  }
  vm.runInContext('Object.assign(CONFIGS,createExpansionConfigs(CONFIGS)); globalThis.api={CONFIGS,STATE,CONSTANTS,CALC,CALC_PURE};', context);
  return { ...context.api, context, events };
}
const input = (value, valid = true) => ({ value: String(value), min: '', max: '', validity: {valid} });
function mainCall(api, region, status, target, needed, direct, promo, valid = true) {
  api.events.length = 0; api.context.details = null;
  api.STATE.currentRegion = region;
  api.STATE.dom = { neededPoints: input(needed,valid), multiplier: input(promo), baseRate: input(direct), currentStatus: input(status),
    targetStatus: { selectedIndex: 0, options: [{value:String(target[1]),dataset:{statusLabel:target[0]}}]}, result:{dataset:{}}
  };
  api.CALC.calculate();
  return plain({ result:api.STATE.dom.result,details:api.context.details,events:api.events });
}
function reverseCall(api, region, status, amount, direct, promo, valid = true) {
  api.events.length = 0; api.STATE.currentRegion = region;
  api.STATE.dom = { amountYen:input(amount,valid),reverseBaseRate:input(direct),reverseStatus:input(status),reverseMultiplier:input(promo),reverseResult:{dataset:{}} };
  api.CALC.reverseCalculate();
  return plain({ result:api.STATE.dom.reverseResult,events:api.events });
}
let mainCases=0,reverseCases=0,pureCases=0,configCases=0;
const dates = ['2026-09-14T00:00:00Z', '2026-12-31T12:00:00Z', '2028-02-29T12:00:00Z'];
for (const day of dates) {
  const old=load(baseline,day), next=load(candidate,day);
  assert.deepEqual(plain(old.CONFIGS),plain(next.CONFIGS),'Full localized configs');
  assert.deepEqual(plain(old.CONSTANTS),plain(next.CONSTANTS),'Storage keys and other constants');
  configCases += Object.keys(old.CONFIGS).length;
  for (const [region,cfg] of Object.entries(old.CONFIGS)) {
    for (const status of Object.values(cfg.statuses)) {
      for (const target of Object.entries(cfg.thresholds)) for (const needed of [-1,0,1,Math.floor(target[1]/2),target[1],target[1]+1]) for (const promo of [1,3,7]) {
        assert.deepEqual(mainCall(next,region,status,target,needed,status,promo),mainCall(old,region,status,target,needed,status,promo),JSON.stringify({day,region,status,target,needed,promo}));
        mainCases++;
      }
      for (const amount of [-1,0,0.01,0.5,49.5,500,10000,'NaN','Infinity']) for (const promo of [1,3,7]) {
        assert.deepEqual(reverseCall(next,region,status,amount,status,promo),reverseCall(old,region,status,amount,status,promo),JSON.stringify({day,region,status,amount,promo}));
        reverseCases++;
      }
      const target=Object.entries(cfg.thresholds)[0];
      assert.deepEqual(mainCall(next,region,status,target,5,status,1,false), mainCall(old,region,status,target,5,status,1,false)); mainCases++;
      assert.deepEqual(reverseCall(next,region,status,5,status,1,false), reverseCall(old,region,status,5,status,1,false)); reverseCases++;
    }
    for (const amount of [0,0.1,1,49.5,250,1000]) for (const rate of [0.01,1,1.25,3,7]) {
      const args = {neededPoints:amount,finalRate:rate,spendUnit:cfg.spendUnit,baseDate:new Date(day)};
      assert.deepEqual(plain(next.CALC_PURE.computeMainResult(args)),plain(old.CALC_PURE.computeMainResult(args)));
      assert.deepEqual(plain(next.CALC_PURE.computeReverseResult({...args,amountYen:amount})),plain(old.CALC_PURE.computeReverseResult({...args,amountYen:amount})));
      pureCases += 2;
    }
  }
}
const report={baselineCommit:process.env.REFACTOR_BASE_SHA || null,dates,configCases,mainCases,reverseCases,pureCases,mismatches:0,scope:'exact returned HTML, details, numeric datasets and analytics call sequence with fixed browser-service adapters; browser-service adapters do not verify actual ESM wiring; use the Chromium gate as well'};
fs.writeFileSync(path.join(evidence, 'runtime-differential-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(report);
