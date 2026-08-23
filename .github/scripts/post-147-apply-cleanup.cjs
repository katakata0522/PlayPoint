'use strict';

const fs = require('node:fs');

function replaceOnce(text, oldValue, newValue, label) {
  const count = text.split(oldValue).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  return text.replace(oldValue, newValue);
}

function replaceAllRequired(text, oldValue, newValue, label) {
  const count = text.split(oldValue).length - 1;
  if (count < 1) throw new Error(`${label}: expected at least one match`);
  return text.split(oldValue).join(newValue);
}

const preflightPath = '.github/scripts/preflight.cjs';
let preflight = fs.readFileSync(preflightPath, 'utf8');
preflight = replaceOnce(
  preflight,
  "const requiredPublicFiles = ['en/index.html', 'ko/index.html', 'tw/index.html'];",
  "const requiredPublicFiles = [\n  'index.html',\n  'en/index.html',\n  'ko/index.html',\n  'tw/index.html',\n  'hk/index.html',\n  'in/index.html',\n  'pwa-launch.html'\n];",
  'required public files'
);
preflight = replaceOnce(
  preflight,
  "  runPhase('JavaScript構文検証', process.execPath, ['.github/scripts/verify-js-syntax.cjs']);\n  runPhase('生成物の再現性検証', process.execPath, ['.github/scripts/verify-build-output.cjs']);\n  verifyRequiredPublicFiles();",
  "  runPhase('JavaScript構文検証', process.execPath, ['.github/scripts/verify-js-syntax.cjs']);\n  verifyRequiredPublicFiles();\n  runPhase('生成物の再現性検証', process.execPath, ['.github/scripts/verify-build-output.cjs']);",
  'preflight ordering'
);
fs.writeFileSync(preflightPath, preflight, 'utf8');

const articlePath = 'en/articles/google-play-points-country-differences.html';
let article = fs.readFileSync(articlePath, 'utf8');
article = replaceAllRequired(article, 'Google Play Points country differences: US, Korea, Taiwan', 'Google Play Points country differences: 6-region comparison', 'comparison title');
article = replaceAllRequired(article, 'Compare the official Play Points units and level thresholds for the US, Korea, Taiwan, and Japan, then open the local level or country-change guide for details.', 'Compare official Play Points earning units and level thresholds for the US, Korea, Taiwan, Hong Kong, India, and Japan, with links to the matching calculator or local guide.', 'comparison description');
article = replaceOnce(article, '<meta name="robots" content="index, follow, max-image-preview:large"><meta name="author" content="Katakata"><meta name="last-modified" content="2026-08-21">', '<meta name="robots" content="index, follow, max-image-preview:large"><meta name="author" content="Katakata"><meta name="last-modified" content="2026-08-24">', 'last modified meta');
article = replaceOnce(article, '"dateModified":"2026-08-21"', '"dateModified":"2026-08-24"', 'structured dateModified');
article = replaceOnce(article, '<div class="hero"><span class="hero-badge">Regional comparison hub</span><h1>Google Play Points rules differ by Play country</h1><p class="hero-meta">Updated 2026-08-21 ・ US, Korea, Taiwan and Japan</p></div>', '<div class="hero"><span class="hero-badge">Regional comparison hub</span><h1>Google Play Points rules differ by Play country</h1><p class="hero-meta">Updated 2026-08-24 ・ US, Korea, Taiwan, Hong Kong, India and Japan</p></div>', 'hero metadata');
article = replaceOnce(article, '<tr><td>Japan</td><td>1 point per ¥100</td><td>4,000 points</td><td>15,000 points</td></tr>', '<tr><td>Hong Kong</td><td>1 point per HK$7</td><td>4,000 points</td><td>15,000 points</td></tr><tr><td>India</td><td>1 point per ₹5</td><td>4,000 points</td><td>No Diamond tier</td></tr><tr><td>Japan</td><td>1 point per ¥100</td><td>4,000 points</td><td>15,000 points</td></tr>', 'comparison rows');
article = replaceOnce(article, '<p>This table is a navigation aid, not a substitute for the full local level table. Silver and Gold thresholds, higher-level rates, weekly rewards, and account offers also differ.</p>', '<p>This table is a navigation aid, not a substitute for the full local level table. Silver and Gold thresholds, higher-level rates, weekly rewards, and account offers also differ. India currently tops out at Platinum, so it has no Diamond threshold.</p>', 'comparison table note');
article = replaceOnce(article, '<tr><td>What happens if I change the Play country?</td><td><a href="/en/articles/google-play-points-country-change.html">Country-change effects and pre-change checklist</a></td></tr>', '<tr><td>I use a Hong Kong or India Play account.</td><td><a href="/hk/">Hong Kong calculator</a> or <a href="/in/">India calculator</a></td></tr><tr><td>What happens if I change the Play country?</td><td><a href="/en/articles/google-play-points-country-change.html">Country-change effects and pre-change checklist</a></td></tr>', 'regional guide row');
article = replaceOnce(article, '<li><a href="https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DJP&amp;hl=en" target="_blank" rel="noopener noreferrer">Japan levels</a></li><li><a href="https://support.google.com/googleplay/answer/7431675?hl=en" target="_blank" rel="noopener noreferrer">What changes when the Google Play country changes</a></li>', '<li><a href="https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DJP&amp;hl=en" target="_blank" rel="noopener noreferrer">Japan levels</a></li><li><a href="https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DHK&amp;hl=en" target="_blank" rel="noopener noreferrer">Hong Kong levels</a></li><li><a href="https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DIN&amp;hl=en" target="_blank" rel="noopener noreferrer">India levels</a></li><li><a href="https://support.google.com/googleplay/answer/7431675?hl=en" target="_blank" rel="noopener noreferrer">What changes when the Google Play country changes</a></li>', 'official regional references');
article = replaceOnce(article, '<section class="section related-links-section"><h2>Next step</h2><ul><li><a href="/en/articles/google-play-points-levels.html">US levels guide</a></li>', '<section class="section related-links-section"><h2>Next step</h2><ul><li><a href="/attention.html">All six calculator regions</a></li><li><a href="/en/articles/google-play-points-levels.html">US levels guide</a></li>', 'next step regional guide');
fs.writeFileSync(articlePath, article, 'utf8');
