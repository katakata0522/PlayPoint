'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const chrome = process.env.CHROME_PATH;
const base = 'https://playpoint-sim.com/';
const urls = [
  'en/articles/google-play-games-vs-play-points.html',
  'en/articles/google-play-balance-combine-payment.html',
  'en/articles/google-play-points-country-differences.html',
  'en/articles/google-play-points-levels.html'
];

function box(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom };
}

(async()=>{
  const browser = await chromium.launch({ executablePath: chrome, headless:true, args:['--no-sandbox','--disable-dev-shm-usage'] });
  const results=[];
  for (const blockAds of [false,true]) {
    const context = await browser.newContext({ viewport:{width:1440,height:1000} });
    if (blockAds) {
      await context.route(/(googlesyndication|doubleclick|googleadservices|googletagservices)/, route => route.abort());
    }
    const page = await context.newPage();
    for (const rel of urls) {
      await page.goto(new URL(rel,base).href,{waitUntil:'domcontentloaded',timeout:25000});
      await page.waitForTimeout(3500);
      const data = await page.evaluate(({rel,blockAds})=>{
        const $=s=>document.querySelector(s);
        const box=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
        const main=$('main.main-card');
        const hero=$('.hero');
        const content=$('article.content');
        const first=content ? [...content.children].find(el=>getComputedStyle(el).display!=='none') : null;
        const breadcrumbs=$('.intl-article-breadcrumbs');
        const layout=$('.intl-layout-container');
        const adLike=[...document.querySelectorAll('ins,iframe,[class*="ads" i],[id*="ads" i],[class*="google" i],[id*="google" i]')]
          .filter(el=>{const r=el.getBoundingClientRect();return r.width>0||r.height>0;})
          .map(el=>({tag:el.tagName,id:el.id,class:el.className?.toString?.()||'',box:box(el),src:el.getAttribute('src')||'',style:el.getAttribute('style')||'',status:el.getAttribute('data-ad-status')||el.getAttribute('data-adsbygoogle-status')||''}));
        const bodyChildren=[...document.body.children].map(el=>({tag:el.tagName,id:el.id,class:el.className?.toString?.()||'',box:box(el),position:getComputedStyle(el).position,display:getComputedStyle(el).display}));
        const mainChildren=main?[...main.children].map(el=>({tag:el.tagName,id:el.id,class:el.className?.toString?.()||'',box:box(el)})):[];
        return {rel,blockAds,scrollY:scrollY,docWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,breadcrumbs:box(breadcrumbs),layout:box(layout),main:box(main),hero:box(hero),content:box(content),firstContentChild:box(first),bodyChildren,mainChildren,adLike};
      },{rel,blockAds});
      results.push(data);
    }
    await context.close();
  }
  await browser.close();
  const out=path.resolve('intl-gap-diagnostic.json');
  fs.writeFileSync(out,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
})();
