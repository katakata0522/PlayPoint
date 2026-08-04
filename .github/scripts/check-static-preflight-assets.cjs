'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const requiredPublicFiles = ['en/index.html', 'ko/index.html', 'tw/index.html'];
const missingPublicFiles = requiredPublicFiles.filter(file => !fs.existsSync(path.join(root, file)));

const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const assetsBlock = serviceWorker.match(/const ASSETS = \[([\s\S]*?)\];/);
if (!assetsBlock) {
  throw new Error('sw.jsのASSETS定義を解析できません。');
}

const assetUrls = [...assetsBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]);
const missingAssets = assetUrls.filter(assetUrl => {
  const clean = assetUrl.split(/[?#]/, 1)[0].replace(/^\.\//, '');
  const localPath = clean === '' || clean.endsWith('/') ? path.join(clean, 'index.html') : clean;
  return !fs.existsSync(path.join(root, localPath));
});

for (const file of missingPublicFiles) console.error(`公開必須ファイルがありません: ${file}`);
for (const asset of missingAssets) console.error(`Service Worker先読み対象がありません: ${asset}`);

if (missingPublicFiles.length || missingAssets.length) process.exitCode = 1;
else console.log(`公開必須ファイル3件とService Worker先読み対象${assetUrls.length}件を確認しました。`);
