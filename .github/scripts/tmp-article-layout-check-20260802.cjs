'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync, spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const outputDir = path.join(root, '.tmp-article-layout');
const port = 4173;
const origin = `http://127.0.0.1:${port}`;

const articlePaths = [
  '/articles/2026-07-31-google-play-quests.html',
  '/articles/2026-07-31-super-weekly-reward.html',
  '/en/articles/2026-06-20-discount-gift-cards.html',
  '/en/articles/google-play-points-super-weekly-reward.html',
  '/en/articles/google-play-quests.html',
  '/ko/articles/2026-06-20-discount-gift-cards.html',
  '/ko/articles/google-play-points-super-weekly-reward.html',
  '/ko/articles/google-play-quests.html',
  '/tw/articles/2026-06-20-discount-gift-cards.html',
  '/tw/articles/google-play-points-super-weekly-reward.html',
  '/tw/articles/google-play-quests.html'
];

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 }
];

function findBrowser() {
  for (const command of ['google-chrome', 'chromium', 'chromium-browser']) {
    const result = spawnSync('which', [command], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('Chrome or Chromium was not found on the runner.');
}

function waitForServer(attempt = 0) {
  return new Promise((resolve, reject) => {
    const request = http.get(`${origin}/`, response => {
      response.resume();
      if (response.statusCode && response.statusCode < 500) resolve();
      else reject(new Error(`Static server returned ${response.statusCode}`));
    });
    request.on('error', error => {
      if (attempt >= 50) reject(error);
      else setTimeout(() => waitForServer(attempt + 1).then(resolve, reject), 100);
    });
  });
}

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function slug(articlePath) {
  return articlePath.replace(/^\//, '').replace(/\.html$/, '').replace(/[^a-z0-9]+/gi, '-');
}

function writeProbe() {
  const probe = `<!doctype html>
<html><head><meta charset="utf-8"><title>pending</title><style>html,body{margin:0;padding:0}iframe{display:block;border:0}pre{white-space:pre-wrap}</style></head>
<body><iframe id="target"></iframe><pre id="result">pending</pre>
<script>
const params = new URLSearchParams(location.search);
const frame = document.getElementById('target');
const result = document.getElementById('result');
const width = Number(params.get('width'));
const height = Number(params.get('height'));
frame.style.width = width + 'px';
frame.style.height = height + 'px';
frame.src = params.get('path');
frame.addEventListener('load', () => setTimeout(() => {
  try {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    const main = doc.querySelector('main');
    const article = doc.querySelector('article.content');
    const h1 = doc.querySelector('h1');
    const rect = element => element ? element.getBoundingClientRect() : null;
    const visible = element => {
      const style = win.getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    };
    const overflowElements = [...doc.querySelectorAll('main *')]
      .filter(visible)
      .map(element => ({ element, box: element.getBoundingClientRect(), style: win.getComputedStyle(element) }))
      .filter(item => item.box.right > win.innerWidth + 2 || item.box.left < -2)
      .filter(item => item.style.position !== 'fixed')
      .slice(0, 20)
      .map(item => ({
        tag: item.element.tagName,
        className: String(item.element.className || '').slice(0, 100),
        text: String(item.element.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 100),
        left: Math.round(item.box.left),
        right: Math.round(item.box.right),
        width: Math.round(item.box.width)
      }));
    const brokenImages = [...doc.images].filter(image => image.complete && image.naturalWidth === 0).map(image => image.src);
    const mainStyle = main ? win.getComputedStyle(main) : null;
    const report = {
      path: params.get('path'),
      viewport: { width: win.innerWidth, height: win.innerHeight },
      title: doc.title,
      h1: h1 ? h1.textContent.trim() : '',
      h1Rect: rect(h1),
      mainRect: rect(main),
      articleRect: rect(article),
      documentWidth: Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth),
      bodyWidth: doc.body.scrollWidth,
      stylesheetCount: doc.styleSheets.length,
      bodyFontSize: parseFloat(win.getComputedStyle(doc.body).fontSize),
      mainBackground: mainStyle ? mainStyle.backgroundColor : '',
      overflowElements,
      brokenImages,
      internalLinks: [...doc.querySelectorAll('a[href^="/"]')].length,
      readyState: doc.readyState
    };
    result.textContent = JSON.stringify(report);
    document.title = 'done';
  } catch (error) {
    result.textContent = JSON.stringify({ error: error.stack || String(error) });
    document.title = 'error';
  }
}, 800));
</script></body></html>`;
  fs.writeFileSync(path.join(outputDir, 'probe.html'), probe, 'utf8');
}

function inspect(browser, articlePath, viewport) {
  const probeUrl = `${origin}/.tmp-article-layout/probe.html?path=${encodeURIComponent(articlePath)}&width=${viewport.width}&height=${viewport.height}`;
  const html = execFileSync(browser, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=4000',
    '--window-size=1600,1200',
    '--dump-dom',
    probeUrl
  ], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 30000 });

  const match = html.match(/<pre id="result">([\s\S]*?)<\/pre>/i);
  if (!match) throw new Error(`${articlePath} ${viewport.name}: probe result was not rendered`);
  return JSON.parse(decodeHtml(match[1]));
}

function capture(browser, articlePath, viewport) {
  const file = path.join(outputDir, `${slug(articlePath)}-${viewport.name}.png`);
  execFileSync(browser, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=2500',
    `--window-size=${viewport.width},${viewport.height}`,
    `--screenshot=${file}`,
    `${origin}${articlePath}`
  ], { stdio: 'pipe', timeout: 30000 });
}

