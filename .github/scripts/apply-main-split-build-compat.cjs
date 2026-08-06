'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const relativePath = 'scripts/asset-sync.cjs';
const absolutePath = path.join(root, relativePath);
let content = fs.readFileSync(absolutePath, 'utf8');

const before = `function syncServiceWorkerRegistration(rootDir) {
  const mainJsPath = path.join(rootDir, 'js/main.js');
  if (!fs.existsSync(mainJsPath)) return;

  const currentContent = fs.readFileSync(mainJsPath, 'utf8');
  if (currentContent.includes("updateViaCache: 'none'")) return;

  const oldRegistration = \`navigator.serviceWorker.register(swPath)\\n                    .then(reg => console.log('ServiceWorker registered successfully:', reg.scope))\`;
  const newRegistration = \`navigator.serviceWorker.register(swPath, { updateViaCache: 'none' })\\n                    .then((reg) => {\\n                        console.log('ServiceWorker registered successfully:', reg.scope);\\n                        void reg.update().catch(err => console.warn('ServiceWorker update check failed:', err));\\n                    })\`;
  const updatedContent = currentContent.replace(oldRegistration, newRegistration);

  if (updatedContent === currentContent) {
    throw new Error('Service Worker登録処理を更新できませんでした。');
  }

  fs.writeFileSync(mainJsPath, updatedContent, 'utf8');
  console.log('Enabled immediate Service Worker update checks.');
}`;

const after = `function syncServiceWorkerRegistration(rootDir) {
  const candidatePaths = [
    'js/service-worker-registration.js',
    'js/main.js'
  ];
  const targetRelativePath = candidatePaths.find((candidate) => {
    const candidatePath = path.join(rootDir, candidate);
    return fs.existsSync(candidatePath)
      && fs.readFileSync(candidatePath, 'utf8').includes('navigator.serviceWorker.register');
  });
  if (!targetRelativePath) return;

  const targetPath = path.join(rootDir, targetRelativePath);
  const currentContent = fs.readFileSync(targetPath, 'utf8');
  if (currentContent.includes("updateViaCache: 'none'")) return;

  const oldRegistration = \`navigator.serviceWorker.register(swPath)\\n                    .then(reg => console.log('ServiceWorker registered successfully:', reg.scope))\`;
  const newRegistration = \`navigator.serviceWorker.register(swPath, { updateViaCache: 'none' })\\n                    .then((reg) => {\\n                        console.log('ServiceWorker registered successfully:', reg.scope);\\n                        void reg.update().catch(err => console.warn('ServiceWorker update check failed:', err));\\n                    })\`;
  const updatedContent = currentContent.replace(oldRegistration, newRegistration);

  if (updatedContent === currentContent) {
    throw new Error(\`Service Worker登録処理を更新できませんでした: \${targetRelativePath}\`);
  }

  fs.writeFileSync(targetPath, updatedContent, 'utf8');
  console.log(\`Enabled immediate Service Worker update checks in \${targetRelativePath}.\`);
}`;

const index = content.indexOf(before);
if (index < 0) throw new Error('syncServiceWorkerRegistrationの既存実装が見つかりません。');
if (content.indexOf(before, index + before.length) >= 0) {
  throw new Error('syncServiceWorkerRegistrationの既存実装が複数あります。');
}

content = content.slice(0, index) + after + content.slice(index + before.length);
fs.writeFileSync(absolutePath, content, 'utf8');
console.log('asset-sync now supports extracted Service Worker registration');
