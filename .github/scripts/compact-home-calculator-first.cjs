'use strict';

const fs = require('node:fs');
const path = 'style.css';
let css = fs.readFileSync(path, 'utf8');

const markerStart = '/* HOME_CALCULATOR_FIRST_PHONE_COMPACT_START */';
const markerEnd = '/* HOME_CALCULATOR_FIRST_PHONE_COMPACT_END */';
const block = `${markerStart}
@media(max-width:640px){
  .home-calculator-first{padding-left:10px;padding-right:10px}
  .home-calculator-first .top-bar{margin:.05rem auto .45rem}
  .home-calculator-first .region-switch{padding:3px;border-radius:14px}
  .home-calculator-first .region-switch>button,.home-calculator-first .region-switch .region-more-toggle{min-height:44px;padding:.3rem .05rem;font-size:.82rem}
  .home-calculator-first .region-switch .region-more-toggle{font-size:1.05rem}
  .home-calculator-first .header-links{gap:.38rem;margin-top:.42rem}
  .home-calculator-first .header-links .alert-link{min-height:46px;padding:.5rem 2.1rem .5rem .72rem;border-radius:14px;font-size:.84rem;line-height:1.15}
  html[lang="ja"] .home-calculator-first .header-links .alert-link::after{display:none}
  .home-calculator-first .header-links>a[data-lang-key="linkGames"],.home-calculator-first .header-links>a[data-lang-key="linkArticles"]{min-height:54px;padding:.45rem .55rem;border-radius:14px;font-size:.86rem;line-height:1.15}
  html[lang="ja"] .home-calculator-first .header-links>a[data-lang-key="linkGames"]::after,html[lang="ja"] .home-calculator-first .header-links>a[data-lang-key="linkArticles"]::after{margin-top:.18rem;font-size:.62rem;line-height:1.1}
  .home-calculator-first #main-title{margin:.5rem .1rem .08rem;font-size:1.42rem;line-height:1.18}
  .home-calculator-first #site-description{margin:.08rem auto .38rem;font-size:.82rem;line-height:1.35}
  .home-calculator-first .tab-switch{gap:.3rem;margin:.25rem 0 .42rem}
  .home-calculator-first .tab-switch button{min-height:52px;padding:.34rem .3rem;border-radius:12px;font-size:.9rem;line-height:1.08}
  .home-calculator-first .tab-switch button::before{margin-bottom:.1rem;font-size:1.06rem}
  .home-calculator-first .tab-switch button::after{margin-top:.1rem;font-size:.62rem;line-height:1.08}
  .home-calculator-first #tab-diary{min-height:46px}
  .home-calculator-first #mainMode>.section:first-child{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:.48rem;row-gap:.08rem;margin:.08rem 0 0;padding:.68rem .72rem .42rem;border-radius:15px 15px 0 0}
  .home-calculator-first #mainMode>.section:first-child>h2{margin:0 0 .35rem;padding:0 0 .32rem;font-size:1.14rem}
  .home-calculator-first .home-help-link{right:.72rem;top:.7rem;font-size:.69rem}
  .home-calculator-first #mainMode>.section:first-child label{font-size:.75rem;line-height:1.1}
  .home-calculator-first #mainMode>.section:first-child select,.home-calculator-first #mainMode>.section:first-child input[type="number"]{min-height:44px;margin:.12rem 0 .18rem;padding:.48rem .5rem;border-radius:9px;font-size:.88rem}
  .home-calculator-first #mainMode label[for="neededPoints"]{grid-column:1;grid-row:4;align-self:center;margin:.12rem 0 0}
  .home-calculator-first #neededPoints{grid-column:2;grid-row:4;margin:.1rem 0 .12rem!important}
  .home-calculator-first #mainMode>.section:nth-child(2){margin:0 0 .55rem;padding:.08rem .72rem .7rem;border-radius:0 0 15px 15px}
  .home-calculator-first #calculateButton{min-height:50px;margin:.12rem 0 0;border-radius:10px;font-size:.98rem}
  .home-calculator-first .calculator-advanced-settings{margin-top:.42rem!important}
  .home-calculator-first .calculator-advanced-settings__toggle{min-height:42px!important;padding:.42rem .55rem!important;border-radius:10px!important;font-size:.82rem!important}
  .home-calculator-first .result-guidance-links{margin-top:.72rem;padding-top:.66rem}
  .home-calculator-first .result-guidance-links h3{font-size:1.05rem}
  .home-calculator-first .result-guidance-subtitle{margin:.1rem 0 .5rem;font-size:.72rem}
  .home-calculator-first .result-guidance-links ul{gap:.34rem}
  .home-calculator-first .result-guidance-links a{min-height:88px;padding:.48rem .36rem;border-radius:12px}
  .home-calculator-first .result-guidance-links a span{font-size:.72rem}
  .home-calculator-first .result-guidance-links a small{font-size:.6rem}
  .home-calculator-first .home-article-hub{margin-top:.65rem;padding:.7rem .65rem .78rem}
  .home-calculator-first .home-section-heading{margin-bottom:.48rem}
  .home-calculator-first .home-section-heading h2{font-size:1.02rem}
  .home-calculator-first .home-section-more{font-size:.72rem}
  .home-calculator-first .home-article-carousel{gap:.42rem;padding-bottom:.4rem}
  .home-calculator-first .home-article-carousel li{flex-basis:34%;min-width:104px}
  .home-calculator-first .home-article-carousel .article-link-card{min-height:108px;padding:.52rem .45rem}
  .home-calculator-first .home-article-carousel .article-link-title{font-size:.7rem}
}
@media(max-width:359px){
  .home-calculator-first #mainMode>.section:first-child{grid-template-columns:repeat(2,minmax(0,1fr))}
  .home-calculator-first #mainMode label[for="currentStatus"]{grid-column:1;grid-row:2}
  .home-calculator-first #currentStatus{grid-column:1;grid-row:3}
  .home-calculator-first #mainMode label[for="targetStatus"]{grid-column:2;grid-row:2}
  .home-calculator-first #targetStatus{grid-column:2;grid-row:3}
  .home-calculator-first #mainMode label[for="neededPoints"]{grid-column:1;grid-row:4}
  .home-calculator-first #neededPoints{grid-column:2;grid-row:4}
  .home-calculator-first .home-help-link{display:inline-block}
  .home-calculator-first #main-title{font-size:1.32rem}
  .home-calculator-first .region-switch>button,.home-calculator-first .region-switch .region-more-toggle{font-size:.74rem}
  .home-calculator-first .header-links>a[data-lang-key="linkGames"],.home-calculator-first .header-links>a[data-lang-key="linkArticles"]{font-size:.78rem;padding:.4rem .42rem}
}
${markerEnd}`;

const start = css.indexOf(markerStart);
const end = css.indexOf(markerEnd);
if (start >= 0 && end > start) {
  css = css.slice(0, start) + block + css.slice(end + markerEnd.length);
} else {
  css = css.trimEnd() + '\n\n' + block + '\n';
}
fs.writeFileSync(path, css);
console.log('Applied phone compact overrides.');
