const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..', '..');
const adsTxtPath = path.join(rootDir, 'ads.txt');
const expected = 'google.com, pub-3845885843809455, DIRECT, f08c47fec0942fa0';

if (!fs.existsSync(adsTxtPath)) {
  console.error('ads.txt is missing at the site root.');
  process.exit(1);
}

const actual = fs.readFileSync(adsTxtPath, 'utf8').trim();

if (actual !== expected) {
  console.error('ads.txt content does not match the AdSense publisher record.');
  console.error(`Expected: ${expected}`);
  console.error(`Actual:   ${actual}`);
  process.exit(1);
}

console.log('ads.txt is present and matches the AdSense publisher record.');
