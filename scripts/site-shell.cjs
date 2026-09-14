'use strict';

const LP_FOOTER_PROFILES = Object.freeze({
  ja: Object.freeze({
    links: Object.freeze([
      Object.freeze({ href: '/', label: 'トップ計算機' }),
      Object.freeze({ href: '/games/', label: 'ゲーム計算機' }),
      Object.freeze({ href: '/blog/', label: '攻略記事一覧' }),
      Object.freeze({ href: '/author/katakata.html', label: '運営者・検証方針' }),
      Object.freeze({ href: '/privacy.html', label: 'プライバシーポリシー' }),
      Object.freeze({ href: '/terms.html', label: '利用規約' })
    ]),
    disclaimer: 'Google Play、Google Play ロゴ、Android は Google LLC の商標です。当サイトは個人によって運営される非公式のファンサイト・計算ツールであり、Google LLC および掲載されている各ゲームの配信元・開発会社とは一切関係ありません。',
    copyright: '© 2026 PlayPoint Simulation Tool All Rights Reserved.'
  }),
  en: Object.freeze({
    links: Object.freeze([
      Object.freeze({ href: '/en/', label: 'Home Calculator' }),
      Object.freeze({ href: '/en/games/', label: 'Game Calculators' }),
      Object.freeze({ href: '/en/articles/', label: 'Guides' }),
      Object.freeze({ href: '/author/katakata.html', label: 'About / Verification' }),
      Object.freeze({ href: '/privacy.html', label: 'Privacy Policy (Japanese)' }),
      Object.freeze({ href: '/terms.html', label: 'Terms of Service (Japanese)' })
    ]),
    disclaimer: 'Google Play, the Google Play logo, and Android are trademarks of Google LLC. This website is an unofficial community calculator and guide, not affiliated with or endorsed by Google LLC or any game publishers mentioned.',
    copyright: '© 2026 Google Play Points Calculator All Rights Reserved.'
  }),
  ko: Object.freeze({
    links: Object.freeze([
      Object.freeze({ href: '/ko/', label: '종합 계산기' }),
      Object.freeze({ href: '/ko/games/', label: '게임별 계산기' }),
      Object.freeze({ href: '/ko/articles/', label: '가이드' }),
      Object.freeze({ href: '/author/katakata.html', label: '운영자 / 검증방침' }),
      Object.freeze({ href: '/privacy.html', label: '개인정보처리방침 (일본어)' }),
      Object.freeze({ href: '/terms.html', label: '이용약관 (일본어)' })
    ]),
    disclaimer: 'Google Play, Google Play 로고 및 Android는 Google LLC의 상표입니다. 본 사이트는 개인이 운영하는 비공식 계산기 및 가이드 사이트이며, Google LLC 및 각 게임 개발사/배급사와 제휴 또는 승인 관계가 없습니다.',
    copyright: '© 2026 Google Play Points 계산기 All Rights Reserved.'
  }),
  tw: Object.freeze({
    links: Object.freeze([
      Object.freeze({ href: '/tw/', label: '綜合計算機' }),
      Object.freeze({ href: '/tw/games/', label: '遊戲專屬計算' }),
      Object.freeze({ href: '/tw/articles/', label: '攻略指南' }),
      Object.freeze({ href: '/author/katakata.html', label: '營運團隊 / 驗證方針' }),
      Object.freeze({ href: '/privacy.html', label: '隱私權政策 (日文)' }),
      Object.freeze({ href: '/terms.html', label: '服務條款 (日文)' })
    ]),
    disclaimer: 'Google Play、Google Play 標誌及 Android 均為 Google LLC 的商標。本網站為非官方社群營運之計算器與攻略指南，與 Google LLC 及各遊戲開發/發行商無關。',
    copyright: '© 2026 Google Play Points 計算器 All Rights Reserved.'
  })
});

const JAPANESE_FIXED_REGION_LINKS = Object.freeze([
  Object.freeze({ href: './', label: '日本語', style: 'margin-right: 12px; color: #007bff; text-decoration: none;' }),
  Object.freeze({ href: './en/', label: 'English', style: 'margin-right: 12px; color: #007bff; text-decoration: none;' }),
  Object.freeze({ href: './ko/', label: '한국어', style: 'margin-right: 12px; color: #007bff; text-decoration: none;' }),
  Object.freeze({ href: './tw/', label: '繁體中文', style: 'margin-right: 12px; color: #007bff; text-decoration: none;' })
]);

const JAPANESE_FIXED_POLICY_LINKS = Object.freeze([
  Object.freeze({ href: 'privacy.html', label: 'プライバシーポリシー' }),
  Object.freeze({ href: 'terms.html', label: '利用規約', style: 'margin-left: 1em;' })
]);

