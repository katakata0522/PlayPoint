const targets = [
  { url: 'https://playpoint-sim.com/', contains: 'Playポイント計算機' },
  { url: 'https://playpoint-sim.com/en/', contains: 'Play Point Calculator' },
  { url: 'https://playpoint-sim.com/ko/', contains: '구글 플레이 포인트 계산기' },
  { url: 'https://playpoint-sim.com/tw/', contains: 'Google Play 點數計算器' },
  { url: 'https://playpoint-sim.com/campaign/2x/', contains: '2倍キャンペーン' },
  { url: 'https://playpoint-sim.com/campaign/3x/', contains: '3倍キャンペーン' },
  { url: 'https://playpoint-sim.com/amount/10000/', contains: '1万円課金' },
  { url: 'https://playpoint-sim.com/en/status/diamond/', contains: 'Diamond cost calculator' },
  { url: 'https://playpoint-sim.com/en/campaign/2x/', contains: '2x promotion calculator' },
  { url: 'https://playpoint-sim.com/en/amount/10000/', contains: '10,000 yen' },
  { url: 'https://playpoint-sim.com/en/articles/google-play-points-not-showing.html', contains: 'Google Play Points not showing up' },
  { url: 'https://playpoint-sim.com/ko/status/diamond/', contains: '다이아몬드' },
  { url: 'https://playpoint-sim.com/tw/status/diamond/', contains: '鑽石' },
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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  if (target.contains && !body.toString('utf8').includes(target.contains)) {
    throw new Error(`${target.url}: expected content not found`);
  }
}

async function main() {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      for (const target of targets) await verifyTarget(target);
      console.log(`Production smoke test passed (${targets.length} targets).`);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Smoke test attempt ${attempt}/5 failed: ${error.message}`);
      if (attempt < 5) await wait(5000);
    }
  }
  throw lastError;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