function validate(report, viewport) {
  const issues = [];
  if (report.error) return [report.error];
  if (report.readyState !== 'complete') issues.push(`document readyState is ${report.readyState}`);
  if (!report.h1) issues.push('visible h1 is missing');
  if (!report.h1Rect || report.h1Rect.height < 20) issues.push('h1 has no usable layout box');
  if (!report.mainRect || report.mainRect.width < (viewport.width <= 500 ? 300 : 600)) issues.push(`main content is too narrow (${report.mainRect?.width || 0}px)`);
  if (report.mainRect && (report.mainRect.left < -2 || report.mainRect.right > viewport.width + 2)) issues.push('main content extends outside the viewport');
  if (!report.articleRect || report.articleRect.width < (viewport.width <= 500 ? 280 : 560)) issues.push(`article content is too narrow (${report.articleRect?.width || 0}px)`);
  if (report.documentWidth > viewport.width + 2 || report.bodyWidth > viewport.width + 2) issues.push(`horizontal page overflow (${report.documentWidth}px for ${viewport.width}px viewport)`);
  if (report.overflowElements?.length) issues.push(`overflowing elements: ${JSON.stringify(report.overflowElements)}`);
  if (report.stylesheetCount < 2) issues.push(`only ${report.stylesheetCount} stylesheet(s) loaded`);
  if (!Number.isFinite(report.bodyFontSize) || report.bodyFontSize < 14) issues.push(`body font is too small (${report.bodyFontSize}px)`);
  if (report.brokenImages?.length) issues.push(`broken images: ${report.brokenImages.join(', ')}`);
  if (!report.mainBackground || report.mainBackground === 'rgba(0, 0, 0, 0)') issues.push('main card background is transparent, suggesting article CSS did not apply');
  return issues;
}

(async () => {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  writeProbe();
  const browser = findBrowser();
  const serverLog = fs.openSync(path.join(outputDir, 'server.log'), 'w');
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root,
    stdio: ['ignore', serverLog, serverLog]
  });

  try {
    await waitForServer();
    const reports = [];
    const failures = [];
    for (const articlePath of articlePaths) {
      for (const viewport of viewports) {
        const report = inspect(browser, articlePath, viewport);
        const issues = validate(report, viewport);
        reports.push({ articlePath, viewport, report, issues });
        capture(browser, articlePath, viewport);
        if (issues.length) failures.push({ articlePath, viewport: viewport.name, issues });
        console.log(`${issues.length ? 'FAIL' : 'PASS'} ${viewport.name.padEnd(7)} ${articlePath}`);
      }
    }

    fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify({ browser, reports, failures }, null, 2)}\n`);
    fs.writeFileSync(path.join(outputDir, 'report.txt'), [
      `Browser: ${browser}`,
      `Pages checked: ${articlePaths.length}`,
      `Viewport checks: ${reports.length}`,
      `Failures: ${failures.length}`,
      '',
      ...reports.map(item => `${item.issues.length ? 'FAIL' : 'PASS'} ${item.viewport.name} ${item.articlePath}${item.issues.length ? `\n  ${item.issues.join('\n  ')}` : ''}`)
    ].join('\n'));

    if (failures.length) {
      throw new Error(`Rendered layout verification failed for ${failures.length} viewport(s). See .tmp-article-layout/report.txt`);
    }
    console.log(`Rendered layout verification passed for ${articlePaths.length} articles at mobile and desktop widths.`);
  } finally {
    server.kill('SIGTERM');
    fs.closeSync(serverLog);
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