const REGION_GUIDE_LINKS = Object.freeze([
  Object.freeze({ href: './', label: '🇯🇵 Japan' }),
  Object.freeze({ href: './en/', label: '🇺🇸 U.S.' }),
  Object.freeze({ href: './ko/', label: '🇰🇷 Korea' }),
  Object.freeze({ href: './tw/', label: '🇹🇼 Taiwan' }),
  Object.freeze({ href: './hk/', label: '🇭🇰 Hong Kong' }),
  Object.freeze({ href: './in/', label: '🇮🇳 India' })
]);

const REGION_GUIDE_POLICY_LINKS = Object.freeze([
  Object.freeze({ href: 'privacy.html', label: 'Privacy Policy' }),
  Object.freeze({ href: 'terms.html', label: 'Terms of Service', style: 'margin-left:1em;' })
]);

const JAPANESE_FIXED_HEADER_PROFILE = Object.freeze({
  headerLinksStyle: 'width: 100%; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;',
  navStyle: 'font-size: 0.9em;',
  navLinks: JAPANESE_FIXED_REGION_LINKS,
  policyLinks: JAPANESE_FIXED_POLICY_LINKS
});

const FIXED_PAGE_HEADER_PROFILES = Object.freeze({
  'about-playpoints.html': JAPANESE_FIXED_HEADER_PROFILE,
  'info.html': JAPANESE_FIXED_HEADER_PROFILE,
  'attention.html': Object.freeze({
    topBarStyle: 'margin-bottom:20px;',
    headerLinksStyle: 'width:100%;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;',
    navStyle: 'font-size:.9em;display:flex;flex-wrap:wrap;gap:10px;',
    navLinks: REGION_GUIDE_LINKS,
    policyLinks: REGION_GUIDE_POLICY_LINKS
  })
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function styleAttribute(style) {
  return style ? ` style="${escapeHtml(style)}"` : '';
}

function getLpFooterProfile(localeKey) {
  return LP_FOOTER_PROFILES[localeKey] || LP_FOOTER_PROFILES.ja;
}

function getFixedPageHeaderProfile(relativePath) {
  const profile = FIXED_PAGE_HEADER_PROFILES[relativePath];
  if (!profile) {
    throw new RangeError(`No fixed-page header profile for: ${relativePath}`);
  }
  return profile;
}

function renderPageFooter({ links, disclaimer, copyright }) {
  if (!Array.isArray(links) || links.length === 0) {
    throw new TypeError('Site footer links must be a non-empty array.');
  }
  if (!disclaimer || !copyright) {
    throw new TypeError('Site footer disclaimer and copyright are required.');
  }

  const nav = links.map((link, index) => {
    if (!link?.href || !link?.label) {
      throw new TypeError(`Site footer link ${index + 1} requires href and label.`);
    }
    const separator = index < links.length - 1
      ? '\n          <span class="footer-separator">|</span>'
      : '';
    return `          <a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>${separator}`;
  }).join('\n');

  return `    <footer class="page-footer">
        <p class="footer-nav-links">
${nav}
        </p>
        <p class="site-footer-trademark">${escapeHtml(disclaimer)}</p>
        <p class="copyright">${escapeHtml(copyright)}</p>
    </footer>`;
}

function renderHeaderLink(link, indent) {
  if (!link?.href || !link?.label) {
    throw new TypeError('Site header links require href and label.');
  }
  return `${indent}<a href="${escapeHtml(link.href)}"${styleAttribute(link.style)}>${escapeHtml(link.label)}</a>`;
}

function renderFixedPageHeader(profile, indent = '') {
  if (!profile || !Array.isArray(profile.navLinks) || !Array.isArray(profile.policyLinks)) {
    throw new TypeError('Fixed-page header profile requires navLinks and policyLinks arrays.');
  }
  if (profile.navLinks.length === 0 || profile.policyLinks.length === 0) {
    throw new TypeError('Fixed-page header navigation groups must not be empty.');
  }

  const first = `${indent}<div class="top-bar"${styleAttribute(profile.topBarStyle)}>`;
  const second = `${indent}  <div class="header-links"${styleAttribute(profile.headerLinksStyle)}>`;
  const navOpen = `${indent}    <div class="lang-nav"${styleAttribute(profile.navStyle)}>`;
  const navLinks = profile.navLinks.map(link => renderHeaderLink(link, `${indent}      `)).join('\n');
  const navClose = `${indent}    </div>`;
  const policyOpen = `${indent}    <div>`;
  const policyLinks = profile.policyLinks.map(link => renderHeaderLink(link, `${indent}      `)).join('\n');
  const policyClose = `${indent}    </div>`;
  const headerClose = `${indent}  </div>`;
  const topClose = `${indent}</div>`;

  return [first, second, navOpen, navLinks, navClose, policyOpen, policyLinks, policyClose, headerClose, topClose].join('\n');
}

module.exports = {
  FIXED_PAGE_HEADER_PROFILES,
  LP_FOOTER_PROFILES,
  escapeHtml,
  getFixedPageHeaderProfile,
  getLpFooterProfile,
  renderFixedPageHeader,
  renderPageFooter
};
