'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const articlesDir = path.join(root, 'articles');
const ogpDir = path.join(articlesDir, 'ogp');

function getImageDimensions(buffer) {
  if (!buffer || buffer.length < 24) return null;
  if (buffer.subarray(1, 4).toString('ascii') === 'PNG') {
    return {
      type: 'png',
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let i = 2;
    while (i < buffer.length) {
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
      i += 2 + len;
    }
  }
  return null;
}

test('全64記事は重複のない専用OGP画像URLを持ち、共通ogp.pngを使用しない', () => {
  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.html'));
  assert.equal(files.length, 64, 'articles/ に全64記事が存在すること');

  const ogImages = new Map();
  for (const file of files) {
    const html = fs.readFileSync(path.join(articlesDir, file), 'utf8');
    const ogMatch = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
    assert.ok(ogMatch, `${file} に og:image が存在すること`);

    const ogUrl = ogMatch[1];
    assert.notEqual(ogUrl, 'https://playpoint-sim.com/ogp.png', `${file} がシミュレーター共通 ogp.png を使用していないこと`);
    assert.match(ogUrl, /^https:\/\/playpoint-sim\.com\/articles\/ogp\/[^/]+\.png$/, `${file} の OGP URL が正規形式であること`);

    if (ogImages.has(ogUrl)) {
      assert.fail(`重複OGP画像検出: ${ogUrl} (使用: ${ogImages.get(ogUrl)} と ${file})`);
    }
    ogImages.set(ogUrl, file);
  }

  assert.equal(ogImages.size, 64, '全64記事がそれぞれ一意なOGP画像を持つこと');
});

test('全64記事のHTMLは1200x630規格・alt・MIME型・locale・Twitterタグを完備する', () => {
  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.html'));

  for (const file of files) {
    const html = fs.readFileSync(path.join(articlesDir, file), 'utf8');
    assert.match(html, /<meta property=["']og:image:width["'] content=["']1200["']\s*\/?>/, `${file} に og:image:width="1200" があること`);
    assert.match(html, /<meta property=["']og:image:height["'] content=["']630["']\s*\/?>/, `${file} に og:image:height="630" があること`);
    assert.match(html, /<meta property=["']og:image:type["'] content=["']image\/jpeg["']\s*\/?>/, `${file} に og:image:type="image/jpeg" があること`);
    assert.match(html, /<meta property=["']og:locale["'] content=["']ja_JP["']\s*\/?>/, `${file} に og:locale="ja_JP" があること`);
    assert.match(html, /<meta property=["']og:image:alt["'] content=["'][^"']+["']\s*\/?>/, `${file} に 空でない og:image:alt があること`);
    assert.match(html, /<meta name=["']twitter:card["'] content=["']summary_large_image["']\s*\/?>/, `${file} に twitter:card があること`);

    const ogImg = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i)[1];
    const twImg = html.match(/<meta name=["']twitter:image["'] content=["']([^"']+)["']/i)?.[1];
    assert.equal(twImg, ogImg, `${file} の twitter:image が og:image と一致すること`);
  }
});

test('articles/ogp/ 内の全PNG画像は1200x630のJPEG実体である', () => {
  const files = fs.readdirSync(ogpDir).filter(f => f.endsWith('.png'));
  assert.ok(files.length >= 64, 'articles/ogp/ に64枚以上の画像が存在すること');

  for (const file of files) {
    const buf = fs.readFileSync(path.join(ogpDir, file));
    const dim = getImageDimensions(buf);
    assert.ok(dim, `${file} の画像形式が解析可能であること`);
    assert.equal(dim.type, 'jpeg', `${file} がJPEG実体であること（.htaccess ForceType image/jpeg に準拠）`);
    assert.equal(dim.width, 1200, `${file} の幅が1200pxであること`);
    assert.equal(dim.height, 630, `${file} の高さが630pxであること`);
  }
});

test('共通ページは1200x630のogp.pngと統一メタタグを持つ', () => {
  const commonPages = [
    'index.html', 'about-playpoints.html', 'attention.html', 'changelog.html',
    'embed.html', 'info.html', 'privacy.html', 'terms.html', 'sitemap.html',
    'author/katakata.html', 'blog/index.html'
  ];

  for (const file of commonPages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /<meta property=["']og:image["'] content=["']https:\/\/playpoint-sim\.com\/ogp\.png["']\s*\/?>/, `${file} に og:image があること`);
    assert.match(html, /<meta property=["']og:image:width["'] content=["']1200["']\s*\/?>/, `${file} に og:image:width="1200" があること`);
    assert.match(html, /<meta property=["']og:image:height["'] content=["']630["']\s*\/?>/, `${file} に og:image:height="630" があること`);
    assert.match(html, /<meta property=["']og:image:type["'] content=["']image\/png["']\s*\/?>/, `${file} に og:image:type="image/png" があること`);
    assert.match(html, /<meta property=["']og:locale["'] content=["']ja_JP["']\s*\/?>/, `${file} に og:locale="ja_JP" があること`);
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
