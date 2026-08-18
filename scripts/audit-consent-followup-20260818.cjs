'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(root, p), s.replace(/\r\n/g, '\n'), 'utf8');

// Pending consent must preserve in-memory analytics events; only explicit denial clears them.
{
  let s = read('js/analytics-core.js');
  const oldTrack = `        if (!window.PlayPointConsent) {
            queue(eventName, cleanParams);
            return false;
        }
        if (!hasConsent()) {
            pendingEvents.length = 0;
            clearCalculatorEntry();
            return false;
        }
        if (!analyticsReady) {
            queue(eventName, cleanParams);
            return false;
        }`;
  const newTrack = `        if (!window.PlayPointConsent) {
            queue(eventName, cleanParams);
            return false;
        }
        const consentStatus = window.PlayPointConsent.getStatus();
        if (consentStatus === 'pending') {
            queue(eventName, cleanParams);
            return false;
        }
        if (consentStatus !== 'granted') {
            pendingEvents.length = 0;
            clearCalculatorEntry();
            return false;
        }
        if (!analyticsReady) {
            queue(eventName, cleanParams);
            return false;
        }`;
  if (s.includes(oldTrack)) s = s.replace(oldTrack, newTrack);

  const oldFlush = `    function flushPending() {
        if (!window.PlayPointConsent) return;
        if (!hasConsent()) {
            pendingEvents.length = 0;
            clearCalculatorEntry();
            return;
        }
        if (!analyticsReady) return;`;
  const newFlush = `    function flushPending() {
        if (!window.PlayPointConsent) return;
        const consentStatus = window.PlayPointConsent.getStatus();
        if (consentStatus === 'pending') return;
        if (consentStatus !== 'granted') {
            pendingEvents.length = 0;
            clearCalculatorEntry();
            return;
        }
        if (!analyticsReady) return;`;
  if (s.includes(oldFlush)) s = s.replace(oldFlush, newFlush);
  if (!s.includes("consentStatus === 'pending'")) throw new Error('analytics pending-state patch failed');
  write('js/analytics-core.js', s);
}

// Consent callbacks are future-grant subscriptions: denial must not permanently delete them.
{
  let s = read('js/consent.js');
  s = s.replace("        if (status !== 'granted') callbacks.clear();\n        flushCallbacks();", "        flushCallbacks();");
  s = s.replace(
`        whenGranted(callback) {
            if (typeof callback !== 'function') return;
            if (status === 'granted') callback();
            else if (status === 'pending') callbacks.add(callback);
        },`,
`        whenGranted(callback) {
            if (typeof callback !== 'function') return;
            if (status === 'granted') callback();
            else callbacks.add(callback);
        },`
  );
  if (s.includes("else if (status === 'pending')")) throw new Error('consent future-grant callback patch failed');
  write('js/consent.js', s);
}

// Analytics regression: pending queues, denial clears, later grant can send newly queued work.
{
  let s = read('tests/analytics-core.test.cjs');
  const addition = `\n\ntest('同意pending中はイベントを捨てず、明示拒否時だけ破棄する', () => {\n  const pending = createRuntime('pending');\n  pending.context.PlayPointAnalytics.markAnalyticsReady();\n  pending.context.PlayPointAnalytics.track('theme_change', { theme_mode: 'dark' });\n  assert.equal(eventCalls(pending.context, 'theme_change').length, 0);\n\n  pending.context.PlayPointConsent = { getStatus: () => 'granted' };\n  pending.context.document.dispatchEvent({ type: 'playpoint:consent-updated' });\n  assert.equal(eventCalls(pending.context, 'theme_change').length, 1);\n\n  const denied = createRuntime('pending');\n  denied.context.PlayPointAnalytics.markAnalyticsReady();\n  denied.context.PlayPointAnalytics.track('theme_change', { theme_mode: 'dark' });\n  denied.context.PlayPointConsent = { getStatus: () => 'denied' };\n  denied.context.document.dispatchEvent({ type: 'playpoint:consent-updated' });\n  denied.context.PlayPointConsent = { getStatus: () => 'granted' };\n  denied.context.document.dispatchEvent({ type: 'playpoint:consent-updated' });\n  assert.equal(eventCalls(denied.context, 'theme_change').length, 0);\n});\n`;
  if (!s.includes('同意pending中はイベントを捨てず')) s += addition;
  write('tests/analytics-core.test.cjs', s);
}

// Dedicated consent-state unit test: pending -> granular grant, denied -> later grant subscription recovery.
write('tests/consent-state.test.cjs', `'use strict';
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
`);

// Permanent cross-component guard.
{
  let s = read('tests/full-integrity-audit.test.cjs');
  const addition = `\n\ntest('Consent pendingはGA4イベントを破棄せず後からの同意変更にも復帰する', () => {\n  const analytics = read('js/analytics-core.js');\n  const consent = read('js/consent.js');\n  assert.match(analytics, /consentStatus === 'pending'/);\n  assert.ok(!consent.includes(\"if (status !== 'granted') callbacks.clear()\"));\n  assert.match(consent, /else callbacks\\.add\\(callback\\)/);\n});\n`;
  if (!s.includes('Consent pendingはGA4イベントを破棄せず')) s += addition;
  write('tests/full-integrity-audit.test.cjs', s);
}

console.log('Consent/analytics follow-up applied.');
