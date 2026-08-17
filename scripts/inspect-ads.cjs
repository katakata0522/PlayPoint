const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  let results = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git' && item.name !== 'test-results') {
      results = results.concat(scanDir(full));
    } else if (item.isFile() && item.name.endsWith('.html')) {
      const content = fs.readFileSync(full, 'utf8');
      const hasAdSenseScript = content.includes('pagead2.googlesyndication.com');
      const hasAdUnit = content.includes('adsbygoogle') || content.includes('data-ad-slot');
      const hasRakutenAffiliate = content.includes('hb.afl.rakuten') || content.includes('a.r10.to') || content.includes('event.rakuten.co.jp');
      results.push({ file: path.relative('.', full).replace(/\\/g, '/'), hasAdSenseScript, hasAdUnit, hasRakutenAffiliate });
    }
  }
  return results;
}

const all = scanDir('.');
const adSenseScriptFiles = all.filter(r => r.hasAdSenseScript);
const adUnitFiles = all.filter(r => r.hasAdUnit);
const affiliateFiles = all.filter(r => r.hasRakutenAffiliate);

console.log('Total HTML files:', all.length);
console.log('Files with AdSense loader script:', adSenseScriptFiles.length);
console.log('Files with AdSense ad units:', adUnitFiles.length);
console.log('Files with Affiliate links:', affiliateFiles.length);

console.log('\n--- Ad Units Breakdown by Top Directory ---');
const categories = {};
for (const f of adUnitFiles) {
  const topDir = f.file.includes('/') ? f.file.split('/')[0] : 'root';
  categories[topDir] = (categories[topDir] || 0) + 1;
}
console.log(categories);

console.log('\n--- Detailed List of Files with Ad Units ---');
console.log(adUnitFiles.map(f => f.file));

console.log('\n--- Detailed List of Files with Affiliate Links ---');
console.log(affiliateFiles.map(f => f.file));
