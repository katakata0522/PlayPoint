'use strict';

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const cssPath = path.join(rootDir, 'articles', 'article-shared.css');
const marker = 'Performance stability: reserve responsive ad space';
const css = fs.readFileSync(cssPath, 'utf8');

if (css.includes(marker)) {
  console.log('Article ad-slot stability rules are already present.');
  process.exit(0);
}

const addition = `

/* ${marker} before AdSense finishes rendering. */
.article-ad-slot {
    display: grid;
    align-items: center;
    width: 100%;
    min-height: 280px;
    box-sizing: border-box;
}

@media (max-width: 600px) {
    .article-ad-slot {
        min-height: 250px;
    }
}
`;

fs.writeFileSync(cssPath, `${css.trimEnd()}${addition}`, 'utf8');
console.log('Reserved responsive article ad space to reduce layout shifts.');
