const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const footerData = {
  ja: {
    home: 'トップ計算機',
    homeUrl: '/',
    portal: 'ゲーム計算機',
    portalUrl: '/games/',
    blog: '攻略記事一覧',
    blogUrl: '/blog/',
    author: '運営者・検証方針',
    authorUrl: '/author/katakata.html',
    privacyUrl: '/privacy.html',
    termsUrl: '/terms.html',
    privacyLabel: 'プライバシーポリシー',
    termsLabel: '利用規約',
    siteName: 'PlayPoint Simulation Tool',
    disclaimer: 'Google Play、Google Play ロゴ、Android は Google LLC の商標です。当サイトは個人によって運営される非公式のファンサイト・計算ツールであり、Google LLC および掲載されている各ゲームの配信元・開発会社とは一切関係ありません。'
  },
  en: {
    home: 'Home Calculator',
    homeUrl: '/en/',
    portal: 'Game Calculators',
    portalUrl: '/en/games/',
    blog: 'Guides',
    blogUrl: '/en/articles/',
    author: 'About / Verification',
    authorUrl: '/author/katakata.html',
    privacyUrl: '/privacy.html',
    termsUrl: '/terms.html',
    privacyLabel: 'Privacy Policy (Japanese)',
    termsLabel: 'Terms of Service (Japanese)',
    siteName: 'Google Play Points Calculator',
    disclaimer: 'Google Play, the Google Play logo, and Android are trademarks of Google LLC. This website is an unofficial community calculator and guide, not affiliated with or endorsed by Google LLC or any game publishers mentioned.'
  },
  ko: {
    home: '종합 계산기',
    homeUrl: '/ko/',
    portal: '게임별 계산기',
    portalUrl: '/ko/games/',
    blog: '가이드',
    blogUrl: '/ko/articles/',
    author: '운영자 / 검증방침',
    authorUrl: '/author/katakata.html',
    privacyUrl: '/privacy.html',
    termsUrl: '/terms.html',
    privacyLabel: '개인정보처리방침 (일본어)',
    termsLabel: '이용약관 (일본어)',
    siteName: 'Google Play Points 계산기',
    disclaimer: 'Google Play, Google Play 로고 및 Android는 Google LLC의 상표입니다. 본 사이트는 개인이 운영하는 비공식 계산기 및 가이드 사이트이며, Google LLC 및 각 게임 개발사/배급사와 제휴 또는 승인 관계가 없습니다.'
  },
  tw: {
    home: '綜合計算機',
    homeUrl: '/tw/',
    portal: '遊戲專屬計算',
    portalUrl: '/tw/games/',
    blog: '攻略指南',
    blogUrl: '/tw/articles/',
    author: '營運團隊 / 驗證方針',
    authorUrl: '/author/katakata.html',
    privacyUrl: '/privacy.html',
    termsUrl: '/terms.html',
    privacyLabel: '隱私權政策 (日文)',
    termsLabel: '服務條款 (日文)',
    siteName: 'Google Play Points 計算器',
    disclaimer: 'Google Play、Google Play 標誌及 Android 均為 Google LLC 的商標。本網站為非官方社群營運之計算器與攻略指南，與 Google LLC 及各遊戲開發/發行商無關。'
  }
};

function getLocale(file) {
  if (file.startsWith('en/')) return 'en';
  if (file.startsWith('ko/')) return 'ko';
  if (file.startsWith('tw/')) return 'tw';
  return 'ja';
}

function buildFooterHtml(locKey) {
  const d = footerData[locKey];
  return `
    <footer class="page-footer">
        <p class="footer-nav-links">
          <a href="${d.homeUrl}">${d.home}</a>
          <span class="footer-separator">|</span>
          <a href="${d.portalUrl}">${d.portal}</a>
          <span class="footer-separator">|</span>
          <a href="${d.blogUrl}">${d.blog}</a>
          <span class="footer-separator">|</span>
          <a href="${d.authorUrl}">${d.author}</a>
          <span class="footer-separator">|</span>
          <a href="${d.privacyUrl}">${d.privacyLabel}</a>
          <span class="footer-separator">|</span>
          <a href="${d.termsUrl}">${d.termsLabel}</a>
        </p>
        <p class="site-footer-trademark">${d.disclaimer}</p>
        <p class="copyright">© 2026 ${d.siteName} All Rights Reserved.</p>
    </footer>`;
}

function processDirectory(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'games') {
        processDirectory(fullPath);
      }
    } else if (file === 'index.html') {
      const rel = path.relative(root, fullPath).replace(/\\/g, '/');
      if (rel !== 'index.html' && rel !== 'en/index.html' && rel !== 'ko/index.html' && rel !== 'tw/index.html' && !rel.includes('/games/')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        const loc = getLocale(rel);
        const footerHtml = buildFooterHtml(loc);

        if (content.includes('<footer class="page-footer">')) {
          content = content.replace(/<footer class="page-footer">[\s\S]*?<\/footer>/, footerHtml.trim());
        } else if (content.includes('</main>')) {
          content = content.replace('</main>', `</main>\n${footerHtml}`);
        }

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated footer in LP: ${rel}`);
      }
    }
  });
}

processDirectory(root);
