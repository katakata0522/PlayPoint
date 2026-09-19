'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { GAME_THUMBNAIL_ASSETS } = require('./game-thumbnail-assets.cjs');

const root = path.resolve(__dirname, '..');
const outputDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, '.tmp', 'game-icons');
const MAX_BYTES = 2 * 1024 * 1024;
const USER_AGENT = 'Mozilla/5.0 (compatible; PlayPointThumbnailAudit/1.0; +https://playpoint-sim.com/)';

function decodeHtml(value) {
  return String(value || '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function extractMeta(html, key) {
  const escaped = key.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp('<meta[^>]+property=["\\\']' + escaped + '["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\']', 'i'),
    new RegExp('<meta[^>]+content=["\\\']([^"\\\']+)["\\\'][^>]+property=["\\\']' + escaped + '["\\\']', 'i')
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtml(match[1]);
  }
  return null;
}

function extensionFor(contentType, bytes) {
  const type = String(contentType || '').toLowerCase();
  if (type.includes('webp') || bytes.subarray(0, 4).toString('ascii') === 'RIFF') return 'webp';
  if (type.includes('png') || bytes.subarray(1, 4).toString('ascii') === 'PNG') return 'png';
  if (type.includes('jpeg') || type.includes('jpg') || (bytes[0] === 0xff && bytes[1] === 0xd8)) return 'jpg';
  throw new Error('Unsupported image type: ' + contentType);
}

async function fetchBuffer(url, headers = {}) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': USER_AGENT, ...headers }
  });
  if (!response.ok) throw new Error(response.status + ' ' + response.statusText + ': ' + url);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error('Unexpected image size: ' + bytes.length);
  return { response, bytes };
}

async function capture(entry) {
  const page = await fetch(entry.sourcePageUrl, {
    redirect: 'follow',
    headers: {
      'user-agent': USER_AGENT,
      'accept-language': 'ja-JP,ja;q=0.9,en;q=0.5'
    }
  });
  if (!page.ok) throw new Error(page.status + ' ' + page.statusText + ': ' + entry.sourcePageUrl);
  const html = await page.text();

  let sourceImageUrl = extractMeta(html, 'og:image');
  if (!sourceImageUrl || !/^https:\/\/play-lh\.googleusercontent\.com\//.test(sourceImageUrl)) {
    const candidates = [...html.matchAll(/https:\/\/play-lh\.googleusercontent\.com\/[A-Za-z0-9_?&=%./-]+/g)]
      .map(match => decodeHtml(match[0]));
    sourceImageUrl = candidates.find(url => !/fonts|badge/i.test(url)) || null;
  }
  if (!sourceImageUrl) throw new Error('Official icon URL not found for ' + entry.gameTitle);

  const requestedImageUrl = sourceImageUrl.replace(/=s0-br30$/, '=w128-h128');
  const { response, bytes } = await fetchBuffer(requestedImageUrl, {
    accept: 'image/png,image/jpeg,image/webp,image/*'
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error('Not an image: ' + contentType);

  const extension = extensionFor(contentType, bytes);
  const filename = entry.gameId + '.' + extension;
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, filename), bytes);

  return {
    gameId: entry.gameId,
    gameTitle: entry.gameTitle,
    rightsHolder: entry.rightsHolder,
    sourcePageUrl: entry.sourcePageUrl,
    sourceImageUrl,
    requestedImageUrl,
    file: filename,
    contentType,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex')
  };
}

(async () => {
  const manifest = [];
  for (const entry of Object.values(GAME_THUMBNAIL_ASSETS)) {
    process.stdout.write('Capture ' + entry.gameTitle + ' ... ');
    const result = await capture(entry);
    manifest.push(result);
    console.log(result.file + ' (' + result.bytes + ' bytes)');
  }
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify({
    capturedAt: new Date().toISOString(),
    assets: manifest
  }, null, 2) + '\n');
  console.log('Captured ' + manifest.length + ' official store icons.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
