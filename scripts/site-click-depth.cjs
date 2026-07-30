'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const MAX_CLICK_DEPTH = 3;
const EXCLUDED_DIRECTORIES = new Set(['.git', '.playwright-cli', 'node_modules']);

function walkHtmlFiles(rootDir, currentDir = rootDir, files = []) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walkHtmlFiles(rootDir, absolutePath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(path.relative(rootDir, absolutePath).replace(/\\/g, '/'));
    }
  }
  return files;
}

function fileToPublicPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized === 'index.html') return '/';
  if (normalized.endsWith('/index.html')) {
    return `/${normalized.slice(0, -'index.html'.length)}`;
  }
  return `/${normalized}`;
}

function normalizeInternalHref(href, basePath) {
  if (!href || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) return null;
  try {
    const resolved = new URL(href, `${SITE_ORIGIN}${basePath}`);
    if (resolved.origin !== SITE_ORIGIN) return null;
    let publicPath = resolved.pathname.replace(/\/+/g, '/');
    if (publicPath.endsWith('/index.html')) {
      publicPath = publicPath.slice(0, -'index.html'.length);
    }
    return publicPath;
  } catch {
    return null;
  }
}

function buildLinkGraph(rootDir) {
  const htmlFiles = walkHtmlFiles(rootDir);
  const publicPathToFile = new Map(
    htmlFiles.map(relativePath => [fileToPublicPath(relativePath), relativePath])
  );
  const graph = new Map();

  for (const relativePath of htmlFiles) {
    const publicPath = fileToPublicPath(relativePath);
    const html = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)]
      .map(match => normalizeInternalHref(match[1], publicPath))
      .filter(Boolean);
    graph.set(publicPath, [...new Set(hrefs)]);
  }

  return { graph, publicPathToFile };
}

function getPublishedArticlePaths(rootDir) {
  const sitemapFiles = fs.readdirSync(rootDir)
    .filter(file => /^sitemap.*\.xml$/.test(file))
    .map(file => path.join(rootDir, file));
  const blogSitemap = path.join(rootDir, 'blog', 'sitemap.xml');
  if (fs.existsSync(blogSitemap)) sitemapFiles.push(blogSitemap);

  const paths = new Set();
  for (const sitemapFile of sitemapFiles) {
    const xml = fs.readFileSync(sitemapFile, 'utf8');
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      try {
        const url = new URL(match[1]);
        if (url.origin !== SITE_ORIGIN) continue;
        if (!url.pathname.includes('/articles/') || url.pathname.endsWith('/articles/')) continue;
        paths.add(url.pathname);
      } catch {
        // 壊れたURLは既存のサイトマップ検査へ任せ、ここでは到達性だけを扱う。
      }
    }
  }
  return [...paths].sort();
}

function calculateDepths(graph, startPath = '/') {
  const depths = new Map([[startPath, 0]]);
  const queue = [startPath];

  for (let index = 0; index < queue.length; index += 1) {
    const currentPath = queue[index];
    const nextDepth = depths.get(currentPath) + 1;
    for (const linkedPath of graph.get(currentPath) || []) {
      if (!graph.has(linkedPath) || depths.has(linkedPath)) continue;
      depths.set(linkedPath, nextDepth);
      queue.push(linkedPath);
    }
  }
  return depths;
}

function auditClickDepth(rootDir, maxDepth = MAX_CLICK_DEPTH) {
  const { graph, publicPathToFile } = buildLinkGraph(rootDir);
  const checkedUrls = getPublishedArticlePaths(rootDir);
  const depths = calculateDepths(graph);
  const unreachable = checkedUrls.filter(publicPath => (
    !publicPathToFile.has(publicPath) || !depths.has(publicPath)
  ));
  const overLimit = checkedUrls.filter(publicPath => (
    depths.has(publicPath) && depths.get(publicPath) > maxDepth
  ));
  const measuredDepths = checkedUrls
    .map(publicPath => depths.get(publicPath))
    .filter(Number.isFinite);

  return {
    checkedUrls,
    depths,
    maxDepth: measuredDepths.length ? Math.max(...measuredDepths) : 0,
    overLimit,
    unreachable
  };
}

function runCli() {
  const rootDir = path.resolve(__dirname, '..');
  const result = auditClickDepth(rootDir);
  console.log(
    `公開記事のクリック深度: ${result.checkedUrls.length}件、最大${result.maxDepth}クリック`
  );

  for (const publicPath of result.unreachable) {
    console.error(`トップから到達できません: ${publicPath}`);
  }
  for (const publicPath of result.overLimit) {
    console.error(`3クリックを超えています: ${publicPath} (${result.depths.get(publicPath)})`);
  }

  if (result.unreachable.length || result.overLimit.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) runCli();

module.exports = {
  MAX_CLICK_DEPTH,
  SITE_ORIGIN,
  auditClickDepth,
  buildLinkGraph,
  calculateDepths,
  fileToPublicPath,
  getPublishedArticlePaths,
  normalizeInternalHref,
  walkHtmlFiles
};
