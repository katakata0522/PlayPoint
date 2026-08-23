'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const originHosts = new Set(['playpoint-sim.com', 'www.playpoint-sim.com']);
const excludedTop = new Set(['.git', '.github', 'docs', 'node_modules', 'scripts', 'tests']);
const excludedRoot = new Set([
  '.gitattributes', '.gitignore', 'AGENTS.md', 'CNAME', 'README.md', 'みんな用URL.txt'
]);
const textExtensions = new Set([
  '.css', '.cjs', '.html', '.htm', '.js', '.json', '.md', '.mjs', '.svg',
  '.txt', '.webmanifest', '.xml', '.yaml', '.yml'
]);
const assetExtensions = new Set([
  '.css', '.gif', '.ico', '.jpeg', '.jpg', '.js', '.json', '.png', '.svg',
  '.ttf', '.webp', '.woff', '.woff2'
]);
const runtimeEntrypoints = new Set([
  'articles/source-notice.css',
  'blog/common-components.css',
  'blog/articles.json',
  'region-selector.css',
  'sw.js'
]);
const standaloneAssets = new Set([
  'ads.txt', 'atom.xml', 'favicon.svg', 'feed.xml', 'icon-192.png', 'icon-512.png',
  'manifest.json', 'ogp.png', 'ogp.svg', 'robots.txt',
  'status/deploy-revision.txt', 'status/deploy-status.json'
]);
const retiredFiles = new Set([
  'calculator.html',
  'articles/2025-12-25-playpoints-not-reflected.html',
  'articles/2026-06-29-savings-game-fire.html',
  'articles/ogp/playpoints-not-reflected.png',
  'articles/styles/2025-12-25-movies-books.css',
  'articles/styles/2025-12-25-play-games.css',
  'articles/styles/2025-12-25-subscription.css',
  'articles/styles/2025-12-25-weekly-reward.css',
  'en/articles/google-play-points-reflection-timing.html'
]);
const retiredFragments = [
  'tools/', 'kindle-tracker/', 'kids-smile-land/', 'doujin-shi-calculator/',
  ...retiredFiles
];

const slash = value => value.replaceAll('\\', '/');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .map(slash)
  .sort();
const fileSet = new Set(files);

function isDeployable(relativePath) {
  if (excludedRoot.has(relativePath)) return false;
  return !excludedTop.has(relativePath.split('/')[0]);
}

function isText(relativePath) {
  return path.basename(relativePath) === '.htaccess'
    || textExtensions.has(path.extname(relativePath).toLowerCase());
}

const textFiles = new Map(
  files.filter(isText).map(relativePath => [
    relativePath,
    fs.readFileSync(path.join(root, relativePath), 'utf8')
  ])
);

