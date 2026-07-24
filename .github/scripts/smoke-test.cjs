'use strict';

const { mapWithConcurrency, retry } = require('./http-check-utils.cjs');

const expectedDeployRevision = process.env.EXPECTED_DEPLOY_REVISION;
const HTTP_CONCURRENCY = 4;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

const targets = [
  ...(expectedDeployRevision ? [{
    url: 'https://playpoint-sim.com/status/deploy-revision.txt',
    equals: expectedDeployRevision
  }] : []),
  { url: 'https://playpoint-sim.com/', contains: 'Playポイント計算機' },
  { url: 'https://playpoint-sim.com/en/', contains: 'Google Play Points Calculator' },
  { url: 'https://playpoint-sim.com/ko/', contains: '구글 플레이 포인트 계산기' },
  { url: 'https://playpoint-sim.com/tw/', contains: 'Google Play 點數計算器' },
  { url: 'https://playpoint-sim.com/campaign/2x/', contains: '2倍キャンペーン' },
  { url: 'https://playpoint-sim.com/campaign/3x/', contains: '3倍キャンペーン' },
  { url: 'https://playpoint-sim.com/campaign/wait/', contains: 'キャンペーン待ち判断の早見表' },
  { url: 'https://playpoint-sim.com/amount/10000/', contains: '1万円課金' },
  { url: 'https://playpoint-sim.com/status/gold/', contains: 'ゴールド必要額の早見表' },
  { url: 'https://playpoint-sim.com/status/silver/', contains: 'シルバー必要額の早見表' },
  { url: 'https://playpoint-sim.com/en/status/diamond/', contains: 'Diamond cost calculator' },
  { url: 'https://playpoint-sim.com/en/status/platinum/', contains: 'Platinum cost calculator' },
  { url: 'https://playpoint-sim.com/en/status/gold/', contains: 'Gold cost calculator' },
  { url: 'https://playpoint-sim.com/en/status/silver/', contains: 'Silver cost calculator' },
  { url: 'https://playpoint-sim.com/en/campaign/2x/', contains: '2x promotion calculator' },
  { url: 'https://playpoint-sim.com/en/campaign/3x/', contains: '3x promotion calculator' },
  { url: 'https://playpoint-sim.com/en/campaign/wait/', contains: 'Should you wait for a Google Play Points promotion?' },
  { url: 'https://playpoint-sim.com/en/amount/10000/', contains: '10,000 yen' },
  { url: 'https://playpoint-sim.com/en/articles/google-play-points-not-showing.html', contains: 'Google Play Points not showing up' },
  { url: 'https://playpoint-sim.com/en/articles/google-play-points-country-differences.html', contains: 'country differences' },
  { url: 'https://playpoint-sim.com/ko/status/diamond/', contains: '다이아몬드' },
  { url: 'https://playpoint-sim.com/ko/status/platinum/', contains: '플래티넘' },
  { url: 'https://playpoint-sim.com/ko/status/gold/', contains: '골드' },
  { url: 'https://playpoint-sim.com/ko/status/silver/', contains: '실버' },
  { url: 'https://playpoint-sim.com/ko/campaign/3x/', contains: '3배 캠페인' },
  { url: 'https://playpoint-sim.com/ko/campaign/wait/', contains: '캠페인을 기다려야 할까요' },
  { url: 'https://playpoint-sim.com/ko/articles/google-play-points-not-showing.html', contains: 'Play Points가 표시되지 않을 때' },
  { url: 'https://playpoint-sim.com/tw/status/diamond/', contains: '鑽石' },
  { url: 'https://playpoint-sim.com/tw/status/platinum/', contains: '白金' },
  { url: 'https://playpoint-sim.com/tw/status/gold/', contains: '金級' },
  { url: 'https://playpoint-sim.com/tw/status/silver/', contains: '銀級' },
  { url: 'https://playpoint-sim.com/tw/campaign/3x/', contains: '3 倍活動' },
  { url: 'https://playpoint-sim.com/tw/campaign/wait/', contains: '活動值得等嗎' },
  { url: 'https://playpoint-sim.com/tw/articles/google-play-points-levels.html', contains: 'Google Play Points 等級說明' },
  { url: 'https://playpoint-sim.com/blog/', contains: 'Google Play Points' },
  { url: 'https://playpoint-sim.com/feed.xml', contains: '<rss version="2.0"', contentType: 'application/rss+xml', cacheControlIncludes: 'max-age=1800' },
  { url: 'https://playpoint-sim.com/atom.xml', contains: '<feed xmlns="http://www.w3.org/2005/Atom">', contentType: 'application/atom+xml', cacheControlIncludes: 'max-age=1800' },
  { url: 'https://playpoint-sim.com/manifest.json', contains: '"name":', contentType: 'application/manifest+json', cacheControlIncludes: 'max-age=86400' },
  { url: 'https://playpoint-sim.com/author/katakata.html', contains: 'かたかた' },
  { url: 'https://playpoint-sim.com/kids-smile-land/', contains: 'キッズ・スマイル・ランド' },
  { url: 'https://playpoint-sim.com/tools/gravity-todo/', contains: 'Gravity-Todo' },
  { url: 'https://playpoint-sim.com/kindle-tracker/', contains: 'Kindle Unlimited お得度メーター' },
  { url: 'https://playpoint-sim.com/js/calculator.js', contains: 'Number.isFinite(value)' },
  { url: 'https://playpoint-sim.com/ogp.png', contentType: 'image/png', minimumBytes: 10000 }
];

