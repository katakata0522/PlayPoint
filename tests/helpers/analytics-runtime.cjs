'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..');
const ANALYTICS_SOURCE = fs.readFileSync(path.join(ROOT, 'js/analytics-core.js'), 'utf8');
const STORAGE_KEY = 'playpointCalculatorEntryContext';
const DEFAULT_LOCATION = Object.freeze({
  href: 'https://playpoint-sim.com/articles/guide.html',
  origin: 'https://playpoint-sim.com',
  pathname: '/articles/guide.html',
  search: ''
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createAnalyticsRuntime({
  consentStatus,
  location = DEFAULT_LOCATION,
  ready = false,
  storedEntries = []
} = {}) {
  const storage = new Map(storedEntries);
  const listeners = new Map();
  const warnings = [];
  const context = {
    console: { warn(...args) { warnings.push(args); } },
    URL,
    URLSearchParams,
    location: { ...location },
    sessionStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      removeItem(key) { storage.delete(key); },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    dispatchEvent() {},
    CustomEvent: class CustomEvent {
      constructor(type) { this.type = type; }
    },
    document: {
      addEventListener(type, listener) { listeners.set(type, listener); },
      dispatchEvent(event) {
        const listener = listeners.get(event.type);
        if (listener) listener(event);
      }
    }
  };

  if (consentStatus !== undefined) {
    context.PlayPointConsent = { getStatus: () => consentStatus };
  }

  context.window = context;
  vm.createContext(context);
  vm.runInContext(ANALYTICS_SOURCE, context, { filename: 'analytics-core.js' });
  if (ready) context.PlayPointAnalytics.markAnalyticsReady();
  return { context, listeners, storage, warnings };
}

function eventItems(context, eventName) {
  return context.dataLayer
    .filter(item => item && item[0] === 'event' && item[1] === eventName);
}

function eventCalls(context, eventName) {
  return eventItems(context, eventName).map(item => clone(item[2]));
}

function latestEventParams(context, eventName) {
  const events = eventCalls(context, eventName);
  return events.length ? events.at(-1) : null;
}

function replaceGtagWithExternal(context) {
  context.gtag = function externalGtag() {
    context.dataLayer.push(arguments);
  };
}

module.exports = {
  DEFAULT_LOCATION,
  STORAGE_KEY,
  createAnalyticsRuntime,
  eventCalls,
  eventItems,
  latestEventParams,
  replaceGtagWithExternal
};
