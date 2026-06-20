const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

function minifyCSS(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '') // コメント削除
    .replace(/\r?\n\s*/g, '\n') // 改行とインデントを詰める
    .replace(/\n+/g, '\n') // 連続する改行を1つに
    .trim();
}

function minifyJS(content) {
  // 安全なコメント・空白・改行の削除
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '') // ブロックコメント削除
    .replace(/(^|\s)\/\/.*$/gm, '$1') // 空白または行頭に続く行コメントを削除（https://等のURLスキームを除外）
    .replace(/\r?\n\s*/g, '\n') // 改行とインデントを詰める
    .replace(/\n+/g, '\n') // 連続する改行を1つに
    .trim();
}

// ターゲットファイル
const cssFiles = [
  path.join(root, 'style.css'),
  path.join(root, 'articles/article-common.css'),
  path.join(root, 'articles/article-shared.css'),
  path.join(root, 'articles/source-notice.css')
];

const jsFiles = [
  path.join(root, 'js/main.js'),
  path.join(root, 'js/calculator.js'),
  path.join(root, 'js/ui.js'),
  path.join(root, 'js/diary.js'),
  path.join(root, 'js/share.js'),
  path.join(root, 'js/config.js'),
  path.join(root, 'sw.js')
];

for (const file of cssFiles) {
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, 'utf8');
    const min = minifyCSS(raw);
    fs.writeFileSync(file, min, 'utf8');
    console.log(`Minified CSS: ${path.basename(file)} (${raw.length} -> ${min.length} bytes)`);
  }
}

for (const file of jsFiles) {
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, 'utf8');
    const min = minifyJS(raw);
    fs.writeFileSync(file, min, 'utf8');
    console.log(`Minified JS: ${path.basename(file)} (${raw.length} -> ${min.length} bytes)`);
  }
}
