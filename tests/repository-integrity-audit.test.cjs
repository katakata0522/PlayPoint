'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const textExtensions = new Set([
  '.html', '.htm', '.css', '.js', '.cjs', '.mjs', '.json', '.xml', '.svg',
  '.md', '.txt', '.yml', '.yaml', '.webmanifest'
]);
const assetExtensions = new Set([
  '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
  '.woff', '.woff2', '.ttf', '.ico'
]);
const excludedTopDirectories = new Set(['.git', '.github', 'docs', 'node_modules', 'scripts', 'tests']);
const excludedRootFiles = new Set([
  '.gitignore', '.gitattributes', 'README.md', 'AGENTS.md', 'みんな用URL.txt', 'CNAME'
]);
const runtimeEntrypoints = new Set([
  'articles/source-notice.css',
  'blog/articles.json',
  'sw.js'
]);
const allowedStandaloneAssets = new Set([
  'favicon.svg', 'icon-192.png', 'icon-512.png', 'ogp.png', 'ogp.svg',
  'manifest.json', 'robots.txt', 'ads.txt', 'feed.xml', 'atom.xml',
  'status/deploy-revision.txt', 'status/deploy-status.json'
]);
const retiredExactPaths = new Set([
  'calculator.html',
  'articles/2026-06-29-savings-game-fire.html',
  'articles/2025-12-25-playpoints-not-reflected.html',
  'articles/ogp/playpoints-not-reflected.png',
  'articles/styles/2025-12-25-movies-books.css',
  'articles/styles/2025-12-25-play-games.css',
  'articles/styles/2025-12-25-subscription.css',
  'articles/styles/2025-12-25-weekly-reward.css',
  'en/articles/google-play-points-reflection-timing.html'
]);
const retiredReferenceFragments = [
  'tools/',
  'kindle-tracker/',
  'kids-smile-land/',
  'doujin-shi-calculator/',
  ...retiredExactPaths
];

function slash(value) {
  return value.replaceAll('\\', '/');
}

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .map(slash)
    .sort();
}

const files = trackedFiles();
const fileSet = new Set(files);

function isDeployable(relativePath) {
  if (excludedRootFiles.has(relativePath)) return false;
  return !excludedTopDirectories.has(relativePath.split('/')[0]);
}

function isTextFile(relativePath) {
  if (path.basename(relativePath) === '.htaccess') return true;
  return textExtensions.has(path.extname(relativePath).toLowerCase());
}

const textByFile = new Map(
  files
    .filter(isTextFile)
    .map(relativePath => [relativePath, fs.readFileSync(path.join(root, relativePath), 'utf8')])
);

function stripQueryAndHash(value) {
  const query = value.indexOf('?');
  const hash = value.indexOf('#');
  let end = value.length;
  if (query >= 0) end = Math.min(end, query);
  if (hash >= 0) end = Math.min(end, hash);
  return value.slice(0, end);
}

function getFragment(value) {
  const index = value.indexOf('#');
  if (index < 0) return '';
  try {
    return decodeURIComponent(value.slice(index + 1));
  } catch {
    return value.slice(index + 1);
  }
}

function shouldIgnoreReference(raw) {
  const value = raw.trim();
  return value === '' || value === '#' || /^(?:mailto:|tel:|data:|blob:|javascript:)/i.test(value)
    || /^\{[{%]/.test(value) || /^\$\{/.test(value);
}

function localUrlPath(raw) {
  const value = raw.trim();
  if (shouldIgnoreReference(value)) return null;
  if (/^https?:\/\//i.test(value)) {
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      return null;
    }
    if (!['playpoint-sim.com', 'www.playpoint-sim.com'].includes(parsed.hostname)) return null;
    return parsed.pathname + parsed.search + parsed.hash;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return null;
  return value;
}

function candidatePaths(sourceFile, raw) {
  const local = localUrlPath(raw);
  if (local === null) return [];

  let pathname = stripQueryAndHash(local);
  if (pathname === '') pathname = path.basename(sourceFile);
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Malformed percent encoding remains visible in the missing-reference report.
  }

  const joined = pathname.startsWith('/')
    ? pathname.replace(/^\/+/, '')
    : slash(path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), pathname)));
  if (joined === '..' || joined.startsWith('../')) return [];

  const normalized = joined === '.' ? '' : joined.replace(/^\.\//, '');
  const candidates = [];
  if (normalized === '' || normalized.endsWith('/')) {
    candidates.push(normalized + 'index.html');
  } else {
    candidates.push(normalized);
    if (!path.posix.extname(normalized)) {
      candidates.push(normalized + '.html');
      candidates.push(normalized + '/index.html');
    }
  }
  return [...new Set(candidates.map(item => item.replace(/^\/+/, '')))];
}

function resolveReference(sourceFile, raw) {
  return candidatePaths(sourceFile, raw).find(candidate => fileSet.has(candidate)) || null;
}