async function verifyTarget(target) {
  const response = await fetch(`${target.url}?smoke=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`${target.url}: HTTP ${response.status}`);

  const contentType = response.headers.get('content-type') || '';
  if (target.contentType && !contentType.includes(target.contentType)) {
    throw new Error(`${target.url}: content-type ${contentType}`);
  }
  if (target.cacheControlIncludes) {
    const cacheControl = response.headers.get('cache-control') || '';
    if (!cacheControl.includes(target.cacheControlIncludes)) {
      throw new Error(`${target.url}: cache-control ${cacheControl}`);
    }
  }

  const body = Buffer.from(await response.arrayBuffer());
  if (target.minimumBytes && body.length < target.minimumBytes) {
    throw new Error(`${target.url}: ${body.length} bytes`);
  }
  const text = body.toString('utf8');
  if (target.equals && text.trim() !== target.equals) {
    throw new Error(`${target.url}: expected exact content not found`);
  }
  if (target.contains && !text.includes(target.contains)) {
    throw new Error(`${target.url}: expected content not found`);
  }
}

async function verifyTargetWithRetry(target) {
  return retry(() => verifyTarget(target), {
    attempts: MAX_ATTEMPTS,
    delayMs: RETRY_DELAY_MS,
    onRetry: (error, attempt, attempts) => {
      console.warn(`Retry ${attempt + 1}/${attempts} - ${error.message}`);
    }
  });
}

async function main() {
  const revisionTargets = expectedDeployRevision ? targets.slice(0, 1) : [];
  const contentTargets = expectedDeployRevision ? targets.slice(1) : targets;

  for (const target of revisionTargets) {
    await verifyTargetWithRetry(target);
    console.log(`ok - ${target.url}`);
  }

  const results = await mapWithConcurrency(
    contentTargets,
    HTTP_CONCURRENCY,
    verifyTargetWithRetry
  );
  const failures = results.filter(result => result.status === 'rejected');

  if (failures.length > 0) {
    failures.forEach(({ item, reason }) => console.error(`not ok - ${item.url}: ${reason.message}`));
    throw new Error(`Production smoke test failed (${failures.length}/${targets.length} targets).`);
  }

  console.log(`Production smoke test passed (${targets.length} targets, concurrency ${HTTP_CONCURRENCY}).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
