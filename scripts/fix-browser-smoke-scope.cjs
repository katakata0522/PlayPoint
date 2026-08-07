'use strict';

const fs = require('node:fs');
const path = require('node:path');

const filePath = path.resolve(__dirname, '..', '.github', 'scripts', 'browser-smoke.cjs');
let source = fs.readFileSync(filePath, 'utf8');

const plainSetup = `  const page = await context.newPage();\n  const browserState = observeBrowser(page, origin);\n`;
const trackedSetup = `  const page = await context.newPage();\n  const browserState = observeBrowser(page, origin);\n  const firstPartyRequests = [];\n  page.on('request', request => {\n    try {\n      const url = new URL(request.url());\n      if (url.origin === origin) firstPartyRequests.push(url.pathname);\n    } catch {}\n  });\n`;

function replaceInside(startMarker, endMarker, from, to, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`関数範囲が見つかりません: ${label}`);
  const segment = source.slice(start, end);
  if (!segment.includes(from)) throw new Error(`置換対象が見つかりません: ${label}`);
  source = source.slice(0, start) + segment.replace(from, to) + source.slice(end);
}

replaceInside(
  'async function verifyStaticPage',
  'async function verifyHydratedPage',
  trackedSetup,
  plainSetup,
  'static page request tracking removal'
);
replaceInside(
  'async function verifyHydratedPage',
  'async function verifyBlogPage',
  plainSetup,
  trackedSetup,
  'hydrated page request tracking insertion'
);

fs.writeFileSync(filePath, source, 'utf8');
console.log('Moved first-party request tracking into verifyHydratedPage.');
