'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const main = read('js/main.js');
const assetSync = read('scripts/asset-sync.cjs');
const serviceWorker = read('sw.js');

assert.match(main, /import \{ installExpandedRegionResultNavigation \} from '\.\/region-result-navigation\.js';/);
assert.match(main, /installExpandedRegionResultNavigation\(CALC, STATE\);/);
assert.match(assetSync, /'js\/region-result-navigation\.js'/);
assert.match(serviceWorker, /'\.\/js\/region-result-navigation\.js'/);
assert.match(serviceWorker, /'\.\/hk\/'/);
assert.match(serviceWorker, /'\.\/in\/'/);

console.log('Region runtime wiring guards passed.');
