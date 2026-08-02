'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const siteOrigin = 'https://playpoint-sim.com';
const textExtensions = new Set([
  '.html', '.htm', '.css', '.js', '.cjs', '.mjs', '.json', '.xml', '.svg',
  '.md', '.txt', '.yml', '.yaml', '.webmanifest'
]);
const assetExtensions = new Set([
  '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
  '.woff', '.woff2', '.ttf', '.ico'
]);
const excludedTopDirectories = new Set(['.git', '.github', 'docs', 'scripts', 'tests', 'node_modules']);
const excludedRootFiles = new Set([
  '.gitignore', '.gitattributes', 'README.md', 'AGENTS.md', 'みんな用URL.txt', 'CNAME'
]);
const retiredPublicPaths = [
  'tools/',
  'kindle-tracker/',
  'kids-smile-land/',
  'doujin-shi-calculator/',
  'articles/2026-06-29-savings-game-fire.html',
  'articles/2025-12-25-playpoints-not-reflected.html',
  'en/articles/google-play-points-reflection-timing.html'
];
const allowedStandaloneAssets = new Set([
  'favicon.svg', 'icon-192.png', 'icon-512.png', 'ogp.png', 'ogp.svg',
  'manifest.json', 'robots.txt', 'ads.txt', 'feed.xml', 'atom.xml',
  'status/deploy-revision.txt', 'status/deploy-status.json'
]);

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
  const first = relativePath.split('/')[0];
  return !excludedTopDirectories.has(first);
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
  const hashIndex = value.indexOf('#');
  const queryIndex = value.indexOf('?');
  let end = value.length;
  if (hashIndex >= 0) end = Math.min(end, hashIndex);
  if (queryIndex >= 0) end = Math.min(end, queryIndex);
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
    if (parsed.hostname !== 'playpoint-sim.com' && parsed.hostname !== 'www.playpoint-sim.com') return null;
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
    // Keep the original path when percent encoding is malformed; the missing-reference report will expose it.
  }
  const base = pathname.startsWith('/')
    ? pathname.replace(/^\/+/, '')
    : slash(path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), pathname)));
  if (base === '..' || base.startsWith('../')) return [];
  const normalized = base.replace(/^\.\//, '');
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
  const candidates = candidatePaths(sourceFile, raw);
  return candidates.find(candidate => fileSet.has(candidate)) || null;
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
  const patterns = [
    /\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g
  ];
  for (const pattern of patterns) {
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
  if (extension === '.html' || extension === '.htm' || extension === '.svg') return collectHtmlReferences(content);
  if (extension === '.css') return collectCssReferences(content);
  if (extension === '.js' || extension === '.cjs' || extension === '.mjs') return collectJavaScriptModuleReferences(content);
  if (extension === '.xml') return collectXmlReferences(content);
  if (extension === '.json' || extension === '.webmanifest') return collectJsonReferences(content);
  return [];
}

function idsFor(content) {
  const ids = new Set();
  for (const match of content.matchAll(/\b(?:id|name)\s*=\s*["']([^"']+)["']/gi)) ids.add(match[1]);
  return ids;
}

const allResolvedReferences = new Set();
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
  const lowerCasePaths = new Map();
  const collisions = [];
  const suspicious = [];
  for (const relativePath of files) {
    const lower = relativePath.toLowerCase();
    if (lowerCasePaths.has(lower) && lowerCasePaths.get(lower) !== relativePath) {
      collisions.push(`${lowerCasePaths.get(lower)} <> ${relativePath}`);
    }
    lowerCasePaths.set(lower, relativePath);
    if (/(?:^|\/)(?:[^/]+\.(?:bak|orig|rej|tmp)|(?:backup|copy|temp|tmp)(?:[-_.][^/]*)?)$/i.test(relativePath)) {
      suspicious.push(relativePath);
    }
  }
  assert.deepEqual(collisions, [], `大文字小文字だけが異なるパスがあります:\n${collisions.join('\n')}`);
  assert.deepEqual(suspicious, [], `一時・バックアップらしい追跡ファイルがあります:\n${suspicious.join('\n')}`);
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
    for (const retiredPath of retiredPublicPaths) {
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

test('未参照の公開アセット候補を監査ログへ出す', () => {
  const orphanCandidates = files.filter(relativePath => {
    if (!isDeployable(relativePath) || allowedStandaloneAssets.has(relativePath)) return false;
    if (!assetExtensions.has(path.extname(relativePath).toLowerCase())) return false;
    if (allResolvedReferences.has(relativePath)) return false;
    if (relativePath.startsWith('status/')) return false;
    return true;
  });
  const duplicateGroups = new Map();
  for (const relativePath of files.filter(isDeployable)) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.statSync(absolutePath).isFile() || fs.statSync(absolutePath).size < 256) continue;
    const digest = crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
    const group = duplicateGroups.get(digest) || [];
    group.push(relativePath);
    duplicateGroups.set(digest, group);
  }
  const duplicates = [...duplicateGroups.values()].filter(group => group.length > 1);
  console.log(`\n[repository-integrity] tracked=${files.length} deployable=${files.filter(isDeployable).length}`);
  console.log(`[repository-integrity] resolved-local-references=${allResolvedReferences.size}`);
  console.log(`[repository-integrity] orphan-asset-candidates=${orphanCandidates.length}`);
  orphanCandidates.forEach(item => console.log(`  ORPHAN? ${item}`));
  console.log(`[repository-integrity] byte-identical-public-groups=${duplicates.length}`);
  duplicates.forEach(group => console.log(`  DUPLICATE? ${group.join(' | ')}`));
  assert.ok(true);
});
