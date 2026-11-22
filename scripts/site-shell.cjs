'use strict';

const LP_FOOTER_PROFILES = Object.freeze({
  ja: Object.freeze({
    links: Object.freeze([
      Object.freeze({ href: '/', label: 'トップ計算機' }),
      Object.freeze({ href: '/games/', label: 'ゲーム計算機' }),
      Object.freeze({ href: '/blog/', label: '記事トップ' }),
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
  Object.freeze({ href: './', label: 'Japan' }),
  Object.freeze({ href: './en/', label: 'U.S.' }),
  Object.freeze({ href: './ko/', label: 'Korea' }),
  Object.freeze({ href: './tw/', label: 'Taiwan' }),
  Object.freeze({ href: './hk/', label: 'Hong Kong' }),
  Object.freeze({ href: './in/', label: 'India' })
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
  'about-playpoints.html': Object.freeze({
    ...JAPANESE_FIXED_HEADER_PROFILE,
    navLinks: Object.freeze(JAPANESE_FIXED_REGION_LINKS.map(link => Object.freeze({
      ...link,
      href: link.href === './' ? '/about-playpoints.html' : `${link.href}articles/google-play-points-basics.html`
    })))
  }),
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

const MORE_REGION_LOCALE_COPY = Object.freeze({
  ja: Object.freeze({ moreLabel: 'その他の地域', menuLabel: 'その他の Play Points 地域', currentLabel: '現在の地域' }),
  en: Object.freeze({ moreLabel: 'More regions', menuLabel: 'More Play Points regions', currentLabel: 'current region' }),
  ko: Object.freeze({ moreLabel: '다른 지역', menuLabel: '다른 Play Points 지역', currentLabel: '현재 지역' }),
  tw: Object.freeze({ moreLabel: '更多地區', menuLabel: '更多 Play Points 地區', currentLabel: '目前地區' })
});

function freezeMoreOptions(moreOptions) {
  return moreOptions ? Object.freeze(moreOptions) : null;
}

function calculatorHeaderProfile(activeRegion, regionAriaLabel, links, moreOptions = null) {
  return Object.freeze({
    activeRegion,
    regionAriaLabel,
    regionButtons: CALCULATOR_REGION_BUTTONS,
    links: freezeCalculatorLinks(links),
    moreOptions: freezeMoreOptions(moreOptions)
  });
}

const CALCULATOR_HEADER_PROFILES = Object.freeze({
  'index.html': calculatorHeaderProfile('JP', 'Play の国または地域', [
    { href: 'attention.html', label: '⚠️ For users outside Japan', className: 'alert-link', countryNotes: true, langKey: 'linkAttention' },
    { href: 'games/', label: '🎮 ゲーム別計算', langKey: 'linkGames' },
    { href: 'blog/', label: '📝 記事トップ', langKey: 'linkArticles' },
  ], { ...MORE_REGION_LOCALE_COPY.ja, activeExpandedRegion: null, activeExpandedName: '' }),
  'en/index.html': calculatorHeaderProfile('US', 'Play country or region', [
    { href: './articles/google-play-points-country-differences.html', label: 'Country rules', className: 'country-rules-link', countryNotes: true, langKey: 'linkAttention' },
    { href: './games/', label: 'Game calculators', langKey: 'linkGames' },
    { href: './articles/', label: 'Articles', langKey: 'linkArticles' },
  ], { ...MORE_REGION_LOCALE_COPY.en, activeExpandedRegion: null, activeExpandedName: '' }),
  'ko/index.html': calculatorHeaderProfile('KR', 'Play 국가 또는 지역', [
    { href: './articles/google-play-points-country-differences.html', label: '국가별 규칙', className: 'country-rules-link', countryNotes: true, langKey: 'linkAttention' },
    { href: './games/', label: '게임별 계산', langKey: 'linkGames' },
    { href: './articles/', label: '가이드', langKey: 'linkArticles' },
  ], { ...MORE_REGION_LOCALE_COPY.ko, activeExpandedRegion: null, activeExpandedName: '' }),
  'tw/index.html': calculatorHeaderProfile('TW', 'Play 國家或地區', [
    { href: './articles/google-play-points-country-differences.html', label: '各國規則比較', className: 'country-rules-link', countryNotes: true, langKey: 'linkAttention' },
    { href: './games/', label: '遊戲專屬計算', langKey: 'linkGames' },
    { href: './articles/', label: '指南', langKey: 'linkArticles' },
  ], { ...MORE_REGION_LOCALE_COPY.tw, activeExpandedRegion: null, activeExpandedName: '' }),
  'hk/index.html': calculatorHeaderProfile(null, 'Play 國家或地區', [
    { href: '../tw/articles/google-play-points-country-differences.html', label: '各國規則比較', className: 'country-rules-link', countryNotes: true, langKey: 'linkAttention' },
    { href: '../tw/games/', label: '🎮 遊戲計算（台灣規則・非香港）', langKey: 'linkGames' },
    { href: '../tw/articles/', label: '繁體中文指南', langKey: 'linkArticles' },
  ], { ...MORE_REGION_LOCALE_COPY.tw, activeExpandedRegion: 'HK', activeExpandedName: '香港' }),
  'in/index.html': calculatorHeaderProfile(null, 'Play country or region', [
    { href: '../en/articles/google-play-points-country-differences.html', label: 'Country rules', className: 'country-rules-link', countryNotes: true, langKey: 'linkAttention' },
    { href: '../en/games/', label: '🎮 Game calculators (U.S. rules, not India)', langKey: 'linkGames' },
    { href: '../en/articles/', label: 'English guides', langKey: 'linkArticles' },
  ], { ...MORE_REGION_LOCALE_COPY.en, activeExpandedRegion: 'IN', activeExpandedName: 'India' })
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

function renderCalculatorMoreSelector(moreOptions, indent) {
  if (!moreOptions) return '';
  const activeExpanded = moreOptions.activeExpandedRegion || null;
  const activeFlag = Boolean(activeExpanded);
  const toggleClass = activeFlag ? 'region-more-toggle active' : 'region-more-toggle';
  const toggleAriaLabel = activeFlag
    ? `${moreOptions.moreLabel}; ${moreOptions.currentLabel}: ${moreOptions.activeExpandedName}`
    : moreOptions.moreLabel;
  const toggleTitle = activeFlag
    ? `${moreOptions.activeExpandedName} — ${moreOptions.moreLabel}`
    : moreOptions.moreLabel;
  const toggleActiveAttr = activeFlag
    ? ` data-region-active="true" data-active-region="${escapeHtml(activeExpanded)}" aria-current="true"`
    : ' data-region-active="false"';
  const toggleInner = activeFlag
    ? `<span class="region-label-desktop">${escapeHtml(activeExpanded)}</span>`
    : '🌐';

  return [
    `${indent}         <div class="region-more" data-region-more="true">`,
    `${indent}             <button type="button" class="${toggleClass}" data-region-menu-toggle${toggleActiveAttr} aria-haspopup="menu" aria-expanded="false" aria-label="${escapeHtml(toggleAriaLabel)}" title="${escapeHtml(toggleTitle)}">${toggleInner}</button>`,
    `${indent}             <div class="region-more-menu" data-region-menu role="menu" aria-label="${escapeHtml(moreOptions.menuLabel)}" hidden>`,
    `${indent}                 <p class="region-more-menu__title">${escapeHtml(moreOptions.moreLabel)}</p>`,
    `${indent}                 <button type="button" class="region-more-option${activeExpanded === 'HK' ? ' active' : ''}" role="menuitem" data-region="HK">`,
    `${indent}                     <span class="region-more-option__flag" aria-hidden="true"></span>`,
    `${indent}                     <span class="region-more-option__copy"><span class="region-more-option__name">香港 Hong Kong</span><span class="region-more-option__detail">繁體中文 · HKD</span></span>`,
    `${indent}                 </button>`,
    `${indent}                 <button type="button" class="region-more-option${activeExpanded === 'IN' ? ' active' : ''}" role="menuitem" data-region="IN">`,
    `${indent}                     <span class="region-more-option__flag" aria-hidden="true"></span>`,
    `${indent}                     <span class="region-more-option__copy"><span class="region-more-option__name">India</span><span class="region-more-option__detail">English · INR</span></span>`,
    `${indent}                 </button>`,
    `${indent}             </div>`,
    `${indent}         </div>`
  ].join('\n');
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

  const hasMoreSelector = Boolean(profile.moreOptions);
  const regionButtons = profile.regionButtons.map(button => {
    if (!button?.region || !button?.label) {
      throw new TypeError('Calculator region buttons require region and label.');
    }
    const active = profile.activeRegion === button.region ? ' class="active"' : '';
    const inner = hasMoreSelector
      ? `<span class="region-label-desktop">${escapeHtml(button.label)}</span>`
      : escapeHtml(button.label);
    return `${indent}         <button data-region="${escapeHtml(button.region)}"${active}>${inner}</button>`;
  }).join('\n');

  const moreBlock = hasMoreSelector ? `\n${renderCalculatorMoreSelector(profile.moreOptions, indent)}` : '';
  const links = profile.links.map(link => renderCalculatorHeaderLink(link, `${indent}         `)).join('\n');

  return [
    `${indent}<div class="top-bar">`,
    `${indent}     <div class="region-switch" aria-label="${escapeHtml(profile.regionAriaLabel)}">`,
    `${regionButtons}${moreBlock}`,
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
