'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PAGES = ['/', '/games/', '/games/nikke/', '/campaign/3x/', '/campaign/wait/', '/compare/earning-rates/', '/maintenance/diamond/', '/amount/10000/', '/blog/', '/latest/', '/author/katakata.html', '/info.html', '/embed.html', '/sitemap.html', '/privacy.html', '/changelog.html'];
const SCROLL_REGIONS = ':is(.lp-table-wrap,.pack-table-wrap,.comparison-reference-table-wrap,.table-wrap,.table-card,.table-wrapper)[tabindex="0"], pre[tabindex="0"]';

// CSSの色から計算する。グラデーションは各層の全停止色と補間区間を含む保守的な範囲を使う。
// 画像・グループ透明度など評価できない背景は不明として返し、合格に混ぜない。
function measureTextContrast(scope = "body") {
  const parse = value => {
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(/[, /]+/).map(Number);
    return [parts[0], parts[1], parts[2], parts[3] ?? 1];
  };
  const blend = (color, bg) => color.slice(0, 3).map((v, i) => v * color[3] + bg[i] * (1 - color[3]));
  const luminance = color => color.map(v => {
    v /= 255;
    return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const layers = value => {
    let depth = 0, start = 0;
    const result = [];
    for (let i = 0; i < value.length; i++) {
      if (value[i] === '(') depth++;
      if (value[i] === ')') depth--;
      if (value[i] === ',' && depth === 0) { result.push(value.slice(start, i)); start = i + 1; }
    }
    result.push(value.slice(start));
    return result.reverse();
  };
  const measurements = [];
  const elements = [...document.querySelectorAll(scope)].flatMap(root => [root, ...root.querySelectorAll('*')]);
  for (const element of elements) {
    const text = [...element.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    if (!text || element.closest(':disabled,[aria-disabled="true"]') || !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) || !element.getBoundingClientRect().width) continue;
    const chain = [];
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) chain.unshift(ancestor);
    let low = [255, 255, 255], high = [255, 255, 255];
    const unknown = [];
    for (const ancestor of chain) {
      const style = getComputedStyle(ancestor);
      const bg = parse(style.backgroundColor);
      if (bg) { low = blend(bg, low); high = blend(bg, high); }
      if (+style.opacity < 1) unknown.push('group opacity');
      if (style.backgroundImage === 'none' || style.backgroundClip === 'text' || style.webkitBackgroundClip === 'text') continue;
      for (const layer of layers(style.backgroundImage)) {
        if (!layer.includes('gradient(')) { unknown.push('background image'); continue; }
        const stops = (layer.match(/rgba?\([^)]+\)/g) || []).map(parse);
        if (!stops.length) { unknown.push('unsupported gradient'); continue; }
        const lower = stops.map(c => blend(c, low)), upper = stops.map(c => blend(c, high));
        low = low.map((_, i) => Math.min(...lower.map(c => c[i])));
        high = high.map((_, i) => Math.max(...upper.map(c => c[i])));
      }
    }
    const style = getComputedStyle(element);
    const foreground = parse(style.webkitTextFillColor || style.color);
    if (!foreground) { unknown.push('unsupported foreground'); continue; }
    let fgLow, fgHigh;
    if ((style.backgroundClip === 'text' || style.webkitBackgroundClip === 'text') && foreground[3] === 0) {
      const stops = (style.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse);
      if (!stops.length) { unknown.push('unsupported text gradient'); continue; }
      fgLow = low.map((_, i) => Math.min(...stops.map(c => blend(c, low)[i])));
      fgHigh = high.map((_, i) => Math.max(...stops.map(c => blend(c, high)[i])));
    } else { fgLow = blend(foreground, low); fgHigh = blend(foreground, high); }
    const bgMin = luminance(low), bgMax = luminance(high), fgMin = luminance(fgLow), fgMax = luminance(fgHigh);
    const ratio = fgMax < bgMin ? (bgMin + .05) / (fgMax + .05) : fgMin > bgMax ? (fgMin + .05) / (bgMax + .05) : 1;
    const required = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.6667 && parseFloat(style.fontWeight) >= 700) ? 3 : 4.5;
    measurements.push({ text: text.slice(0, 100), selector: element.id ? '#' + element.id : element.tagName.toLowerCase() + '.' + [...element.classList].join('.'), ratio, required, color: style.color, unknown });
  }
  return measurements;
}

