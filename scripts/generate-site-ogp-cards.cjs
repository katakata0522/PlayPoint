'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://playpoint-sim.com';

const PROTECTED_DEFAULT_OGP = new Set([
  'index.html',
  'about-playpoints.html',
  'changelog.html',
  'embed.html',
  'info.html',
  'privacy.html',
  'terms.html',
  'sitemap.html',
  'author/katakata.html'
]);

const LOCALE_META = Object.freeze({
  ja: { brand: 'PlayPoint 計算ツール', domainLabel: 'Japan · JPY', accent: '#0d9488', accentSoft: '#99f6e4', bg: '#0d1b26' },
  en: { brand: 'PlayPoint Calculator', domainLabel: 'United States · USD', accent: '#2563eb', accentSoft: '#bfdbfe', bg: '#0f172a' },
  ko: { brand: 'PlayPoint 계산기', domainLabel: '대한민국 · KRW', accent: '#0284c7', accentSoft: '#bae6fd', bg: '#0f1829' },
  tw: { brand: 'PlayPoint 計算器', domainLabel: '台灣 · TWD', accent: '#059669', accentSoft: '#a7f3d0', bg: '#0d1f1c' },
  hk: { brand: 'PlayPoint 計算器（香港）', domainLabel: 'Hong Kong · HKD', accent: '#0d9488', accentSoft: '#99f6e4', bg: '#0c1b29' },
  in: { brand: 'PlayPoint Calculator India', domainLabel: 'India · INR', accent: '#d97706', accentSoft: '#fde68a', bg: '#161b2a' }
});

function localeForRel(rel) {
  if (rel.startsWith('en/')) return 'en';
  if (rel.startsWith('ko/')) return 'ko';
  if (rel.startsWith('tw/')) return 'tw';
  if (rel.startsWith('hk/')) return 'hk';
  if (rel.startsWith('in/')) return 'in';
  return 'ja';
}

function ogpPathForRelativePage(rel) {
  const normalized = String(rel).replaceAll('\\', '/').replace(/^\.\//, '');
  if (PROTECTED_DEFAULT_OGP.has(normalized)) return 'ogp.png';

  const homeMatch = normalized.match(/^(en|ko|tw|hk|in)\/index\.html$/);
  if (homeMatch) {
    return `images/ogp/pages/${homeMatch[1]}-home.jpg`;
  }
  if (normalized === 'attention.html') {
    return 'images/ogp/pages/attention.jpg';
  }

  const gameMatch = normalized.match(/^(?:(en|ko|tw)\/)?games\/(?:([^/]+)\/)?index\.html$/);
  if (gameMatch) {
    const loc = gameMatch[1] || 'ja';
    const slug = gameMatch[2] || 'portal';
    return `images/ogp/games/${loc}-${slug}.jpg`;
  }

  const authorMatch = normalized.match(/^(en|ko|tw)\/author\/katakata\.html$/);
  if (authorMatch) {
    return `images/ogp/pages/${authorMatch[1]}-author-katakata.jpg`;
  }

  const hubMatch = normalized.match(/^(en|ko|tw)\/articles\/index\.html$/);
  if (hubMatch) {
    return `images/ogp/pages/${hubMatch[1]}-articles-hub.jpg`;
  }

  const lpSlug = normalized
    .replace(/\/index\.html$/, '')
    .replace(/\.html$/, '')
    .replaceAll('/', '-');
  return `images/ogp/pages/${lpSlug}.jpg`;
}

function collectFallbackPages(rootDir = ROOT) {
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['.git', '.github', 'docs', 'node_modules', 'scripts', 'tests', 'images'].includes(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.name.endsWith('.html')) {
        const rel = path.relative(rootDir, abs).replaceAll('\\', '/');
        if (PROTECTED_DEFAULT_OGP.has(rel)) continue;
        // Include all game hubs/calculators, status, maintenance, campaign, amount, points-cost, compare, intl hubs & authors
        if (
          rel === 'attention.html' ||
          /^(?:en|ko|tw|hk|in)\/index\.html$/.test(rel) ||
          /^(?:(?:en|ko|tw)\/)?games\/(?:[^/]+\/)?index\.html$/.test(rel) ||
          /^(?:(?:en|ko|tw)\/)?(?:status|maintenance|campaign|amount|points-cost|compare)\//.test(rel) ||
          /^(?:en|ko|tw)\/(?:articles\/index|author\/katakata)\.html$/.test(rel) ||
          /^(?:hk|in)\/google-play-points-guide\.html$/.test(rel)
        ) {
          results.push(rel);
        }
      }
    }
  }
  walk(rootDir);
  return results.sort();
}

const HTML_ENTITIES = Object.freeze({
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'"
});

function stripTags(str) {
  let prev;
  let next = String(str || '');
  do {
    prev = next;
    next = next.replace(/<[^>]*>?/g, '');
  } while (next !== prev);
  return next.replace(/[<>]/g, '');
}

