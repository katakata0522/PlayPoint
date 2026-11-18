'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  ORIGIN, parseAttributes, normalizeText, getImageDimensions,
  sitemapFilesFromRobots, sitemapUrls, urlToLocalHtml
} = require('./seo-head-audit.cjs');

const LOCALES = { ja: 'ja_JP', en: 'en_US', 'en-us': 'en_US', ko: 'ko_KR', 'ko-kr': 'ko_KR', 'zh-tw': 'zh_TW', 'zh-hant': 'zh_TW', 'zh-hk': 'zh_HK', 'en-in': 'en_IN' };
const BCP47_BY_LANG = { ja: 'ja', en: 'en', ko: 'ko', 'zh-tw': 'zh-TW', 'zh-hant': 'zh-TW', 'zh-hk': 'zh-HK', 'en-in': 'en-IN' };
const SITE_NAME_BY_LANG = {
  ja: 'Playポイント計算機',
  en: 'Google Play Points Calculator',
  'en-in': 'Google Play Points Calculator',
  ko: 'Google Play Points 계산기',
  'zh-tw': 'Google Play Points 計算器',
  'zh-hant': 'Google Play Points 計算器',
  'zh-hk': 'Google Play Points 計算器（香港）'
};
const INLANGUAGE_SCHEMA_TYPES = new Set([
  'WebPage', 'CollectionPage', 'ProfilePage', 'Article', 'BlogPosting', 'NewsArticle', 'WebApplication', 'SoftwareApplication', 'Blog', 'WebSite'
]);
const ARTICLE_SCHEMA_TYPES = new Set(['Article', 'BlogPosting', 'NewsArticle']);

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function enrichJsonLdHead(headHtml, bcp47Lang, canonicalUrl) {
  return headHtml.replace(/(<script\b([^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*)>)([\s\S]*?)(<\/script>)/gi, (full, open, _attrs, raw, close) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return full;
    }
    let mutated = false;
    const visit = node => {
      if (Array.isArray(node)) { node.forEach(visit); return; }
      if (!node || typeof node !== 'object') return;
      const types = [].concat(node['@type'] || []);
      if (bcp47Lang && types.some(t => INLANGUAGE_SCHEMA_TYPES.has(t)) && node.inLanguage === undefined) {
        node.inLanguage = bcp47Lang;
        mutated = true;
      }
      if (canonicalUrl && types.some(t => ARTICLE_SCHEMA_TYPES.has(t)) && node.mainEntityOfPage === undefined) {
        node.mainEntityOfPage = { '@type': 'WebPage', '@id': canonicalUrl };
        mutated = true;
      }
      Object.values(node).forEach(visit);
    };
    visit(data);
    return mutated ? `${open}${JSON.stringify(data).replaceAll('<', '\\u003c')}${close}` : full;
  });
}

// 各生成元が選んだ画像・見出しを保持し、共通の補助タグだけを最後に整える。
function completeHeadOgp(html, rootDir, imageCache = new Map()) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  if (!head) throw new Error('OGPの生成対象にheadがありません');
  const tags = [...head[1].matchAll(/<meta\b[^>]*>/gi)].map(match => ({ raw: match[0], attrs: parseAttributes(match[0]) }));
  const linkTags = [...head[1].matchAll(/<link\b[^>]*>/gi)].map(match => parseAttributes(match[0]));
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
  const bcp47Lang = BCP47_BY_LANG[lang];
  const title = value('og:title') || normalizeText(head[1].match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  if (!title) throw new Error('共有画像の代替説明を生成できません');
  const ogDesc = value('og:description');
  const metaDesc = value('description', 'name');
  const ogAlt = value('og:image:alt') || title;
  const twDesc = value('twitter:description', 'name') || ogDesc || metaDesc;
  const canonicalUrl = linkTags.find(attrs => String(attrs.rel || '').toLowerCase().split(/\s+/).includes('canonical'))?.href || value('og:url');
  const existingRobots = value('robots', 'name');
  const nextRobots = !existingRobots
    ? 'index, follow, max-image-preview:large'
    : (/(?:^|,)\s*noindex\b/i.test(existingRobots) || /(?:^|,)\s*max-image-preview\s*:\s*large\s*(?:,|$)/i.test(existingRobots))
      ? existingRobots
      : `${existingRobots}, max-image-preview:large`;
  const updates = [
    ['name', 'robots', nextRobots],
    ['property', 'og:site_name', value('og:site_name') || SITE_NAME_BY_LANG[lang]],
    ['property', 'og:image:width', String(metadata.width)],
    ['property', 'og:image:height', String(metadata.height)],
    ['property', 'og:image:alt', ogAlt],
    ['property', 'og:image:type', metadata.mime],
    ['property', 'og:locale', locale],
    ['name', 'twitter:title', value('twitter:title', 'name') || title],
    ...(twDesc ? [['name', 'twitter:description', twDesc]] : []),
    ['name', 'twitter:image', image],
    ['name', 'twitter:image:alt', value('twitter:image:alt', 'name') || ogAlt]
  ];
  let output = head[1];
  const missingOgp = [];
  let missingRobots = '';
  for (const [attribute, key, content] of updates) {
    const matches = tags.filter(({ attrs }) => (attrs[attribute] || '').toLowerCase() === key);
    if (matches.length > 1) throw new Error(`${key}が重複しています`);
    const replacement = `<meta ${attribute}="${key}" content="${escapeAttribute(content)}">`;
    if (matches.length) {
      if (normalizeText(matches[0].attrs.content) !== normalizeText(content)) {
        output = output.replace(matches[0].raw, () => replacement);
      }
    }
    else if (attribute === 'name' && key === 'robots') missingRobots = replacement;
    else missingOgp.push(replacement);
  }
  if (missingRobots) {
    const titleTag = output.match(/<title\b[^>]*>[\s\S]*?<\/title>/i);
    if (titleTag) output = output.replace(titleTag[0], () => `${missingRobots}\n    ${titleTag[0]}`);
    else missingOgp.unshift(missingRobots);
  }
  if (missingOgp.length) {
    const imageTag = tags.find(({ attrs }) => (attrs.property || '').toLowerCase() === 'og:image');
    output = output.replace(imageTag.raw, () => imageTag.raw + '\n    ' + missingOgp.join('\n    '));
  }

  // hreflang の定義に一致する og:locale:alternate を同期する（重複回避のため既存タグを再生成）。
  output = output.replace(/^[\t ]*<meta\b[^>]*property=["']og:locale:alternate["'][^>]*>\r?\n?/gim, '');
  output = output.replace(/<meta\b[^>]*property=["']og:locale:alternate["'][^>]*>/gi, '');
  const altLocales = [...new Set(
    linkTags
      .filter(attrs => String(attrs.rel || '').toLowerCase().split(/\s+/).includes('alternate') && attrs.hreflang)
      .map(attrs => LOCALES[String(attrs.hreflang).toLowerCase()])
      .filter(code => code && code !== locale)
  )];
  if (altLocales.length > 0) {
    const ogLocaleTag = output.match(/<meta\b[^>]*property=["']og:locale["'][^>]*>/i);
    if (ogLocaleTag) {
      output = output.replace(
        ogLocaleTag[0],
        () => ogLocaleTag[0] + '\n    ' + altLocales.map(code => `<meta property="og:locale:alternate" content="${code}">`).join('\n    ')
      );
    }
  }

  output = enrichJsonLdHead(output, bcp47Lang, canonicalUrl);
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