async function verifyCommonAccessibility(browser, baseUrl, blockExternalRequests, artifactDir) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block', locale: 'ja-JP' });
  await blockExternalRequests(context, new URL(baseUrl).origin);
  // 外部共有画面はテスト内の応答に置換し、投稿せずopenerと送信URLだけ確認する。
  await context.route(/https:\/\/(?:twitter\.com|x\.com)\/intent\//, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Share test</title>' }));
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const report = { passed: false, pages: [], shares: [] };
  try {
    // 測定器が低コントラスト・透明文字・多層グラデーションを見逃さないことを確認する。
    await page.setContent('<p style="background:linear-gradient(#fff,#eee);color:#fff">bad</p><p style="background:linear-gradient(#fff,#eee);color:#111">good</p><p style="background:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)),linear-gradient(#fff,#fff);color:#777">layered</p>');
    const fixture = await page.evaluate(measureTextContrast);
    assert.ok(fixture.find(v => v.text === 'bad').ratio < 4.5);
    assert.ok(fixture.find(v => v.text === 'good').ratio >= 4.5);
    assert.ok(fixture.find(v => v.text === 'layered').ratio < 4.5);
    for (const pathname of PAGES) {
      const row = { path: pathname, states: [], keyboardScroll: [], passed: false };
      report.pages.push(row);
      await page.setViewportSize({ width: 390, height: 844 });
      const response = await page.goto(new URL(pathname, baseUrl).href, { waitUntil: 'load' });
      assert.ok(response?.ok(), pathname + ': HTTP ' + response?.status());
      if (pathname === '/') {
        await page.waitForFunction(() => document.querySelector('#currentStatus')?.options.length >= 2);
        await page.locator('#neededPoints').fill('100');
        await page.locator('#calculateButton').click();
      }
      async function contrast(state) {
        await page.waitForTimeout(200);
        const values = await page.evaluate(measureTextContrast, pathname === '/' ? '#mainMode, #reverseMode, #diaryMode' : 'body');
        const failures = values.filter(v => v.ratio + 1e-6 < v.required || v.unknown.length);
        row.states.push({ state, textCount: values.length, minimumRatio: Math.min(...values.map(v => v.ratio)), failures });
        assert.deepEqual(failures, [], pathname + '/' + state + ': 文字のコントラスト');
      }
      await contrast('normal');
      for (const selector of ['.lp-primary-link', '.lp-affiliate-btn', '.game-giftcard-cta-btn', '.sort-btn.active', '.filter-bar button.active', '.benefit-tabs button[aria-selected="true"]', '.copy-btn', '#calculateButton', '#tweetButton', '.timeline-body a', '.breadcrumb a']) {
        const target = page.locator(selector).filter({ visible: true }).first();
        if (!await target.count()) continue;
        await target.hover();
        await contrast('hover ' + selector);
        await page.mouse.move(0, 0);
        await target.focus();
        await contrast('focus ' + selector);
      }
      if (await page.locator('#theme-toggle').count()) {
        await page.setViewportSize({ width: 1440, height: 844 });
        await page.locator('#theme-toggle').click();
        await page.setViewportSize({ width: 390, height: 844 });
        await contrast('dark theme');
        await page.setViewportSize({ width: 1440, height: 844 });
        await page.locator('#theme-toggle').click();
      }
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), pathname + '/' + width + ': ページ全体の横溢れ');
        const regions = page.locator(SCROLL_REGIONS);
        for (let i = 0; i < await regions.count(); i++) {
          const region = regions.nth(i);
          if (!await region.isVisible()) continue;
          const size = await region.evaluate(el => ({ max: el.scrollWidth - el.clientWidth, name: el.getAttribute('aria-label') || document.getElementById(el.getAttribute('aria-labelledby'))?.textContent }));
          assert.ok(size.name?.trim(), pathname + ': 表・コード領域の名前');
          if (size.max <= 1) continue;
          await region.focus();
          await page.keyboard.press('Tab');
          await page.keyboard.press('Shift+Tab');
          assert.equal(await region.evaluate(el => el === document.activeElement && getComputedStyle(el).outlineStyle !== 'none' && parseFloat(getComputedStyle(el).outlineWidth) >= 2), true, pathname + ': キーボードフォーカス');
          await region.evaluate(el => { el.scrollLeft = 0; });
          await page.keyboard.press('ArrowRight');
          await page.waitForFunction(el => el.scrollLeft > 0, await region.elementHandle());
          const right = await region.evaluate(el => el.scrollLeft);
          await page.keyboard.press('ArrowLeft');
          await page.waitForFunction(({ el, right }) => el.scrollLeft < right, { el: await region.elementHandle(), right });
          row.keyboardScroll.push({ width, name: size.name, max: size.max, right });
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      if (pathname === '/privacy.html' || pathname === '/blog/') {
        const links = pathname === '/privacy.html' ? page.locator('.container p a') : page.locator('.breadcrumb a');
        assert.ok(await links.count());
        assert.ok(await links.evaluateAll(elements => elements.every(el => getComputedStyle(el).textDecorationLine.includes('underline'))), pathname + ': 色以外のリンク識別');
      }
      if (pathname === '/changelog.html') {
        const size = await page.locator('.page-footer a[href="sitemap.html"]').evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
        assert.ok(size.width >= 24 && size.height >= 24, 'サイトマップリンクの操作サイズ');
        row.footerTarget = size;
      }
      async function share(selector, kind) {
        const opened = context.waitForEvent('page');
        await page.locator(selector).click();
        const popup = await opened;
        await popup.waitForLoadState('load');
        assert.equal(await popup.evaluate(() => window.opener === null), true, kind + ': openerが切断される');
        const url = new URL(popup.url());
        assert.match(url.hostname, /^(?:twitter|x)\.com$/);
        const payload = [...url.searchParams.values()].join(' ');
        const sharedUrls = (payload.match(/https?:\/\/[^\s]+/g) || []).map(value => new URL(value));
        assert.ok(sharedUrls.some(value => [new URL(baseUrl).hostname, 'playpoint-sim.com'].includes(value.hostname)), kind + ': 共有先URL');
        if (kind === 'main' || kind === 'reverse') assert.ok(sharedUrls.some(value => value.searchParams.get('mode') === kind), kind + ': 計算条件の共有');
        report.shares.push({ kind, openerNull: true, hasShareUrl: true });
        await popup.close();
      }
      if (pathname === '/') {
        await share('#tweetButton', 'main');
        await page.locator('#neededPoints').fill('-1');
        await page.locator('#calculateButton').click();
        await contrast('invalid input');
        await page.locator('#tab-reverse').click();
        await page.locator('#amountYen').fill('1000');
        await page.locator('#reverseCalculateButton').click();
        await contrast('reverse result');
        await share('#share-twitter-reverse', 'reverse');
        await page.locator('#tab-diary').click();
        const current = page.locator('#weekInputs .is-weekly-current');
        await current.locator('input[type="number"]').fill('15');
        await contrast('diary edit');
        await current.locator('.diary-save-btn').click();
        await contrast('diary saved');
        await share('#weekInputs .is-weekly-current .weekly-result-share', 'diary');
      }
      if (pathname === '/games/nikke/') await share('#btn-share-x', 'game');
      row.passed = true;
      if (artifactDir && ['/amount/10000/', '/embed.html', '/privacy.html', '/changelog.html'].includes(pathname)) await page.screenshot({ path: path.join(artifactDir, 'a11y-' + pathname.replace(/[^a-z0-9]/gi, '-') + '.png'), fullPage: true });
    }
    report.passed = true;
    return report;
  } finally {
    if (artifactDir) {
      fs.mkdirSync(artifactDir, { recursive: true });
      fs.writeFileSync(path.join(artifactDir, 'accessibility.json'), JSON.stringify(report, null, 2));
    }
    await context.close();
  }
}

module.exports = { measureTextContrast, verifyCommonAccessibility };
