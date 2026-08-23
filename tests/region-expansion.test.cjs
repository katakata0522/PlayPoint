'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  buildHongKongPage,
  buildIndiaPage
} = require('../scripts/region-page-sync.cjs');
const {
  normalizeTopPageHreflang
} = require('../scripts/region-hreflang-sync.cjs');

const rootDir = path.resolve(__dirname, '..');
const twSource = fs.readFileSync(path.join(rootDir, 'tw', 'index.html'), 'utf8');
const enSource = fs.readFileSync(path.join(rootDir, 'en', 'index.html'), 'utf8');
const navigationSource = fs.readFileSync(path.join(rootDir, 'js', 'region-navigation.js'), 'utf8');
const configSource = fs.readFileSync(path.join(rootDir, 'js', 'region-expansion-config.js'), 'utf8');

const hk = normalizeTopPageHreflang(buildHongKongPage(twSource));
assert.match(hk, /<html lang="zh-HK">/);
assert.match(hk, /canonical" href="https:\/\/playpoint-sim\.com\/hk\/"/);
assert.match(hk, /"priceCurrency": "HKD"/);
assert.match(hk, /每 HK\$7/);
assert.match(hk, /香港版/);
assert.doesNotMatch(hk, /真的有很多來自台灣的朋友/);
assert.match(hk, /hreflang="zh-TW" href="https:\/\/playpoint-sim\.com\/tw\/"/);
assert.match(hk, /hreflang="zh-HK" href="https:\/\/playpoint-sim\.com\/hk\/"/);

const india = normalizeTopPageHreflang(buildIndiaPage(enSource));
assert.match(india, /<html lang="en-IN">/);
assert.match(india, /canonical" href="https:\/\/playpoint-sim\.com\/in\/"/);
assert.match(india, /"priceCurrency": "INR"/);
assert.match(india, /Points per ₹5/);
assert.match(india, /India edition/);
assert.match(india, /href="https:\/\/playpoint-sim\.com\/en\/" hreflang|hreflang="en" href="https:\/\/playpoint-sim\.com\/en\/"/);
assert.match(india, /hreflang="en-IN" href="https:\/\/playpoint-sim\.com\/in\/"/);

assert.match(configSource, /statuses: \{ Bronze: 1\.0, Silver: 1\.1, Gold: 1\.2, Platinum: 1\.4 \}/);
assert.match(configSource, /thresholds: \{ Silver: 250, Gold: 1000, Platinum: 4000 \}/);
assert.match(configSource, /rateUnit: '₹5'/);
assert.match(configSource, /rateUnit: 'HK\$7'/);
assert.match(configSource, /thresholds: \{ '銀級': 250, '金級': 1000, '鉑金級': 4000, '鑽石級': 15000 \}/);

assert.match(navigationSource, /HK: 'hk\/'/);
assert.match(navigationSource, /IN: 'in\/'/);
assert.match(navigationSource, /data-region="HK"/);
assert.match(navigationSource, /data-region="IN"/);

console.log('Region expansion guards passed.');