function decodeHtml(str) {
  return String(str || '')
    .replace(/&(?:amp|lt|gt|quot|#39);/g, match => HTML_ENTITIES[match])
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPageInfo(rootDir, rel) {
  const html = fs.readFileSync(path.join(rootDir, rel), 'utf8');
  const loc = localeForRel(rel);
  const h1 = decodeHtml(stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || ''));
  const titleTag = decodeHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
  const desc = decodeHtml(html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i)?.[1] || '');
  const title = h1 || titleTag.split(/\s*[|—–]\s*/)[0].trim();

  let category = { ja: '計算ツール・比較', en: 'Play Points Tool', ko: '계산·비교 도구', tw: '計算與比較工具', hk: '香港官方規則指南', in: 'Official India Guide' }[loc];
  let gameIconDataUri = null;
  const gameMatch = rel.match(/^(?:(en|ko|tw)\/)?games\/([^/]+)\/index\.html$/);
  if (gameMatch) {
    category = { ja: 'ゲーム別 Play Points 計算', en: 'Game Play Points Calculator', ko: '게임별 포인트 계산기', tw: '遊戲課金點數計算器' }[loc];
    const gameId = gameMatch[2];
    const icon2x = path.join(rootDir, 'images', 'game-icons', `${gameId}-2x.webp`);
    const icon1x = path.join(rootDir, 'images', 'game-icons', `${gameId}.webp`);
    const iconPath = fs.existsSync(icon2x) ? icon2x : fs.existsSync(icon1x) ? icon1x : null;
    if (iconPath) {
      const b64 = fs.readFileSync(iconPath).toString('base64');
      gameIconDataUri = `data:image/webp;base64,${b64}`;
    }
  } else if (rel === 'attention.html') {
    category = 'Country & Region Guide';
  } else if (/^(?:en|ko|tw|hk|in)\/index\.html$/.test(rel)) {
    category = { en: 'Google Play Points Calculator', ko: 'Google Play Points 계산기', tw: 'Google Play Points 計算器', hk: '香港版 Google Play Points 計算器', in: 'India Google Play Points Calculator' }[loc];
  } else if (/games\/index\.html$/.test(rel)) {
    category = { ja: '対応ゲーム計算機一覧', en: 'Mobile Game Calculators', ko: '게임별 계산기 모음', tw: '手遊計算器總覽' }[loc];
  } else if (/\/status\/|^status\//.test(rel)) {
    category = { ja: '会員ランク別 必要額シミュレーター', en: 'Tier Cost Estimator', ko: '등급 도달 비용 계산', tw: '會員等級試算' }[loc];
  } else if (/\/maintenance\/|^maintenance\//.test(rel)) {
    category = { ja: 'ランク維持 必要額ガイド', en: 'Tier Maintenance Guide', ko: '등급 유지 비용 안내', tw: '維持等級試算' }[loc];
  } else if (/\/campaign\/|^campaign\//.test(rel)) {
    category = { ja: 'キャンペーン倍率比較', en: 'Promotion Multiplier Calculator', ko: '프로모션 배율 비교', tw: '加碼活動倍率比較' }[loc];
  } else if (/articles\/index\.html$/.test(rel)) {
    category = { ja: '公式情報ガイド', en: 'Official Rules & Guides Hub', ko: '공식 규칙·가이드 허브', tw: '官方規則指南總覽' }[loc];
  } else if (/author\/katakata\.html$/.test(rel)) {
    category = { ja: '運営者・検証方針', en: 'Editorial Verification Standards', ko: '운영자·검증 원칙', tw: '營運者與查證標準' }[loc];
  }

  // Keep subtitle compact and informative
  const subtitle = desc.length > 105 ? desc.slice(0, 102).trimEnd() + '…' : desc;
  return { rel, loc, title, subtitle, category, gameIconDataUri, outRel: ogpPathForRelativePage(rel) };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildCardHtml({ loc, title, subtitle, category, gameIconDataUri }) {
  const theme = LOCALE_META[loc] || LOCALE_META.ja;
  const fontStack = loc === 'ko'
    ? '"Malgun Gothic","Noto Sans KR","Segoe UI",sans-serif'
    : (loc === 'tw' || loc === 'hk')
      ? '"Microsoft JhengHei","Noto Sans TC","Segoe UI",sans-serif'
      : loc === 'ja'
        ? '"Yu Gothic UI","Hiragino Kaku Gothic ProN","Meiryo",sans-serif'
        : '"Segoe UI","Inter",system-ui,sans-serif';

  const iconBlock = gameIconDataUri
    ? `<div class="icon-frame"><img src="${gameIconDataUri}" width="168" height="168" alt="" /></div>`
    : `<div class="icon-frame emblem" aria-hidden="true">
         <svg width="88" height="88" viewBox="0 0 64 64" fill="none">
           <polygon points="12,8 56,32 12,56" fill="${theme.accent}" opacity="0.22"/>
           <polygon points="16,14 50,32 16,50" stroke="${theme.accentSoft}" stroke-width="3.5" fill="none" stroke-linejoin="round"/>
           <circle cx="28" cy="32" r="5" fill="${theme.accentSoft}"/>
         </svg>
       </div>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    background: linear-gradient(135deg, ${theme.bg} 0%, #09121e 65%, #111c2d 100%);
    color: #f8fafc;
    font-family: ${fontStack};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 56px 68px;
    position: relative;
  }
  .accent-bar {
    position: absolute;
    inset: 0 auto 0 0;
    width: 12px;
    background: linear-gradient(180deg, ${theme.accent} 0%, ${theme.accentSoft} 100%);
  }
  .top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    padding: 9px 20px;
    border-radius: 999px;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.02em;
    background: rgba(255, 255, 255, 0.08);
    border: 1.5px solid rgba(255, 255, 255, 0.16);
    color: ${theme.accentSoft};
  }
  .region-badge {
    font-size: 22px;
    font-weight: 700;
    color: #cbd5e1;
  }
  .middle-row {
    display: flex;
    align-items: center;
    gap: 44px;
    margin: 12px 0;
  }
  .copy {
    flex: 1;
    min-width: 0;
  }
  h1 {
    font-size: 48px;
    line-height: 1.28;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: 18px;
    overflow-wrap: break-word;
  }
  p.sub {
    font-size: 24px;
    line-height: 1.5;
    color: #cbd5e1;
    font-weight: 500;
  }
  .icon-frame {
    flex: 0 0 192px;
    width: 192px;
    height: 192px;
    border-radius: 34px;
    background: rgba(255, 255, 255, 0.06);
    border: 2px solid rgba(255, 255, 255, 0.14);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .icon-frame img {
    width: 168px;
    height: 168px;
    border-radius: 26px;
    object-fit: cover;
  }
  .bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 20px;
    border-top: 2px solid rgba(255, 255, 255, 0.12);
    font-size: 22px;
    font-weight: 700;
    color: #94a3b8;
  }
  .brand {
    color: #f8fafc;
    font-size: 24px;
  }
</style>
</head>
<body>
  <div class="accent-bar"></div>
  <div class="top-row">
    <span class="pill">${escapeHtml(category)}</span>
    <span class="region-badge">${escapeHtml(theme.domainLabel)}</span>
  </div>
  <div class="middle-row">
    <div class="copy">
      <h1 id="card-title">${escapeHtml(title)}</h1>
      <p class="sub">${escapeHtml(subtitle)}</p>
    </div>
    ${iconBlock}
  </div>
  <div class="bottom-row">
    <span class="brand">${escapeHtml(theme.brand)}</span>
    <span>playpoint-sim.com</span>
  </div>
</body>
</html>`;
}

async function generateAll(rootDir = ROOT) {
  const { chromium } = require('playwright-core');
  const onlyMissing = process.argv.includes('--only-missing');
  const targets = collectFallbackPages(rootDir).filter(rel => {
    if (!onlyMissing) return true;
    const outPath = path.join(rootDir, ogpPathForRelativePage(rel));
    return !fs.existsSync(outPath);
  });
  const browser = await chromium.launch(
    process.env.PLAYPOINT_CHROME_PATH
      ? { executablePath: process.env.PLAYPOINT_CHROME_PATH, headless: true }
      : { channel: 'msedge', headless: true }
  );

  try {
    const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    const page = await context.newPage();

    // 1. Render all dedicated page/game OGP cards
    let count = 0;
    for (const rel of targets) {
      const info = extractPageInfo(rootDir, rel);
      const html = buildCardHtml(info);
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => {
        const h1 = document.getElementById('card-title');
        let size = 48;
        while (h1 && h1.scrollHeight > 220 && size > 30) {
          size -= 2;
          h1.style.fontSize = size + 'px';
        }
      });
      const outPath = path.join(rootDir, info.outRel);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      await page.screenshot({ path: outPath, type: 'jpeg', quality: 90 });
      count += 1;
    }

    // 2. Refresh 2026-10-23-seven-eleven-gift-card-lottery.jpg for ended status
    const sevenHtml = buildCardHtml({
      loc: 'ja',
      title: '【応募・抽選終了】セブンのGoogle Playギフトカード抽選｜1万円で100pt保証の条件',
      subtitle: '購入11/15・応募11/16・抽選11/17で受付終了。10口抽選条件の記録と現在の購入先比較。',
      category: 'キャンペーン記録',
      gameIconDataUri: null
    });
    await page.setContent(sevenHtml, { waitUntil: 'load' });
    await page.evaluate(() => {
      const h1 = document.getElementById('card-title');
      let size = 48;
      while (h1 && h1.scrollHeight > 220 && size > 30) {
        size -= 2;
        h1.style.fontSize = size + 'px';
      }
    });
    await page.screenshot({
      path: path.join(rootDir, 'articles/ogp/2026-10-23-seven-eleven-gift-card-lottery.jpg'),
      type: 'jpeg',
      quality: 90
    });

    console.log(`Generated ${count} site/game OGP cards + refreshed Seven-Eleven OGP.`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  generateAll().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { ogpPathForRelativePage, collectFallbackPages, extractPageInfo, generateAll };
