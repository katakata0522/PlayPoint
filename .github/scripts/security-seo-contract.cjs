'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const ORIGIN = 'https://playpoint-sim.com';
const EXCLUDED_DIRECTORIES = new Set(['.git', '.github', 'docs', 'node_modules', 'scripts', 'tests', 'tools', 'test-results']);
const failures = [];
let htmlChecked = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function parseAttributes(tag) {
  const attrs = {};
  const pattern = /([^\s=<>\/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(pattern)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function walkHtml(currentDir = root) {
  return fs.readdirSync(currentDir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) return [];
    const absolute = path.join(currentDir, entry.name);
    if (entry.isDirectory()) return walkHtml(absolute);
    if (!entry.isFile() || !entry.name.endsWith('.html')) return [];
    return [path.relative(root, absolute).replaceAll('\\', '/')];
  });
}

function parseCsp(htaccess) {
  const match = htaccess.match(/Content-Security-Policy "([^"]+)"/);
  if (!match) {
    fail('Content-Security-Policy header is missing');
    return {};
  }
  const directives = {};
  for (const raw of match[1].split(';')) {
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;
    directives[parts[0]] = parts.slice(1);
  }
  return directives;
}

function auditHeaders() {
  const htaccess = read('.htaccess');
  const requiredHeaders = [
    [/Header always set X-Content-Type-Options "nosniff"/, 'X-Content-Type-Options: nosniff'],
    [/Header always set X-Frame-Options "SAMEORIGIN"/, 'X-Frame-Options: SAMEORIGIN'],
    [/Header always set Referrer-Policy "strict-origin-when-cross-origin"/, 'Referrer-Policy'],
    [/Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"/, 'HSTS'],
    [/Header always set Permissions-Policy "[^"]*camera=\(\)[^"]*microphone=\(\)[^"]*geolocation=\(\)[^"]*payment=\(\)[^"]*usb=\(\)[^"]*"/, 'Permissions-Policy'],
    [/Header always set X-XSS-Protection "0"/, 'X-XSS-Protection: 0'],
    [/Header always set X-Permitted-Cross-Domain-Policies "none"/, 'X-Permitted-Cross-Domain-Policies: none']
  ];
  for (const [pattern, label] of requiredHeaders) {
    if (!pattern.test(htaccess)) fail(`${label} is missing from .htaccess`);
  }

  const csp = parseCsp(htaccess);
  const requiredCsp = {
    'default-src': ["'self'"],
    'script-src-attr': ["'none'"],
    'style-src': ["'self'"],
    'font-src': ["'self'"],
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"]
  };
  for (const [directive, values] of Object.entries(requiredCsp)) {
    if (!csp[directive]) {
      fail(`CSP directive missing: ${directive}`);
      continue;
    }
    for (const value of values) {
      if (!csp[directive].includes(value)) fail(`CSP ${directive} missing ${value}`);
    }
  }
  if (!Object.prototype.hasOwnProperty.call(csp, 'upgrade-insecure-requests')) {
    fail('CSP upgrade-insecure-requests is missing');
  }

  for (const staleOrigin of ['https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
    if (htaccess.includes(staleOrigin)) fail(`unused third-party CSP origin remains: ${staleOrigin}`);
  }
}

function auditDeploymentBoundary() {
  const deploy = read('.github/scripts/deploy-rsync.sh');
  const requiredExcludes = [
    "--exclude '/.env'",
    "--exclude '/.env.*'",
    "--exclude '/*.pem'",
    "--exclude '/*.key'",
    "--exclude '/*.log'",
    "--exclude '/*.sql'",
    "--exclude '/*.bak'",
    "--exclude '/package.json'",
    "--exclude '/package-lock.json'",
    "--exclude '/pnpm-lock.yaml'",
    "--exclude '/yarn.lock'"
  ];
  for (const exclusion of requiredExcludes) {
    if (!deploy.includes(exclusion)) fail(`deployment sensitive-file exclusion missing: ${exclusion}`);
  }
  if (!deploy.includes('Sensitive or non-public server artifacts are absent.')) {
    fail('remote cleanup does not verify sensitive-file absence');
  }
}

function auditRobotsAndSitemaps() {
  const robots = read('robots.txt');
  if (/^\s*Disallow:\s*\/\s*$/mi.test(robots)) fail('robots.txt blocks the entire site');
  const sitemapUrls = [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gmi)].map(match => match[1]);
  if (sitemapUrls.length === 0) fail('robots.txt has no sitemap directives');
  if (new Set(sitemapUrls).size !== sitemapUrls.length) fail('robots.txt contains duplicate sitemap directives');

  for (const sitemapUrl of sitemapUrls) {
    let parsed;
    try {
      parsed = new URL(sitemapUrl);
    } catch {
      fail(`invalid sitemap URL in robots.txt: ${sitemapUrl}`);
      continue;
    }
    if (parsed.origin !== ORIGIN || parsed.protocol !== 'https:') {
      fail(`sitemap URL must stay on canonical HTTPS origin: ${sitemapUrl}`);
      continue;
    }
    const relative = decodeURIComponent(parsed.pathname).replace(/^\//, '');
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) {
      fail(`robots.txt references missing sitemap: ${relative}`);
      continue;
    }
    const xml = fs.readFileSync(absolute, 'utf8');
    if (!/<(?:urlset|sitemapindex)\b/i.test(xml)) fail(`invalid sitemap root element: ${relative}`);
  }
}

function auditHtmlSecurity() {
  const activeUrlAttrs = new Set(['src', 'action']);
  for (const file of walkHtml()) {
    htmlChecked += 1;
    const html = read(file).replace(/<!--[\s\S]*?-->/g, '');
    for (const match of html.matchAll(/<([a-z][a-z0-9:-]*)\b[^>]*>/gi)) {
      const tag = match[0];
      const tagName = match[1].toLowerCase();
      const attrs = parseAttributes(tag);
      const relTokens = String(attrs.rel || '').toLowerCase().split(/\s+/).filter(Boolean);

      if (String(attrs.target || '').toLowerCase() === '_blank' && !relTokens.includes('noopener')) {
        fail(`${file}: target=_blank without rel=noopener`);
      }

      for (const [name, value] of Object.entries(attrs)) {
        const normalized = String(value).trim().toLowerCase();
        if ((name === 'href' || name === 'src' || name === 'action') && normalized.startsWith('javascript:')) {
          fail(`${file}: javascript: URL in <${tagName}> ${name}`);
        }
        if (activeUrlAttrs.has(name) && /^http:\/\//i.test(String(value).trim())) {
          fail(`${file}: active mixed-content URL in <${tagName}> ${name}=${value}`);
        }
      }

      if (/^on[a-z]+$/i.test(Object.keys(attrs).find(name => /^on[a-z]+$/i.test(name)) || '')) {
        fail(`${file}: inline event handler conflicts with script-src-attr 'none'`);
      }
    }
  }
}

auditHeaders();
auditDeploymentBoundary();
auditRobotsAndSitemaps();
auditHtmlSecurity();

if (failures.length > 0) {
  console.error(`SEO/security contract audit failed (${failures.length}):`);
  failures.forEach(item => console.error(`- ${item}`));
  process.exitCode = 1;
} else {
  console.log(`SEO/security contract audit passed (${htmlChecked} public HTML files checked).`);
}
