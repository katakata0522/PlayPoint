'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const JSON_LD_SCRIPT = /(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi;
const ARTICLE_FILE = /^\.\.\/(?:articles\/[^/]+\.html|games\/[a-z0-9-]+\/[a-z0-9-]+\/index\.html)$/;
const OGP_PATH = /^\.\.\/articles\/ogp\/[a-z0-9-]+\.png$/i;
const SAFE_GAME_THUMBNAIL = /^\.\.\/images\/game-icons\/[a-z0-9-]+\.webp$/i;
const SAFE_GENERIC_THUMBNAIL = /^\.\.\/articles\/thumbnails\/[a-z0-9-]+-square-v1\.webp$/i;

const CONFIG_PATH = path.join(__dirname, 'article-image-assets.json');
const IMAGE_ASSET_CONFIG = Object.freeze(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
const GAME_THUMBNAILS = Object.freeze({ ...IMAGE_ASSET_CONFIG.gameThumbnails });
const GENERIC_ARTICLE_IDS = new Set(IMAGE_ASSET_CONFIG.genericArticleIds);
const DEDICATED_OGP_IDS = new Set(IMAGE_ASSET_CONFIG.dedicatedOgpIds);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function normalizeManifestPath(value) {
  const raw = String(value || '').trim();
  if (raw === '../ogp.png' || OGP_PATH.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.origin !== SITE_ORIGIN) return '';
      if (url.pathname === '/ogp.png') return '../ogp.png';
      if (/^\/articles\/ogp\/[a-z0-9-]+\.png$/i.test(url.pathname)) {
        return '..' + url.pathname;
      }
    } catch {
      return '';
    }
  }
  return '';
}

function publicUrlForManifestPath(value) {
  const normalized = normalizeManifestPath(value);
  if (!normalized) return '';
  return new URL(normalized, `${SITE_ORIGIN}/blog/`).href;
}

function extractMetaContent(html, attribute, value) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escapeRegExp(value)}["'])[^>]*\\bcontent=["']([^"']*)["'][^>]*>`, 'i');
  return String(html).match(pattern)?.[1] || '';
}

function extractOgpManifestPath(html) {
  const content = extractMetaContent(html, 'property', 'og:image');
  if (!content) return '';
  return normalizeManifestPath(content);
}

function setMetaContent(html, attribute, value, content) {
  const tagPattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escapeRegExp(value)}["'])[^>]*>`, 'i');
  if (tagPattern.test(html)) {
    return html.replace(tagPattern, tag => {
      if (/\bcontent=["'][^"']*["']/i.test(tag)) {
        return tag.replace(/\bcontent=["'][^"']*["']/i, `content="${escapeAttribute(content)}"`);
      }
      return tag.replace(/\s*\/?>$/, ` content="${escapeAttribute(content)}">`);
    });
  }
  return html.replace(/<\/head>/i, `  <meta ${attribute}="${value}" content="${escapeAttribute(content)}" />\n</head>`);
}

function isArticleNode(value) {
  if (!value || typeof value !== 'object') return false;
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  return types.some(type => ['Article', 'BlogPosting', 'NewsArticle'].includes(type));
}

function collectArticleNodes(value, result = []) {
  if (Array.isArray(value)) {
    for (const child of value) collectArticleNodes(child, result);
    return result;
  }
  if (!value || typeof value !== 'object') return result;
  if (isArticleNode(value)) result.push(value);
  for (const child of Object.values(value)) collectArticleNodes(child, result);
  return result;
}

function collectImageNodes(value, result = []) {
  if (Array.isArray(value)) {
    for (const child of value) collectImageNodes(child, result);
    return result;
  }
  if (!value || typeof value !== 'object') return result;
  if (Object.prototype.hasOwnProperty.call(value, 'image')) result.push(value);
  for (const child of Object.values(value)) collectImageNodes(child, result);
  return result;
}

function serializeJsonLdBody(data, originalBody) {
  const leading = String(originalBody).match(/^\s*/)?.[0] || '';
  const trailing = String(originalBody).match(/\s*$/)?.[0] || '';
  const pretty = /\r?\n/.test(originalBody);
  const lineEnding = originalBody.includes('\r\n') ? '\r\n' : '\n';
  let serialized = JSON.stringify(data, null, pretty ? 2 : 0);
  if (lineEnding !== '\n') serialized = serialized.replaceAll('\n', lineEnding);
  return leading + serialized + trailing;
}

function updateJsonLdArticleImage(html, publicUrl) {
  return String(html).replace(JSON_LD_SCRIPT, (full, open, body, close) => {
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return full;
    }
    const nodes = collectArticleNodes(data);
    if (!nodes.length) return full;

    const imageNodes = collectImageNodes(data);
    const hasNonArticleImageNode = imageNodes.some(node => !nodes.includes(node));
    const hasNonStringArticleImage = nodes.some(node => typeof node.image !== 'string');
    if (hasNonArticleImageNode || hasNonStringArticleImage) {
      for (const node of nodes) node.image = publicUrl;
      return `${open}${serializeJsonLdBody(data, body)}${close}`;
    }

    let nextBody = body;
    for (const node of nodes) {
      const imagePattern = new RegExp(`("image"\\s*:\\s*)"${escapeRegExp(node.image)}"`);
      nextBody = nextBody.replace(imagePattern, `$1${JSON.stringify(publicUrl)}`);
    }
    return `${open}${nextBody}${close}`;
  });
}

