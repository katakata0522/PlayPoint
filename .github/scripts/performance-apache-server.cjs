'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const binary = process.env.APACHE_BIN || '/usr/sbin/apache2';
const modules = process.env.APACHE_MODULE_DIR || '/usr/lib/apache2/modules';
const port = Number(process.env.PERFORMANCE_APACHE_PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PERFORMANCE_APACHE_PORT');

const directory = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'playpoint-performance-apache');
fs.rmSync(directory, { recursive: true, force: true });
fs.mkdirSync(directory, { recursive: true, mode: 0o755 });

const cert = path.join(directory, 'cert.pem');
const key = path.join(directory, 'key.pem');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert,
  '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost'],
{ stdio: 'ignore', timeout: 10000 });

const uid = process.getuid();
const gid = process.getgid();
const q = value => '"' + value.replaceAll('\\', '/').replaceAll('"', '\\"') + '"';
const moduleNames = [
  'mpm_event', 'authz_core', 'mime', 'dir', 'headers', 'expires',
  'rewrite', 'filter', 'deflate', 'ssl', 'socache_shmcb'
];

const configuration = [
  `ServerRoot ${q(directory)}`,
  `DefaultRuntimeDir ${q(directory)}`,
  `Listen 127.0.0.1:${port}`,
  'ServerName playpoint-sim.com',
  `PidFile ${q(path.join(directory, 'httpd.pid'))}`,
  `ErrorLog ${q(path.join(directory, 'error.log'))}`,
  'LogLevel warn',
  ...moduleNames.map(name => `LoadModule ${name}_module ${q(path.join(modules, `mod_${name}.so`))}`),
  `User #${uid === 0 ? 65534 : uid}`,
  `Group #${uid === 0 ? 65534 : gid}`,
  'TypesConfig /etc/mime.types',
  'AddType application/javascript .js .mjs',
  'DirectoryIndex index.html',
  `DocumentRoot ${q(root)}`,
  `<Directory ${q(root)}>`,
  'Options FollowSymLinks',
  'AllowOverride All',
  'Require all granted',
  '</Directory>',
  'SSLEngine on',
  `SSLCertificateFile ${q(cert)}`,
  `SSLCertificateKeyFile ${q(key)}`
].join('\n') + '\n';

const configFile = path.join(directory, 'httpd.conf');
fs.writeFileSync(configFile, configuration);
execFileSync(binary, ['-t', '-f', configFile], { timeout: 5000, stdio: 'pipe' });

const child = spawn(binary, ['-X', '-f', configFile], { stdio: ['ignore', 'inherit', 'inherit'] });
console.log(`Performance Apache started at https://127.0.0.1:${port} using repository .htaccess`);

const stop = signal => {
  if (child.exitCode === null) child.kill(signal);
};
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
