const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  let results = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git' && item.name !== 'test-results') {
      results = results.concat(scanDir(full));
    } else if (item.isFile()) {
      try {
        const content = fs.readFileSync(full, 'utf8');
        const matches = content.match(/href=['"][^'"]*(?:rakuten|afl|a\.r10|amazon|a8|moshimo|valuecommerce|linkshare)[^'"]*['"]/gi);
        if (matches) {
          results.push({ file: path.relative('.', full).replace(/\\/g, '/'), matches });
        }
      } catch (e) {}
    }
  }
  return results;
}

const found = scanDir('.');
console.log(JSON.stringify(found, null, 2));
