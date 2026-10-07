'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { openingTags } = require('./helpers/markup-contract.cjs');
const { createHash } = require('node:crypto');
const { articleImages } = require('../scripts/intl-article-images.cjs');
const { extractArticleStructuredData } = require('../scripts/article-date-contract.cjs');
const meta = (html, key) => openingTags(html).filter(node => node.tag === 'meta' && (node.attrs.property === key || node.attrs.name === key));
const value = (html, key) => { const nodes = meta(html, key); assert.equal(nodes.length, 1, key + ': exactly one meta'); return nodes[0].attrs.content; };

const root = path.resolve(__dirname, '..');
const articlesDir = path.join(root, 'articles');
const ogpDir = path.join(articlesDir, 'ogp');
const siteOrigin = 'https://playpoint-sim.com';
const articlesManifest = JSON.parse(fs.readFileSync(path.join(root, 'blog', 'articles.json'), 'utf8'));
const manifestByFile = new Map(articlesManifest.map(article => [String(article.file || '').replace(/^\.\.\//, ''), article]));
const directArticleFiles = fs.readdirSync(articlesDir)
  .filter(file => file.endsWith('.html'))
  .sort();
const listedGameArticles = articlesManifest.filter(article => article.listed !== false && /^\.\.\/games\/[a-z0-9-]+\/[a-z0-9-]+\/index\.html$/i.test(String(article.file || '')));
const articlePages = [
  ...directArticleFiles.map(file => ({ file: `articles/${file}`, manifest: manifestByFile.get(`articles/${file}`) })),
  ...listedGameArticles.map(article => ({ file: String(article.file).replace(/^\.\.\//, ''), manifest: article }))
];

function publicManifestUrl(value) {
  return new URL(String(value || ''), `${siteOrigin}/blog/`).href;
}

function localPathForPublicUrl(value) {
  const url = new URL(value);
  assert.equal(url.origin, siteOrigin, 'OGP URLは正本サイトのURLであること');
  return path.join(root, url.pathname.replace(/^\/+/, ''));
}

function getImageDimensions(buffer) {
  if (!buffer || buffer.length < 24) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    return {
      type: 'png',
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let i = 2;
    while (i + 8 < buffer.length) {
      if (buffer[i] !== 0xFF) { i++; continue; }
      const marker = buffer[i + 1];
      if (marker === 0xC0 || marker === 0xC2) {
        return {
          type: 'jpeg',
          height: buffer.readUInt16BE(i + 5),
          width: buffer.readUInt16BE(i + 7)
        };
      }
      const len = buffer.readUInt16BE(i + 2);
      if (len < 2 || i + 2 + len > buffer.length) return null;
      i += 2 + len;
    }
  }
  return null;
}

test('日本語記事全体は一意の専用OGP画像URL・実体を持ち、manifestの画像役割と一致する', () => {
  assert.ok(directArticleFiles.length > 0, 'articles直下のHTMLが存在すること');
  assert.ok(listedGameArticles.length > 0, 'listed manifestのゲーム記事が存在すること');
  assert.equal(new Set(articlePages.map(page => page.file)).size, articlePages.length, '検査対象のページパスが重複しないこと');

  const urls = new Set();
  const images = new Map();
  for (const page of articlePages) {
    const htmlPath = path.join(root, page.file);
    assert.ok(fs.existsSync(htmlPath), page.file + ': HTMLが存在すること');
    assert.ok(page.manifest, page.file + ': blog/articles.jsonに対応する記事があること');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const url = value(html, 'og:image');
    assert.match(url, /^https:\/\/playpoint-sim\.com\/articles\/ogp\/[^/]+\.png$/, page.file);
    assert.ok(!urls.has(url), page.file + ': duplicate URL');
    urls.add(url);

    const imagePath = localPathForPublicUrl(url);
    assert.ok(fs.existsSync(imagePath), page.file + ': OGP実体が存在すること');
    const image = fs.readFileSync(imagePath);
    const hash = createHash('sha256').update(image).digest('hex');
    assert.ok(!images.has(hash), page.file + ': identical image bytes with ' + images.get(hash));
    images.set(hash, page.file);

    if (page.manifest.listed !== false) {
      assert.match(String(page.manifest.ogp || ''), /^\.\.\/articles\/ogp\/[^/]+\.png$/i, page.file + ': manifest.ogp');
      assert.equal(publicManifestUrl(page.manifest.ogp), url, page.file + ': manifest.ogpとog:imageが一致');
      assert.ok(page.manifest.thumbnail, page.file + ': manifest.thumbnailが存在すること');
      assert.notEqual(publicManifestUrl(page.manifest.thumbnail), url, page.file + ': thumbnailをOGPに流用しない');
      if (page.manifest.thumbnailKind === 'app-icon') {
        assert.match(page.manifest.thumbnail, /^\.\.\/images\/game-icons\/[a-z0-9-]+\.webp$/i, page.file + ': ゲーム一覧アイコン');
      } else if (page.manifest.thumbnailKind === 'generic') {
        assert.match(page.manifest.thumbnail, /^\.\.\/articles\/thumbnails\/[a-z0-9-]+-square-v1\.webp$/i, page.file + ': 一般記事正方形サムネイル');
      }
    }
  }
});

test('日本語記事全体はOGP・Twitterの必須タグを実metaとして持つ', () => {
  for (const page of articlePages) {
    const html = fs.readFileSync(path.join(root, page.file), 'utf8');
    for (const [key, expected] of Object.entries({ 'og:image:width': '1200', 'og:image:height': '630', 'og:image:type': 'image/jpeg', 'og:locale': 'ja_JP', 'twitter:card': 'summary_large_image' })) {
      assert.equal(value(html, key), expected, page.file + ': ' + key);
    }
    assert.ok(value(html, 'og:image:alt')?.trim(), page.file + ': image alternative text');
    assert.equal(value(html, 'twitter:image'), value(html, 'og:image'), page.file + ': Twitter image');
  }
});

test('articles/ogp/ 内の全PNG画像は1200x630のJPEG実体である', () => {
  const files = fs.readdirSync(ogpDir).filter(f => f.endsWith('.png'));
  assert.ok(files.length > 0, '記事OGPの検査対象が空でないこと');

  for (const file of files) {
    const buf = fs.readFileSync(path.join(ogpDir, file));
    const dim = getImageDimensions(buf);
    assert.ok(dim, `${file} の画像形式が解析可能であること`);
    assert.equal(dim.type, 'jpeg', `${file} がJPEG実体であること（.htaccess ForceType image/jpeg に準拠）`);
    assert.equal(dim.width, 1200, `${file} の幅が1200pxであること`);
    assert.equal(dim.height, 630, `${file} の高さが630pxであること`);
  }
});

test('共通ページは用途に合う1200x630の画像と統一メタタグを持つ', () => {
  const commonPages = [
    'index.html', 'about-playpoints.html', 'attention.html', 'changelog.html',
    'embed.html', 'info.html', 'privacy.html', 'terms.html', 'sitemap.html',
    'author/katakata.html', 'blog/index.html'
  ];

  for (const file of commonPages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const hub = file === 'blog/index.html';
    const expectedImage = hub ? 'images/guides/article-guide.jpg' : 'ogp.png';
    assert.ok(html.includes(`property="og:image" content="https://playpoint-sim.com/${expectedImage}"`), `${file} に用途に合う og:image があること`);
    assert.match(html, /<meta property=["']og:image:width["'] content=["']1200["']\s*\/?>/, `${file} に og:image:width="1200" があること`);
    assert.match(html, /<meta property=["']og:image:height["'] content=["']630["']\s*\/?>/, `${file} に og:image:height="630" があること`);
    assert.ok(html.includes(`property="og:image:type" content="image/${hub ? 'jpeg' : 'png'}"`), `${file} の画像MIMEが実体と一致すること`);
    const expectedLocale = file === 'attention.html' ? 'en_US' : 'ja_JP';
    const actualLocale = html.match(/<meta property=["']og:locale["'] content=["']([^"']+)["']/)?.[1];
    assert.equal(actualLocale, expectedLocale, `${file} の本文言語と共有言語が一致すること`);
    assert.match(html, /<meta property=["']og:image:alt["'] content=["'][^"']+["']\s*\/?>/, `${file} に og:image:alt があること`);
  }

  // root ogp.png
  const rootOgpBuf = fs.readFileSync(path.join(root, 'ogp.png'));
  const rootDim = getImageDimensions(rootOgpBuf);
  assert.ok(rootDim, 'root ogp.png の画像形式が解析可能であること');
  assert.equal(rootDim.type, 'png', 'root ogp.png がPNG実体であること');
  assert.equal(rootDim.width, 1200, 'root ogp.png の幅が1200pxであること');
  assert.equal(rootDim.height, 630, 'root ogp.png の高さが630pxであること');
});

test('海外の全個別記事も専用画像・地域メタ・Article画像が一致し、画像実体を重複しない', () => {
  const urls = new Set(), hashes = new Set();
  const locales = { en: 'en_US', ko: 'ko_KR', tw: 'zh_TW' };
  const pages = articleImages(root);
  assert.ok(pages.length > 0);
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page.file), 'utf8');
    const image = value(html, 'og:image');
    assert.equal(image, siteOrigin + '/' + page.image);
    assert.ok(!urls.has(image), page.file); urls.add(image);
    const hash = createHash('sha256').update(fs.readFileSync(localPathForPublicUrl(image))).digest('hex');
    assert.ok(!hashes.has(hash), page.file); hashes.add(hash);
    assert.equal(value(html, 'twitter:image'), image);
    assert.equal(value(html, 'og:locale'), locales[page.locale]);
    assert.equal(value(html, 'og:image:type'), 'image/jpeg');
    assert.equal(value(html, 'og:image:width'), '1200');
    assert.equal(value(html, 'og:image:height'), '630');
    assert.ok(value(html, 'og:image:alt').trim());
    assert.equal(extractArticleStructuredData(html)?.image, image, page.file);
  }
});

test('多言語トップページは1200x630のogp.pngと各言語メタタグを持つ', () => {
  const intlPages = [
    { file: 'en/index.html', locale: 'en_US' },
    { file: 'ko/index.html', locale: 'ko_KR' },
    { file: 'tw/index.html', locale: 'zh_TW' },
    { file: 'hk/index.html', locale: 'zh_HK' },
    { file: 'in/index.html', locale: 'en_IN' }
  ];

  for (const { file, locale } of intlPages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /<meta property=["']og:image["'] content=["']https:\/\/playpoint-sim\.com\/ogp\.png["']\s*\/?>/, `${file} に og:image があること`);
    assert.match(html, /<meta property=["']og:image:width["'] content=["']1200["']\s*\/?>/, `${file} に og:image:width="1200" があること`);
    assert.match(html, /<meta property=["']og:image:height["'] content=["']630["']\s*\/?>/, `${file} に og:image:height="630" があること`);
    assert.match(html, /<meta property=["']og:image:type["'] content=["']image\/png["']\s*\/?>/, `${file} に og:image:type="image/png" があること`);
    assert.match(html, new RegExp(`<meta property=["']og:locale["'] content=["']${locale}["']\\s*\\/?>`), `${file} に og:locale="${locale}" があること`);
    assert.match(html, /<meta property=["']og:image:alt["'] content=["'][^"']+["']\s*\/?>/, `${file} に 空でない og:image:alt があること`);
    assert.match(html, /<meta name=["']twitter:card["'] content=["']summary_large_image["']\s*\/?>/, `${file} に twitter:card があること`);
    assert.match(html, /<meta name=["']twitter:image["'] content=["']https:\/\/playpoint-sim\.com\/ogp\.png["']\s*\/?>/, `${file} に twitter:image があること`);
  }
});
