'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const https = require('node:https');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const { createHash, randomBytes } = require('node:crypto');
const { cacheCases, verifyHttpCache } = require('../../.github/scripts/http-cache-contract.cjs');
const { wait } = require('../../.github/scripts/http-check-utils.cjs');

// Apache依存の統合検査はPR Gateで実行する。通常のNodeテストへOS依存を持ち込まない。
// 本番設定をそのまま隔離サーバーへ渡す。設定順序・条件・Rewrite/TLSをJSで模倣しない。
async function assertCacheContract(source, { outputFile = '' } = {}) {
  assert.equal(process.platform, 'linux', 'Apache integration requires the Linux CI runtime (not a skipped test)');
  const binary = process.env.APACHE_BIN || '/usr/sbin/apache2';
  const modules = process.env.APACHE_MODULE_DIR || '/usr/lib/apache2/modules';
  const version = execFileSync(binary, ['-v'], { encoding: 'utf8', timeout: 5000 });
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-apache-'));
  let child;
  let exited;
  try {
    fs.chmodSync(directory, 0o755);
    const root = path.join(directory, 'public');
    fs.mkdirSync(root, { mode: 0o755 });
    fs.writeFileSync(path.join(root, '.htaccess'), source);
    const paths = new Set(cacheCases({ fixture: true }).filter(item => item.status === 200).map(item => new URL(item.path, 'https://localhost').pathname));
    for (let pathname of paths) {
      if (pathname.endsWith('/')) pathname += 'index.html';
      const target = path.join(root, pathname.slice(1));
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
      fs.writeFileSync(target, `fixture:${pathname}\n`);
    }
    const cert = path.join(directory, 'cert.pem');
    const key = path.join(directory, 'key.pem');
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert,
      '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost'], { stdio: 'ignore', timeout: 10000 });
    const reservation = net.createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));
    const uid = process.getuid();
    const gid = process.getgid();
    const q = value => '"' + value.replaceAll('\\', '/').replaceAll('"', '\\"') + '"';
    const moduleNames = ['mpm_event', 'authz_core', 'authn_core', 'authn_file', 'authz_user', 'auth_basic', 'mime', 'dir', 'headers', 'expires', 'rewrite', 'setenvif', 'ssl', 'socache_shmcb'];
    const configuration = [
      `ServerRoot ${q(directory)}`, `DefaultRuntimeDir ${q(directory)}`, `Listen 127.0.0.1:${port}`, 'ServerName playpoint-sim.com',
      `PidFile ${q(path.join(directory, 'httpd.pid'))}`, `ErrorLog ${q(path.join(directory, 'error.log'))}`,
      ...moduleNames.map(name => `LoadModule ${name}_module ${q(path.join(modules, `mod_${name}.so`))}`),
      `User #${uid === 0 ? 65534 : uid}`, `Group #${uid === 0 ? 65534 : gid}`,
      'TypesConfig /etc/mime.types', 'AddType application/javascript .js .mjs', 'DirectoryIndex index.html',
      `DocumentRoot ${q(root)}`, `<Directory ${q(root)}>`, 'Options FollowSymLinks', 'AllowOverride All', 'Require all granted', '</Directory>',
      'SSLEngine on', `SSLCertificateFile ${q(cert)}`, `SSLCertificateKeyFile ${q(key)}`
    ].join('\n') + '\n';
    const configFile = path.join(directory, 'httpd.conf');
    fs.writeFileSync(configFile, configuration);
    execFileSync(binary, ['-t', '-f', configFile], { timeout: 5000, stdio: 'pipe' });
    child = spawn(binary, ['-X', '-f', configFile], { stdio: ['ignore', 'ignore', 'pipe'] });
    exited = once(child, 'exit');
    let stderr = '';
    child.stderr.on('data', data => { stderr += data; });
    const ca = fs.readFileSync(cert);
    const request = (url, host = 'playpoint-sim.com', extraHeaders = {}) => new Promise((resolve, reject) => {
      const req = https.get(url, { ca, servername: 'localhost', headers: { Host: host, ...extraHeaders } }, response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', data => { body += data; });
        response.on('error', reject);
        response.on('end', () => {
          const headers = new Headers();
          for (let i = 0; i < response.rawHeaders.length; i += 2) headers.append(response.rawHeaders[i], response.rawHeaders[i + 1]);
          resolve({ status: response.statusCode, headers, body });
        });
      });
      const timer = setTimeout(() => req.destroy(new Error('Apache fixture HTTP timeout')), 5000);
      req.once('close', () => clearTimeout(timer));
      req.once('error', reject);
    });
    const baseUrl = `https://127.0.0.1:${port}`;
    let ready = false;
    for (let i = 0; i < 80; i += 1) {
      if (child.exitCode !== null) throw new Error(`Apache exited: ${stderr}`);
      try { await request(new URL('/sw.js', baseUrl)); ready = true; break; } catch { await wait(50); }
    }
    assert.ok(ready, 'Apache fixture did not become ready');
    console.log(version.trim());
    const report = await verifyHttpCache({ baseUrl, fixture: true, request, outputFile, attempts: 1,
      fixtureRuntime: { apache: version.trim(), htaccessSha256: createHash('sha256').update(source).digest('hex'), tlsVerification: 'fixture CA; system trust unchanged' } });
    // stgだけの静的アセットは親のBasicを継承し、成功した指紋ファイルだけをprivate保存する。
    const blogBuild = path.join(directory, 'blog-build');
    execFileSync(process.execPath, [path.join(__dirname, '../../tools/wordpress/build-blog-staging.mjs'), blogBuild], { encoding: 'utf8', timeout: 15000 });
    const blogManifest = JSON.parse(fs.readFileSync(path.join(blogBuild, 'blog-build.json'), 'utf8'));
    const privateRoot = path.join(root, '__wp-catalog-stg');
    const staticRoot = path.join(privateRoot, 'assets', 'wp-catalog');
    fs.mkdirSync(staticRoot, { recursive: true, mode: 0o755 });
    const password = randomBytes(32).toString('hex');
    const passwordFile = path.join(directory, 'blog-fixture.htpasswd');
    execFileSync('htpasswd', ['-B', '-C', '10', '-c', '-i', passwordFile, 'fixture-user'], {
      input: password + '\n', encoding: 'utf8', stdio: ['pipe', 'ignore', 'pipe'], timeout: 10000
    });
    fs.chmodSync(passwordFile, 0o644);
    assert.match(fs.readFileSync(passwordFile, 'utf8'), /^fixture-user:\$2[aby]\$10\$/);
    const inheritedCsp = "default-src 'self'; script-src 'self'; style-src 'self'";
    fs.writeFileSync(path.join(privateRoot, '.htaccess'), [
      'AuthType Basic', 'AuthName "Blog fixture"', 'AuthUserFile ' + q(passwordFile), 'Require valid-user',
      'Header always set Cache-Control "private, no-store"',
      'Header always set Content-Security-Policy "' + inheritedCsp + '"'
    ].join('\n') + '\n');
    fs.cpSync(path.join(blogBuild, 'assets', 'wp-catalog'), staticRoot, { recursive: true });
    const auth = { Authorization: 'Basic ' + Buffer.from('fixture-user:' + password).toString('base64') };
    const asset = blogManifest.assets.find(entry => entry.name.endsWith('.js'));
    const assetUrl = new URL('/__wp-catalog-stg' + asset.url, baseUrl);
    const unauthenticated = await request(assetUrl);
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.headers.get('cache-control'), 'private, no-store');
    const validAsset = await request(assetUrl, 'playpoint-sim.com', auth);
    assert.equal(validAsset.status, 200);
    assert.equal(validAsset.headers.get('cache-control'), 'private, max-age=31536000, immutable');
    assert.equal(validAsset.headers.get('content-security-policy'), inheritedCsp, 'asset headers preserve parent CSP');
    assert.match(validAsset.headers.get('content-type'), /javascript/);
    assert.equal(createHash('sha256').update(validAsset.body).digest('hex'), asset.sha256);
    const etag = validAsset.headers.get('etag'); assert.ok(etag, 'static asset validator');
    const notModified = await request(assetUrl, 'playpoint-sim.com', { ...auth, 'If-None-Match': etag });
    assert.equal(notModified.status, 304);
    assert.equal(notModified.headers.get('cache-control'), 'private, max-age=31536000, immutable');
    const missingAsset = await request(new URL('/__wp-catalog-stg/assets/wp-catalog/missing.' + '0'.repeat(20) + '.js', baseUrl), 'playpoint-sim.com', auth);
    assert.equal(missingAsset.status, 404);
    assert.equal(missingAsset.headers.get('cache-control'), 'private, no-store');
    report.wordpressBlogAssets = { passed: true, basicAuthenticationInherited: true, parentCspUnchanged: true, privateImmutable200: true, privateImmutable304: true, unauthorized401NoStore: true, missing404NoStore: true, assetSha256Matched: true };
    if (outputFile) fs.writeFileSync(outputFile, JSON.stringify(report, null, 2) + '\n');
    console.log('Apache staging blog static assets/authentication/cache: passed');
    if (source.includes('# BEGIN PlayPoint one-article WordPress pilot')) {
      // 実Apacheで目印OFF→ON→OFFを確認する。PHP自体の実行は別の実WP検証が担当する。
      const cms = path.join(root, 'cms');
      fs.mkdirSync(cms, { recursive: true, mode: 0o755 });
      const cmsConfig = fs.readFileSync(path.join(__dirname, '../../.github/fixtures/wordpress-cms.htaccess'), 'utf8');
      fs.writeFileSync(path.join(cms, '.htaccess'), cmsConfig);
      fs.writeFileSync(path.join(cms, 'index.php'), 'wordpress-fixture\n');
      fs.writeFileSync(path.join(cms, 'wp-login.php'), 'private-login-fixture\n');
      const article = '/articles/2026-10-13-play-fest-deals.html';
      fs.mkdirSync(path.join(root, 'articles'), { recursive: true, mode: 0o755 });
      fs.writeFileSync(path.join(root, article.slice(1)), 'static-article-fixture\n');
      fs.writeFileSync(path.join(root, 'articles/other.html'), 'other-article-fixture\n');
      const get = pathname => request(new URL(pathname, baseUrl));
      const off = await get(article + '?source=check');
      assert.equal(off.status, 200); assert.equal(off.body, 'static-article-fixture\n');
      const marker = path.join(cms, '.playpoint-fest-enabled');
      fs.writeFileSync(marker, '');
      const on = await get(article + '?source=check');
      assert.equal(on.status, 200); assert.equal(on.body, 'wordpress-fixture\n');
      assert.equal(on.headers.get('location'), null);
      assert.equal(on.headers.get('x-robots-tag'), null, '公開記事へCMSのnoindexを漏らさない');
      assert.ok(!(on.headers.get('vary') || '').includes('*'), '公開記事へCMSの保存拒否を漏らさない');
      const other = await get('/articles/other.html');
      assert.equal(other.body, 'other-article-fixture\n');
      assert.equal((await request(new URL(article, baseUrl), 'stg.playpoint-sim.com')).body, 'static-article-fixture\n');
      const login = await get('/cms/wp-login.php');
      assert.equal(login.status, 200); assert.match(login.headers.get('x-robots-tag'), /noindex/);
      assert.ok((login.headers.get('vary') || '').split(',').some(v => v.trim() === '*'));
      // PHP/DBに依存しない切り戻しを、転送先ファイルが故障した条件でも検証する。
      fs.renameSync(path.join(cms, 'index.php'), path.join(cms, 'index.php.off'));
      const broken = await get(article); assert.notEqual(broken.status, 200);
      fs.renameSync(marker, marker + '.off');
      const restored = await get(article);
      assert.equal(restored.status, 200); assert.equal(restored.body, off.body);
      report.wordpressPilot = { passed: true, offOnOff: true, sameUrlNoRedirect: true, unrelatedPathAndHostPreserved: true, publicNoindexAbsent: true, privateLoginNoindexAndVary: true, rollbackWithoutPhp: true, cmsHtaccessSha256: createHash('sha256').update(cmsConfig).digest('hex') };
      if (outputFile) {
        fs.mkdirSync(path.dirname(outputFile), {recursive: true});
        fs.writeFileSync(outputFile, JSON.stringify(report, null, 2) + '\n');
      }
      console.log('Apache one-article routing and private CMS headers: passed');
    }
    console.log(`Apache HTTPS cache contract: ${report.observations.length}/${report.observations.length} passed`);
    return report;
  } catch (error) {
    const log = path.join(directory, 'error.log');
    if (outputFile && fs.existsSync(log)) {
      fs.mkdirSync(path.dirname(outputFile), { recursive: true });
      fs.copyFileSync(log, outputFile + '.apache.log');
    }
    throw error;
  } finally {
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
      await exited;
      clearTimeout(timer);
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  const outputFile = process.argv[2] || path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'playpoint-ci-evidence', 'apache-cache-http.json');
  assertCacheContract(fs.readFileSync(path.join(root, '.htaccess'), 'utf8'), { outputFile }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
module.exports = { assertCacheContract };
