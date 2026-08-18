'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const source = fs.readFileSync(path.resolve(__dirname, '../js/consent.js'), 'utf8');

function runtime(googleValues = null) {
  const events = [];
  let tcfListener = null;
  let timeoutCallback = null;
  const googleCallbacks = [];
  const context = {
    console,
    dataLayer: [],
    CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    document: { dispatchEvent(event) { events.push(event); } },
    setInterval() { return 1; },
    clearInterval() {},
    setTimeout(callback) { timeoutCallback = callback; return 2; },
    clearTimeout() { timeoutCallback = null; },
    googlefc: {
      callbackQueue: { push(value) { googleCallbacks.push(value); } },
      getGoogleConsentModeValues() { return googleValues; }
    },
    __tcfapi(command, version, callback) {
      if (command === 'addEventListener' && version === 2) tcfListener = callback;
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'consent.js' });
  return {
    context,
    events,
    listener: () => tcfListener,
    fireGoogleFc() {
      const callback = googleCallbacks.find(item => typeof item.CONSENT_MODE_DATA_READY === 'function');
      assert.ok(callback, 'CONSENT_MODE_DATA_READY callback missing');
      callback.CONSENT_MODE_DATA_READY();
    },
    fireTimeout() {
      assert.equal(typeof timeoutCallback, 'function', 'consent fallback timeout missing');
      const callback = timeoutCallback;
      timeoutCallback = null;
      callback();
    }
  };
}

const grantedGoogleValues = {
  analyticsStoragePurposeConsentStatus: 1,
  adStoragePurposeConsentStatus: 1,
  adUserDataPurposeConsentStatus: 1,
  adPersonalizationPurposeConsentStatus: 1
};

test('Google Privacy & MessagingのConsent Mode値を一次情報として使用する', () => {
  const { context, fireGoogleFc } = runtime(grantedGoogleValues);
  assert.equal(context.gtag_enable_tcf_support, true);
  assert.equal(context.PlayPointConsent.getStatus(), 'pending');
  fireGoogleFc();
  assert.equal(context.PlayPointConsent.getSource(), 'googlefc');
  assert.equal(context.PlayPointConsent.getStatus(), 'granted');
  assert.equal(context.PlayPointConsent.getAdStatus(), 'granted');
  assert.deepEqual(JSON.parse(JSON.stringify(context.PlayPointConsent.getConsentState())), {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted'
  });
});

test('解析と広告の許可を別々にゲートする', () => {
  const { context, fireGoogleFc } = runtime({
    analyticsStoragePurposeConsentStatus: 1,
    adStoragePurposeConsentStatus: 2,
    adUserDataPurposeConsentStatus: 2,
    adPersonalizationPurposeConsentStatus: 2
  });
  let analyticsCalls = 0;
  let adCalls = 0;
  context.PlayPointConsent.whenAnalyticsGranted(() => { analyticsCalls += 1; });
  context.PlayPointConsent.whenAdsAllowed(() => { adCalls += 1; });
  fireGoogleFc();
  assert.equal(context.PlayPointConsent.getStatus(), 'granted');
  assert.equal(context.PlayPointConsent.getAdStatus(), 'denied');
  assert.equal(analyticsCalls, 1);
  assert.equal(adCalls, 0);
});

test('TCFフォールバックではPurpose 7拒否をad_user_dataへ反映する', () => {
  const { context, listener } = runtime(null);
  listener()({
    eventStatus: 'tcloaded',
    gdprApplies: true,
    purpose: { consents: { 1: true, 3: true, 4: true, 7: false } }
  }, true);
  assert.equal(context.PlayPointConsent.getSource(), 'tcf-fallback');
  assert.deepEqual(JSON.parse(JSON.stringify(context.PlayPointConsent.getConsentState())), {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'denied',
    ad_personalization: 'granted'
  });
});

test('拒否後に設定を変更して同意すると待機中callbackが復帰する', () => {
  const { context, listener } = runtime(null);
  listener()({
    eventStatus: 'tcloaded',
    gdprApplies: true,
    purpose: { consents: { 1: false, 3: false, 4: false, 7: false } }
  }, true);
  assert.equal(context.PlayPointConsent.getStatus(), 'denied');
  assert.equal(context.PlayPointConsent.getAdStatus(), 'denied');
  let analyticsCalls = 0;
  let adCalls = 0;
  context.PlayPointConsent.whenAnalyticsGranted(() => { analyticsCalls += 1; });
  context.PlayPointConsent.whenAdsAllowed(() => { adCalls += 1; });
  listener()({
    eventStatus: 'useractioncomplete',
    gdprApplies: true,
    purpose: { consents: { 1: true, 3: true, 4: true, 7: true } }
  }, true);
  assert.equal(context.PlayPointConsent.getStatus(), 'granted');
  assert.equal(context.PlayPointConsent.getAdStatus(), 'granted');
  assert.equal(analyticsCalls, 1);
  assert.equal(adCalls, 1);
});

