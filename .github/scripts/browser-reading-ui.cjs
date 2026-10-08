'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { INTERNATIONAL_LOCALES } = require('../../scripts/locale-ids.cjs');

// 同じPR Gate/本番ブラウザsuiteに統合。外部広告は押さず、故障条件はこのcontextだけへ注入する。
async function verifyReadingUi(browser, baseUrl, blockExternalRequests, artifactDir) {
  const origin = new URL(baseUrl).origin;
  const report = { themes: [], interactions: {}, faults: {}, storage: {}, scope: 'browser; third-party responses stubbed; synthetic storage only' };
  const contexts = [];
  let lastPage;
  async function context() {
    const value = await browser.newContext({ locale:'ja-JP', timezoneId:'Asia/Tokyo', viewport:{width:390,height:844}, colorScheme:'light', reducedMotion:'reduce' });
    contexts.push(value); await blockExternalRequests(value,origin); return value;
  }
  async function goto(page, route) {
    lastPage = page;
    const response = await page.goto(new URL(route,baseUrl).href,{waitUntil:'domcontentloaded',timeout:45000});
    assert(response?.ok(), route + ' HTTP failure');
  }
  async function waitNavigationLayout(page) {
    // 幅変更の直後はCSSが先に切り替わり、matchMediaの通知でDOMが移動する。
    await page.waitForFunction(() => {
      if (!document.documentElement.classList.contains('guide-navigation-enabled')) return true;
      const menu = document.getElementById('guide-menu');
      const navigation = document.querySelector('.ja-global-nav,.top-bar');
      const mobile = matchMedia(document.documentElement.classList.contains('guide-article-header') ? '(max-width:950px)' : '(max-width:760px)').matches;
      return menu && navigation && menu.contains(navigation) === mobile && (mobile || !menu.open);
    });
  }
  async function openMenu(page) {
    await waitNavigationLayout(page);
    if (await page.locator('.guide-nav-button[aria-controls="guide-menu"]:visible').count() && !(await page.locator('#guide-menu').evaluate(el=>el.open))) await page.locator('[aria-controls="guide-menu"]').click();
  }
  async function closeMenu(page) { if (await page.locator('#guide-menu[open]').count()) await page.keyboard.press('Escape'); }
  async function chooseTheme(page) {
    await openMenu(page);
    const settings=page.locator('.guide-menu-group').filter({has:page.locator('#theme-toggle')});
    if (await settings.count() && !(await settings.evaluate(el=>el.open))) await settings.locator('summary').click();
    await page.locator('#theme-toggle').click(); await closeMenu(page);
  }
  async function cards(page) {
    await page.locator('.article-card').first().waitFor({state:'visible',timeout:30000});
    // 初期カードは台帳より先に読める。操作・カテゴリの検証は取得完了を待つ。
    await page.waitForFunction(() =>
      document.querySelector('#category-filter button.active')
      && document.querySelector('#article-grid')?.getAttribute('aria-busy') !== 'true'
      && document.querySelector('#search-input')?.disabled === false,
      null, {timeout:30000});
  }
  async function openOptionalFilters(page) {
    const panel = page.locator('#article-filter-panel');
    if (!(await panel.evaluate(el => el.open))) await panel.locator('summary').click();
    await page.locator('#sort-toggle').waitFor({state:'visible',timeout:10000});
  }
  async function palette(page, selectors) {
    return page.evaluate(selectors => {
      const rgb = color => (color.match(/[\d.]+/g)||[]).map(Number).slice(0,3);
      const luminance = color => rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      return selectors.flatMap(selector=>{
        const elements=[...document.querySelectorAll(selector)].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
        if(!elements.length) return [{selector,missing:true}];
        return elements.map((el,index)=>{
          let parent=el, bg='rgb(255, 255, 255)';
          while(parent) { const c=getComputedStyle(parent).backgroundColor; if(c!=='rgba(0, 0, 0, 0)'&&c!=='transparent'){bg=c;break;} parent=parent.parentElement; }
          const fg=getComputedStyle(el).color, a=luminance(fg),b=luminance(bg);
          return {selector,index,fg,bg,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
        });
      });
    },selectors);
  }
  try {
    // 台帳の通信を止めても、最初の12件の本文・リンクを利用できる。
    const delayed = await context(), initialPage = await delayed.newPage();
    let releaseCatalog;
    const catalogReady = new Promise(resolve => { releaseCatalog = resolve; });
    await delayed.route('**/blog/articles.json*', async route => { await catalogReady; await route.continue(); });
    await goto(initialPage, 'blog/');
    await initialPage.locator('[data-blog-initial-card]').first().waitFor({state:'visible'});
    assert.equal(await initialPage.locator('.article-card').count(),12);
    const firstCard = await initialPage.locator('.article-card').first().elementHandle();
    const initialTitle = await firstCard.$eval('h3', node => node.textContent);
    assert(initialTitle.trim(), '台帳の追加通信前に見出しを読める');
    assert(await initialPage.locator('#search-input').isDisabled(), '台帳の取得中は検索準備が完了していない');
    releaseCatalog();
    await cards(initialPage);
    await initialPage.locator('.pagination-next').waitFor({state:'visible'});
    assert(await firstCard.evaluate(node => node.isConnected), '同じ初期カードを通信後に作り直さない');
    assert.equal(await initialPage.locator('.article-card').first().locator('h3').textContent(), initialTitle);
    await delayed.close();
    const offline = await context(), offlinePage = await offline.newPage();
    await offline.route('**/blog/articles.json*', route => route.fulfill({status:503,body:'unavailable'}));
    await goto(offlinePage, 'blog/');
    await offlinePage.locator('.error-state').waitFor({state:'visible'});
    assert.equal(await offlinePage.locator('.article-card').count(),12,'通信失敗時も記事リンクを残す');
    await offlinePage.locator('#retry-load').click();
    assert.equal(await offlinePage.locator('.article-card').count(),12,'再試行中も記事リンクを残す');
    await offline.close();
    report.interactions.initialCards = { count:12, retainedAfterCatalog:true, retainedOnFailure:true };
    const c = await context(), page = await c.newPage();
    await goto(page,'blog/'); await cards(page);
    async function verifyArticleNavigation() {
      const unprotected = await page.evaluate(() => [...document.querySelectorAll('a[href]')]
        .filter(link => new URL(link.href).origin === location.origin && link.dataset.googleVignette !== 'false')
        .map(link => link.getAttribute('href')));
      assert.deepEqual(unprotected, [], 'Guide navigation and dynamically rendered results must not trigger vignette ads');
    }
    await verifyArticleNavigation();
    for (const width of [390,1024]) {
      await page.setViewportSize({width,height:844});
      await waitNavigationLayout(page);
      for (const theme of ['light','dark']) {
        if (await page.locator('html').getAttribute('data-reading-theme') !== theme) await chooseTheme(page);
        // The attribute changes synchronously, but color-scheme style resolution can finish on the next paint.
        // Wait for the actual requested surface; an attribute-only match cannot prove that the theme works.
        await page.waitForFunction(t=>{
          if(document.documentElement.dataset.readingTheme!==t) return false;
          const channels=getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g)?.slice(0,3).map(Number)||[];
          return channels.length===3 && (t==='dark' ? Math.max(...channels)<128 : Math.min(...channels)>180);
        },theme,{timeout:10000});
        const brand = page.locator('.guide-header .brand');
        assert(await brand.isVisible() && (await brand.innerText()).includes(width <= 760 ? 'PlayPoint' : 'Google Play Points'),`${theme}/${width}: header brand must be visible`);
        const samples = await palette(page,['h1','.article-card h3','.article-card time','#sort-toggle','#search-input']);
        if(await page.locator('.card-category:visible').count()) samples.push(...await palette(page,['.card-category']));
        for(const sample of samples) assert(!sample.missing && sample.ratio>=4.5,`${theme}/${width}: ${JSON.stringify(sample)}`);
        const bg = await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
        report.themes.push({width,theme,bg,samples});
        await page.screenshot({path:path.join(artifactDir,`reading-blog-${theme}-${width}.png`)});
      }
    }
    assert.notEqual(report.themes[0].bg,report.themes[1].bg,'Theme must change the actual outer surface');
    await page.reload({waitUntil:'domcontentloaded'}); await cards(page);
    assert.equal(await page.locator('html').getAttribute('data-reading-theme'),'dark','Theme persisted across reload');
    await page.setViewportSize({width:390,height:844});
    // 計算機案内が遅れて届いても、選択済みの記事カードを作り直さない。
    let releaseCalculators;
    const calculatorReady = new Promise(resolve => { releaseCalculators = resolve; });
    await page.route('**/blog/game-calculators.json', async route => {
      const response = await route.fetch();
      await calculatorReady;
      await route.fulfill({ response });
    });
    // 新着記事の追加順に依存せず、画像を持つ公開ゲーム記事を検証する。
    await goto(page,'blog/'); await cards(page);
    const filterPanel = page.locator('#article-filter-panel');
    assert.equal(await filterPanel.evaluate(el=>el.open),false,'Optional filters stay collapsed on the default list');
    const order = await page.evaluate(()=>({
      search:document.querySelector('#search-input')?.getBoundingClientRect().top,
      game:document.querySelector('#game-title-filter')?.getBoundingClientRect().top,
      filters:document.querySelector('#article-filter-panel')?.getBoundingClientRect().top,
      list:document.querySelector('.article-list-heading')?.getBoundingClientRect().top
    }));
    assert(order.search <= order.game && order.game < order.filters && order.filters < order.list,'Discovery order: '+JSON.stringify(order));
    await filterPanel.locator('summary').click();
    const gameFilter = page.locator('#game-title-filter');
    await gameFilter.waitFor({ state: 'visible', timeout: 10000 });
    await gameFilter.locator('option[value="FGO"]').waitFor({ state: 'attached', timeout: 10000 });
    await gameFilter.selectOption('FGO');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('game') === 'FGO');
    await cards(page);
    assert.equal(await gameFilter.inputValue(), 'FGO', 'Game selection matches the URL');
    assert.equal(await page.locator('.reader-entry-questions').isVisible(), false, 'ゲーム絞り込み中は入門案内を畳む');
    assert.equal(await page.locator('.hub-access-row').isVisible(), false, 'ゲーム絞り込み中は上部の再訪案内を畳む');
    const stableArticle = await page.locator('.article-card').first().elementHandle();
    releaseCalculators();
    await page.locator('.game-search-links a[href="/games/fgo/"]').waitFor({ state: 'visible', timeout: 10000 });
    assert(await stableArticle.evaluate(el => el.isConnected), '計算機案内の到着で記事カードを交換しない');
    await verifyArticleNavigation();
    report.interactions.vignetteProtectedNavigation = true;
    await page.unroute('**/blog/game-calculators.json');
    report.interactions.lateCalculatorLinks = true;
    // 実画像をスクロールで読み込み、1px placeholderを合格にしない。
    const images = page.locator('.card-thumb--app-icon img');
    assert(await images.count()>0,'Known game filter must expose a real app icon');
    for(let i=0;i<await images.count();i++) {
      const image=images.nth(i); await image.scrollIntoViewIfNeeded();
      await image.evaluate(img=>new Promise((resolve,reject)=>{
        const end=Date.now()+15000;
        const check=()=>{if(img.currentSrc.includes('/images/game-icons/')&&img.complete&&img.naturalWidth>1){img.decode().then(resolve,reject);return;}if(Date.now()>end){reject(Error('Real thumbnail did not decode'));return;}setTimeout(check,50);};check();
      }));
    }
    report.interactions.decodedIcons = await images.count();
    await goto(page,'blog/'); await cards(page);
    const responsive=[];
    for(const width of [320,360,412,421,480,600,640,760,768,1024]) {
      await page.setViewportSize({width,height:844});
      const state=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>innerWidth,
        discoveryFit:[...document.querySelectorAll('#search-input,#game-title-filter,#sort-toggle')].every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height>=40;}),
        controls:[...document.querySelectorAll('.guide-nav-button')].filter(el=>el.getClientRects().length).every(el=>{const r=el.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth;}),
        firstArticleY:document.querySelector('.article-card').getBoundingClientRect().top+scrollY,
        menuRight:(()=>{
          const button=document.querySelector('.guide-nav-button[aria-controls="guide-menu"]');
          const brand=document.querySelector('.guide-header .brand');
          if(!button||!brand) return null;
          return button.getBoundingClientRect().left > brand.getBoundingClientRect().right;
        })()
      }));
      assert(!state.overflow&&state.controls,`Responsive overflow at ${width}: ${JSON.stringify(state)}`);
      if(width<=760) {
        const visualCards=await page.locator('.article-card--visual').evaluateAll(cards=>cards.map(card=>({
          titleWidth:card.querySelector('h3').getBoundingClientRect().width,
          titleLeft:card.querySelector('h3').getBoundingClientRect().left,
          titleRight:card.querySelector('h3').getBoundingClientRect().right,
          titleTop:card.querySelector('h3').getBoundingClientRect().top,
          imageTop:card.querySelector('.card-thumb').getBoundingClientRect().top,
          imageRight:card.querySelector('.card-thumb').getBoundingClientRect().right,
          cardRight:card.getBoundingClientRect().right,
          cardWidth:card.getBoundingClientRect().width,
          imageFrames:card.querySelectorAll('.card-thumb img').length
        })));
        assert(visualCards.length>0&&visualCards.every(card=>card.titleWidth>=150&&card.titleLeft>=card.imageRight+8&&card.titleRight<=card.cardRight+1&&card.imageFrames===1&&Math.abs(card.titleTop-card.imageTop)<=1),`スマホの記事は画像と見出しを同じ開始行に揃え、見出しの可読幅を確保する: ${width}: ${JSON.stringify(visualCards)}`);
      }
      assert(state.discoveryFit,`Discovery controls must fit and remain tappable at ${width}`);
      if(width<=760) {
        const entries = await page.locator('.reader-entry-questions a').evaluateAll(links=>links.map(link=>{const r=link.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width};}));
        assert(entries.length===3&&entries.every(entry=>entry.top>=0&&entry.bottom<=844&&entry.width>=44),`記事トップの疑問を最初の画面で選べる: ${width}`);
        assert(state.menuRight===true,`Mobile menu button must sit to the right of the centered brand at ${width}`);
      } else {
        assert(await page.locator('.reader-entry-questions a').count()===3,'PCでも疑問から読む入口を使える');
      }
      responsive.push({width,...state});
    }
    report.interactions.responsive=responsive;
    await page.setViewportSize({width:390,height:844});

    await openMenu(page);
    const destinations=page.locator('.ja-global-nav a');
    assert.equal(await destinations.count(),7);
    await destinations.first().focus();
    await page.keyboard.press('Tab');
    assert(await destinations.nth(1).evaluate(el=>el===document.activeElement),'Primary navigation follows the visible order');
    await closeMenu(page);
    assert.equal(await page.locator('main').evaluate(el=>el.inert),false);
    await page.locator('.pagination-next').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.pagination-page-input')?.value==='2');
    assert(await page.locator('.article-card').first().evaluate(el=>el===document.activeElement),'New page begins at its first article');
    await page.keyboard.press('Tab');
    assert(await page.locator('.article-card').nth(1).evaluate(el=>el===document.activeElement),'Keyboard continues through the new results');
    await page.locator('.pagination-next').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.pagination-page-input')?.value==='3');
    await page.locator('.pagination-page-input').fill('１'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.pagination-page-input')?.value==='1');
    assert(await page.locator('.article-card').first().evaluate(el=>el===document.activeElement),'Page jump focuses the first result');
    for(const [raw,expected] of [['-1','1'],['2.7','1'],['９９９',null]]) {
      await goto(page,`blog/?page=${encodeURIComponent(raw)}`); await cards(page);
      const actual=await page.locator('.pagination-page-input').inputValue();
      const total=(await page.locator('.pagination-page-total').textContent()).trim();
      assert.equal(actual,expected||total);
      assert.equal(new URL(page.url()).pathname,actual==='1'?'/blog/':`/blog/page/${actual}/`,'Static URL matches displayed page');
      assert.equal(new URL(page.url()).searchParams.get('page'),null,'Legacy page query is normalized');
    }
    // 表記・条件・履歴が変わっても、次に読みたい記事へ直接進める。
    await goto(page,'blog/?sort=newest'); await cards(page);
    await page.locator('.pagination-next').click();
    await page.waitForFunction(()=>new URL(location.href).pathname==='/blog/page/2/');
    await page.goBack();
    await page.waitForFunction(()=>new URL(location.href).pathname==='/blog/');
    await page.locator('#search-input').fill('ポイントが消えた');
    await page.waitForFunction(()=>document.querySelector('#sort-toggle')?.value==='relevance');
    assert.match(await page.locator('.article-card').first().getAttribute('href'),/points-disappeared/);
    await page.locator('#sort-toggle').selectOption('newest');
    await page.locator('#search-input').fill('ニケ 月パス');
    await page.waitForFunction(()=>document.querySelector('#sort-toggle')?.value==='relevance');
    assert.equal(await page.locator('#article-filter-panel').evaluate(el=>el.open),false,'Search leaves the collapsed category panel closed');
    assert.equal(await page.locator('.reader-entry-questions').isVisible(),false,'検索中は入門案内を畳む');
    assert.equal(await page.locator('.reader-question-links').isVisible(),false,'検索結果前のおすすめを畳む');
    await page.reload({waitUntil:'domcontentloaded'}); await cards(page);
    assert.equal(await page.locator('.reader-entry-questions').isVisible(),false,'再読込でも絞り込み表示を復元');
    await page.locator('.filter-reset-inline').click();
    assert(await page.locator('.reader-entry-questions').isVisible(),'解除すると入門案内を戻す');
    assert(await page.locator('#reading-library summary').isVisible(),'解除すると保存記事への入口を戻す');
    await page.locator('#search-input').fill('ニケ 月パス');
    await page.waitForFunction(()=>document.querySelector('#sort-toggle')?.value==='relevance');
    await page.setViewportSize({width:1264,height:552}); await waitNavigationLayout(page);
    await page.locator('#game-title-filter').selectOption({label:'NIKKE'});
    const facet=page.locator('.guide-hub-sidebar .sidebar-browse-category[data-topic="ゲーム別課金"]');
    await facet.click();
    assert.equal(new URL(page.url()).searchParams.get('game'),'NIKKE');
    assert.equal(new URL(page.url()).searchParams.get('q'),'ニケ 月パス');
    assert.equal(await facet.locator('.sidebar-browse-count').textContent(),'1');
    await goto(page,'blog/?sort=newest'); await cards(page);
    await page.evaluate(()=>{scrollTo(0,0);document.activeElement.blur();});
    await page.keyboard.press('Tab');
    assert(await page.locator('.hub-skip-link').evaluate(el=>el===document.activeElement),'First keyboard stop bypasses repeated navigation');
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement?.id==='article-list-title');
    const firstTitle=await page.locator('.article-card h3').first().boundingBox();
    assert(firstTitle.y+firstTitle.height<=552,'記事一覧へ進むと短いPC画面でも最初の見出しを読める');
    await page.setViewportSize({width:390,height:844}); await waitNavigationLayout(page);
    assert(await page.locator('#reading-library summary').isVisible(),'Saved articles are directly reachable on mobile');
    report.interactions.readerFlow={history:true,relevance:true,conditions:true,skip:true,mobileLibrary:true};
    // 入力途中の履歴ではなく、検索前と確定した検索結果を往復できる。
    await goto(page,'blog/'); await cards(page);
    for (const query of ['ポイント','ポイント 期限','ポイント 有効期限']) {
      await page.locator('#search-input').fill(query);
      await page.waitForFunction(q=>new URL(location.href).searchParams.get('q')===q,query);
    }
    await page.goBack();
    await page.waitForFunction(()=>document.querySelector('#search-input').value==='');
    await page.goForward();
    await page.waitForFunction(()=>document.querySelector('#search-input').value==='ポイント 有効期限');
    await page.locator('.filter-reset-inline').click();
    assert(await page.locator('.reader-question-links').isVisible(),'解除するとおすすめ記事への入口を戻す');
    await page.getByRole('link',{name:'次の増量はいつ？',exact:true}).click();
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>{const r=document.querySelector('#next-campaign-title')?.getBoundingClientRect();return r && r.top>=document.querySelector('.guide-header').getBoundingClientRect().bottom && r.top<innerHeight/2;});

    for (const slug of ['ranks','using-points','troubleshooting']) {
      await goto(page,`guides/${slug}/`); await page.evaluate(()=>document.fonts.ready);
      for (const theme of ['light','dark']) {
        if (await page.evaluate(()=>document.documentElement.dataset.readingTheme)!==theme) await chooseTheme(page);
        for (const item of await palette(page,['.reader-guide h1','.hero .reader-source'])) assert(item.ratio>=4.5,`${slug} ${theme} ${item.selector}: ${item.ratio}`);
      }
      await page.locator('.reader-guide-order a').first().click();
      await page.waitForFunction(()=>{const h=document.querySelector(location.hash)?.querySelector('h2');return h && h.getBoundingClientRect().top>=document.querySelector('.guide-header').getBoundingClientRect().bottom;});
      assert(await page.evaluate(()=>document.activeElement===document.querySelector(location.hash)),`${slug}: destination receives keyboard focus`);
    }
    await goto(page,'latest/');
    await page.locator('.benefit-audience summary').click();
    for (const theme of ['light','dark']) {
      if (await page.evaluate(()=>document.documentElement.dataset.readingTheme)!==theme) await chooseTheme(page);
      for (const item of await palette(page,['.benefit-audience-controls label'])) assert(item.ratio>=4.5,`Benefit label ${theme}: ${item.ratio}`);
    }
    await page.locator('#benefit-rank').selectOption('bronze');
    await page.locator('#benefit-pass').selectOption('no');
    assert.equal(await page.locator('[data-benefit-id="weekly-points"]').isVisible(),false);
    assert.equal(await page.locator('[data-benefit-id="play-pass"]').isVisible(),false);
    assert(await page.locator('[data-benefit-id="personal-promotion"]').isVisible());
    await page.locator('#benefit-rank').selectOption('gold');
    assert(await page.locator('[data-benefit-id="weekly-points"]').isVisible());
    await page.locator('[data-clear-audience]').click();
    assert(await page.locator('[data-benefit-id="play-pass"]').isVisible());
    await goto(page,'articles/2026-09-19-play-points-calendar-schedule-guide.html');
    const calendar=page.locator('[data-reader-calendar]');
    await calendar.locator('input[value="weekly"]').check();
    const downloading=page.waitForEvent('download');
    await calendar.getByRole('button',{name:'選んだ確認日を保存する'}).click();
    const downloaded=await downloading;
    assert.equal(downloaded.suggestedFilename(),'playpoint-check-dates.ics');
    assert.equal(await downloaded.failure(),null);
    report.interactions.followthrough={searchHistory:true,campaignArrival:true,guideThemes:true,guideAnchors:true,benefitFilter:true,calendarDownload:true};
    await goto(page,'blog/'); await cards(page);
    await page.locator('.reader-entry-questions a').first().click();
    await page.locator('#play-pass-basics').waitFor({state:'visible'});
    assert.equal(new URL(page.url()).hash,'#play-pass-basics');
    assert.equal(await page.locator('.breadcrumbs-wrapper a').first().getAttribute('href'),'/blog/');
    await page.locator('.reader-followthrough a').first().click();
    await page.locator('[data-reader-calendar]').waitFor({state:'visible'});
    assert.equal(new URL(page.url()).hash,'#reader-calendar-title');
    report.interactions.questionToAction=true;
    await goto(page,'blog/'); await cards(page);
    const articleRequests = [];
    const recordArticleRequest = request => articleRequests.push(new URL(request.url()).pathname);
    page.on('request', recordArticleRequest);
    await goto(page,'games/fgo/pity-cost/');
    await page.locator('[data-reading-theme-toggle]').waitFor({state:'attached'});
    page.off('request', recordArticleRequest);
    assert(!articleRequests.includes('/blog/articles.json'), '静的関連記事がある本文では一覧データを取得しない');
    assert(!articleRequests.includes('/js/article-search.js'), '本文では一覧用の検索コードを読み込まない');
    assert.equal(await page.locator('html').getAttribute('data-reading-theme'),'dark','Theme carried into game article');
    for(const sample of await palette(page,['h1','.breadcrumbs-wrapper span:last-child','.reading-metadata summary','.pack-table tbody td','.cta-btn'])) assert(sample.ratio>=4.5,JSON.stringify(sample));
    await page.locator('.reading-table-compact').first().waitFor({state:'attached'});
    for(const width of [320,390]) {
      await page.setViewportSize({width,height:844});
      const tables=await page.locator('.pack-table').evaluateAll(tables=>tables.map(table=>({w:table.getBoundingClientRect().width,available:table.parentElement.clientWidth,scroll:table.parentElement.scrollWidth})));
      assert(tables.every(t=>t.scroll<=t.available+2),`All three columns visible at ${width}: ${JSON.stringify(tables)}`);
    }
    await page.screenshot({path:path.join(artifactDir,'reading-game-390.png')});
    const save=page.locator('[data-reading-tools] button'); await save.click();
    assert.equal(await save.getAttribute('aria-pressed'),'true');
    await goto(page,'blog/#reading-library');
    await page.locator('#reading-library[open]').waitFor({state:'visible'});
    assert(await page.locator('#reading-library a[href="/games/fgo/pity-cost/"]').count()>0,'Saved game article discoverable');
    assert(await page.locator('[data-reading-resume] a[href="/games/fgo/pity-cost/"]').isVisible(),'前回読んだ記事から再開できる');
    const prior=await page.evaluate(()=>JSON.parse(localStorage.getItem('playpoint_reading_library_v1')));
    await page.locator('#reading-library input[type=checkbox]').uncheck();
    assert(await page.locator('[data-reading-resume]').isHidden(),'履歴停止中は再開欄を表示しない');
    const paused=await page.evaluate(()=>JSON.parse(localStorage.getItem('playpoint_reading_library_v1')));
    assert.deepEqual(paused.recent,prior.recent,'Stopping history does not erase past visits');
    const clearRecent=page.getByRole('button',{name:'すべて削除',exact:true}).nth(1);
    page.once('dialog',dialog=>dialog.dismiss()); await clearRecent.click();
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('playpoint_reading_library_v1')).recent),prior.recent);
    page.once('dialog',dialog=>dialog.accept()); await clearRecent.click();
    const cleared=await page.evaluate(()=>JSON.parse(localStorage.getItem('playpoint_reading_library_v1')));
    assert.equal(cleared.recent.length,0); assert.deepEqual(cleared.saved,prior.saved);
    report.storage.pausePreservesHistory=true; report.storage.confirmedClear=true;
    report.interactions.modal = report.interactions.pagination = report.interactions.urlNormalization = report.interactions.savedRoundTrip = true;

    if (await page.locator('html').getAttribute('data-reading-theme') === 'dark') await chooseTheme(page);
    // 主計算機の目的別モードと地域選択を、ガイド用メニューから独立して確認する。
    await goto(page,'');
    for (const width of [320,390,1280]) {
      await page.setViewportSize({width,height:844});
      await page.locator('#calculateButton').waitFor({state:'visible'});
      assert.equal(await page.locator('#guide-menu,.guide-calculator-header').count(),0,'Calculator has no guide menu');
      assert.equal(await page.locator('#tab-main').innerText(),'必要額を知る');
      assert.equal(await page.locator('#tab-reverse').innerText(),'金額からポイント');
      assert(await page.locator('.top-bar .region-switch').isVisible(),'Region selector remains on the page');
      assert(await page.locator('.top-bar .header-links a[href$="blog/"]').isVisible(),'Article link remains on the page');
    }
    report.interactions.calculatorHeaderRestored = true;
    await page.setViewportSize({width:390,height:844});
    const mobilePages = [['blog','blog/'],['article','articles/2026-09-26-pokemon-sleep-play-points-coupon.html']];
    report.interactions.mobileNavigation = [];
    for (const [name,route] of mobilePages) {
      await goto(page,route);
      await page.locator('.guide-nav-button').first().waitFor({state:'visible'});
      if (name === 'blog') await cards(page);
      await page.evaluate(()=>scrollTo(0,0));
      await openMenu(page);
      assert.equal(await page.locator('#guide-menu').evaluate(el=>el.matches(':modal')),true);
      await page.screenshot({path:path.join(artifactDir,`mobile-${name}-menu-390.png`)});
      // ネイティブdialogはブラウザのアドレスバーへの移動を許す。
      // 文書にフォーカスがある間、背後のページへ漏れないことを検証する。
      for (const key of ['Tab', 'Shift+Tab']) for (let i=0;i<25;i++) {
        await page.keyboard.press(key);
        const focus = await page.locator('#guide-menu').evaluate(el => ({
          modal: el.matches(':modal'), inside: el.contains(document.activeElement),
          browserChrome: !document.hasFocus() && document.activeElement === document.body,
          active: document.activeElement?.outerHTML.slice(0,200)
        }));
        assert(focus.modal && (focus.inside || focus.browserChrome),'Menu must isolate page focus: '+JSON.stringify(focus));
      }
      await page.locator('#guide-menu .guide-close').focus();
      await closeMenu(page);
      assert(await page.locator('[aria-controls="guide-menu"]').evaluate(el=>el===document.activeElement),'Closing restores the menu button');
      await openMenu(page); await page.setViewportSize({width:1024,height:844});
      await waitNavigationLayout(page);
      assert.equal(await page.locator('#guide-menu').evaluate(el=>el.open),false);
      assert.equal(await page.locator('#guide-menu .ja-global-nav,#guide-menu .top-bar').count(),0,'Desktop restores the existing navigation');
      await page.setViewportSize({width:320,height:844}); await openMenu(page);
      assert(await page.locator('#guide-menu').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Small menu does not overflow');
      await closeMenu(page); await page.setViewportSize({width:390,height:844});
      if (name==='article') {
        assert.equal(await page.locator('.guide-header [aria-controls="guide-toc"]').count(),0,'記事の目次は本文に置く');
        const searchButton=page.locator('[aria-controls="guide-search"]');
        const searchRect=await searchButton.boundingBox(), menuRect=await page.locator('[aria-controls="guide-menu"]').boundingBox();
        assert(searchRect.x<menuRect.x,'記事検索は左、メニューは右');
        await searchButton.click();
        await page.waitForFunction(()=>document.activeElement?.id==='guide-search-input');
        await page.locator('#guide-search-input').fill('原神 空月');
        await page.locator('#guide-search .guide-search-result').first().waitFor({state:'visible'});
        assert((await page.locator('#guide-search .guide-search-result').first().textContent()).includes('空月'),'一覧と同じ複合検索で記事を探せる');
        await page.locator('#guide-search-input').fill('存在しない記事zz987');
        await page.waitForFunction(()=>document.querySelector('.guide-search-status').textContent.includes('該当する記事がありません'));
        await page.keyboard.press('Escape');
        assert(await searchButton.evaluate(el=>el===document.activeElement),'検索を閉じると検索ボタンへ戻る');
        await page.setViewportSize({width:768,height:844}); await waitNavigationLayout(page);
        assert(await searchButton.isVisible(),'タブレットでも検索を直接開ける');
        await openMenu(page);
        const menuBounds=await page.locator('#guide-menu').boundingBox();
        assert(Math.abs(menuBounds.x+menuBounds.width-768)<2,'記事メニューは右側から開く');
        await closeMenu(page); await page.setViewportSize({width:390,height:844}); await waitNavigationLayout(page);
        await page.locator('.reader-toc > summary').click();
        await page.screenshot({path:path.join(artifactDir,'mobile-article-toc-390.png')});
        await page.locator('.reader-toc a[href="#article-section-2"]').click();
        await page.waitForFunction(()=>{const y=document.getElementById('article-section-2').getBoundingClientRect().top;return y>=55&&y<200;});
        assert(await page.locator('#article-section-2').evaluate(el=>el===document.activeElement),'TOC puts focus on the chosen heading');
        for(const width of [320,390]) { await page.setViewportSize({width,height:844}); assert(await page.locator('[data-reading-table]').evaluateAll(nodes=>nodes.every(el=>el.scrollWidth<=el.clientWidth+2)),'Two-column table remains readable'); }
      }
      await page.evaluate(()=>scrollTo(0,0));
      const shots=[];
      for(let index=0;index<50;index++) {
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const state=await page.evaluate(()=>({y:scrollY,height:innerHeight,bottom:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth+1}));
        assert(!state.overflow,`${name}: horizontal page overflow`);
        await page.screenshot({path:path.join(artifactDir,`mobile-${name}-scroll-${String(index).padStart(2,'0')}.png`)});
        shots.push(state);
        if(state.y+state.height>=state.bottom-2) break;
        await page.evaluate(()=>scrollBy({top:innerHeight-80,behavior:'instant'}));
      }
      assert(shots.at(-1).y+shots.at(-1).height>=shots.at(-1).bottom-2,'Screenshots reach the end of '+name);
      report.interactions.mobileNavigation.push({name,shots});
    }

    // 画面外の表を強制計測せず、接近・幅変更・履歴復帰でも操作を準備できる。
    const tableContext = await context();
    await tableContext.addInitScript(() => {
      const native = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollWidth');
      window.__tableMeasurements = [];
      Object.defineProperty(Element.prototype, 'scrollWidth', { ...native, get() {
        if (this.hasAttribute('data-reading-table')) window.__tableMeasurements.push(this.id);
        return native.get.call(this);
      } });
    });
    const tablePage = await tableContext.newPage();
    const tableFixture = '/articles/reading-table-performance-fixture.html';
    await tablePage.route(new URL(tableFixture, baseUrl).href, route => route.fulfill({contentType:'text/html',body:
      '<html><head><style>table{min-width:900px}.table-wrap{overflow:auto}.spacer{height:12000px}.section{content-visibility:auto;contain-intrinsic-size:auto 480px}</style></head><body><article class="content"><section class="section"><div class="table-wrap" id="near"><table><tr><td>A</td><td>B</td><td>C</td></tr></table></div></section><div class="spacer"></div><section class="section"><div class="table-wrap" id="far"><table><tr><td>D</td><td>E</td><td>F</td></tr></table></div></section></article><script src="/js/reading-experience.js"></script></body></html>'}));
    await goto(tablePage, tableFixture);
    await tablePage.locator('#near[tabindex="0"]').waitFor();
    assert.equal(await tablePage.evaluate(()=>window.__tableMeasurements.includes('far')),false,'Offscreen table must not force initial layout');
    await tablePage.locator('#far').scrollIntoViewIfNeeded();
    await tablePage.locator('#far[tabindex="0"][role="region"]').waitFor();
    await tablePage.locator('#far').focus(); await tablePage.keyboard.press('ArrowRight');
    await tablePage.waitForFunction(()=>document.getElementById('far').scrollLeft>0);
    await tablePage.setViewportSize({width:1280,height:844});
    await tablePage.waitForFunction(()=>!document.getElementById('far').hasAttribute('tabindex'));
    await tablePage.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide'));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
    await tablePage.setViewportSize({width:320,height:844});
    await tablePage.locator('#far[tabindex="0"]').waitFor();
    await tablePage.addInitScript(()=>{window.IntersectionObserver=undefined;});
    await goto(tablePage,tableFixture);
    await tablePage.locator('#far[tabindex="0"]').waitFor({state:'attached'});
    report.interactions.tableVisibility = report.interactions.tableResize = report.interactions.tableHistoryRestore = report.interactions.tableObserverFallback = true;

    // 三つの同意状態と、故障条件は専用context。実ユーザーの保存データを利用しない。
    const f = await context();
    await f.addInitScript(()=>{
      const Native=window.IntersectionObserver; window.__readingObservers=[];
      window.IntersectionObserver=class extends Native {
        constructor(callback, options){super(callback,options);this.targets=new Set();window.__readingObservers.push(this);}
        observe(el){this.targets.add(el);return super.observe(el);}
        unobserve(el){this.targets.delete(el);return super.unobserve(el);}
        disconnect(){this.targets.clear();return super.disconnect();}
      };
    });
    let indexAllowed=false,indexAttempts=0;
    await f.route('**/blog/article-search-index.json*',async route=>{indexAttempts++;if(!indexAllowed)return route.fulfill({status:503,body:'temporarily unavailable'});return route.continue();});
    await f.route('**/images/game-icons/fgo.webp*',route=>route.fulfill({status:404,body:'fixture image failure'}));
    const fault=await f.newPage(),faultErrors=[];fault.on('pageerror',e=>faultErrors.push(e.message));
    await goto(fault,'blog/?game=FGO');await cards(fault);
    await fault.waitForFunction(()=>document.querySelector('.article-card[href*="fgo/pity-cost"] .card-thumb img')?.src.endsWith('/images/article-placeholder.svg'));
    await fault.locator('#search-input').fill('329回以内');
    await fault.locator('#body-search-notice button').waitFor({state:'visible'});
    indexAllowed=true; await fault.locator('#body-search-notice button').click();
    await fault.locator('.article-card[href*="fgo/pity-cost"]').waitFor({state:'visible'});
    assert(indexAttempts>=2,'Index retries after transient failure');
    await fault.locator('#article-result-status button').click(); await cards(fault);
    await openOptionalFilters(fault);
    for(let i=0;i<20;i++) await fault.locator('#sort-toggle').selectOption(i%2?'newest':'oldest');
    assert(await fault.evaluate(()=>window.__readingObservers.every(o=>[...o.targets].every(t=>t.isConnected))),'Detached image targets are released');
    assert.equal(faultErrors.length,0,JSON.stringify(faultErrors));
    report.faults = {indexAttempts,localImageFallback:true,observerCleanup:true,uncaughtErrors:faultErrors};

    // 異なる関連度・公開日・更新日を持つ合成レコードで、成功検索の実際の順を比較。
    const sortContext=await context();
    const fixture=[
      {id:'old',title:'Old guide',description:'auditneedle',date:'2025-12-25',modified:'2026-09-18',category:'使い方',tags:[],file:'../articles/2025-12-25-best-use.html',thumbnail:'../ogp.png'},
      {id:'new',title:'auditneedle new guide',description:'New guide',date:'2026-09-13',modified:'2026-09-13',category:'使い方',tags:[],file:'../games/fgo/pity-cost/index.html',thumbnail:'../ogp.png'}
    ];
    await sortContext.route('**/blog/articles.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
    await sortContext.route('**/blog/article-search-index.json*',route=>route.fulfill({status:200,contentType:'application/json',body:'{"articles":[]}'}));
    const sp=await sortContext.newPage();await goto(sp,'blog/?q=auditneedle');await cards(sp);
    await openOptionalFilters(sp);
    const orders={};
    for(const [mode,expected] of [['relevance','fgo/pity-cost'],['oldest','2025-12-25-best-use'],['newest','fgo/pity-cost'],['updated','2025-12-25-best-use']]) {
      await sp.locator('#sort-toggle').selectOption(mode);
      orders[mode]=await sp.locator('.article-card').first().getAttribute('href');
      assert(orders[mode].includes(expected),`${mode} returned ${orders[mode]}`);
    }
    await sp.locator('#sort-toggle').selectOption('oldest');
    await goto(sp,'blog/');await cards(sp);assert.equal(await sp.locator('#sort-toggle').inputValue(),'oldest');
    await goto(sp,'blog/?sort=newest');await cards(sp);assert.equal(await sp.locator('#sort-toggle').inputValue(),'newest');
    report.interactions.sorts=orders;report.interactions.savedSort=true;

    const storageContext=await context();
    await storageContext.addInitScript(()=>{localStorage.setItem('playpoint_reading_library_v1','{broken');});
    const st=await storageContext.newPage();await goto(st,'blog/#reading-library');
    const recover=st.getByRole('button',{name:'退避して保存機能を初期化'});await recover.waitFor({state:'visible'});
    st.once('dialog',dialog=>dialog.accept());await recover.click();
    const recovered=await st.evaluate(()=>({raw:JSON.parse(localStorage.getItem('playpointReadingLibraryRecoveryV1')).raw,state:JSON.parse(localStorage.getItem('playpoint_reading_library_v1'))}));
    assert.equal(recovered.raw,'{broken');assert.equal(recovered.state.saved.length,0);
    report.storage.backupRecovery=true;
    // 内部のif文ではなく、実ページの通信とDOMで海外記事の境界を守る。
    const intlContext=await context(), ip=await intlContext.newPage();
    report.interactions.internationalResources=[];
    for(const locale of INTERNATIONAL_LOCALES) {
      const requests=[];
      const record=request=>requests.push(new URL(request.url()).pathname);
      ip.on('request',record);
      await goto(ip,`${locale}/articles/google-play-points-weekly-reward.html`);
      await ip.waitForLoadState('load');
      ip.off('request',record);
      assert(requests.includes('/blog/article.js'),locale+': article runtime was not exercised');
      assert(!requests.includes('/blog/articles.json'),locale+': Japanese article catalog must not be requested');
      assert(!requests.includes('/js/article-search.js'),locale+': hub-only search code must not be requested');
      assert.equal(await ip.locator('#article-nav').count(),0,locale+': empty previous/next navigation remains');
      report.interactions.internationalResources.push({locale,unusedRequests:0});
      // ゲーム・購入目的・全文検索を組み合わせ、ゼロ件から元へ戻せることを実操作で確認。
      await goto(ip,`${locale}/articles/`);
      const visibleGuides=ip.locator('[data-guide-grid] [data-guide-card]:visible');
      const initialCount=await visibleGuides.count();
      const game=ip.locator('[data-guide-game]'),topic=ip.locator('[data-guide-topic]');
      await game.focus();await ip.keyboard.press('Home');await ip.keyboard.press('ArrowDown');
      await ip.waitForFunction(()=>document.querySelector('[data-guide-game]').value==='games');
      assert.equal(await visibleGuides.count(),17,locale+': keyboard game filter');
      await game.selectOption('pokepoke');await topic.selectOption('trial');
      assert.equal(await visibleGuides.count(),1,locale+': game + trial');
      assert.match(await visibleGuides.first().getAttribute('href'),/pokemon-tcg-pocket-premium-pass/);
      assert.equal(new URL(ip.url()).searchParams.get('game'),'pokepoke');
      assert.equal(new URL(ip.url()).searchParams.get('topic'),'trial');
      await ip.reload({waitUntil:'domcontentloaded'});
      await ip.waitForFunction(()=>document.querySelector('[data-guide-game]').value==='pokepoke');
      assert.equal(await topic.inputValue(),'trial');
      assert.equal(await visibleGuides.count(),1,locale+': reload restores filters');
      await game.selectOption('umamusume');
      assert.equal(await visibleGuides.count(),0,locale+': unrelated trial must not match');
      assert.equal(await ip.locator('[data-guide-empty]').isVisible(),true);
      await ip.locator('.search-recovery button').filter({hasText: /other guides|다른 가이드|其他指南/}).click();
      assert.equal(await game.inputValue(),'umamusume');
      assert.equal(await topic.inputValue(),'all');
      assert.equal(await visibleGuides.count(),1,locale+': recovery preserves current game');
      await topic.selectOption('trial');
      await ip.locator('.search-recovery button').filter({hasText: /Reset search|검색·분류 초기화|清除搜尋與篩選/}).click();
      assert.equal(await game.inputValue(),'all');assert.equal(await topic.inputValue(),'all');
      assert.equal(await visibleGuides.count(),initialCount,locale+': reset restores all guides');
      await game.selectOption('umamusume');
      const query={en:'Daily Carat',ko:'먼슬리 우마',tw:'每日寶石包'}[locale];
      await ip.locator('[data-guide-search]').fill(query);
      await ip.waitForFunction(()=>document.querySelector('[data-guide-grid] .intl-guide-card__excerpt'));
      assert.equal(await visibleGuides.count(),1,locale+': full-text search with game filter');
      assert.match(await visibleGuides.first().getAttribute('href'),/umamusume-umasuku/);
      assert.equal(new URL(ip.url()).searchParams.get('q'),query);
      await ip.reload({waitUntil:'domcontentloaded'});
      await ip.waitForFunction(()=>document.querySelector('[data-guide-grid] .intl-guide-card__excerpt'));
      assert.equal(await ip.locator('[data-guide-search]').inputValue(),query);
      assert.equal(await visibleGuides.count(),1,locale+': shared URL restores text and game');
      report.interactions.internationalResources.at(-1).gameDiscovery=true;
    }
    fs.writeFileSync(path.join(artifactDir,'reading-ui-report.json'),JSON.stringify(report,null,2));
    return report;
  } catch(error) {
    report.error=error.message;
    if(lastPage) await lastPage.screenshot({path:path.join(artifactDir,'reading-ui-failure.png'),fullPage:true}).catch(()=>{});
    fs.writeFileSync(path.join(artifactDir,'reading-ui-report.json'),JSON.stringify(report,null,2));
    throw error;
  } finally { for(const value of contexts) await value.close(); }
}
module.exports={verifyReadingUi};