function localReference(raw) {
  const value = raw.trim();
  if (!value || value === '#' || /^(?:blob:|data:|javascript:|mailto:|tel:)/i.test(value)) return null;
  if (/^\$\{|^\{[{%]/.test(value)) return null;
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      return originHosts.has(parsed.hostname) ? `${parsed.pathname}${parsed.search}${parsed.hash}` : null;
    } catch {
      return null;
    }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return null;
  return value;
}

function candidates(sourceFile, raw) {
  const local = localReference(raw);
  if (local === null) return [];
  let pathname = local.split(/[?#]/, 1)[0];
  if (!pathname) pathname = path.basename(sourceFile);
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // The unresolved-reference error below will expose malformed encoding.
  }
  const joined = pathname.startsWith('/')
    ? pathname.replace(/^\/+/, '')
    : slash(path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), pathname)));
  if (joined === '..' || joined.startsWith('../')) return [];
  const normalized = joined === '.' ? '' : joined.replace(/^\.\//, '');
  if (!normalized || normalized.endsWith('/')) return [`${normalized}index.html`];
  const result = [normalized];
  if (!path.posix.extname(normalized)) result.push(`${normalized}.html`, `${normalized}/index.html`);
  return [...new Set(result)];
}

function fragment(raw) {
  const index = raw.indexOf('#');
  if (index < 0) return '';
  try {
    return decodeURIComponent(raw.slice(index + 1));
  } catch {
    return raw.slice(index + 1);
  }
}

function htmlReferences(content) {
  const values = [...content.matchAll(/\b(?:action|data-src|href|poster|src)\s*=\s*["']([^"']+)["']/gi)]
    .map(match => match[1]);
  for (const match of content.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    values.push(...match[1].split(',').map(item => item.trim().split(/\s+/, 1)[0]).filter(Boolean));
  }
  return values;
}

function jsonReferences(content) {
  let value;
  try {
    value = JSON.parse(content);
  } catch {
    return [];
  }
  const result = [];
  const keys = new Set(['canonical', 'file', 'href', 'scope', 'src', 'start_url', 'url']);
  function visit(node, key = '') {
    if (typeof node === 'string') {
      if (keys.has(key) || /^(?:\.?\.?\/|\/|https?:\/\/playpoint-sim\.com)/.test(node)) result.push(node);
    } else if (Array.isArray(node)) {
      node.forEach(item => visit(item, key));
    } else if (node && typeof node === 'object') {
      Object.entries(node).forEach(([childKey, child]) => visit(child, childKey));
    }
  }
  visit(value);
  return result;
}

function references(relativePath, content) {
  const extension = path.extname(relativePath).toLowerCase();
  if (['.html', '.htm', '.svg'].includes(extension)) return htmlReferences(content);
  if (extension === '.css') return [...content.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)].map(match => match[1]);
  if (['.js', '.cjs', '.mjs'].includes(extension)) {
    return [
      ...content.matchAll(/\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g),
      ...content.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g),
      ...content.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)
    ].map(match => match[1]);
  }
  if (extension === '.xml') return [...content.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(match => match[1]);
  if (['.json', '.webmanifest'].includes(extension)) return jsonReferences(content);
  return [];
}

function ids(content) {
  return new Set([...content.matchAll(/\b(?:id|name)\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]));
}

const resolvedReferences = new Set(runtimeEntrypoints);
const missingReferences = [];
const missingAnchors = [];
for (const [relativePath, content] of textFiles) {
  if (!isDeployable(relativePath)) continue;
  for (const raw of references(relativePath, content)) {
    if (localReference(raw) === null) continue;
    const target = candidates(relativePath, raw).find(candidate => fileSet.has(candidate));
    if (!target) {
      missingReferences.push(`${relativePath} -> ${raw}`);
      continue;
    }
    resolvedReferences.add(target);
    const hash = fragment(raw);
    if (hash && path.extname(target).toLowerCase() === '.html') {
      const targetContent = textFiles.get(target);
      if (targetContent && !ids(targetContent).has(hash)) missingAnchors.push(`${relativePath} -> ${raw}`);
    }
  }
}

test('ファイル名はOS差で衝突せず、一時ファイルを追跡しない', () => {
  const owners = new Map();
  const collisions = [];
  const temporary = [];
  for (const relativePath of files) {
    const lower = relativePath.toLowerCase();
    if (owners.has(lower) && owners.get(lower) !== relativePath) collisions.push(`${owners.get(lower)} <> ${relativePath}`);
    owners.set(lower, relativePath);
    if (/(?:^|\/)(?:[^/]+\.(?:bak|orig|rej|tmp)|(?:backup|copy|temp|tmp)(?:[-_.][^/]*)?)$/i.test(relativePath)) temporary.push(relativePath);
  }
  assert.deepEqual(collisions, []);
  assert.deepEqual(temporary, []);
});

test('移設・統合・共通化済みの実体を残さない', () => {
  assert.deepEqual([...retiredFiles].filter(relativePath => fileSet.has(relativePath)), []);
});

test('公開ファイルの内部参照とアンカーは実在する', () => {
  assert.deepEqual(missingReferences, [], `存在しない内部参照:\n${missingReferences.join('\n')}`);
  assert.deepEqual(missingAnchors, [], `存在しないアンカー:\n${missingAnchors.join('\n')}`);
});