function collectHtmlReferences(content) {
  const references = [];
  for (const match of content.matchAll(/\b(?:href|src|poster|action|data-src)\s*=\s*["']([^"']+)["']/gi)) {
    references.push(match[1]);
  }
  for (const match of content.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    for (const item of match[1].split(',')) {
      const url = item.trim().split(/\s+/, 1)[0];
      if (url) references.push(url);
    }
  }
  return references;
}

function collectCssReferences(content) {
  return [...content.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)].map(match => match[1]);
}

function collectJavaScriptModuleReferences(content) {
  const references = [];
  for (const pattern of [
    /\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g
  ]) {
    for (const match of content.matchAll(pattern)) references.push(match[1]);
  }
  return references;
}

function collectXmlReferences(content) {
  return [...content.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(match => match[1]);
}

function collectJsonReferences(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const references = [];
  const interestingKeys = new Set(['file', 'src', 'href', 'url', 'start_url', 'scope', 'canonical']);
  function visit(value, key = '') {
    if (typeof value === 'string') {
      if (interestingKeys.has(key) || /^(?:\.?\.?\/|\/|https?:\/\/playpoint-sim\.com)/.test(value)) references.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(item => visit(item, key));
      return;
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
    }
  }
  visit(parsed);
  return references;
}

function referencesFor(relativePath, content) {
  const extension = path.extname(relativePath).toLowerCase();
  if (['.html', '.htm', '.svg'].includes(extension)) return collectHtmlReferences(content);
  if (extension === '.css') return collectCssReferences(content);
  if (['.js', '.cjs', '.mjs'].includes(extension)) return collectJavaScriptModuleReferences(content);
  if (extension === '.xml') return collectXmlReferences(content);
  if (['.json', '.webmanifest'].includes(extension)) return collectJsonReferences(content);
  return [];
}

function idsFor(content) {
  const ids = new Set();
  for (const match of content.matchAll(/\b(?:id|name)\s*=\s*["']([^"']+)["']/gi)) ids.add(match[1]);
  return ids;
}

const allResolvedReferences = new Set(runtimeEntrypoints);
const missingReferences = [];
const brokenAnchors = [];

for (const [relativePath, content] of textByFile) {
  if (!isDeployable(relativePath)) continue;
  for (const rawReference of referencesFor(relativePath, content)) {
    const local = localUrlPath(rawReference);
    if (local === null) continue;
    const candidates = candidatePaths(relativePath, rawReference);
    const resolved = candidates.find(candidate => fileSet.has(candidate));
    if (!resolved) {
      missingReferences.push(`${relativePath} -> ${rawReference} (候補: ${candidates.join(', ') || 'なし'})`);
      continue;
    }
    allResolvedReferences.add(resolved);
    const fragment = getFragment(rawReference);
    if (!fragment || path.extname(resolved).toLowerCase() !== '.html') continue;
    const targetContent = textByFile.get(resolved);
    if (targetContent && !idsFor(targetContent).has(fragment)) {
      brokenAnchors.push(`${relativePath} -> ${rawReference} (${resolved} に #${fragment} がない)`);
    }
  }
}

test('追跡ファイル名はOS差で衝突せず、一時ファイルを含まない', () => {
  const caseOwners = new Map();
  const collisions = [];
  const suspicious = [];
  for (const relativePath of files) {
    const lower = relativePath.toLowerCase();
    if (caseOwners.has(lower) && caseOwners.get(lower) !== relativePath) {
      collisions.push(`${caseOwners.get(lower)} <> ${relativePath}`);
    }
    caseOwners.set(lower, relativePath);
    if (/(?:^|\/)(?:[^/]+\.(?:bak|orig|rej|tmp)|(?:backup|copy|temp|tmp)(?:[-_.][^/]*)?)$/i.test(relativePath)) {
      suspicious.push(relativePath);
    }
  }
  assert.deepEqual(collisions, [], `大文字小文字だけが異なるパスがあります:\n${collisions.join('\n')}`);
  assert.deepEqual(suspicious, [], `一時・バックアップらしい追跡ファイルがあります:\n${suspicious.join('\n')}`);
});

test('移設・統合・共通化済みファイルの実体をリポジトリに残さない', () => {
  const remaining = [...retiredExactPaths].filter(relativePath => fileSet.has(relativePath));
  assert.deepEqual(remaining, [], `削除済みであるべき実体が残っています:\n${remaining.join('\n')}`);
});

test('本番公開ファイルの内部参照先はすべて存在する', () => {
  assert.deepEqual(missingReferences, [], `存在しない内部参照があります:\n${missingReferences.join('\n')}`);
});

test('本番公開HTMLの内部アンカーは実在する', () => {
  assert.deepEqual(brokenAnchors, [], `存在しないアンカー参照があります:\n${brokenAnchors.join('\n')}`);
});

test('canonicalは自分自身の公開ページを指し、重複しない', () => {
  const canonicalOwners = new Map();
  const problems = [];
  for (const [relativePath, content] of textByFile) {
    if (!isDeployable(relativePath) || path.extname(relativePath).toLowerCase() !== '.html') continue;
    const match = content.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
      || content.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
    if (!match) {
      problems.push(`${relativePath}: canonicalがない`);
      continue;
    }
    const canonical = match[1];
    const resolved = resolveReference(relativePath, canonical);
    if (resolved !== relativePath) problems.push(`${relativePath}: ${canonical} -> ${resolved || '解決不能'}`);
    if (canonicalOwners.has(canonical)) problems.push(`${canonical}: ${canonicalOwners.get(canonical)} と ${relativePath} で重複`);
    canonicalOwners.set(canonical, relativePath);
  }
  assert.deepEqual(problems, [], `canonicalの不整合があります:\n${problems.join('\n')}`);
});

test('移設・統合済みの旧パスを公開コードから参照しない', () => {
  const problems = [];
  for (const [relativePath, content] of textByFile) {
    if (!isDeployable(relativePath) || relativePath === '.htaccess') continue;
    for (const retiredPath of retiredReferenceFragments) {
      if (content.includes(retiredPath)) problems.push(`${relativePath}: ${retiredPath}`);
    }
  }
  assert.deepEqual(problems, [], `旧パス参照が公開コードに残っています:\n${problems.join('\n')}`);
});

test('公開コードに開発環境・旧ホスト・危険な仮URLを残さない', () => {
  const forbidden = [
    /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i,
    /https?:\/\/playpoint-sim\.xsrv\.jp/i,
    /https?:\/\/www\.playpoint-sim\.com/i,
    /file:\/\//i
  ];
  const problems = [];
  for (const [relativePath, content] of textByFile) {
    if (!isDeployable(relativePath)) continue;
    for (const pattern of forbidden) {
      if (pattern.test(content)) problems.push(`${relativePath}: ${pattern}`);
    }
  }
  assert.deepEqual(problems, [], `公開コードに仮・旧URLがあります:\n${problems.join('\n')}`);
});

test('公開画像の拡張子と実データ形式を一致させる', () => {
  const problems = [];
  for (const relativePath of files.filter(isDeployable)) {
    const extension = path.extname(relativePath).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(extension)) continue;
    const buffer = fs.readFileSync(path.join(root, relativePath));
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isGif = buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a';
    const isWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    const isSvg = buffer.subarray(0, 512).toString('utf8').replace(/^\uFEFF/, '').trimStart().match(/^(?:<\?xml[^>]*>\s*)?<svg\b/i);
    const valid = extension === '.png' ? isPng
      : ['.jpg', '.jpeg'].includes(extension) ? isJpeg
        : extension === '.gif' ? isGif
          : extension === '.webp' ? isWebp
            : Boolean(isSvg);
    if (!valid) problems.push(relativePath);
  }
  assert.deepEqual(problems, [], `拡張子と中身が一致しない画像があります:\n${problems.join('\n')}`);
});

