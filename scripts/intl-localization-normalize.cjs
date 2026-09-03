'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { PAGE_TYPES } = require('./intl-seo-content.cjs');

const STATUS_PAGE_QUERIES = Object.freeze({
  gold: Object.freeze({
    en: 'status=1.1&target=gold&points=450&multiplier=1',
    ko: 'status=1.1&target=gold&points=450&multiplier=1',
    tw: 'status=1.25&target=gold&points=750&multiplier=1'
  }),
  platinum: Object.freeze({
    en: 'status=1.2&target=platinum&points=2400&multiplier=1',
    ko: 'status=1.3&target=platinum&points=1800&multiplier=1',
    tw: 'status=1.5&target=platinum&points=3000&multiplier=1'
  }),
  diamond: Object.freeze({
    en: 'status=1.4&target=diamond&points=7000&multiplier=1',
    ko: 'status=1.6&target=diamond&points=12600&multiplier=1',
    tw: 'status=1.75&target=diamond&points=11000&multiplier=1'
  }),
  campaign2x: Object.freeze({
    en: 'status=1.2&target=platinum&points=2400&multiplier=2',
    ko: 'status=1.3&target=platinum&points=1800&multiplier=2',
    tw: 'status=1.5&target=platinum&points=3000&multiplier=2'
  }),
  campaign3x: Object.freeze({
    en: 'status=1.2&target=platinum&points=2400&multiplier=3',
    ko: 'status=1.3&target=platinum&points=1800&multiplier=3',
    tw: 'status=1.5&target=platinum&points=3000&multiplier=3'
  }),
  campaignWait: Object.freeze({
    en: 'status=1.2&target=platinum&points=2400&multiplier=2',
    ko: 'status=1.3&target=platinum&points=1800&multiplier=2',
    tw: 'status=1.5&target=platinum&points=3000&multiplier=2'
  })
});

const CAMPAIGN_COPY = Object.freeze({
  campaign2x: Object.freeze({
    en: Object.freeze({
      title: 'Google Play Points 2x promotion calculator | Final earn rate',
      description: 'Compare your normal Google Play Points tier rate with a final eligible 2 pt / $1 special earn rate shown in Google Play. This does not multiply the tier rate by 2.'
    }),
    ko: Object.freeze({
      title: 'Google Play Points 2배 캠페인 계산 | 최종 적립률 기준',
      description: 'Google Play에 대상 결제의 최종 특별 적립률이 1,000원당 2pt로 표시될 때 현재 등급 기본 적립률과 비교합니다. 기본 적립률에 2를 곱하지 않습니다.'
    }),
    tw: Object.freeze({
      title: 'Google Play Points 2 倍活動計算｜最終獲點率比較',
      description: '只有 Google Play 對符合資格的消費顯示最終特別獲點率為每 NT$30 2 點時才進行比較，不會把目前等級基本獲點率乘以 2。'
    })
  }),
  campaign3x: Object.freeze({
    en: Object.freeze({
      title: 'Google Play Points 3x promotion calculator | Final earn rate',
      description: 'Compare your normal Google Play Points tier rate with a final eligible 3 pt / $1 special earn rate shown in Google Play. This does not multiply the tier rate by 3.'
    }),
    ko: Object.freeze({
      title: 'Google Play Points 3배 캠페인 계산 | 최종 적립률 기준',
      description: 'Google Play에 대상 결제의 최종 특별 적립률이 1,000원당 3pt로 표시될 때 현재 등급 기본 적립률과 비교합니다. 기본 적립률에 3을 곱하지 않습니다.'
    }),
    tw: Object.freeze({
      title: 'Google Play Points 3 倍活動計算｜最終獲點率比較',
      description: '只有 Google Play 對符合資格的消費顯示最終特別獲點率為每 NT$30 3 點時才進行比較，不會把目前等級基本獲點率乘以 3。'
    })
  })
});

const ARIA_REPLACEMENTS = Object.freeze({
  ko: Object.freeze([
    ['aria-label="Site links"', 'aria-label="사이트 링크"'],
    ['aria-label="Page summary"', 'aria-label="페이지 요약"']
  ]),
  tw: Object.freeze([
    ['aria-label="Site links"', 'aria-label="網站連結"'],
    ['aria-label="Page summary"', 'aria-label="頁面摘要"']
  ])
});

const COPY_OVERRIDE_SCRIPT = '<script type="module" src="../js/intl-copy-overrides.js"></script>';

function replaceAllLiteral(source, from, to) {
  return source.split(from).join(to);
}

