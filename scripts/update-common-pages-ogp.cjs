'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  ORIGIN, parseAttributes, normalizeText, getImageDimensions,
  sitemapFilesFromRobots, sitemapUrls, urlToLocalHtml
} = require('./seo-head-audit.cjs');

const LOCALES = { ja: 'ja_JP', en: 'en_US', ko: 'ko_KR', 'zh-tw': 'zh_TW', 'zh-hant': 'zh_TW', 'zh-hk': 'zh_HK', 'en-in': 'en_IN' };

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 各生成元が選んだ画像・見出しを保持し、共通の補助タグだけを最後に整える。
function completeHeadOgp(html, rootDir, imageCache = new Map()) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  if (!head) throw new Error('OGPの生成対象にheadがありません');
  const tags = [...head[1].matchAll(/<meta\b[^>]*>/gi)].map(match => ({ raw: match[0], attrs: parseAttributes(match[0]) }));
  const value = (key, attr = 'property') => {
    const matches = tags.filter(({ attrs }) => (attrs[attr] || '').toLowerCase() === key);
    if (matches.length > 1) throw new Error(`${key}が重複しています`);
    return matches.length ? normalizeText(matches[0].attrs.content) : '';
  };
  const image = value('og:image');
  // 画像の欠落を共通画像への置換で隠さない。専用画像の選定は元の生成責務。
  if (!image) throw new Error('og:imageがありません');
  const imageUrl = new URL(image);
  if (imageUrl.origin !== ORIGIN) throw new Error(`共有画像の実体を検証できません: ${image}`);
  const relative = decodeURIComponent(imageUrl.pathname).replace(/^\//, '');
  const file = path.resolve(rootDir, relative);
  if (!file.startsWith(path.resolve(rootDir) + path.sep)) throw new Error('共有画像のパスが公開root外です');
  let metadata = imageCache.get(file);
  if (!metadata) {
    const bytes = fs.readFileSync(file);
    const dimensions = getImageDimensions(bytes);
    if (!dimensions || dimensions.width !== 1200 || dimensions.height !== 630) {
      throw new Error(`共有画像は1200×630である必要があります: ${relative}`);
    }
    const mime = bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg' : 'image/png';
    metadata = { ...dimensions, mime };
    imageCache.set(file, metadata);
  }
  const lang = (parseAttributes(html.match(/<html\b[^>]*>/i)?.[0] || '').lang || '').toLowerCase();
  const locale = LOCALES[lang];
  if (!locale) throw new Error(`未対応の共有言語: ${lang}`);
  const title = value('og:title') || normalizeText(head[1].match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  if (!title) throw new Error('共有画像の代替説明を生成できません');
  const updates = [
    ['property', 'og:image:width', String(metadata.width)],
    ['property', 'og:image:height', String(metadata.height)],
    ['property', 'og:image:alt', value('og:image:alt') || title],
    ['property', 'og:image:type', metadata.mime],
    ['property', 'og:locale', locale],
    ['name', 'twitter:image', image]
  ];
  let output = head[1];
  const missing = [];
  for (const [attribute, key, content] of updates) {
    const matches = tags.filter(({ attrs }) => (attrs[attribute] || '').toLowerCase() === key);
    if (matches.length > 1) throw new Error(`${key}が重複しています`);
    const replacement = `<meta ${attribute}="${key}" content="${escapeAttribute(content)}">`;
    if (matches.length) output = output.replace(matches[0].raw, () => replacement);
    else missing.push(replacement);
  }
  if (missing.length) {
    const imageTag = tags.find(({ attrs }) => (attrs.property || '').toLowerCase() === 'og:image');
    output = output.replace(imageTag.raw, () => imageTag.raw + '\n    ' + missing.join('\n    '));
  }
  return html.slice(0, head.index) + head[0].replace(head[1], () => output) + html.slice(head.index + head[0].length);
}

function syncSubmittedPageOgp(rootDir = path.resolve(__dirname, '..')) {
  const sitemaps = sitemapFilesFromRobots(rootDir);
  const urls = [...new Set(sitemaps.flatMap(file => sitemapUrls(fs.readFileSync(path.join(rootDir, file), 'utf8'))))];
  if (!urls.length) throw new Error('共有画像を検証する送信URLが0件です');
  const imageCache = new Map();
  let changed = 0;
  for (const url of urls) {
    if (new URL(url).origin !== ORIGIN) throw new Error(`対象外のサイトマップURL: ${url}`);
    const file = path.join(rootDir, urlToLocalHtml(url));
    const before = fs.readFileSync(file, 'utf8');
    const after = completeHeadOgp(before, rootDir, imageCache);
    if (before !== after) { fs.writeFileSync(file, after); changed++; }
  }
  return { checked: urls.length, changed };
}

if (require.main === module) console.log('共有画像タグの共通生成:', syncSubmittedPageOgp());
module.exports = { completeHeadOgp, syncSubmittedPageOgp };