function expectedThumbnail(article) {
  const gameThumbnail = GAME_THUMBNAILS[article.id];
  if (gameThumbnail) return { thumbnail: gameThumbnail, thumbnailKind: 'app-icon' };
  if (GENERIC_ARTICLE_IDS.has(article.id)) {
    return {
      thumbnail: `../articles/thumbnails/${article.id}-square-v1.webp`,
      thumbnailKind: 'generic'
    };
  }
  return null;
}

function expectedOgp(article, html) {
  if (DEDICATED_OGP_IDS.has(article.id)) return `../articles/ogp/${article.id}.png`;
  const headPath = extractOgpManifestPath(html);
  if (headPath && headPath !== '../ogp.png') return headPath;
  const manifestPath = normalizeManifestPath(article.ogp);
  if (manifestPath && manifestPath !== '../ogp.png') return manifestPath;
  const thumbnailPath = normalizeManifestPath(article.thumbnail);
  if (thumbnailPath && thumbnailPath !== '../ogp.png') return thumbnailPath;
  if (manifestPath) return manifestPath;
  throw new Error(`${article.id}: 専用OGPの取得元を記事headから特定できません`);
}

function resolveArticleImageRoles(rootDir, article, html) {
  const thumbnail = expectedThumbnail(article);
  const ogp = expectedOgp(article, html);
  if (thumbnail && !SAFE_GAME_THUMBNAIL.test(thumbnail.thumbnail) && !SAFE_GENERIC_THUMBNAIL.test(thumbnail.thumbnail)) {
    throw new Error(`${article.id}: 許可されていない一覧画像パスです: ${thumbnail.thumbnail}`);
  }
  if (!OGP_PATH.test(ogp)) throw new Error(`${article.id}: 許可されていないOGPパスです: ${ogp}`);
  return { thumbnail, ogp };
}

function assetAbsolutePath(rootDir, manifestPath) {
  return path.join(rootDir, String(manifestPath).replace(/^\.\.\//, ''));
}

function syncArticleImageRoles(rootDir, options = {}) {
  const checkAssets = options.checkAssets !== false;
  const manifestPath = path.join(rootDir, 'blog', 'articles.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const nextManifest = manifest.map(article => ({ ...article }));
  const missingAssets = [];
  let changedManifest = false;
  let changedHtml = 0;
  let gameThumbnails = 0;
  let genericThumbnails = 0;
  let dedicatedOgp = 0;
  const plans = [];

  for (let index = 0; index < nextManifest.length; index += 1) {
    const article = nextManifest[index];
    if (!article || !ARTICLE_FILE.test(String(article.file || ''))) continue;
    const relativePath = article.file.replace(/^\.\.\//, '');
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) throw new Error(`${relativePath}: 記事HTMLがありません`);
    const before = fs.readFileSync(absolutePath, 'utf8');
    const roles = resolveArticleImageRoles(rootDir, article, before);
    const publicOgp = publicUrlForManifestPath(roles.ogp);
    plans.push({ article, absolutePath, before, roles, publicOgp });
    if (roles.thumbnail) {
      if (article.thumbnail !== roles.thumbnail.thumbnail || article.thumbnailKind !== roles.thumbnail.thumbnailKind) {
        changedManifest = true;
      }
      if (roles.thumbnail.thumbnailKind === 'app-icon') gameThumbnails += 1;
      if (roles.thumbnail.thumbnailKind === 'generic') genericThumbnails += 1;
      if (checkAssets && !fs.existsSync(assetAbsolutePath(rootDir, roles.thumbnail.thumbnail))) {
        missingAssets.push(`${article.id}: ${roles.thumbnail.thumbnail}`);
      }
    }
    if (article.ogp !== roles.ogp) {
      article.ogp = roles.ogp;
      changedManifest = true;
    }
    if (DEDICATED_OGP_IDS.has(article.id)) dedicatedOgp += 1;
    if (checkAssets && !fs.existsSync(assetAbsolutePath(rootDir, roles.ogp))) {
      missingAssets.push(`${article.id}: ${roles.ogp}`);
    }
  }

  if (missingAssets.length && checkAssets) {
    throw new Error(`記事画像が未配置です:\n${missingAssets.join('\n')}`);
  }

  for (const plan of plans) {
    const { article, absolutePath, before, roles, publicOgp } = plan;
    if (roles.thumbnail) {
      article.thumbnail = roles.thumbnail.thumbnail;
      article.thumbnailKind = roles.thumbnail.thumbnailKind;
    }
    article.ogp = roles.ogp;
    let after = before;
    after = setMetaContent(after, 'property', 'og:image', publicOgp);
    after = setMetaContent(after, 'property', 'og:image:type', 'image/jpeg');
    after = setMetaContent(after, 'name', 'twitter:image', publicOgp);
    after = updateJsonLdArticleImage(after, publicOgp);
    if (after !== before) {
      fs.writeFileSync(absolutePath, after, 'utf8');
      changedHtml += 1;
    }
  }
  const next = JSON.stringify(nextManifest, null, 2) + '\n';
  const previous = fs.readFileSync(manifestPath, 'utf8');
  if (next !== previous) {
    fs.writeFileSync(manifestPath, next, 'utf8');
    changedManifest = true;
  }
  return {
    checked: nextManifest.length,
    changedManifest,
    changedHtml,
    gameThumbnails,
    genericThumbnails,
    dedicatedOgp,
    missingAssets
  };
}

module.exports = {
  DEDICATED_OGP_IDS,
  GENERIC_ARTICLE_IDS,
  GAME_THUMBNAILS,
  IMAGE_ASSET_CONFIG,
  expectedOgp,
  expectedThumbnail,
  publicUrlForManifestPath,
  resolveArticleImageRoles,
  syncArticleImageRoles,
  updateJsonLdArticleImage
};

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  console.log(syncArticleImageRoles(root));
}
