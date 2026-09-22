'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

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
  async function cards(page) { await page.locator('.article-card').first().waitFor({state:'visible',timeout:30000}); }
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
    const c = await context(), page = await c.newPage();
    await goto(page,'blog/'); await cards(page);
    for (const width of [390,1024]) {
      await page.setViewportSize({width,height:844});
      for (const theme of ['light','dark']) {
        if (await page.locator('html').getAttribute('data-reading-theme') !== theme) await page.locator('#theme-toggle').click();
        // The attribute changes synchronously, but color-scheme style resolution can finish on the next paint.
        // Wait for the actual requested surface; an attribute-only match cannot prove that the theme works.
        await page.waitForFunction(t=>{
          if(document.documentElement.dataset.readingTheme!==t) return false;
          const channels=getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g)?.slice(0,3).map(Number)||[];
          return channels.length===3 && (t==='dark' ? Math.max(...channels)<128 : Math.min(...channels)>180);
        },theme,{timeout:10000});
        const samples = await palette(page,['h1','.article-card h3','.article-card time','#category-filter button.active','#search-input']);
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
    // 新着記事の追加順に依存せず、画像を持つ公開ゲーム記事を検証する。
    await goto(page,'blog/'); await cards(page);
    const filterPanel = page.locator('#article-filter-panel');
    assert.equal(await filterPanel.evaluate(el=>el.open),false,'Optional filters stay collapsed on the default list');
    const order = await page.evaluate(()=>({
      search:document.querySelector('#search-input')?.getBoundingClientRect().top,
      purpose:document.querySelector('.search-pathways--primary')?.getBoundingClientRect().top,
      filters:document.querySelector('#article-filter-panel')?.getBoundingClientRect().top,
      list:document.querySelector('.article-list-heading')?.getBoundingClientRect().top
    }));
    assert(order.search < order.purpose && order.purpose < order.filters && order.filters < order.list,'Discovery order: '+JSON.stringify(order));
    await filterPanel.locator('summary').click();
    const gameFilter = page.locator('#game-title-filter');
    await gameFilter.waitFor({ state: 'visible', timeout: 10000 });
    await gameFilter.locator('option[value="FGO"]').waitFor({ state: 'attached', timeout: 10000 });
    await gameFilter.selectOption('FGO');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('game') === 'FGO');
    await cards(page);
    assert.equal(await gameFilter.inputValue(), 'FGO', 'Game selection matches the URL');
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
        columns:getComputedStyle(document.querySelector('.search-pathways-grid')).gridTemplateColumns.split(' ').length,
        controls:[...document.querySelectorAll('#theme-toggle,#sidebar-toggle')].every(el=>{const r=el.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth;}),
        pathwaysFit:[...document.querySelectorAll('.search-pathways--primary .search-pathway-card')].every(el=>el.scrollWidth<=el.clientWidth+1 && el.getBoundingClientRect().height>=44),
        firstArticleY:document.querySelector('.article-card').getBoundingClientRect().top+scrollY
      }));
      assert(!state.overflow&&state.controls,`Responsive overflow at ${width}: ${JSON.stringify(state)}`);
      assert.equal(state.columns,width<=760?2:4,`Purpose-grid breakpoint ${width}`);
      assert(state.pathwaysFit,`Purpose links must fit and remain tappable at ${width}`);
      assert(state.firstArticleY<700,`First article is pushed below the initial screen at ${width}: ${state.firstArticleY}`);
      responsive.push({width,...state});
    }
    report.interactions.responsive=responsive;
    await page.setViewportSize({width:390,height:844});

    const destinations=page.locator('.ja-global-nav a');
    assert.equal(await destinations.count(),6);
    await destinations.first().focus();
    await page.keyboard.press('Tab');
    assert(await destinations.nth(1).evaluate(el=>el===document.activeElement),'Primary navigation follows the visible order');
    assert.equal(await page.locator('main').evaluate(el=>el.inert),false);
    await page.locator('.pagination-next').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.pagination-page-input')?.value==='2');
    assert(await page.locator('.pagination-next').evaluate(el=>el===document.activeElement),'Pagination focus retained');
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.pagination-page-input')?.value==='3');
    await page.locator('.pagination-page-input').fill('１'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.pagination-page-input')?.value==='1');
    assert(await page.locator('.pagination-page-input').evaluate(el=>el===document.activeElement),'Page input focus retained');
    for(const [raw,expected] of [['-1','1'],['2.7','1'],['９９９',null]]) {
      await goto(page,`blog/?page=${encodeURIComponent(raw)}`); await cards(page);
      const actual=await page.locator('.pagination-page-input').inputValue();
      const total=(await page.locator('.pagination-page-total').textContent()).trim();
      assert.equal(actual,expected||total);
      assert.equal(new URL(page.url()).searchParams.get('page'),actual==='1'?null:actual,'URL matches displayed page');
    }
    const articleRequests = [];
    const recordArticleRequest = request => articleRequests.push(new URL(request.url()).pathname);
    page.on('request', recordArticleRequest);
    await goto(page,'games/fgo/pity-cost/');
    await page.locator('[data-reading-theme-toggle]').waitFor({state:'visible'});
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
    const save=page.locator('[data-reading-tools] button'); await save.click();
    assert.equal(await save.getAttribute('aria-pressed'),'true');
    await goto(page,'blog/#reading-library');
    await page.locator('#reading-library[open]').waitFor({state:'visible'});
    assert(await page.locator('#reading-library a[href="/games/fgo/pity-cost/"]').count()>0,'Saved game article discoverable');
    const prior=await page.evaluate(()=>JSON.parse(localStorage.getItem('playpoint_reading_library_v1')));
    await page.locator('#reading-library input[type=checkbox]').uncheck();
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
