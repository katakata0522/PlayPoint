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
      Object.freeze({ href: '/en/author/katakata.html', label: 'About / Verification' }),
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
      Object.freeze({ href: '/ko/author/katakata.html', label: '운영자 / 검증방침' }),
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
      Object.freeze({ href: '/tw/author/katakata.html', label: '營運團隊 / 驗證方針' }),
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

const REGION_GUIDE_BRAND_LINK = Object.freeze({
  href: './',
  label: '← PlayPoint Calculator',
  style: 'font-weight:800;color:var(--text-color,#1f2937);text-decoration:none;'
});

const JAPANESE_FIXED_HEADER_PROFILE = Object.freeze({
  headerLinksStyle: 'width: 100%; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;',
  navStyle: 'font-size: 0.9em;',
  navLinks: JAPANESE_FIXED_REGION_LINKS,
  policyLinks: JAPANESE_FIXED_POLICY_LINKS
});

const FIXED_PAGE_HEADER_PROFILES = Object.freeze({
  'about-playpoints.html': JAPANESE_FIXED_HEADER_PROFILE,
  'attention.html': Object.freeze({
    topBarStyle: 'margin-bottom:20px;',
    headerLinksStyle: 'width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:10px;',
    brandLink: REGION_GUIDE_BRAND_LINK,
    navAriaLabel: 'Calculator country or region',
    navStyle: 'font-size:.9em;display:flex;flex-wrap:wrap;gap:8px 10px;',
    navLinks: REGION_GUIDE_LINKS,
    policyLinks: Object.freeze([])
  })
});

const CALCULATOR_REGION_BUTTONS = Object.freeze([
  Object.freeze({ region: 'JP', label: 'JP' }),
  Object.freeze({ region: 'US', label: 'US' }),
  Object.freeze({ region: 'KR', label: 'KR' }),
  Object.freeze({ region: 'TW', label: 'TW' })
]);

function freezeCalculatorLinks(links) {
  return Object.freeze(links.map(link => Object.freeze(link)));
}

function calculatorHeaderProfile(activeRegion, regionAriaLabel, links) {
  return Object.freeze({
    activeRegion,
    regionAriaLabel,
    regionButtons: CALCULATOR_REGION_BUTTONS,
    links: freezeCalculatorLinks(links)
  });
}

