const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'articles');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let fixedCount = 0;
for (const f of files) {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  let modified = false;

  // 1. Remove duplicate plain text editorial-summary:start blocks
  const targetPattern = / editorial-summary:start[\s\S]*?editorial-summary:end /g;
  if (targetPattern.test(content)) {
    content = content.replace(targetPattern, '');
    modified = true;
    console.log('Fixed plain editorial-summary token in:', f);
  }

  // 2. Remove stray adsbygoogle script right before footer scripts
  const strayAdPattern = /<script>\s*\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\{\}\);\s*<\/script>\s*(?=<script src=|<\/body>)/g;
  if (strayAdPattern.test(content)) {
    content = content.replace(strayAdPattern, '');
    modified = true;
    console.log('Fixed stray ad script in:', f);
  }

  if (modified) {
    fs.writeFileSync(p, content, 'utf8');
    fixedCount++;
  }
}
console.log('Total files cleaned:', fixedCount);