function writeIfChanged(filePath, next) {
  if (!fs.existsSync(filePath)) return false;
  const current = fs.readFileSync(filePath, 'utf8');
  if (current === next) return false;
  fs.writeFileSync(filePath, next);
  return true;
}

function mutateFile(filePath, transform) {
  if (!fs.existsSync(filePath)) return false;
  const current = fs.readFileSync(filePath, 'utf8');
  return writeIfChanged(filePath, transform(current));
}

function collectHtmlFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(absolutePath);
    return entry.isFile() && entry.name.endsWith('.html') ? [absolutePath] : [];
  });
}

function injectRuntimeCopyOverride(html) {
  if (html.includes('js/intl-copy-overrides.js')) return html;
  const mainScript = /<script type="module" src="\.\.\/js\/main\.js[^>]*><\/script>/;
  if (!mainScript.test(html)) throw new Error('Localized calculator main module script was not found.');
  return html.replace(mainScript, `${COPY_OVERRIDE_SCRIPT}\n$&`);
}

function applyIntlSemanticSourceOverrides(locales) {
  for (const [pageKey, localeQueries] of Object.entries(STATUS_PAGE_QUERIES)) {
    const page = PAGE_TYPES[pageKey];
    if (!page) throw new Error(`Unknown international SEO page key: ${pageKey}`);
    for (const [localeKey, query] of Object.entries(localeQueries)) {
      if (!page[localeKey]) throw new Error(`Missing ${localeKey} content for ${pageKey}`);
      page[localeKey].query = query;
    }
  }

  for (const [pageKey, localeCopy] of Object.entries(CAMPAIGN_COPY)) {
    const page = PAGE_TYPES[pageKey];
    for (const [localeKey, copy] of Object.entries(localeCopy)) {
      Object.assign(page[localeKey], copy);
    }
  }

  if (locales?.ko) {
    const title = 'Google Play Points 계산기 | 다음 등급까지 얼마가 필요할까?';
    locales.ko.title = title;
    locales.ko.ogTitle = title;
  }

  return { statusPages: Object.keys(STATUS_PAGE_QUERIES).length, campaignPages: Object.keys(CAMPAIGN_COPY).length };
}

function normalizeIntlGeneratedCopy(rootDir) {
  const changedFiles = new Set();
  const mark = (relativePath, transform) => {
    const absolutePath = path.join(rootDir, relativePath);
    if (mutateFile(absolutePath, transform)) changedFiles.add(relativePath);
  };

  for (const localeKey of ['ko', 'tw']) {
    const replacements = ARIA_REPLACEMENTS[localeKey];
    for (const page of Object.values(PAGE_TYPES)) {
      const relativePath = `${localeKey}/${page.slug}/index.html`;
      mark(relativePath, (html) => replacements.reduce(
        (next, [from, to]) => replaceAllLiteral(next, from, to),
        html
      ));
    }
  }

  mark('ko/index.html', (html) => injectRuntimeCopyOverride(replaceAllLiteral(
    html,
    'Google Play Points 계산기 | 등급 업까지 얼마 남았지?',
    'Google Play Points 계산기 | 다음 등급까지 얼마가 필요할까?'
  )));

  mark('tw/index.html', (html) => injectRuntimeCopyOverride(replaceAllLiteral(html, '逆算模式', '反推模式')));

  mark('ko/articles/google-play-points-cash-conversion.html', (html) => {
    let next = replaceAllLiteral(html, '현금 환전', '현금 전환');
    next = replaceAllLiteral(next, '은행·간편결제 출금', '은행 계좌·전자지갑 출금');
    return next;
  });

  mark('en/articles/google-play-points-cash-conversion.html', (html) => replaceAllLiteral(
    html,
    'what 100 Play Points can be worth to use',
    'the practical value of 100 Play Points'
  ));

  for (const absolutePath of collectHtmlFiles(path.join(rootDir, 'tw'))) {
    const relativePath = path.relative(rootDir, absolutePath).replaceAll('\\', '/');
    if (mutateFile(absolutePath, (html) => replaceAllLiteral(html, '問題排查', '問題排解'))) {
      changedFiles.add(relativePath);
    }
  }

  return { changedFiles: [...changedFiles].sort() };
}

module.exports = {
  ARIA_REPLACEMENTS,
  CAMPAIGN_COPY,
  STATUS_PAGE_QUERIES,
  applyIntlSemanticSourceOverrides,
  normalizeIntlGeneratedCopy
};