const CALCULATOR_HEADER_PROFILES = Object.freeze({
  'index.html': calculatorHeaderProfile('JP', 'Play の国または地域', [
    { href: 'attention.html', label: '⚠️ For users outside Japan', className: 'alert-link', countryNotes: true, langKey: 'linkAttention' },
    { href: 'games/', label: '🎮 ゲーム別計算', langKey: 'linkGames' },
    { href: 'blog/', label: '📝 記事一覧', langKey: 'linkArticles' },
  ]),
  'en/index.html': calculatorHeaderProfile('US', 'Play country or region', [
    { href: '../attention.html', label: '⚠️ Country notes', className: 'alert-link', countryNotes: true, langKey: 'linkAttention' },
    { href: '../games/', label: '🎮 Game Calculators', langKey: 'linkGames' },
    { href: './articles/', label: '📝 Articles', langKey: 'linkArticles' },
  ]),
  'ko/index.html': calculatorHeaderProfile('KR', 'Play 국가 또는 지역', [
    { href: '../attention.html', label: '⚠️ 국가별 안내', className: 'alert-link', countryNotes: true, langKey: 'linkAttention' },
    { href: '../games/', label: '🎮 게임별 계산', langKey: 'linkGames' },
    { href: './articles/', label: '📝 가이드', langKey: 'linkArticles' },
  ]),
  'tw/index.html': calculatorHeaderProfile('TW', 'Play 國家或地區', [
    { href: '../attention.html', label: '⚠️ 地區注意事項', className: 'alert-link', countryNotes: true, langKey: 'linkAttention' },
    { href: '../games/', label: '🎮 遊戲專屬計算', langKey: 'linkGames' },
    { href: './articles/', label: '📝 指南', langKey: 'linkArticles' },
  ]),
  'hk/index.html': calculatorHeaderProfile(null, 'Play 國家或地區', [
    { href: '../attention.html', label: '⚠️ 地區注意事項', className: 'alert-link', countryNotes: true, langKey: 'linkAttention' },
    { href: '../tw/games/', label: '🎮 遊戲計算（台灣規則・非香港）', langKey: 'linkGames' },
    { href: '../tw/articles/', label: '📝 指南', langKey: 'linkArticles' },
  ]),
  'in/index.html': calculatorHeaderProfile(null, 'Play country or region', [
    { href: '../attention.html', label: '⚠️ Country notes', className: 'alert-link', countryNotes: true, langKey: 'linkAttention' },
    { href: '../en/games/', label: '🎮 Game calculators (U.S. rules, not India)', langKey: 'linkGames' },
    { href: '../en/articles/', label: '📝 Articles', langKey: 'linkArticles' },
  ])
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

function getCalculatorHeaderProfile(relativePath) {
  const profile = CALCULATOR_HEADER_PROFILES[relativePath];
  if (!profile) {
    throw new RangeError(`No calculator header profile for: ${relativePath}`);
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
  if (profile.navLinks.length === 0 && !profile.brandLink) {
    throw new TypeError('Fixed-page header requires navigation links or a brand link.');
  }

  const blocks = [
    `${indent}<div class="top-bar"${styleAttribute(profile.topBarStyle)}>`,
    `${indent}  <div class="header-links"${styleAttribute(profile.headerLinksStyle)}>`
  ];

  if (profile.brandLink) {
    blocks.push(
      `${indent}    <div class="site-shell-brand">`,
      renderHeaderLink(profile.brandLink, `${indent}      `),
      `${indent}    </div>`
    );
  }

  if (profile.navLinks.length > 0) {
    const navAria = profile.navAriaLabel
      ? ` role="navigation" aria-label="${escapeHtml(profile.navAriaLabel)}"`
      : '';
    blocks.push(
      `${indent}    <div class="lang-nav"${navAria}${styleAttribute(profile.navStyle)}>`,
      profile.navLinks.map(link => renderHeaderLink(link, `${indent}      `)).join('\n'),
      `${indent}    </div>`
    );
  }

  if (profile.policyLinks.length > 0) {
    blocks.push(
      `${indent}    <div>`,
      profile.policyLinks.map(link => renderHeaderLink(link, `${indent}      `)).join('\n'),
      `${indent}    </div>`
    );
  }

  blocks.push(`${indent}  </div>`, `${indent}</div>`);
  return blocks.join('\n');
}

function renderCalculatorHeaderLink(link, indent) {
  if (!link?.href || !link?.label || !link?.langKey) {
    throw new TypeError('Calculator header links require href, label, and langKey.');
  }

  const attributes = [`href="${escapeHtml(link.href)}"`];
  if (link.target) attributes.push(`target="${escapeHtml(link.target)}"`);
  if (link.rel) attributes.push(`rel="${escapeHtml(link.rel)}"`);
  if (link.className) attributes.push(`class="${escapeHtml(link.className)}"`);
  if (link.countryNotes) attributes.push('data-country-notes-link');
  attributes.push(`data-lang-key="${escapeHtml(link.langKey)}"`);
  return `${indent}<a ${attributes.join(' ')}>${escapeHtml(link.label)}</a>`;
}

function renderCalculatorHeader(profile, indent = '') {
  if (!profile || !Array.isArray(profile.regionButtons) || !Array.isArray(profile.links)) {
    throw new TypeError('Calculator header profile requires regionButtons and links arrays.');
  }
  if (profile.regionButtons.length === 0 || profile.links.length === 0 || !profile.regionAriaLabel) {
    throw new TypeError('Calculator header requires non-empty region buttons, links, and an aria label.');
  }

  const knownRegions = new Set(profile.regionButtons.map(button => button.region));
  if (knownRegions.size !== profile.regionButtons.length) {
    throw new TypeError('Calculator header region buttons must use unique region ids.');
  }
  if (profile.activeRegion !== null && !knownRegions.has(profile.activeRegion)) {
    throw new RangeError(`Unknown active calculator region: ${profile.activeRegion}`);
  }

  const regionButtons = profile.regionButtons.map(button => {
    if (!button?.region || !button?.label) {
      throw new TypeError('Calculator region buttons require region and label.');
    }
    const active = profile.activeRegion === button.region ? ' class="active"' : '';
    return `${indent}         <button data-region="${escapeHtml(button.region)}"${active}>${escapeHtml(button.label)}</button>`;
  }).join('\n');

  const links = profile.links.map(link => renderCalculatorHeaderLink(link, `${indent}         `)).join('\n');

  return [
    `${indent}<div class="top-bar">`,
    `${indent}     <div class="region-switch" aria-label="${escapeHtml(profile.regionAriaLabel)}">`,
    regionButtons,
    `${indent}     </div>`,
    `${indent}     <div class="header-links">`,
    links,
    `${indent}     </div>`,
    `${indent} </div>`
  ].join('\n');
}

module.exports = {
  CALCULATOR_HEADER_PROFILES,
  CALCULATOR_REGION_BUTTONS,
  FIXED_PAGE_HEADER_PROFILES,
  LP_FOOTER_PROFILES,
  escapeHtml,
  getCalculatorHeaderProfile,
  getFixedPageHeaderProfile,
  getLpFooterProfile,
  renderCalculatorHeader,
  renderFixedPageHeader,
  renderPageFooter
};
