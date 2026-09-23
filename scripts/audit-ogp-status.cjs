'use strict';

const fs = require('node:fs');
const path = require('node:path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    if (['.git', '.github', 'node_modules', 'scripts', 'tests', 'docs', 'browser-smoke-artifacts'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(fullPath.replaceAll('\\', '/'));
    }
  }
  return results;
}

const files = walk('.');
const ogImageMap = new Map();
const widthMap = new Map();
const heightMap = new Map();
const typeMap = new Map();
const altMap = new Map();
const localeMap = new Map();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const ogImgMatch = content.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
  const ogImg = ogImgMatch ? ogImgMatch[1] : 'NONE';
  const widthMatch = content.match(/<meta property=["']og:image:width["'] content=["']([^"']+)["']/i);
  const heightMatch = content.match(/<meta property=["']og:image:height["'] content=["']([^"']+)["']/i);
  const typeMatch = content.match(/<meta property=["']og:image:type["'] content=["']([^"']+)["']/i);
  const altMatch = content.match(/<meta property=["']og:image:alt["'] content=["']([^"']+)["']/i);
  const localeMatch = content.match(/<meta property=["']og:locale["'] content=["']([^"']+)["']/i);
  
  const ogList = ogImageMap.get(ogImg) || [];
  ogList.push(file);
  ogImageMap.set(ogImg, ogList);

  const w = widthMatch ? widthMatch[1] : 'NONE';
  const h = heightMatch ? heightMatch[1] : 'NONE';
  const t = typeMatch ? typeMatch[1] : 'NONE';
  const a = altMatch ? 'PRESENT' : 'NONE';
  const l = localeMatch ? localeMatch[1] : 'NONE';

  widthMap.set(w, (widthMap.get(w) || 0) + 1);
  heightMap.set(h, (heightMap.get(h) || 0) + 1);
  typeMap.set(t, (typeMap.get(t) || 0) + 1);
  altMap.set(a, (altMap.get(a) || 0) + 1);
  localeMap.set(l, (localeMap.get(l) || 0) + 1);
}

console.log('Total HTML files scanned:', files.length);
console.log('Unique og:image values:', ogImageMap.size);
console.log('og:image:width distribution:', Object.fromEntries(widthMap));
console.log('og:image:height distribution:', Object.fromEntries(heightMap));
console.log('og:image:type distribution:', Object.fromEntries(typeMap));
console.log('og:image:alt distribution:', Object.fromEntries(altMap));
console.log('og:locale distribution:', Object.fromEntries(localeMap));

const ogImageCounts = [...ogImageMap.entries()].map(([img, list]) => ({ img, count: list.length, sample: list[0] }));
ogImageCounts.sort((a,b) => b.count - a.count);
console.log('\nTop og:images by count:');
ogImageCounts.slice(0, 30).forEach(x => console.log(`${x.count.toString().padStart(4)}: ${x.img} (e.g. ${x.sample})`));

// Check articles specifically
const articleFiles = files.filter(f => f.includes('/articles/') || f.startsWith('articles/'));
console.log('\nTotal article HTML files:', articleFiles.length);

const articleOgMap = new Map();
for (const file of articleFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const ogImgMatch = content.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
  const ogImg = ogImgMatch ? ogImgMatch[1] : 'NONE';
  const list = articleOgMap.get(ogImg) || [];
  list.push(file);
  articleOgMap.set(ogImg, list);
}

console.log('Unique og:image values in articles:', articleOgMap.size);
const articleOgCounts = [...articleOgMap.entries()].map(([img, list]) => ({ img, count: list.length, list }));
articleOgCounts.sort((a,b) => b.count - a.count);
console.log('\nog:images used in articles:');
articleOgCounts.forEach(x => console.log(`${x.count.toString().padStart(4)}: ${x.img} -> ${x.list.length <= 3 ? x.list.join(', ') : x.list.slice(0, 2).join(', ') + '... (' + x.list.length + ' files)'}`));