test('全公開HTMLのcanonicalは自己一致し重複しない', () => {
  const owners = new Map();
  const problems = [];
  for (const [relativePath, content] of textFiles) {
    if (!isDeployable(relativePath) || path.extname(relativePath).toLowerCase() !== '.html') continue;
    const match = content.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
      || content.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
    if (!match) {
      problems.push(`${relativePath}: canonicalなし`);
      continue;
    }
    const canonical = match[1];
    const target = candidates(relativePath, canonical).find(candidate => fileSet.has(candidate));
    if (target !== relativePath) problems.push(`${relativePath}: ${canonical} -> ${target || '解決不能'}`);
    if (owners.has(canonical)) problems.push(`${canonical}: ${owners.get(canonical)} / ${relativePath}`);
    owners.set(canonical, relativePath);
  }
  assert.deepEqual(problems, [], `canonical不整合:\n${problems.join('\n')}`);
});

test('公開コードは旧パス・開発URL・旧ホストを参照しない', () => {
  const problems = [];
  const forbiddenUrls = [
    /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i,
    /https?:\/\/playpoint-sim\.xsrv\.jp/i,
    /https?:\/\/www\.playpoint-sim\.com/i,
    /file:\/\//i
  ];
  for (const [relativePath, content] of textFiles) {
    if (!isDeployable(relativePath) || relativePath === '.htaccess') continue;
    retiredFragments.forEach(oldPath => {
      if (content.includes(oldPath)) problems.push(`${relativePath}: ${oldPath}`);
    });
    forbiddenUrls.forEach(pattern => {
      if (pattern.test(content)) problems.push(`${relativePath}: ${pattern}`);
    });
  }
  assert.deepEqual(problems, [], `古い参照があります:\n${problems.join('\n')}`);
});

test('公開画像の実形式とHTTP配信形式を一致させる', () => {
  const ogpConfig = fs.readFileSync(path.join(root, 'articles', 'ogp', '.htaccess'), 'utf8');
  assert.match(ogpConfig, /<FilesMatch "\\\.png\$">[\s\S]*ForceType image\/jpeg[\s\S]*<\/FilesMatch>/);

  const problems = [];
  for (const relativePath of files.filter(isDeployable)) {
    const extension = path.extname(relativePath).toLowerCase();
    if (!['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'].includes(extension)) continue;
    const buffer = fs.readFileSync(path.join(root, relativePath));
    const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const jpeg = buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const gif = ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
    const webp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    const svg = /^(?:<\?xml[^>]*>\s*)?<svg\b/i.test(buffer.subarray(0, 512).toString('utf8').replace(/^\uFEFF/, '').trimStart());
    const jpegBackedStableOgp = extension === '.png' && relativePath.startsWith('articles/ogp/') && jpeg;
    const valid = extension === '.png' ? png || jpegBackedStableOgp
      : ['.jpg', '.jpeg'].includes(extension) ? jpeg
        : extension === '.gif' ? gif
          : extension === '.webp' ? webp
            : svg;
    if (!valid) problems.push(relativePath);
  }
  assert.deepEqual(problems, [], `実形式と配信形式が不一致:\n${problems.join('\n')}`);
});

test('未参照アセットと内容が完全重複する公開ファイルを残さない', () => {
  const orphaned = files.filter(relativePath => {
    if (!isDeployable(relativePath) || standaloneAssets.has(relativePath) || runtimeEntrypoints.has(relativePath)) return false;
    if (!assetExtensions.has(path.extname(relativePath).toLowerCase())) return false;
    return !resolvedReferences.has(relativePath) && !relativePath.startsWith('status/');
  });

  const hashes = new Map();
  for (const relativePath of files.filter(isDeployable)) {
    const absolute = path.join(root, relativePath);
    const stat = fs.statSync(absolute);
    if (!stat.isFile() || stat.size < 256) continue;
    const digest = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
    const group = hashes.get(digest) || [];
    group.push(relativePath);
    hashes.set(digest, group);
  }
  const duplicates = [...hashes.values()].filter(group => group.length > 1);
  console.log(`\n[repository-integrity] files=${files.length} text=${textFiles.size} deployable=${files.filter(isDeployable).length} references=${resolvedReferences.size}`);
  assert.deepEqual(orphaned, [], `未参照アセット:\n${orphaned.join('\n')}`);
  assert.deepEqual(duplicates, [], `完全重複ファイル:\n${duplicates.map(group => group.join(' = ')).join('\n')}`);
});
