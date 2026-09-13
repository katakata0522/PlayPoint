'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('security headers and CSP stay fail-closed without unused third-party allowlists', () => {
  const htaccess = read('.htaccess');
  for (const required of [
    'Header always set X-Content-Type-Options "nosniff"',
    'Header always set X-Frame-Options "SAMEORIGIN"',
    'Header always set Referrer-Policy "strict-origin-when-cross-origin"',
    'Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    'Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"',
    'Header always set X-XSS-Protection "0"',
    'Header always set X-Permitted-Cross-Domain-Policies "none"',
    "script-src-attr 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    'upgrade-insecure-requests'
  ]) {
    assert.ok(htaccess.includes(required), `missing hardening contract: ${required}`);
  }
  for (const staleOrigin of ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com']) {
    assert.ok(!htaccess.includes(staleOrigin), `unused CSP origin must not return: ${staleOrigin}`);
  }
});

test('deploy mirror excludes common secret and build-management files and verifies cleanup', () => {
  const deploy = read('.github/scripts/deploy-rsync.sh');
  for (const required of [
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
  ]) {
    assert.ok(deploy.includes(required), `missing deployment exclusion: ${required}`);
  }
  assert.match(deploy, /find "\$root" -maxdepth 1 -type f/);
  assert.match(deploy, /Sensitive or non-public server artifacts are absent\./);
});

test('preflight makes the SEO/security contract a required gate', () => {
  const preflight = read('.github/scripts/preflight.cjs');
  const headAuditIndex = preflight.indexOf("runPhase('送信URLのHead監査'");
  const securityIndex = preflight.indexOf("runPhase('SEO/セキュリティ契約監査'");
  const regressionIndex = preflight.indexOf("runPhase('全回帰テスト'");
  assert.ok(headAuditIndex >= 0, 'SEO head audit missing');
  assert.ok(securityIndex > headAuditIndex, 'security contract should follow SEO head audit');
  assert.ok(regressionIndex > securityIndex, 'security contract should run before full regression suite');
  assert.ok(fs.existsSync(path.join(root, '.github/scripts/security-seo-contract.cjs')));
});

test('verified deployment requires live SEO, every submitted sitemap, and security headers', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const seoIndex = workflow.indexOf('Verify production SEO health');
  const sitemapIndex = workflow.indexOf('Verify production sitemap registry');
  const securityIndex = workflow.indexOf('Verify production security headers');
  const verifiedIndex = workflow.indexOf('Publish verified deployment status');
  assert.ok(seoIndex >= 0, 'production SEO health step missing');
  assert.ok(sitemapIndex > seoIndex, 'sitemap registry check must follow SEO health');
  assert.ok(securityIndex > sitemapIndex, 'security header check must follow sitemap registry');
  assert.ok(verifiedIndex > securityIndex, 'verified status must be published only after all live checks');
  assert.match(workflow, /node \.github\/scripts\/sitemap-health-check\.cjs/);
  assert.match(workflow, /node \.github\/scripts\/security-health-check\.cjs/);
});

test('weekly SEO health check also watches sitemap registry and security headers', () => {
  const workflow = read('.github/workflows/seo-healthcheck.yml');
  assert.match(workflow, /node \.github\/scripts\/seo-health-check\.cjs/);
  assert.match(workflow, /node \.github\/scripts\/sitemap-health-check\.cjs/);
  assert.match(workflow, /node \.github\/scripts\/security-health-check\.cjs/);
  assert.match(workflow, /node \.github\/scripts\/live-internal-link-check\.cjs/);
});

test('live hardening scripts are bounded and only target the canonical production origin', () => {
  const security = read('.github/scripts/security-health-check.cjs');
  const sitemap = read('.github/scripts/sitemap-health-check.cjs');
  for (const source of [security, sitemap]) {
    assert.match(source, /https:\/\/playpoint-sim\.com/);
    assert.match(source, /FETCH_TIMEOUT_MS = 12000/);
    assert.match(source, /MAX_ATTEMPTS = 2/);
    assert.doesNotMatch(source, /http:\/\/playpoint-sim\.com/);
  }
  assert.match(security, /['"]\/\.env['"]/);
  assert.match(security, /\/\.git\/HEAD/);
  assert.match(sitemap, /duplicate submitted URL/);
  assert.match(sitemap, /robots\.txt/);
});
