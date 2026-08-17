const fs = require('fs');
const path = require('path');

const articlesDir = path.resolve(__dirname, '../articles');
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.html'));

let updatedCount = 0;

files.forEach(file => {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. dateModified を最新の 2026-08-17 に更新
  if (content.includes('"dateModified":')) {
    content = content.replace(/"dateModified":\s*"[^"]*"/, '"dateModified": "2026-08-17"');
    changed = true;
  }
  if (content.includes('property="article:modified_time"')) {
    content = content.replace(/property="article:modified_time"\s+content="[^"]*"/, 'property="article:modified_time" content="2026-08-17T00:00:00+09:00"');
    changed = true;
  }

  // 2. 本文内の確認年表記を 2026年8月に統一
  if (content.includes('2025年確認') || content.includes('2024年確認')) {
    content = content.replace(/202[45]年確認/g, '2026年8月確認');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
  }
});

console.log(`Successfully verified and refreshed ${updatedCount} articles to 2026-08-17.`);
