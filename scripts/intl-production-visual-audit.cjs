'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://playpoint-sim.com/';
const CHROME_PATH = process.env.CHROME_PATH;
const OUTPUT = path.resolve(process.env.AUDIT_OUTPUT || 'intl-visual-audit-artifacts');
const LOCALES = ['en', 'ko', 'tw'];
const VIEWPORTS = [
  { key: 'desktop', width: 1440, height: 1000 },
  { key: 'mobile', width: 390, height: 844 }
];

if (!CHROME_PATH) throw new Error('CHROME_PATH is required');
fs.rmSync(OUTPUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUTPUT, 'screenshots'), { recursive: true });

function slug(value) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '');
}

function articlePaths() {
  const rows = [];
  for (const locale of LOCALES) {
    const dir = path.resolve(locale, 'articles');
    for (const file of fs.readdirSync(dir).filter(x => x.endsWith('.html')).sort()) {
      rows.push({ locale, file, url: new URL(`${locale}/articles/${file}`, BASE_URL).href, isIndex: file === 'index.html' });
    }
  }
  return rows;
}

function issue(severity, code, detail) {
  return { severity, code, detail };
}

async function inspectPage(page, entry, viewport) {
  const response = await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(120);
  const status = response ? response.status() : null;

  const metrics = await page.evaluate(({ isIndex, viewportKey, locale }) => {
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => [...document.querySelectorAll(selector)];
    const visible = el => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
    const box = el => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const css = el => el ? getComputedStyle(el) : null;
    const approxLines = el => {
      if (!visible(el)) return 0;
      const s = css(el);
      const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.2;
      return Math.max(1, Math.round(el.getBoundingClientRect().height / lh));
    };
    const lineProfile = el => {
      if (!visible(el)) return null;
      const text = (el.textContent || '').trim();
      if (!text) return null;
      const rootRect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const mirror = document.createElement('div');
      mirror.style.position = 'fixed';
      mirror.style.left = '-10000px';
      mirror.style.top = '0';
      mirror.style.width = `${rootRect.width}px`;
      mirror.style.font = cs.font;
      mirror.style.fontSize = cs.fontSize;
      mirror.style.fontWeight = cs.fontWeight;
      mirror.style.fontFamily = cs.fontFamily;
      mirror.style.letterSpacing = cs.letterSpacing;
      mirror.style.lineHeight = cs.lineHeight;
      mirror.style.whiteSpace = cs.whiteSpace;
      mirror.style.wordBreak = cs.wordBreak;
      mirror.style.overflowWrap = cs.overflowWrap;
      mirror.style.textWrap = cs.textWrap;
      mirror.style.visibility = 'hidden';
      mirror.style.pointerEvents = 'none';
      mirror.style.padding = '0';
      mirror.style.border = '0';
      mirror.style.margin = '0';
      mirror.textContent = text;
      document.body.appendChild(mirror);
      const range = document.createRange();
      range.selectNodeContents(mirror);
      const rects = [...range.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5);
      mirror.remove();
      if (!rects.length) return { lines: approxLines(el), lastWidthRatio: 1, text };
      const lines = [];
      for (const r of rects) {
        let line = lines.find(l => Math.abs(l.top - r.top) < 2);
        if (!line) { line = { top: r.top, left: r.left, right: r.right }; lines.push(line); }
        else { line.left = Math.min(line.left, r.left); line.right = Math.max(line.right, r.right); }
      }
      lines.sort((a, b) => a.top - b.top);
      const last = lines[lines.length - 1];
      const lastWidthRatio = Math.min(1, Math.max(0, (last.right - last.left) / Math.max(1, rootRect.width)));
      return { lines: lines.length, lastWidthRatio, text };
    };

    const root = document.documentElement;
    const body = document.body;
    const main = $('main.main-card');
    const layout = $('.intl-layout-container');
    const sidebar = $('.intl-article-sidebar');
    const h1 = $('.hero h1, main h1');
    const breadcrumbs = $('.intl-article-breadcrumbs nav');
    const ctaButtons = $$('.content .cta-box .cta-btn, .article-calculator-prompt__button').filter(visible);
    const tables = $$('table').filter(visible);
    const images = $$('main img').filter(visible);
    const headings = $$('main h1, main h2, main h3').filter(visible);
    const sidebarLinks = $$('.intl-article-sidebar .sidebar-article-list a').filter(visible);
    const nav = $('.global-nav-inner');

    const tableChecks = tables.map(t => {
      const parent = t.closest('.table-wrap, .table-card') || t.parentElement;
      const tr = t.getBoundingClientRect();
      const pr = parent ? parent.getBoundingClientRect() : null;
      return {
        width: tr.width,
        pageOverflow: tr.right > root.clientWidth + 2,
        parentOverflowX: parent ? css(parent).overflowX : null,
        parentWidth: pr ? pr.width : null,
        needsOwnScroll: !!pr && tr.width > pr.width + 2
      };
    });

    return {
      title: document.title,
      lang: document.documentElement.lang,
      viewport: { width: innerWidth, height: innerHeight, key: viewportKey },
      documentWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      bodyWidth: body.scrollWidth,
      horizontalOverflow: Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth,
      main: box(main),
      layout: box(layout),
      sidebar: box(sidebar),
      sidebarDisplay: sidebar ? css(sidebar).display : null,
      layoutFlexDirection: layout ? css(layout).flexDirection : null,
      h1: h1 ? { ...box(h1), lines: approxLines(h1), profile: lineProfile(h1), textWrap: css(h1).textWrap, overflow: h1.scrollWidth - h1.clientWidth } : null,
      headings: headings.map(h => ({ tag: h.tagName, text: (h.textContent || '').trim(), lines: approxLines(h), profile: lineProfile(h), overflow: h.scrollWidth - h.clientWidth, width: h.getBoundingClientRect().width })),
      breadcrumbs: breadcrumbs ? { lines: approxLines(breadcrumbs), height: breadcrumbs.getBoundingClientRect().height, textWrap: css(breadcrumbs).textWrap, overflow: breadcrumbs.scrollWidth - breadcrumbs.clientWidth } : null,
      ctas: ctaButtons.map(el => ({ text: (el.textContent || '').trim(), lines: approxLines(el), overflow: el.scrollWidth - el.clientWidth, width: el.getBoundingClientRect().width, textWrap: css(el).textWrap })),
      sidebarLinks: sidebarLinks.map(el => ({ text: (el.textContent || '').trim(), lines: approxLines(el), overflow: el.scrollWidth - el.clientWidth, width: el.getBoundingClientRect().width, textWrap: css(el).textWrap })),
      tables: tableChecks,
      images: images.map(el => ({ src: el.currentSrc || el.src, overflow: el.getBoundingClientRect().right - root.clientWidth, width: el.getBoundingClientRect().width })),
      nav: nav ? { clientWidth: nav.clientWidth, scrollWidth: nav.scrollWidth, overflowX: css(nav).overflowX } : null,
      isIndex,
      locale
    };
  }, { isIndex: entry.isIndex, viewportKey: viewport.key, locale: entry.locale });

  const issues = [];
  if (status !== 200) issues.push(issue('error', 'http-status', `HTTP ${status}`));
  if (!metrics.main) issues.push(issue('error', 'missing-main', 'main.main-card is missing'));
  if (metrics.horizontalOverflow > 3) issues.push(issue('error', 'page-horizontal-overflow', `${metrics.horizontalOverflow}px wider than viewport`));

  if (!entry.isIndex) {
    if (!metrics.layout) issues.push(issue('error', 'missing-layout', 'international article layout wrapper is missing'));
    if (!metrics.sidebar) issues.push(issue('error', 'missing-sidebar', 'international article sidebar is missing'));
    if (viewport.key === 'desktop' && metrics.sidebar && metrics.main) {
      if (metrics.sidebar.width < 280 || metrics.sidebar.width > 340) issues.push(issue('warn', 'desktop-sidebar-width', `${Math.round(metrics.sidebar.width)}px`));
      if (Math.abs(metrics.sidebar.y - metrics.main.y) > 8) issues.push(issue('warn', 'desktop-sidebar-alignment', `main/sidebar top delta ${Math.round(Math.abs(metrics.sidebar.y - metrics.main.y))}px`));
    }
    if (viewport.key === 'mobile' && metrics.sidebar && metrics.main) {
      if (metrics.sidebar.width > viewport.width + 2) issues.push(issue('error', 'mobile-sidebar-overflow', `${Math.round(metrics.sidebar.width)}px`));
      if (metrics.sidebar.y < metrics.main.bottom - 2) issues.push(issue('error', 'mobile-sidebar-overlap', 'sidebar overlaps article instead of stacking after it'));
    }
  }

  if (metrics.h1) {
    if (metrics.h1.overflow > 2) issues.push(issue('error', 'h1-overflow', `${Math.round(metrics.h1.overflow)}px`));
    const maxLines = viewport.key === 'desktop' ? 3 : 5;
    if (metrics.h1.lines > maxLines) issues.push(issue('warn', 'h1-too-tall', `${metrics.h1.lines} lines: ${metrics.h1.profile?.text || ''}`));
    if ((metrics.h1.profile?.lines || 1) > 1 && metrics.h1.profile.lastWidthRatio < 0.18) issues.push(issue('warn', 'h1-orphan-line', `last line uses ${Math.round(metrics.h1.profile.lastWidthRatio * 100)}% of width`));
  }

  for (const h of metrics.headings) {
    if (h.overflow > 2) issues.push(issue('error', 'heading-overflow', `${h.tag} ${h.text.slice(0, 100)}`));
    const max = viewport.key === 'desktop' ? 3 : 5;
    if (h.lines > max) issues.push(issue('warn', 'heading-too-tall', `${h.tag} ${h.lines} lines: ${h.text.slice(0, 120)}`));
    if ((h.profile?.lines || 1) > 1 && h.profile.lastWidthRatio < 0.12) issues.push(issue('warn', 'heading-orphan-line', `${h.tag} last line ${Math.round(h.profile.lastWidthRatio * 100)}%: ${h.text.slice(0, 120)}`));
  }

  if (metrics.breadcrumbs) {
    if (metrics.breadcrumbs.overflow > 2) issues.push(issue('error', 'breadcrumb-overflow', `${Math.round(metrics.breadcrumbs.overflow)}px`));
    if (metrics.breadcrumbs.lines > (viewport.key === 'desktop' ? 2 : 4)) issues.push(issue('warn', 'breadcrumb-too-tall', `${metrics.breadcrumbs.lines} lines`));
  }

  for (const cta of metrics.ctas) {
    if (cta.overflow > 2) issues.push(issue('error', 'cta-overflow', `${Math.round(cta.overflow)}px: ${cta.text}`));
    if (cta.lines > 3) issues.push(issue('warn', 'cta-too-tall', `${cta.lines} lines: ${cta.text}`));
  }
  for (const link of metrics.sidebarLinks) {
    if (link.overflow > 2) issues.push(issue('error', 'sidebar-link-overflow', `${Math.round(link.overflow)}px: ${link.text}`));
    if (viewport.key === 'desktop' && link.lines > 4) issues.push(issue('warn', 'sidebar-link-too-tall', `${link.lines} lines: ${link.text}`));
  }

  metrics.tables.forEach((t, index) => {
    if (t.pageOverflow && !(t.needsOwnScroll && ['auto', 'scroll'].includes(t.parentOverflowX))) issues.push(issue('error', 'table-page-overflow', `table ${index + 1} exceeds viewport without scroll wrapper`));
  });
  metrics.images.forEach((img, index) => {
    if (img.overflow > 3) issues.push(issue('error', 'image-overflow', `image ${index + 1} exceeds viewport by ${Math.round(img.overflow)}px`));
  });

  const screenshotName = `${entry.locale}-${viewport.key}-${slug(entry.file.replace(/\.html$/, ''))}.jpg`;
  await page.screenshot({ path: path.join(OUTPUT, 'screenshots', screenshotName), type: 'jpeg', quality: 58, fullPage: false });
  if (issues.some(x => x.severity === 'error')) await page.screenshot({ path: path.join(OUTPUT, 'screenshots', `${screenshotName.replace(/\.jpg$/, '')}-FULL.jpg`), type: 'jpeg', quality: 55, fullPage: true });

  return { ...entry, viewport: viewport.key, status, metrics, issues, screenshot: screenshotName };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const entries = articlePaths();
  const results = [];
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, locale: 'en-US' });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        process.stdout.write(`[${viewport.key}] ${i + 1}/${entries.length} ${entry.locale}/${entry.file} ... `);
        try {
          const row = await inspectPage(page, entry, viewport);
          results.push(row);
          console.log(`HTTP ${row.status} / ${row.issues.filter(x => x.severity === 'error').length} errors / ${row.issues.filter(x => x.severity === 'warn').length} warns`);
        } catch (error) {
          console.log(`FAILED: ${error.message}`);
          results.push({ ...entry, viewport: viewport.key, status: null, metrics: null, issues: [issue('error', 'audit-exception', error.stack || error.message)] });
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    pageCount: entries.length,
    renderCount: results.length,
    countsByLocale: Object.fromEntries(LOCALES.map(locale => [locale, entries.filter(x => x.locale === locale).length])),
    issueCounts: {
      errors: results.reduce((n, r) => n + r.issues.filter(x => x.severity === 'error').length, 0),
      warnings: results.reduce((n, r) => n + r.issues.filter(x => x.severity === 'warn').length, 0),
      affectedRenders: results.filter(r => r.issues.length).length,
      affectedPages: new Set(results.filter(r => r.issues.length).map(r => `${r.locale}/${r.file}`)).size
    },
    byCode: [...results.flatMap(r => r.issues.map(x => x.code)).reduce((m, code) => m.set(code, (m.get(code) || 0) + 1), new Map()).entries()].sort((a,b) => b[1]-a[1])
  };
  fs.writeFileSync(path.join(OUTPUT, 'report.json'), JSON.stringify({ summary, results }, null, 2));
  fs.writeFileSync(path.join(OUTPUT, 'summary.json'), JSON.stringify(summary, null, 2));
  const flagged = results.filter(r => r.issues.length).map(r => ({ locale: r.locale, file: r.file, viewport: r.viewport, issues: r.issues, screenshot: r.screenshot }));
  fs.writeFileSync(path.join(OUTPUT, 'flagged.json'), JSON.stringify(flagged, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (summary.issueCounts.errors > 0) process.exitCode = 2;
})();
