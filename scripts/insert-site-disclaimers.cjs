const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const disclaimers = {
  ja: 'Google Play、Google Play ロゴ、Android は Google LLC の商標です。当サイトは個人によって運営される非公式のファンサイト・計算ツールであり、Google LLC および掲載されている各ゲームの配信元・開発会社とは一切関係ありません。',
  en: 'Google Play, the Google Play logo, and Android are trademarks of Google LLC. This website is an unofficial community calculator and guide, not affiliated with or endorsed by Google LLC or any game publishers mentioned.',
  ko: 'Google Play, Google Play 로고 및 Android는 Google LLC의 상표입니다. 본 사이트는 개인이 운영하는 비공식 계산기 및 가이드 사이트이며, Google LLC 및 각 게임 개발사/배급사와 제휴 또는 승인 관계가 없습니다.',
  tw: 'Google Play、Google Play 標誌及 Android 均為 Google LLC 的商標。本網站為非官方社群營運之計算器與攻略指南，與 Google LLC 及各遊戲開發/發行商無關。'
};

function getLocaleFromPath(relPath) {
  if (relPath.startsWith('en/')) return 'en';
  if (relPath.startsWith('ko/')) return 'ko';
  if (relPath.startsWith('tw/')) return 'tw';
  return 'ja';
}

function updateFileFooter(filePath) {
  const relPath = path.relative(root, filePath).replace(/\\/g, '/');
  if (relPath.includes('node_modules') || relPath.includes('.git') || relPath.includes('test-results')) return;
  if (!filePath.endsWith('.html')) return;
  if (relPath.includes('embed.html')) return; // ウィジェットは除外

  let content = fs.readFileSync(filePath, 'utf8');
  const loc = getLocaleFromPath(relPath);
  const text = disclaimers[loc];

  // 既存の site-footer-trademark があれば更新
  if (content.includes('class="site-footer-trademark"')) {
    content = content.replace(/<p class="site-footer-trademark">[\s\S]*?<\/p>/, `<p class="site-footer-trademark">${text}</p>`);
    fs.writeFileSync(filePath, content, 'utf8');
    return;
  }

  // <footer class="page-footer"> または <footer class="site-footer"> の内部、または </footer> 直前に挿入
  if (content.includes('class="copyright"')) {
    content = content.replace(/<p class="copyright">/, `<p class="site-footer-trademark">${text}</p>\n        <p class="copyright">`);
    fs.writeFileSync(filePath, content, 'utf8');
  } else if (content.includes('</footer>')) {
    content = content.replace('</footer>', `    <p class="site-footer-trademark">${text}</p>\n    </footer>`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function walkDir(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') walkDir(full);
    } else if (file.endsWith('.html')) {
      updateFileFooter(full);
    }
  });
}

walkDir(root);
console.log('Successfully added and synchronized Google LLC trademark disclaimers across all HTML files.');