test('Analytics確定・広告UNKNOWNでは確定済み同意を保ったままUNKNOWNだけtimeoutで拒否する', () => {
  const { context, fireGoogleFc, fireTimeout } = runtime({
    analyticsStoragePurposeConsentStatus: 1,
    adStoragePurposeConsentStatus: 0,
    adUserDataPurposeConsentStatus: 0,
    adPersonalizationPurposeConsentStatus: 0
  });
  let analyticsCalls = 0;
  let adCalls = 0;
  context.PlayPointConsent.whenAnalyticsGranted(() => { analyticsCalls += 1; });
  context.PlayPointConsent.whenAdsAllowed(() => { adCalls += 1; });

  fireGoogleFc();
  assert.equal(context.PlayPointConsent.getStatus(), 'granted');
  assert.equal(context.PlayPointConsent.getAdStatus(), 'pending');
  assert.equal(context.PlayPointConsent.getSource(), 'googlefc');
  assert.equal(analyticsCalls, 1);
  assert.equal(adCalls, 0);

  fireTimeout();
  assert.equal(context.PlayPointConsent.getStatus(), 'granted');
  assert.equal(context.PlayPointConsent.getAdStatus(), 'denied');
  assert.equal(context.PlayPointConsent.getSource(), 'googlefc-timeout');
  assert.equal(analyticsCalls, 1);
  assert.equal(adCalls, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(context.PlayPointConsent.getConsentState())), {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
});

test('広告確定・Analytics UNKNOWNでも広告同意を保ったままAnalyticsだけtimeoutで拒否する', () => {
  const { context, fireGoogleFc, fireTimeout } = runtime({
    analyticsStoragePurposeConsentStatus: 0,
    adStoragePurposeConsentStatus: 1,
    adUserDataPurposeConsentStatus: 1,
    adPersonalizationPurposeConsentStatus: 1
  });
  let analyticsCalls = 0;
  let adCalls = 0;
  context.PlayPointConsent.whenAnalyticsGranted(() => { analyticsCalls += 1; });
  context.PlayPointConsent.whenAdsAllowed(() => { adCalls += 1; });

  fireGoogleFc();
  assert.equal(context.PlayPointConsent.getStatus(), 'pending');
  assert.equal(context.PlayPointConsent.getAdStatus(), 'granted');
  assert.equal(context.PlayPointConsent.getSource(), 'googlefc');
  assert.equal(analyticsCalls, 0);
  assert.equal(adCalls, 1);

  fireTimeout();
  assert.equal(context.PlayPointConsent.getStatus(), 'denied');
  assert.equal(context.PlayPointConsent.getAdStatus(), 'granted');
  assert.equal(context.PlayPointConsent.getSource(), 'googlefc-timeout');
  assert.equal(analyticsCalls, 0);
  assert.equal(adCalls, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(context.PlayPointConsent.getConsentState())), {
    analytics_storage: 'denied',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted'
  });
});

test('GoogleFC/TCFが無応答でもtimeoutでpendingを拒否へ収束する', () => {
  const { context, fireTimeout } = runtime(null);
  let analyticsCalls = 0;
  let adCalls = 0;
  context.PlayPointConsent.whenAnalyticsGranted(() => { analyticsCalls += 1; });
  context.PlayPointConsent.whenAdsAllowed(() => { adCalls += 1; });

  assert.equal(context.PlayPointConsent.getStatus(), 'pending');
  assert.equal(context.PlayPointConsent.getAdStatus(), 'pending');
  assert.equal(context.PlayPointConsent.getSource(), 'pending');

  fireTimeout();

  assert.equal(context.PlayPointConsent.getStatus(), 'denied');
  assert.equal(context.PlayPointConsent.getAdStatus(), 'denied');
  assert.equal(context.PlayPointConsent.getSource(), 'timeout');
  assert.equal(analyticsCalls, 0);
  assert.equal(adCalls, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(context.PlayPointConsent.getConsentState())), {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
});
