const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'articles');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
let fixed = 0;

for (const f of files) {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  const original = content;

  content = content.replaceAll('500 pt達成', '250 pt達成');
  content = content.replaceAll('3,000 pt達成', '1,000 pt達成');
  content = content.replaceAll('15,000 pt達成', '4,000 pt達成');
  content = content.replaceAll('75,000 pt達成', '15,000 pt達成');

  if (content !== original) {
    fs.writeFileSync(p, content, 'utf8');
    fixed++;
  }
}

console.log('Successfully fixed sidebar rank points in', fixed, 'articles');
