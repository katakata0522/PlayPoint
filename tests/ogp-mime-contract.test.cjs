'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const ogpDir = path.join(root, 'articles', 'ogp');

test('JPEG固定配信する記事OGPはJPEG実体だけを置く', () => {
  const config = fs.readFileSync(path.join(ogpDir, '.htaccess'), 'utf8');
  assert.match(config, /<FilesMatch "\\\.png\$">[\s\S]*ForceType image\/jpeg[\s\S]*<\/FilesMatch>/);

  const pngUrls = fs.readdirSync(ogpDir)
    .filter(file => file.toLowerCase().endsWith('.png'));
  assert.ok(pngUrls.length > 0, '記事OGPの互換URLがありません');

  const nonJpegFiles = pngUrls.filter(file => {
    const buffer = fs.readFileSync(path.join(ogpDir, file));
    return !(buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff);
  });

  assert.deepEqual(
    nonJpegFiles,
    [],
    'articles/ogp/*.png はHTTPで image/jpeg に固定されるため、JPEG以外の実体を追加できません'
  );
});
