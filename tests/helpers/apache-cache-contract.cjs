'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const https = require('node:https');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const { createHash } = require('node:crypto');
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
    const moduleNames = ['mpm_event', 'authz_core', 'mime', 'dir', 'headers', 'expires', 'rewrite', 'ssl', 'socache_shmcb'];
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
    const request = url => new Promise((resolve, reject) => {
      const req = https.get(url, { ca, servername: 'localhost', headers: { Host: 'playpoint-sim.com' } }, response => {
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
