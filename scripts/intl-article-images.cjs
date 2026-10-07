'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { INTERNATIONAL_LOCALES } = require('./locale-ids.cjs');
const { updateJsonLdArticleImage } = require('./article-image-assets.cjs');
const { parseAttributes, normalizeText, getImageDimensions } = require('./seo-head-audit.cjs');

// 海外記事も言語・記事の組で一意の画像を持つ。HTMLの同期はブラウザ不要。
function imagePath(locale, slug) { return `articles/ogp/${locale}-${slug}.png`; }
function articleImages(root) {
  return INTERNATIONAL_LOCALES.flatMap(locale => fs.readdirSync(path.join(root, locale, 'articles'))
    .filter(file => file.endsWith('.html') && file !== 'index.html')
    .map(file => ({ locale, slug: file.slice(0, -5), file: `${locale}/articles/${file}`, image: imagePath(locale, file.slice(0, -5)) })));
}
function syncIntlArticleImages(root) {
  let changed = 0;
  for (const article of articleImages(root)) {
    const bytes = fs.readFileSync(path.join(root, article.image));
    const size = getImageDimensions(bytes);
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || size?.width !== 1200 || size?.height !== 630) throw Error('海外記事OGP規格不一致: ' + article.image);
    const file = path.join(root, article.file), before = fs.readFileSync(file, 'utf8');
    const url = 'https://playpoint-sim.com/' + article.image;
    let after = before.replace(/<meta\b[^>]*>/gi, tag => {
      const attributes = parseAttributes(tag);
      if (attributes.property !== 'og:image' && attributes.name !== 'twitter:image') return tag;
      return tag.replace(/content=(["'])[\s\S]*?\1/i, 'content="' + url + '"');
    });
    after = updateJsonLdArticleImage(after, url);
    if (after !== before) { fs.writeFileSync(file, after); changed++; }
  }
  return { checked: articleImages(root).length, changed };
}
function cardTitle(html) { return normalizeText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || ''); }
module.exports = { articleImages, cardTitle, imagePath, syncIntlArticleImages };
