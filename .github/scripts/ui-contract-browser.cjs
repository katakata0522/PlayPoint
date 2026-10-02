'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 既存browser-smokeの一部として実行する。外部送信は同じ遮断器へ委譲する。
async function verifyUiContracts(browser, baseUrl, locales, blockExternalRequests, artifactDir) {
  const results = {};
  const contexts = [];
  async function open(relative, options = {}, init) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'Asia/Tokyo', ...options });
    contexts.push(context);
    await blockExternalRequests(context, new URL(baseUrl).origin);
    if (init) await context.addInitScript(init);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(new URL(relative, baseUrl).href, { waitUntil: 'load' });
    assert.ok(response?.ok(), relative + ': HTTP');
    return { page, context, errors };
  }
  try {
    // 実タブのselected/tabindex/panel/focusを6地域で往復する。
    results.tabs = [];
    for (const locale of locales) {
      const { page, errors } = await open(locale.path, { locale: locale.locale });
      await page.waitForFunction(() => document.querySelector('#currentStatus')?.options.length > 1);
      await page.locator('#tab-main').focus();
      for (const [key, id, panel] of [['ArrowRight','tab-reverse','reverseMode'], ['End','tab-diary','diaryMode'], ['Home','tab-main','mainMode'], ['ArrowLeft','tab-diary','diaryMode']]) {
        await page.keyboard.press(key);
        await page.locator('#' + panel).waitFor({ state: 'visible' });
        assert.equal(await page.locator('#' + id).getAttribute('aria-selected'), 'true', locale.key);
        assert.equal(await page.locator('#' + id).getAttribute('tabindex'), '0', locale.key);
        assert.equal(await page.locator('[role="tab"][tabindex="0"]').count(), 1, locale.key);
        assert.ok(await page.locator('#' + id).evaluate(el => el === document.activeElement), locale.key + ': keyboard focus');
      }
      // 端末保存地域をわざと別地域にしても実URLが優先する。
      await page.evaluate(() => localStorage.setItem('playpointRegion', 'TW'));
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('#currentStatus')?.options.length > 1);
      assert.equal(await page.locator('.region-switch button.active').getAttribute('data-region'), locale.key);
      assert.deepEqual(errors, [], locale.key);
      results.tabs.push({ region: locale.key, keyboard: true, pathPriority: true });
    }

    // 2つの固定日からGoogle URLと実ダウンロード内容を確認。Googleへ移動しない。
    results.calendar = [];
    for (const fixture of [
      { path: '', now: '2026-10-01T12:00:00Z', start: '20261002T010000Z', end: '20261002T020000Z' },
      { path: 'en/', now: '2026-10-02T15:00:00Z', start: '20261009T140000Z', end: '20261009T150000Z' }
    ]) {
      const { page } = await open(fixture.path);
      await page.clock.setFixedTime(new Date(fixture.now));
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('#currentStatus')?.options.length > 1);
      await page.locator('#tab-diary').click();
      await page.locator('#weekInputs .week-row').first().waitFor();
      const google = new URL(await page.locator('#register-google-cal-btn').getAttribute('href'));
      assert.equal(google.hostname, 'calendar.google.com');
      assert.equal(google.searchParams.get('dates'), fixture.start + '/' + fixture.end);
      const downloadPromise = page.waitForEvent('download');
      // 年間記録/バックアップのdetailsにある実ボタンを開く。
      await page.locator('#download-ical-btn').evaluate(el => { for (let p=el.parentElement;p;p=p.parentElement) if(p.tagName==='DETAILS')p.open=true; });
      await page.locator('#download-ical-btn').click();
      const download = await downloadPromise;
      const bytes = fs.readFileSync(await download.path(), 'utf8');
      assert.ok(bytes.includes('DTSTART:' + fixture.start + '\r\n'));
      assert.ok(bytes.includes('DTEND:' + fixture.end + '\r\n'));
      assert.ok(bytes.includes('RRULE:FREQ=WEEKLY;BYDAY=FR'));
      assert.match(download.suggestedFilename(), /\.ics$/);
      results.calendar.push({ ...fixture, google: true, ics: true });
    }

    // 比較記事: 目次生成後のDOM、実再計算、読み上げ、狭幅の操作。
    const rounding = await open('articles/2026-07-24-play-points-1-value.html');
    const rp = rounding.page;
    await rp.locator('#rounding-result').waitFor();
    await rp.locator('#rounding-result').scrollIntoViewIfNeeded();
    await rp.waitForFunction(()=>document.querySelector('#rounding-result')?.textContent.trim());
    await rp.waitForFunction(()=>document.querySelector('#rounding-result')?.innerText.trim());
    assert.equal(await rp.locator('.rounding-jump').count(), 1);
    assert.equal(await rp.locator('.article-next-step-cta').count(), 1);
    assert.equal(await rp.locator('.contextual-guide-links.related-links-section').count(), 1);
    assert.match(await rp.locator('#rounding-result').innerText(), /1ポイント多い/);
    assert.equal(await rp.locator('#rounding-result').getAttribute('aria-live'), 'off');
    await rp.locator('#rounding-price').fill('200');
    await rp.locator('#rounding-calculate').click();
    assert.match(await rp.locator('#rounding-result').innerText(), /差はありません/);
    assert.equal(await rp.locator('#rounding-result').getAttribute('role'), 'status');
    assert.equal(await rp.locator('#rounding-result').getAttribute('aria-live'), 'polite');
    await rp.locator('#rounding-count').fill('0');
    await rp.locator('#rounding-calculate').click();
    assert.match(await rp.locator('#rounding-result').innerText(), /購入回数/);
    await rp.locator('[aria-controls="guide-toc"]').click();
    const toc = await rp.locator('#guide-toc a').evaluateAll(nodes => nodes.map(el => {const target=document.querySelector(el.getAttribute('href'));return {href:el.getAttribute('href'),auxiliary:!!target?.closest('.faq,.contextual-guide-links')};}));
    assert.ok(toc.length > 0, '実目次が生成されない');
    assert.ok(toc.every(link => !link.auxiliary), 'FAQ/補助導線が目次へ混入');
    await rp.keyboard.press('Escape');
    results.rounding = [];
    for (const width of [320,390,1280]) {
      await rp.setViewportSize({ width, height: 900 });
      const state = await rp.evaluate(() => ({ overflow: document.documentElement.scrollWidth-innerWidth,
        cells: [...document.querySelectorAll('.rounding-table td')].map(el => ({display:getComputedStyle(el).display,label:getComputedStyle(el,'::before').content})),
        buttons: [...document.querySelectorAll('.rounding-jump__button,.rounding-action')].map(el=>{const r=el.getBoundingClientRect();return {width:r.width,left:r.left,right:r.right,height:r.height};}) }));
      assert.ok(state.overflow<=1, '比較記事の横はみ出し: '+width);
      assert.ok(state.buttons.length>0 && state.buttons.every(r=>r.width>0&&r.height>=40&&r.left>=-1&&r.right<=width+1));
      if(width<=390)assert.ok(state.cells.every(c=>['block','grid'].includes(c.display)&&c.label!=='none'&&c.label!=='normal'), 'カードの項目名欠落');
      results.rounding.push({width,...state});
    }

    // あとがきの戻りボタンは計算機との往復と実コントラストを担当する。
    const info = await open('info.html');
    assert.equal(await info.page.locator('.top-bar,.lang-nav').count(),0);
    assert.equal(await info.page.locator('style[data-weekly-reward-ui]').count(),0);
    await info.page.locator('#btn-back-home').waitFor({state:'visible'});
    for(const width of [320,390,1280]) {
      await info.page.setViewportSize({width,height:900});
      const button=info.page.locator('#btn-back-home');
      const state=await button.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {left:r.left,right:r.right,width:r.width,color:s.color,background:s.backgroundColor};});
      assert.ok(state.width>0&&state.left>=-1&&state.right<=width+1);
      assert.notEqual(state.color,state.background,'あとがきの文字と背景が同色');
    }
    await info.page.locator('#btn-back-home').click();
    await info.page.locator('#calculateButton').waitFor({state:'visible'});
    results.info={returnNavigation:true};

    // content-visibilityは先頭を遅延せず、印刷で全sectionを描画する。
    const print = await open('articles/2025-12-25-best-use.html');
    const visibility=()=>[...document.querySelectorAll('.content > .section')].map(el=>getComputedStyle(el).contentVisibility);
    const screen=await print.page.evaluate(visibility);
    assert.ok(screen.length>=3 && screen[0]==='visible' && screen.includes('auto'));
    await print.page.emulateMedia({media:'print'});
    const paper=await print.page.evaluate(visibility);
    assert.ok(paper.every(v=>v==='visible'),'印刷時のsection描画');
    results.print={screen,paper};

    const home=await open('');
    await home.page.waitForFunction(()=>document.querySelector('#currentStatus')?.options.length>1);
    assert.equal(await home.page.evaluate(()=>performance.getEntriesByType('resource').some(entry=>new URL(entry.name).pathname==='/js/home-experience.js')),false,'初期表示で補助ガイドを先読みしない');
    const lowerRequests=[];
    home.page.on('request',request=>lowerRequests.push(new URL(request.url()).pathname));
    await home.page.locator('#tab-diary').click();
    await home.page.locator('.mode-context-grid').waitFor({state:'visible'});
    results.home=[];
    for(const width of [320,390,760]) {
      await home.page.setViewportSize({width,height:900});
      const state=await home.page.locator('.mode-context-grid').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,
        links:[...el.querySelectorAll('a')].map(a=>({href:a.href,text:a.textContent,width:a.getBoundingClientRect().width}))}));
      assert.equal(state.columns,width<=340?1:2);
      const targets=state.links.map(link=>new URL(link.href).pathname);
      assert.deepEqual(targets,['/articles/2025-12-25-weekly-reward.html','/articles/2026-08-16-weekly-reward-not-showing.html','/articles/2026-07-31-super-weekly-reward.html','/articles/2026-08-05-play-points-levels-guide.html']);
      assert.ok(state.links.every(link=>link.width>0&&link.text.trim()),JSON.stringify(state));
      results.home.push({width,...state});
    }
    await home.page.locator('#tab-main').click();
    await home.page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
    const back=home.page.locator('#back-to-top');
    await back.waitFor({state:'visible'});
    const backBox=await back.boundingBox();assert.ok(backBox.width>=44&&backBox.height>=44);
    await back.click();
    await home.page.waitForFunction(()=>scrollY===0);
    assert.ok(lowerRequests.includes('/js/home-experience.js'),'モード操作から遅延moduleを読まない');
    for(const width of [390,1280]) {
      await home.page.setViewportSize({width,height:900});
      const links=home.page.locator('.top-bar .header-links a');
      assert.ok(await links.count()>0);
      for(const link of await links.all())assert.equal(await link.isVisible(),true,'現行のヘッダー導線: '+width);
    }

    // 初回画像だけ優先し、後続は実observer通知でロードする。unsafe URLはplaceholderへ。
    const thumbnails=await open('blog/',{},()=>{
      window.__imageObservers=[];
      window.IntersectionObserver=class {
        constructor(callback){this.callback=callback;this.targets=new Set();window.__imageObservers.push(this);}
        observe(el){this.targets.add(el);} unobserve(el){this.targets.delete(el);} disconnect(){this.targets.clear();}
      };
    });
    const fixture=['../images/game-icons/fgo.webp','../articles/ogp/2025-12-25-best-use.png','https://unsafe.example/image.png','//unsafe.example/x.png','../images/game-icons/../bad.webp'];
    await thumbnails.context.route('**/blog/articles.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture.map((thumbnail,i)=>({id:'probe-'+i,title:'Audit '+i,date:'2026-09-01',description:'Guide',category:'使い方',file:'../articles/2025-12-25-best-use.html',thumbnail,thumbnailKind:i===0?'app-icon':'generic'})))}));
    await thumbnails.page.reload({waitUntil:'load'});
    await thumbnails.page.waitForFunction(()=>document.querySelectorAll('.article-card').length===5);
    const images=thumbnails.page.locator('.article-card img');
    assert.equal(await images.first().getAttribute('loading'),'eager');
    assert.equal(await images.first().getAttribute('fetchpriority'),'high');
    assert.match(await images.first().getAttribute('src'),/images\/game-icons\/fgo\.webp$/);
    for(let i=1;i<5;i++) {
      assert.equal(await images.nth(i).getAttribute('loading'),'lazy');
      assert.equal(await images.nth(i).getAttribute('fetchpriority'),'low');
      if(i>=2)assert.equal(await images.nth(i).getAttribute('data-src'),'/images/article-placeholder.svg');
    }
    await thumbnails.page.evaluate(()=>{for(const observer of window.__imageObservers){const nodes=[...observer.targets].filter(el=>el.matches('img[data-src]'));if(nodes.length)observer.callback(nodes.map(target=>({target,isIntersecting:true})),observer);}});
    await thumbnails.page.waitForFunction(()=>![...document.querySelectorAll('.article-card img')].some(el=>el.hasAttribute('data-src')));
    assert.ok(await images.evaluateAll(nodes=>nodes.every(el=>new URL(el.src).origin===location.origin)));
    results.thumbnails={count:5,priority:true,deferred:true,unsafeFallback:3};

    // clipboardはテスト内へ差し替え、成功時だけ共通trackを呼ぶ。
    results.embed=[];
    for(const [locale,expected] of [['zh-HK','/hk/'],['en-IN','/in/']]) {
      const {page}=await open('embed.html',{locale},()=>{
        window.__copies=[];window.__copyEvents=[];
        Object.defineProperty(navigator,'clipboard',{value:{writeText(value){window.__copies.push(value);return window.__copyReject?Promise.reject(Error('fixture denied')):Promise.resolve();}}});
      });
      await page.evaluate(()=>{window.PlayPointAnalytics={track:(...args)=>{window.__copyEvents.push(args);return true;}};});
      assert.equal(new URL(await page.locator('#footer-calculator-link').getAttribute('href'),page.url()).pathname,expected);
      await page.locator('#btn-copy').click();
      await page.waitForFunction(()=>window.__copyEvents.length===1);
      assert.equal(await page.evaluate(()=>window.__copies[0]),await page.locator('#code-output').textContent());
      assert.equal(await page.evaluate(()=>window.__copyEvents[0][0]),'widget_code_copied');
      page.on('dialog',dialog=>dialog.dismiss());
      await page.evaluate(()=>window.__copyReject=true);
      await page.locator('#btn-copy').click();
      await page.waitForFunction(()=>window.__copies.length===2);
      assert.equal(await page.evaluate(()=>window.__copyEvents.length),1,'失敗コピーを計測しない');
      results.embed.push({locale,path:expected,successOnly:true});
    }

    // サンプル全12記事の文脈navがanswer/calloutに入らず実リンクとして表示される。
    const contextual = require('../../scripts/article-role-next-action-audit.cjs').articleCorpus(path.resolve(__dirname,'../..'))
      .filter(article=>fs.readFileSync(path.resolve(__dirname,'../..',article.relativePath),'utf8').includes('data-contextual-nav="editorial"'));
    results.contextual=[];
    for(const article of contextual) {
      const {page}=await open(article.relativePath);
      const nav=page.locator('nav[data-contextual-nav="editorial"]');
      assert.equal(await nav.count(),1,article.relativePath);
      assert.equal(await nav.evaluate(el=>!!el.closest('.answer-box,.editorial-answer,.callout')),false,article.relativePath);
      for(const width of [320,1280]) {
        await page.setViewportSize({width,height:900});
        await nav.scrollIntoViewIfNeeded();
        assert.ok(await nav.isVisible(),article.relativePath);
        const link=nav.locator('a').first();
        await link.focus();
        assert.ok(await link.evaluate(el=>el===document.activeElement));
        assert.ok(await nav.evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1));
      }
      results.contextual.push(article.relativePath);
    }
    if(artifactDir)fs.writeFileSync(path.join(artifactDir,'ui-contract-report.json'),JSON.stringify({passed:true,...results},null,2));
    return {passed:true,...results};
  } finally { for(const context of contexts)await context.close(); }
}
module.exports={verifyUiContracts};
