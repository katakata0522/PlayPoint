'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const source = fs.readFileSync(path.resolve(__dirname, '../js/consent.js'), 'utf8');

function runtime() {
  const events = [];
  let tcfListener = null;
  const context = {
    console,
    dataLayer: [],
    CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    document: { dispatchEvent(event) { events.push(event); } },
    setInterval() { return 1; },
    clearInterval() {},
    __tcfapi(command, version, callback) {
      if (command === 'addEventListener' && version === 2) tcfListener = callback;
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'consent.js' });
  return { context, events, listener: () => tcfListener };
}

test('TCF回答前はpendingでPurpose 1だけでは広告パーソナライズを許可しない', () => {
  const { context, listener } = runtime();
  assert.equal(context.PlayPointConsent.getStatus(), 'pending');
  let called = 0;
  context.PlayPointConsent.whenGranted(() => { called += 1; });
  listener()({
    eventStatus: 'tcloaded',
    gdprApplies: true,
    purpose: { consents: { 1: true, 3: false, 4: false } }
  }, true);
  assert.equal(context.PlayPointConsent.getStatus(), 'granted');
  assert.equal(called, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(context.PlayPointConsent.getConsentState())), {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
});

test('拒否後に設定を変更して同意すると待機中callbackが復帰する', () => {
  const { context, listener } = runtime();
  listener()({
    eventStatus: 'tcloaded',
    gdprApplies: true,
    purpose: { consents: { 1: false, 3: false, 4: false } }
  }, true);
  assert.equal(context.PlayPointConsent.getStatus(), 'denied');
  let called = 0;
  context.PlayPointConsent.whenGranted(() => { called += 1; });
  listener()({
    eventStatus: 'useractioncomplete',
    gdprApplies: true,
    purpose: { consents: { 1: true, 3: true, 4: true } }
  }, true);
  assert.equal(context.PlayPointConsent.getStatus(), 'granted');
  assert.equal(called, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(context.PlayPointConsent.getConsentState())), {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted'
  });
});