test('未参照の公開アセットとバイト単位の重複物を残さない', () => {
  const orphanCandidates = files.filter(relativePath => {
    if (!isDeployable(relativePath) || allowedStandaloneAssets.has(relativePath) || runtimeEntrypoints.has(relativePath)) return false;
    if (!assetExtensions.has(path.extname(relativePath).toLowerCase())) return false;
    if (allResolvedReferences.has(relativePath) || relativePath.startsWith('status/')) return false;
    return true;
  });

  const duplicateGroups = new Map();
  for (const relativePath of files.filter(isDeployable)) {
    const absolutePath = path.join(root, relativePath);
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile() || stat.size < 256) continue;
    const digest = crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
    const group = duplicateGroups.get(digest) || [];
    group.push(relativePath);
    duplicateGroups.set(digest, group);
  }
  const duplicates = [...duplicateGroups.values()].filter(group => group.length > 1);

  console.log(`\n[repository-integrity] tracked=${files.length} deployable=${files.filter(isDeployable).length}`);
  console.log(`[repository-integrity] resolved-local-references=${allResolvedReferences.size}`);
  assert.deepEqual(orphanCandidates, [], `未参照の公開アセット候補があります:\n${orphanCandidates.join('\n')}`);
  assert.deepEqual(duplicates, [], `内容が完全に重複する公開ファイルがあります:\n${duplicates.map(group => group.join(' | ')).join('\n')}`);
});

test('READMEとPWAメタデータは現行機能を説明する', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.doesNotMatch(readme, /特典倍率の自動反映/);
  assert.match(readme, /Androidアプリ版 \| 🧪 内部テスト中/);
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.match(manifest.description, /ウィークリーリワード記録日記/);
});
