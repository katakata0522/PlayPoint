'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ARTICLE_DIRECTORIES = ['articles', 'en/articles', 'ko/articles', 'tw/articles'];
const EXCLUDED_DIRECTORIES = new Set(['.git', '.github', 'docs', 'node_modules', 'scripts', 'tests']);

function createRevision(absolutePath) {
  const content = fs.readFileSync(absolutePath, 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
}

function resolveLocalAsset(rootDir, htmlFile, href, extension) {
  if (/^(?:https?:)?\/\//i.test(href)) return null;
  const cleanHref = href.split(/[?#]/, 1)[0];
  const absolutePath = cleanHref.startsWith('/')
    ? path.join(rootDir, cleanHref.slice(1))
    : path.resolve(path.dirname(htmlFile), cleanHref);
  if (!absolutePath.startsWith(rootDir + path.sep) || !absolutePath.endsWith(extension)) return null;
  return fs.existsSync(absolutePath) ? absolutePath : null;
}

function listPublicHtmlFiles(rootDir, currentDir = rootDir) {
  const files = [];
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listPublicHtmlFiles(rootDir, absolutePath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(absolutePath);
    }
  }
  return files;
}

function modulePreloadHref(rootDir, htmlFile, href) {
  const script = resolveLocalAsset(rootDir, htmlFile, href, '.js');
  if (!script) return null;

  // main.jsはHTMLの実行タグも同じ内容ハッシュURLを使う。
  // 依存モジュールはmain.js内の相対import（クエリなし）と完全一致させ、
  // preloadとimportが別URL扱いになって二重取得されるのを防ぐ。
  if (['main.js', 'analytics-core.js'].includes(path.basename(script))) {
    return `${href}?v=${createRevision(script)}`;
  }
  return href;
}

function syncPublicAssetVersions(rootDir) {
  let updatedFiles = 0;

  for (const htmlFile of listPublicHtmlFiles(rootDir)) {
      const original = fs.readFileSync(htmlFile, 'utf8');
      let updated = original.replace(
        /(<link\b[^>]*\brel=["']modulepreload["'][^>]*\bhref=["'])([^"']+\.js)(?:\?v=[a-zA-Z0-9_-]+)?(["'][^>]*>)/gi,
        (match, prefix, href, suffix) => {
          const synchronizedHref = modulePreloadHref(rootDir, htmlFile, href);
          return synchronizedHref ? `${prefix}${synchronizedHref}${suffix}` : match;
        }
      );
      updated = updated.replace(
        /(<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["'])([^"']+\.css)(?:\?v=[a-zA-Z0-9_-]+)?(["'][^>]*>)/gi,
        (match, prefix, href, suffix) => {
          const stylesheet = resolveLocalAsset(rootDir, htmlFile, href, '.css');
          if (!stylesheet) return match;
          return `${prefix}${href}?v=${createRevision(stylesheet)}${suffix}`;
        }
      );
      updated = updated.replace(
        /(<script\b[^>]*\bsrc=["'])([^"']+\.js)(?:\?v=[a-zA-Z0-9_-]+)?(["'][^>]*>)/gi,
        (match, prefix, src, suffix) => {
          const script = resolveLocalAsset(rootDir, htmlFile, src, '.js');
          if (!script) return match;
          return `${prefix}${src}?v=${createRevision(script)}${suffix}`;
        }
      );

      if (updated !== original) {
        fs.writeFileSync(htmlFile, updated, 'utf8');
        updatedFiles += 1;
      }
  }

  console.log(`[public-assets] synchronized content hashes: ${updatedFiles} files`);
  return updatedFiles;
}

function syncDynamicArticleStylesheetVersion(rootDir) {
  const scriptPath = path.join(rootDir, 'blog/article.js');
  const stylesheetPath = path.join(rootDir, 'articles/source-notice.css');
  if (!fs.existsSync(scriptPath) || !fs.existsSync(stylesheetPath)) return false;

  const original = fs.readFileSync(scriptPath, 'utf8');
  const version = createRevision(stylesheetPath);
  const updated = original.replace(
    /(\.\.\/articles\/source-notice\.css)(?:\?v=[a-zA-Z0-9_-]+)?/g,
    `$1?v=${version}`
  );
  if (updated === original) return false;
  fs.writeFileSync(scriptPath, updated, 'utf8');
  console.log(`[article-assets] synchronized source-notice.css: v=${version}`);
  return true;
}

module.exports = {
  ARTICLE_DIRECTORIES,
  EXCLUDED_DIRECTORIES,
  createRevision,
  listPublicHtmlFiles,
  modulePreloadHref,
  resolveLocalAsset,
  syncPublicAssetVersions,
  syncDynamicArticleStylesheetVersion
};
