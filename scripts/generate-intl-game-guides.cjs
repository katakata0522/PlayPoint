'use strict';

const path = require('node:path');
const { writeLocalizedGameGuides } = require('./intl-game-guide-expansion.cjs');

const rootDir = path.join(__dirname, '..');
const summary = writeLocalizedGameGuides(rootDir);
console.log(`[generate-intl-game-guides] ${summary.changed}/${summary.checked} updated`);
